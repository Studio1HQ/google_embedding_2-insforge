declare const Deno: any;

/** Decode a JWT payload without verification (verification is done by InsForge). */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // base64url → base64 → JSON
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // ── 1. Authenticate — extract user_id from the Bearer JWT ─────────────────
    // The frontend sends the user's access token so we know whose data to search.
    const authHeader = req.headers.get('Authorization') || '';
    const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!userToken) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const payload = decodeJwtPayload(userToken);
    const userId = payload?.sub as string | undefined;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ── 2. Parse query ────────────────────────────────────────────────────────
    const data = await req.json().catch(() => ({}));
    const { query } = data;

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'query is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ── 3. Embed the query via Gemini ─────────────────────────────────────────
    const apiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!apiKey) throw new Error('GOOGLE_API_KEY not found');

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${apiKey}`;

    const geminiResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text: query }] },
        model: 'models/gemini-embedding-2-preview',
        outputDimensionality: 1024,
      }),
    });

    if (!geminiResp.ok) {
      const err = await geminiResp.text();
      throw new Error(`Gemini API error: ${err}`);
    }

    const geminiData = await geminiResp.json();
    const embedding = geminiData.embedding.values;

    // ── 4. Vector similarity search — scoped to this user only ────────────────
    // The service key is used so the query can run via rawsql.
    // User isolation is enforced by the WHERE user_id = $2 clause — only rows
    // owned by the authenticated user are ever considered.
    const serviceKey = Deno.env.get('API_KEY');
    if (!serviceKey) throw new Error('API_KEY not found');

    const baseUrl = Deno.env.get('INSFORGE_BASE_URL');
    if (!baseUrl) throw new Error('INSFORGE_BASE_URL not found');

    const vectorString = `[${embedding.join(',')}]`;

    const sqlQuery = `
      SELECT e.content, e.document_id, e.created_at,
             d.file_url, d.file_type,
             1 - (e.embedding <=> $1::vector) AS similarity
      FROM   embeddings e
      LEFT JOIN documents d ON e.document_id = d.id
      WHERE  e.user_id = $2
        AND  1 - (e.embedding <=> $1::vector) > 0.25
      ORDER  BY similarity DESC
      LIMIT  3
    `;

    const sqlResp = await fetch(`${baseUrl}/api/database/advance/rawsql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        query: sqlQuery,
        params: [vectorString, userId],  // ← userId is the second param
      }),
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
      created_at: row.created_at,
      file_url: row.file_url,
      file_type: row.file_type,
    }));

    // ── 5. Generate answer via InsForge AI Gateway ───────────────────────────
    const dbContext = sources.map((s: any) => s.content).join('\n\n');
    const userContent: any[] = [{ type: 'text', text: `Context:\n${dbContext}\n\nQuestion:\n${query}` }];

    // Convert ArrayBuffer to Base64
    const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };

    // Append raw images as context
    for (const source of sources) {
      if (source.file_type?.startsWith('image/') && source.file_url) {
        try {
          const fileResp = await fetch(source.file_url, {
            headers: { Authorization: `Bearer ${serviceKey}` }
          });
          
          if (fileResp.ok) {
            const buffer = await fileResp.arrayBuffer();
            const base64 = arrayBufferToBase64(buffer);
            userContent.push({
              type: 'image_url',
              image_url: { url: `data:${source.file_type};base64,${base64}` }
            });
          }
        } catch (err) {
          console.error("Failed to fetch image for context:", err);
        }
      }
    }

    const aiResp = await fetch(`${baseUrl}/api/ai/chat/completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Answer ONLY using the provided context. If images are provided, refer to them accurately.'
          },
          {
            role: 'user',
            content: userContent
          }
        ]
      }),
    });

    if (!aiResp.ok) {
      const err = await aiResp.text();
      throw new Error(`AI Gateway error: ${err}`);
    }

    const aiData = await aiResp.json();
    const answer = aiData.text || '';

    return new Response(JSON.stringify({ answer, sources }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
