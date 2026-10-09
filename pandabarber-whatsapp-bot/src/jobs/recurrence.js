import { supabase } from '../supabase.js';
import { sendMessage, isWhatsAppReady } from '../bot.js';
import { renderTemplate } from '../utils/messageTemplates.js';

const RECURRENCE_TEMPLATE = 'Hola {{nombre}}! Ya es momento de renovar tu corte. Te esperamos en Panda Barber Studio.';
export async function sendRecurrenceMessages() {
  if (!isWhatsAppReady()) {
    console.error('[Recurrence] WhatsApp not ready');
    return { success: false, sent: 0 };
  }

  try {
    const { data: reminders, error } = await supabase
      .from('scheduled_reminders')
      .select('id, client_id, scheduled_for, clients(id, name, phone)')
      .eq('type', 'follow_up')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(100);

    if (error) {
      console.error('[Recurrence] Query error:', error.message);
      return { success: false, sent: 0 };
    }

    console.log(`[Recurrence] Found ${reminders?.length || 0} pending reminders`);

    let sent = 0;
    for (const reminder of (reminders || [])) {
      const client = reminder.clients;
      if (!client?.phone) continue;
      const template = await (async () => {
        const { data } = await supabase.from('system_settings').select('value').eq('key', 'whatsapp_template_followup').maybeSingle();
        return data?.value || RECURRENCE_TEMPLATE;
      })();
      const result = await sendMessage(client.phone, renderTemplate(template, { nombre: client.name }));
      await supabase.from('scheduled_reminders').update({
        status: result.success ? 'sent' : 'pending'
      }).eq('id', reminder.id);
      if (result.success) sent++;
    }

    console.log(`[Recurrence] Sent ${sent} messages`);
    return { success: true, sent };
  } catch (err) {
    console.error('[Recurrence] Error:', err.message);
    return { success: false, sent: 0 };
  }
}
