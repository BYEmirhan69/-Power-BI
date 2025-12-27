-- =============================================
-- Cache Layer Tables
-- =============================================

-- Chart Cache Table
CREATE TABLE IF NOT EXISTS public.chart_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chart_id UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
    cache_key TEXT NOT NULL,
    data JSONB NOT NULL,
    filters_hash TEXT,
    data_version INTEGER DEFAULT 1,
    hit_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chart_id, cache_key)
);

-- Query Cache Table (for frequently used queries)
CREATE TABLE IF NOT EXISTS public.query_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    query_hash TEXT NOT NULL,
    query_text TEXT NOT NULL,
    result JSONB NOT NULL,
    row_count INTEGER,
    execution_time_ms INTEGER,
    hit_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, query_hash)
);

-- Dashboard Cache Table
CREATE TABLE IF NOT EXISTS public.dashboard_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
    cache_key TEXT NOT NULL,
    charts_data JSONB NOT NULL,
    filters_hash TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dashboard_id, cache_key)
);

-- Cache Invalidation Log
CREATE TABLE IF NOT EXISTS public.cache_invalidation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('chart', 'dashboard', 'dataset', 'query')),
    entity_id UUID NOT NULL,
    invalidation_reason TEXT NOT NULL,
    invalidated_keys TEXT[],
    invalidated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chart_cache_chart_id ON public.chart_cache(chart_id);
CREATE INDEX IF NOT EXISTS idx_chart_cache_expires ON public.chart_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_chart_cache_key ON public.chart_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_query_cache_org ON public.query_cache(organization_id);
CREATE INDEX IF NOT EXISTS idx_query_cache_expires ON public.query_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_query_cache_hash ON public.query_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_dashboard ON public.dashboard_cache(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_entity ON public.cache_invalidation_log(entity_type, entity_id);

-- RLS Policies
ALTER TABLE public.chart_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_invalidation_log ENABLE ROW LEVEL SECURITY;

-- Chart cache accessible by chart owners
CREATE POLICY "Chart cache accessible by owners" ON public.chart_cache
    FOR ALL USING (
        chart_id IN (
            SELECT c.id FROM public.charts c
            WHERE c.organization_id IN (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Query cache accessible by organization members
CREATE POLICY "Query cache by org" ON public.query_cache
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Dashboard cache accessible by dashboard owners
CREATE POLICY "Dashboard cache by owners" ON public.dashboard_cache
    FOR ALL USING (
        dashboard_id IN (
            SELECT d.id FROM public.dashboards d
            WHERE d.organization_id IN (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Function to get or set chart cache
CREATE OR REPLACE FUNCTION get_or_set_chart_cache(
    p_chart_id UUID,
    p_cache_key TEXT,
    p_data JSONB DEFAULT NULL,
    p_ttl_seconds INTEGER DEFAULT 3600
)
RETURNS JSONB AS $$
DECLARE
    v_cached JSONB;
    v_result JSONB;
BEGIN
    -- Try to get from cache
    SELECT data INTO v_cached
    FROM public.chart_cache
    WHERE chart_id = p_chart_id 
        AND cache_key = p_cache_key
        AND expires_at > NOW();
    
    IF v_cached IS NOT NULL THEN
        -- Update hit count
        UPDATE public.chart_cache
        SET hit_count = hit_count + 1, last_accessed_at = NOW()
        WHERE chart_id = p_chart_id AND cache_key = p_cache_key;
        
        RETURN jsonb_build_object('hit', true, 'data', v_cached);
    END IF;
    
    -- Cache miss - if data provided, store it
    IF p_data IS NOT NULL THEN
        INSERT INTO public.chart_cache (chart_id, cache_key, data, expires_at)
        VALUES (p_chart_id, p_cache_key, p_data, NOW() + (p_ttl_seconds || ' seconds')::INTERVAL)
        ON CONFLICT (chart_id, cache_key) 
        DO UPDATE SET 
            data = EXCLUDED.data, 
            expires_at = EXCLUDED.expires_at,
            hit_count = 0,
            last_accessed_at = NOW();
        
        RETURN jsonb_build_object('hit', false, 'data', p_data, 'stored', true);
    END IF;
    
    RETURN jsonb_build_object('hit', false, 'data', null);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invalidate chart cache
CREATE OR REPLACE FUNCTION invalidate_chart_cache(
    p_chart_id UUID,
    p_reason TEXT DEFAULT 'manual'
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
    v_keys TEXT[];
BEGIN
    -- Get keys being invalidated
    SELECT ARRAY_AGG(cache_key) INTO v_keys
    FROM public.chart_cache WHERE chart_id = p_chart_id;
    
    -- Delete cache entries
    DELETE FROM public.chart_cache WHERE chart_id = p_chart_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- Log invalidation
    IF v_count > 0 THEN
        INSERT INTO public.cache_invalidation_log (
            entity_type, entity_id, invalidation_reason, invalidated_keys
        ) VALUES ('chart', p_chart_id, p_reason, v_keys);
    END IF;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invalidate dataset-related caches
CREATE OR REPLACE FUNCTION invalidate_dataset_caches(
    p_dataset_id UUID,
    p_reason TEXT DEFAULT 'data_update'
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_chart_count INTEGER;
BEGIN
    -- Invalidate all charts using this dataset
    FOR v_chart_count IN
        SELECT invalidate_chart_cache(c.id, p_reason)
        FROM public.charts c
        WHERE c.dataset_id = p_dataset_id
    LOOP
        v_count := v_count + v_chart_count;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.chart_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_count := v_count + v_deleted;
    
    DELETE FROM public.query_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_count := v_count + v_deleted;
    
    DELETE FROM public.dashboard_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_count := v_count + v_deleted;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-invalidate cache on data changes
CREATE OR REPLACE FUNCTION trigger_invalidate_chart_cache()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        PERFORM invalidate_chart_cache(OLD.id, 'data_change');
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to charts table
DROP TRIGGER IF EXISTS trigger_chart_cache_invalidation ON public.charts;
CREATE TRIGGER trigger_chart_cache_invalidation
    AFTER UPDATE OR DELETE ON public.charts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_invalidate_chart_cache();
