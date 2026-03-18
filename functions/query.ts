declare const Deno: any;

export default async (req: Request) => {
  try {
    // 1. Parse Input
    if (req.method !== 'POST') {
      return new Response("Method not allowed", { status: 405 });
    }

    const data = await req.json().catch(() => ({}));
    const { query } = data;

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Convert query to embedding via Gemini API
    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_API_KEY not found");

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${apiKey}`;

    const geminiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: query }] },
        model: "models/gemini-embedding-2-preview",
        outputDimensionality: 1024
      })
    });

    if (!geminiResp.ok) {
      const err = await geminiResp.text();
      throw new Error(`Gemini API error: ${err}`);
    }

    const geminiData = await geminiResp.json();
    const embedding = geminiData.embedding.values;

    // 3. Perform vector similarity search via InsForge raw SQL API
    const serviceKey = Deno.env.get("API_KEY");
    if (!serviceKey) throw new Error("API_KEY not found");

    const baseUrl = Deno.env.get("INSFORGE_BASE_URL");
    if (!baseUrl) throw new Error("INSFORGE_BASE_URL not found");

    const vectorString = `[${embedding.join(',')}]`;

    const sqlQuery = `
      SELECT e.content, e.document_id, e.created_at,
             1 - (e.embedding <=> $1::vector) AS similarity
      FROM embeddings e
      WHERE 1 - (e.embedding <=> $1::vector) > 0.25
      ORDER BY similarity DESC
      LIMIT 3
    `;

    const sqlResp = await fetch(`${baseUrl}/api/database/advance/rawsql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`
      },
      body: JSON.stringify({
        query: sqlQuery,
        params: [vectorString]
      })
    });

    if (!sqlResp.ok) {
      const err = await sqlResp.text();
      throw new Error(`SQL API error: ${err}`);
    }

    const sqlData = await sqlResp.json();
    const sources = (sqlData.rows || []).map((row: any) => ({
      content: row.content,
      document_id: row.document_id,
      similarity: row.similarity,
      created_at: row.created_at
    }));

    // 4. Build context from retrieved results and call InsForge AI Gateway
    const context = sources.map((s: any) => s.content).join("\n\n");

    const aiResp = await fetch(`${baseUrl}/api/ai/chat/completion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant. Answer ONLY using the provided context."
          },
          {
            role: "user",
            content: `Context:\n${context}\n\nQuestion:\n${query}`
          }
        ]
      })
    });

    if (!aiResp.ok) {
      const err = await aiResp.text();
      throw new Error(`AI Gateway error: ${err}`);
    }

    const aiData = await aiResp.json();
    const answer = aiData.text || "";

    return new Response(JSON.stringify({
      answer,
      sources
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
