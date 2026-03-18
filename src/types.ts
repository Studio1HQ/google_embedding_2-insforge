export interface Source {
  content: string;
  document_id: string;
  similarity: number;
  created_at: string;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
}
