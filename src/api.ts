import type { QueryResponse } from './types';

const API_URL = import.meta.env.VITE_API_URL || '';
const ANON_KEY = import.meta.env.VITE_INSFORGE_ANON_KEY || '';

function getHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${ANON_KEY}`,
  };
}

export async function queryEmbedding(query: string): Promise<QueryResponse> {
  const response = await fetch(`${API_URL}/functions/query-embedding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

export async function uploadFile(file: File): Promise<{ key: string; url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/storage/buckets/uploads/objects`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${errorText}`);
  }

  const data = await response.json();
  // data.url is already a full URL from the storage API
  const fileUrl = data.url.startsWith('http') ? data.url : `${API_URL}${data.url}`;
  return { key: data.key, url: fileUrl };
}

export async function createDocument(fileUrl: string, fileType: string): Promise<string> {
  const response = await fetch(`${API_URL}/api/database/records/documents`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify([{ file_url: fileUrl, file_type: fileType }]),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Create document failed: ${errorText}`);
  }

  const data = await response.json();
  return data[0].id;
}

export async function processEmbedding(params: {
  document_id: string;
  text?: string;
  file_url?: string;
  mime_type?: string;
}): Promise<void> {
  const response = await fetch(`${API_URL}/functions/process-embedding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

export async function deleteEmbeddingsByDocument(documentId: string): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/database/records/embeddings?document_id=eq.${documentId}`,
    { method: 'DELETE', headers: getHeaders() }
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Delete failed: ${errorText}`);
  }
}

export async function deleteAllEmbeddings(): Promise<void> {
  // Delete all embeddings by selecting all with a non-null id
  const response = await fetch(
    `${API_URL}/api/database/records/embeddings?id=neq.00000000-0000-0000-0000-000000000000`,
    { method: 'DELETE', headers: getHeaders() }
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Clear all failed: ${errorText}`);
  }
}

export async function uploadAndProcess(file: File): Promise<{ documentId: string; fileName: string }> {
  // 1. Upload file to storage
  const { url: fileUrl } = await uploadFile(file);

  // 2. Create document record
  const documentId = await createDocument(fileUrl, file.type);

  // 3. Process embedding
  await processEmbedding({
    document_id: documentId,
    file_url: fileUrl,
    mime_type: file.type,
  });

  return { documentId, fileName: file.name };
}
