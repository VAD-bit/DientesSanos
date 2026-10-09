import { supabase } from '../supabase.js';
import { sendMessage, isWhatsAppReady } from '../bot.js';
import { renderTemplate } from '../utils/messageTemplates.js';

const THANKYOU_TEMPLATE = '¡Hola {{nombre}}! 🎉 Muchas gracias por visitarnos hoy en Panda Barber Studio. Esperamos verte pronto.';

let processedIds = new Set();

export async function sendThankYouMessages() {
  if (!isWhatsAppReady()) {
    return { success: false, sent: 0 };
  }

  try {
    const { data: configuredTemplate } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'whatsapp_template_thank_you')
      .maybeSingle();
    const template = configuredTemplate?.value || THANKYOU_TEMPLATE;
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        completed_at,
        client_id,
        clients (id, name, phone)
      `)
      .eq('status', 'Completado')
      .gte('completed_at', fiveMinAgo)
      .not('clients.phone', 'is', null);

    if (error) {
      console.error('[ThankYou] Query error:', error.message);
      return { success: false, sent: 0 };
    }

    let sent = 0;
    for (const appt of (appointments || [])) {
      if (processedIds.has(appt.id)) continue;
      if (!appt.clients?.phone) continue;

      const { data: alreadySent, error: dedupeError } = await supabase
        .from('scheduled_reminders')
        .select('id')
        .eq('appointment_id', appt.id)
        .eq('type', 'thank_you')
        .eq('status', 'sent')
        .maybeSingle();
      if (dedupeError) throw dedupeError;
      if (alreadySent) {
        processedIds.add(appt.id);
        continue;
      }

      const message = renderTemplate(template, { nombre: appt.clients.name });
      const result = await sendMessage(appt.clients.phone, message);

      if (result.success) {
        await supabase.from('scheduled_reminders').insert({
          appointment_id: appt.id,
          client_id: appt.client_id,
          scheduled_for: appt.completed_at,
          type: 'thank_you',
          status: 'sent'
        });
        processedIds.add(appt.id);
        sent++;
      }
    }

    if (processedIds.size > 1000) {
      const arr = [...processedIds];
      processedIds = new Set(arr.slice(-500));
    }

    return { success: true, sent };
  } catch (err) {
    console.error('[ThankYou] Error:', err.message);
    return { success: false, sent: 0 };
  }
}
