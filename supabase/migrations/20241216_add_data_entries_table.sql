-- Dataset verilerini saklamak için data_entries tablosu
-- Her satır dataset'in bir veri satırını temsil eder

CREATE TABLE IF NOT EXISTS data_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performans için indeksler
CREATE INDEX IF NOT EXISTS idx_data_entries_dataset_id ON data_entries(dataset_id);
CREATE INDEX IF NOT EXISTS idx_data_entries_row_index ON data_entries(dataset_id, row_index);

-- RLS politikaları
ALTER TABLE data_entries ENABLE ROW LEVEL SECURITY;

-- Organizasyon bazlı erişim (dataset üzerinden)
CREATE POLICY "Users can view data entries of their organization datasets"
    ON data_entries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM datasets d
            JOIN profiles p ON p.organization_id = d.organization_id
            WHERE d.id = data_entries.dataset_id
            AND p.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert data entries to their organization datasets"
    ON data_entries FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM datasets d
            JOIN profiles p ON p.organization_id = d.organization_id
            WHERE d.id = data_entries.dataset_id
            AND p.id = auth.uid()
        )
    );

CREATE POLICY "Users can delete data entries of their organization datasets"
    ON data_entries FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM datasets d
            JOIN profiles p ON p.organization_id = d.organization_id
            WHERE d.id = data_entries.dataset_id
            AND p.id = auth.uid()
        )
    );

-- Yorum: Bu migration'ı Supabase Dashboard'dan veya CLI ile çalıştırın
-- supabase db push veya Supabase Dashboard > SQL Editor
