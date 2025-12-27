-- =============================================
-- Backup & Disaster Recovery Tables
-- =============================================

-- Backup Status Enum
DO $$ BEGIN
    CREATE TYPE backup_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Backup Type Enum
DO $$ BEGIN
    CREATE TYPE backup_type AS ENUM ('full', 'incremental', 'table', 'schema', 'snapshot');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Backup Configuration Table
CREATE TABLE IF NOT EXISTS public.backup_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    backup_type backup_type NOT NULL DEFAULT 'full',
    schedule TEXT, -- Cron expression
    retention_days INTEGER DEFAULT 30,
    include_tables TEXT[], -- NULL means all
    exclude_tables TEXT[],
    compress BOOLEAN DEFAULT TRUE,
    encrypt BOOLEAN DEFAULT TRUE,
    storage_path TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup History Table
CREATE TABLE IF NOT EXISTS public.backup_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID REFERENCES public.backup_config(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    backup_type backup_type NOT NULL,
    status backup_status DEFAULT 'pending',
    
    -- Backup Details
    file_path TEXT,
    file_size_bytes BIGINT,
    compressed_size_bytes BIGINT,
    checksum TEXT,
    
    -- Tables backed up
    tables_included TEXT[],
    row_counts JSONB, -- {"table_name": row_count, ...}
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    
    -- Metadata
    triggered_by TEXT CHECK (triggered_by IN ('schedule', 'manual', 'system')),
    triggered_by_user UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restore History Table
CREATE TABLE IF NOT EXISTS public.restore_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_id UUID NOT NULL REFERENCES public.backup_history(id),
    organization_id UUID REFERENCES public.organizations(id),
    status backup_status DEFAULT 'pending',
    
    -- Restore options
    restore_mode TEXT CHECK (restore_mode IN ('full', 'selective', 'point_in_time')),
    target_tables TEXT[],
    point_in_time TIMESTAMPTZ,
    
    -- Results
    tables_restored TEXT[],
    rows_restored JSONB,
    conflicts_resolved INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    
    -- Metadata
    restored_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Point-in-Time Recovery Markers
CREATE TABLE IF NOT EXISTS public.pitr_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    marker_name TEXT NOT NULL,
    description TEXT,
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_backup_config_org ON public.backup_config(organization_id);
CREATE INDEX IF NOT EXISTS idx_backup_config_next_run ON public.backup_config(next_run_at) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_backup_history_org ON public.backup_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_backup_history_status ON public.backup_history(status);
CREATE INDEX IF NOT EXISTS idx_backup_history_created ON public.backup_history(created_at);
CREATE INDEX IF NOT EXISTS idx_backup_history_expires ON public.backup_history(expires_at);
CREATE INDEX IF NOT EXISTS idx_restore_history_backup ON public.restore_history(backup_id);
CREATE INDEX IF NOT EXISTS idx_pitr_markers_org ON public.pitr_markers(organization_id);

-- RLS Policies
ALTER TABLE public.backup_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitr_markers ENABLE ROW LEVEL SECURITY;

-- Organization members can view their backups
CREATE POLICY "Org members can view backup config" ON public.backup_config
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Only admins can manage backups
CREATE POLICY "Admins can manage backup config" ON public.backup_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
            AND organization_id = backup_config.organization_id
        )
    );

CREATE POLICY "Org members can view backup history" ON public.backup_history
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Org members can view restore history" ON public.restore_history
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Org members can manage PITR markers" ON public.pitr_markers
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Function to create a backup snapshot
CREATE OR REPLACE FUNCTION create_backup_snapshot(
    p_organization_id UUID,
    p_backup_type backup_type DEFAULT 'full',
    p_tables TEXT[] DEFAULT NULL,
    p_triggered_by TEXT DEFAULT 'manual',
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_backup_id UUID;
    v_tables TEXT[];
BEGIN
    -- Determine tables to backup
    IF p_tables IS NULL THEN
        v_tables := ARRAY['datasets', 'charts', 'dashboards', 'data_sources', 'reports'];
    ELSE
        v_tables := p_tables;
    END IF;
    
    -- Create backup record
    INSERT INTO public.backup_history (
        organization_id, backup_type, status, tables_included,
        triggered_by, triggered_by_user, started_at
    ) VALUES (
        p_organization_id, p_backup_type, 'in_progress', v_tables,
        p_triggered_by, p_user_id, NOW()
    ) RETURNING id INTO v_backup_id;
    
    -- In real implementation, this would trigger an Edge Function
    -- to perform the actual backup to storage
    
    RETURN v_backup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get table row counts for backup
CREATE OR REPLACE FUNCTION get_backup_row_counts(
    p_organization_id UUID,
    p_tables TEXT[]
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB := '{}';
    v_table TEXT;
    v_count BIGINT;
BEGIN
    FOREACH v_table IN ARRAY p_tables
    LOOP
        EXECUTE format(
            'SELECT COUNT(*) FROM public.%I WHERE organization_id = $1',
            v_table
        ) INTO v_count USING p_organization_id;
        
        v_result := v_result || jsonb_build_object(v_table, v_count);
    END LOOP;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete backup
CREATE OR REPLACE FUNCTION complete_backup(
    p_backup_id UUID,
    p_file_path TEXT,
    p_file_size BIGINT,
    p_compressed_size BIGINT,
    p_checksum TEXT,
    p_row_counts JSONB,
    p_retention_days INTEGER DEFAULT 30
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.backup_history
    SET 
        status = 'completed',
        file_path = p_file_path,
        file_size_bytes = p_file_size,
        compressed_size_bytes = p_compressed_size,
        checksum = p_checksum,
        row_counts = p_row_counts,
        completed_at = NOW(),
        expires_at = NOW() + (p_retention_days || ' days')::INTERVAL
    WHERE id = p_backup_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fail backup
CREATE OR REPLACE FUNCTION fail_backup(
    p_backup_id UUID,
    p_error_message TEXT,
    p_error_details JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.backup_history
    SET 
        status = 'failed',
        error_message = p_error_message,
        error_details = p_error_details,
        completed_at = NOW()
    WHERE id = p_backup_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup expired backups
CREATE OR REPLACE FUNCTION cleanup_expired_backups()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.backup_history
    SET status = 'expired'
    WHERE expires_at < NOW() AND status = 'completed';
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- Note: Actual file deletion should be handled by an Edge Function
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
