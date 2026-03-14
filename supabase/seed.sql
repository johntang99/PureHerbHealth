CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM stores WHERE slug = 'pureherbhealth') THEN
    INSERT INTO stores (slug, name, name_zh, type)
    VALUES ('pureherbhealth', 'pureHerbHealth', '本草健康', 'standalone');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM stores WHERE slug = 'dr-huang-clinic') THEN
    INSERT INTO stores (slug, name, name_zh, type)
    VALUES ('dr-huang-clinic', 'Dr. Huang Clinic', '黄医师诊所', 'embedded');
  END IF;
END $$;

INSERT INTO categories (slug, name, name_zh)
VALUES
  ('energy', 'Energy', '元气调理'),
  ('immune', 'Immune', '免疫调理'),
  ('sleep', 'Sleep', '睡眠调理'),
  ('digestion', 'Digestion', '脾胃调理'),
  ('stress', 'Stress', '情绪调理')
ON CONFLICT (slug) DO NOTHING;
