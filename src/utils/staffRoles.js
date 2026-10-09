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
