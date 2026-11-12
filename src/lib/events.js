import { startOf, pad, fmtLong, fmtTime } from './dates.js';
import { download } from './dom.js';

export const NAT_PHONE = '33663081980'; // numéro de contact déjà public sur le site
export const CATS = {
  cafes:  { label: 'Cafés Nat',      cls: 'cat-cafes',  icon: 'coffee' },
  tables: { label: "Tables d'hôtes", cls: 'cat-tables', icon: 'utensils' },
  aperos: { label: 'ApéroNus',       cls: 'cat-aperos', icon: 'glass' },
};
const CAT_BY_LABEL = Object.fromEntries(Object.entries(CATS).map(([k, c]) => [c.label, k]));

// Modèle de la base (inchangé depuis le jalon 1) -> modèle interne de l'interface
export function normalize(id, v) {
  return {
    id, name: v.name || '', cat: CAT_BY_LABEL[v.category] || 'cafes', date: v.date, time: v.time,
    place: v.location || '', max: Number(v.maxParticipants) || 0, taken: Number(v.taken) || 0,
    desc: v.description || '', created: v.createdAt || '', deleted: Number(v.deletedAt) || 0, cancelled: v.cancelled === true,
  };
}
export const toDb = e => ({
  name: e.name, category: CATS[e.cat].label, date: e.date, time: e.time, location: e.place,
  maxParticipants: e.max, taken: e.taken ?? 0, createdAt: e.created || new Date().toISOString(),
  ...(e.desc ? { description: e.desc } : {}),
});

// Modèles par catégorie (valeurs proposées à la création, modifiables ensuite)
export const TEMPLATES = {
  cafes:  { name: 'Café Nat', time: '10:00', place: 'Chez Nat, 5 place du Marché', max: 8, desc: 'Un café tranquille pour faire connaissance.' },
  tables: { name: "Table d'hôtes", time: '19:30', place: 'La Maison Verte, 8 chemin des Vignes', max: 10, desc: 'Menu complet préparé par Nat. Prévenez-moi de vos allergies.' },
  aperos: { name: 'ApéroNus', time: '20:00', place: 'Le Petit Salon, 12 rue des Tilleuls', max: 12, desc: 'Soirée détendue, dans le respect et la discrétion.' },
};

export const seats = e => {
  const left = Math.max(e.max - e.taken, 0), pct = e.max ? Math.min(100, Math.round(e.taken / e.max * 100)) : 100;
  const full = left === 0, low = !full && left <= 2;
  const text = full ? 'Complet · liste d’attente ouverte' : low ? `Plus que ${left} place${left > 1 ? 's' : ''}` : `${left} places restantes`;
  return { left, pct, full, low, text, tone: full ? 'full' : low ? 'low' : 'ok' };
};
export const isNew = e => e.created && (Date.now() - new Date(e.created).getTime()) < 48 * 3600e3;

export const waLink = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
export const mapsLink = e => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.place)}`;

export function icsFile(e) {
  const s = startOf(e), end = new Date(s.getTime() + 3 * 3600e3);
  const f = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const clean = t => String(t).replace(/[\r\n]+/g, ' ').replace(/([,;\\])/g, '\\$1');
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Evenements Nat//FR', 'BEGIN:VEVENT', `UID:${e.id}@evenements-nat`, `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(s)}`, `DTEND:${f(end)}`, `SUMMARY:${clean(e.name)}`, `LOCATION:${clean(e.place)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  download(`${e.name.replace(/\W+/g, '-')}.ics`, body, 'text/calendar');
}
export const confirmText = (e, n, p) => `Bonjour Nat, c'est ${n}. Je confirme ma venue à « ${e.name} » le ${fmtLong(e)} à ${fmtTime(e)}${p > 1 ? ` (${p} personnes)` : ''}. À bientôt !`;
