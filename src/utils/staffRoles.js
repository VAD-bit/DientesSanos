const normalize = (value) => String(value || '').trim().toLowerCase();

// ============================================================================
// Modelo de 3 roles (Dientes Sanos):
//   Administrador | Odontologo | Asistente
// Valor interno en staff.role (sin tildes) + módulos tras el `|`:
//   'Odontologo|my-profile,barber,scheduling,clients,history'
// La detección por roles es por PALABRAS CLAVE sobre el nombre del rol (la
// parte antes del `|`) para tolerar valores heredados (Barbero, Tatuador,
// Asistente de Lavado, Recepcionista, Caja, Barista) sin romper.
// ============================================================================

export const getStaffSearchText = (member = {}) => [
  member.name,
  member.role,
  member.specialty,
  member.badge,
  member.username,
  member.email,
].map(normalize).join(' ');

export const isArchivedStaff = (member = {}) => normalize(member.role).startsWith('archived|');

// Nombre del rol sin módulos: 'Odontologo|barber,clients' -> 'odontologo'.
export const roleNameOf = (member = {}) => normalize(member.role).split('|')[0];

export const isActiveStaff = (member = {}) => member.active !== false && !isArchivedStaff(member);

export const isAdminStaff = (member = {}) => {
  const text = getStaffSearchText(member);
  return /\badmin\b/.test(text) || text.includes('administrador');
};

// Personal de apoyo (Editor, Marketing, etc.): sueldo fijo, no atiende clientes ni
// acumula comisiones. Se detecta SOLO por el nombre del rol (la parte antes del `|`),
// nunca por el texto completo: los correos @odontosonrisa.com contienen "barber" y
// ensuciarían la detección basada en getStaffSearchText.
const SERVICE_OR_OPS_KEYWORDS = [
  'odontolog',
  'barber', 'barbero', 'estilista', 'corte', 'barba',
  'tatu', 'tattoo', 'ink',
  'barista', 'cafeter',
  'asistente', 'lavado', 'operacion',
  'recepcion', 'recepción', 'caja',
];

export const isSupportStaff = (member = {}) => {
  if (!isActiveStaff(member)) return false;
  const role = roleNameOf(member);
  if (!role || role === 'admin' || role.includes('administrador')) return false;
  return !SERVICE_OR_OPS_KEYWORDS.some((keyword) => role.includes(keyword));
};

const ODONTOLOGO_KEYWORDS = ['odontolog', 'barbero', 'barber', 'tatu', 'estilista', 'corte'];
const ASISTENTE_KEYWORDS = ['asistente', 'recepcion', 'recepción', 'caja', 'barista', 'lavado', 'cafeter'];

// Profesional de sillón (Odontologo; tolera Barbero/Tatuador heredados).
export const isOdontologoRole = (member = {}) => {
  if (!isActiveStaff(member)) return false;
  const role = roleNameOf(member);
  if (!role || role.includes('admin')) return false;
  return ODONTOLOGO_KEYWORDS.some((keyword) => role.includes(keyword));
};

// Asistente operativo (Asistente; tolera Recepcionista/Caja/Barista/Lavado heredados).
export const isAsistenteRole = (member = {}) => {
  if (!isActiveStaff(member)) return false;
  const role = roleNameOf(member);
  if (!role || role.includes('admin')) return false;
  return ASISTENTE_KEYWORDS.some((keyword) => role.includes(keyword));
};

export const isNonServiceStaff = (member = {}) => {
  const text = getStaffSearchText(member);
  return (
    text.includes('recepcionista') ||
    text.includes('recepcion') ||
    text.includes('recepción') ||
    text.includes('caja') ||
    text.includes('barista') ||
    text.includes('cafeter') ||
    text.includes('asistente') ||
    text.includes('lavado')
  );
};

export const isBarberRole = (member = {}) => {
  const text = getStaffSearchText(member);
  return (
    text.includes('barber') ||
    text.includes('barbero') ||
    text.includes('estilista') ||
    text.includes('corte') ||
    text.includes('odontolog')
  );
};

export const isTattooRole = (member = {}) => {
  const text = getStaffSearchText(member);
  return text.includes('tatu') || text.includes('tattoo') || text.includes('ink');
};

// Reservable en el portal público: cualquier odontólogo activo (antes exigía
// además isAdminStaff, con lo que NINGÚN miembro del equipo pasaba el filtro
// y el portal no listaba a nadie).
export const isBookableStaff = (member = {}) => (
  isActiveStaff(member) &&
  isOdontologoRole(member)
);

export const isBarberBookableStaff = (member = {}) => isBookableStaff(member) && isBarberRole(member) && !isTattooRole(member);

export const isTattooBookableStaff = (member = {}) => isBookableStaff(member) && isTattooRole(member);

// Puede recibir clientes en recepción (cita sin horario / "enviar a sillón"):
// administradores y los dos roles operativos. Excluye archivados e inactivos.
export const isOperationalReceptionStaff = (member = {}) => (
  isActiveStaff(member) &&
  (isAdminStaff(member) || isOdontologoRole(member) || isAsistenteRole(member))
);

// ============================================================================
// Navegación: única fuente de verdad de qué pestañas puede abrir cada rol.
// La consumen Sidebar, MobileBottomNav y el guardia de handleTabChange (App).
// ============================================================================

export const ALL_MENU_IDS = [
  'dashboard', 'my-profile', 'barber', 'scheduling', 'reception', 'checkout',
  'panels', 'clients', 'services', 'personnel', 'inventory', 'reports',
  'finance', 'history', 'settings',
];

// Categoría de rol para decisiones de presentación (home, menús, carga de datos).
export const getRoleCategory = (userRole = '') => {
  const member = { role: userRole };
  const roleName = roleNameOf(member);
  if (roleName.includes('admin')) return 'admin';
  if (isOdontologoRole(member)) return 'odontologo';
  if (isAsistenteRole(member)) return 'asistente';
  if (isSupportStaff(member)) return 'support';
  return 'custom';
};

// Ids de módulos que el rol puede abrir. Los módulos otorgados explícitamente
// en staff.role (tras el `|`) mandan sobre los presets por palabra clave.
export const getAllowedMenuIds = (userRole = '') => {
  const roleStr = String(userRole || '');
  const [roleName, customPerms] = roleStr.split('|');
  const permissionList = customPerms ? customPerms.split(',').filter(Boolean) : [];
  const member = { role: roleStr };

  // Admin: todo (el menú oculta "Mi sillón"/"Mi Perfil"; Paneles abre sillas).
  if (roleName.toLowerCase().includes('admin')) return ALL_MENU_IDS;

  if (permissionList.length > 0) return Array.from(new Set(['my-profile', ...permissionList]));
  if (roleName.startsWith('Custom:')) return roleName.slice('Custom:'.length).split(',').filter(Boolean);
  if (isOdontologoRole(member)) return ['my-profile', 'barber', 'scheduling', 'clients', 'history'];
  if (isAsistenteRole(member)) return ['my-profile', 'reception', 'scheduling', 'clients', 'history'];
  if (isSupportStaff(member)) return ['my-profile'];
  return ['my-profile'];
};

// Etiqueta VISIBLE de rol para la UI. Los valores internos de staff.role no
// cambian; acepta el valor con o sin módulos ('Odontologo|barber,...').
export const roleLabel = (value) => {
  const raw = String(value ?? '').split('|')[0].trim();
  const lower = raw.toLowerCase();
  if (!raw) return '';
  if (lower.includes('admin')) return 'Administrador';
  if (lower.startsWith('odontologos')) return 'Odontólogos';
  if (lower.includes('odontolog') || lower.includes('barbero') || lower.includes('barber') || lower.includes('tatu') || lower.includes('estilista')) return 'Odontólogo';
  if (lower.includes('asistente') || lower.includes('lavado') || lower.includes('recepcion') || lower.includes('recepción') || lower.includes('caja') || lower.includes('barista') || lower.includes('cafeter')) return 'Asistente';
  return raw;
};
