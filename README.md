# Multimodal RAG with Google Gemini Embeddings × InsForge

A full-stack multimodal Retrieval-Augmented Generation (RAG) demo. Upload text and images, ask questions in natural language, and get AI-generated answers grounded in your own content — with cited sources.

Built with **InsForge BaaS**, **Google Gemini Embedding 2**, and **React + Vite**.

<img width="1331" height="847" alt="image" src="https://github.com/user-attachments/assets/7b3f3b12-9d2c-48b7-924e-69118eb6a38d" />

---

## How it works

1. **Upload** — text or images are embedded using Google Gemini Embedding 2 Preview (natively multimodal: text and images in the same vector space) and stored in InsForge's pgvector database. Images are natively supported by the vector without needing external textual mapping.
2. **Search** — your question is embedded with the same Gemini model and matched against stored content using cosine similarity via pgvector.
3. **Answer** — The exact image and relevant text are loaded into InsForge Model Gateway running **Gemini 2.5 Flash Lite**. It generates a multimodal answer natively analyzing the raw image based on the question and stored knowledge.

Data is fully isolated per user — every upload, embedding, and storage path is scoped to the authenticated user's ID.

---

## InsForge features used

| Feature              | Usage                                                           |
| -------------------- | --------------------------------------------------------------- |
| **InsForge Auth**    | Sign-up / sign-in via hosted auth pages, session management     |
| **Model Gateway**    | Gemini 2.5 Flash Lite for multimodal RAG answer generation      |
| **InsForge Vector**  | pgvector cosine similarity search on 1024-dim Gemini embeddings |
| **InsForge Storage** | Image uploads stored under `uploads/{userId}/`                  |
| **Edge Functions**   | Deno serverless functions for embedding processing and query    |

---

## Tech stack

- **InsForge BaaS** — database (pgvector), storage, edge functions, auth, AI gateway
- **Google Gemini** — natively multimodal representations (Embedding 2 Preview)
- **React + Vite + TypeScript + Tailwind CSS** — frontend

---

## Project structure

```
functions/
  process.ts        # Edge function: embed uploaded content, store vector + user_id
  query.ts          # Edge function: embed query, similarity search, generate answer
src/
  api.ts            # Frontend API client — all InsForge calls with user JWT
  App.tsx           # App shell, auth state, routing between landing / app views
  components/
    LandingPage.tsx # Public landing page with auth buttons
    UploadPanel.tsx # Text input + image drag-and-drop, calls api.ts
    QueryPanel.tsx  # Chat interface, calls query edge function
  lib/
    insforge.ts     # InsForge SDK client instance
public/
  insforge-wordmark.svg
  gemini-logo.svg
```

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-org/insforge-google-embedding.git
cd insforge-google-embedding
npm install
```

### 2. Configure environment

```bash
cp env.example .env
```

Fill in `.env` with your InsForge project values (from your [InsForge dashboard](https://insforge.dev)):

```
VITE_INSFORGE_BASE_URL=https://your-app.region.insforge.app
VITE_API_URL=https://your-app.region.insforge.app
VITE_INSFORGE_ANON_KEY=your_anon_key
```

### 3. Database setup

Run the following SQL in your InsForge dashboard (SQL editor):

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  file_url text,
  file_type text,
  created_at timestamp DEFAULT now()
);

-- Embeddings table
CREATE TABLE embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid,
  user_id uuid,
  embedding vector(1024),
  content text,
  created_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON embeddings (user_id);
CREATE INDEX ON documents (user_id);

-- Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select_own" ON documents FOR SELECT
  USING (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);
CREATE POLICY "documents_insert_own" ON documents FOR INSERT
  WITH CHECK (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);
CREATE POLICY "documents_delete_own" ON documents FOR DELETE
  USING (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);

CREATE POLICY "embeddings_select_own" ON embeddings FOR SELECT
  USING (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);
CREATE POLICY "embeddings_insert_own" ON embeddings FOR INSERT
  WITH CHECK (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);
CREATE POLICY "embeddings_delete_own" ON embeddings FOR DELETE
  USING (user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid);
```

### 4. Storage bucket

Create a bucket named `uploads` in your InsForge dashboard (Storage → New bucket).

### 5. Edge function secrets

Set these in InsForge dashboard → Settings → Secrets:

| Secret                  | Value                                                       |
| ----------------------- | ----------------------------------------------------------- |
| `GOOGLE_API_KEY`        | From [Google AI Studio](https://aistudio.google.com/apikey) |
| `API_KEY`               | Your InsForge service/admin key                             |
| `ANON_KEY`              | Your InsForge anonymous key                                 |
| `INSFORGE_BASE_URL`     | `https://your-app.region.insforge.app`                      |
| `INSFORGE_INTERNAL_URL` | Internal URL (from InsForge dashboard)                      |

### 6. Deploy edge functions

```bash
npx insforge functions deploy process-embedding --path functions/process.ts
npx insforge functions deploy query-embedding --path functions/query.ts
```

### 7. Run locally

```bash
npm run dev
```

---

## Deploy to Vercel

Push to GitHub, connect to Vercel, and set the same environment variables (`VITE_INSFORGE_BASE_URL`, `VITE_API_URL`, `VITE_INSFORGE_ANON_KEY`) in Vercel's project settings. The `vercel.json` handles SPA routing.

## Screenshots

<img width="1445" height="859" alt="Screenshot 2026-03-21 145409" src="https://github.com/user-attachments/assets/20f186e9-5053-4b01-b5f8-de3a2306a6cd" />

<img width="1775" height="834" alt="Screenshot 2026-03-21 135230" src="https://github.com/user-attachments/assets/39a7e2f4-fb35-4d97-9b22-ca6ab6e3e830" />

<img width="1515" height="870" alt="image" src="https://github.com/user-attachments/assets/6ae4a788-a333-437a-9cd9-15761cf04a00" />

<img width="1655" height="862" alt="Screenshot 2026-03-21 143033" src="https://github.com/user-attachments/assets/1cd6dc36-a33e-45a2-8bc8-49e606b7a19b" />
