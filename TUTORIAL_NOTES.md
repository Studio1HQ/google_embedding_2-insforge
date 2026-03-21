# Building a Multimodal RAG System with Google Gemini Embeddings and InsForge

---

## Introduction

- RAG (Retrieval-Augmented Generation) is a pattern where you store your own data, retrieve the most relevant pieces when a user asks a question, and feed that context to an LLM to generate a grounded answer — instead of relying on the model's training data alone.
- "Multimodal" means the system handles more than just text. In this project, users can upload both **text and images**, and the system understands both modalities in a unified way.
- The core of this system is **Google's Gemini Embedding 2 Preview** — a multimodal embedding model that natively accepts text, images, and audio as input and produces a single vector representation. This is significant because most embedding models (OpenAI's `text-embedding-3`, Cohere Embed, etc.) only handle text. Gemini Embedding 2 Preview places text and images in the **same vector space**, enabling true cross-modal semantic search.
- The embedding vectors are stored in **PostgreSQL with pgvector** — turning a standard relational database into a vector database without needing a separate service like Pinecone or Weaviate.
- When a user asks a question, the query is embedded using the same Gemini model, a **cosine similarity search** finds the most relevant stored content, and **GPT-4o Mini** generates a grounded answer using only the retrieved context.
- The entire backend — database, edge functions, file storage, and AI model access — runs on **InsForge**, a Backend-as-a-Service platform. The frontend is a React app deployed on Vercel.

---

## What We Will Be Building

- A full-stack multimodal RAG application where users can:
  1. Upload text snippets or images to build a personal knowledge base
  2. Ask natural language questions about their uploaded content
  3. Receive AI-generated answers grounded in their actual data, with source citations and similarity scores

- The system architecture has three layers:
  - **Frontend:** React + Vite + Tailwind CSS — a split-panel UI with an upload panel and a chat-style query panel
  - **Backend (Edge Functions):** Two Deno-based serverless functions on InsForge — one for processing/embedding content, one for searching and generating answers
  - **Data Layer:** PostgreSQL with pgvector for vector storage and similarity search, plus InsForge Storage for uploaded image files

- The AI pipeline uses two models:
  - **Gemini Embedding 2 Preview** — generates 1024-dimensional vector embeddings from text or images
  - **GPT-4o Mini** (via InsForge AI Gateway) — generates text descriptions of uploaded images AND generates final RAG answers from retrieved context

---

### Why InsForge

- InsForge is a Backend-as-a-Service (BaaS) platform that consolidates multiple backend services into one:
  - **PostgreSQL database** with extension support (including pgvector)
  - **Edge Functions** — Deno-based serverless functions for backend logic
  - **Storage** — file upload buckets with public URL generation
  - **AI Gateway** — a unified API endpoint to call LLMs from multiple providers (OpenAI, Anthropic, Google, etc.) without managing separate API keys for each
- For this project, InsForge eliminates the need to stitch together separate services for database hosting, serverless compute, file storage, and AI model access. Everything is managed from one dashboard with one SDK.
- The InsForge SDK (`@insforge/sdk`) provides a client for database operations and the platform exposes REST APIs for storage, raw SQL, and AI completions.

### InsForge CLI

- InsForge provides CLI tooling through **agent skills** — installable packages that add CLI commands for project management.
- Key CLI operations used in this project:
  - `insforge init` — initialize and link a local project to an InsForge project
  - `insforge functions deploy` — deploy edge functions from the local `functions/` directory
  - Managing database tables, storage buckets, and environment secrets from the dashboard or CLI
- The `.insforge/project.json` file stores the project binding — project ID, region, API key, and the base URL for all API calls.

---

## Tutorial: How to Build a Multimodal RAG System with Google Gemini Embeddings

---

### Step 1: Repository Setup

- Clone the project repository and install dependencies with `npm install`.
- Install InsForge agent skills with `npx insforge install insforge/agent-skills` — this gives you CLI access for deploying functions and managing the project.
- The project structure separates concerns clearly:
  - `functions/` — backend edge functions (Deno runtime, deployed to InsForge)
  - `src/` — frontend React application
  - `src/api.ts` — the API client that bridges frontend to InsForge backend
  - `src/components/` — React UI components (LandingPage, UploadPanel, QueryPanel)
  - `.insforge/` — project configuration binding
- Create a `.env` file from `env.example` with your InsForge project URL and anonymous key. These are the only two values the frontend needs — the base URL to reach your InsForge backend, and the anon key for client-side authentication.

---

### Step 2: Configuring the Database & Enabling pgvector

- In the InsForge dashboard, enable the **pgvector** extension on your PostgreSQL database. This adds the `vector` data type and similarity operators to PostgreSQL.
- Create two tables:
  - **`documents`** — tracks each uploaded item (text or image) with a UUID primary key, file URL, file type, and timestamp. This is the parent record for each piece of content.
  - **`embeddings`** — stores the actual vector embeddings. Each row has a `vector(1024)` column for the Gemini embedding, a `content` text column for the readable description (used as RAG context), and a foreign key to `documents`.
- The `vector(1024)` column type means each embedding is a 1024-dimensional float array. This dimension is set when calling the Gemini API with `outputDimensionality: 1024`. Gemini Embedding 2 Preview supports up to 3072 dimensions, but 1024 provides a good balance of search quality and storage efficiency.
- The `content` column is critical for the RAG pipeline — it stores either the raw text (for text uploads) or a GPT-4o Mini-generated description (for image uploads). This is what gets sent to the LLM as context when answering questions.

---

### Step 3: Creating Indexes for Similarity Search

- Create an **IVFFlat index** on the `embedding` column using `vector_cosine_ops`. IVFFlat (Inverted File Flat) is an approximate nearest neighbor index provided by pgvector that clusters vectors into lists for faster search.
- The `vector_cosine_ops` operator class tells pgvector to use **cosine distance** as the similarity metric. Cosine similarity measures the angle between two vectors — it's the standard metric for embedding similarity because it's invariant to vector magnitude.
- The similarity search in this project uses pgvector's `<=>` operator (cosine distance), converted to similarity with `1 - distance`. Results are filtered with a threshold of 0.25 (excluding low-relevance matches) and limited to the top 3 results.
- The search is executed via InsForge's raw SQL API endpoint, which allows parameterized queries. The query vector (the user's embedded question) is passed as a parameter and cast to `::vector` for pgvector compatibility.

---

### Step 4: Create Storage Buckets

- Create a storage bucket named **`uploads`** in the InsForge dashboard. This bucket stores uploaded image files.
- When a user uploads an image, the frontend sends it as `FormData` to InsForge's storage API. The API returns a public URL and a storage key for the uploaded file.
- The edge function later fetches this file by URL to convert it to base64 for the Gemini embedding API. InsForge supports internal URL rewriting so edge functions can fetch storage files via an internal network path instead of going through the public internet — improving latency.
- The bucket should allow public read access so the storage URLs are accessible. Authentication for uploads is handled via the anonymous key in the Authorization header.

---

### Step 5: Creating Edge Functions (Process & Query)

- Two edge functions power the entire backend. They run on InsForge's Deno-based edge runtime — no bundling or transpilation needed.

**Process function (`functions/process.ts`):**
- Receives a POST request with `document_id`, and optionally `text`, `file_url`, and `mime_type`.
- For **text uploads**: the text is sent directly to the Gemini Embedding API as a text part.
- For **image uploads**: the function fetches the image from InsForge Storage, converts it to base64, and sends it as an `inline_data` part to Gemini. Gemini Embedding 2 Preview natively understands images — no text conversion needed for the embedding step.
- However, for the RAG context, a readable text description IS needed. The function calls **GPT-4o Mini via InsForge AI Gateway** with the image and a prompt asking for a detailed description. This description is stored in the `content` column alongside the vector.
- The Gemini Embedding API is called at `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent` with `outputDimensionality: 1024`.
- The resulting 1024-dimensional vector is stored in the `embeddings` table using the InsForge SDK's database client.

**Query function (`functions/query.ts`):**
- Receives a POST request with a `query` string (the user's question).
- Embeds the query using the same Gemini model and dimensionality (1024) — this is essential because query and document embeddings must be in the same vector space.
- Executes a cosine similarity search via InsForge's raw SQL API — finds the top 3 embeddings with similarity > 0.25.
- Concatenates the `content` fields of the matched results into a context string.
- Sends the context + question to **GPT-4o Mini via InsForge AI Gateway** with a system prompt: "Answer ONLY using the provided context." This ensures the answer is grounded in the user's actual data.
- Returns the generated answer plus the source documents with their similarity scores.

**Secrets / Environment Variables:**
- The edge functions require these secrets configured in the InsForge dashboard:
  - `GOOGLE_API_KEY` — from Google AI Studio (https://aistudio.google.com/apikey), used to call the Gemini Embedding API
  - `API_KEY` — the InsForge service key for authenticated internal calls (raw SQL, AI gateway)
  - `ANON_KEY` — the InsForge anonymous key for SDK database operations
  - `INSFORGE_BASE_URL` — the project's public base URL
  - `INSFORGE_INTERNAL_URL` — internal URL for edge function → storage communication
- The `GOOGLE_API_KEY` is the only external API key needed. All LLM calls (GPT-4o Mini) go through InsForge's AI Gateway, which routes to OpenRouter — so you don't need a separate OpenAI API key.

**Deployment:**
- Edge functions are deployed with `npx insforge functions deploy <name> --path functions/<file>.ts`
- Once deployed, they're accessible at `https://<your-app>.region.insforge.app/functions/<function-name>`

---

### Step 6: Create the Frontend

- The frontend is a **React 19 + TypeScript** app scaffolded with **Vite** and styled with **Tailwind CSS**.
- The app has three main views:
  1. **Landing Page** — hero section with branding, "How it works" steps, feature badges, and tech stack display
  2. **Upload Panel** (left side) — text input area with an "Add Text" button, and a drag-and-drop image upload zone. Shows a list of uploaded items with real-time status (processing spinner, green checkmark for done, error state). Includes "Clear all" to reset.
  3. **Query Panel** (right side) — chat-style interface. User types a question, sees their message as a bubble, then receives an AI answer in a card with a "Copy" button. Each answer has a collapsible "sources" section showing matched documents with similarity percentages.

- The **API client** (`src/api.ts`) is the bridge between frontend and backend. It handles:
  - File uploads to InsForge Storage
  - Creating document records in the database
  - Calling the process edge function to generate embeddings
  - Calling the query edge function to search and get answers
  - Deleting embeddings (per-document or all)
  - An orchestrated `uploadAndProcess()` function that chains upload → create document → process embedding

- The **upload flow** for images: upload file to storage → get URL → create document record → call process edge function with file URL and MIME type → edge function fetches file, generates embedding + description, stores in DB.
- The **upload flow** for text: create document record → call process edge function with text → edge function embeds text, stores in DB.
- The **query flow**: call query edge function with question text → edge function embeds query, searches pgvector, calls GPT-4o Mini → returns answer + sources → frontend displays in chat UI.

- State management is minimal — React's `useState` and `useCallback` handle everything. No Redux or external state library needed.
- Tailwind CSS handles all styling with custom animations for fade-in, slide-up, and loading dot pulse effects.
- The Inter font is loaded from Google Fonts for clean typography.

---

### Step 7: Deploy the App

- **Frontend deployment on Vercel:**
  - Push the repo to GitHub and connect it to Vercel
  - Set environment variables: `VITE_INSFORGE_BASE_URL` and `VITE_INSFORGE_ANON_KEY`
  - Vercel auto-detects Vite, runs `npm run build` (which executes `tsc -b && vite build`)
  - The `vercel.json` file configures SPA routing — all routes rewrite to `/index.html` so client-side routing works
- **Alternative:** Deploy to InsForge Sites for a fully InsForge-hosted solution
- **Backend is already live** once edge functions are deployed and database/storage are configured in the InsForge dashboard
- No CORS configuration needed — InsForge edge functions handle cross-origin requests

---

### Step 8: Results

- The deployed app demonstrates a complete multimodal RAG pipeline:
  - **Text → Vector → Search → Answer:** Upload a paragraph of text, ask a question about it, get a grounded answer with the source cited
  - **Image → Vector + Description → Search → Answer:** Upload an image (e.g., a chart, screenshot, photo), the system generates both a vector embedding and a text description, then you can ask questions about the image content
  - **Cross-modal search:** Because Gemini Embedding 2 Preview places text and images in the same vector space, a text query can match against image embeddings and vice versa
- Each answer shows similarity scores (e.g., "87% match") so users can gauge relevance
- The system prompt "Answer ONLY using the provided context" prevents hallucination — the LLM won't make up information beyond what's in the retrieved documents
- Response times are fast due to edge function execution, IVFFlat indexing for approximate nearest neighbor search, and the lightweight GPT-4o Mini model for answer generation

---

## Key Takeaways

1. **Gemini Embedding 2 Preview enables true multimodal RAG** — Unlike text-only embedding models, it natively embeds images and text into the same vector space, making cross-modal semantic search possible without workarounds like converting images to text before embedding.

2. **The dual-representation strategy is key for image RAG** — The Gemini vector captures semantic meaning for search, while the GPT-4o Mini text description provides readable context for answer generation. You need both: vectors for finding, text for answering.

3. **pgvector turns PostgreSQL into a vector database** — No need for a dedicated vector DB. The pgvector extension adds vector storage, cosine/L2/inner product distance operators, and IVFFlat/HNSW indexing directly to PostgreSQL. Your vectors live alongside your relational data.

4. **Cosine similarity is the standard metric for embedding search** — It measures directional similarity between vectors (0 to 1), making it invariant to magnitude. The 0.25 threshold used in this project filters out noise while keeping relevant matches.

5. **The RAG pattern is simple: Retrieve → Augment → Generate** — Embed the query, find similar stored content, concatenate it as context, and ask an LLM to answer using only that context. The "only use provided context" system prompt is what prevents hallucination.

6. **InsForge consolidates the backend** — Database, edge functions, storage, and AI gateway in one platform. This eliminates the integration overhead of connecting separate services (e.g., Neon for DB + Cloudflare Workers for compute + S3 for storage + OpenRouter for AI).

7. **Edge functions on Deno are well-suited for AI pipelines** — Native `fetch`, `btoa`, and modern JS support means no bundling needed. A single function can fetch a file, convert to base64, call an embedding API, and write to a database — all in one request cycle.

8. **Embedding dimensionality is a trade-off** — Gemini supports up to 3072 dimensions, but 1024 provides strong search quality with lower storage and compute cost. The dimension must match between the database column definition and the API call parameter.

9. **The frontend is intentionally minimal** — React 19 with hooks, Tailwind for styling, and a single `api.ts` module for all backend communication. No state management library, no complex routing. The split-panel layout (upload left, chat right) maps directly to the two-step user flow.

10. **Security is layered** — The frontend uses the anonymous key for client-facing operations (uploads, reads). Edge functions use the service API key for privileged operations (raw SQL, AI gateway). The Google API key exists only as a server-side secret, never exposed to the browser.
