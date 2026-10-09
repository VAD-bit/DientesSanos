const normalize = (value) => String(value || '').trim().toLowerCase();

export const getStaffSearchText = (member = {}) => [
  member.name,
  member.role,
  member.specialty,
  member.badge,
  member.username,
  member.email,
].map(normalize).join(' ');

export const isArchivedStaff = (member = {}) => normalize(member.role).startsWith('archived|');

export const isAdminStaff = (member = {}) => {
  const text = getStaffSearchText(member);
  return /\badmin\b/.test(text) || text.includes('administrador');
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

export const isActiveStaff = (member = {}) => member.active !== false && !isArchivedStaff(member);

export const isBarberRole = (member = {}) => {
  const text = getStaffSearchText(member);
  return (
    text.includes('barber') ||
    text.includes('barbero') ||
    text.includes('estilista') ||
    text.includes('corte')
  );
};

export const isTattooRole = (member = {}) => {
  const text = getStaffSearchText(member);
  return text.includes('tatu') || text.includes('tattoo') || text.includes('ink');
};

export const isBookableStaff = (member = {}) => (
  isActiveStaff(member) &&
  isAdminStaff(member) &&
  !isNonServiceStaff(member) &&
  (isBarberRole(member) || isTattooRole(member))
);

export const isBarberBookableStaff = (member = {}) => isBookableStaff(member) && isBarberRole(member) && !isTattooRole(member);

export const isTattooBookableStaff = (member = {}) => isBookableStaff(member) && isTattooRole(member);

// Personal de apoyo (Editor, Marketing, etc.): sueldo fijo, no atiende clientes ni
// acumula comisiones. Se detecta SOLO por el nombre del rol (la parte antes del `|`),
// nunca por el texto completo: los correos @odontosonrisa.com contienen "barber" y
// ensuciarían la detección basada en getStaffSearchText.
const roleNameOf = (member = {}) => normalize(member.role).split('|')[0];

const SERVICE_OR_OPS_KEYWORDS = [
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

export const isOperationalReceptionStaff = (member = {}) => (
  isActiveStaff(member) &&
  isAdminStaff(member) &&
  !getStaffSearchText(member).includes('recepcionista') &&
  !getStaffSearchText(member).includes('recepcion') &&
  !getStaffSearchText(member).includes('recepción') &&
  !getStaffSearchText(member).includes('caja')
);
