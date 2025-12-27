-- =============================================
-- Email Notification System Tables
-- =============================================

-- Email Status Enum
DO $$ BEGIN
    CREATE TYPE email_status AS ENUM ('pending', 'queued', 'sending', 'sent', 'failed', 'bounced');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Email Template Table
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT,
    variables TEXT[], -- Available template variables
    category TEXT CHECK (category IN ('transactional', 'notification', 'marketing', 'report', 'alert')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Queue Table
CREATE TABLE IF NOT EXISTS public.email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Recipient Info
    to_email TEXT NOT NULL,
    to_name TEXT,
    from_email TEXT DEFAULT 'noreply@biplatform.com',
    from_name TEXT DEFAULT 'BI Platform',
    reply_to TEXT,
    
    -- Email Content
    template_id UUID REFERENCES public.email_templates(id),
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT,
    attachments JSONB, -- [{filename, content_type, url}, ...]
    
    -- Status & Tracking
    status email_status DEFAULT 'pending',
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    
    -- Scheduling
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    
    -- Tracking
    provider_message_id TEXT,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    
    -- Error Handling
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    
    -- Metadata
    triggered_by TEXT, -- 'chart_share', 'data_import_failed', 'report_ready', etc.
    related_entity_type TEXT,
    related_entity_id UUID,
    user_id UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Logs (for analytics & debugging)
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID NOT NULL REFERENCES public.email_queue(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'queued', 'sent', 'delivered', 'opened', 'clicked', 
        'bounced', 'complained', 'failed', 'unsubscribed'
    )),
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Preferences (per user)
CREATE TABLE IF NOT EXISTS public.email_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification Preferences
    chart_shared BOOLEAN DEFAULT TRUE,
    report_ready BOOLEAN DEFAULT TRUE,
    data_import_status BOOLEAN DEFAULT TRUE,
    weekly_digest BOOLEAN DEFAULT TRUE,
    security_alerts BOOLEAN DEFAULT TRUE,
    product_updates BOOLEAN DEFAULT FALSE,
    
    -- Frequency
    digest_frequency TEXT DEFAULT 'weekly' CHECK (digest_frequency IN ('daily', 'weekly', 'monthly', 'never')),
    
    -- Unsubscribe
    unsubscribed_all BOOLEAN DEFAULT FALSE,
    unsubscribed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Email Rate Limiting (per organization)
CREATE TABLE IF NOT EXISTS public.email_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    daily_limit INTEGER DEFAULT 1000,
    hourly_limit INTEGER DEFAULT 100,
    current_daily_count INTEGER DEFAULT 0,
    current_hourly_count INTEGER DEFAULT 0,
    daily_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 day',
    hourly_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
    UNIQUE(organization_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON public.email_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_org ON public.email_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON public.email_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_email ON public.email_logs(email_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_event ON public.email_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_email_preferences_user ON public.email_preferences(user_id);

-- RLS Policies
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can manage templates
CREATE POLICY "Admins can manage email templates" ON public.email_templates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Users can view their organization's emails
CREATE POLICY "Org members can view emails" ON public.email_queue
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Users can manage their own preferences
CREATE POLICY "Users can manage own preferences" ON public.email_preferences
    FOR ALL USING (user_id = auth.uid());

-- Insert default email templates
INSERT INTO public.email_templates (name, subject, html_body, text_body, variables, category) VALUES
(
    'chart_shared',
    '{{sharer_name}} sizinle bir grafik paylaştı',
    '<h2>Merhaba {{recipient_name}},</h2><p>{{sharer_name}} sizinle <strong>{{chart_name}}</strong> adlı grafiği paylaştı.</p><p><a href="{{chart_url}}">Grafiği Görüntüle</a></p>',
    'Merhaba {{recipient_name}}, {{sharer_name}} sizinle {{chart_name}} adlı grafiği paylaştı. Görüntülemek için: {{chart_url}}',
    ARRAY['recipient_name', 'sharer_name', 'chart_name', 'chart_url'],
    'notification'
),
(
    'data_import_success',
    'Veri aktarımı başarıyla tamamlandı',
    '<h2>Merhaba {{user_name}},</h2><p><strong>{{dataset_name}}</strong> veri setiniz başarıyla yüklendi.</p><p>Toplam satır: {{row_count}}</p><p><a href="{{dataset_url}}">Veri Setini Görüntüle</a></p>',
    'Merhaba {{user_name}}, {{dataset_name}} veri setiniz başarıyla yüklendi. Toplam {{row_count}} satır.',
    ARRAY['user_name', 'dataset_name', 'row_count', 'dataset_url'],
    'notification'
),
(
    'data_import_failed',
    'Veri aktarımı başarısız oldu',
    '<h2>Merhaba {{user_name}},</h2><p><strong>{{dataset_name}}</strong> veri aktarımı başarısız oldu.</p><p>Hata: {{error_message}}</p><p><a href="{{retry_url}}">Tekrar Dene</a></p>',
    'Merhaba {{user_name}}, {{dataset_name}} veri aktarımı başarısız oldu. Hata: {{error_message}}',
    ARRAY['user_name', 'dataset_name', 'error_message', 'retry_url'],
    'alert'
),
(
    'report_ready',
    '{{report_name}} raporunuz hazır',
    '<h2>Merhaba {{user_name}},</h2><p>Talep ettiğiniz <strong>{{report_name}}</strong> raporu hazır.</p><p>Format: {{format}}</p><p><a href="{{download_url}}">Raporu İndir</a></p><p>Bu link {{expiry_hours}} saat geçerlidir.</p>',
    'Merhaba {{user_name}}, {{report_name}} raporunuz hazır. İndirmek için: {{download_url}}',
    ARRAY['user_name', 'report_name', 'format', 'download_url', 'expiry_hours'],
    'notification'
),
(
    'weekly_digest',
    'Haftalık Özet: {{week_range}}',
    '<h2>Merhaba {{user_name}},</h2><p>Bu hafta platformda neler oldu:</p><ul><li>Yeni veri setleri: {{new_datasets}}</li><li>Oluşturulan grafikler: {{new_charts}}</li><li>Görüntülenme: {{total_views}}</li></ul><p><a href="{{dashboard_url}}">Dashboard''a Git</a></p>',
    'Haftalık özet: {{new_datasets}} yeni veri seti, {{new_charts}} yeni grafik, {{total_views}} görüntülenme.',
    ARRAY['user_name', 'week_range', 'new_datasets', 'new_charts', 'total_views', 'dashboard_url'],
    'notification'
),
(
    'security_alert',
    'Güvenlik Uyarısı: {{alert_type}}',
    '<h2>Güvenlik Uyarısı</h2><p>Hesabınızda şüpheli aktivite tespit edildi:</p><p><strong>{{alert_type}}</strong></p><p>Detay: {{alert_details}}</p><p>IP: {{ip_address}}</p><p>Zaman: {{timestamp}}</p><p>Bu siz değilseniz, lütfen hemen <a href="{{security_url}}">güvenlik ayarlarınızı</a> kontrol edin.</p>',
    'Güvenlik Uyarısı: {{alert_type}}. IP: {{ip_address}}. Bu siz değilseniz güvenlik ayarlarınızı kontrol edin.',
    ARRAY['alert_type', 'alert_details', 'ip_address', 'timestamp', 'security_url'],
    'alert'
)
ON CONFLICT (name) DO NOTHING;

-- Function to queue an email
CREATE OR REPLACE FUNCTION queue_email(
    p_to_email TEXT,
    p_template_name TEXT,
    p_variables JSONB,
    p_organization_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_priority INTEGER DEFAULT 5,
    p_scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    p_attachments JSONB DEFAULT NULL,
    p_triggered_by TEXT DEFAULT NULL,
    p_related_entity_type TEXT DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_template public.email_templates;
    v_email_id UUID;
    v_subject TEXT;
    v_html_body TEXT;
    v_text_body TEXT;
    v_key TEXT;
    v_value TEXT;
BEGIN
    -- Get template
    SELECT * INTO v_template FROM public.email_templates 
    WHERE name = p_template_name AND is_active = TRUE;
    
    IF v_template IS NULL THEN
        RAISE EXCEPTION 'Email template not found: %', p_template_name;
    END IF;
    
    -- Check user preferences
    IF p_user_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.email_preferences 
            WHERE user_id = p_user_id AND unsubscribed_all = TRUE
        ) THEN
            RETURN NULL; -- User unsubscribed
        END IF;
    END IF;
    
    -- Replace variables in template
    v_subject := v_template.subject;
    v_html_body := v_template.html_body;
    v_text_body := v_template.text_body;
    
    FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
    LOOP
        v_subject := REPLACE(v_subject, '{{' || v_key || '}}', v_value);
        v_html_body := REPLACE(v_html_body, '{{' || v_key || '}}', v_value);
        IF v_text_body IS NOT NULL THEN
            v_text_body := REPLACE(v_text_body, '{{' || v_key || '}}', v_value);
        END IF;
    END LOOP;
    
    -- Insert into queue
    INSERT INTO public.email_queue (
        organization_id, to_email, template_id, subject, html_body, text_body,
        priority, scheduled_at, attachments, triggered_by,
        related_entity_type, related_entity_id, user_id
    ) VALUES (
        p_organization_id, p_to_email, v_template.id, v_subject, v_html_body, v_text_body,
        p_priority, p_scheduled_at, p_attachments, p_triggered_by,
        p_related_entity_type, p_related_entity_id, p_user_id
    ) RETURNING id INTO v_email_id;
    
    -- Log event
    INSERT INTO public.email_logs (email_id, event_type)
    VALUES (v_email_id, 'queued');
    
    RETURN v_email_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check email rate limit
CREATE OR REPLACE FUNCTION check_email_rate_limit(p_organization_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_limits public.email_rate_limits;
BEGIN
    -- Get or create limits
    SELECT * INTO v_limits FROM public.email_rate_limits WHERE organization_id = p_organization_id;
    
    IF v_limits IS NULL THEN
        INSERT INTO public.email_rate_limits (organization_id)
        VALUES (p_organization_id)
        RETURNING * INTO v_limits;
    END IF;
    
    -- Reset counters if needed
    IF v_limits.hourly_reset_at < NOW() THEN
        UPDATE public.email_rate_limits
        SET current_hourly_count = 0, hourly_reset_at = NOW() + INTERVAL '1 hour'
        WHERE organization_id = p_organization_id;
        v_limits.current_hourly_count := 0;
    END IF;
    
    IF v_limits.daily_reset_at < NOW() THEN
        UPDATE public.email_rate_limits
        SET current_daily_count = 0, daily_reset_at = NOW() + INTERVAL '1 day'
        WHERE organization_id = p_organization_id;
        v_limits.current_daily_count := 0;
    END IF;
    
    -- Check limits
    IF v_limits.current_hourly_count >= v_limits.hourly_limit OR
       v_limits.current_daily_count >= v_limits.daily_limit THEN
        RETURN FALSE;
    END IF;
    
    -- Increment counters
    UPDATE public.email_rate_limits
    SET current_hourly_count = current_hourly_count + 1,
        current_daily_count = current_daily_count + 1
    WHERE organization_id = p_organization_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update email status
CREATE OR REPLACE FUNCTION update_email_status(
    p_email_id UUID,
    p_status email_status,
    p_provider_message_id TEXT DEFAULT NULL,
    p_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.email_queue
    SET 
        status = p_status,
        provider_message_id = COALESCE(p_provider_message_id, provider_message_id),
        sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
        last_error = p_error,
        updated_at = NOW()
    WHERE id = p_email_id;
    
    -- Log event
    INSERT INTO public.email_logs (email_id, event_type, event_data)
    VALUES (p_email_id, p_status::TEXT, 
        CASE WHEN p_error IS NOT NULL THEN jsonb_build_object('error', p_error) ELSE NULL END
    );
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
