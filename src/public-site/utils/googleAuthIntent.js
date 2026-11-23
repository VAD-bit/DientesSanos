const GOOGLE_AUTH_INTENT_KEY = 'panda_google_auth_intent';

export const GOOGLE_AUTH_DESTINATIONS = Object.freeze({
  PROFILE: 'profile',
  BOOKING: 'booking',
});

export const setGoogleAuthIntent = (destination) => {
  const safeDestination = destination === GOOGLE_AUTH_DESTINATIONS.BOOKING
    ? GOOGLE_AUTH_DESTINATIONS.BOOKING
    : GOOGLE_AUTH_DESTINATIONS.PROFILE;

  localStorage.setItem(GOOGLE_AUTH_INTENT_KEY, safeDestination);
};

export const getGoogleAuthIntent = () => (
  localStorage.getItem(GOOGLE_AUTH_INTENT_KEY)
);

// Solo se vuelve a /agendar cuando hay una reserva REAL esperando ser retomada:
// BookAppointment guarda `panda_draft_booking` con `resumeAfterAuth: true` (y los
// datos de la reserva) justo antes del redirect a Google, y /agendar lo lee para
// restaurar el wizard. Ese draft es la verdad de fondo — se pone solo cuando hay
// una reserva en curso y se limpia al terminarla.
//
// Antes esto miraba primero `panda_google_auth_intent === 'booking'`, pero ese flag
// sobrevive a intentos fallidos/abandonados y se filtraba a registros normales de
// perfil, dejándolos varados en /agendar (que, sin draft que restaurar, solo muestra
// el hero de la landing). El `intent` se sigue usando en otros lados, pero ya no
// decide el destino post-registro: manda el draft real.
export const shouldReturnToBookingAfterGoogle = () => {
  try {
    const draft = JSON.parse(localStorage.getItem('panda_draft_booking') || 'null');
    return draft?.resumeAfterAuth === true;
  } catch {
    return false;
  }
};

export const clearGoogleAuthIntent = () => {
  localStorage.removeItem(GOOGLE_AUTH_INTENT_KEY);
};
