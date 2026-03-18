# Building a Multimodal RAG System with Google Gemini Embeddings and InsForge


- This is a Multimodal RAG (Retrieval-Augmented Generation) system that lets users upload text and images, then ask natural language questions about them. 

- When content is uploaded, it is converted into vector embeddings using Google's Gemini Embedding 2 Preview model — which natively supports text and image inputs. 

- For images, GPT-4o Mini (via InsForge AI Gateway) generates a detailed text description that is stored alongside the vector for context.

- When a user asks a question, the query is embedded using the same Gemini model, a cosine similarity search finds the most relevant stored content from PostgreSQL + pgvector, and the top matches are sent as context to GPT-4o Mini which generates a grounded answer. 

- The entire backend runs on InsForge — edge functions (Deno), PostgreSQL with vector search, file storage, and AI gateway — with the frontend deployed at https://334ywi9p.insforge.site.

<img width="1711" height="874" alt="Screenshot 2026-03-18 171616" src="https://github.com/user-attachments/assets/4c857715-7302-4f89-843b-62a277efacd3" />



<img width="1740" height="867" alt="Screenshot 2026-03-18 164058" src="https://github.com/user-attachments/assets/6bdf9f35-5d5f-48cb-83cc-49b64925a4aa" />
