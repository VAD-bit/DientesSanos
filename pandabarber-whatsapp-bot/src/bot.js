import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { renderTemplate, normalizePhone } from './utils/messageTemplates.js';

let client = null;
let isReady = false;
let lastQr = null;

export function getLatestQr() {
  return lastQr;
}

export async function initializeWhatsApp() {
  const sessionPath = process.env.WHATSAPP_SESSION_PATH || './sessions';
  const puppeteerExecPath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

  const puppeteerConfig = {};
  if (puppeteerExecPath) {
    puppeteerConfig.executablePath = puppeteerExecPath;
  }
  puppeteerConfig.args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu'
  ];

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: sessionPath }),
    puppeteer: puppeteerConfig
  });

  client.on('qr', (qr) => {
    lastQr = qr;
    console.log('[WhatsApp] QR Code received. Scan with your phone:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('[WhatsApp] Client is ready!');
    isReady = true;
    lastQr = null;
  });

  client.on('authenticated', () => {
    console.log('[WhatsApp] Authenticated successfully');
    lastQr = null;
  });

  client.on('auth_failure', (msg) => {
    console.error('[WhatsApp] Auth failure:', msg);
    isReady = false;
  });

  client.on('disconnected', (reason) => {
    console.log('[WhatsApp] Disconnected:', reason);
    isReady = false;
    setTimeout(() => initializeWhatsApp(), 10000);
  });

  client.on('message', async (msg) => {
    console.log(`[WhatsApp] Message from ${msg.from}: ${msg.body}`);
  });

  console.log('[WhatsApp] Initializing client...');
  client.initialize().catch(err => {
    console.error('[WhatsApp] Failed to initialize:', err);
  });
}

export function isWhatsAppReady() {
  return Boolean(isReady && client);
}

export async function stopWhatsApp() {
  if (client) {
    await client.destroy();
    client = null;
    isReady = false;
    console.log('[WhatsApp] Client destroyed');
  }
}

export async function sendMessage(phone, message) {
  if (!isReady || !client) {
    console.error('[WhatsApp] Client not ready, cannot send message');
    return { success: false, error: 'Client not ready' };
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    console.error('[WhatsApp] Invalid phone number:', phone);
    return { success: false, error: 'Invalid phone' };
  }

  const chatId = normalizedPhone + '@c.us';

  try {
    const numberId = await client.getNumberId(normalizedPhone);
    if (!numberId?._serialized) {
      return { success: false, error: 'WhatsApp number is not registered' };
    }
    await client.sendMessage(numberId._serialized || chatId, message);
    console.log(`[WhatsApp] Message sent to ${normalizedPhone}`);
    return { success: true };
  } catch (err) {
    console.error(`[WhatsApp] Error sending to ${normalizedPhone}:`, err?.stack || err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}
