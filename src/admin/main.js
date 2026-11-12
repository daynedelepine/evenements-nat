import '../styles/fonts.css';
import '../styles/main.css';
import { ref, push, update, onValue } from 'firebase/database';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, getAuthInstance, ADMIN_UID } from '../firebase.js';
import { ic, LOGO } from '../lib/icons.js';
import { $, $$, toast, initTheme, openSheet, initOfflineBanner } from '../lib/dom.js';
import { normalize, toDb } from '../lib/events.js';
import { stats, eventCards, guestsSheet, deleteSheet, formSheet } from './views.js';

const auth = getAuthInstance();
const sheet = $('#sheet');
let events = [], registrations = {};
let unsubEvents = null, unsubRegs = null, openGuests = null;
const byId = id => events.find(e => e.id === id);

$('#logo').innerHTML = LOGO;
$('[data-new]').innerHTML = ic('plus') + 'Nouvel événement';
initTheme();
initOfflineBanner();

function render() {
  $('#stats').innerHTML = stats(events);
  $('#admin-events').innerHTML = eventCards(events);
  if (openGuests && sheet.open && byId(openGuests)) openSheet(sheet, guestsSheet(byId(openGuests), registrations[openGuests]));
}

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

/* ---------- Création d'un événement ---------- */
function openForm() {
  openSheet(sheet, formSheet());
  $('#ev-form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const e = { cat: $('#x-cat').value, name: $('#x-name').value.trim(), date: $('#x-date').value, time: $('#x-time').value,
      place: $('#x-place').value.trim(), max: Math.round(Number($('#x-max').value)), desc: $('#x-desc').value.trim(), taken: 0 };
    const err = $('#x-err');
    if (!e.name || !e.date || !e.time || !e.place || !(e.max >= 1 && e.max <= 100)) { err.textContent = 'Renseignez le nom, la date, l’heure, le lieu et un nombre de places entre 1 et 100.'; err.hidden = false; return; }
    err.hidden = true; $('#x-save').disabled = true;
    try {
      await update(ref(db), { [`events/${push(ref(db, 'events')).key}`]: toDb(e) });
      sheet.close(); toast('Événement créé.');
    } catch (e2) { console.error(e2.code || e2); err.textContent = 'Enregistrement impossible. Réessayez.'; err.hidden = false; $('#x-save').disabled = false; }
  });
}

/* ---------- Actions (délégation) ---------- */
document.addEventListener('click', async ev => {
  const t = ev.target.closest('[data-new],[data-guests],[data-del],[data-confirmdel],[data-remove]');
  if (!t) return;
  const d = t.dataset;
  if ('new' in d) openForm();
  else if (d.guests) { openGuests = d.guests; openSheet(sheet, guestsSheet(byId(d.guests), registrations[d.guests])); }
  else if (d.del) { openGuests = null; openSheet(sheet, deleteSheet(byId(d.del))); }
  else if (d.confirmdel) {
    try {
      await update(ref(db), { [`events/${d.confirmdel}`]: null, [`registrations/${d.confirmdel}`]: null, [`phones/${d.confirmdel}`]: null });
      sheet.close(); toast('Événement supprimé.');
    } catch (e) { console.error(e.code || e); toast('Suppression impossible.'); }
  }
  else if (d.remove) {
    const eid = openGuests, r = registrations[eid]?.[d.remove], e = byId(eid);
    if (!r || !e) return;
    const updates = { [`registrations/${eid}/${d.remove}`]: null, [`phones/${eid}/${r.phone}`]: null };
    if (r.status !== 'wait') updates[`events/${eid}/taken`] = Math.max(0, e.taken - (r.people || 1));
    try { await update(ref(db), updates); toast('Participant retiré.'); }
    catch (e2) { console.error(e2.code || e2); toast('Retrait impossible.'); }
  }
});
$$('[data-i]').forEach(s => { s.outerHTML = ic(s.dataset.i); });
