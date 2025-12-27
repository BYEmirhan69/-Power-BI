-- =============================================
-- Rate Limiting & Security Tables
-- =============================================

-- Rate Limit Configuration Table
CREATE TABLE IF NOT EXISTS public.rate_limit_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    endpoint_pattern TEXT NOT NULL,
    max_requests INTEGER NOT NULL DEFAULT 100,
    window_seconds INTEGER NOT NULL DEFAULT 60,
    penalty_seconds INTEGER DEFAULT 300,
    enabled BOOLEAN DEFAULT TRUE,
    applies_to TEXT[] DEFAULT ARRAY['all'], -- 'all', 'authenticated', 'anonymous', 'admin', 'user'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate Limit Tracking Table
CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- IP address or user_id
    identifier_type TEXT NOT NULL CHECK (identifier_type IN ('ip', 'user', 'api_key')),
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    window_end TIMESTAMPTZ NOT NULL,
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IP Access Control List
CREATE TABLE IF NOT EXISTS public.ip_access_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    list_type TEXT NOT NULL CHECK (list_type IN ('allow', 'deny')),
    reason TEXT,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES public.organizations(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Events Log
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL CHECK (event_type IN (
        'rate_limit_exceeded',
        'brute_force_detected',
        'ip_blocked',
        'suspicious_activity',
        'failed_login_attempt',
        'unauthorized_access',
        'scraping_detected',
        '2fa_bypass_attempt'
    )),
    ip_address INET,
    user_id UUID REFERENCES auth.users(id),
    user_agent TEXT,
    endpoint TEXT,
    request_data JSONB,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocked IPs (Auto-blocked due to security events)
CREATE TABLE IF NOT EXISTS public.blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    blocked_count INTEGER DEFAULT 1,
    first_blocked_at TIMESTAMPTZ DEFAULT NOW(),
    last_blocked_at TIMESTAMPTZ DEFAULT NOW(),
    unblock_at TIMESTAMPTZ,
    permanent BOOLEAN DEFAULT FALSE,
    security_event_id UUID REFERENCES public.security_events(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_identifier ON public.rate_limit_tracking(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_window ON public.rate_limit_tracking(window_end);
CREATE INDEX IF NOT EXISTS idx_ip_access_list_ip ON public.ip_access_list(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_access_list_type ON public.ip_access_list(list_type);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON public.security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON public.blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_unblock ON public.blocked_ips(unblock_at) WHERE unblock_at IS NOT NULL;

-- RLS Policies
ALTER TABLE public.rate_limit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_access_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Only admins can manage rate limit config
CREATE POLICY "Admins can manage rate limits" ON public.rate_limit_config
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Admins can view security events
CREATE POLICY "Admins can view security events" ON public.security_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Admins can manage IP access list
CREATE POLICY "Admins can manage IP list" ON public.ip_access_list
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Admins can manage blocked IPs
CREATE POLICY "Admins can manage blocked IPs" ON public.blocked_ips
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Insert default rate limit configurations
INSERT INTO public.rate_limit_config (name, description, endpoint_pattern, max_requests, window_seconds, penalty_seconds) VALUES
    ('api_general', 'General API rate limit', '/api/*', 100, 60, 300),
    ('auth_login', 'Login attempts', '/api/auth/login', 5, 300, 900),
    ('auth_register', 'Registration attempts', '/api/auth/register', 3, 3600, 3600),
    ('data_upload', 'Data upload limit', '/api/datasets/upload', 10, 3600, 1800),
    ('report_generate', 'Report generation', '/api/reports/generate', 5, 3600, 1800),
    ('ai_requests', 'AI feature requests', '/api/ai/*', 20, 3600, 1800)
ON CONFLICT (name) DO NOTHING;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_identifier_type TEXT,
    p_endpoint TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_config public.rate_limit_config;
    v_tracking public.rate_limit_tracking;
    v_blocked TIMESTAMPTZ;
    v_remaining INTEGER;
BEGIN
    -- Check if IP is blocked
    IF p_identifier_type = 'ip' THEN
        SELECT unblock_at INTO v_blocked
        FROM public.blocked_ips
        WHERE ip_address = p_identifier::INET
            AND (unblock_at IS NULL OR unblock_at > NOW())
            AND permanent = FALSE;
        
        IF v_blocked IS NOT NULL OR EXISTS (
            SELECT 1 FROM public.blocked_ips 
            WHERE ip_address = p_identifier::INET AND permanent = TRUE
        ) THEN
            RETURN jsonb_build_object(
                'allowed', false,
                'blocked', true,
                'unblock_at', v_blocked,
                'reason', 'IP blocked'
            );
        END IF;
    END IF;

    -- Get matching config
    SELECT * INTO v_config
    FROM public.rate_limit_config
    WHERE p_endpoint LIKE REPLACE(endpoint_pattern, '*', '%')
        AND enabled = TRUE
    ORDER BY LENGTH(endpoint_pattern) DESC
    LIMIT 1;
    
    IF v_config IS NULL THEN
        -- No rate limit configured
        RETURN jsonb_build_object('allowed', true, 'remaining', -1);
    END IF;
    
    -- Get or create tracking record
    SELECT * INTO v_tracking
    FROM public.rate_limit_tracking
    WHERE identifier = p_identifier
        AND endpoint = v_config.endpoint_pattern
        AND window_end > NOW();
    
    IF v_tracking IS NULL THEN
        -- New window
        INSERT INTO public.rate_limit_tracking (
            identifier, identifier_type, endpoint, request_count, 
            window_start, window_end
        ) VALUES (
            p_identifier, p_identifier_type, v_config.endpoint_pattern, 1,
            NOW(), NOW() + (v_config.window_seconds || ' seconds')::INTERVAL
        );
        
        RETURN jsonb_build_object(
            'allowed', true,
            'remaining', v_config.max_requests - 1,
            'reset_at', NOW() + (v_config.window_seconds || ' seconds')::INTERVAL
        );
    ELSE
        -- Check if blocked
        IF v_tracking.blocked_until IS NOT NULL AND v_tracking.blocked_until > NOW() THEN
            RETURN jsonb_build_object(
                'allowed', false,
                'blocked', true,
                'unblock_at', v_tracking.blocked_until,
                'reason', 'Rate limit exceeded'
            );
        END IF;
        
        -- Check limit
        IF v_tracking.request_count >= v_config.max_requests THEN
            -- Block the identifier
            UPDATE public.rate_limit_tracking
            SET blocked_until = NOW() + (v_config.penalty_seconds || ' seconds')::INTERVAL,
                updated_at = NOW()
            WHERE id = v_tracking.id;
            
            -- Log security event
            INSERT INTO public.security_events (
                event_type, ip_address, endpoint, severity, metadata
            ) VALUES (
                'rate_limit_exceeded',
                CASE WHEN p_identifier_type = 'ip' THEN p_identifier::INET ELSE NULL END,
                p_endpoint,
                'medium',
                jsonb_build_object('identifier', p_identifier, 'type', p_identifier_type)
            );
            
            RETURN jsonb_build_object(
                'allowed', false,
                'blocked', true,
                'unblock_at', NOW() + (v_config.penalty_seconds || ' seconds')::INTERVAL,
                'reason', 'Rate limit exceeded'
            );
        END IF;
        
        -- Increment counter
        UPDATE public.rate_limit_tracking
        SET request_count = request_count + 1, updated_at = NOW()
        WHERE id = v_tracking.id;
        
        v_remaining := v_config.max_requests - v_tracking.request_count - 1;
        
        RETURN jsonb_build_object(
            'allowed', true,
            'remaining', v_remaining,
            'reset_at', v_tracking.window_end
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to block IP
CREATE OR REPLACE FUNCTION block_ip(
    p_ip_address INET,
    p_reason TEXT,
    p_duration_hours INTEGER DEFAULT 24,
    p_permanent BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
    v_block_id UUID;
BEGIN
    -- Log security event
    INSERT INTO public.security_events (
        event_type, ip_address, severity, metadata
    ) VALUES (
        'ip_blocked', p_ip_address, 'high',
        jsonb_build_object('reason', p_reason, 'permanent', p_permanent)
    ) RETURNING id INTO v_event_id;
    
    -- Add to blocked IPs
    INSERT INTO public.blocked_ips (
        ip_address, reason, unblock_at, permanent, security_event_id
    ) VALUES (
        p_ip_address, p_reason,
        CASE WHEN p_permanent THEN NULL ELSE NOW() + (p_duration_hours || ' hours')::INTERVAL END,
        p_permanent, v_event_id
    )
    ON CONFLICT (ip_address) DO UPDATE SET
        blocked_count = public.blocked_ips.blocked_count + 1,
        last_blocked_at = NOW(),
        reason = p_reason,
        unblock_at = CASE WHEN p_permanent THEN NULL ELSE NOW() + (p_duration_hours || ' hours')::INTERVAL END,
        permanent = p_permanent
    RETURNING id INTO v_block_id;
    
    RETURN v_block_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old rate limit tracking
CREATE OR REPLACE FUNCTION cleanup_rate_limit_tracking()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM public.rate_limit_tracking
    WHERE window_end < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- Also unblock expired IPs
    DELETE FROM public.blocked_ips
    WHERE unblock_at < NOW() AND permanent = FALSE;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
