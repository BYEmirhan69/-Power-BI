-- =============================================
-- 2FA (Two-Factor Authentication) Tables
-- =============================================

-- 2FA Configuration Table
CREATE TABLE IF NOT EXISTS public.user_2fa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    secret_encrypted TEXT NOT NULL,
    backup_codes_encrypted TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    enabled_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    recovery_codes_remaining INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2FA Verification Attempts (brute-force koruması için)
CREATE TABLE IF NOT EXISTS public.two_factor_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address INET,
    attempt_type TEXT NOT NULL CHECK (attempt_type IN ('totp', 'backup_code', 'setup')),
    success BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_2fa_user_id ON public.user_2fa(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_attempts_user_id ON public.two_factor_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_attempts_created_at ON public.two_factor_attempts(created_at);

-- RLS Policies
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.two_factor_attempts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own 2FA settings
CREATE POLICY "Users can view own 2FA settings" ON public.user_2fa
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own 2FA settings" ON public.user_2fa
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own 2FA settings" ON public.user_2fa
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all 2FA settings (for support)
CREATE POLICY "Admins can view all 2FA settings" ON public.user_2fa
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can view their own attempts
CREATE POLICY "Users can view own 2FA attempts" ON public.two_factor_attempts
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert attempts (via service role)
CREATE POLICY "System can insert 2FA attempts" ON public.two_factor_attempts
    FOR INSERT WITH CHECK (true);

-- Cleanup function for old attempts (30 days)
CREATE OR REPLACE FUNCTION cleanup_old_2fa_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM public.two_factor_attempts 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
