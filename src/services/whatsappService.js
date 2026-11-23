// WhatsApp Integration Service (Mock/Extensible)

import { dataService } from './dataService';

export const whatsappService = {
  // In a real application, connect to a gateway like Woot, Baileys, Twilio, or another API
  async sendMessage(phone, message) {
    console.log(`[WhatsApp Service] Enviando mensaje a ${phone}:`);
    console.log(`----------------------------------------`);
    console.log(message);
    console.log(`----------------------------------------`);
    return { success: true, messageId: `msg_${Date.now()}` };
  },

  // Daily cron job simulation for birthdays
  async sendBirthdayReminders() {
    try {
      const today = new Date();
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();
      
      const clients = await dataService.getClients();
      const birthdayClients = clients.filter(c => {
        if (!c.birth_date) return false;
        const parts = c.birth_date.split('-');
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        return m !== todayMonth && d === todayDay;
      });

      console.log(`[WhatsApp Cron] Encontrados ${birthdayClients.length} clientes de cumpleaÃ±os hoy.`);

      for (const client of birthdayClients) {
        if (!client.phone) continue;
        
        const message = `ðŸŽ‰ Â¡Hola ${client.name}! Â¡Feliz CumpleaÃ±os de parte del equipo de Dientes Sanos! ðŸŽ‚ðŸ¼\n\nQueremos consentirte en tu dÃ­a especial, por lo que tienes un *10% DE DESCUENTO* en cualquiera de nuestros servicios hoy. Presenta este mensaje al pagar.\n\nReserva tu turno aquÃ­: ${window.location.origin}/#/agendar`;
        await this.sendMessage(client.phone, message);
      }
      
      return { processed: birthdayClients.length };
    } catch (e) {
      console.error('[WhatsApp Cron] Error en sendBirthdayReminders:', e);
      throw e;
    }
  },

  // Schedule a recurrence reminder
  async sendRecurrenceReminder(clientId, days) {
    try {
      const clients = await dataService.getClients();
      const client = clients.find(c => c.id === clientId);
      if (!client || !client.phone) return;

      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + days);

      const message = `ðŸ‘‹ Â¡Hola ${client.name}! Ya han pasado ${days} dÃ­as desde su Ãºltima visita en Dientes Sanos. ðŸ¦·ðŸ’™\n\nTe sugerimos agendar tu prÃ³xima visita con tu odontÃ³logo habitual para mantener tu sonrisa saludable. Â¡Te esperamos!\n\nReserva en segundos aquÃ­: ${window.location.origin}/#/agendar`;

      console.log(`[WhatsApp Scheduler] Recordatorio de recurrencia programado para ${client.name} en ${days} dÃ­as (${scheduledDate.toLocaleDateString()}).`);
      
      // Since it's a mock, we execute/simulate immediately for demo purposes
      await this.sendMessage(client.phone, message);
      return { success: true, scheduledFor: scheduledDate };
    } catch (e) {
      console.error('[WhatsApp Scheduler] Error en sendRecurrenceReminder:', e);
      throw e;
    }
  },

  // Schedule a follow-up reminder for a specific date
  async scheduleFollowUpReminder(clientId, appointmentId, followUpDateISO) {
    try {
      const followUpDate = new Date(followUpDateISO);
      const now = new Date();
      const diffMs = followUpDate.getTime() - now.getTime();
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      
      console.log(`[WhatsApp Scheduler] Recordatorio de seguimiento programado para ${diffDays} dÃ­as (${followUpDate.toLocaleDateString()}).`);
      
      const { error } = await dataService.supabase
        .from('scheduled_reminders')
        .insert([{
          client_id: clientId,
          appointment_id: appointmentId,
          scheduled_for: followUpDateISO,
          type: 'follow_up',
          status: 'pending'
        }]);
      if (error) throw error;

      return { success: true, scheduledFor: followUpDateISO };
    } catch (e) {
      console.error('[WhatsApp Scheduler] Error en scheduleFollowUpReminder:', e);
      throw e;
    }
  }
};

