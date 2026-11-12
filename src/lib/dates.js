// Dates stockées en texte (AAAA-MM-JJ, HH:MM) et toujours analysées en heure LOCALE.
export const pad = n => String(n).padStart(2, '0');
export const isoDay = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
export const today = () => new Date();
export const startOf = e => { const [y, m, d] = e.date.split('-').map(Number); const [h, mi] = e.time.split(':').map(Number); return new Date(y, m - 1, d, h, mi); };
// Un événement reste « à venir » jusqu'à 4 h après son début
export const isUpcoming = e => startOf(e).getTime() + 4 * 3600e3 >= Date.now();
export const fmtLong = e => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(startOf(e));
export const fmtTime = e => e.time.replace(':', ' h ');
export const monthLabel = dt => new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(dt);
export const shortDow = d => new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d).replace('.', '');
export const shortMon = d => new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d).replace('.', '');
export const relDay = e => {
  const s = startOf(e), t = today();
  const diff = Math.round((new Date(s.getFullYear(), s.getMonth(), s.getDate()) - new Date(t.getFullYear(), t.getMonth(), t.getDate())) / 864e5);
  return diff === 0 ? "aujourd'hui" : diff === 1 ? 'demain' : null;
};
