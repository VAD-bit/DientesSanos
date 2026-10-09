import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jnidzprbndcfrohgplmh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE'
);

async function test() {
  const { data: txs, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) throw error;

  console.log("RECENT TRANSACTIONS:");
  txs.forEach(t => {
    console.log(`- ID: ${t.id}, Description: "${t.description}", Metadata:`, JSON.stringify(t.metadata, null, 2));
  });
}

test().catch(console.error);
