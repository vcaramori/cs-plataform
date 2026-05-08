-- Objective: Add sentiment_score to nps_responses for Voice of Customer

ALTER TABLE public.nps_responses
ADD COLUMN IF NOT EXISTS sentiment_score numeric;

COMMENT ON COLUMN public.nps_responses.sentiment_score IS 'Sentiment score extracted by Gemini (-1 to 1)';
