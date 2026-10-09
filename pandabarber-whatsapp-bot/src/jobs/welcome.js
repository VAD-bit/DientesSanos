import { supabase } from '../supabase.js';
import { sendMessage, isWhatsAppReady } from '../bot.js';
import { renderTemplate, normalizePhone } from '../utils/messageTemplates.js';

const WELCOME_TEMPLATE = 'Hola {{nombre}}! Bienvenido a Panda Barber Studio. Estamos listos para atenderte ✂️🐼';

export async function sendWelcome(clientId) {
  if (!isWhatsAppReady()) {
    console.error('[Welcome] WhatsApp not ready');
    return { success: false, error: 'WhatsApp not ready' };
  }

  try {
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, name, phone')
      .eq('id', clientId)
      .single();

    if (error || !client) {
      console.error('[Welcome] Client not found:', error?.message);
      return { success: false, error: 'Client not found' };
    }

    if (!client.phone) {
      console.warn(`[Welcome] No phone for client ${client.name}`);
      return { success: false, error: 'No phone' };
    }

    const message = renderTemplate(WELCOME_TEMPLATE, { nombre: client.name });
    const result = await sendMessage(client.phone, message);

    console.log(`[Welcome] Sent to ${client.name}: ${result.success ? 'OK' : 'FAILED'}`);
    return result;
  } catch (err) {
    console.error('[Welcome] Error:', err.message);
    return { success: false, error: err.message };
  }
}
