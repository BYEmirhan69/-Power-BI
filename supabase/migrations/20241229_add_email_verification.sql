-- =============================================
-- Email Verification System
-- =============================================

-- Email Verification Tokens Table
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL, -- SHA-256 hash of the token
    email TEXT NOT NULL, -- Email address token was sent to
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ, -- When the token was used (null if not used)
    ip_address INET, -- IP address that requested the token
    
    -- Ensure we can look up by token hash
    CONSTRAINT unique_token_hash UNIQUE (token_hash)
);

-- Add email verification fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Rate limiting table for resend verification
CREATE TABLE IF NOT EXISTS public.verification_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    attempts INTEGER DEFAULT 1,
    first_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    blocked_until TIMESTAMPTZ,
    
    CONSTRAINT unique_rate_limit_email UNIQUE (email)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON public.email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires_at ON public.email_verification_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_rate_limits_email ON public.verification_rate_limits(email);

-- RLS Policies for email_verification_tokens
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow service role to insert/select/update tokens
CREATE POLICY "Service role can manage tokens" 
ON public.email_verification_tokens
FOR ALL 
USING (auth.role() = 'service_role');

-- RLS for verification_rate_limits
ALTER TABLE public.verification_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage rate limits" 
ON public.verification_rate_limits
FOR ALL 
USING (auth.role() = 'service_role');

-- Function to clean up expired tokens (can be called by cron)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM public.email_verification_tokens 
    WHERE expires_at < NOW() AND used_at IS NULL;
    
    DELETE FROM public.verification_rate_limits
    WHERE last_attempt_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment for documentation
COMMENT ON TABLE public.email_verification_tokens IS 'Stores hashed email verification tokens with expiry';
COMMENT ON COLUMN public.email_verification_tokens.token_hash IS 'SHA-256 hash of the verification token';
COMMENT ON COLUMN public.email_verification_tokens.used_at IS 'Timestamp when token was verified, null if not used';
