// Datos reales de la clínica — única fuente de verdad para todo el portal público.
// Editar solo aquí cuando cambien datos de contacto.
export const CLINIC = {
  name: 'Dientes Sanos',
  fullName: 'Centro Odontológico Dientes Sanos',
  tagline: 'Clínica odontológica en Maracay',
  instagramHandle: 'dientes_sanos',
  instagramUrl: 'https://www.instagram.com/dientes_sanos/',
  phoneDisplay: '0424-3679576',
  phoneTel: '+584243679576',
  get whatsappUrl() {
    return `https://wa.me/584243679576?text=${encodeURIComponent('Hola! Quiero agendar una cita en Dientes Sanos 🦷')}`;
  },
  address: 'Maracay / San Jacinto, Aragua, Venezuela',
  addressShort: 'Maracay, San Jacinto',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Dientes+Sanos+Maracay+San+Jacinto',
  linktreeUrl: 'https://linktr.ee/Dientes__sanos',
  specialties: ['Odontología Estética', 'Rehabilitación oral', 'Ortodoncia'],
};
