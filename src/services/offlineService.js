import Dexie from 'dexie';
import { dataService } from './dataService';
import { supabase } from '../lib/supabase';

const db = new Dexie('odontosonrisaOfflineDB');
db.version(1).stores({
  pendingPayments: '++id, createdAt, userId'
});

const PERMANENT_ERROR_PATTERNS = [
  'invalid input syntax for type uuid',
  'foreign key constraint',
  'violates foreign key constraint',
  'violates row-level security',
  'new row violates row-level security',
  'permission denied',
  'unauthorized',
  'not authenticated'
];

let _listeners = [];
let _intervalId = null;
let _processing = false;

function _notifyListeners() {
  db.pendingPayments.count().then(count => {
    _listeners.forEach(fn => {
      try { fn(count); } catch (e) { console.error('[OfflineService] Listener error:', e); }
    });
  });
}

function _isPermanentError(error) {
  const msg = (error?.message || error?.details || '').toLowerCase();
  return PERMANENT_ERROR_PATTERNS.some(p => msg.includes(p));
}

function _isOrphan(item) {
  if (!item) return false;
  const oneMinAgo = Date.now() - 60000;
  const createdAt = new Date(item.createdAt).getTime();
  return createdAt < oneMinAgo;
}

async function _getCurrentUserId() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (e) {
    console.error('[OfflineService] Error getting user:', e);
    return null;
  }
}

async function processQueue() {
  if (_processing) return;
  _processing = true;

  try {
    const items = await db.pendingPayments.toArray();
    if (items.length === 0) {
      _processing = false;
      return;
    }

    const currentUserId = await _getCurrentUserId();

    for (const item of items) {
      if (item.processing) continue;

      // Skip orphan items belonging to another user
      if (item.userId && currentUserId && item.userId !== currentUserId && _isOrphan(item)) {
        await db.pendingPayments.delete(item.id);
        continue;
      }

      try {
        await db.pendingPayments.update(item.id, { processing: true });
        await dataService.processFinalPayment(item.paymentData);
        await db.pendingPayments.delete(item.id);
      } catch (err) {
        console.error('[OfflineService] Failed to process payment:', err);
        if (_isPermanentError(err)) {
          await db.pendingPayments.delete(item.id);
          console.warn('[OfflineService] Permanent error — removed from queue:', err.message);
        } else {
          await db.pendingPayments.update(item.id, { processing: false, lastError: err.message });
        }
      }
    }
  } catch (err) {
    console.error('[OfflineService] processQueue error:', err);
  } finally {
    _processing = false;
    _notifyListeners();
  }
}

export async function enqueuePayment(paymentData) {
  const userId = await _getCurrentUserId();
  await db.pendingPayments.add({
    paymentData,
    createdAt: new Date().toISOString(),
    userId,
    processing: false,
    lastError: null
  });
  _notifyListeners();
  if (navigator.onLine) {
    processQueue();
  }
}

export async function getPendingCount() {
  return db.pendingPayments.count();
}

export function subscribeToQueue(callback) {
  _listeners.push(callback);
  getPendingCount().then(callback);
  return () => {
    _listeners = _listeners.filter(fn => fn !== callback);
  };
}

export async function clearQueue() {
  await db.pendingPayments.clear();
  _notifyListeners();
}

// Returns the queued payments (oldest first) with just what the UI needs to show
// what's pending — client, amount, when it was queued, and the last error if any.
export async function listPendingPayments() {
  const items = await db.pendingPayments.toArray();
  return items
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(it => ({
      id: it.id,
      createdAt: it.createdAt,
      processing: !!it.processing,
      lastError: it.lastError || null,
      payment: it.paymentData || {}
    }));
}

// Drop a single stuck payment from the queue (e.g. one that can never sync because
// its appointment was deleted). Does NOT touch anything server-side.
export async function discardPayment(id) {
  await db.pendingPayments.delete(id);
  _notifyListeners();
}

// Force an immediate sync attempt. Also clears any leftover 'processing' flag so an
// item stranded by a tab that closed mid-sync becomes eligible again.
export async function retryQueueNow() {
  const items = await db.pendingPayments.toArray();
  await Promise.all(
    items.filter(i => i.processing).map(i => db.pendingPayments.update(i.id, { processing: false }))
  );
  await processQueue();
}

export function initOfflineService() {
  // NB: we deliberately do NOT auto-reset stuck 'processing' items on boot. An item can
  // be stuck because its underlying appointment was deleted (e.g. a test), and silently
  // retrying could partially re-create server data. Instead the user drives it from the
  // "pagos pendientes offline" modal: Reintentar (retryQueueNow clears the flag) or
  // Descartar (discardPayment removes it).
  window.addEventListener('online', () => {
    processQueue();
  });

  if (_intervalId) clearInterval(_intervalId);
  _intervalId = setInterval(() => {
    if (navigator.onLine) {
      processQueue();
    }
  }, 30000);

  if (navigator.onLine) {
    processQueue();
  }
}
