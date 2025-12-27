-- =============================================
-- Worker Queue & Background Jobs Tables
-- =============================================

-- Job Status Enum
DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'dead_letter');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Job Priority Enum
DO $$ BEGIN
    CREATE TYPE job_priority AS ENUM ('low', 'normal', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Job Type Enum
DO $$ BEGIN
    CREATE TYPE job_type AS ENUM (
        'data_import',
        'data_export', 
        'report_generation',
        'email_notification',
        'data_sync',
        'backup',
        'cleanup',
        'ai_analysis'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Main Jobs Queue Table
CREATE TABLE IF NOT EXISTS public.job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Job Definition
    job_type job_type NOT NULL,
    priority job_priority DEFAULT 'normal',
    payload JSONB NOT NULL DEFAULT '{}',
    
    -- Execution State
    status job_status DEFAULT 'pending',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    result JSONB,
    error_message TEXT,
    error_stack TEXT,
    
    -- Retry Logic
    max_retries INTEGER DEFAULT 3,
    retry_count INTEGER DEFAULT 0,
    retry_delay_ms INTEGER DEFAULT 5000,
    next_retry_at TIMESTAMPTZ,
    
    -- Scheduling
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    timeout_seconds INTEGER DEFAULT 300,
    
    -- Worker Info
    worker_id TEXT,
    locked_at TIMESTAMPTZ,
    locked_until TIMESTAMPTZ,
    
    -- Metadata
    idempotency_key TEXT,
    parent_job_id UUID REFERENCES public.job_queue(id),
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dead Letter Queue (failed jobs that exceeded retries)
CREATE TABLE IF NOT EXISTS public.dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_job_id UUID NOT NULL,
    job_type job_type NOT NULL,
    payload JSONB NOT NULL,
    error_message TEXT,
    error_stack TEXT,
    retry_count INTEGER,
    failed_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    resolution TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Job Logs for detailed tracking
CREATE TABLE IF NOT EXISTS public.job_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.job_queue(id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
    message TEXT NOT NULL,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON public.job_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_queue_priority ON public.job_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_job_queue_scheduled_at ON public.job_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_job_queue_organization ON public.job_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_job_queue_type ON public.job_queue(job_type);
CREATE INDEX IF NOT EXISTS idx_job_queue_pending ON public.job_queue(status, scheduled_at) 
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_job_queue_idempotency ON public.job_queue(idempotency_key) 
    WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON public.job_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_dead_letter_reviewed ON public.dead_letter_queue(reviewed_at) 
    WHERE reviewed_at IS NULL;

-- RLS Policies
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their organization's jobs
CREATE POLICY "Users can view org jobs" ON public.job_queue
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Users can create jobs for their organization
CREATE POLICY "Users can create jobs" ON public.job_queue
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Admins can view all dead letter items
CREATE POLICY "Admins can view dead letter" ON public.dead_letter_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can view logs for their jobs
CREATE POLICY "Users can view job logs" ON public.job_logs
    FOR SELECT USING (
        job_id IN (
            SELECT id FROM public.job_queue 
            WHERE organization_id IN (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Function to acquire next job (atomic)
CREATE OR REPLACE FUNCTION acquire_next_job(
    p_worker_id TEXT,
    p_job_types job_type[] DEFAULT NULL,
    p_lock_duration_seconds INTEGER DEFAULT 300
)
RETURNS public.job_queue AS $$
DECLARE
    v_job public.job_queue;
BEGIN
    SELECT * INTO v_job
    FROM public.job_queue
    WHERE status = 'pending'
        AND scheduled_at <= NOW()
        AND (locked_until IS NULL OR locked_until < NOW())
        AND (p_job_types IS NULL OR job_type = ANY(p_job_types))
    ORDER BY 
        CASE priority 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'normal' THEN 3 
            WHEN 'low' THEN 4 
        END,
        scheduled_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    IF v_job.id IS NOT NULL THEN
        UPDATE public.job_queue
        SET 
            status = 'processing',
            worker_id = p_worker_id,
            locked_at = NOW(),
            locked_until = NOW() + (p_lock_duration_seconds || ' seconds')::INTERVAL,
            started_at = COALESCE(started_at, NOW()),
            updated_at = NOW()
        WHERE id = v_job.id
        RETURNING * INTO v_job;
    END IF;
    
    RETURN v_job;
END;
$$ LANGUAGE plpgsql;

-- Function to complete a job
CREATE OR REPLACE FUNCTION complete_job(
    p_job_id UUID,
    p_result JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.job_queue
    SET 
        status = 'completed',
        progress = 100,
        result = p_result,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_job_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to fail a job (with retry logic)
CREATE OR REPLACE FUNCTION fail_job(
    p_job_id UUID,
    p_error_message TEXT,
    p_error_stack TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_job public.job_queue;
BEGIN
    SELECT * INTO v_job FROM public.job_queue WHERE id = p_job_id;
    
    IF v_job.retry_count < v_job.max_retries THEN
        -- Retry the job
        UPDATE public.job_queue
        SET 
            status = 'pending',
            error_message = p_error_message,
            error_stack = p_error_stack,
            retry_count = retry_count + 1,
            next_retry_at = NOW() + (v_job.retry_delay_ms * POWER(2, v_job.retry_count) || ' milliseconds')::INTERVAL,
            scheduled_at = NOW() + (v_job.retry_delay_ms * POWER(2, v_job.retry_count) || ' milliseconds')::INTERVAL,
            locked_at = NULL,
            locked_until = NULL,
            worker_id = NULL,
            updated_at = NOW()
        WHERE id = p_job_id;
    ELSE
        -- Move to dead letter queue
        INSERT INTO public.dead_letter_queue (
            original_job_id, job_type, payload, error_message, 
            error_stack, retry_count, metadata
        )
        SELECT 
            id, job_type, payload, p_error_message,
            p_error_stack, retry_count + 1, metadata
        FROM public.job_queue WHERE id = p_job_id;
        
        UPDATE public.job_queue
        SET 
            status = 'dead_letter',
            error_message = p_error_message,
            error_stack = p_error_stack,
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_job_id;
    END IF;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old completed jobs (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_jobs()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM public.job_queue
        WHERE status IN ('completed', 'cancelled', 'dead_letter')
            AND completed_at < NOW() - INTERVAL '30 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM deleted;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
