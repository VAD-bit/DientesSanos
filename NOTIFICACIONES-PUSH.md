# Notificaciones Push (Web Push / PWA)

Notificaciones push reales a los dispositivos del staff (llegan aunque la app esté cerrada,
siempre que el navegador/PWA lo permita). Implementado el 2026-08-06.

## Piezas

- **Frontend** `src/services/pushService.js`
  - `subscribe(staff)`: pide permiso, se suscribe con la llave VAPID pública y guarda la
    suscripción en `odontosonrisa.push_subscriptions` (endpoint + keys + rol + staff_id).
  - `notify(target, title, body, data)`: llama a la Edge Function `send-push`.
  - Se suscribe al iniciar sesión desde `src/App.jsx`.
- **Disparadores** (en `src/services/dataService.js`, centralizados):
  | Evento | Función | Destino |
  |---|---|---|
  | Cita agendada | `createAppointment` (scheduled_at) | barbero de la cita |
  | Cliente en silla | `createAppointment`/`updateAppointmentStatus` → 'En Silla' | barbero |
  | Enviar a lavado | `updateAppointmentStatus` → 'En Lavado' | rol Asistente |
  | Venta de producto | `addProductToAppointment` | Barista, Asistente, Admin |
  | Enviar a caja | `updateAppointmentStatus` → 'Por Pagar' | Admin |
- **Backend** — Edge Function `send-push` (Deno) en el VPS:
  `/root/supabase/docker/volumes/functions/send-push/index.ts` (copia versionada en
  `edge-functions/send-push/index.ts`). Lee la VAPID **privada** de `odontosonrisa.push_config`,
  busca suscripciones por `staff_id` o `roles`, y envía con `npm:web-push`. Borra suscripciones
  muertas (410/404). Expuesta en `POST /functions/v1/send-push`.

## Base de datos (schema `odontosonrisa`)

- `push_subscriptions (id, staff_id, role, endpoint unique, p256dh, auth, created_at)`
- `push_config (id=1, vapid_public, vapid_private, subject)` — solo `service_role` la lee.

## Notas / pendientes

- **iPhone**: el push web solo funciona si la PWA está **instalada** ("Agregar a inicio",
  iOS 16.4+). En Android/Chrome funciona instalada o en pestaña.
- El `role` se normaliza en `pushService.roleCategory` (Admin/Barbero/Asistente/Barista/…).
  Si un rol no cae en esas categorías, no recibe notificaciones por rol.
- `VERIFY_JWT=false` en el edge-runtime: la función es callable sin JWT. Endurecer si hace falta.
- Rotar VAPID: generar nuevo par y actualizar `push_config` + la constante `VAPID_PUBLIC` en
  `pushService.js` (invalida las suscripciones existentes; el staff se re-suscribe al entrar).
