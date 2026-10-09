import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testNullClient() {
  const { data, error } = await supabase
    .from('coupons')
    .insert([{ client_id: null, prize_name: 'TEST', status: 'UNUSED' }])
    .select();
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
    // clean up
    await supabase.from('coupons').delete().eq('id', data[0].id);
  }
}

testNullClient();
