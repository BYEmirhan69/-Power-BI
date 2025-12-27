-- =============================================
-- Scheduled Reports & Automation Tables
-- =============================================

-- Report Schedule Frequency Enum
DO $$ BEGIN
    CREATE TYPE schedule_frequency AS ENUM ('once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Report Generation Status Enum
DO $$ BEGIN
    CREATE TYPE report_gen_status AS ENUM ('pending', 'generating', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Scheduled Reports Configuration
CREATE TABLE IF NOT EXISTS public.scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Report Definition
    name TEXT NOT NULL,
    description TEXT,
    dashboard_id UUID REFERENCES public.dashboards(id),
    chart_ids UUID[],
    
    -- Format & Options
    format TEXT NOT NULL CHECK (format IN ('pdf', 'excel', 'csv')),
    include_charts BOOLEAN DEFAULT TRUE,
    include_data_tables BOOLEAN DEFAULT TRUE,
    date_range_type TEXT CHECK (date_range_type IN ('last_7_days', 'last_30_days', 'last_month', 'last_quarter', 'custom')),
    custom_date_range JSONB, -- {start_date, end_date}
    filters JSONB,
    
    -- Scheduling
    frequency schedule_frequency NOT NULL DEFAULT 'weekly',
    cron_expression TEXT, -- For custom frequency
    timezone TEXT DEFAULT 'UTC',
    day_of_week INTEGER, -- 0-6 for weekly
    day_of_month INTEGER, -- 1-31 for monthly
    hour_of_day INTEGER DEFAULT 8, -- 0-23
    minute_of_hour INTEGER DEFAULT 0, -- 0-59
    
    -- Recipients
    recipients JSONB NOT NULL DEFAULT '[]', -- [{email, name}, ...]
    include_creator BOOLEAN DEFAULT TRUE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    run_count INTEGER DEFAULT 0,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Report History
CREATE TABLE IF NOT EXISTS public.report_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_report_id UUID REFERENCES public.scheduled_reports(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Report Info
    report_name TEXT NOT NULL,
    format TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    
    -- Status
    status report_gen_status DEFAULT 'pending',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Output
    file_url TEXT,
    file_size_bytes BIGINT,
    page_count INTEGER,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    
    -- Delivery
    delivered_to TEXT[], -- Emails that received the report
    delivery_status JSONB, -- {email: status, ...}
    
    -- Metadata
    parameters JSONB, -- Filters and date range used
    triggered_by TEXT CHECK (triggered_by IN ('schedule', 'manual', 'api')),
    triggered_by_user UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report Templates (reusable configurations)
CREATE TABLE IF NOT EXISTS public.report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    
    name TEXT NOT NULL,
    description TEXT,
    
    -- Template Definition
    layout JSONB NOT NULL, -- Page layout, sections, etc.
    header_config JSONB, -- Logo, title, etc.
    footer_config JSONB, -- Page numbers, disclaimers
    styles JSONB, -- Colors, fonts, etc.
    
    -- Chart/Data Configuration
    chart_configs JSONB, -- Default chart settings
    table_configs JSONB, -- Default table settings
    
    is_default BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_org ON public.scheduled_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON public.scheduled_reports(next_run_at) 
    WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_creator ON public.scheduled_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_report_generations_scheduled ON public.report_generations(scheduled_report_id);
CREATE INDEX IF NOT EXISTS idx_report_generations_org ON public.report_generations(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_generations_status ON public.report_generations(status);
CREATE INDEX IF NOT EXISTS idx_report_templates_org ON public.report_templates(organization_id);

-- RLS Policies
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view scheduled reports" ON public.scheduled_reports
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own scheduled reports" ON public.scheduled_reports
    FOR ALL USING (created_by = auth.uid());

CREATE POLICY "Admins can manage all scheduled reports" ON public.scheduled_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
            AND organization_id = scheduled_reports.organization_id
        )
    );

CREATE POLICY "Org members can view report generations" ON public.report_generations
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Org members can manage report templates" ON public.report_templates
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Function to calculate next run time
CREATE OR REPLACE FUNCTION calculate_next_run_time(
    p_frequency schedule_frequency,
    p_day_of_week INTEGER,
    p_day_of_month INTEGER,
    p_hour INTEGER,
    p_minute INTEGER,
    p_timezone TEXT DEFAULT 'UTC',
    p_from_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_next TIMESTAMPTZ;
    v_local_time TIMESTAMPTZ;
BEGIN
    -- Convert to target timezone
    v_local_time := p_from_time AT TIME ZONE p_timezone;
    
    CASE p_frequency
        WHEN 'daily' THEN
            v_next := date_trunc('day', v_local_time) + 
                     make_interval(hours => p_hour, mins => p_minute);
            IF v_next <= v_local_time THEN
                v_next := v_next + INTERVAL '1 day';
            END IF;
            
        WHEN 'weekly' THEN
            v_next := date_trunc('week', v_local_time) + 
                     make_interval(days => COALESCE(p_day_of_week, 0), hours => p_hour, mins => p_minute);
            IF v_next <= v_local_time THEN
                v_next := v_next + INTERVAL '1 week';
            END IF;
            
        WHEN 'monthly' THEN
            v_next := date_trunc('month', v_local_time) + 
                     make_interval(days => COALESCE(p_day_of_month, 1) - 1, hours => p_hour, mins => p_minute);
            IF v_next <= v_local_time THEN
                v_next := v_next + INTERVAL '1 month';
            END IF;
            
        WHEN 'quarterly' THEN
            v_next := date_trunc('quarter', v_local_time) + 
                     make_interval(days => COALESCE(p_day_of_month, 1) - 1, hours => p_hour, mins => p_minute);
            IF v_next <= v_local_time THEN
                v_next := v_next + INTERVAL '3 months';
            END IF;
            
        WHEN 'yearly' THEN
            v_next := date_trunc('year', v_local_time) + 
                     make_interval(months => 0, days => COALESCE(p_day_of_month, 1) - 1, hours => p_hour, mins => p_minute);
            IF v_next <= v_local_time THEN
                v_next := v_next + INTERVAL '1 year';
            END IF;
            
        ELSE
            v_next := v_local_time + INTERVAL '1 day';
    END CASE;
    
    -- Convert back to UTC
    RETURN v_next AT TIME ZONE p_timezone AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql;

-- Function to create a report generation job
CREATE OR REPLACE FUNCTION create_report_generation(
    p_scheduled_report_id UUID DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL,
    p_report_name TEXT DEFAULT NULL,
    p_format TEXT DEFAULT 'pdf',
    p_dashboard_id UUID DEFAULT NULL,
    p_chart_ids UUID[] DEFAULT NULL,
    p_parameters JSONB DEFAULT NULL,
    p_triggered_by TEXT DEFAULT 'manual',
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_gen_id UUID;
    v_org_id UUID;
    v_name TEXT;
    v_scheduled public.scheduled_reports;
BEGIN
    -- Get details from scheduled report if provided
    IF p_scheduled_report_id IS NOT NULL THEN
        SELECT * INTO v_scheduled FROM public.scheduled_reports 
        WHERE id = p_scheduled_report_id;
        
        v_org_id := v_scheduled.organization_id;
        v_name := v_scheduled.name;
    ELSE
        v_org_id := p_organization_id;
        v_name := COALESCE(p_report_name, 'Ad-hoc Report ' || NOW()::TEXT);
    END IF;
    
    -- Create generation record
    INSERT INTO public.report_generations (
        scheduled_report_id, organization_id, report_name, format,
        status, parameters, triggered_by, triggered_by_user, started_at
    ) VALUES (
        p_scheduled_report_id, v_org_id, v_name, COALESCE(p_format, 'pdf'),
        'pending', p_parameters, p_triggered_by, p_user_id, NOW()
    ) RETURNING id INTO v_gen_id;
    
    -- Also add to job queue for processing
    INSERT INTO public.job_queue (
        organization_id, user_id, job_type, priority, payload
    ) VALUES (
        v_org_id, p_user_id, 'report_generation', 'normal',
        jsonb_build_object(
            'report_generation_id', v_gen_id,
            'scheduled_report_id', p_scheduled_report_id,
            'dashboard_id', COALESCE(p_dashboard_id, v_scheduled.dashboard_id),
            'chart_ids', COALESCE(p_chart_ids, v_scheduled.chart_ids),
            'format', COALESCE(p_format, v_scheduled.format),
            'parameters', p_parameters
        )
    );
    
    -- Update scheduled report last run
    IF p_scheduled_report_id IS NOT NULL THEN
        UPDATE public.scheduled_reports
        SET 
            last_run_at = NOW(),
            run_count = run_count + 1,
            next_run_at = calculate_next_run_time(
                frequency, day_of_week, day_of_month, hour_of_day, minute_of_hour, timezone
            )
        WHERE id = p_scheduled_report_id;
    END IF;
    
    RETURN v_gen_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete report generation
CREATE OR REPLACE FUNCTION complete_report_generation(
    p_generation_id UUID,
    p_file_url TEXT,
    p_file_size BIGINT,
    p_page_count INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_version INTEGER;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
    FROM public.report_generations
    WHERE scheduled_report_id = (
        SELECT scheduled_report_id FROM public.report_generations WHERE id = p_generation_id
    );
    
    UPDATE public.report_generations
    SET 
        status = 'completed',
        progress = 100,
        file_url = p_file_url,
        file_size_bytes = p_file_size,
        page_count = p_page_count,
        version = v_version,
        completed_at = NOW()
    WHERE id = p_generation_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set next_run_at on insert/update
CREATE OR REPLACE FUNCTION trigger_set_next_run_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active AND NEW.frequency != 'once' THEN
        NEW.next_run_at := calculate_next_run_time(
            NEW.frequency, NEW.day_of_week, NEW.day_of_month, 
            NEW.hour_of_day, NEW.minute_of_hour, NEW.timezone
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_scheduled_report_next_run ON public.scheduled_reports;
CREATE TRIGGER trigger_scheduled_report_next_run
    BEFORE INSERT OR UPDATE ON public.scheduled_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_next_run_time();
