// Panda Barber — Web Push sender (self-hosted Supabase Edge Function).
// Reads VAPID keys from odontosonrisa.push_config, looks up subscriptions by role or
// staff, and delivers the notification. Callable at /functions/v1/send-push.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const payloadIn = await req.json()
    const target = payloadIn.target || {}
    const title = payloadIn.title
    const body = payloadIn.body
    const data = payloadIn.data || {}
    if (!title || !body) return json({ error: 'missing title/body' }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
      db: { schema: 'odontosonrisa' },
    })

    const cfgRes = await admin.from('push_config').select('*').eq('id', 1).single()
    if (cfgRes.error || !cfgRes.data) return json({ error: 'no vapid config' }, 500)
    const cfg = cfgRes.data
    webpush.setVapidDetails(cfg.subject || 'mailto:admin@somosdostudio.com', cfg.vapid_public, cfg.vapid_private)

    let query = admin.from('push_subscriptions').select('*')
    if (target.staffId) {
      query = query.eq('staff_id', target.staffId)
    } else if (Array.isArray(target.roles) && target.roles.length > 0) {
      query = query.in('role', target.roles)
    } else {
      return json({ error: 'missing target (staffId or roles)' }, 400)
    }

    const subsRes = await query
    if (subsRes.error) return json({ error: subsRes.error.message }, 500)
    const subs = subsRes.data || []

    const message = JSON.stringify({ title, body, data })
    let sent = 0
    let removed = 0
    let failed = 0

    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          message,
        )
        sent++
      } catch (e) {
        const code = e && e.statusCode
        if (code === 404 || code === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
          removed++
        } else {
          failed++
          console.error('push error', code, (e && e.body) || String(e))
        }
      }
    }

    return json({ sent, removed, failed, total: subs.length })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
