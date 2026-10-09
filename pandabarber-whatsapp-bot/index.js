import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import QRCode from 'qrcode';
import { initializeWhatsApp, isWhatsAppReady, stopWhatsApp, getLatestQr } from './src/bot.js';
import { runBirthdayJob } from './src/jobs/birthday.js';
import { sendAppointmentConfirmation } from './src/jobs/appointmentConfirmation.js';
import { sendRecurrenceMessages } from './src/jobs/recurrence.js';
import { sendThankYouMessages } from './src/jobs/thankYou.js';
import { sendWelcome } from './src/jobs/welcome.js';

const app = express();
const port = Number(process.env.PORT) || 3002;
const timezone = process.env.TZ || 'America/Caracas';

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

const PIN = process.env.QR_PIN;

if (!PIN) {
  console.error('[HTTP] QR_PIN is required; refusing to expose the QR page without protection.');
  process.exit(1);
}

function isAuthorized(request) {
  const queryPin = request.query?.pin;
  const bodyPin = request.body?.pin;
  const cookieHeader = request.headers.cookie || '';
  const hasAuthCookie = cookieHeader.includes(`qr_auth=${PIN}`);
  return queryPin === PIN || bodyPin === PIN || hasAuthCookie;
}

function renderPinForm(errorMsg = '') {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Acceso Protegido - WhatsApp Bot</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0b0e; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: #e9eae8; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 40px 32px; text-align: center; max-width: 360px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        .logo { font-size: 40px; margin-bottom: 12px; }
        h2 { color: #188196; margin: 0 0 8px 0; font-size: 20px; font-weight: 600; }
        p { color: rgba(255,255,255,0.6); font-size: 13px; margin: 0 0 24px 0; }
        input[type="password"] { width: 100%; box-sizing: border-box; padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: #22222a; color: #fff; font-size: 18px; text-align: center; letter-spacing: 6px; outline: none; transition: border-color 0.2s; }
        input[type="password"]:focus { border-color: #188196; }
        button { width: 100%; margin-top: 16px; padding: 14px; border-radius: 12px; border: none; background: #188196; color: #000; font-weight: 700; font-size: 15px; cursor: pointer; transition: opacity 0.2s; }
        button:hover { opacity: 0.9; }
        .error { color: #ff453a; font-size: 13px; margin-top: 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">🔒</div>
        <h2>Acceso Restringido</h2>
        <p>Ingresa el PIN de seguridad para acceder al QR de WhatsApp.</p>
        <form method="POST" action="/qr">
          <input type="password" name="pin" maxlength="10" placeholder="••••" autofocus required />
          <button type="submit">Ingresar</button>
        </form>
        ${errorMsg ? `<div class="error">${errorMsg}</div>` : ''}
      </div>
    </body>
    </html>
  `;
}

app.get('/health', (request, response) => response.json({
  ok: true,
  whatsappReady: isWhatsAppReady(),
  timestamp: new Date().toISOString()
}));

app.post('/qr', (request, response) => {
  if (isAuthorized(request)) {
    response.setHeader('Set-Cookie', `qr_auth=${PIN}; Path=/; HttpOnly; Max-Age=86400`);
    return response.redirect('/qr');
  }
  return response.send(renderPinForm('PIN incorrecto. Inténtalo de nuevo.'));
});

app.get('/qr', async (request, response) => {
  if (!isAuthorized(request)) {
    return response.send(renderPinForm());
  }

  // Ensure cookie is refreshed
  response.setHeader('Set-Cookie', `qr_auth=${PIN}; Path=/; HttpOnly; Max-Age=86400`);

  if (isWhatsAppReady()) {
    return response.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp Bot - Estado</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0b0e; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #e9eae8; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 40px; text-align: center; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .icon { font-size: 48px; margin-bottom: 16px; }
          h2 { color: #32d74b; margin: 0 0 8px 0; }
          p { color: rgba(255,255,255,0.7); font-size: 14px; margin: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h2>¡WhatsApp Conectado!</h2>
          <p>El bot de Panda Barber se encuentra activo y listo para enviar notificaciones.</p>
        </div>
      </body>
      </html>
    `);
  }

  const qrString = getLatestQr();
  if (!qrString) {
    return response.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp Bot - Esperando QR</title>
        <meta charset="utf-8">
        <meta http-equiv="refresh" content="3">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0b0e; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #e9eae8; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 40px; text-align: center; max-width: 400px; }
          p { color: rgba(255,255,255,0.7); font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Generando Código QR...</h2>
          <p>Espera unos segundos. La página se recargará automáticamente.</p>
        </div>
      </body>
      </html>
    `);
  }

  try {
    const qrDataUrl = await QRCode.toDataURL(qrString, { width: 320, margin: 2 });
    return response.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Escanear QR WhatsApp - Panda Barber</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="25">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0b0e; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #e9eae8; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 32px; text-align: center; max-width: 420px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
          h2 { color: #188196; margin: 0 0 8px 0; font-size: 22px; }
          p { color: rgba(255,255,255,0.6); font-size: 13px; margin: 0 0 24px 0; line-height: 1.5; }
          .qr-box { background: #fff; padding: 16px; border-radius: 16px; display: inline-block; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
          .qr-box img { display: block; width: 280px; height: 280px; }
          .footer { margin-top: 24px; font-size: 11px; color: rgba(255,255,255,0.4); }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Escanea el Código QR</h2>
          <p>Abre WhatsApp en tu teléfono ➔ Dispositivos vinculados ➔ Vincular dispositivo.</p>
          <div class="qr-box">
            <img src="${qrDataUrl}" alt="WhatsApp QR Code" />
          </div>
          <div class="footer">Esta página se recarga automáticamente para mantener el QR actualizado.</div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    return response.status(500).send('Error al generar imagen QR');
  }
});

// Cron jobs
cron.schedule('30 7 * * *', () => runBirthdayJob(new Date()), { timezone });
cron.schedule('0 10 * * *', () => sendRecurrenceMessages(), { timezone });
cron.schedule('* * * * *', () => sendThankYouMessages(), { timezone });

const server = app.listen(port, '0.0.0.0', () => console.log(`[HTTP] Servidor escuchando en :${port}`));
try {
  initializeWhatsApp();
} catch (error) {
  console.error('[WhatsApp] Error al iniciar:', error);
}

async function shutdown(signal) {
  console.log(`[System] ${signal}: cerrando servicio`);
  server.close();
  await stopWhatsApp().catch(() => undefined);
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
