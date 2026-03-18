import { createClient } from 'npm:@insforge/sdk';

declare const Deno: any;

export default async (req: Request) => {
  try {
    // 1. Parse Input
    if (req.method !== 'POST') {
      return new Response("Method not allowed", { status: 405 });
    }
    
    const data = await req.json().catch(() => ({}));
    const { text, file_url, mime_type, document_id } = data;

    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_API_KEY not found");

    // 2. Prepare content
    const embeddingParts: any[] = [];
    let contentDescription = text || "";
    let base64Data = "";
    let resolvedMimeType = mime_type || "";

    if (text) {
      embeddingParts.push({ text });
    }

    if (file_url) {
      // Rewrite public URL to internal URL for fetching within edge function
      const internalUrl = Deno.env.get("INSFORGE_INTERNAL_URL") || "";
      const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || "";
      let fetchUrl = file_url;
      if (internalUrl && baseUrl && file_url.startsWith(baseUrl)) {
        fetchUrl = file_url.replace(baseUrl, internalUrl);
      }

      const serviceKey = Deno.env.get("API_KEY") || "";
      const fileResp = await fetch(fetchUrl, {
        headers: { "Authorization": `Bearer ${serviceKey}` }
      });
      if (!fileResp.ok) throw new Error(`Failed to fetch file: ${fileResp.statusText}`);
      const arrayBuffer = await fileResp.arrayBuffer();
      
      // Convert to base64
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64Data = btoa(binary);
      resolvedMimeType = resolvedMimeType || fileResp.headers.get("content-type") || "application/octet-stream";

      // Add file as inline_data for embedding (gemini-embedding-2-preview supports images & audio)
      embeddingParts.push({
        inline_data: {
          mime_type: resolvedMimeType,
          data: base64Data
        }
      });

      // Generate text description using InsForge AI Gateway (GPT-4o-mini via OpenRouter)
      // This description is stored as `content` so the RAG can use it for answering
      if (!text) {
        const isImage = resolvedMimeType.startsWith("image/");
        const isAudio = resolvedMimeType.startsWith("audio/");

        if (isImage) {
          // Use InsForge AI Gateway (GPT-4o-mini) to describe images
          const aiBaseUrl = Deno.env.get("INSFORGE_BASE_URL") || "";
          const aiKey = Deno.env.get("API_KEY") || "";

          try {
            const descResp = await fetch(`${aiBaseUrl}/api/ai/chat/completion`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${aiKey}`
              },
              body: JSON.stringify({
                model: "openai/gpt-4o-mini",
                messages: [
                  {
                    role: "user",
                    content: [
                      { type: "text", text: "Describe this image in detail. Include all visible text, objects, colors, layout, and any important information. Be thorough." },
                      {
                        type: "image_url",
                        image_url: { url: `data:${resolvedMimeType};base64,${base64Data}` }
                      }
                    ]
                  }
                ]
              })
            });

            if (descResp.ok) {
              const descData = await descResp.json();
              const description = descData.text || "";
              if (description) {
                contentDescription = description;
              }
            }
          } catch (_e) {
            // Description generation failed, continue with fallback
          }

          if (!contentDescription) {
            contentDescription = "[Image file — embedded via multimodal vector]";
          }
        } else if (isAudio) {
          // Audio: Gemini embedding handles it natively, store generic description
          contentDescription = "[Audio file — embedded via multimodal vector]";
        } else {
          contentDescription = `[File uploaded: ${resolvedMimeType}]`;
        }
      }
    }

    if (embeddingParts.length === 0) {
       return new Response(JSON.stringify({ error: "No content to embed" }), {
         status: 400,
         headers: { "Content-Type": "application/json" }
       });
    }

    // 3. Call Gemini Embedding API (gemini-embedding-2-preview: text, images, audio)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${apiKey}`;
    
    const geminiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: embeddingParts },
        model: "models/gemini-embedding-2-preview",
        outputDimensionality: 1024
      })
    });

    if (!geminiResp.ok) {
      const err = await geminiResp.text();
      throw new Error(`Gemini Embedding error: ${err}`);
    }

    const geminiData = await geminiResp.json();
    const embedding = geminiData.embedding.values;

    // 4. Store in DB using InsForge SDK
    const client = createClient({
      baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
      anonKey: Deno.env.get('ANON_KEY')
    });

    const vectorString = `[${embedding.join(',')}]`;
    const storedContent = contentDescription.length > 2000
      ? contentDescription.slice(0, 2000) + "..."
      : contentDescription;

    const { error: dbError } = await client.database
      .from('embeddings')
      .insert({
        document_id,
        embedding: vectorString,
        content: storedContent
      });

    if (dbError) {
      throw new Error(`DB Error: ${dbError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      embedding_length: embedding.length
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
