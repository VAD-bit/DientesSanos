import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jnidzprbndcfrohgplmh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE',
  { db: { schema: 'odontosonrisa' } }
);

async function test() {
  const { data: staff, error } = await supabase
    .from('staff')
    .select('id, name, role, active');

  if (error) throw error;

  console.log("STAFF MEMBERS:");
  console.log(JSON.stringify(staff, null, 2));
}

test().catch(console.error);
