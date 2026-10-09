export const BUSINESS_TIME_ZONE = 'America/Caracas';
export const BUSINESS_UTC_OFFSET = '-04:00';

export const getBusinessDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const businessDateStart = dateKey => new Date(`${dateKey}T00:00:00${BUSINESS_UTC_OFFSET}`);
export const businessDateEnd = dateKey => new Date(`${dateKey}T23:59:59.999${BUSINESS_UTC_OFFSET}`);

export const getBusinessDayRange = (date = new Date()) => {
  const dateKey = getBusinessDateKey(date);
  const start = businessDateStart(dateKey);
  const endExclusive = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { dateKey, start, endExclusive };
};

export const getBusinessMonthStart = (date = new Date()) => {
  const dateKey = getBusinessDateKey(date);
  return businessDateStart(`${dateKey.slice(0, 7)}-01`);
};

export const getBusinessWeekStart = (date = new Date()) => {
  const dayStart = businessDateStart(getBusinessDateKey(date));
  const dayOfWeek = dayStart.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return new Date(dayStart.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
};

export const getOperationalDate = appointment => {
  const value = appointment?.accounting_at || appointment?.completed_at || appointment?.scheduled_at || appointment?.created_at;
  return value ? new Date(value) : null;
};

// "yyyy-mm-dd" (what the DB and <input type="date"> use) <-> "dd/mm/aaaa" (what the user types).
export const isoToDisplay = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
};

// Formats digits-as-typed into "dd/mm/aaaa", inserting the slashes automatically instead of
// requiring the user to type them. Returns both the display string and, once all 8 digits
// are in, the ISO value to actually store — birth_date stays empty (it's optional) until the
// date is complete.
export const formatBirthDateInput = (rawValue) => {
  const digits = rawValue.replace(/\D/g, '').slice(0, 8);
  let display = digits;
  if (digits.length > 4) display = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  else if (digits.length > 2) display = `${digits.slice(0, 2)}/${digits.slice(2)}`;

  let iso = '';
  if (digits.length === 8) {
    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);
    iso = `${year}-${month}-${day}`;
  }
  return { display, iso };
};
