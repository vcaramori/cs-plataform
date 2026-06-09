-- Remoção do legado Pinecone: o RAG usa pgvector (tabela embeddings).
-- As colunas pinecone_vector_id não são mais usadas por nenhum código.
alter table public.interactions drop column if exists pinecone_vector_id;
alter table public.support_tickets drop column if exists pinecone_vector_id;

notify pgrst, 'reload schema';
