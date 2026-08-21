-- optional
-- Optional pgvector support for semantic retrieval.
-- Applied only when the 'vector' extension is available. The migration runner
-- tolerates failure so the app still works on plain Postgres (falling back to
-- full-text/keyword retrieval).

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE sources ADD COLUMN IF NOT EXISTS embedding vector(1024);

CREATE INDEX IF NOT EXISTS idx_sources_embedding
  ON sources USING hnsw (embedding vector_cosine_ops);
