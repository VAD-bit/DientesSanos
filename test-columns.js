import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jnidzprbndcfrohgplmh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE'
);

async function test() {
  const { data: records, error: fetchErr } = await supabase
    .from('appointments')
    .select('*')
    .limit(1);

  if (fetchErr) throw fetchErr;
  if (records.length === 0) {
    console.log("No appointments to test with.");
    return;
  }
  const appt = records[0];
  const oldStatus = appt.status;
  console.log(`Testing status transition for appointment ${appt.id} from ${oldStatus} to En Lavado`);
  
  const { data: updated, error: updateErr } = await supabase
    .from('appointments')
    .update({ status: 'En Lavado' })
    .eq('id', appt.id)
    .select();

  if (updateErr) {
    console.error("Update failed:", updateErr.message);
  } else {
    console.log("Update succeeded! Reverting back to:", oldStatus);
    const { error: revertErr } = await supabase
      .from('appointments')
      .update({ status: oldStatus })
      .eq('id', appt.id);
    if (revertErr) console.error("Revert failed:", revertErr.message);
    else console.log("Revert succeeded!");
  }
}

test().catch(console.error);
