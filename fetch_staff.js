const url = 'https://supabase.somosdostudio.com/rest/v1/staff?select=name,role,email';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhoa2VhZ3VhbXl6aWFtcGp2d2NlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzM2MjA4NywiZXhwIjoyMDk4NzIyMDg3fQ.9GlE7A7-VTxM_yeP9EHMmGYYgZ78H0svtuSN8QgSPsQ';
fetch(url, { headers: { 'apikey': serviceKey, 'Authorization': 'Bearer ' + serviceKey } })
  .then(res => res.json())
  .then(data => {
    const list = data
      .filter(s => s.role && !s.role.includes('ARCHIVED'))
      .map(s => s.name + ' (' + s.role.split('|')[0] + '): ' + (s.email || 'SIN CORREO'));
    console.log(list.join('\n'));
  });
