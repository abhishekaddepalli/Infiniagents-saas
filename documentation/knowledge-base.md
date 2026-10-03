# Knowledge bases (RAG)

A knowledge base lets an agent answer from *your* documents instead of only
from what the model happens to know. Attach one to an agent and every message
retrieves the closest passages, hands them to the model, and cites them in the
reply.

---

## How it works

```
Upload a file
   │
   ▼
extract.ts    txt / md / csv / json / html read directly; pdf via unpdf
   │
   ▼
chunk.ts      split on markdown headings, then paragraphs, then sentences
   │           ~800 characters per chunk, 120 characters of overlap
   ▼
embed.ts      OpenAI or Gemini embeddings — or the local keyword embedder
   │           when no key is configured and DEMO_MODE is on
   ▼
document_chunks   content + embedding stored as a float array
```

At query time:

```
User message
   │
   ▼
embed the query with the SAME model the base was indexed with
   │
   ▼
search.ts     cosine similarity against every chunk in the base
   │           top 5 above a 0.12 score floor
   ▼
buildContextBlock()  wraps them in a <context> block with instructions to
   │                 prefer the context and admit when it does not contain
   ▼                 the answer
system prompt + context  →  the model
```

The retrieved passages are stored on the message, so the playground and the
API can show which documents an answer came from.

---

## Why chunking on headings matters

This is the single most common reason a knowledge base "does not work".

If a chunk spans several topics, its embedding is an average of all of them and
matches nothing strongly. Splitting on markdown headings keeps each chunk to one
subject. In this template's own demo content, moving from paragraph-packing to
heading-aware chunking took a "refund policy" query from returning the *billing*
section to returning the *refund* section, and roughly doubled the similarity
score.

If your documents have no headings, add them. It is the cheapest quality win
available.

---

## Demo Mode: the local embedder

With no OpenAI or Gemini key configured and `DEMO_MODE=true`, documents are
indexed with `src/lib/knowledge/local-embed.ts` — a hashed bag-of-words vector.

**It matches wording, not meaning.** It will find "invoice" from "invoice", but
not from "billing". That is enough to demonstrate the whole pipeline without an
API key, and no more. The UI labels any base indexed this way.

A base records the model it was indexed with, and queries use the same one —
otherwise vectors from two different models would be compared and every result
would be noise. To upgrade a demo base to real embeddings: add a provider key,
create a **new** base, and re-upload.

---

## Choosing an embedding model

| Provider | Model | Notes |
|---|---|---|
| OpenAI | `text-embedding-3-small` | Good default: cheap and accurate |
| OpenAI | `text-embedding-3-large` | Better recall, higher cost |
| Gemini | `text-embedding-004` | Good, and free tier friendly |

**Anthropic has no embeddings endpoint.** Your agents can run on Claude while
the knowledge base embeds with OpenAI or Gemini — they are independent choices.

Add embedding models to the catalog in **Admin → AI Models** with
`kind` set to `embedding`, and they appear in the base creation form.

---

## Scaling: when to move to pgvector

Similarity is computed in application code (`search.ts`), which means the
template installs on any stock PostgreSQL with no extensions. Chunks for the
queried base are loaded and scored in memory, capped at 5,000 candidates.

That is the right trade for a template. Past roughly 50,000 chunks you want the
database doing this work:

1. Enable the extension: `CREATE EXTENSION vector;`
2. Change the column type:
   ```sql
   ALTER TABLE document_chunks
     ALTER COLUMN embedding TYPE vector(1536) USING embedding::vector(1536);
   CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);
   ```
   (1536 is the dimension of `text-embedding-3-small`; match your model.)
3. Replace the body of `searchKnowledgeBase` with a raw query:
   ```ts
   const rows = await prisma.$queryRaw`
     SELECT id, document_id, content, 1 - (embedding <=> ${queryVector}::vector) AS score
     FROM document_chunks
     WHERE knowledge_base_id = ${knowledgeBaseId}
     ORDER BY embedding <=> ${queryVector}::vector
     LIMIT ${limit}
   `
   ```

Nothing else changes — the function's signature and return shape stay the same.

---

## Supported file types and limits

| Format | How it is read |
|---|---|
| `.txt`, `.md`, `.markdown` | Directly |
| `.csv`, `.json` | Directly (JSON is pretty-printed first) |
| `.html`, `.htm` | Tags stripped |
| `.pdf` | Text extracted with `unpdf` |

- **5 MB** per file.
- Scanned PDFs contain no text layer and are rejected with a message saying so —
  run OCR first.
- Document counts are limited per plan (**Admin → Plans**).

---

## Ingestion runs inline

`ingestDocument` runs inside the upload request. That is fine for 5 MB files and
keeps the code readable. For larger corpora, move it behind a job queue: the
function already takes only ids and updates the document's status as it goes, so
the change is confined to the caller.

---

## Tuning retrieval

All in `src/lib/knowledge/`:

| Setting | Where | Default |
|---|---|---|
| Chunk size | `chunk.ts` → `CHUNK_CHARS` | 800 characters |
| Overlap | `chunk.ts` → `OVERLAP_CHARS` | 120 characters |
| Minimum chunk | `chunk.ts` → `MIN_CHUNK_CHARS` | 60 characters |
| Results returned | `search.ts` → `limit` argument | 5 |
| Score floor | `search.ts` → `MIN_SCORE` | 0.12 |
| Candidate cap | `search.ts` → `MAX_CANDIDATES` | 5,000 |

Use **Test retrieval** on the knowledge base screen to see exactly what an agent
would be handed for a given question. If the wrong passage comes back, that is
where to start — not in the agent's prompt.
