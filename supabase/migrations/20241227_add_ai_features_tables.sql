-- =============================================
-- AI Features Tables
-- =============================================

-- AI Suggestion Type Enum
DO $$ BEGIN
    CREATE TYPE ai_suggestion_type AS ENUM (
        'chart_recommendation',
        'anomaly_detection',
        'data_insight',
        'query_suggestion',
        'optimization_tip'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AI Model Provider Enum
DO $$ BEGIN
    CREATE TYPE ai_provider AS ENUM ('openrouter', 'openai', 'anthropic', 'local');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AI Configuration Table
CREATE TABLE IF NOT EXISTS public.ai_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Provider Settings
    provider ai_provider DEFAULT 'openrouter',
    model_name TEXT DEFAULT 'x-ai/grok-4.1-fast:free',
    api_key_encrypted TEXT, -- Org-specific key (optional)
    
    -- Feature Toggles
    chart_recommendations_enabled BOOLEAN DEFAULT TRUE,
    anomaly_detection_enabled BOOLEAN DEFAULT TRUE,
    nl_to_chart_enabled BOOLEAN DEFAULT TRUE,
    auto_insights_enabled BOOLEAN DEFAULT TRUE,
    
    -- Limits
    daily_request_limit INTEGER DEFAULT 100,
    current_daily_requests INTEGER DEFAULT 0,
    daily_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 day',
    
    -- Quality Settings
    temperature NUMERIC(3,2) DEFAULT 0.3,
    max_tokens INTEGER DEFAULT 4096,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id)
);

-- AI Suggestions/Recommendations History
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    
    -- Context
    suggestion_type ai_suggestion_type NOT NULL,
    dataset_id UUID REFERENCES public.datasets(id) ON DELETE SET NULL,
    chart_id UUID REFERENCES public.charts(id) ON DELETE SET NULL,
    
    -- Input
    input_data JSONB, -- Sample data or context
    input_prompt TEXT,
    
    -- Output
    suggestion JSONB NOT NULL, -- The actual recommendation
    confidence_score NUMERIC(4,3), -- 0.000 - 1.000
    reasoning TEXT,
    
    -- Feedback
    user_accepted BOOLEAN,
    user_feedback TEXT,
    feedback_at TIMESTAMPTZ,
    
    -- Metadata
    model_used TEXT,
    tokens_used INTEGER,
    latency_ms INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anomaly Detection Results
CREATE TABLE IF NOT EXISTS public.anomaly_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
    
    -- Detection Config
    column_name TEXT NOT NULL,
    detection_method TEXT CHECK (detection_method IN ('zscore', 'iqr', 'isolation_forest', 'ai_based')),
    threshold NUMERIC,
    
    -- Results
    anomalies_found INTEGER DEFAULT 0,
    anomaly_indices INTEGER[],
    anomaly_values JSONB, -- [{index, value, expected, deviation}, ...]
    
    -- Statistics
    mean_value NUMERIC,
    std_deviation NUMERIC,
    min_value NUMERIC,
    max_value NUMERIC,
    
    -- Status
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Natural Language Queries History
CREATE TABLE IF NOT EXISTS public.nl_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    
    -- Input
    query_text TEXT NOT NULL,
    context_dataset_ids UUID[],
    
    -- Parsed Intent
    parsed_intent JSONB, -- {action, metrics, dimensions, filters, time_range}
    
    -- Generated Output
    generated_chart_config JSONB,
    generated_sql TEXT,
    
    -- Result
    chart_id UUID REFERENCES public.charts(id) ON DELETE SET NULL,
    success BOOLEAN,
    error_message TEXT,
    
    -- Feedback
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,
    
    -- Metadata
    tokens_used INTEGER,
    latency_ms INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chart Recommendation Cache
CREATE TABLE IF NOT EXISTS public.chart_recommendations_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
    data_hash TEXT NOT NULL, -- Hash of schema + sample data
    
    -- Recommendations
    recommendations JSONB NOT NULL, -- [{chart_type, config, score, reason}, ...]
    
    -- Cache Info
    expires_at TIMESTAMPTZ NOT NULL,
    hit_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(dataset_id, data_hash)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_config_org ON public.ai_config(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_org ON public.ai_suggestions(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type ON public.ai_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_dataset ON public.ai_suggestions(dataset_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_dataset ON public.anomaly_detections(dataset_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_severity ON public.anomaly_detections(severity) 
    WHERE acknowledged = FALSE;
CREATE INDEX IF NOT EXISTS idx_nl_queries_user ON public.nl_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_nl_queries_org ON public.nl_queries(organization_id);
CREATE INDEX IF NOT EXISTS idx_chart_rec_cache_dataset ON public.chart_recommendations_cache(dataset_id);

-- RLS Policies
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nl_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_recommendations_cache ENABLE ROW LEVEL SECURITY;

-- AI Config: Admins only
CREATE POLICY "Admins can manage AI config" ON public.ai_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
            AND organization_id = ai_config.organization_id
        )
    );

-- Org members can view AI config
CREATE POLICY "Org members can view AI config" ON public.ai_config
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Users can view org suggestions
CREATE POLICY "Org members can view suggestions" ON public.ai_suggestions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Users can create suggestions
CREATE POLICY "Users can create suggestions" ON public.ai_suggestions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Org members can view anomalies
CREATE POLICY "Org members can view anomalies" ON public.anomaly_detections
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Users can view their NL queries
CREATE POLICY "Users can view own NL queries" ON public.nl_queries
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create NL queries" ON public.nl_queries
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Chart recommendations cache accessible by dataset owners
CREATE POLICY "Org members can access chart rec cache" ON public.chart_recommendations_cache
    FOR ALL USING (
        dataset_id IN (
            SELECT d.id FROM public.datasets d
            WHERE d.organization_id IN (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Function to get chart recommendations for a dataset
CREATE OR REPLACE FUNCTION get_chart_recommendations(
    p_dataset_id UUID,
    p_schema JSONB,
    p_sample_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_data_hash TEXT;
    v_cached JSONB;
    v_recommendations JSONB;
BEGIN
    -- Create hash of schema and sample data
    v_data_hash := md5(p_schema::TEXT || p_sample_data::TEXT);
    
    -- Check cache
    SELECT recommendations INTO v_cached
    FROM public.chart_recommendations_cache
    WHERE dataset_id = p_dataset_id 
        AND data_hash = v_data_hash
        AND expires_at > NOW();
    
    IF v_cached IS NOT NULL THEN
        -- Update hit count
        UPDATE public.chart_recommendations_cache
        SET hit_count = hit_count + 1
        WHERE dataset_id = p_dataset_id AND data_hash = v_data_hash;
        
        RETURN jsonb_build_object('cached', true, 'recommendations', v_cached);
    END IF;
    
    -- No cache hit - return null, let application call AI
    RETURN jsonb_build_object('cached', false, 'recommendations', null);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save chart recommendation
CREATE OR REPLACE FUNCTION save_chart_recommendation(
    p_dataset_id UUID,
    p_schema JSONB,
    p_sample_data JSONB,
    p_recommendations JSONB,
    p_ttl_hours INTEGER DEFAULT 24
)
RETURNS BOOLEAN AS $$
DECLARE
    v_data_hash TEXT;
BEGIN
    v_data_hash := md5(p_schema::TEXT || p_sample_data::TEXT);
    
    INSERT INTO public.chart_recommendations_cache (
        dataset_id, data_hash, recommendations, expires_at
    ) VALUES (
        p_dataset_id, v_data_hash, p_recommendations, 
        NOW() + (p_ttl_hours || ' hours')::INTERVAL
    )
    ON CONFLICT (dataset_id, data_hash) DO UPDATE SET
        recommendations = EXCLUDED.recommendations,
        expires_at = EXCLUDED.expires_at,
        hit_count = 0;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect anomalies using Z-score
CREATE OR REPLACE FUNCTION detect_anomalies_zscore(
    p_dataset_id UUID,
    p_column_name TEXT,
    p_threshold NUMERIC DEFAULT 3.0
)
RETURNS UUID AS $$
DECLARE
    v_detection_id UUID;
    v_org_id UUID;
    v_mean NUMERIC;
    v_std NUMERIC;
    v_min NUMERIC;
    v_max NUMERIC;
    v_anomalies JSONB := '[]';
    v_anomaly_count INTEGER := 0;
    v_anomaly_indices INTEGER[] := ARRAY[]::INTEGER[];
BEGIN
    -- Get organization_id from dataset
    SELECT organization_id INTO v_org_id FROM public.datasets WHERE id = p_dataset_id;
    
    -- Calculate statistics from data_entries
    SELECT 
        AVG((data->>p_column_name)::NUMERIC),
        STDDEV((data->>p_column_name)::NUMERIC),
        MIN((data->>p_column_name)::NUMERIC),
        MAX((data->>p_column_name)::NUMERIC)
    INTO v_mean, v_std, v_min, v_max
    FROM public.data_entries
    WHERE dataset_id = p_dataset_id
        AND data->>p_column_name IS NOT NULL
        AND (data->>p_column_name) ~ '^-?[0-9]+\.?[0-9]*$';
    
    IF v_std IS NULL OR v_std = 0 THEN
        -- No variation, no anomalies
        v_std := 1;
    END IF;
    
    -- Find anomalies
    WITH scored AS (
        SELECT 
            row_index,
            (data->>p_column_name)::NUMERIC as value,
            ABS(((data->>p_column_name)::NUMERIC - v_mean) / v_std) as zscore
        FROM public.data_entries
        WHERE dataset_id = p_dataset_id
            AND data->>p_column_name IS NOT NULL
            AND (data->>p_column_name) ~ '^-?[0-9]+\.?[0-9]*$'
    )
    SELECT 
        COUNT(*)::INTEGER,
        ARRAY_AGG(row_index),
        jsonb_agg(jsonb_build_object(
            'index', row_index,
            'value', value,
            'expected', v_mean,
            'zscore', zscore
        ))
    INTO v_anomaly_count, v_anomaly_indices, v_anomalies
    FROM scored
    WHERE zscore > p_threshold;
    
    -- Determine severity
    -- Create detection record
    INSERT INTO public.anomaly_detections (
        organization_id, dataset_id, column_name, detection_method, threshold,
        anomalies_found, anomaly_indices, anomaly_values,
        mean_value, std_deviation, min_value, max_value,
        severity
    ) VALUES (
        v_org_id, p_dataset_id, p_column_name, 'zscore', p_threshold,
        COALESCE(v_anomaly_count, 0), v_anomaly_indices, v_anomalies,
        v_mean, v_std, v_min, v_max,
        CASE 
            WHEN v_anomaly_count > 10 THEN 'critical'
            WHEN v_anomaly_count > 5 THEN 'high'
            WHEN v_anomaly_count > 2 THEN 'medium'
            ELSE 'low'
        END
    ) RETURNING id INTO v_detection_id;
    
    RETURN v_detection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check AI rate limit
CREATE OR REPLACE FUNCTION check_ai_rate_limit(p_organization_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_config public.ai_config;
BEGIN
    SELECT * INTO v_config FROM public.ai_config WHERE organization_id = p_organization_id;
    
    IF v_config IS NULL THEN
        -- Create default config
        INSERT INTO public.ai_config (organization_id)
        VALUES (p_organization_id)
        RETURNING * INTO v_config;
    END IF;
    
    -- Reset if needed
    IF v_config.daily_reset_at < NOW() THEN
        UPDATE public.ai_config
        SET current_daily_requests = 0, daily_reset_at = NOW() + INTERVAL '1 day'
        WHERE organization_id = p_organization_id;
        v_config.current_daily_requests := 0;
    END IF;
    
    -- Check limit
    IF v_config.current_daily_requests >= v_config.daily_request_limit THEN
        RETURN FALSE;
    END IF;
    
    -- Increment
    UPDATE public.ai_config
    SET current_daily_requests = current_daily_requests + 1
    WHERE organization_id = p_organization_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
