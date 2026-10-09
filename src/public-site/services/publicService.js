import { publicSupabase as supabase } from '../../lib/supabase';
import { isBookableStaff } from '../../utils/staffRoles';

const authenticatedApi = async (url, payload) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Debes iniciar sesión para completar esta operación.');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la operación.');
  return result;
};

// Busca el cliente existente por cédula/email/teléfono. La normalización (quitar
// todo lo que no sea dígito) y el desempate viven ahora en el RPC SECURITY DEFINER
// odontosonrisa.find_existing_client, que devuelve 0 o 1 fila. Antes esto traía la
// tabla completa de clientes al navegador y filtraba en JS (fuga de datos).
const findExistingClientRecord = async ({ id_card, email, phone }) => {
  const { data, error } = await supabase.rpc('find_existing_client', {
    p_id_card: id_card ?? null,
    p_email: email ?? null,
    p_phone: phone ?? null
  });
  if (error) throw error;
  return (data && data[0]) || null;
};

// Registros que pertenecen a la misma persona (misma cédula normalizada) para
// sumar puntos y citas. El filtrado por cédula normalizada ocurre en el RPC
// odontosonrisa.find_related_clients; antes traía la tabla completa.
const findRelatedClientRecords = async clientId => {
  const { data, error } = await supabase.rpc('find_related_clients', {
    p_client_id: String(clientId)
  });
  if (error) throw error;
  return data || [];
};

const linkClientRecord = async (existing, userId, incoming) => {
  if (existing.auth_user_id && String(existing.auth_user_id) !== String(userId)) {
    throw new Error('Esta cédula ya está vinculada a otra cuenta. Contacta a la barbería.');
  }

  const { client } = await authenticatedApi('/api/public/client-profile', {
    userId,
    name: existing.name || incoming.name,
    phone: existing.phone || incoming.phone,
    email: existing.email || incoming.email || null,
    birth_date: existing.birth_date || incoming.birth_date || null
  });
  return client;
};

export const publicService = {
  // Get Roulette Prizes for PrizeWheel. Goes through /api/public/roulette-prizes
  // (service key) because the anon role has no SELECT on service_extras.
  async getRoulettePrizes() {
    try {
      const response = await fetch('/api/public/roulette-prizes');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return [];
      return result.prizes || [];
    } catch {
      return [];
    }
  },

  // Get active services
  async getServices() {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },

  // Manual open/closed switch controlled from the admin dashboard. While open the shop
  // takes bookings 24h; while closed nobody can book. Unset => treated as open so nothing
  // breaks before the owner uses the switch. On a read error we fail OPEN so a transient
  // hiccup doesn't block all bookings. Goes through /api/public/store-status (service key)
  // because the anon role has no SELECT grant on system_settings — a direct client-side
  // query here always fails silently and was masking the toggle having no real effect.
  async getStoreOpen() {
    try {
      const response = await fetch('/api/public/store-status');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return true;
      return result.isOpen !== false;
    } catch {
      return true;
    }
  },

  // Get active staff (barbers) — uses authClient (service role) because anon has no RLS policy on staff table
  async getStaff() {
    const response = await fetch('/api/public/staff');
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'No se pudo cargar el equipo.');
    const staffList = (result.staff || []).filter(isBookableStaff);
    return staffList.sort((a, b) => {
      const isA = a.name.toLowerCase().includes('israel');
      const isB = b.name.toLowerCase().includes('israel');
      if (isA && !isB) return 1;
      if (!isA && isB) return -1;
      return 0;
    });
  },

  // Menú de Panda Café (bebidas de cortesía para el paso de reserva). Vía endpoint
  // público porque anon no puede leer `inventory` directamente.
  async getCafeMenu() {
    try {
      const response = await fetch('/api/public/cafe');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return [];
      return result.items || [];
    } catch {
      return [];
    }
  },

  // Get portfolio photos for a specific staff member
  async getStaffPortfolio(staffId) {
    if (!staffId) return [];
    const { data, error } = await supabase
      .from('staff_portfolio')
      .select('id, image_url, created_at')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Portfolio fetch error:', error.message);
      return [];
    }
    return data || [];
  },

  // Get available time slots for a specific barber and date
  async getOccupiedSlots(staffId, date, requestedDuration = 60) {
    const [year, month, day] = String(date).split('-').map(Number);
    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
    const { data, error } = await supabase
      .from('appointments')
      .select('scheduled_at, services(duration)')
      .eq('staff_id', staffId)
      .not('scheduled_at', 'is', null)
      .gte('scheduled_at', dayStart.toISOString())
      .lt('scheduled_at', dayEnd.toISOString())
      .in('status', ['Agendado', 'Confirmado', 'En Silla', 'Por Pagar']);
    if (error) throw error;

    const targetDuration = Math.max(30, Number(requestedDuration) || 60);
    const occupied = new Set();
    for (let hour = 0; hour < 24; hour++) {
      for (const minute of [0, 30]) {
        const candidateStart = new Date(year, month - 1, day, hour, minute, 0, 0);
        const candidateEnd = new Date(candidateStart.getTime() + targetDuration * 60000);
        const overlaps = (data || []).some(appointment => {
          const existingStart = new Date(appointment.scheduled_at);
          const existingDuration = Math.max(30, Number(appointment.services?.duration) || 60);
          const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000);
          return candidateStart < existingEnd && candidateEnd > existingStart;
        });
        if (overlaps) occupied.add(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
      }
    }
    return [...occupied];
  },

  // Register new client
  async registerClient({ name, phone, id_card, email, password, birth_date }) {
    const effectiveEmail = email || `${phone}@odontosonrisa.app`;

    // Step 1: Try to create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: effectiveEmail,
      password: password,
      options: { data: { name, id_card } }
    });

    let userId = authData?.user?.id;

    // Supabase may return no error but an "unconfirmed" user (identities=[])
    // when email confirmations are off and the user already exists.
    const isExistingUser =
      (authError && authError.message?.toLowerCase().includes('already registered')) ||
      (authData?.user && (!authData.user.identities || authData.user.identities.length === 0));

    if (isExistingUser) {
      // Try to sign them in — if the password matches, we link the session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: effectiveEmail,
        password: password
      });
      if (signInError) {
        throw new Error('Este correo o teléfono ya tiene una cuenta. Intenta iniciar sesión.');
      }
      userId = signInData?.user?.id;
    } else if (authError) {
      throw new Error('No se pudo crear la cuenta. Intenta con otro correo o contraseña.');
    }

    if (!userId) {
      throw new Error('No se pudo verificar tu identidad. Intenta de nuevo.');
    }

    // Step 2: Check if a client record already exists (by cédula/phone/email)
    const existing = await findExistingClientRecord({ id_card, email, phone });

    if (existing) {
      // If the existing record already belongs to a DIFFERENT auth user — don't block,
      // just create a fresh independent client record for this new account.
      if (existing.auth_user_id && String(existing.auth_user_id) !== String(userId)) {
        // Fall through to create a new record below
      } else {
        // Link this auth user to the existing client record
        try {
          const linkedClient = await linkClientRecord(existing, userId, { name, phone, email, birth_date });
          const { data: sessionData } = await supabase.auth.signInWithPassword({
            email: effectiveEmail, password
          }).catch(() => ({ data: null }));
          return { user: { id: userId }, client: linkedClient, linkedExisting: true, session: sessionData?.session };
        } catch {
          // If linking fails for any reason, create a fresh record
        }
      }
    }

    const { client: clientData } = await authenticatedApi('/api/public/client-profile', {
      userId, name, phone, id_card, email: email || null, birth_date: birth_date || null
    });

    // Sign in to get session
    const { data: sessionData } = await supabase.auth.signInWithPassword({
      email: effectiveEmail,
      password: password
    }).catch(() => ({ data: null }));

    return { user: { id: userId }, client: clientData, session: sessionData?.session };
  },

  // Login client (accepts email or phone)
  async loginClient({ identifier, password }) {
    const isEmail = identifier.includes('@');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: isEmail ? identifier : `${identifier}@odontosonrisa.app`,
      password
    });
    if (error) throw error;
    return data;
  },

  // Sign in with Google. `forceAccountPicker` adds Google's `prompt=select_account`,
  // which is needed for a "switch account" action — without it, if the browser still
  // has an active Google session, this silently re-authenticates with that same
  // account instead of letting the user pick a different one.
  async signInWithGoogle({ forceAccountPicker = false } = {}) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        ...(forceAccountPicker ? { queryParams: { prompt: 'select_account' } } : {}),
      }
    });
    if (error) throw error;
    return data;
  },

  // Get current session
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Sign out of the current auth session (e.g. Google) — used on
  // /completar-registro so someone who doesn't want to finish registering
  // right now has a real way out instead of being stuck there.
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get user from session
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Update client profile info
  async updateClientProfile(clientId, data) {
    if (!clientId) throw new Error("Client ID required");
    const { client } = await authenticatedApi('/api/public/client-profile', data);
    if (String(client?.id) !== String(clientId)) throw new Error('El perfil actualizado no coincide con la sesión.');
    return client;
  },

  // Reset password
  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/#/restablecer-contraseña'
    });
    if (error) throw error;
    return true;
  },

  // Update password
  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return true;
  },

  // Complete Google registration (create or update client record using service role to bypass RLS)
  async completeGoogleRegistration({ user_id, name, email, phone, id_card, birth_date }) {
    const { client } = await authenticatedApi('/api/public/client-profile', {
      userId: user_id, name, email, phone, id_card, birth_date
    });
    return client;
  },

  // Check if user has completed registration
  async getClientByUserId(userId) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Check if client exists by email
  async getClientByEmail(email) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Get client by phone
  async getClientByPhone(phone) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Get client appointments
  async getClientAppointments(clientId) {
    const relatedClients = await findRelatedClientRecords(clientId);
    const relatedClientIds = relatedClients.map(client => client.id);
    if (relatedClientIds.length === 0) return [];

    const { data, error } = await supabase
      .from('appointments')
      .select('*, services(name, price), staff(name, image_url)')
      .in('client_id', relatedClientIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Update appointment tattoo consent
  async updateAppointmentTattooConsent(appointmentId, tattooData) {
    const { data, error } = await supabase
      .from('appointments')
      .update({ tattoo_data: tattooData })
      .eq('id', appointmentId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Create appointment
  async createAppointment({ client_id, service_id, staff_id, scheduled_at, beverage_selection, notes, tattoo_data }) {
    const bookableStaff = await this.getStaff();
    if (!bookableStaff.some(member => String(member.id) === String(staff_id))) {
      throw new Error('Este profesional no está disponible para agendar citas.');
    }

    const { data: service } = await supabase
      .from('services')
      .select('price, duration')
      .eq('id', service_id)
      .single();

    // Fast UX check; PostgreSQL repeats this transactionally to close race conditions.
    const scheduledDate = new Date(scheduled_at);
    const dateKey = `${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, '0')}-${String(scheduledDate.getDate()).padStart(2, '0')}`;
    const timeKey = `${String(scheduledDate.getHours()).padStart(2, '0')}:${String(scheduledDate.getMinutes()).padStart(2, '0')}`;
    const occupiedSlots = await this.getOccupiedSlots(staff_id, dateKey, service?.duration);
    if (occupiedSlots.includes(timeKey)) {
      throw new Error('Lo sentimos, este horario acaba de ser reservado por otra persona. Por favor elige otro.');
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        client_id,
        service_id,
        staff_id,
        scheduled_at,
        total_price: service?.price || 0,
        status: 'Agendado',
        beverage_selection: beverage_selection || null,
        notes: notes || null,
        tattoo_data: tattoo_data || null
      }])
      .select()
      .single();
    if (error) {
      const errorText = `${error.message || ''} ${error.details || ''}`;
      if (errorText.includes('APPOINTMENT_TIME_CONFLICT')) {
        throw new Error('Lo sentimos, este horario acaba de ser reservado por otra persona. Por favor elige otro.');
      }
      throw error;
    }
    return data;
  },

  // Get client points
  async getClientPoints(clientId) {
    const relatedClients = await findRelatedClientRecords(clientId);
    return relatedClients.reduce((total, client) => total + Number(client.points || 0), 0);
  },

  // Redeem a prize
  async redeemPrize(clientId, cost, prizeName) {
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('points')
      .eq('id', clientId)
      .single();
      
    if (fetchError) throw fetchError;
    
    const newPoints = (client.points || 0) - cost;
    const { error: updateError } = await supabase
      .from('clients')
      .update({ points: newPoints })
      .eq('id', clientId);
      
    if (updateError) throw updateError;
    return { success: true, prize: prizeName };
  },

  // Get top clients of the month
  async getTopClientsOfMonth() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isoString = thirtyDaysAgo.toISOString();

    const { data: apps, error } = await supabase
      .from('appointments')
      .select('client_id, status, created_at')
      .in('status', ['Pagado', 'COMPLETED', 'Completado'])
      .gte('created_at', isoString);

    if (error) throw error;

    const counts = {};
    (apps || []).forEach(app => {
      const clientId = app.client_id;
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
      const client = (clientsData || []).find(c => c.id === id);
      if (!client) return null;
      return { ...client, visit_count: count };
    }).filter(Boolean);
  },

  // Coupons
  async getCoupons(clientId = null) {
    let query = supabase.from('coupons').select('*');
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    const { data, error } = await query.order('generated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async generateCoupon(clientId, prizeName) {
    const { data, error } = await supabase
      .from('coupons')
      .insert([{ client_id: clientId, prize_name: prizeName, status: 'UNUSED' }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Broadcasts a real-time notification to any logged-in admin CRM tab (same
  // 'panda-notifications' channel the admin app itself uses for staff-to-staff
  // notifications) so a birthday roulette win doesn't happen silently for the business.
  async notifyRouletteWin(clientName, prizeName) {
    try {
      const channel = supabase.channel('panda-notifications');
      channel.send({
        type: 'broadcast',
        event: 'crm-notification',
        payload: {
          title: '🎉 ¡Ruleta de cumpleaños ganada!',
          body: `${clientName || 'Un cliente'} ganó "${prizeName}" en su ruleta de cumpleaños.`,
          recipientRole: null,
          recipientId: null,
          senderId: null
        }
      });
    } catch (e) {
      console.error('Error notifying roulette win:', e);
    }
  },

  // Submit a rating for a barber (3 categories: rapidez, limpieza, habilidad)
  async submitStaffReview({ staff_id, client_id, appointment_id, rapidez, limpieza, habilidad, comment }) {
    const avgRating = (Number(rapidez) + Number(limpieza) + Number(habilidad)) / 3;
    const { data, error } = await supabase
      .from('staff_reviews')
      .upsert([{
        staff_id,
        client_id: client_id || null,
        appointment_id: appointment_id || null,
        rapidez: Number(rapidez),
        limpieza: Number(limpieza),
        habilidad: Number(habilidad),
        rating: Math.round(avgRating), // staff_reviews.rating is an integer column (1-5)
        comment: comment || null
      }], { onConflict: 'appointment_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Check if a client already reviewed an appointment
  async hasClientReviewed(appointmentId) {
    const { data, error } = await supabase
      .from('staff_reviews')
      .select('id')
      .eq('appointment_id', appointmentId)
      .maybeSingle();
    if (error) return false;
    return !!data;
  },

  async getStaffReviews(staffId = null) {
    let query = supabase.from('staff_reviews').select('*');
    if (staffId) {
      query = query.eq('staff_id', staffId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Get average rating for a barber
  async getBarberAverageRating(staffId) {
    const { data, error } = await supabase
      .from('staff_reviews')
      .select('rating')
      .eq('staff_id', staffId);
    if (error || !data || data.length === 0) return { avg: 0, count: 0 };
    const avg = data.reduce((sum, r) => sum + Number(r.rating), 0) / data.length;
    return { avg: Math.round(avg * 10) / 10, count: data.length };
  },

  // Get barber of the month (highest rated barber in last 30 days)
  async getBarberOfMonth() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isoString = thirtyDaysAgo.toISOString();

    // Get all reviews from last 30 days
    const { data: reviews, error } = await supabase
      .from('staff_reviews')
      .select('staff_id, rating')
      .gte('created_at', isoString);

    if (error) throw error;

    // Calculate average rating per barber
    const ratings = {};
    const counts = {};
    (reviews || []).forEach(r => {
      if (r.staff_id && r.rating) {
        ratings[r.staff_id] = (ratings[r.staff_id] || 0) + Number(r.rating);
        counts[r.staff_id] = (counts[r.staff_id] || 0) + 1;
      }
    });

    const sorted = Object.entries(ratings)
      .map(([id, total]) => ({ id, avg: total / counts[id], count: counts[id] }))
      .sort((a, b) => b.avg - a.avg || b.count - a.count);

    // Fallback: if no reviews, use completed appointments revenue
    if (sorted.length === 0) {
      const { data: apps } = await supabase
        .from('appointments')
        .select('staff_id, total_price')
        .eq('status', 'Completado')
        .gte('scheduled_at', isoString);

      const earnings = {};
      (apps || []).forEach(app => {
        if (app.staff_id) {
          earnings[app.staff_id] = (earnings[app.staff_id] || 0) + Number(app.total_price || 0);
        }
      });

      const earnSorted = Object.entries(earnings).sort((a, b) => b[1] - a[1]);
      if (earnSorted.length === 0) return null;

      const topBarberId = earnSorted[0][0];
      const { data: barberData } = await supabase
        .from('staff')
        .select('*')
        .eq('id', topBarberId)
        .single();

      return { ...barberData, total_generated: earnSorted[0][1], avg_rating: 0, reviews_count: 0 };
    }

    const topBarberId = sorted[0].id;
    const { data: barberData, error: staffErr } = await supabase
      .from('staff')
      .select('*')
      .eq('id', topBarberId)
      .single();

    if (staffErr) throw staffErr;

    return {
      ...barberData,
      avg_rating: sorted[0].avg,
      reviews_count: sorted[0].count
    };
  },

  // Reseñas de Google del consultorio.
  // TODO(reseñas): conectar la API de Google Places para sincronizar automáticamente;
  // por ahora se leen de la tabla `google_reviews` (vacío = la sección queda en espera).
  async getGoogleReviews() {
    try {
      const { data, error } = await supabase
        .from('google_reviews')
        .select('*')
        .order('reviewed_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('google_reviews no disponible todavía:', e?.message);
      return [];
    }
  }
};

