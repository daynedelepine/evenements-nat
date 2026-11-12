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

// Fichier agenda (.ics) : détails, rappels (veille et 2 h avant), statut selon l'inscription (reg = { people, status }).
const enc = new TextEncoder();
const fold = l => {   // lignes de 75 octets au plus (RFC 5545), coupure sur un caractère entier
  const out = []; let rest = l;
  while (enc.encode(rest).length > 74) { let n = 74; while (enc.encode(rest.slice(0, n)).length > 74) n--; out.push(rest.slice(0, n)); rest = ' ' + rest.slice(n); }
  return [...out, rest].join('\r\n');
};
export function icsFile(e, reg) {
  const s = startOf(e), end = new Date(s.getTime() + 3 * 3600e3);
  const f = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const clean = t => String(t).replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n');
  const wait = reg?.status === 'wait', url = location.origin + '/';
  const mine = !reg ? '' : wait ? 'Vous êtes sur liste d’attente : Nat vous prévient si une place se libère.'
    : `Place réservée pour ${reg.people} personne${reg.people > 1 ? `s (vous + ${reg.people - 1})` : ''}.`;
  const desc = [e.desc, mine, `Adresse : ${e.place}`, `Itinéraire : ${mapsLink(e)}`, `Pour annuler : ${url}#mes-inscriptions`, `Contact : Nat, WhatsApp +${NAT_PHONE}`].filter(Boolean).join('\n');
  const alarm = (trig, txt) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${clean(txt)}`, `TRIGGER:${trig}`, 'END:VALARM'];
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Evenements Nat//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', `UID:${e.id}@evenements-nat`, `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d+/g, '')}`,
    `DTSTART:${f(s)}`, `DTEND:${f(end)}`, `SUMMARY:${clean((wait ? '(Attente) ' : '') + e.name)}`, `LOCATION:${clean(e.place)}`, `DESCRIPTION:${clean(desc)}`,
    `CATEGORIES:${clean(CATS[e.cat]?.label || '')}`, `STATUS:${e.cancelled ? 'CANCELLED' : wait ? 'TENTATIVE' : 'CONFIRMED'}`, `URL:${url}`,
    ...(wait ? [] : [...alarm('-P1D', `Demain : ${e.name}`), ...alarm('-PT2H', `Dans 2 h : ${e.name}`)]), 'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n');
  download(`${e.name.replace(/\W+/g, '-')}.ics`, body, 'text/calendar');
}
export const confirmText = (e, n, p) => `Bonjour Nat, c'est ${n}. Je confirme ma venue à « ${e.name} » le ${fmtLong(e)} à ${fmtTime(e)}${p > 1 ? ` (${p} personnes, moi + ${p - 1})` : ''}. À bientôt !`;
export const cancelText = (e, n, p) => `Bonjour Nat, c'est ${n}. Je dois annuler mon inscription à « ${e.name} » le ${fmtLong(e)}${p > 1 ? ` (${p} personnes)` : ''}. Désolé(e) et merci !`;
