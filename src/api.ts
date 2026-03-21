import type { QueryResponse } from './types';

const API_URL = import.meta.env.VITE_API_URL || '';

// All API calls take the authenticated user's JWT and user ID.
// The JWT is sent as the Bearer token so PostgREST/InsForge sets the
// request.jwt.claims context that RLS policies read from.

function authHeaders(accessToken: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${accessToken}`,
  };
}

// ── Storage ──────────────────────────────────────────────────────────────────

export async function uploadFile(
  file: File,
  userId: string,
  accessToken: string,
): Promise<{ key: string; url: string }> {
  // PUT /api/storage/buckets/{bucket}/objects/{objectKey} is the only endpoint
  // that preserves a custom path including folder separators.
  // We namespace every file under {userId}/ so each user's uploads are isolated.
  const objectKey = `${userId}/${Date.now()}_${file.name}`;

  const form = new FormData();
  form.append('file', file);

  const response = await fetch(
    `${API_URL}/api/storage/buckets/uploads/objects/${objectKey}`,
    {
      method: 'PUT',
      headers: authHeaders(accessToken),
      body: form,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${errorText}`);
  }

  const data = await response.json();
  const returnedKey: string = data.key ?? objectKey;
  const fileUrl = data.url?.startsWith('http')
    ? data.url
    : `${API_URL}/api/storage/buckets/uploads/objects/${returnedKey}`;

  return { key: returnedKey, url: fileUrl };
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function createDocument(
  fileUrl: string,
  fileType: string,
  userId: string,
  accessToken: string,
): Promise<string> {
  // user_id is explicitly included so RLS INSERT policy passes and ownership
  // is recorded for future SELECT / DELETE operations.
  const response = await fetch(`${API_URL}/api/database/records/documents`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify([{ file_url: fileUrl, file_type: fileType, user_id: userId }]),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Create document failed: ${errorText}`);
  }

  const data = await response.json();
  return data[0].id;
}

// ── Embeddings ────────────────────────────────────────────────────────────────

export async function processEmbedding(
  params: {
    document_id: string;
    text?: string;
    file_url?: string;
    mime_type?: string;
    user_id: string;
  },
  accessToken: string,
): Promise<void> {
  // The edge function receives the user JWT so it can store user_id in the
  // embeddings row using the service key (which bypasses RLS for the insert)
  // while still recording ownership correctly.
  const response = await fetch(`${API_URL}/functions/process-embedding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Process embedding failed: ${errorText}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
}

// ── Query ─────────────────────────────────────────────────────────────────────

export async function queryEmbedding(
  query: string,
  accessToken: string,
): Promise<QueryResponse> {
  // The edge function extracts user_id from the JWT to filter results.
  const response = await fetch(`${API_URL}/functions/query-embedding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed: ${errorText}`);
  }

  const data = await response.json();
  return data as QueryResponse;
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteEmbeddingsByDocument(
  documentId: string,
  accessToken: string,
): Promise<void> {
  // RLS DELETE policy ensures only the owner's rows are deleted.
  const response = await fetch(
    `${API_URL}/api/database/records/embeddings?document_id=eq.${documentId}`,
    { method: 'DELETE', headers: authHeaders(accessToken) },
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Delete failed: ${errorText}`);
  }
}

export async function deleteAllEmbeddings(accessToken: string): Promise<void> {
  // With RLS active the WHERE clause only matches the authenticated user's rows.
  const response = await fetch(
    `${API_URL}/api/database/records/embeddings?id=neq.00000000-0000-0000-0000-000000000000`,
    { method: 'DELETE', headers: authHeaders(accessToken) },
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Clear all failed: ${errorText}`);
  }
}

// ── Composite helper ──────────────────────────────────────────────────────────

export async function uploadAndProcess(
  file: File,
  userId: string,
  accessToken: string,
): Promise<{ documentId: string; fileName: string }> {
  // 1. Upload to user-namespaced storage path
  const { url: fileUrl } = await uploadFile(file, userId, accessToken);

  // 2. Create document record with user_id (RLS enforced)
  const documentId = await createDocument(fileUrl, file.type, userId, accessToken);

  // 3. Generate embedding and store with user_id via edge function
  await processEmbedding(
    { document_id: documentId, file_url: fileUrl, mime_type: file.type, user_id: userId },
    accessToken,
  );

  return { documentId, fileName: file.name };
}
