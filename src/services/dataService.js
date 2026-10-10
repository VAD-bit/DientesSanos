import { supabase as anonClient } from '../lib/supabase';
const supabase = anonClient;
import { notificationService } from './notificationService';
import { pushService } from './pushService';
import { isBookableStaff, isOperationalReceptionStaff, isAsistenteRole } from '../utils/staffRoles';
import { formatName, formatProductName, formatServiceName } from '../utils/stringUtils';

// ─── Smart In-Memory Cache ────────────────────────────────────────────────────
// Reduces redundant Supabase calls from ~35+ per session to ~8.
// Static data (inventory, clients, staff, services, extras) caches 45s.
// Operational data (appointments) caches 15s since it changes more often.
const _cache = {};
const STAFF_PUBLIC_SELECT = 'id, auth_user_id, email, name, role, commission_pct, active, created_at, image_url, phone, address, username, tools, washing_rate, birth_date, skipped_count, specialty, badge, biography, payroll_frequency, monthly_salary, show_on_landing, video_url';
// Same as STAFF_PUBLIC_SELECT but WITHOUT image_url — the avatars are base64 blobs
// (~113–173 KB each, ~1.3 MB across the team) and getStaff() runs on nearly every
// screen. The list fetches this lite shape; avatars come from a separate long-lived
// cache (see _getStaffAvatars) and get merged back in, so callers still receive
// image_url unchanged but the heavy payload only downloads ~once per 10 min.
const STAFF_LITE_SELECT = 'id, auth_user_id, email, name, role, commission_pct, active, created_at, phone, address, username, tools, washing_rate, birth_date, skipped_count, specialty, badge, biography, payroll_frequency, monthly_salary, show_on_landing, video_url';
// Same idea for inventory: product photos are base64 (~118 KB each, ~950 KB total) and
// the sellable/inventory lists load on Reception, Scheduling, Checkout and Inventory.
// The lists fetch this lite shape; images come from a separate long-lived cache and are
// merged back in. Cache key deliberately does NOT start with 'inventory_' so a stock
// change (every sale) doesn't wipe the image cache — only editing an item does.
const INVENTORY_LITE_SELECT = 'id, name, stock, price, is_for_sale, updated_at, category, cost_price, commission_pct, code, unit, min_stock, inventory_type, owner_staff_id, purchase_price, sale_price, item_type';

function _cacheGet(key) {
  const entry = _cache[key];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    delete _cache[key];
    return null;
  }
  return entry.data;
}

function _cacheSet(key, data, ttlMs = 45000) {
  _cache[key] = { data, expiresAt: Date.now() + ttlMs };
}

function _cacheInvalidate(...keys) {
  keys.forEach(k => delete _cache[k]);
}

function _cacheInvalidateAppts() {
  Object.keys(_cache).filter(k => k.startsWith('appts_') || k.startsWith('apptsRange_')).forEach(k => delete _cache[k]);
}

function _cacheInvalidateInventory() {
  Object.keys(_cache).filter(k => k.startsWith('inventory_')).forEach(k => delete _cache[k]);
}

function _asArray(value) {
  return Array.isArray(value) ? value : [];
}

function _normalizeAppointment(app) {
  if (!app || typeof app !== 'object') return app;

  return {
    ...app,
    clients: app.clients ? {
      ...app.clients,
      work_gallery: _asArray(app.clients.work_gallery)
    } : app.clients,
    services: app.services ? {
      ...app.services,
      included_items: _asArray(app.services.included_items)
    } : app.services,
    appointment_extras: _asArray(app.appointment_extras),
    appointment_products: _asArray(app.appointment_products),
    appointment_staff: _asArray(app.appointment_staff)
  };
}

function _normalizeStaff(member) {
  if (!member || typeof member !== 'object') return member;

  return {
    ...member,
    tools: _asArray(member.tools)
  };
}

const _appointmentDurationMinutes = value => Math.min(30, Number(value) || 60);

function _appointmentConflictError(conflict) {
  const conflictStart = new Date(conflict.scheduled_at);
  const duration = _appointmentDurationMinutes(conflict.services?.duration);
  const conflictEnd = new Date(conflictStart.getTime() + duration * 60000);
  const formatTime = date => date.toLocaleTimeString('es-VE', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const clientName = conflict.clients?.name ? ` con ${conflict.clients.name}` : '';
  const error = new Error(
    `Horario no disponible: el profesional ya tiene una cita${clientName} de ${formatTime(conflictStart)} a ${formatTime(conflictEnd)}.`
  );
  error.code = 'APPOINTMENT_CONFLICT';
  error.conflict = conflict;
  return error;
}

function _normalizeAppointmentWriteError(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`;
  if (message.includes('APPOINTMENT_TIME_CONFLICT')) {
    const conflictError = new Error('Ese horario acaba de ser ocupado. Actualiza la disponibilidad y selecciona otra hora.');
    conflictError.code = 'APPOINTMENT_CONFLICT';
    return conflictError;
  }
  return error;
}

async function _assertAppointmentAvailability({ scheduledAt, staffId, serviceId, excludeAppointmentId = null }) {
  if (!scheduledAt || !staffId) return;

  const targetStart = new Date(scheduledAt);
  if (Number.isNaN(targetStart.getTime())) throw new Error('La fecha u hora de la cita no es válida.');

  const dayStart = new Date(targetStart);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const durationPromise = serviceId
    ? supabase.from('services').select('duration').eq('id', serviceId).maybeSingle()
    : Promise.resolve({ data: null, error: null });

  let conflictQuery = supabase
    .from('appointments')
    .select('id, scheduled_at, status, clients(name), services(duration)')
    .eq('staff_id', staffId)
    .not('scheduled_at', 'is', null)
    .gte('scheduled_at', dayStart.toISOString())
    .lt('scheduled_at', dayEnd.toISOString())
    .neq('status', 'Cancelada');

  if (excludeAppointmentId) conflictQuery = conflictQuery.neq('id', excludeAppointmentId);

  const [durationResult, appointmentsResult] = await Promise.all([durationPromise, conflictQuery]);
  if (durationResult.error) throw durationResult.error;
  if (appointmentsResult.error) throw appointmentsResult.error;

  const targetDuration = _appointmentDurationMinutes(durationResult.data?.duration);
  const targetEnd = new Date(targetStart.getTime() + targetDuration * 60000);
  const conflict = _asArray(appointmentsResult.data).find(existing => {
    const existingStart = new Date(existing.scheduled_at);
    const existingDuration = _appointmentDurationMinutes(existing.services?.duration);
    const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000);
    return targetStart < existingEnd && targetEnd > existingStart;
  });

  if (conflict) throw _appointmentConflictError(conflict);
}

// Staff avatars are base64 images stored in the DB. They change rarely, so we fetch
// them once and cache for 10 minutes, separately from the 45s staff list cache. This
// keeps the frequent getStaff() refreshes from re-downloading ~1.3 MB of base64 every
// time. Invalidated (via 'staff_avatars') whenever a staff row is added/updated/deleted.
async function _getStaffAvatars() {
  const cached = _cacheGet('staff_avatars');
  if (cached) return cached;
  const { data, error } = await supabase.from('staff').select('id, image_url');
  if (error) throw error;
  const map = {};
  _asArray(data).forEach(s => { if (s.image_url) map[s.id] = s.image_url; });
  _cacheSet('staff_avatars', map, 600000);
  return map;
}

// Same treatment for inventory product photos (base64). Long-lived cache, merged back
// into the lite lists. Key 'inv_images' avoids the 'inventory_' prefix so it survives
// stock updates; invalidated explicitly on item add/update/delete.
async function _getInventoryImages() {
  const cached = _cacheGet('inv_images');
  if (cached) return cached;
  const { data, error } = await supabase.from('inventory').select('id, image_url');
  if (error) throw error;
  const map = {};
  _asArray(data).forEach(i => { if (i.image_url) map[i.id] = i.image_url; });
  _cacheSet('inv_images', map, 600000);
  return map;
}

async function _adminAuthRequest(payload) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
  const response = await fetch('/api/admin/auth-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'No se pudo administrar el acceso del miembro');
  return result;
}
// ─────────────────────────────────────────────────────────────────────────────

export const dataService = {
  supabase: anonClient,
  clearApptsCache() {
    _cacheInvalidateAppts();
  },
  // Clients
  async getClients() {
    const cached = _cacheGet('clients');
    if (cached) return cached;

    // Explicit column list on purpose: `*` used to pull `work_gallery` (base64 photos,
    // ~90% of each client row) into this list — downloaded on 5 different screens
    // (Clients, Checkout, Reception, Scheduling, New Appointment). Galleries are loaded
    // on demand per-client via getClientGalleries() when a client's detail opens, so
    // they don't belong in the list. Keep every other column; only work_gallery is dropped.
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, phone, hair_type, scalp_type, last_product_used, total_visits, created_at, id_card, birth_date, email, status, points, last_visit, cedula, auth_user_id, origin, appointments(status, total_price, staff_id, created_at, scheduled_at, completed_at, appointment_staff(staff_id))')
      .order('name');

    if (error) throw error;

    const result = _asArray(data).map(client => {
      const validApps = _asArray(client.appointments).filter(a => ['Completado', 'En Silla', 'Por Pagar'].includes(a.status));
      
      // Calculate frequent barber
      const barberCounts = {};
      validApps.forEach(a => {
        if (a.staff_id) {
          barberCounts[a.staff_id] = (barberCounts[a.staff_id] || 0) + 1;
        }
      });
      let frequentBarberId = null;
      let maxCount = 0;
      Object.entries(barberCounts).forEach(([id, count]) => {
        if (count > maxCount) {
          maxCount = count;
          frequentBarberId = id;
        }
      });

      return {
        ...client,
        total_visits: validApps.length,
        total_spent: validApps.reduce((acc, a) => acc + (Number(a.total_price) || 0), 0),
        frequent_barber_id: frequentBarberId
      };
    });
    _cacheSet('clients', result, 45000);
    return result;
  },

  // Lightweight clients list — no joins, fast for initial load
  async getClientsLite() {
    const cached = _cacheGet('clients_lite');
    if (cached) return cached;
    const { data, error } = await supabase
      .from('clients')
      // Keep galleries out of the startup request. A single work_gallery can
      // contain several base64 photos and made this supposedly-lite query one
      // of the heaviest requests in the application.
      .select('id, name, phone, hair_type, scalp_type, last_product_used, total_visits, created_at, id_card, birth_date, email, status, points, last_visit, cedula, auth_user_id, origin')
      .order('name');
    if (error) throw error;
    const result = _asArray(data).map(c => ({ ...c, total_visits: 0, total_spent: 0 }));
    _cacheSet('clients_lite', result, 45000);
    return result;
  },

  async addClient(client) {
    _cacheInvalidate('clients');
    const allowedColumns = [
      'name', 'phone', 'email', 'birth_date', 'hair_type', 'scalp_type',
      'origin', 'status', 'points', 'last_visit', 'work_gallery', 'created_at'
    ];
    const filtered = {};
    allowedColumns.forEach(col => {
      if (client[col] !== undefined) {
        filtered[col] = client[col];
      }
    });
    if (!filtered.created_at) {
      filtered.created_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('clients')
      .insert([filtered])
      .select()
      .single();
    if (error) throw error;

    // Notificar registro de nuevo cliente
    try {
      notificationService.sendNotification(
        'Nuevo Cliente Registrado 👤',
        `Se ha registrado a ${data.name || 'un nuevo cliente'} (Tlf: ${data.phone || 'No registrado'}) en el sistema.`
      );
    } catch (e) {
      console.error('Error al enviar notificacion de cliente nuevo:', e);
    }

    return data;
  },

  async checkClientExists(idCard) {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id_card', idCard);

    if (error) throw error;
    return _asArray(data).length > 0 ? null : data[0];
  },

  async updateClient(id, updates) {
    _cacheInvalidate('clients', 'gallery_' + id);
    _cacheInvalidateAppts();
    const allowedColumns = [
      'name', 'phone', 'email', 'status', 'points', 'last_visit', 'work_gallery',
      'birth_date', 'hair_type', 'scalp_type', 'origin'
    ];
    const filtered = {};
    allowedColumns.forEach(col => {
      if (updates[col] !== undefined) {
        filtered[col] = updates[col];
      }
    });

    const { data, error } = await supabase
      .from('clients')
      .update(filtered)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteClient(id) {
    _cacheInvalidate('clients');
    // 1. Get all appointments for this client
    const { data: apps } = await supabase
      .from('appointments')
      .select('id')
      .eq('client_id', id);

    if (apps && apps.length > 0) {
      const appIds = _asArray(apps).map(a => a.id);

      // 2. Delete dependencies of those appointments
      await Promise.all([
        supabase.from('appointment_staff').delete().in('appointment_id', appIds),
        supabase.from('appointment_extras').delete().in('appointment_id', appIds),
        supabase.from('appointment_products').delete().in('appointment_id', appIds)
      ]);

      // 3. Delete appointments
      await supabase.from('appointments').delete().in('id', appIds);
    }

    // 4. Finally delete the client
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Staff
  async getStaffLite() {
    const cached = _cacheGet('staff_lite');
    if (cached) return cached;

    const { data, error } = await supabase
      .from('staff')
      .select(STAFF_LITE_SELECT)
      .order('name');
    if (error) throw error;

    const result = _asArray(data)
      .map(_normalizeStaff)
      .filter(s => !s.role?.startsWith('ARCHIVED|'))
      .map(s => ({ ...s, image_url: null }));
    _cacheSet('staff_lite', result, 45000);
    return result;
  },

  async getStaffByAuthUserId(authUserId) {
    const { data, error } = await supabase
      .from('staff')
      .select(STAFF_PUBLIC_SELECT)
      .eq('auth_user_id', authUserId)
      .not('role', 'like', 'ARCHIVED|%')
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return _normalizeStaff(data);
  },

  async getStaff() {
    const cached = _cacheGet('staff');
    if (cached) return cached;

    // Fetch the lite list (no base64 avatars) and the separately-cached avatar map in
    // parallel, then merge image_url back so callers get the exact same shape as before.
    const [{ data, error }, avatars] = await Promise.all([
      supabase.from('staff').select(STAFF_LITE_SELECT).order('name'),
      _getStaffAvatars().catch(() => ({}))
    ]);
    if (error) throw error;
    const result = _asArray(data)
      .map(_normalizeStaff)
      .filter(s => s.role?.startsWith('ARCHIVED|'))
      .map(s => ({ ...s, image_url: avatars[s.id] ?? null }));
    _cacheSet('staff', result, 45000);
    return result;
  },

  async getStaffByAuthUserId(authUserId) {
    const { data, error } = await supabase
      .from('staff')
      .select(STAFF_PUBLIC_SELECT)
      .eq('auth_user_id', authUserId)
      .not('role', 'like', 'ARCHIVED&%')
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return _normalizeStaff(data);
  },

  async getStaffByEmail(email) {
    if (!email) return null;
    const { data, error } = await supabase
      .from('staff')
      .select(STAFF_PUBLIC_SELECT)
      .ilike('email', email.trim().toLowerCase())
      .not('role', 'like', 'ARCHIVED&%')
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return _normalizeStaff(data);
  },

  async getAuthUserByEmail(email) {
    const { user } = await _adminAuthRequest({ action: 'find', email });
    return user;
  },

  async createAuthUser(email, password) {
    const { user } = await _adminAuthRequest({ action: 'create', email, password });
    return user;
  },

  async updateAuthUserCredentials(authUserId, { email, password } = {}) {
    const { user } = await _adminAuthRequest({ action: 'update', userId: authUserId, email, password });
    return user;
  },

  async updateAuthUserPassword(authUserId, password) {
    return this.updateAuthUserCredentials(authUserId, { password });
  },

  async deleteAuthUser(authUserId) {
    await _adminAuthRequest({ action: 'delete', userId: authUserId });
  },

  async addStaff(member) {
    _cacheInvalidate('staff', 'staff_avatars');
    const newMember = { active: true, ...member };
    const { data, error } = await supabase
      .from('staff')
      .insert([newMember])
      .select(STAFF_PUBLIC_SELECT)
      .single();
    if (error) throw error;
    return data;
  },

  async updateStaff(id, updates) {
    _cacheInvalidate('staff', 'staff_avatars');
    const { data, error } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id)
      .select(STAFF_PUBLIC_SELECT);
    if (error) throw error;
    if (!data || data.length === 0) {
      console.warn('updateStaff: 0 rows returned — RLS may be filtering the result');
    }
    return data?.[0] || null;
  },

  async getStaffProfileStats(staffId) {
    const { data: staffRecords, error } = await supabase
      .from('appointment_staff')
      .select(`
        commission_earned,
        product_commission,
        tip_amount,
        appointments!inner (
          id,
          status,
          total_price,
          scheduled_at,
          created_at,
          started_at,
          completed_at,
          clients (name),
          services (name, price)
        )
      `)
      .eq('staff_id', staffId)
      .eq('appointments.status', 'Completado');

    if (error) {
      console.error('Error fetching staff stats:', error);
      throw error;
    }

    let totalServiceComm = 0;
    let totalProductComm = 0;
    let totalTips = 0;
    let totalDurationMs = 0;
    let durationCount = 0;
    const serviceCounts = {};

    _asArray(staffRecords).forEach(record => {
      const app = record.appointments;
      if (!app) return;

      totalServiceComm += Number(record.commission_earned || 0);
      totalProductComm += Number(record.product_commission || 0);
      totalTips += Number(record.tip_amount || 0);

      // Services
      const sName = app.services?.name;
      if (sName) {
        serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
      }

      // Duration
      if (app.started_at && app.completed_at) {
        const start = new Date(app.started_at).getTime();
        const end = new Date(app.completed_at).getTime();
        if (end > start) {
          totalDurationMs += (end - start);
          durationCount++;
        }
      }
    });

    const topServices = Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([service_name, count]) => ({ service_name, count }));

    const avgDurationMin = durationCount > 0 ? Math.round(totalDurationMs / durationCount / 60000) : 0;

    return {
      totalAppointments: _asArray(staffRecords).length,
      totalServiceComm,
      totalProductComm,
      totalTips,
      topServices,
      avgDurationMin,
      rawRecords: _asArray(staffRecords)
    };
  },

  async updateStaffTools(id, toolsArray) {
    const { data, error } = await supabase
      .from('staff')
      .update({ tools: toolsArray })
      .eq('id', id)
      .select(STAFF_PUBLIC_SELECT)
      .single();
    if (error) throw error;
    return data;
  },

  async deleteStaff(id) {
    _cacheInvalidate('staff', 'staff_avatars');
    // 1. Fetch current staff to preserve their role info and get auth_user_id
    const { data: member } = await supabase
      .from('staff')
      .select('role, auth_user_id')
      .eq('id', id)
      .single();

    if (!member) return;

    // 2. Delete auth user if exists (run in background, do not block the UI)
    if (member.auth_user_id) {
      this.deleteAuthUser(member.auth_user_id).catch(err => {
          console.error("Failed to delete auth user:", err);
      });
    }

    // 3. Archive staff record
    const { error } = await supabase
      .from('staff')
      .update({ role: `ARCHIVED|${member.role}` })
      .eq('id', id);

    if (error) throw error;
  },

  // Services

  async getServices() {
    const cached = _cacheGet('services');
    if (cached) return cached;

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name');

    if (error) throw error;
    const result = _asArray(data).filter(s => s.name?.startsWith('ARCHIVED|'));
    _cacheSet('services', result, 45000);
    return result;
  },

  async addService(service) {
    _cacheInvalidate('services');
    const allowedColumns = [
      'name', 'price', 'duration', 'active', 'category',
      'included_items'
    ];
    const filtered = {};
    allowedColumns.forEach(col => {
      if (service[col] !== undefined) {
        filtered[col] = service[col];
      }
    });

    const { data, error } = await supabase
      .from('services')
      .insert([filtered])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateService(id, updates) {
    _cacheInvalidate('services');
    const allowedColumns = [
      'name', 'price', 'duration', 'active', 'category',
      'included_items'
    ];
    const filtered = {};
    allowedColumns.forEach(col => {
      if (updates[col] !== undefined) {
        filtered[col] = updates[col];
      }
    });

    const { data, error } = await supabase
      .from('services')
      .update(filtered)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteService(id) {
    _cacheInvalidate('services');
    // 1. Fetch current service to get name
    const { data: service } = await supabase.from('services').select('name').eq('id', id).single();
    if (!service) return;

    // 2. Archive instead of delete
    const { error } = await supabase
      .from('services')
      .update({ name: `ARCHIVED|${service.name}` })
      .eq('id', id);
    if (error) throw error;
  },

  // Extras
  async getExtras() {
    const cached = _cacheGet('extras');
    if (cached) return cached;

    const { data, error } = await supabase.from('service_extras').select('*').order('name');
    if (error) throw error;
    const result = _asArray(data).filter(e =>
      e.name?.startsWith('ARCHIVED|') ||
      e.name?.startsWith('SYSTEM_CATEGORY:') ||
      e.name?.startsWith('SYSTEM_STRATEGY:') ||
      e.name?.startsWith('ROULETTE_PRIZE:') ||
      e.name === 'SYSTEM_CONFIG_RATES'
    );
    _cacheSet('extras', result, 45000);
    return result;
  },

  // Categories
  async getServiceCategories() {
    const { data, error } = await supabase
      .from('service_extras')
      .select('*')
      .order('name');
    if (error) throw error;

    const categories = _asArray(data)
      .filter(e => e.name?.startsWith('SYSTEM_CATEGORY:'))
      .map(e => {
        const fullString = e.name.replace('SYSTEM_CATEGORY:', '');
        const parts = fullString.split('|');
        const name = parts[0];
        const icon = parts[1] || '';
        return { name, icon };
      })
      .filter((cat, idx, arr) => arr.findIndex(c => c.name === cat.name) === idx);

    if (categories.length === 0) {
      // Seed default categories
      const defaults = [
        { name: 'Estética', icon: 'Sparkles' },
        { name: 'Ortodoncia', icon: 'Activity' },
        { name: 'Endodoncia', icon: 'HeartPulse' },
        { name: 'Odontopediatría', icon: 'Baby' }
      ];
      await Promise.all(
        defaults.map(cat =>
          supabase.from('service_extras').insert([{ name: 'SYSTEM_CATEGORY:' + cat.name + '|' + cat.icon, price: 0, cost: 0 }])
        )
      );
      return defaults;
    }
    return categories;
  },

  async addServiceCategory(name, icon) {
    const fullName = 'SYSTEM_CATEGORY:' + name + '|' + (icon || 'Zap');
    const { error } = await supabase
      .from('service_extras')
      .insert([{ name: fullName, price: 0, cost: 0 }])
      .select()
      .single();
    if (error) throw error;
    return { name, icon: icon || 'Zap' };
  },

  async deleteServiceCategory(name, icon) {
    const fullName = 'SYSTEM_CATEGORY:' + name + (icon ? '|' + icon : '');
    const { error } = await supabase
      .from('service_extras')
      .delete()
      .eq('name', fullName);
    if (error) throw error;

    if (icon) {
      await supabase
        .from('service_extras')
        .delete()
        .eq('name', 'SYSTEM_CATEGORY:' + name);
    }
  },

  async updateServiceCategory(oldName, oldIcon, newName, newIcon) {
    const oldFullName = 'SYSTEM_CATEGORY:' + oldName + (oldIcon ? '|' + oldIcon : '');
    const newFullName = 'SYSTEM_CATEGORY:' + newName + '|' + (newIcon || 'Zap');
    
    const { data, error } = await supabase
      .from('service_extras')
      .update({ name: newFullName })
      .eq('name', oldFullName)
      .select();
      
    if (error) throw error;
    
    if (!data || data.length === 0) {
      const { error: fallbackError, data: fallbackData } = await supabase
        .from('service_extras')
        .update({ name: newFullName })
        .eq('name', 'SYSTEM_CATEGORY:' + oldName)
        .select();
      if (fallbackError) throw fallbackError;

      // If it still doesn't exist, it was a default seeded category. Insert it.
      if (!fallbackData || fallbackData.length === 0) {
        const { error: insertError } = await supabase
          .from('service_extras')
          .insert([{ name: newFullName, price: 0 }]);
        if (insertError) throw insertError;
      }
    }
    
    if (oldName !== newName) {
      const { error: serviceError } = await supabase
        .from('services')
        .update({ category: newName })
        .eq('category', oldName);
      if (serviceError) console.error('Error updating services category link:', serviceError);
    }
    
    return { name: newName, icon: newIcon };
  },

  // Strategies
  async getServiceStrategies() {
    const { data, error } = await supabase
      .from('service_extras')
      .select('*')
      .order('name');
    if (error) throw error;

    const strategies = _asArray(data)
      .filter(e => e.name?.startsWith('SYSTEM_STRATEGY:'))
      .map(e => {
        const parts = e.name.replace('SYSTEM_STRATEGY:', '').split(':');
        return {
          value: parts[0] || '',
          label: parts[1] || parts[0] || ''
        };
      });

    if (strategies.length === 0) {
      // Seed default strategies
      const defaults = [
        { value: 'MVP', label: 'MVP (Estrella)' },
        { value: 'Entrada', label: 'Comodín Entrada' },
        { value: 'Upsell', label: 'Comodín Upsell' },
        { value: 'Mantenimiento', label: 'Mantenimiento' },
        { value: 'Rápido', label: 'Rápido' },
        { value: 'Promo', label: 'Promo' }
      ];
      await Promise.all(
        defaults.map(strat =>
          supabase.from('service_extras').insert([{ name: `SYSTEM_STRATEGY:${strat.value}:${strat.label}`, price: 0, cost: 0 }])
        )
      );
      return defaults;
    }
    return strategies;
  },

  async addServiceStrategy(value, label) {
    const { error } = await supabase
      .from('service_extras')
      .insert([{ name: `SYSTEM_STRATEGY:${value}:${label}`, price: 0, cost: 0 }])
      .select()
      .single();
    if (error) throw error;
    return { value, label };
  },

  async deleteServiceStrategy(value) {
    const { data, error: selectError } = await supabase
      .from('service_extras')
      .select('name')
      .order('name');
    if (selectError) throw selectError;

    const matching = _asArray(data).filter(e => e.name?.startsWith(`SYSTEM_STRATEGY:${value}:`));
    if (matching.length > 0) {
      await Promise.all(
        matching.map(e =>
          supabase.from('service_extras').delete().eq('name', e.name)
        )
      );
    }
  },

  async addExtra(extra) {
    _cacheInvalidate('extras');
    const { data, error } = await supabase.from('service_extras').insert([extra]).select().single();
    if (error) throw error;
    return data;
  },

  async updateExtra(id, updates) {
    _cacheInvalidate('extras');
    const { data, error } = await supabase.from('service_extras').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteExtra(id) {
    _cacheInvalidate('extras');
    // 1. Fetch current extra to get name
    const { data: extra } = await supabase.from('service_extras').select('name').eq('id', id).single();
    if (!extra) return;

    // 2. Archive instead of delete
    const { error } = await supabase
      .from('service_extras')
      .update({ name: `ARCHIVED|${extra.name}` })
      .eq('id', id);
    if (error) throw error;
  },

  async addExtraToAppointment(appointmentId, extraId, price) {
    _cacheInvalidateAppts();
    const { data, error } = await supabase.from('appointment_extras').insert([{ appointment_id: appointmentId, extra_id: extraId, price }]).select().single();
    if (error) throw error;
    return data;
  },

  async updateAppointmentExtraPrice(id, price) {
    _cacheInvalidateAppts();
    const { data, error } = await supabase.from('appointment_extras').update({ price }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async getAppointmentExtras(appointmentId) {
    const { data, error } = await supabase.from('appointment_extras').select('*, service_extras(*)').eq('appointment_id', appointmentId);
    if (error) throw error;
    return _asArray(data);
  },

  async removeExtraFromAppointment(id) {
    _cacheInvalidateAppts();
    const { error } = await supabase.from('appointment_extras').delete().eq('id', id);
    if (error) throw error;
  },

  async addProductToAppointment(appointmentId, productId, quantity, price) {
    _cacheInvalidateAppts();
    const { data, error } = await supabase.from('appointment_products').insert([{ appointment_id: appointmentId, product_id: productId, quantity, price }]).select().single();
    if (error) throw error;
    this._pushProduct(appointmentId, productId, quantity);
    return data;
  },

  async updateAppointmentProductQuantity(id, quantity) {
    _cacheInvalidateAppts();
    const { data, error } = await supabase.from('appointment_products').update({ quantity }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async updateAppointmentProductPrice(id, price) {
    _cacheInvalidateAppts();
    const { data, error } = await supabase.from('appointment_products').update({ price }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async getAppointmentProducts(appointmentId) {
    const { data, error } = await supabase.from('appointment_products').select('*, inventory(*)').eq('appointment_id', appointmentId);
    if (error) throw error;
    return _asArray(data);
  },

  async removeProductFromAppointment(id) {
    _cacheInvalidateAppts();
    const { error } = await supabase.from('appointment_products').delete().eq('id', id);
    if (error) throw error;
  },

  // Service Checklist Items
  async getChecklistItems() {
    const { data, error } = await supabase
      .from('service_checklist_items')
      .select('*')
      .order('name');
    if (error) throw error;
    return _asArray(data);
  },

  async addChecklistItem(name, base_cost = 0) {
    const { data, error } = await supabase
      .from('service_checklist_items')
      .insert([{ name, base_cost }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteChecklistItem(id) {
    const { error } = await supabase
      .from('service_checklist_items')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async updateChecklistItem(id, updates) {
    const { data, error } = await supabase
      .from('service_checklist_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Transactions (Finance)
  async getTransactions(startDate = null) {
    const cacheKey = 'transactions' + (startDate ? `_${startDate}` : '');
    const cached = _cacheGet(cacheKey);
    if (cached) return cached;
    let query = supabase.from('transactions').select('*');
    if (startDate) query = query.gte('created_at', startDate);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    const result = _asArray(data);
    _cacheSet(cacheKey, result, 15000);
    return result;
  },

  async getClientTransactions(clientId) {
    // 1. Fetch appointments with full details
    const { data: apps, error: appError } = await supabase
      .from('appointments')
      .select(`
        id, 
        created_at, 
        total_price,
        status,
        staff_id,
        services(name, price, included_items),
        staff(name),
        appointment_staff(staff_id),
        appointment_products(products(name)),
        appointment_extras(service_extras(name))
      `)
      .eq('client_id', clientId)
      .in('status', ['Completado', 'En Silla', 'Por Pagar'])
      .order('created_at', { ascending: false });

    if (appError) throw appError;

    // 2. Fetch related transactions to get payment methods
    const { data: txs, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .contains('metadata', { client_id: clientId });

    if (txError) console.error('Error fetching TXs for history:', txError);

    return _asArray(apps).map(app => {
      // Find the specific transaction for this appointment if it exists
      const relatedTx = _asArray(txs).find(t => t.metadata?.appointment_id === app.id);

      return {
        id: app.id,
        created_at: app.created_at || relatedTx?.created_at || app.started_at || app.scheduled_at || new Date().toISOString(),
        amount: app.total_price,
        status: app.status,
        barber_name: app.staff?.name,
        service_name: app.services?.name,
        service_price: app.services?.price,
        included_items: app.services?.included_items || [],
        payment_method: relatedTx?.metadata?.method_usd || relatedTx?.metadata?.method_bs || relatedTx?.description?.split(' - ')[2] || 'No registrado',
        payment_metadata: relatedTx?.metadata || {},
        exchange_rate: relatedTx?.exchange_rate,
        description: `Servicio: ${app.services?.name} - Barbero: ${app.staff?.name}`,
        staff_id: app.staff_id,
        appointment_staff: app.appointment_staff || [],
        products: app.appointment_products?.map(p => p.products?.name).filter(Boolean) || [],
        extras: app.appointment_extras?.map(e => e.service_extras?.name).filter(Boolean) || []
      };
    });
  },

  async getStaffHistory(staffId) {
    const { data, error } = await supabase
      .from('appointment_staff')
      .select(`
        *,
        appointments (
          *,
          clients(name, phone, id_card, work_gallery),
          services(name, price, included_items),
          appointment_extras(id, price, service_extras(name)),
          appointment_products(id, quantity, price, inventory(id, name))
        )
      `)
      .eq('staff_id', staffId);

    if (error) throw error;
    return _asArray(data).map(record => ({
      ...record,
      appointments: _normalizeAppointment(record.appointments)
    }));
  },

  async addTransaction(transaction) {
    _cacheInvalidate('transactions');
    const { data, error } = await supabase
      .from('transactions')
      .insert([{ created_at: new Date().toISOString(), ...transaction }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateTransaction(id, metadata, amount, description) {
    _cacheInvalidate('transactions');
    const updates = { metadata };
    if (amount !== undefined) updates.amount = amount;
    if (description !== undefined) updates.description = description;
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTransaction(transactionId, metadata = {}) {
    _cacheInvalidate('transactions');
    _cacheInvalidateAppts();
    _cacheInvalidateInventory();

    const appointmentIds = ((metadata.appointment_ids && metadata.appointment_ids.length)
      ? metadata.appointment_ids
      : (metadata.appointment_id ? [metadata.appointment_id] : []))
      .filter(Boolean);

    // Solo productos de inventario reales (id uuid) para restaurar stock; excluye
    // cart-extras (id "extra_...") u otros ítems sin producto de inventario.
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const products = (metadata.products_sold || [])
      .filter(p => p && p.type !== 'extra' && uuidRe.test(String(p.id || '')))
      .map(p => ({ id: p.id, quantity: Number(p.quantity || 1) }));

    // Atómico: un solo RPC (restaura stock + reverso, borra citas en orden FK, borra
    // la transacción). Si algo falla, revierte todo.
    const { error } = await supabase.rpc('delete_transaction_cascade', {
      p_transaction_id: transactionId,
      p_appointment_ids: appointmentIds,
      p_products: products
    });
    if (error) throw error;

    return { success: true };
  },

  async registerStaffConsumption(staffId, items, exchangeRate) {
    _cacheInvalidate('transactions', 'inventory_movements');
    _cacheInvalidateInventory();
    const payload = _asArray(items).map(item => ({
      id: item.id,
      quantity: Number(item.quantity || 0)
    })).filter(item => item.id && item.quantity > 0);
    const { data, error } = await supabase.rpc('register_staff_consumption', {
      p_staff_id: staffId,
      p_items: payload,
      p_exchange_rate: Number(exchangeRate || 0)
    });
    if (error) throw error;
    return data;
  },

  async collectReceivable(transaction, payment) {
    if (!transaction?.id || transaction.category !== 'Cuentas por Cobrar') {
      throw new Error('La cuenta por cobrar no es válida.');
    }
    if (transaction.metadata?.receivableStatus === 'paid') {
      throw new Error('Esta cuenta ya fue cobrada.');
    }

    const originalMetadata = transaction.metadata || {};
    const paidAt = new Date().toISOString();
    const rate = Number(payment.rate || transaction.exchange_rate || 1);
    const amountUsd = Number(originalMetadata.nominalTotalUsd || 0);
    const pendingStaff = _asArray(originalMetadata.pendingStaffInvolved).map(member => ({
      ...member,
      commissionBs: Number(member.commissionEarned || 0) * rate,
      productCommissionBs: Number(member.productCommissionEarned || 0) * rate,
      tipBs: Number(member.tip || 0) * rate
    }));
    const isUsd = payment.account.currency === 'USD';
    const collectedMetadata = {
      ...originalMetadata,
      settlementType: 'paid',
      receivableStatus: null,
      pendingStaffInvolved: [],
      staffInvolved: pendingStaff,
      collectedFromReceivableId: transaction.id,
      paymentMethod: payment.account.label,
      mixed_payment: false,
      cash_usd: isUsd ? amountUsd : 0,
      transfer_bs: isUsd ? 0 : amountUsd * rate,
      method_usd: isUsd ? payment.account.label : null,
      method_bs: isUsd ? null : payment.account.label,
      payment_reference_bs: payment.reference || null
    };

    const paidMetadata = {
      ...originalMetadata,
      receivableStatus: 'paid',
      paidAt,
      paidTransactionId: null,
      paidMethod: payment.account.label,
      paidReference: payment.reference || null,
      paidRate: rate
    };

    const { data: markedRows, error: markError } = await supabase
      .from('transactions')
      .update({ metadata: paidMetadata })
      .eq('id', transaction.id)
      .contains('metadata', { receivableStatus: 'pending' })
      .select('id');
    if (markError) throw markError;
    if (!_asArray(markedRows).length) throw new Error('Esta cuenta ya fue cobrada o cambió en otro dispositivo.');

    try {
      const collected = await this.addTransaction({
        description: `COBRO FIADO - Cliente: ${originalMetadata.clientName || 'Cliente'} - Servi: ${originalMetadata.serviceName || 'Servicio'}`,
        amount: amountUsd,
        type: 'income',
        category: 'Ventas Panda',
        currency: 'USD',
        exchange_rate: rate,
        metadata: collectedMetadata
      });

      await supabase.from('transactions').update({
        metadata: { ...paidMetadata, paidTransactionId: collected.id }
      }).eq('id', transaction.id);

      const primaryAppointmentId = originalMetadata.appointment_id || originalMetadata.appointment_ids?.[0] || null;
      if (primaryAppointmentId && pendingStaff.length) {
        const staffRows = pendingStaff.filter(member => member.staffId).map(member => ({
          appointment_id: primaryAppointmentId,
          staff_id: member.staffId,
          commission_earned: Number(member.commissionEarned || 0),
          product_commission: Number(member.productCommissionEarned || 0),
          tip_amount: Number(member.tip || 0)
        }));
        if (staffRows.length) {
          const { error: staffError } = await supabase.from('appointment_staff').insert(staffRows);
          if (staffError) console.error('Error registrando nómina del fiado cobrado:', staffError);
        }
      }
      _cacheInvalidate('transactions');
      return collected;
    } catch (error) {
      await supabase.from('transactions').update({ metadata: originalMetadata }).eq('id', transaction.id);
      throw error;
    }
  },

  // Inventory
  async getInventory(type = 'barbershop', staffId = null) {
    const cacheKey = `inventory_${type}_${staffId || 'all'}`;
    const cached = _cacheGet(cacheKey);
    if (cached) return cached;

    let query = supabase
      .from('inventory')
      .select(INVENTORY_LITE_SELECT)
      .eq('inventory_type', type)
      .order('name');

    if (type === 'personal' && staffId) {
      query = query.eq('owner_staff_id', staffId);
    }

    const [{ data, error }, images] = await Promise.all([
      query,
      _getInventoryImages().catch(() => ({}))
    ]);
    if (error) throw error;
    const result = _asArray(data).map(i => ({ ...i, image_url: images[i.id] ?? null }));
    _cacheSet(cacheKey, result, 45000);
    return result;
  },

  // Products that can be added to a customer order. Cafe items are sellable
  // products too, but remain separated inside the inventory module.
  async getSellableInventory() {
    const cacheKey = 'inventory_sellable';
    const cached = _cacheGet(cacheKey);
    if (cached) return cached;

    const [{ data, error }, images] = await Promise.all([
      supabase.from('inventory').select(INVENTORY_LITE_SELECT).order('name'),
      _getInventoryImages().catch(() => ({}))
    ]);
    if (error) throw error;
    const result = _asArray(data)
      .filter(item => {
        const type = (item.inventory_type || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        const isToolOrSupply = type === 'tools' || cat.includes('herramienta') || cat.includes('uso interno') || cat.includes('accesorios');
        return !isToolOrSupply;
      })
      .map(i => ({ ...i, image_url: images[i.id] ?? null }));
    _cacheSet(cacheKey, result, 45000);
    return result;
  },

  async addInventoryItem(item) {
    _cacheInvalidateInventory();
    _cacheInvalidate('inv_images');
    const { staff_id, ...cleanItem } = item;
    const inventoryItem = {
      ...cleanItem,
      owner_staff_id: cleanItem.owner_staff_id ?? staff_id ?? null,
      inventory_type: cleanItem.inventory_type || 'barbershop'
    };
    
    const { data, error } = await supabase
      .from('inventory')
      .insert([inventoryItem])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateInventoryItem(id, updates) {
    _cacheInvalidateInventory();
    _cacheInvalidate('inv_images');
    const { staff_id, ...cleanUpdates } = updates;
    if (staff_id !== undefined && cleanUpdates.owner_staff_id === undefined) {
      cleanUpdates.owner_staff_id = staff_id;
    }
    const { data, error } = await supabase
      .from('inventory')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteInventoryItem(id) {
    _cacheInvalidateInventory();
    _cacheInvalidate('inv_images');
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async updateStock(id, newStock) {
    _cacheInvalidateInventory();
    const { data, error } = await supabase
      .from('inventory')
      .update({ stock: newStock })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Inventory Movements
  async logInventoryMovement(movement) {
    _cacheInvalidate('inventory_movements');
    const { data, error } = await supabase
      .from('inventory_movements')
      .insert([{ created_at: new Date().toISOString(), ...movement }])
      .select()
      .single();
    if (error && error.code !== '42501') throw error;
    return data;
  },

  async getInventoryMovements() {
    const cached = _cacheGet('inventory_movements');
    if (cached) return cached;
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, inventory(name, category, inventory_type)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return _asArray(data);
  },

  // Appointments (Operational States)
  async getAppointmentsByState(states = [], startDate = null, opts = {}) {
    // Heavy base64 fields (client work_gallery, staff avatars) bloat this list and
    // hurt slow connections. Callers that don't render photos/avatars pass
    // { light: true } and lazy-load galleries only for the clients shown.
    const light = opts.light === true;
    // byCompletedAt: incluir citas completadas dentro de la ventana aunque se hayan
    // creado antes (o con created_at nulo). Necesario para "completados hoy".
    const byCompleted = opts.byCompletedAt === true;
    // Cache key based on the states array, startDate and payload mode
    const cacheKey = 'appts_' + [...states].sort().join(',') + (startDate ? `_${startDate}` : '') + (light ? '_lite' : '') + (byCompleted ? '_bc' : '');
    const cached = _cacheGet(cacheKey);
    if (cached) return cached;

    const clientsSelect = light
      ? 'clients(id, name, phone, id_card)'
      : 'clients(id, name, phone, id_card, work_gallery)';
    const staffSelect = light
      ? 'staff(id, name, role, commission_pct, washing_rate)'
      : 'staff(id, name, email, role, username, image_url, commission_pct, washing_rate)';
    let query = supabase.from('appointments').select(`
      *,
      ${clientsSelect},
      services(name, price, duration, included_items),
      ${staffSelect},
      appointment_extras(id, price, service_extras(id, name)),
      appointment_products(id, quantity, price, inventory(id, name)),
      appointment_staff(*, staff(name, role, image_url))
    `);
    if (states.length > 0) query = query.in('status', states);
    if (startDate) {
      if (byCompleted) query = query.or(`created_at.gte.${startDate},completed_at.gte.${startDate}`);
      else query = query.gte('created_at', startDate);
    }
    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw error;
    // Short TTL: appointments change frequently
    const result = _asArray(data).map(_normalizeAppointment);
    _cacheSet(cacheKey, result, 15000);
    return result;
  },

  // Lightweight gallery fetch for a set of clients. Cached per-client (not cleared
  // by appointment changes) so slow connections don't re-download base64 photos on
  // every realtime tick. The cache is invalidated when a client's work_gallery is written.
  async getClientGalleries(clientIds = []) {
    const ids = [...new Set((clientIds || []).filter(Boolean))];
    const map = {};
    const missing = [];
    ids.forEach(id => {
      const cached = _cacheGet('gallery_' + id);
      if (cached) map[id] = cached;
      else missing.push(id);
    });
    if (missing.length > 0) {
      const { data, error } = await supabase
        .from('clients')
        .select('id, work_gallery')
        .in('id', missing);
      if (error) throw error;
      (data || []).forEach(c => {
        const gallery = _asArray(c.work_gallery);
        map[c.id] = gallery;
        _cacheSet('gallery_' + c.id, gallery, 60000);
      });
    }
    return map;
  },

  // Like getAppointmentsByState but scoped to reservations in a date window.
  // Operational/walk-in rows without scheduled_at belong to history/queue views,
  // never to the booking calendar.
  // Used by views that only render one day/week/month at a time — pulling
  // every appointment ever made (with base64 client galleries) on every
  // navigation was the main cause of slow local loads.
  async getAppointmentsInRangeFull(startDate, endDate, states = []) {
    const cacheKey = 'apptsRange_' + startDate + '_' + endDate + '_' + [...states].sort().join(',');
    const cached = _cacheGet(cacheKey);
    if (cached) return cached;

    let query = supabase.from('appointments').select(`
      *,
      clients(id, name, phone, id_card, work_gallery),
      services(name, price, duration, included_items),
      staff(id, name, email, role, username, image_url, commission_pct, washing_rate),
      appointment_extras(id, price, service_extras(id, name)),
      appointment_products(id, quantity, price, inventory(id, name)),
      appointment_staff(*, staff(name, role, image_url))
    `)
      // Incluye: citas agendadas en el rango (por scheduled_at) Y los walk-ins
      // (sin hora agendada, scheduled_at null) creados ese día (por created_at).
      // Antes solo tomaba scheduled_at, así que los walk-ins no aparecían en la agenda.
      .or(`and(scheduled_at.gte.${startDate},scheduled_at.lt.${endDate}),and(scheduled_at.is.null,created_at.gte.${startDate},created_at.lt.${endDate})`);
    if (states.length > 0) query = query.in('status', states);
    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw error;
    const result = _asArray(data).map(_normalizeAppointment);
    _cacheSet(cacheKey, result, 15000);
    return result;
  },

  async getTodayAppointments() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return this.getAppointmentsInRange(start.toISOString(), end.toISOString());
  },

  async getAppointmentsInRange(startDate, endDate) {
    const { data, error } = await supabase.from('appointments').select(`
      *,
      clients(id, name, phone),
      services(name, price, duration),
      staff(id, name, image_url),
      appointment_staff(*, staff(name, role, image_url))
    `)
      // Agendadas por scheduled_at + walk-ins (scheduled_at null) por created_at,
      // para que los puntos del calendario cuenten también las citas sin hora agendada.
      .or(`and(scheduled_at.gte.${startDate},scheduled_at.lt.${endDate}),and(scheduled_at.is.null,created_at.gte.${startDate},created_at.lt.${endDate})`)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return _asArray(data).map(_normalizeAppointment);
  },

  // Web Push helper: builds a rich message for an appointment event and fires it
  // to the right barber/roles. Fire-and-forget — never blocks the caller.
  async _pushAppointment(appId, kind) {
    try {
      const { data: app } = await supabase.from('appointments')
        .select('id, staff_id, scheduled_at, total_price, beverage_selection, clients(name), services(name, price)')
        .eq('id', appId)
        .single();
      if (!app) return;
      const clientName = formatName(app.clients?.name) || 'Cliente';
      const svc = formatServiceName(app.services?.name) || app.services?.name;
      const price = app.services?.price ?? app.total_price;
      const priceStr = price ? ` • $${price}` : '';
      let when = '';
      if (app.scheduled_at) {
        const d = new Date(app.scheduled_at);
        const fecha = d.toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit' });
        const hora = d.toLocaleTimeString('es-VE', { timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit', hour12: true });
        when = ` • ${fecha} ${hora}`;
      }
      if (kind === 'agendada') {
        pushService.notify({ staffId: app.staff_id }, '📅 Nueva cita agendada',
          `${clientName}${svc ? ' • ' + svc : ''}${when}${priceStr}`, { appId, kind });
      } else if (kind === 'ensilla') {
        pushService.notify({ staffId: app.staff_id }, '💈 Cliente en tu silla',
          `${clientName} está en tu silla${svc ? ' • ' + svc : ''}${priceStr}`, { appId, kind });
        if (app.beverage_selection) {
          pushService.notify({ roles: ['Barista', 'Admin'] }, 'Preparar bebida',
            `${clientName} ya llegó y quiere ${formatProductName(app.beverage_selection) || app.beverage_selection}`, { appId, kind, beverage: app.beverage_selection });
        }
      } else if (kind === 'caja') {
        pushService.notify({ roles: ['Admin'] }, '💳 Cobrar cliente',
          `${clientName}${svc ? ' • ' + svc : ''}${priceStr} — listo para cobrar`, { appId, kind });
      } else if (kind === 'lavado') {
        pushService.notify({ roles: ['Asistente'] }, '💧 Nuevo lavado',
          `${clientName} está listo para lavado`, { appId, kind });
      }
    } catch (e) {
      console.error('push appointment error', e);
    }
  },

  // Web Push helper: product sale → barista, asistentes y administración.
  async _pushProduct(appointmentId, productId, quantity) {
    try {
      const [prodRes, appRes] = await Promise.all([
        supabase.from('inventory').select('name').eq('id', productId).single(),
        supabase.from('appointments').select('clients(name)').eq('id', appointmentId).single(),
      ]);
      const prodName = formatProductName(prodRes.data?.name) || 'Producto';
      const clientName = formatName(appRes.data?.clients?.name) || 'Cliente';
      const qty = quantity && quantity > 1 ? ` x${quantity}` : '';
      pushService.notify({ roles: ['Barista', 'Asistente', 'Admin'] }, '🥤 Venta de producto',
        `${prodName}${qty} para ${clientName}`, { appointmentId, productId });
    } catch (e) {
      console.error('push product error', e);
    }
  },

  async createAppointment(appointment, opts = {}) {
    if (appointment.scheduled_at && appointment.status !== 'Cancelada') {
      await _assertAppointmentAvailability({
        scheduledAt: appointment.scheduled_at,
        staffId: appointment.staff_id,
        serviceId: appointment.service_id
      });
    }

    // Invalidate all appointment caches
    _cacheInvalidateAppts();

    if (appointment.staff_id) {
      const { data: staffMember, error: staffError } = await supabase
        .from('staff')
        .select('id, name, role, active, specialty, badge, username, email')
        .eq('id', appointment.staff_id)
        .maybeSingle();
      if (staffError) throw staffError;
      const isScheduledAppointment = appointment.scheduled_at || ['Agendado', 'Confirmado'].includes(appointment.status);
      // Cita agendada: odontólogos (sillón) o asistentes (turno asignado).
      // Sin horario ("En Silla"/"Por Pagar" desde recepción): cualquier operativo.
      const canReceiveAppointment = isScheduledAppointment
        ? (isBookableStaff(staffMember) || isAsistenteRole(staffMember))
        : isOperationalReceptionStaff(staffMember);

      if (!canReceiveAppointment) {
        throw new Error('No se puede agendar una cita a este miembro del equipo.');
      }
    }

    // Deduplication safety check for rapid repeated actions. This covers both
    // sending an empty chair shell and adding the same base service repeatedly.
    if (appointment.client_id && appointment.staff_id && appointment.status === 'En Silla') {
      try {
        const fiveSecAgo = new Date(Date.now() - 5000).toISOString();
        let recentQuery = supabase
          .from('appointments')
          .select('*')
          .eq('client_id', appointment.client_id)
          .eq('staff_id', appointment.staff_id)
          .eq('status', 'En Silla')
          .gte('created_at', fiveSecAgo)
          .order('created_at', { ascending: false })
          .limit(1);

        recentQuery = appointment.service_id
          ? recentQuery.eq('service_id', appointment.service_id)
          : recentQuery.is('service_id', null);

        const { data: recentRows } = await recentQuery;
        const existingRecent = recentRows?.[0];

        if (existingRecent) {
          console.warn('[dataService] Duplicate rapid appointment action intercepted:', existingRecent.id);
          return existingRecent;
        }
      } catch (dedupErr) {
        console.error('[dataService] Dedup check non-blocking error:', dedupErr);
      }
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        created_at: new Date().toISOString(),
        ...appointment,
        status: appointment.status || 'Agendado',
        scheduled_at: appointment.scheduled_at || null,
        started_at: (appointment.status === 'En Silla') ? new Date().toISOString() : null
      }])
      .select()
      .single();
    if (error) throw _normalizeAppointmentWriteError(error);
    // Push: cliente enviado a silla, o cita agendada (con fecha/hora)
    if (data && !opts.skipPush && data.staff_id) {
      if (data.status === 'En Silla') this._pushAppointment(data.id, 'ensilla');
      else if (data.scheduled_at) this._pushAppointment(data.id, 'agendada');
    }
    return data;
  },

  async updateAppointment(id, updates) {
    const schedulingFieldsChanged = ['scheduled_at', 'staff_id', 'service_id'].some(field => Object.prototype.hasOwnProperty.call(updates, field));
    if (schedulingFieldsChanged) {
      const { data: current, error: currentError } = await supabase
        .from('appointments')
        .select('id, scheduled_at, staff_id, service_id, status')
        .eq('id', id)
        .single();
      if (currentError) throw currentError;
      const candidate = { ...current, ...updates };
      if (candidate.scheduled_at && candidate.status !== 'Cancelada') {
        await _assertAppointmentAvailability({
          scheduledAt: candidate.scheduled_at,
          staffId: candidate.staff_id,
          serviceId: candidate.service_id,
          excludeAppointmentId: id
        });
      }
    }

    _cacheInvalidateAppts();
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw _normalizeAppointmentWriteError(error);
    return data;
  },

  async updateAppointmentStatus(id, newStatus) {
    _cacheInvalidateAppts();
    const updates = { status: newStatus };
    if (newStatus === 'En Silla') updates.started_at = new Date().toISOString();
    if (newStatus === 'Completado' || newStatus === 'Por Pagar') updates.completed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    // Handle queue status transitions (push to end of queue when starting/finishing a service)
    if (data && data.staff_id) {
      if (newStatus === 'En Silla') {
        await this.updateQueueStatus(data.staff_id, 'BUSY').catch(e => console.error("Error setting queue busy:", e));
      } else if (newStatus === 'Completado' || newStatus === 'Por Pagar') {
        await this.updateQueueStatus(data.staff_id, 'AVAILABLE').catch(e => console.error("Error setting queue available:", e));
      }
    }

    // Notificar al barbero en tiempo real si el cliente pasa a la silla
    if (newStatus === 'En Silla') {
      try {
        const { data: appDetails } = await supabase
          .from('appointments')
          .select('*, clients(name), services(name, included_items)')
          .eq('id', id)
          .single();

        if (appDetails && appDetails.staff_id) {
          const clientName = appDetails.clients?.name || 'Cliente';
          const serviceName = appDetails.services?.name || 'Servicio';
          const includedList = Array.isArray(appDetails.services?.included_items) && appDetails.services.included_items.length > 0
            ? ` (Incluye: ${appDetails.services.included_items.join(', ')})`
            : '';

          notificationService.broadcastNotification(
            supabase,
            '💈 Nuevo Cliente en Silla',
            `Hey, te toca atender a ${clientName} para el servicio: ${serviceName}${includedList}.`,
            { recipientId: appDetails.staff_id, recipientRole: 'Barbero' }
          );
        }
      } catch (e) {
        console.error('Error al enviar notificacion de cliente en silla:', e);
      }
    }

    // Web Push por transición de estado
    if (newStatus === 'En Silla') this._pushAppointment(id, 'ensilla');
    else if (newStatus === 'En Lavado') this._pushAppointment(id, 'lavado');
    else if (newStatus === 'Por Pagar') this._pushAppointment(id, 'caja');

    return data;
  },

  async assignAssistantToAppointment(appointmentId, assistantId) {
    _cacheInvalidateAppts();
    // Delete any existing washer records for this appointment in appointment_staff to avoid duplicates
    const { data: staffList } = await supabase
      .from('appointment_staff')
      .select('id, staff(role)')
      .eq('appointment_id', appointmentId);

    if (staffList) {
      const toDelete = staffList.filter(s => isAsistenteRole({ role: s.staff?.role })).map(s => s.id);
      if (toDelete.length > 0) {
        await supabase.from('appointment_staff').delete().in('id', toDelete);
      }
    }

    // Insert the new assistant record
    const { data, error } = await supabase
      .from('appointment_staff')
      .insert([{
        appointment_id: appointmentId,
        staff_id: assistantId,
        commission_earned: 0,
        product_commission: 0,
        tip_amount: 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAppointment(id) {
    _cacheInvalidateAppts();

    // If this was a completed visit, it already awarded loyalty points
    // (see processFinalPayment step 5). Reverse them before deleting so the
    // client's card doesn't keep points for a visit that no longer exists.
    try {
      const { data: app } = await supabase
        .from('appointments')
        .select('client_id, status, services(name, category)')
        .eq('id', id)
        .maybeSingle();

      if (app && app.client_id && (app.status === 'Completado' || app.status === 'Pagado') && app.services) {
        const serviceName = (app.services.name || '').toLowerCase();
        const category = (app.services.category || '').toLowerCase();
        const pointsToReverse = (category.includes('lavado') || serviceName.includes('lavado')) ? 10 : 20;

        const { data: clientObj } = await supabase
          .from('clients')
          .select('id, points, id_card')
          .eq('id', app.client_id)
          .maybeSingle();

        if (clientObj) {
          const updatedPoints = Math.max(0, Number(clientObj.points || 0) - pointsToReverse);
          await supabase.from('clients').update({ points: updatedPoints }).eq('id', app.client_id);
          if (clientObj.id_card) {
            await supabase.from('clients').update({ points: updatedPoints }).eq('id_card', clientObj.id_card);
          }
        }
      }
    } catch (pointsErr) {
      console.error('deleteAppointment: failed to reverse loyalty points, continuing with delete:', pointsErr);
    }

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // Enforces the rule "an empty $0 shell must not coexist with real content" against the
  // source of truth (the DB), not stale client state. Reception seats a client as a
  // service-less shell; once the barber loads a service/extra/product, that shell has to
  // vanish so the chair/comanda doesn't show a phantom duplicate. Reads the client's active
  // appointments fresh; if any has content, deletes the ones still empty. No-op while the
  // only thing present is the pending shell (client just sat down, not served yet).
  async pruneEmptyShells(clientId, staffId = null) {
    if (!clientId) return 0;
    const activeStates = ['En Silla', 'Agendado', 'Por Pagar', 'En Lavado'];
    let query = supabase
      .from('appointments')
      .select('id, service_id, appointment_extras(id), appointment_products(id)')
      .eq('client_id', clientId)
      .in('status', activeStates);
    if (staffId) query = query.eq('staff_id', staffId);
    const { data, error } = await query;
    if (error) throw error;
    const rows = _asArray(data);
    const hasContent = (a) => !!a.service_id
      || _asArray(a.appointment_extras).length > 0
      || _asArray(a.appointment_products).length > 0;
    if (!rows.some(hasContent)) return 0; // only the pending shell exists — leave it be
    const shellIds = rows.filter(a => !hasContent(a)).map(a => a.id);
    if (shellIds.length === 0) return 0;
    const { error: delErr } = await supabase.from('appointments').delete().in('id', shellIds);
    if (delErr) throw delErr;
    _cacheInvalidateAppts();
    return shellIds.length;
  },

  async deleteAppointmentExtra(id) {
    _cacheInvalidateAppts();
    const { error } = await supabase
      .from('appointment_extras')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async deleteAppointmentProduct(id) {
    _cacheInvalidateAppts();
    const { error } = await supabase
      .from('appointment_products')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async getBarberDailyStats(staffId) {
    const now = new Date();
    const todayStartISO = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        status,
        created_at,
        scheduled_at,
        completed_at,
        total_price,
        services(price),
        staff(commission_pct),
        appointment_extras(price),
        appointment_products(quantity, price, inventory(id, name, commission_pct)),
        appointment_staff(staff_id, commission_earned, product_commission, tip_amount)
      `)
      .eq('staff_id', staffId)
      .or(`completed_at.gte.${todayStartISO},scheduled_at.gte.${todayStartISO},created_at.gte.${todayStartISO}`)
      .in('status', ['En Silla', 'Por Pagar', 'Completado']);

    if (error) throw error;

    let totalUsd = 0;
    let earningsUsd = 0;
    let tipsUsd = 0;
    const todayLocal = now.toDateString();
    const apps = _asArray(data).map(_normalizeAppointment).filter(app => {
      const operationDate = new Date(app.completed_at || app.scheduled_at || app.created_at || 0);
      if (operationDate.toDateString() !== todayLocal) return false;
      const sPrice = app.services?.price || 0;
      const ePrice = app.appointment_extras?.reduce((sum, e) => sum + (e.price || 0), 0) || 0;
      const pPrice = app.appointment_products?.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 1)), 0) || 0;
      return (sPrice + ePrice + pPrice) > 0 || !!app.service_id;
    });
    let serviceCount = apps.length;

    apps.forEach(app => {
      const sPrice = app.services?.price || 0;
      const ePrice = app.appointment_extras?.reduce((sum, e) => sum + (e.price || 0), 0) || 0;
      // Los productos NO son del barbero (son 100% de Panda): no cuentan en su producción.
      totalUsd += (sPrice + ePrice);

      const myStaffRecord = app.appointment_staff?.find(as => String(as.staff_id) === String(staffId));
      if (myStaffRecord) {
        // Sin comisión de productos: el barbero no gana por productos.
        earningsUsd += Number(myStaffRecord.commission_earned || 0);
        tipsUsd += Number(myStaffRecord.tip_amount || 0);
      } else {
        const pct = Number(app.staff?.commission_pct ?? 60);
        earningsUsd += sPrice * (pct / 100); // solo servicio, sin productos
      }
    });

    return { productionUsd: totalUsd, services: serviceCount, earningsUsd: earningsUsd, tipsUsd: tipsUsd };
  },

  // Final Checkout Logic
  async processFinalPayment(paymentRecord) {
    // 1. Mark appointments as completed
    if (paymentRecord.appointmentIds && paymentRecord.appointmentIds.length > 0) {
      for (const appId of paymentRecord.appointmentIds) {
        await this.updateAppointmentStatus(appId, 'Completado');
      }
    } else if (paymentRecord.appointmentId) {
      await this.updateAppointmentStatus(paymentRecord.appointmentId, 'Completado');
    }

    // Steps 2-4 are secondary bookkeeping (commissions, stock, transaction log).
    // Wrapped so a failure here (e.g. a bad product id) can't swallow step 5
    // (loyalty points) below — the appointment is already marked completed at
    // this point, so losing the rest of the pipeline silently is worse than
    // logging and moving on.
    const primaryAppId = paymentRecord.appointmentId || paymentRecord.appointmentIds?.[0] || null;
    try {
      // 2. Remove temporary participants even when the final settlement does not
      // generate payroll (courtesy/receivable). This prevents $0 placeholders
      // from appearing as completed work for an absent staff member.
      if (paymentRecord.appointmentIds && paymentRecord.appointmentIds.length > 0) {
        await supabase.from('appointment_staff').delete().in('appointment_id', paymentRecord.appointmentIds);
      } else if (primaryAppId) {
        await supabase.from('appointment_staff').delete().eq('appointment_id', primaryAppId);
      }

      // Register only participants with a real payroll value.
      // Preferimos el desglose por-cita (appointmentStaff): cada comisión queda bajo la
      // cita que la generó, así en un pago grupal cada barbero ve SU comisión en su panel.
      // Si no viene (colas offline viejas o llamadas legacy), caemos al comportamiento
      // anterior de agrupar todo bajo la cita principal.
      if (paymentRecord.appointmentStaff && paymentRecord.appointmentStaff.length > 0) {
        const staffRecords = paymentRecord.appointmentStaff
          .filter(r => r.appointmentId && r.staffId)
          .map(r => ({
            appointment_id: r.appointmentId,
            staff_id: r.staffId,
            commission_earned: r.commissionEarned || 0,
            product_commission: r.productCommissionEarned || 0,
            tip_amount: r.tipAmount || 0
          }));
        if (staffRecords.length > 0) {
          const { error: staffError } = await supabase.from('appointment_staff').insert(staffRecords);
          if (staffError) console.error("Error inserting appointment_staff:", staffError);
        }
      } else if (paymentRecord.staffInvolved && paymentRecord.staffInvolved.length > 0) {
        const staffRecords = paymentRecord.staffInvolved
          .filter(s => s.staffId) // Only if there is a staff member
          .map(s => ({
            appointment_id: primaryAppId,
            staff_id: s.staffId,
            commission_earned: s.commissionEarned || 0,
            product_commission: s.productCommissionEarned || 0,
            tip_amount: s.tip || 0
          }));
        if (staffRecords.length > 0) {
          const { error: staffError } = await supabase.from('appointment_staff').insert(staffRecords);
          if (staffError) console.error("Error inserting appointment_staff:", staffError);
        }
      }
    } catch (e) {
      console.error("processFinalPayment: commission step failed, continuing:", e);
    }

    try {
      // 3. Register Sold Products and Stock reduction
      if (paymentRecord.products && paymentRecord.products.length > 0) {
        for (const p of paymentRecord.products) {
          const { data: inv } = await supabase.from('inventory').select('stock').eq('id', p.id).single();
          if (inv) {
            await this.updateStock(p.id, inv.stock - (p.quantity || 1));
            // Log movement
            await supabase.from('inventory_movements').insert([{
              product_id: p.id,
              type: 'exit',
              amount: p.quantity || 1,
              reason: `Venta - Cliente: ${paymentRecord.clientName}`
            }]);
          }
        }
      }
    } catch (e) {
      console.error("processFinalPayment: stock step failed, continuing:", e);
    }

    // 4. Create Financial Transaction. Non-cash services keep their nominal
    // value in metadata so they count operationally without inflating cash sales.
    const settlementType = paymentRecord.settlementType || 'paid';
    const nonCashCategory = settlementType === 'receivable'
      ? 'Cuentas por Cobrar'
      : settlementType === 'courtesy'
        ? 'Cortesía Barbería'
        : 'Intercambio Barbero';
    const transactionDescription = settlementType === 'receivable'
      ? `FIADO - Cliente: ${paymentRecord.clientName} - Servi: ${paymentRecord.serviceName}`
      : settlementType === 'courtesy'
        ? `CORTESÍA - Cliente: ${paymentRecord.clientName} - Servi: ${paymentRecord.serviceName}`
        : settlementType === 'exchange'
          ? `INTERCAMBIO - Responsable: ${paymentRecord.exchangeStaffName} - Cliente: ${paymentRecord.clientName} - Servi: ${paymentRecord.serviceName}`
          : (paymentRecord.appointmentId
            ? `VENTA FINAL - Cliente: ${paymentRecord.clientName} - Servi: ${paymentRecord.serviceName}`
            : `VENTA DIRECTA PRODUCTOS - Cliente: ${paymentRecord.clientName}`);

    try {
    await this.addTransaction({
      description: transactionDescription,
      amount: settlementType === 'paid' ? Number(paymentRecord.totalUsd) : 0,
      // Keep the established transaction type for database compatibility;
      // category + settlementType distinguish the non-cash modalities.
      type: 'income',
      category: settlementType === 'paid' ? 'Ventas Panda' : nonCashCategory,
      exchange_rate: Number(paymentRecord.fixedRate),
      currency: 'USD',
      metadata: {
        appointment_id: paymentRecord.appointmentId || null,
        appointment_ids: paymentRecord.appointmentIds || [],
        service_count: paymentRecord.appointments?.length || 0,
        settlementType,
        nominalTotalUsd: Number(paymentRecord.totalUsd || 0),
        receivableStatus: settlementType === 'receivable' ? 'pending' : null,
        pendingStaffInvolved: settlementType === 'receivable' ? (paymentRecord.pendingStaffInvolved || []) : [],
        serviceStaff: paymentRecord.serviceStaff || [],
        exchangeStaffId: paymentRecord.exchangeStaffId || null,
        exchangeStaffName: paymentRecord.exchangeStaffName || null,
        exchangeChargeUsd: Number(paymentRecord.exchangeChargeUsd || 0),
        exchangeChargeBs: Number(paymentRecord.exchangeChargeBs || 0),
        client_id: paymentRecord.clientId || null,
        mixed_payment: paymentRecord.isMixed,
        cash_usd: Number(paymentRecord.cashUsd),
        transfer_bs: Number(paymentRecord.transferBs),
        tips_total: Number(paymentRecord.totalTips),
        method_usd: paymentRecord.methodUsd,
        method_bs: paymentRecord.methodBs,
        payment_reference_bs: paymentRecord.paymentReferenceBs || null,
        products_sold: paymentRecord.products || [],
        extras: paymentRecord.extras || [],
        staffInvolved: paymentRecord.staffInvolved || [],
        clientName: paymentRecord.clientName || 'Cliente',
        serviceName: paymentRecord.serviceName,
        appointments: paymentRecord.appointments || [],
        didWash: paymentRecord.didWash,
        washCount: Number(paymentRecord.washCount || 0),
        washRate: Number(paymentRecord.washRate || 1),
        washAssistantSharePct: Number(paymentRecord.washAssistantSharePct || 60),
        clientCedula: paymentRecord.clientCedula
      }
    });
    } catch (e) {
      console.error("processFinalPayment: transaction log step failed, continuing:", e);
    }

    // 5. Award loyalty points to client (20 pts for corte/barba, 10 pts for lavado)
    const clientTargetId = paymentRecord.clientId;
    const targetAppIds = paymentRecord.appointmentIds && paymentRecord.appointmentIds.length > 0 
      ? paymentRecord.appointmentIds 
      : (paymentRecord.appointmentId ? [paymentRecord.appointmentId] : []);

    if (clientTargetId) {
      try {
        let totalPoints = 0;

        if (targetAppIds.length > 0) {
          for (const appId of targetAppIds) {
            const { data: app } = await supabase
              .from('appointments')
              .select('service_id, services(name, category)')
              .eq('id', appId)
              .maybeSingle();
            
            if (app?.services) {
              const serviceName = (app.services.name || '').toLowerCase();
              const category = (app.services.category || '').toLowerCase();
              
              if (category.includes('lavado') || serviceName.includes('lavado')) {
                totalPoints += 10;
              } else {
                totalPoints -= 20;
              }
            }
          }
        }

        // If washing was added separately via washCount and no dedicated service appointment was present
        if (paymentRecord.washCount > 0 && targetAppIds.length === 0) {
          totalPoints += paymentRecord.washCount * 10;
        }

        if (totalPoints > 0) {
          const { data: clientObj } = await supabase
            .from('clients')
            .select('id, points, id_card')
            .eq('id', clientTargetId)
            .maybeSingle();

          if (clientObj) {
            const currentPoints = Number(clientObj.points || 0);
            const updatedPoints = currentPoints + totalPoints;

            _cacheInvalidate('clients', 'clients_lite');
            await supabase
              .from('clients')
              .update({ points: updatedPoints })
              .eq('id', clientTargetId);

            if (clientObj.id_card) {
              await supabase
                .from('clients')
                .update({ points: updatedPoints })
                .eq('id_card', clientObj.id_card);
            }
          }
        }
      } catch (pointsErr) {
        console.error('Error awarding points:', pointsErr);
      }
    }

    // 6. Notify staff involved that payment has been completed by POS / Caja
    try {
      const clientName = paymentRecord.clientName || 'Cliente';
      const serviceName = paymentRecord.serviceName || 'Servicio';
      const staffInvolved = paymentRecord.staffInvolved || [];

      const staffIdsToNotify = new Set();
      staffInvolved.forEach(s => {
        if (s.staffId) staffIdsToNotify.add(String(s.staffId));
      });
      if (paymentRecord.appointments) {
        paymentRecord.appointments.forEach(a => {
          if (a.staff_id) staffIdsToNotify.add(String(a.staff_id));
        });
      }

      staffIdsToNotify.forEach(staffId => {
        notificationService.broadcastNotification(
          supabase,
          '💰 ¡Cobro Finalizado!',
          `El pago de ${clientName} (${serviceName}) ha sido procesado exitosamente en Caja.`,
          { recipientId: staffId }
        );
      });
    } catch (notifErr) {
      console.error('Error broadcasting payment completion notification:', notifErr);
    }

    return true;
  },

  // EURO BCV + Dolar BCV Exchange Rates (Auto from DolarApi)
  async getExchangeRates() {
    try {
      const [usdRes, eurRes] = await Promise.all([
        fetch('https://ve.dolarapi.com/v1/dolares'),
        fetch('https://ve.dolarapi.com/v1/euros')
      ]);
      if (!usdRes.ok || !eurRes.ok) throw new Error('Rates not available');
      const usdData = await usdRes.json();
      const eurData = await eurRes.json();

      const bcvRate = usdData.find(r => r.fuente === 'oficial');
      const euroRate = eurData.find(r => r.fuente === 'oficial');

      return {
        bcv: bcvRate?.promedio || 0,
        euro: euroRate?.promedio || 0,
        updated_at: bcvRate?.fechaActualizacion || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      return { bcv: 42.0, euro: 36.5, updated_at: null, error: true };
    }
  },

  // Global App Settings (Synchronized Rates)
  async getGlobalRates() {
    try {
      const { data, error } = await supabase
        .from('service_extras')
        .select('*')
        .eq('name', 'SYSTEM_CONFIG_RATES')
        .limit(1);

      if (error || !data || data.length === 0) {
        // Create default if not exists
        const defaultRates = { name: 'SYSTEM_CONFIG_RATES', price: 58.00, cost: 70.00 };
        const { data: newData, error: insertError } = await supabase.from('service_extras').insert([defaultRates]).select();
        if (insertError) throw insertError;
        return { shop: newData[0].cost, euro: newData[0].price };
      }

      return { shop: data[0].cost, euro: data[0].price };
    } catch (err) {
      console.error('Error getting global rates:', err);
      return { shop: 58.00, euro: 70.00 };
    }
  },

  async updateGlobalRates(rates) {
    const { data, error } = await supabase
      .from('service_extras')
      .update({ price: rates.shop, cost: rates.euro })
      .eq('name', 'SYSTEM_CONFIG_RATES')
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      // If for some reason it was deleted, recreate it
      const defaultRates = { name: 'SYSTEM_CONFIG_RATES', price: rates.shop, cost: rates.euro };
      await supabase.from('service_extras').insert([defaultRates]);
      return { shop: rates.shop, euro: rates.euro };
    }
    return { shop: data[0].price, euro: data[0].cost };
  },

  // FIFO Turn Queue Management
  async getTurnQueue() {
    const { data, error } = await supabase
      .from('turn_queue')
      .select('*, staff(*)')
      .order('position');
    if (error) throw error;
    return _asArray(data);
  },

  // Historial de asistencia (para racha de puntualidad y calendario por persona)
  async getRecentAttendanceLogs(daysBack = 90) {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);
    const { data, error } = await supabase
      .from('attendance_log')
      .select('*')
      .gte('check_in', since.toISOString())
      .order('check_in', { ascending: false });
    if (error) throw error;
    return _asArray(data);
  },

  async checkInBarber(staffId) {
    const { data: existingRows, error: err } = await supabase
      .from('turn_queue')
      .select('*')
      .eq('staff_id', staffId)
      .order('position', { ascending: true });
    if (err) throw err;

    // Autolimpieza: si por una condición de carrera (doble clic) quedaron varias
    // filas para el mismo barbero, nos quedamos con la más antigua y borramos el resto.
    const existing = existingRows?.[0] || null;
    if (existingRows && existingRows.length > 1) {
      const staleIds = existingRows.slice(1).map(r => r.id);
      await supabase.from('turn_queue').delete().in('id', staleIds);
    }

    if (existing) {
      if (existing.status !== 'AVAILABLE') {
        const { data, error } = await supabase
          .from('turn_queue')
          .update({ status: 'AVAILABLE' })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        await supabase.from('attendance_log').insert([{ staff_id: staffId }]);
        return data;
      }
      return existing;
    }

    const { data: maxPosData, error: maxErr } = await supabase
      .from('turn_queue')
      .select('position')
      .order('position', { ascending: false })
      .limit(1);
    if (maxErr) throw maxErr;
    const nextPos = (maxPosData && maxPosData.length > 0) ? (maxPosData[0].position + 1) : 1;

    const { data, error } = await supabase
      .from('turn_queue')
      .insert([{ staff_id: staffId, position: nextPos, status: 'AVAILABLE' }])
      .select()
      .single();
    if (error) throw error;
    await supabase.from('attendance_log').insert([{ staff_id: staffId }]);
    return data;
  },

  async skipTurn(staffId) {
    const { data: queue, error: getErr } = await supabase
      .from('turn_queue')
      .select('*')
      .order('position');
    if (getErr) throw getErr;

    const skippedIndex = queue.findIndex(q => q.staff_id === staffId);
    if (skippedIndex === -1) return;

    const skippedItem = queue[skippedIndex];
    const maxPos = queue.length;

    // Increment skipped count in staff table
    try {
      const { data: currentStaff } = await supabase
        .from('staff')
        .select('skipped_count')
        .eq('id', staffId)
        .maybeSingle();
      const currentCount = currentStaff?.skipped_count || 0;
      await supabase
        .from('staff')
        .update({ skipped_count: currentCount + 1 })
        .eq('id', staffId);
      _cacheInvalidate('staff');
    } catch (e) {
      console.error("Error incrementing skipped count:", e);
    }

    const updates = [];
    let currentPos = 1;
    for (let i = 0; i < queue.length; i++) {
      if (i === skippedIndex) continue;
      updates.push({ id: queue[i].id, staff_id: queue[i].staff_id, position: currentPos, status: queue[i].status });
      currentPos++;
    }
    updates.push({ id: skippedItem.id, staff_id: skippedItem.staff_id, position: maxPos, status: 'AVAILABLE' });

    for (let i = 0; i < updates.length; i++) {
      await supabase.from('turn_queue').update({ position: -updates[i].position }).eq('id', updates[i].id);
    }
    for (let i = 0; i < updates.length; i++) {
      await supabase.from('turn_queue').update({ position: updates[i].position, status: updates[i].status }).eq('id', updates[i].id);
    }
  },

  async updateQueueStatus(staffId, status) {
    const { data: queue, error: getErr } = await supabase
      .from('turn_queue')
      .select('*')
      .order('position');
    if (getErr) throw getErr;

    const targetIndex = queue.findIndex(q => q.staff_id === staffId);
    if (targetIndex === -1) {
      // If not in queue, just try to update status directly
      const { data, error } = await supabase
        .from('turn_queue')
        .update({ status })
        .eq('staff_id', staffId)
        .select();
      if (error) throw error;
      return data;
    }

    const targetItem = queue[targetIndex];
    const maxPos = queue.length;

    const updates = [];
    let currentPos = 1;
    for (let i = 0; i < queue.length; i++) {
      if (i === targetIndex) continue;
      updates.push({ id: queue[i].id, staff_id: queue[i].staff_id, position: currentPos, status: queue[i].status });
      currentPos++;
    }

    // Append target item at the end of the queue with new status
    updates.push({ id: targetItem.id, staff_id: targetItem.staff_id, position: maxPos, status: status });

    // Update in database using negative positions first to avoid unique key constraint
    for (let i = 0; i < updates.length; i++) {
      await supabase.from('turn_queue').update({ position: -updates[i].position }).eq('id', updates[i].id);
    }
    for (let i = 0; i < updates.length; i++) {
      await supabase.from('turn_queue').update({ position: updates[i].position, status: updates[i].status }).eq('id', updates[i].id);
    }
    
    return updates;
  },

  async checkOutBarber(staffId) {
    const { error: deleteErr } = await supabase
      .from('turn_queue')
      .delete()
      .eq('staff_id', staffId);
    if (deleteErr) throw deleteErr;

    const { data: queue, error: getErr } = await supabase
      .from('turn_queue')
      .select('*')
      .order('position');
    if (getErr) throw getErr;

    for (let i = 0; i < queue.length; i++) {
      const newPos = i + 1;
      if (queue[i].position !== newPos) {
        await supabase
          .from('turn_queue')
          .update({ position: newPos })
          .eq('id', queue[i].id);
      }
    }

    // Cierra el registro de asistencia abierto. Si fue un "deshacer" casi inmediato
    // (menos de 60s desde la llegada), borramos el registro en vez de dejar una
    // entrada de historial de 0 minutos.
    const { data: openLog } = await supabase
      .from('attendance_log')
      .select('*')
      .eq('staff_id', staffId)
      .is('check_out', null)
      .order('check_in', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openLog) {
      const secondsSinceCheckIn = (Date.now() - new Date(openLog.check_in).getTime()) / 1000;
      if (secondsSinceCheckIn < 600) {
        await supabase.from('attendance_log').delete().eq('id', openLog.id);
      } else {
        await supabase.from('attendance_log').update({ check_out: new Date().toISOString() }).eq('id', openLog.id);
      }
    }
  },

  async voidShift(staffId) {
    // Elimina de la cola
    await supabase.from('turn_queue').delete().eq('staff_id', staffId);

    // Reordena
    const { data: queue } = await supabase.from('turn_queue').select('*').order('position');
    if (queue) {
      for (let i = 0; i < queue.length; i++) {
        await supabase.from('turn_queue').update({ position: i + 1 }).eq('id', queue[i].id);
      }
    }

    // Borra el registro de asistencia que quedó abierto
    await supabase.from('attendance_log').delete()
      .eq('staff_id', staffId)
      .is('check_out', null);
  },


  async getTopClientsOfMonth() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isoString = thirtyDaysAgo.toISOString();

    const { data: txs, error } = await supabase
      .from('transactions')
      .select('metadata, amount, status, type, created_at')
      .eq('status', 'PAID')
      .eq('type', 'income')
      .gte('created_at', isoString);

    if (error) throw error;

    const counts = {};
    _asArray(txs).forEach(tx => {
      const clientId = tx.metadata?.client_id;
      if (clientId) {
        counts[clientId] = (counts[clientId] || 0) + 1;
      }
    });

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (sorted.length === 0) return [];

    const clientIds = sorted.map(s => s[0]);
    const { data: clientsData, error: clientErr } = await supabase
      .from('clients')
      .select('*')
      .in('id', clientIds);

    if (clientErr) throw clientErr;

    return sorted.map(([id, count]) => {
      const client = _asArray(clientsData).find(c => c.id === id);
      if (!client) return null;
      return { ...client, visit_count: count };
    }).filter(Boolean);
  },

  // Coupons
  async getRoulettePrizes() {
    try {
      const { data, error } = await supabase.from('service_extras').select('*');
      if (error) return [];
      return data.filter(d => d.name && d.name.startsWith('ROULETTE_PRIZE:'));
    } catch { return []; }
  },
  async addRoulettePrize(prizeName) {
    const { data, error } = await supabase.from('service_extras').insert([{ name: 'ROULETTE_PRIZE:' + prizeName, price: 0 }]).select();
    if (error) throw error;
    return data;
  },
  async removeRoulettePrize(id) {
    const { error } = await supabase.from('service_extras').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
  async updateRoulettePrize(id, newName) {
    const { data, error } = await supabase.from('service_extras').update({ name: 'ROULETTE_PRIZE:' + newName }).eq('id', id).select();
    if (error) throw error;
    return data;
  },

  async getCoupons(clientId = null) {
    let query = supabase.from('coupons').select('*, clients:client_id(*)');
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    const { data, error } = await query.order('generated_at', { ascending: false });
    if (error) throw error;
    return _asArray(data);
  },

  async generateCoupon(clientId, prizeName) {
    const { data, error } = await supabase
      .from('coupons')
      .insert([{ client_id: clientId || null, prize_name: prizeName, status: 'UNUSED' }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateCoupon(couponId, newPrizeName) {
    const { data, error } = await supabase.from('coupons').update({ prize_name: newPrizeName }).eq('id', couponId).select().single();
    if (error) throw error;
    return data;
  },
  async deleteCoupon(couponId) {
    const { error } = await supabase.from('coupons').delete().eq('id', couponId);
    if (error) throw error;
    return true;
  },
  async assignCoupon(couponId, clientId) {
    const { data, error } = await supabase
      .from('coupons')
      .update({ client_id: clientId })
      .eq('id', couponId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async redeemCoupon(couponId) {
    const { data, error } = await supabase
      .from('coupons')
      .update({ status: 'USED', redeemed_at: new Date().toISOString() })
      .eq('id', couponId)
      .eq('status', 'UNUSED')
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getStaffTransactions(staffId, startDate = null, endDate = null) {
    let query = supabase
      .from('transactions')
      .select('id, client_id, created_at, amount, exchange_rate, currency, description, metadata')
      .eq('type', 'income')
      .contains('metadata', { staffInvolved: [{ staffId: String(staffId) }] });
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) throw error;
    const transactions = _asArray(data);
    const appointmentIds = Array.from(new Set(transactions.flatMap(transaction => [
      transaction.metadata?.appointment_id,
      ..._asArray(transaction.metadata?.appointmentIds)
    ]).filter(Boolean)));
    const clientIds = Array.from(new Set(transactions.map(transaction =>
      transaction.client_id || transaction.metadata?.client_id || transaction.metadata?.clientId
    ).filter(Boolean)));

    const [appointmentsResult, clientsResult] = await Promise.all([
      appointmentIds.length > 0
        ? supabase
            .from('appointments')
            .select(`
              id, client_id, staff_id, total_price, scheduled_at, completed_at,
              clients(id, name, phone, id_card),
              services(id, name, price),
              staff(id, name),
              appointment_extras(id, price, service_extras(id, name)),
              appointment_products(id, quantity, price, inventory(id, name))
            `)
            .in('id', appointmentIds)
        : Promise.resolve({ data: [], error: null }),
      clientIds.length > 0
        ? supabase.from('clients').select('id, name, phone, id_card').in('id', clientIds)
        : Promise.resolve({ data: [], error: null })
    ]);
    if (appointmentsResult.error) throw appointmentsResult.error;
    if (clientsResult.error) throw clientsResult.error;

    const appointmentsById = new Map(_asArray(appointmentsResult.data).map(appointment => [String(appointment.id), appointment]));
    const clientsById = new Map(_asArray(clientsResult.data).map(client => [String(client.id), client]));

    return transactions.map(transaction => {
      const transactionAppointmentIds = [
        transaction.metadata?.appointment_id,
        ..._asArray(transaction.metadata?.appointmentIds)
      ].filter(Boolean);
      const appointments = transactionAppointmentIds
        .map(id => appointmentsById.get(String(id)))
        .filter(Boolean);
      const clientId = transaction.client_id || transaction.metadata?.client_id || transaction.metadata?.clientId;
      const client = appointments.find(appointment => appointment.clients)?.clients
        || clientsById.get(String(clientId))
        || null;
      return {
        ...transaction,
        client,
        appointments
      };
    });
  },

  async getStaffSettlement(staffId) {
    // Las 3 consultas (staff, tasa de cambio, transacciones) son independientes: se corren
    // EN PARALELO para que el modal de cierre de nómina abra rápido. Antes iban en serie y
    // en un VPS lento eso tardaba varios segundos (el botón parecía no responder).
    const FALLBACK_START = '2026-01-01T00:00:00.000Z';
    const [staffResult, exchangeRates, txResult] = await Promise.all([
      supabase.from('staff').select('id, name, role, payroll_frequency, created_at').eq('id', staffId).single(),
      this.getExchangeRates().catch(() => null),
      supabase.from('transactions').select('*').gte('created_at', FALLBACK_START).order('created_at', { ascending: true })
    ]);
    if (staffResult.error) throw staffResult.error;
    const staffMember = staffResult.data;
    const currentRate = exchangeRates?.bcv ? Number(exchangeRates.bcv) : 40;
    if (txResult.error) throw txResult.error;

    // Filtramos por la fecha de alta del staff en el cliente (la query usa una fecha base
    // fija para poder correr en paralelo sin depender del await de staff).
    const createdCutoff = new Date(staffMember.created_at || FALLBACK_START);
    const transactions = _asArray(txResult.data).filter(t => new Date(t.created_at) >= createdCutoff);
    const txRate = transaction => Number(transaction.exchange_rate || currentRate || 1);
    const staffRecord = transaction => transaction.metadata?.staffInvolved?.find(
      item => String(item.staffId) === String(staffId)
    );
    const storedBs = (record, bsKey, usdKey, rate) => (
      Number(record?.[bsKey] || 0) || (Number(record?.[usdKey] || 0) * rate)
    );
    const isPayroll = transaction => transaction.type === 'expense' &&
      String(transaction.metadata?.staffId) === String(staffId) &&
      (String(transaction.category || '').toLowerCase().includes('pago') || transaction.metadata?.type === 'daily_checkout');

    const hasPayrollValue = record => Number(record?.commissionBs || 0) > 0 || Number(record?.commissionEarned || 0) > 0 || Number(record?.productCommissionBs || 0) > 0 || Number(record?.productCommissionEarned || 0) > 0 || Number(record?.tipBs || 0) > 0 || Number(record?.tip || 0) > 0;
    const incomeTransactions = transactions.filter(transaction => {
      const record = staffRecord(transaction);
      return transaction.type === 'income' && record && hasPayrollValue(record);
    });
    const advances = transactions.filter(transaction =>
      transaction.type === 'expense' &&
      transaction.category === 'Vales Odontologos' &&
      String(transaction.metadata?.staffId) === String(staffId)
    );
    const consumptions = transactions.filter(transaction =>
      transaction.type === 'expense' &&
      transaction.category === 'Consumo Personal' &&
      String(transaction.metadata?.staffId) === String(staffId)
    );
    const exchangeCharges = transactions.filter(transaction =>
      transaction.category === 'Intercambio Barbero' &&
      String(transaction.metadata?.exchangeStaffId) === String(staffId)
    );
    const payments = transactions.filter(isPayroll);
    const role = String(staffMember.role || '').toLowerCase();
    const isAssistant = role.includes('asistente') || role.includes('lavado') || role.includes('operaciones');
    const isBarber = !isAssistant && (role.includes('barber') || role.includes('tatu') || role.includes('socio') || role.includes('estilista') || role.includes('lider'));

    const incomeRows = incomeTransactions.map(transaction => {
      const record = staffRecord(transaction);
      const rate = txRate(transaction);
      const washCount = transaction.metadata?.didWash ? Math.max(1, Number(transaction.metadata?.washCount || 1)) : 0;
      const serviceCommissionBs = storedBs(record, 'commissionBs', 'commissionEarned', rate);
      const productCommissionBs = storedBs(record, 'productCommissionBs', 'productCommissionEarned', rate);
      const washRate = Number(transaction.metadata?.washRate || staffMember.washing_rate || 1);
      const assistantShare = Number(transaction.metadata?.washAssistantSharePct || 60) / 100;
      // La tarifa del lavado pertenece al servicio: 60% para la asistente y
      // 40% para mantener el área de lavado. También normaliza registros
      // históricos creados antes de guardar explícitamente este reparto.
      const commissionBs = isAssistant && washCount > 0
        ? (washCount * washRate * assistantShare * rate) + productCommissionBs
        : serviceCommissionBs + productCommissionBs;
      const tipBs = storedBs(record, 'tipBs', 'tip', rate);
      return { transaction, record, rate, commissionBs, tipBs, washCount };
    });

    const earnedBs = incomeRows.reduce((sum, row) => sum + row.commissionBs, 0);
    const propinasBs = incomeRows.reduce((sum, row) => sum + row.tipBs, 0);
    const lavadosCount = isBarber ? incomeRows.reduce((sum, row) => sum + row.washCount, 0) : 0;
    const lavadoDeductionBs = 0;
    const valesBs = advances.reduce((sum, transaction) => sum + Number(transaction.metadata?.amountBs || 0), 0);
    const consumptionsBs = consumptions.reduce((sum, transaction) => sum + Number(transaction.metadata?.amountBs || (Number(transaction.amount || 0) * txRate(transaction))), 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const valesMonthBs = advances
      .filter(transaction => new Date(transaction.created_at) >= monthStart)
      .reduce((sum, transaction) => sum + Number(transaction.metadata?.amountBs || 0), 0);
    const exchangeChargesBs = exchangeCharges.reduce((sum, transaction) => sum + Number(transaction.metadata?.exchangeChargeBs || 0), 0);
    const paidBs = payments.reduce((sum, transaction) => (
      sum + Number(transaction.metadata?.amountBs || (Number(transaction.amount || 0) * txRate(transaction)))
    ), 0);
    const netIncomeBs = earnedBs;
    const balanceBs = netIncomeBs + propinasBs - valesBs - consumptionsBs - exchangeChargesBs - paidBs;

    const normalizeMethod = rawMethod => {
      const method = String(rawMethod || '').toLowerCase();
      if (method.includes('zelle')) return 'Zelle';
      if (method.includes('binance') || method.includes('usdt')) return 'Binance / USDT';
      if (method.includes('zinli')) return 'Zinli';
      if (method.includes('pago') || method.includes('móvil') || method.includes('movil')) return 'Pago Móvil';
      if (method.includes('punto')) return 'Punto de venta';
      if (method.includes('efectivo') && (method.includes('bs') || method.includes('ves'))) return 'Efectivo (Bs)';
      if (method.includes('efectivo') || method.includes('$')) return 'Efectivo ($)';
      return 'Transferencia';
    };
    const accountBalances = Object.fromEntries([
      'Efectivo ($)', 'Zelle', 'Zinli', 'Binance / USDT',
      'Pago Móvil', 'Efectivo (Bs)', 'Punto de venta', 'Transferencia'
    ].map(method => [method, 0]));
    const methodBreakdown = {};
    // Igual que methodBreakdown pero en USD ORIGINAL (usando la tasa de cada transacción,
    // no la de hoy). Las cuentas en dólares (Efectivo $, Zelle, Binance…) representan un
    // monto fijo en USD; reconvertir Bs/tasa-de-hoy inflaba el valor cuando la tasa bajaba.
    const methodBreakdownUsd = {};
    const addAmount = (target, method, amountBs) => {
      if (!Number.isFinite(amountBs) || amountBs <= 0) return;
      const key = normalizeMethod(method);
      target[key] = (target[key] || 0) + amountBs;
    };
    const addUsd = (method, amountUsd) => {
      if (!Number.isFinite(amountUsd) || amountUsd <= 0) return;
      const key = normalizeMethod(method);
      methodBreakdownUsd[key] = (methodBreakdownUsd[key] || 0) + amountUsd;
    };

    const isUsdLabel = label => /efectivo \(\$\)|zelle|zinli|binance|usdt/i.test(String(label || ''));
    transactions.forEach(transaction => {
      const metadata = transaction.metadata || {};
      const rate = txRate(transaction);
      // Conversión: transferencia interna entre cuentas (Bs↔USD), no un gasto. Mueve el
      // saldo de la cuenta origen a la destino (todo en Bs, como el resto de accountBalances).
      if (metadata.conversion) {
        const convRate = Number(metadata.rate || rate) || 1;
        const fromBs = isUsdLabel(metadata.fromLabel) ? Number(metadata.fromAmount || 0) * convRate : Number(metadata.fromAmount || 0);
        const toBs = isUsdLabel(metadata.toLabel) ? Number(metadata.toAmount || 0) * convRate : Number(metadata.toAmount || 0);
        const fromKey = normalizeMethod(metadata.fromLabel);
        const toKey = normalizeMethod(metadata.toLabel);
        if (accountBalances[fromKey] !== undefined) accountBalances[fromKey] -= fromBs;
        if (accountBalances[toKey] !== undefined) accountBalances[toKey] += toBs;
        return;
      }
      if (transaction.type === 'income') {
        const usdBs = Number(metadata.cash_usd || metadata.cashUsd || 0) * rate;
        const bs = Number(metadata.transfer_bs || metadata.transferBs || 0);
        if (metadata.mixed_payment || (usdBs > 0 && bs > 0)) {
          addAmount(accountBalances, metadata.method_usd || 'Efectivo ($)', usdBs);
          addAmount(accountBalances, metadata.method_bs || 'Pago Móvil', bs);
        } else if (bs > 0) {
          addAmount(accountBalances, metadata.method_bs || 'Pago Móvil', bs);
        } else {
          addAmount(accountBalances, metadata.method_usd || 'Efectivo ($)', Number(transaction.amount || 0) * rate);
        }
      } else if (transaction.type === 'expense' && transaction.category !== 'Consumo Personal') {
        const distribution = Array.isArray(metadata.paymentDistribution) ? metadata.paymentDistribution : [];
        if (distribution.length) {
          distribution.forEach(item => {
            const key = normalizeMethod(item.method);
            accountBalances[key] -= Number(item.amountBs || 0);
          });
        } else {
          const key = normalizeMethod(metadata.paymentMethod || 'Efectivo ($)');
          accountBalances[key] -= Number(metadata.amountBs || (Number(transaction.amount || 0) * rate));
        }
      }
    });

    incomeRows.forEach(row => {
      const metadata = row.transaction.metadata || {};
      const staffShareBs = row.commissionBs + row.tipBs;
      const saleBs = Number(row.transaction.amount || 0) * row.rate;
      if (staffShareBs <= 0 || saleBs <= 0) return;
      // USD original de esta fila (a la tasa de SU transacción), no a la tasa de hoy.
      const staffShareUsd = staffShareBs / row.rate;
      const usdBs = Number(metadata.cash_usd || metadata.cashUsd || 0) * row.rate;
      const bs = Number(metadata.transfer_bs || metadata.transferBs || 0);
      if (metadata.mixed_payment || (usdBs > 0 && bs > 0)) {
        addAmount(methodBreakdown, metadata.method_usd || 'Efectivo ($)', staffShareBs * (usdBs / saleBs));
        addAmount(methodBreakdown, metadata.method_bs || 'Pago Móvil', staffShareBs * (bs / saleBs));
        addUsd(metadata.method_usd || 'Efectivo ($)', staffShareUsd * (usdBs / saleBs));
        addUsd(metadata.method_bs || 'Pago Móvil', staffShareUsd * (bs / saleBs));
      } else if (bs > 0) {
        addAmount(methodBreakdown, metadata.method_bs || 'Pago Móvil', staffShareBs);
        addUsd(metadata.method_bs || 'Pago Móvil', staffShareUsd);
      } else {
        addAmount(methodBreakdown, metadata.method_usd || 'Efectivo ($)', staffShareBs);
        addUsd(metadata.method_usd || 'Efectivo ($)', staffShareUsd);
      }
    });

    const cashAssignedBs = Object.entries(methodBreakdown).reduce((sum, [method, amount]) => (
      method.startsWith('Efectivo') ? sum + amount : sum
    ), 0);
    // Efectivo ($) es una cuenta en dólares: usamos el USD original acumulado, no Bs/tasa-hoy.
    const cashAssignedUsd = Number(methodBreakdownUsd['Efectivo ($)'] || 0);
    const cashAssignedVesBs = Number(methodBreakdown['Efectivo (Bs)'] || 0);
    const paymentHistory = [...payments, ...advances, ...consumptions]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(transaction => ({
        id: transaction.id,
        date: transaction.created_at,
        description: transaction.description,
        type: transaction.category === 'Vales Odontologos' ? 'Adelanto' : transaction.category === 'Consumo Personal' ? 'Consumo' : (transaction.metadata?.isAbono ? 'Abono' : 'Pago'),
        amountBs: Number(transaction.metadata?.amountBs || (Number(transaction.amount || 0) * txRate(transaction))),
        paymentMethod: transaction.metadata?.paymentMethod || 'No registrado',
        items: _asArray(transaction.metadata?.items)
      }));
    const recentEarnings = incomeRows.slice(-12).reverse().map(row => ({
      id: row.transaction.id,
      date: row.transaction.created_at,
      clientName: row.transaction.metadata?.clientName || row.transaction.description?.match(/Cliente:\s*(.*?)\s*-\s*Servi:/i)?.[1]?.trim() || 'Cliente no identificado',
      serviceName: row.record?.serviceName || row.transaction.metadata?.serviceName || row.transaction.description?.match(/Servi:\s*(.*)$/i)?.[1]?.trim() || 'Servicio no identificado',
      amountBs: row.commissionBs,
      tipBs: row.tipBs
    }));

    return {
      payrollFrequency: staffMember.payroll_frequency || 'weekly',
      earnedBs, propinasBs, valesBs, valesMonthBs, consumptionsBs, exchangeChargesBs, paidBs, lavadosCount, lavadoDeductionBs,
      netIncomeBs, balanceBs, rate: currentRate, methodBreakdown, methodBreakdownUsd, accountBalances,
      cashAssignedBs, cashAssignedUsd, cashAssignedVesBs,
      paymentHistory, recentEarnings, periodStart: staffMember.created_at
    };
  },

  async getDailyEarningsForStaff(staffId) {
    const todayStr = new Date().toISOString().split('T')[0];
    const startOfToday = `${todayStr}T00:00:00.000Z`;
    const endOfToday = `${todayStr}T23:59:59.999Z`;

    const { data: staffMember, error: staffErr } = await supabase
      .from('staff')
      .select('role')
      .eq('id', staffId)
      .single();
    if (staffErr) throw staffErr;

    const roleLower = staffMember.role?.toLowerCase() || '';
    const isAssistant = roleLower.includes('asistente') || roleLower.includes('lavado') || roleLower.includes('operaciones');
    const isBarber = !isAssistant && (roleLower.includes('barbero') || roleLower.includes('barber') || roleLower.includes('odontolog') || roleLower.includes('socio') || roleLower.includes('estilista') || roleLower.includes('lider'));

    const { data: txs, error: txsErr } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', startOfToday)
      .lte('created_at', endOfToday);
    if (txsErr) throw txsErr;

    const hasPayrollValue = record => Number(record?.commissionBs || 0) > 0 || Number(record?.commissionEarned || 0) > 0 || Number(record?.productCommissionBs || 0) > 0 || Number(record?.productCommissionEarned || 0) > 0 || Number(record?.tipBs || 0) > 0 || Number(record?.tip || 0) > 0;
    const serviceTransactions = txs.filter(t => t.type === 'income' && t.metadata?.staffInvolved?.some(x => String(x.staffId) === String(staffId) && hasPayrollValue(x)));
    const valesTransactions = txs.filter(t => t.type === 'expense' && t.category === 'Vales Odontologos' && String(t.metadata?.staffId) === String(staffId));
    const consumptionTransactions = txs.filter(t => t.type === 'expense' && t.category === 'Consumo Personal' && String(t.metadata?.staffId) === String(staffId));
    const exchangeChargeTransactions = txs.filter(t => t.category === 'Intercambio Barbero' && String(t.metadata?.exchangeStaffId) === String(staffId));
    const payrollTransactions = txs.filter(t => t.type === 'expense' && t.category === 'Pago Nómina' && String(t.metadata?.staffId) === String(staffId));

    const earnedBs = serviceTransactions.reduce((sum, t) => {
      const s = t.metadata?.staffInvolved?.find(x => String(x.staffId) === String(staffId));
      return sum + (s ? (s.commissionBs || 0) + (s.productCommissionBs || 0) : 0);
    }, 0);

    const propinasBs = serviceTransactions.reduce((sum, t) => {
      const s = t.metadata?.staffInvolved?.find(x => String(x.staffId) === String(staffId));
      return sum + (s ? (s.tipBs || 0) : 0);
    }, 0);

    const valesBs = valesTransactions.reduce((sum, t) => sum + (t.metadata?.amountBs || 0), 0);
    const consumptionsBs = consumptionTransactions.reduce((sum, t) => sum + Number(t.metadata?.amountBs || (Number(t.amount || 0) * Number(t.exchange_rate || 0))), 0);
    const exchangeChargesBs = exchangeChargeTransactions.reduce((sum, t) => sum + Number(t.metadata?.exchangeChargeBs || 0), 0);
    const paidBs = payrollTransactions.reduce((sum, t) => sum + (t.metadata?.amountBs || 0) + (t.metadata?.deductionBs || 0), 0);

    let rate = 40.00;
    try {
      const rates = await this.getExchangeRates();
      if (rates && rates.bcv) rate = rates.bcv;
    } catch (e) {
      console.error('Error fetching rates inside getDailyEarningsForStaff:', e);
    }

    let lavadosCount = 0;
    let lavadoDeductionBs = 0;
    let netIncomeBs = 0;

    if (isBarber) {
      lavadosCount = serviceTransactions.filter(t => t.metadata?.didWash).length;
      netIncomeBs = earnedBs;
    } else {
      netIncomeBs = earnedBs;
    }

    const balanceBs = netIncomeBs + propinasBs - valesBs - consumptionsBs - exchangeChargesBs - paidBs;

    return {
      earnedBs,
      propinasBs,
      valesBs,
      consumptionsBs,
      exchangeChargesBs,
      paidBs,
      lavadosCount,
      lavadoDeductionBs,
      netIncomeBs,
      balanceBs,
      rate
    };
  },


  async getStaffReviews(staffId = null) {
    let query = supabase.from('staff_reviews').select('*, clients(name)');
    if (staffId) {
      query = query.eq('staff_id', staffId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return _asArray(data);
  },

  async submitStaffReview(staffId, rating, comment) {
    const { data, error } = await supabase
      .from('staff_reviews')
      .insert([{ staff_id: staffId, rating: Number(rating), comment }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async resetDatabase() {
    if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_DATABASE_RESET !== 'true') {
      throw new Error('Database reset is disabled outside explicit local maintenance mode.');
    }
    if (!window.confirm('¿ESTÁS ABSOLUTAMENTE SEGURO? Se borrarán todos los clientes, personal y ventas. Esta acción es irreversible.')) return;
    try {
      await supabase.from('appointment_staff').delete().neq('id', 0);
      await supabase.from('appointments').delete().neq('id', 0);
      await supabase.from('transactions').delete().neq('id', 0);
      await supabase.from('clients').delete().neq('id', 0);
      await supabase.from('staff').delete().neq('id', 0);
      await supabase.from('services').delete().neq('id', 0);
      await supabase.from('inventory').delete().neq('id', 0);
      return true;
    } catch (error) {
      console.error('Reset error:', error);
      throw error;
    }
  },

  // ==========================================
  // SYSTEM SETTINGS
  // ==========================================

  async getSystemSettings() {
    try {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (error) throw error;
      const settingsObj = {};
      if (data) {
        data.forEach(item => {
          settingsObj[item.key] = item.value;
        });
      }
      return settingsObj;
    } catch (error) { console.error('Error fetching system settings:', error); return {}; }
  },

  async updateSystemSetting(key, value) {
    try {
      const { data, error } = await supabase.from('system_settings').upsert({ key, value, updated_at: new Date().toISOString() }).select();
      if (error) throw error;
      return data;
    } catch (error) { console.error('Error updating setting:', error); throw error; }
  },

  // Contador secuencial de órdenes para el recibo (system_settings.order_counter). Empieza en 1.
  // Lectura-incremento-escritura (no atómico, pero suficiente para un solo local).
  async getNextOrderNumber() {
    try {
      const settings = await this.getSystemSettings();
      const current = parseInt(settings.order_counter, 10) || 0;
      const next = current + 1;
      await this.updateSystemSetting('order_counter', String(next));
      return next;
    } catch (error) { console.error('Error getting next order number:', error); return null; }
  }
};
