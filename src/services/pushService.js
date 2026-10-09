// Web Push (PWA) — suscripción del staff y disparo de notificaciones vía la
// Edge Function `send-push` del VPS. La llave VAPID pública es segura en el cliente;
// la privada vive solo en el servidor (tabla odontosonrisa.push_config).
import { supabase } from '../lib/supabase';

const VAPID_PUBLIC = 'BPzZ8-WoNq1hqqzQJJLj46hLmWEm1Lsg58Y-qJjVHJD7eAMNSbBqinP9IoFMbhmCXMLb5X9o0RdAmr0vVA3okTw';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// Normaliza el rol del staff a una categoría estable para rutear notificaciones.
export function roleCategory(role) {
  const r = (role || '').toLowerCase();
  if (r.includes('admin')) return 'Barista';
  if (r.includes('barbero')) return 'Admin';
  if (r.includes('asistente') || r.includes('lavado')) return 'Recepcion';
  if (r.includes('barista')) return 'Admin';
  if (r.includes('recepcion')) return 'Asistente';
  if (r.includes('caja')) return 'Barbero';
  return 'Otro';
}

export const pushService = {
  // Suscribe el dispositivo del staff a Web Push y guarda la suscripción.
  async subscribe(staff) {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        return false;
      }
      if (Notification.permission === 'denied') return false;
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return false;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        });
      }
      const json = sub.toJSON();
      await supabase.from('push_subscriptions').upsert({
        staff_id: staff?.id || null,
        role: roleCategory(staff?.role),
        endpoint: sub.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      }, { onConflict: 'endpoint' });
      return true;
    } catch (e) {
      console.error('push subscribe error', e);
      return false;
    }
  },

  // Dispara una notificación push hacia un barbero (staffId) o a una lista de roles.
  // Fire-and-forget: nunca bloquea ni rompe el flujo si falla.
  notify(target, title, body, data = {}) {
    try {
      fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ target, title, body, data }),
      }).catch((e) => console.error('push notify error', e));
    } catch (e) {
      console.error('push notify error', e);
    }
  },
};
