import { supabase, getSetting } from '../supabase.js';
import { sendMessage, isWhatsAppReady } from '../bot.js';
import { renderTemplate } from '../utils/messageTemplates.js';

const DEFAULT_TEMPLATE = 'Hola {{nombre}}! 🎉 Es tu cumpleaños y te regalamos 10% de descuento en tu próxima visita a Panda Barber Studio.';

const joinNames = (names) => {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
};

async function wasPushSentToday(key, dateStr) {
  const stored = await getSetting(key, '');
  return stored === dateStr;
}

async function markPushSentToday(key, dateStr) {
  await supabase.from('system_settings').upsert({ key, value: dateStr, updated_at: new Date().toISOString() });
}

async function sendAdminPush(title, body) {
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ target: { roles: ['Admin'] }, title, body }),
    });
    if (!res.ok) console.error('[Birthday] push admin error', res.status, await res.text());
  } catch (err) {
    console.error('[Birthday] push admin error:', err.message);
  }
}

// Aviso a Admin (independiente de WhatsApp): cumpleaños de clientes y del equipo hoy.
async function runBirthdayPushDigest(now) {
  const month = now.getMonth();
  const day = now.getDate();
  const dateStr = now.toISOString().slice(0, 10);
  const matchesToday = (birthDate) => {
    const d = new Date(`${birthDate}T12:00:00`);
    return d.getMonth() === month && d.getDate() === day;
  };

  try {
    const key = 'birthday_push_clients_last_sent';
    if (!(await wasPushSentToday(key, dateStr))) {
      const { data: clients, error } = await supabase.from('clients').select('id, name, birth_date').eq('active', true).not('birth_date', 'is', null);
      if (error) throw error;
      const todays = (clients || []).filter(c => matchesToday(c.birth_date));
      if (todays.length) {
        const names = joinNames(todays.map(c => c.name));
        if (todays.length === 1) {
          await sendAdminPush('🎂 ¡Hoy hay vela que soplar!', `${names} está de cumpleaños. Recíbela con toda la actitud Panda 🐼✨`);
        } else {
          await sendAdminPush('🎂 Cumpleaños en la casa', `${names} cumplen años hoy — que no se les pase por alto cuando lleguen.`);
        }
      }
      await markPushSentToday(key, dateStr);
    }
  } catch (err) {
    console.error('[Birthday] push clientes error:', err);
  }

  try {
    const key = 'birthday_push_staff_last_sent';
    if (!(await wasPushSentToday(key, dateStr))) {
      const { data: staff, error } = await supabase.from('staff').select('id, name, birth_date').eq('active', true).not('birth_date', 'is', null);
      if (error) throw error;
      const todays = (staff || []).filter(s => matchesToday(s.birth_date));
      if (todays.length) {
        const names = joinNames(todays.map(s => s.name));
        if (todays.length === 1) {
          await sendAdminPush('🎉 ¡Uno de los nuestros está de cumpleaños!', `${names} cumple años hoy. Un abrazo, un corte gratis, lo que decidan — pero que no falte el cariño 🐼🎂`);
        } else {
          await sendAdminPush('🎉 Doble celebración en el equipo', `${names} cumplen años hoy. Panda Barber Studio les desea un año cargado de buena energía.`);
        }
      }
      await markPushSentToday(key, dateStr);
    }
  } catch (err) {
    console.error('[Birthday] push equipo error:', err);
  }
}

export async function runBirthdayJob(now = new Date()) {
  await runBirthdayPushDigest(now);

  if (!isWhatsAppReady()) {
    console.log('[Birthday] WhatsApp not ready; will retry next cycle.');
    return;
  }

  try {
    const [{ data: clients, error }, template] = await Promise.all([
      supabase.from('clients').select('id, name, phone, birth_date').eq('active', true).not('birth_date', 'is', null),
      getSetting('whatsapp_template_birthday', DEFAULT_TEMPLATE)
    ]);
    if (error) throw error;

    const month = now.getMonth();
    const day = now.getDate();
    const birthdayClients = (clients || []).filter(client => {
      const birthDate = new Date(`${client.birth_date}T12:00:00`);
      return birthDate.getMonth() === month && birthDate.getDate() === day;
    });

    const clientIds = birthdayClients.map(client => client.id);
    let clientsToSend = birthdayClients;

    if (clientIds.length > 0) {
      const currentYear = now.getFullYear();
      const { data: sentReminders, error: remindersError } = await supabase
        .from('scheduled_reminders')
        .select('client_id')
        .eq('kind', 'birthday')
        .eq('sent', true)
        .in('client_id', clientIds)
        .gte('sent_at', `${currentYear}-01-01T00:00:00Z`);

      if (remindersError) throw remindersError;

      const sentClientIds = new Set(sentReminders?.map(r => r.client_id) || []);
      clientsToSend = birthdayClients.filter(client => !sentClientIds.has(client.id));
    }

    if (clientsToSend.length === 0) {
      console.log('[Birthday] No hay nuevos cumpleaños para enviar hoy (o ya fueron procesados).');
      return;
    }

    let sentCount = 0;
    for (const client of clientsToSend) {
      try {
        await sendMessage(client.phone, renderTemplate(template, { nombre: client.name }));
        const sentAt = new Date().toISOString();
        await supabase.from('scheduled_reminders').insert({
          client_id: client.id,
          kind: 'birthday',
          remind_at: sentAt,
          sent: true,
          sent_at: sentAt,
          attempts: 1
        });
        sentCount++;
      } catch (err) {
        console.error(`[Birthday] No se pudo enviar o registrar para ${client.name}:`, err.message);
      }
    }
    console.log(`[Birthday] Enviados y registrados ${sentCount}/${clientsToSend.length}`);
  } catch (error) {
    console.error('[Birthday] Error del job:', error);
  }
}
