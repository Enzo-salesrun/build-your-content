-- Vector similarity search function for RAG
CREATE OR REPLACE FUNCTION match_viral_posts(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id uuid,
    content text,
    hook text,
    metrics jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        viral_posts_bank.id,
        viral_posts_bank.content,
        viral_posts_bank.hook,
        viral_posts_bank.metrics,
        1 - (viral_posts_bank.embedding <=> query_embedding) as similarity
    FROM viral_posts_bank
    WHERE 1 - (viral_posts_bank.embedding <=> query_embedding) > match_threshold
    ORDER BY viral_posts_bank.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
