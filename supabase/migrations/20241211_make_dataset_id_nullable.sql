-- Charts tablosunda dataset_id sütununu nullable yap
-- Supabase Dashboard > SQL Editor'da çalıştırın

ALTER TABLE charts ALTER COLUMN dataset_id DROP NOT NULL;

-- Kontrol
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'charts' AND column_name = 'dataset_id';
