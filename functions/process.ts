import { createClient } from 'npm:@insforge/sdk';

declare const Deno: any;

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // ── 1. Parse input ────────────────────────────────────────────────────────
    const data = await req.json().catch(() => ({}));
    const { text, file_url, mime_type, document_id, user_id } = data;

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: 'document_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!apiKey) throw new Error('GOOGLE_API_KEY not found');

    // ── 2. Prepare content for embedding ─────────────────────────────────────
    const embeddingParts: any[] = [];
    let contentDescription = text || '';
    let base64Data = '';
    let resolvedMimeType = mime_type || '';

    if (text) {
      embeddingParts.push({ text });
    }

    if (file_url) {
      // Rewrite public URL to internal URL for fetching within edge function
      const internalUrl = Deno.env.get('INSFORGE_INTERNAL_URL') || '';
      const baseUrl = Deno.env.get('INSFORGE_BASE_URL') || '';
      let fetchUrl = file_url;
      if (internalUrl && baseUrl && file_url.startsWith(baseUrl)) {
        fetchUrl = file_url.replace(baseUrl, internalUrl);
      }

      // Use service key to fetch the file from storage
      const serviceKey = Deno.env.get('API_KEY') || '';
      const fileResp = await fetch(fetchUrl, {
        headers: { Authorization: `Bearer ${serviceKey}` },
      });
      if (!fileResp.ok) throw new Error(`Failed to fetch file: ${fileResp.statusText}`);

      const arrayBuffer = await fileResp.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64Data = btoa(binary);
      resolvedMimeType =
        resolvedMimeType || fileResp.headers.get('content-type') || 'application/octet-stream';

      embeddingParts.push({
        inline_data: { mime_type: resolvedMimeType, data: base64Data },
      });

      // Let Gemini Embedding 2 naturally handle images without needing text descriptions
      if (!text) {
        if (resolvedMimeType.startsWith('image/')) {
          contentDescription = '[Image file — embedded natively via multimodal vector]';
        } else if (resolvedMimeType.startsWith('audio/')) {
          contentDescription = '[Audio file — embedded natively via multimodal vector]';
        } else {
          contentDescription = `[File uploaded: ${resolvedMimeType}]`;
        }
      }
    }

    if (embeddingParts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No content to embed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ── 3. Call Gemini Embedding API ──────────────────────────────────────────
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${apiKey}`;

    const geminiResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: embeddingParts },
        model: 'models/gemini-embedding-2-preview',
        outputDimensionality: 1024,
      }),
    });

    if (!geminiResp.ok) {
      const err = await geminiResp.text();
      throw new Error(`Gemini Embedding error: ${err}`);
    }

    const geminiData = await geminiResp.json();
    const embedding = geminiData.embedding.values;

    // ── 4. Store embedding with user_id ───────────────────────────────────────
    // The service key (API_KEY) is used here so this insert can bypass RLS.
    // user_id is explicitly stored so RLS SELECT/DELETE policies work correctly
    // when the user later queries or clears their own data via the user JWT.
    const client = createClient({
      baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
      anonKey: Deno.env.get('API_KEY'), // service key — full access
    });

    const vectorString = `[${embedding.join(',')}]`;
    const storedContent =
      contentDescription.length > 2000
        ? contentDescription.slice(0, 2000) + '...'
        : contentDescription;

    const { error: dbError } = await client.database
      .from('embeddings')
      .insert({
        document_id,
        user_id,       // ← ownership recorded here
        embedding: vectorString,
        content: storedContent,
      });

    if (dbError) {
      throw new Error(`DB Error: ${dbError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, embedding_length: embedding.length }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
