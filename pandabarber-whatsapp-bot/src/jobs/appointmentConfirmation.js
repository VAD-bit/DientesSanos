import { supabase } from '../supabase.js';
import { sendMessage, isWhatsAppReady } from '../bot.js';
import { renderTemplate } from '../utils/messageTemplates.js';

const APPOINTMENT_TEMPLATE = 'Hola {{nombre}}! Tu cita está confirmada para el {{fecha}} a las {{hora}}. Servicio: {{servicio}}. Barbero: {{barbero}}.';

export async function sendAppointmentConfirmation(appointmentId) {
  if (!isWhatsAppReady()) {
    console.error('[Appointment] WhatsApp not ready');
    return { success: false, error: 'WhatsApp not ready' };
  }

  try {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_at,
        clients (name, phone),
        services (name),
        staff (name)
      `)
      .eq('id', appointmentId)
      .single();

    if (error || !appointment) {
      console.error('[Appointment] Not found:', error?.message);
      return { success: false, error: 'Appointment not found' };
    }

    if (!appointment.clients?.phone) {
      console.warn('[Appointment] No phone for client');
      return { success: false, error: 'No phone' };
    }

    const scheduledDate = new Date(appointment.scheduled_at);
    const fecha = scheduledDate.toLocaleDateString('es-VE', {
      timeZone: 'America/Caracas',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const hora = scheduledDate.toLocaleTimeString('es-VE', {
      timeZone: 'America/Caracas',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const message = renderTemplate(APPOINTMENT_TEMPLATE, {
      nombre: appointment.clients.name,
      fecha,
      hora,
      servicio: appointment.services?.name || 'No especificado',
      barbero: appointment.staff?.name || 'No asignado'
    });

    const result = await sendMessage(appointment.clients.phone, message);
    console.log(`[Appointment] Confirmation sent to ${appointment.clients.name}: ${result.success ? 'OK' : 'FAILED'}`);
    return result;
  } catch (err) {
    console.error('[Appointment] Error:', err.message);
    return { success: false, error: err.message };
  }
}
