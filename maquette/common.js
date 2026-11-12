/* Maquette Événements Nat — utilitaires et données FICTIVES partagés. */
const NAT_PHONE = '33663081980'; // numéro de contact déjà public sur le site actuel

/* ---------- Icônes (SVG en ligne, jeu homogène) ---------- */
const ICONS = {
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  chat:'<path d="M21 11.5a8.4 8.4 0 0 1-12.5 7.3L3 20l1.3-5A8.4 8.4 0 1 1 21 11.5z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  check:'<path d="M20 6L9 17l-5-5"/>',
  x:'<path d="M18 6L6 18M6 6l12 12"/>',
  left:'<path d="M15 18l-6-6 6-6"/>',
  right:'<path d="M9 18l6-6-6-6"/>',
  ticket:'<path d="M3 9V6h18v3a2 2 0 0 0 0 6v3H3v-3a2 2 0 0 0 0-6z"/><path d="M13 6v2M13 11v2M13 16v2"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  minus:'<path d="M5 12h14"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  printer:'<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  edit:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  route:'<path d="M3 11l19-9-9 19-2-8z"/>',
  wifioff:'<path d="M1 1l22 22M16.7 11.1A11 11 0 0 1 21 13.6M5 13.6a11 11 0 0 1 5.2-2.5M8.5 17a6 6 0 0 1 7 0M12 20.5h.01"/>',
  coffee:'<path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM6 2v3M10 2v3M14 2v3"/>',
  utensils:'<path d="M3 2v7a3 3 0 0 0 3 3v10M6 2v7M9 2v7a3 3 0 0 1-3 3M19 2c-2 1-3 4-3 7s1 4 3 4v9"/>',
  glass:'<path d="M8 22h8M12 15v7M7 3h10l-1 7a4 4 0 0 1-8 0z"/>',
  chart:'<path d="M18 20V10M12 20V4M6 20v-6"/>',
  lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  undo:'<path d="M3 7v6h6M3 13a9 9 0 1 0 3-7"/>',
  phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  repeat:'<path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>',
  user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
};
const ic = (n, c = '') => `<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- Catégories ---------- */
const CATS = {
  cafes:  { label: 'Cafés Nat',       cls: 'cat-cafes',  icon: 'coffee' },
  tables: { label: "Tables d'hôtes",  cls: 'cat-tables', icon: 'utensils' },
  aperos: { label: 'ApéroNus',        cls: 'cat-aperos', icon: 'glass' },
};

/* ---------- Dates (analyse en heure LOCALE : corrige le décalage de fuseau) ---------- */
const pad = n => String(n).padStart(2, '0');
const isoDay = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
const TODAY = new Date();
const dayOffset = n => isoDay(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + n));
const startOf = e => { const [y, m, d] = e.date.split('-').map(Number); const [h, mi] = e.time.split(':').map(Number); return new Date(y, m - 1, d, h, mi); };
// Un événement reste « à venir » jusqu'à 4 h après son début (corrige la disparition des événements du jour)
const isUpcoming = e => startOf(e).getTime() + 4 * 3600e3 >= Date.now();
const fmtLong = e => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(startOf(e));
const fmtTime = e => e.time.replace(':', ' h ');
const monthLabel = dt => new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(dt);
const relDay = e => {
  const diff = Math.round((new Date(startOf(e).getFullYear(), startOf(e).getMonth(), startOf(e).getDate()) - new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate())) / 864e5);
  return diff === 0 ? "aujourd'hui" : diff === 1 ? 'demain' : null;
};

/* ---------- Données fictives ---------- */
const EVENTS = [
  { id: 'e1', cat: 'aperos', name: "ApéroNus d'automne",   date: dayOffset(0),   time: '21:00', place: 'Le Petit Salon, 12 rue des Tilleuls', max: 12, taken: 9,  wait: 0, created: dayOffset(-1), desc: "Une soirée détendue autour d'un buffet de saison. Venez comme vous êtes, dans le respect et la discrétion." },
  { id: 'e2', cat: 'cafes',  name: 'Café Nat du dimanche',  date: dayOffset(3),   time: '10:00', place: 'Chez Nat, 5 place du Marché',        max: 8,  taken: 3,  wait: 0, created: dayOffset(-9), desc: 'Un café tranquille pour faire connaissance, sans programme imposé.' },
  { id: 'e3', cat: 'tables', name: "Table d'hôtes aux champignons", date: dayOffset(6), time: '19:30', place: 'La Maison Verte, 8 chemin des Vignes', max: 10, taken: 10, wait: 2, created: dayOffset(-12), desc: 'Menu complet préparé par Nat, une table partagée de 10 convives. Prévenez-moi de vos allergies.' },
  { id: 'e4', cat: 'aperos', name: 'ApéroNus de novembre',  date: dayOffset(10),  time: '20:00', place: 'Le Petit Salon, 12 rue des Tilleuls', max: 12, taken: 10, wait: 0, created: dayOffset(-15), desc: 'Dernière édition avant les fêtes. Les places partent vite.' },
  { id: 'e5', cat: 'tables', name: "Table d'hôtes d'hiver",  date: dayOffset(17),  time: '12:30', place: 'La Maison Verte, 8 chemin des Vignes', max: 8,  taken: 2,  wait: 0, created: dayOffset(-3), desc: 'Déjeuner de saison autour de plats mijotés.' },
  { id: 'e6', cat: 'cafes',  name: 'Café Nat de décembre',  date: dayOffset(25),  time: '15:00', place: 'Chez Nat, 5 place du Marché',        max: 10, taken: 0,  wait: 0, created: dayOffset(0),  desc: 'Café-gourmandises de fin d’année.' },
  { id: 'e7', cat: 'aperos', name: 'ApéroNus du Nouvel An', date: dayOffset(38),  time: '20:30', place: 'Le Petit Salon, 12 rue des Tilleuls', max: 14, taken: 4,  wait: 0, created: dayOffset(-2), desc: 'Pour démarrer l’année en douceur.' },
  { id: 'p1', cat: 'cafes',  name: 'Café Nat de la rentrée', date: dayOffset(-6),  time: '10:00', place: 'Chez Nat, 5 place du Marché',        max: 8,  taken: 7,  wait: 0, created: dayOffset(-20), desc: '' },
  { id: 'p2', cat: 'tables', name: "Table d'hôtes d'octobre", date: dayOffset(-13), time: '19:30', place: 'La Maison Verte, 8 chemin des Vignes', max: 10, taken: 10, wait: 0, created: dayOffset(-25), desc: '' },
];
const byId = id => EVENTS.find(e => e.id === id);
const seats = e => {
  const left = Math.max(e.max - e.taken, 0), pct = Math.min(100, Math.round(e.taken / e.max * 100));
  const full = left === 0, low = !full && left <= 2;
  const text = full ? `Complet · ${e.wait ? e.wait + ' en liste d’attente' : 'liste d’attente ouverte'}` : low ? `Plus que ${left} place${left > 1 ? 's' : ''}` : `${left} places restantes`;
  return { left, pct, full, low, text, tone: full ? 'full' : low ? 'low' : 'ok' };
};
const isNew = e => (Date.now() - new Date(e.created + 'T00:00').getTime()) < 48 * 3600e3;

/* Participants fictifs (téléphones volontairement irréels) */
const NAMES = ['Camille R.', 'Julien M.', 'Sophie L.', 'Marc T.', 'Léa B.', 'Antoine D.', 'Inès K.', 'Paul V.', 'Nadia H.', 'Hugo P.', 'Clara S.', 'Yanis F.'];
const makeParticipants = e => Array.from({ length: Math.min(e.taken, NAMES.length) }, (_, i) => ({
  id: `${e.id}-${i}`, name: NAMES[i], phone: `06 00 00 00 ${pad(i + 1)}`, people: i % 5 === 3 ? 2 : 1,
  note: i === 2 ? 'Végétarienne' : i === 6 ? 'Allergie noix' : '', present: e.date < dayOffset(0) ? i % 6 !== 5 : false,
}));

/* ---------- Utilitaires ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible : la maquette fonctionne sans */ } },
};
const waLink = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
const mapsLink = e => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.place)}`;
const toLocalPhone = p => { const c = p.replace(/[\s.\-]/g, '').replace(/^\+33/, '0'); return c; };
const validPhone = p => /^0[1-9]\d{8}$/.test(toLocalPhone(p)); // normalisation avant comparaison (doublons)
const formatPhone = v => v.replace(/\D/g, '').slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ').trim();
const intlPhone = p => '33' + toLocalPhone(p).slice(1);

function icsFile(e) {
  const s = startOf(e), end = new Date(s.getTime() + 3 * 3600e3);
  const f = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Evenements Nat//maquette//FR', 'BEGIN:VEVENT', `UID:${e.id}@evenements-nat`, `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(s)}`, `DTEND:${f(end)}`, `SUMMARY:${e.name}`, `LOCATION:${e.place}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  download(`${e.name.replace(/\W+/g, '-')}.ics`, body, 'text/calendar');
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type: type + ';charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Toasts (remplacent alert/confirm) ---------- */
function toast(msg, action) {
  const box = $('#toasts'), el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
  if (action) $('button', el).addEventListener('click', () => { action.fn(); el.remove(); });
  box.append(el); setTimeout(() => el.remove(), action ? 6000 : 3500);
}

/* ---------- Thème clair / sombre / auto ---------- */
function initTheme() {
  const root = document.documentElement, saved = store.get('nat-theme', null);
  if (saved) root.dataset.theme = saved;
  const btn = $('#theme-btn');
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const paint = () => { btn.innerHTML = ic(isDark() ? 'sun' : 'moon'); btn.setAttribute('aria-label', isDark() ? 'Passer en mode clair' : 'Passer en mode sombre'); };
  btn.addEventListener('click', () => { root.dataset.theme = isDark() ? 'light' : 'dark'; store.set('nat-theme', root.dataset.theme); paint(); });
  paint();
}

/* ---------- Logo ---------- */
const LOGO = `<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="12" fill="var(--primary)"/><path d="M11 17h15v7a5 5 0 0 1-5 5h-5a5 5 0 0 1-5-5z" fill="none" stroke="var(--on-primary)" stroke-width="2.4" stroke-linejoin="round"/><path d="M26 19h1.5a2.7 2.7 0 0 1 0 5.4H26M15 10c-1 1.3 1 2.3 0 3.6M20 10c-1 1.3 1 2.3 0 3.6" fill="none" stroke="var(--on-primary)" stroke-width="2.2" stroke-linecap="round"/></svg>`;

/* ---------- Boîte de dialogue : ouverture / fermeture ---------- */
function openSheet(dlg, html) {
  if (html !== undefined) $('.sheet-slot', dlg).innerHTML = html;
  if (!dlg.open) dlg.showModal();
}
document.addEventListener('click', e => {
  const dlg = e.target.closest('dialog');
  if (e.target.closest('[data-close]')) e.target.closest('dialog').close();
  else if (dlg && e.target === dlg) dlg.close(); // clic sur le fond
});
