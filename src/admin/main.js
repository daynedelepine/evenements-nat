import '../styles/fonts.css';
import '../styles/main.css';
import { ref, push, update, onValue } from 'firebase/database';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, getAuthInstance, ADMIN_UID } from '../firebase.js';
import { ic, LOGO } from '../lib/icons.js';
import { $, $$, toast, initTheme, openSheet, initOfflineBanner, download } from '../lib/dom.js';
import { CATS, TEMPLATES, normalize, toDb, waLink } from '../lib/events.js';
import { toLocalPhone, validPhone, formatPhone } from '../lib/phone.js';
import { dashboard, eventCards, trashView, purgeSheet, guestsSheet, addGuestSheet, bulkSheet, formSheet, guestRows } from './views.js';

const auth = getAuthInstance();
const sheet = $('#sheet');
let events = [], registrations = {};
let unsubEvents = null, unsubRegs = null;
let openGuests = null; // identifiant de l'événement dont la liste d'inscrits est affichée (rafraîchie en direct)
const byId = id => events.find(e => e.id === id);

$('#logo').innerHTML = LOGO;
$('[data-new]').innerHTML = ic('plus') + 'Nouvel événement';
initTheme();
initOfflineBanner();

function render() {
  $('#v-dash').innerHTML = dashboard(events, registrations);
  $('#admin-events').innerHTML = eventCards(events, registrations);
  $('#v-trash').innerHTML = trashView(events);
  const n = events.filter(e => e.deleted).length;
  $('#trash-count').textContent = n ? `(${n})` : '';
  $$('#v-dash [data-i],#v-trash [data-i]').forEach(x => { x.outerHTML = ic(x.dataset.i); });
  if (openGuests && sheet.open) {
    const e = byId(openGuests);
    if (!e) { sheet.close(); return; }
    const body = $('.sheet-body', sheet), top = body ? body.scrollTop : 0;
    openSheet(sheet, guestsSheet(e, registrations[openGuests]));
    $('.sheet-body', sheet).scrollTop = top;
  }
}
sheet.addEventListener('close', () => { openGuests = null; });

$$('#app .tab').forEach(b => b.addEventListener('click', () => {
  $$('#app .tab').forEach(x => x.setAttribute('aria-selected', x === b));
  ['dash', 'events', 'trash'].forEach(v => { $('#v-' + v).hidden = v !== b.dataset.tab; });
}));

function showError(msg) { const el = $('#login-error'); el.textContent = msg; el.hidden = !msg; }

/* ---------- Connexion (Firebase Authentication, compte unique) ---------- */
$('#login-form').addEventListener('submit', async ev => {
  ev.preventDefault(); showError('');
  const btn = $('#login-btn'); btn.disabled = true;
  try { await signInWithEmailAndPassword(auth, $('#a-mail').value.trim(), $('#a-pass').value); }
  catch { showError('Identifiants incorrects.'); }
  finally { btn.disabled = false; }
});
$('#logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, user => {
  if (user && user.uid !== ADMIN_UID) { signOut(auth); showError('Ce compte n’est pas autorisé.'); return; }
  const on = !!user;
  $('#login-view').hidden = on; $('#app').hidden = !on; $('#logout').hidden = !on;
  unsubEvents?.(); unsubRegs?.(); unsubEvents = unsubRegs = null;
  if (on) {
    $('#a-pass').value = '';
    unsubEvents = onValue(ref(db, 'events'), s => { events = Object.entries(s.val() || {}).map(([id, e]) => normalize(id, e)); render(); });
    unsubRegs = onValue(ref(db, 'registrations'), s => { registrations = s.val() || {}; render(); },
      err => { console.error('Lecture des inscriptions refusée :', err.code); toast('Lecture des inscriptions refusée.'); });
  } else { events = []; registrations = {}; openGuests = null; sheet.open && sheet.close(); }
});

/* ---------- Écriture ---------- */
// Applique une mise à jour multi-chemins ; message d'échec commun.
async function write(updates, okMsg, failMsg) {
  try { await update(ref(db), updates); if (okMsg) toast(okMsg); return true; }
  catch (e) { console.error(e.code || e); if (failMsg) toast(failMsg); return false; }
}
const showGuests = id => { openGuests = id; openSheet(sheet, guestsSheet(byId(id), registrations[id])); };

/* ---------- Création / modification / duplication ---------- */
function openForm({ id, dupId } = {}) {
  const event = id && byId(id), dupOf = dupId && byId(dupId);
  openGuests = null;
  openSheet(sheet, formSheet({ event, dupOf }));
  const tpl = $('#x-tpl');
  tpl?.addEventListener('change', () => {
    const t = TEMPLATES[tpl.value]; if (!t) return;
    $('#x-name').value = t.name; $('#x-cat').value = tpl.value; $('#x-time').value = t.time;
    $('#x-place').value = t.place; $('#x-max').value = t.max; $('#x-desc').value = t.desc;
  });
  $('#ev-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const e = { cat: $('#x-cat').value, name: $('#x-name').value.trim(), date: $('#x-date').value, time: $('#x-time').value,
      place: $('#x-place').value.trim(), max: Math.round(Number($('#x-max').value)), desc: $('#x-desc').value.trim(), taken: 0 };
    const err = $('#x-err'), fail = m => { err.textContent = m; err.hidden = false; };
    if (!e.name || !e.date || !e.time || !e.place || !(e.max >= 1 && e.max <= 100)) return fail('Renseignez le nom, la date, l’heure, le lieu et un nombre de places entre 1 et 100.');
    if (event && e.max < event.taken) return fail(`Il y a déjà ${event.taken} places réservées : le maximum ne peut pas être inférieur.`);
    err.hidden = true; $('#x-save').disabled = true;
    const ok = event
      ? await write({
        [`events/${id}/name`]: e.name, [`events/${id}/category`]: CATS[e.cat].label, [`events/${id}/date`]: e.date, [`events/${id}/time`]: e.time,
        [`events/${id}/location`]: e.place, [`events/${id}/maxParticipants`]: e.max, [`events/${id}/description`]: e.desc || null,
      }, 'Événement modifié.', null)
      : await write({ [`events/${push(ref(db, 'events')).key}`]: toDb(e) }, dupOf ? 'Événement dupliqué.' : 'Événement créé.', null);
    if (ok) sheet.close(); else { fail('Enregistrement impossible. Réessayez.'); $('#x-save').disabled = false; }
  });
}

/* ---------- Inscrits : ajout manuel ---------- */
function openAddGuest(eid) {
  const e = byId(eid);
  openSheet(sheet, addGuestSheet(e));
  const ph = $('#g-phone'); ph.addEventListener('input', () => { ph.value = formatPhone(ph.value); });
  $('#add-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const name = $('#g-name').value.trim().replace(/\s+/g, ' '), phone = toLocalPhone(ph.value), people = Math.round(Number($('#g-people').value)), note = $('#g-note').value.trim();
    const err = $('#g-err'), fail = m => { err.textContent = m; err.hidden = false; };
    if (name.length < 2) return fail('Indiquez un nom (2 caractères au moins).');
    if (!validPhone(ph.value)) return fail('Numéro de téléphone français invalide.');
    if (!(people >= 1 && people <= 4)) return fail('Entre 1 et 4 personnes.');
    if (Object.values(registrations[eid] || {}).some(r => r.phone === phone)) return fail('Ce numéro est déjà inscrit à cet événement.');
    const wait = e.taken + people > e.max, key = push(ref(db, `registrations/${eid}`)).key;
    const updates = {
      [`registrations/${eid}/${key}`]: { name, phone, people, status: wait ? 'wait' : 'ok', createdAt: Date.now(), ...(note ? { note } : {}) },
      [`phones/${eid}/${phone}`]: key,
    };
    if (!wait) updates[`events/${eid}/taken`] = e.taken + people;
    $('#g-save').disabled = true;
    if (await write(updates, wait ? 'Plus assez de places : ajouté(e) en liste d’attente.' : 'Participant ajouté.', null)) showGuests(eid);
    else { fail('Ajout impossible. Réessayez.'); $('#g-save').disabled = false; }
  });
}

/* ---------- Message groupé / annulation ---------- */
function openBulk(eid, cancel) {
  openGuests = null;
  openSheet(sheet, bulkSheet(byId(eid), registrations[eid], cancel));
  const upd = () => $$('#b-list a').forEach(a => { a.href = waLink(a.dataset.phone, $('#b-msg').value); });
  $('#b-msg').addEventListener('input', upd);
  sheet.dataset.eid = eid;
}

/* ---------- Export CSV ---------- */
const csvCell = v => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // évite l'interprétation comme formule par le tableur
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function exportCsv(eid) {
  const e = byId(eid), g = guestRows(registrations[eid]);
  const lines = [['Nom', 'Téléphone', 'Personnes', 'Statut', 'Remarque', 'Présent'], ...g.all.map(r => [r.name, r.phone, r.people, r.status === 'wait' ? 'attente' : 'inscrit', r.note || '', r.status === 'wait' ? '' : r.present ? 'oui' : 'non'])];
  download(`inscrits-${e.date}-${e.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').slice(0, 40)}.csv`, '﻿' + lines.map(l => l.map(csvCell).join(';')).join('\r\n'), 'text/csv');
}

/* ---------- Actions (délégation) ---------- */
document.addEventListener('click', async ev => {
  const t = ev.target.closest('[data-new],[data-edit],[data-dup],[data-guests],[data-del],[data-restore],[data-purge],[data-confirmpurge],[data-cancelev],[data-confirmcancel],[data-uncancel],[data-bulk],[data-csv],[data-print],[data-add],[data-back],[data-remove],[data-promote],[data-recount]');
  if (!t) return;
  const d = t.dataset, eid = openGuests || sheet.dataset.eid;
  if ('new' in d) openForm();
  else if (d.edit) openForm({ id: d.edit });
  else if (d.dup) openForm({ dupId: d.dup });
  else if (d.guests) showGuests(d.guests);
  else if ('back' in d) showGuests(sheet.dataset.eid);
  else if ('add' in d) { sheet.dataset.eid = openGuests; openGuests = null; openAddGuest(sheet.dataset.eid); }
  else if ('bulk' in d) { const id = openGuests; openBulk(id, false); }
  else if (d.cancelev) openBulk(d.cancelev, true);
  else if ('confirmcancel' in d) { if (await write({ [`events/${eid}/cancelled`]: true }, 'Événement marqué comme annulé.', 'Annulation impossible.')) sheet.close(); }
  else if (d.uncancel) write({ [`events/${d.uncancel}/cancelled`]: null }, 'Événement rétabli.', 'Opération impossible.');
  else if (d.del) {
    const e = byId(d.del);
    if (await write({ [`events/${d.del}/deletedAt`]: Date.now() }, null, 'Suppression impossible.'))
      toast(`« ${e.name} » déplacé dans la corbeille.`, { label: 'Annuler', fn: () => write({ [`events/${d.del}/deletedAt`]: null }, 'Événement restauré.', 'Restauration impossible.') });
  }
  else if (d.restore) write({ [`events/${d.restore}/deletedAt`]: null }, 'Événement restauré.', 'Restauration impossible.');
  else if (d.purge) { openGuests = null; openSheet(sheet, purgeSheet(byId(d.purge))); }
  else if (d.confirmpurge) {
    // Les règles n'autorisent l'écriture qu'au niveau de chaque inscription / numéro : on les efface une à une.
    const id = d.confirmpurge, updates = { [`events/${id}`]: null };
    for (const [rid, r] of Object.entries(registrations[id] || {})) { updates[`registrations/${id}/${rid}`] = null; updates[`phones/${id}/${r.phone}`] = null; }
    if (await write(updates, 'Événement supprimé définitivement.', 'Suppression impossible.')) sheet.close();
  }
  else if ('csv' in d) exportCsv(openGuests);
  else if ('print' in d) window.print();
  else if (d.remove) {
    const r = registrations[openGuests]?.[d.remove], e = byId(openGuests);
    if (!r || !e) return;
    const updates = { [`registrations/${openGuests}/${d.remove}`]: null, [`phones/${openGuests}/${r.phone}`]: null };
    if (r.status !== 'wait') updates[`events/${openGuests}/taken`] = Math.max(0, e.taken - (r.people || 1));
    write(updates, 'Participant retiré.', 'Retrait impossible.');
  }
  else if (d.promote) {
    const r = registrations[openGuests]?.[d.promote], e = byId(openGuests);
    if (!r || !e) return;
    if (e.taken + r.people > e.max) { toast(`Pas assez de places (${e.max - e.taken} libre(s) pour ${r.people} personne(s)).`); return; }
    write({ [`registrations/${openGuests}/${d.promote}/status`]: 'ok', [`events/${openGuests}/taken`]: e.taken + r.people },
      `${r.name} promu(e) : pensez à le/la prévenir par WhatsApp.`, 'Promotion impossible.');
  }
  else if ('recount' in d) recount();
});

// Pointage des présences
document.addEventListener('change', ev => {
  const c = ev.target.closest('[data-present]');
  if (!c || !openGuests) return;
  update(ref(db), { [`registrations/${openGuests}/${c.dataset.present}/present`]: c.checked })
    .catch(e => { console.error(e.code || e); toast('Pointage impossible.'); c.checked = !c.checked; });
});

// Recalcule « taken » = somme des personnes inscrites (hors liste d'attente), événement par événement
async function recount() {
  const todo = events.filter(e => !e.deleted).map(e => ({ e, n: Object.values(registrations[e.id] || {}).filter(r => r.status !== 'wait').reduce((s, r) => s + (r.people || 0), 0) }))
    .filter(({ e, n }) => e.taken !== n);
  if (!todo.length) { toast('Tous les compteurs sont déjà justes.'); return; }
  const res = await Promise.allSettled(todo.map(({ e, n }) => update(ref(db), { [`events/${e.id}/taken`]: n })));
  const bad = res.filter(r => r.status === 'rejected').length;
  toast(bad ? `${todo.length - bad} compteur(s) corrigé(s), ${bad} refusé(s) (inscrits > places ?).` : `${todo.length} compteur(s) corrigé(s).`);
}

$$('[data-i]').forEach(s => { s.outerHTML = ic(s.dataset.i); });
