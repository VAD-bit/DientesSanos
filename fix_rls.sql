ALTER TABLE odontosonrisa.staff_portfolio ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_portfolio_insert' AND tablename = 'staff_portfolio' AND schemaname = 'odontosonrisa') THEN
    CREATE POLICY staff_portfolio_insert ON odontosonrisa.staff_portfolio FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_portfolio_select' AND tablename = 'staff_portfolio' AND schemaname = 'odontosonrisa') THEN
    CREATE POLICY staff_portfolio_select ON odontosonrisa.staff_portfolio FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_portfolio_delete' AND tablename = 'staff_portfolio' AND schemaname = 'odontosonrisa') THEN
    CREATE POLICY staff_portfolio_delete ON odontosonrisa.staff_portfolio FOR DELETE USING (true);
  END IF;
END $$;
