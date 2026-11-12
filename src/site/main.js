import '../styles/fonts.css';
import '../styles/main.css';
import { ref, push, update, onValue, get } from 'firebase/database';
import { db } from '../firebase.js';
import { ic, LOGO } from '../lib/icons.js';
import { $, $$, esc, store, initTheme, openSheet, initOfflineBanner, toast } from '../lib/dom.js';
import { CATS, normalize, seats, waLink, NAT_PHONE, icsFile, confirmText, cancelText } from '../lib/events.js';
import { startOf, isUpcoming, fmtLong, fmtTime, relDay } from '../lib/dates.js';
import { validPhone, toLocalPhone, formatPhone } from '../lib/phone.js';
import { card, skeletons, empty, filtered, renderList, renderMonth, renderMine, eventSheet, formSheet, successSheet, cancelSheet, cancelledSheet } from './views.js';

const state = { tab: 'events', cat: 'all', free: false, view: 'list', month: 0, day: null, past: false };
let events = [];          // événements normalisés
let loaded = false;       // données disponibles (réseau ou copie locale) ?
let loadError = false;
let regs = store.get('nat-regs', []);   // inscriptions de cet appareil : { id, eventId, name, people, status }
const me = store.get('nat-me', { name: '', phone: '' });
const byId = id => events.find(e => e.id === id);
const mineIds = () => new Map(regs.filter(r => r.status !== 'removed').map(r => [r.eventId, r]));   // événement -> inscription
const saveRegs = () => store.set('nat-regs', regs);

/* ---------- Initialisation ---------- */
$('#logo').innerHTML = LOGO;
$$('[data-i]').forEach(s => { s.outerHTML = ic(s.dataset.i); });
$('[data-view="list"]').innerHTML = ic('list') + 'Liste';
$('[data-view="month"]').innerHTML = ic('calendar') + 'Mois';
$('#chips').innerHTML = [['all', 'Tous', null], ...Object.entries(CATS).map(([k, c]) => [k, c.label, c.icon])]
  .map(([k, l, i]) => `<button type="button" class="fchip" data-cat="${k}" aria-pressed="${k === 'all'}">${i ? ic(i) : ''}${l}</button>`).join('');
initTheme();
initOfflineBanner();

/* ---------- Onglets (synchronisés avec l'adresse : #mes-inscriptions, #infos) ---------- */
const HASH = { events: '', mine: '#mes-inscriptions', infos: '#infos' };
const fromHash = () => Object.keys(HASH).find(k => HASH[k] === location.hash) || 'events';
function setTab(t, push = true) {
  state.tab = t;
  $$('.tab').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t));
  ['events', 'mine', 'infos'].forEach(p => { $('#p-' + p).hidden = p !== t; });
  if (push && location.hash !== HASH[t]) history.pushState(null, '', HASH[t] || location.pathname);
  scrollTo({ top: 0 });
}
$$('.tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
$('#logo-link').addEventListener('click', e => { e.preventDefault(); setTab('events'); });
addEventListener('popstate', () => setTab(fromHash(), false));

/* ---------- Rendu ---------- */
function render() {
  const out = $('#events-out');
  if (loadError) out.innerHTML = empty('Impossible de charger les événements', 'Vérifiez votre connexion puis actualisez la page.', 'wifioff');
  else if (!loaded) out.innerHTML = skeletons();
  else {
    const list = filtered(events, state), up = events.filter(isUpcoming).length;
    out.innerHTML = state.view === 'list' ? renderList(list, mineIds()) : renderMonth(list, up, state, mineIds());
  }
  $$('.fchip').forEach(b => b.setAttribute('aria-pressed', b.dataset.cat === state.cat));
  $$('.segment button').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === state.view));

  const past = events.filter(e => !isUpcoming(e)).sort((a, b) => startOf(b) - startOf(a));
  const pb = $('#past-btn');
  pb.hidden = !past.length;
  pb.innerHTML = `${ic('clock')} ${state.past ? 'Masquer' : 'Voir'} les événements passés (${past.length})`;
  pb.setAttribute('aria-expanded', state.past);
  $('#past-out').innerHTML = state.past ? `<div class="grid" style="margin-top:14px">${past.map(e => card(e, { past: true })).join('')}</div>` : '';

  const next = events.filter(isUpcoming).sort((a, b) => startOf(a) - startOf(b))[0], np = $('#next-pill');
  np.hidden = !next;
  if (next) { np.dataset.open = next.id; np.innerHTML = `<span class="dot"></span><span>Prochain : <b>${esc(next.name)}</b> · ${relDay(next) || fmtLong(next)} · ${fmtTime(next)}</span>`; }
  renderMineTab();
}
function renderMineTab() {
  const shown = regs.filter(r => byId(r.eventId)).length;
  const cnt = $('#mine-count'); cnt.hidden = !shown; cnt.textContent = shown;
  $('#mine-out').innerHTML = (loaded || !regs.length) ? renderMine(regs, byId) : skeletons();
}

/* ---------- Données en direct (Firebase) ---------- */
// Copie locale des derniers événements (données publiques) : affichage immédiat et hors ligne.
const load = v => { events = Object.entries(v || {}).map(([id, e]) => normalize(id, e)).filter(e => !e.deleted); loaded = true; loadError = false; };
const cached = store.get('nat-events', null);
if (cached) load(cached);
onValue(ref(db, 'events'), snap => {
  const v = snap.val() || {};
  store.set('nat-events', v);
  load(v);
  render(); watchRegs();
  // Si la fiche ou le formulaire sont ouverts, on les laisse tels quels (pas de rechargement sous les doigts).
}, err => { console.error('Lecture des événements impossible :', err.code); loadError = !cached; render(); });
render();

/* ---------- Suivi du statut de mes inscriptions (lecture du seul champ « status », par identifiant) ---------- */
const watching = new Map();   // id d'inscription -> fonction de désabonnement
function watchRegs() {
  regs.forEach(r => {
    const e = byId(r.eventId);
    if (!e || !isUpcoming(e) || r.status === 'removed' || watching.has(r.id)) return;
    watching.set(r.id, onValue(ref(db, `registrations/${r.eventId}/${r.id}/status`), snap => {
      const st = snap.val(), cur = regs.find(x => x.id === r.id);
      if (!cur) return;
      if (st === 'ok' && cur.status === 'wait') {
        cur.status = 'ok'; saveRegs(); render();
        toast(`Bonne nouvelle : une place s’est libérée pour « ${byId(cur.eventId)?.name || 'cet événement'} ».`);
      } else if (st === null && cur.status !== 'removed') {
        cur.status = 'removed'; saveRegs(); render();
        toast('Une de vos inscriptions a été retirée par Nat.');
      }
    }, () => {}));
  });
}
function unwatch(id) { watching.get(id)?.(); watching.delete(id); }

/* ---------- Annulation par le visiteur ---------- */
function openCancel(rid) {
  const r = regs.find(x => x.id === rid), e = r && byId(r.eventId); if (!e) return;
  openSheet(sheet, cancelSheet(e, r));
}
async function confirmCancel(rid) {
  const r = regs.find(x => x.id === rid), e = r && byId(r.eventId); if (!r || !e) return;
  const btn = $('#c-confirm'), err = $('#e-cancel'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Annulation…'; err.hidden = true;
  try {
    // Statut réel (la liste d'attente a pu avancer) : seules les places « ok » sont rendues au compteur.
    const status = (await get(ref(db, `registrations/${r.eventId}/${rid}/status`))).val();
    const phone = toLocalPhone(me.phone || '');
    const updates = { [`registrations/${r.eventId}/${rid}`]: null };
    if (status === 'ok') updates[`events/${r.eventId}/taken`] = Math.max(0, e.taken - r.people);
    if (status !== null) {
      // Le numéro enregistré n'est pas relu : on le retrouve dans la clé « phones » grâce à l'identifiant.
      const p = r.phone || (validPhone(me.phone || '') ? phone : null);
      if (p) updates[`phones/${r.eventId}/${p}`] = null;
      else throw Object.assign(new Error('phone'), { code: 'NO_PHONE' });
    }
    await update(ref(db), updates);
  } catch (ex) {
    console.error('Annulation impossible :', ex.code || ex);
    err.innerHTML = ic('info') + (ex.code === 'NO_PHONE' ? 'Annulation impossible depuis cet appareil : prévenez Nat par WhatsApp.' : 'Annulation impossible. Vérifiez votre connexion puis réessayez.');
    err.hidden = false; btn.disabled = false; btn.textContent = 'Oui, annuler mon inscription'; return;
  }
  unwatch(rid); regs = regs.filter(x => x.id !== rid); saveRegs(); render();
  openSheet(sheet, cancelledSheet(e, waLink(NAT_PHONE, cancelText(e, r.name, r.people))));
}

/* ---------- Fiche et formulaire ---------- */
const sheet = $('#sheet');
function openEvent(id) {
  const e = byId(id); if (!e) return;
  openSheet(sheet, eventSheet(e, mineIds().get(id)));
}

function openForm(id) {
  const e = byId(id); if (!e || e.cancelled) return;
  const s = seats(e), maxP = s.full ? 4 : Math.min(4, s.left);
  openSheet(sheet, formSheet(e, me, maxP));
  const ph = $('#f-phone'); ph.addEventListener('input', () => { ph.value = formatPhone(ph.value); });
  let n = 1;
  $$('[data-step]', sheet).forEach(b => b.addEventListener('click', () => { n = Math.min(maxP, Math.max(1, n + Number(b.dataset.step))); $('#f-people').textContent = n; }));
  $('#reg-form').addEventListener('submit', ev => { ev.preventDefault(); submitForm(id, () => n); });
}

async function submitForm(eventId, getPeople) {
  const name = $('#f-name').value.trim().replace(/\s+/g, ' '), phoneRaw = $('#f-phone').value, note = $('#f-note').value.trim();
  const okName = name.length >= 2, okPhone = validPhone(phoneRaw);
  $('#e-name').hidden = okName; $('#f-name').setAttribute('aria-invalid', !okName);
  $('#e-phone').hidden = okPhone; $('#f-phone').setAttribute('aria-invalid', !okPhone);
  const formErr = $('#e-form'); formErr.hidden = true;
  if (!okName || !okPhone) { (okName ? $('#f-phone') : $('#f-name')).focus(); return; }

  const e = byId(eventId), people = getPeople();
  if (!e) { formErr.textContent = 'Événement introuvable. Actualisez la page.'; formErr.hidden = false; return; }
  const phone = toLocalPhone(phoneRaw), wait = seats(e).full;

  // Écriture atomique : inscription + numéro (anti-doublon) + compteur de places.
  // Les règles Firebase refusent tout compteur différent de « ancien + nombre de personnes ».
  const registrationId = push(ref(db, `registrations/${eventId}`)).key;
  const updates = {
    [`registrations/${eventId}/${registrationId}`]: { name, phone, people, status: wait ? 'wait' : 'ok', createdAt: Date.now(), ...(note ? { note } : {}) },
    [`phones/${eventId}/${phone}`]: registrationId,
  };
  if (!wait) updates[`events/${eventId}/taken`] = e.taken + people;

  const btn = $('#f-submit'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Enregistrement…';
  try {
    await update(ref(db), updates);
  } catch (err) {
    console.error('Inscription refusée :', err.code || err);
    formErr.innerHTML = ic('info') + (err.code === 'PERMISSION_DENIED' || /permission_denied/i.test(err.message || '')
      ? 'Inscription impossible : ce numéro est déjà inscrit, ou les places viennent de changer. Actualisez la page.'
      : 'Erreur de connexion. Veuillez réessayer.');
    formErr.hidden = false;
    btn.disabled = false; btn.textContent = wait ? 'Rejoindre la liste d’attente' : 'Confirmer l’inscription';
    return;
  }
  if ($('#f-mem').checked) store.set('nat-me', { name, phone: phoneRaw });
  me.name = name; me.phone = phoneRaw;
  regs.push({ id: registrationId, eventId, name, phone, people, status: wait ? 'wait' : 'ok' }); saveRegs(); render();
  watchRegs();
  openSheet(sheet, successSheet(e, name, people, wait, waLink(NAT_PHONE, confirmText(e, name, people))));
}

/* ---------- Événements souris / clavier (délégation) ---------- */
document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-open],[data-reg],[data-cat],[data-view],[data-day],[data-month],[data-ics],[data-cancel],[data-cancel-ok],[data-forget],[data-share],[data-goto],#past-btn');
  if (!t) return;
  const d = t.dataset;
  if (d.reg) openForm(d.reg);
  else if (d.open) openEvent(d.open);
  else if (d.cat && t.classList.contains('fchip')) { state.cat = d.cat; state.day = null; render(); }
  else if (d.view) { state.view = d.view; render(); }
  else if (d.day) { state.day = d.day; render(); }
  else if (d.month) { state.month = Math.max(0, state.month + Number(d.month)); state.day = null; render(); }
  else if (d.cancelOk) confirmCancel(d.cancelOk);
  else if (d.cancel) openCancel(d.cancel);
  else if (d.forget) { unwatch(d.forget); regs = regs.filter(x => x.id !== d.forget); saveRegs(); render(); }
  else if (d.ics) { const e = byId(d.ics); if (e) icsFile(e, mineIds().get(d.ics)); }
  else if (d.share) {
    const e = byId(d.share); if (!e) return;
    const text = `${e.name} — ${fmtLong(e)} à ${fmtTime(e)}. Réservation : ${location.origin}/`;
    if (navigator.share) navigator.share({ title: e.name, text, url: location.origin + '/' }).catch(() => {});
    else window.open(waLink('', text).replace('wa.me//', 'wa.me/'), '_blank', 'noopener');
  }
  else if (d.goto) setTab(d.goto);
  else if (t.id === 'past-btn') { state.past = !state.past; render(); }
});
$('#free-only').addEventListener('change', ev => { state.free = ev.target.checked; render(); });

setTab(fromHash(), false);


/* ---------- Application installable (PWA) ---------- */
if ('serviceWorker' in navigator && import.meta.env.PROD) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(err => console.error('Service worker :', err)));
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const installBox = $('#install-box'), installBtn = $('#install-btn'), iosHint = $('#install-ios');
let installEvt = null;
if (standalone) installBox.hidden = true;
else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) { installBox.hidden = false; iosHint.hidden = false; installBtn.hidden = true; }
addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); installEvt = ev; installBox.hidden = false; installBtn.hidden = false; });
installBtn.addEventListener('click', async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; installBox.hidden = true; });
addEventListener('appinstalled', () => { installBox.hidden = true; });
