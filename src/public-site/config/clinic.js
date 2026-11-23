// Datos reales de la clÃ­nica â€” Ãºnica fuente de verdad para todo el portal pÃºblico.
// Editar solo aquÃ­ cuando cambien datos de contacto.
export const CLINIC = {
  name: 'Dientes Sanos',
  fullName: 'Centro OdontolÃ³gico Dientes Sanos',
  tagline: 'ClÃ­nica odontolÃ³gica en Maracay',
  instagramHandle: 'dientes_sanos',
  instagramUrl: 'https://www.instagram.com/dientes_sanos/',
  phoneDisplay: '0424-3679576',
  phoneTel: '+584243679576',
  get whatsappUrl() {
    return `https://wa.me/584243679576?text=${encodeURIComponent('Hola! Quiero agendar una cita en Dientes Sanos ðŸ¦·')}`;
  },
  address: 'Maracay / San Jacinto, Aragua, Venezuela',
  addressShort: 'Maracay, San Jacinto',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Dientes+Sanos+Maracay+San+Jacinto',
  linktreeUrl: 'https://linktr.ee/Dientes__sanos',
  specialties: ['OdontologÃ­a EstÃ©tica', 'RehabilitaciÃ³n oral', 'Ortodoncia'],
};

