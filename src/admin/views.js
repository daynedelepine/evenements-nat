// Rendus HTML de l'administration (fonctions pures). Tout texte saisi passe par esc().
import { ic } from '../lib/icons.js';
import { esc } from '../lib/dom.js';
import { CATS, seats, waLink } from '../lib/events.js';
import { startOf, isUpcoming, fmtLong, fmtTime } from '../lib/dates.js';
import { intlPhone, spacedPhone } from '../lib/phone.js';

// Inscriptions d'un événement : { ok: [...], wait: [...] }, par ordre d'inscription
export function guestRows(regs) {
  const rows = Object.entries(regs || {}).map(([id, r]) => ({ id, ...r })).sort((a, b) => a.createdAt - b.createdAt);
  return { all: rows, ok: rows.filter(r => r.status !== 'wait'), wait: rows.filter(r => r.status === 'wait') };
}
const firstName = r => r.name.split(' ')[0];
const waitCount = (e, registrations) => guestRows(registrations[e.id]).wait.length;

/* ---------- Tableau de bord ---------- */
export function dashboard(events, registrations) {
  const active = events.filter(e => !e.deleted && !e.cancelled), up = active.filter(isUpcoming).sort((a, b) => startOf(a) - startOf(b));
  const taken = up.reduce((n, e) => n + e.taken, 0), cap = up.reduce((n, e) => n + e.max, 0);
  const wait = up.reduce((n, e) => n + waitCount(e, registrations), 0);
  const stat = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
  const byCat = Object.entries(CATS).map(([k, c]) => {
    const l = active.filter(e => e.cat === k), t = l.reduce((n, e) => n + e.taken, 0), m = l.reduce((n, e) => n + e.max, 0);
    return { c, pct: m ? Math.round(t / m * 100) : 0, n: l.length };
  });
  // Inscrits les plus fidèles : même téléphone sur plusieurs événements (hors corbeille et annulés)
  const ids = new Set(active.map(e => e.id)), fans = new Map();
  for (const [eid, regs] of Object.entries(registrations)) {
    if (!ids.has(eid)) continue;
    for (const r of Object.values(regs)) {
      if (r.status === 'wait') continue;
      const f = fans.get(r.phone) || { name: r.name, n: 0 }; f.n++; f.name = r.name; fans.set(r.phone, f);
    }
  }
  const top = [...fans.values()].filter(f => f.n >= 2).sort((a, b) => b.n - a.n).slice(0, 5);
  return `<div class="stats">${stat(up.length, 'Événements à venir')}${stat(taken, 'Places réservées')}${stat(cap ? Math.round(taken / cap * 100) + ' %' : '–', 'Taux de remplissage')}${stat(wait, 'En liste d’attente')}</div>
    <div class="cards">
      <div class="panel"><h2>Remplissage par événement</h2>${up.length ? up.map(e => { const s = seats(e);
        return `<div class="bar-row"><span>${esc(e.name)} <span class="hint">${fmtLong(e)}</span></span><b>${e.taken}/${e.max}</b><div class="meter ${s.tone}"><span style="width:${s.pct}%"></span></div></div>`; }).join('') : '<p class="hint">Aucun événement à venir.</p>'}</div>
      <div class="panel"><h2>Remplissage par catégorie</h2>${byCat.map(({ c, pct, n }) => `<div class="bar-row"><span class="chip ${c.cls}">${ic(c.icon)}${c.label}</span><b>${n ? pct + ' %' : '–'}</b><div class="meter"><span class="${c.cls}" style="width:${pct}%;background:var(--cfg)"></span></div></div>`).join('')}
        <h3 style="margin-top:12px;font-size:1.0625rem">Inscrits les plus fidèles</h3>
        ${top.length ? `<table class="table"><tbody>${top.map(f => `<tr><td class="who"><b>${esc(f.name)}</b></td><td>${f.n} événements</td></tr>`).join('')}</tbody></table>` : '<p class="hint">Pas encore de participant venu à plusieurs événements.</p>'}</div>
    </div>
    <div class="panel" style="margin-top:16px"><h2>Compteurs de places</h2>
      <p class="hint">Si un compteur ne correspond plus aux inscrits (par exemple après une erreur de réseau), « Recalculer » le remet à la somme des personnes inscrites.</p>
      <div><button class="btn sm" type="button" data-recount>${ic('repeat')}Recalculer les compteurs</button></div></div>`;
}

/* ---------- Liste des événements ---------- */
export function eventCards(events, registrations) {
  const list = events.filter(e => !e.deleted);
  if (!list.length) return `<div class="empty" style="grid-column:1/-1">${ic('calendar')}<p><b>Aucun événement</b></p></div>`;
  return list.sort((a, b) => startOf(b) - startOf(a)).map(e => {
    const c = CATS[e.cat], s = seats(e), w = waitCount(e, registrations), id = esc(e.id);
    return `<article class="card admin-card ${c.cls} ${e.cancelled ? 'is-cancelled' : ''}">
      <div><span class="chip ${c.cls}">${ic(c.icon)}${c.label}</span>${e.cancelled ? ' <span class="tag">Annulé</span>' : ''}<h3 style="margin-top:6px;font-size:1.1875rem">${esc(e.name)}</h3>
      <div class="meta" style="margin-top:4px"><span>${ic('calendar')}${fmtLong(e)} · ${fmtTime(e)}</span><span>${ic('users')}${e.taken}/${e.max}${w ? ` · ${w} en attente` : ''}</span></div></div>
      <div class="meter ${s.tone}"><span style="width:${s.pct}%"></span></div>
      <div class="actions">
        <button class="btn sm primary" type="button" data-guests="${id}">${ic('users')}Inscrits (${e.taken})</button>
        <button class="btn sm" type="button" data-edit="${id}">${ic('edit')}Modifier</button>
        <button class="btn sm" type="button" data-dup="${id}">${ic('copy')}Dupliquer</button>
        ${e.cancelled ? `<button class="btn sm" type="button" data-uncancel="${id}">${ic('undo')}Rétablir</button>`
          : `<button class="btn sm" type="button" data-cancelev="${id}">${ic('x')}Annuler l’événement</button>`}
        <button class="btn sm danger" type="button" data-del="${id}">${ic('trash')}Supprimer</button>
      </div></article>`;
  }).join('');
}

/* ---------- Corbeille ---------- */
export function trashView(events) {
  const list = events.filter(e => e.deleted).sort((a, b) => b.deleted - a.deleted);
  if (!list.length) return `<div class="empty">${ic('trash')}<p><b>La corbeille est vide</b></p><p>Un événement supprimé reste ici de façon récupérable.</p></div>`;
  return `<div class="grid" style="margin-top:16px">${list.map(e => `<article class="card admin-card"><div><h3>${esc(e.name)}</h3><p class="hint">${fmtLong(e)} · ${e.taken} inscrit(s) conservé(s)</p></div>
    <div class="actions"><button class="btn sm primary" type="button" data-restore="${esc(e.id)}">${ic('undo')}Restaurer</button>
    <button class="btn sm danger" type="button" data-purge="${esc(e.id)}">${ic('trash')}Supprimer définitivement</button></div></article>`).join('')}</div>`;
}

export function purgeSheet(e) {
  return `
    <div class="sheet-head"><h2 id="sheet-title">Supprimer définitivement ?</h2>
      <button class="icon-btn" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="sheet-body"><p><b>${esc(e.name)}</b> · ${fmtLong(e)}</p>
      <p class="note">L’événement et ses inscrits seront effacés de la base. Cette action est irréversible.</p></div>
    <div class="sheet-foot"><button class="btn" type="button" data-close>Garder</button><button class="btn danger" type="button" data-confirmpurge="${esc(e.id)}">Supprimer définitivement</button></div>`;
}

/* ---------- Inscrits : présences, WhatsApp, export, impression ---------- */
export function guestsSheet(e, regs) {
  const { ok, wait } = guestRows(regs), past = !isUpcoming(e), id = esc(e.id);
  const wa = (r, txt) => `<a class="btn sm wa" target="_blank" rel="noopener" href="${waLink(intlPhone(r.phone), txt)}" aria-label="WhatsApp à ${esc(r.name)}">${ic('chat')}</a>`;
  const row = (r, isWait) => `<tr>
    ${isWait ? '' : `<td><input type="checkbox" data-present="${esc(r.id)}" ${r.present ? 'checked' : ''} aria-label="Présent : ${esc(r.name)}"></td>`}
    <td class="who"><b>${esc(r.name)}</b><small>${esc(spacedPhone(r.phone))}</small>${r.note ? ` <span class="tag">${esc(r.note)}</span>` : ''}</td>
    <td>${esc(r.people)}</td>
    <td style="text-align:right;white-space:nowrap" class="no-print">${wa(r, `Bonjour ${firstName(r)}, c'est Nat. Je vous écris au sujet de « ${e.name} ».`)}
      ${isWait ? `<button class="btn sm primary" type="button" data-promote="${esc(r.id)}">Promouvoir</button>` : ''}
      <button class="btn sm danger" type="button" data-remove="${esc(r.id)}" aria-label="Retirer ${esc(r.name)}">${ic('trash')}</button></td></tr>`;
  const here = ok.filter(r => r.present).reduce((n, r) => n + r.people, 0);
  return `
    <div class="sheet-head"><div><h2 id="sheet-title">${esc(e.name)}</h2><p class="hint">${fmtLong(e)} · ${fmtTime(e)} · ${esc(e.place)} · ${e.taken}/${e.max} places${e.cancelled ? ' · ANNULÉ' : past ? ' · présences à pointer' : ''}</p></div>
      <button class="icon-btn no-print" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="sheet-body">
      <div class="actions no-print">
        <button class="btn sm" type="button" data-add>${ic('plus')}Ajouter à la main</button>
        <button class="btn sm" type="button" data-bulk>${ic('chat')}Message groupé</button>
        <button class="btn sm" type="button" data-csv>${ic('download')}Export CSV</button>
        <button class="btn sm" type="button" data-print>${ic('printer')}Imprimer la liste</button></div>
      <table class="table"><thead><tr><th>Présent</th><th>Inscrit</th><th>Pers.</th><th class="no-print"></th></tr></thead>
      <tbody>${ok.length ? ok.map(r => row(r, false)).join('') : `<tr><td colspan="4" class="hint">Aucun inscrit pour le moment.</td></tr>`}</tbody></table>
      ${ok.length ? `<p class="hint" id="present-count">${here} personne(s) pointée(s) présente(s) sur ${e.taken}.</p>` : ''}
      ${wait.length ? `<h3 style="font-size:1.0625rem">Liste d'attente (${wait.length})</h3><table class="table"><tbody>${wait.map(r => row(r, true)).join('')}</tbody></table>` : ''}
    </div>`;
}

export function addGuestSheet(e) {
  const s = seats(e);
  return `
    <div class="sheet-head"><div><h2 id="sheet-title">Ajouter un inscrit</h2><p class="hint">${esc(e.name)} · ${s.full ? 'complet : la personne ira en liste d’attente' : s.text}</p></div>
      <button class="icon-btn" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
    <form id="add-form" novalidate style="display:contents"><div class="sheet-body">
      <div class="field"><label for="g-name">Nom</label><input id="g-name" type="text" maxlength="60" autocomplete="off" required></div>
      <div class="field"><label for="g-phone">Téléphone</label><input id="g-phone" type="tel" inputmode="tel" autocomplete="off" placeholder="06 12 34 56 78" required></div>
      <div class="field"><label for="g-people">Nombre de personnes</label><input id="g-people" type="number" min="1" max="4" value="1" required></div>
      <div class="field"><label for="g-note">Remarque <span class="hint">(facultatif)</span></label><input id="g-note" type="text" maxlength="200"></div>
      <p class="error" id="g-err" role="alert" hidden></p>
    </div><div class="sheet-foot"><button class="btn" type="button" data-back>Retour</button><button class="btn primary" type="submit" id="g-save">Ajouter</button></div></form>`;
}

/* ---------- Message groupé / annulation ---------- */
export const reminderText = e => `Bonjour, petit rappel : « ${e.name} » ${fmtLong(e)} à ${fmtTime(e)}. À bientôt ! — Nat`;
export const cancelText = e => `Bonjour, malheureusement « ${e.name} » du ${fmtLong(e)} est annulé. Désolé pour la gêne — Nat`;

export function bulkSheet(e, regs, cancel) {
  const g = guestRows(regs), list = cancel ? g.all : g.ok, msg = cancel ? cancelText(e) : reminderText(e);
  return `
    <div class="sheet-head"><div><h2 id="sheet-title">${cancel ? 'Annuler et prévenir' : 'Message groupé'}</h2><p class="hint">WhatsApp ne permet pas l'envoi automatique gratuit : un bouton par personne, message déjà prêt.</p></div>
      <button class="icon-btn" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="sheet-body">
      <div class="field"><label for="b-msg">Message</label><textarea id="b-msg" rows="4">${esc(msg)}</textarea></div>
      <div class="rows" id="b-list">${list.length ? list.map(r => `<div class="row" style="align-items:center;justify-content:space-between"><span>${esc(r.name)} <span class="hint">${esc(spacedPhone(r.phone))}${r.status === 'wait' ? ' · en attente' : ''}</span></span>
        <a class="btn sm wa" target="_blank" rel="noopener" data-phone="${intlPhone(r.phone)}" href="${waLink(intlPhone(r.phone), msg)}">${ic('chat')}Envoyer</a></div>`).join('') : '<p class="hint">Aucun inscrit à prévenir.</p>'}</div>
    </div>
    <div class="sheet-foot">${cancel ? `<button class="btn danger" type="button" data-confirmcancel>Marquer l'événement comme annulé</button>` : ''}<button class="btn" type="button" data-close>Fermer</button></div>`;
}

/* ---------- Formulaire événement (création / modification / duplication) ---------- */
export function formSheet({ event, dupOf } = {}) {
  const src = event || (dupOf ? { ...dupOf, date: '' } : { cat: 'cafes', name: '', date: '', time: '', place: '', max: 8, desc: '' });
  const title = event ? 'Modifier l’événement' : dupOf ? 'Dupliquer l’événement' : 'Nouvel événement';
  return `
    <div class="sheet-head"><h2 id="sheet-title">${title}</h2>
      <button class="icon-btn" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
    <form id="ev-form" novalidate style="display:contents"><div class="sheet-body">
      ${event ? '' : `<div class="field"><label for="x-tpl">Partir d'un modèle</label><select id="x-tpl"><option value="">Aucun</option>${Object.entries(CATS).map(([k, c]) => `<option value="${k}">${c.label}</option>`).join('')}</select><p class="hint">Pré-remplit nom, lieu, horaire, places et description.</p></div>`}
      <div class="field"><label for="x-name">Nom</label><input id="x-name" type="text" maxlength="100" value="${esc(src.name)}" required></div>
      <div class="field"><label for="x-cat">Catégorie</label><select id="x-cat">${Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${src.cat === k ? 'selected' : ''}>${c.label}</option>`).join('')}</select></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="field"><label for="x-date">Date</label><input id="x-date" type="date" value="${esc(src.date)}" required></div>
        <div class="field"><label for="x-time">Heure</label><input id="x-time" type="time" value="${esc(src.time)}" required></div></div>
      <div class="field"><label for="x-place">Lieu</label><input id="x-place" type="text" maxlength="150" value="${esc(src.place)}" required></div>
      <div class="field"><label for="x-max">Nombre de places</label><input id="x-max" type="number" min="1" max="100" value="${esc(src.max)}" required></div>
      <div class="field"><label for="x-desc">Description <span class="hint">(facultatif)</span></label><div class="rt-bar" role="toolbar" aria-label="Mise en forme">
          <button type="button" data-fmt="bold" aria-label="Gras"><b>G</b></button><button type="button" data-fmt="italic" aria-label="Italique"><i>I</i></button>
          <button type="button" data-fmt="list" aria-label="Liste à puces">• Liste</button><button type="button" data-fmt="link" aria-label="Lien">Lien</button></div>
        <textarea id="x-desc" rows="5" maxlength="1000" aria-describedby="x-desc-h">${esc(src.desc)}</textarea>
        <p class="hint" id="x-desc-h">**gras**, *italique*, « - » en début de ligne pour une liste, [texte](https://adresse) pour un lien.</p>
        <div class="note rich" id="x-prev" aria-live="polite" hidden></div></div>
      <p class="error" id="x-err" role="alert" hidden></p>
    </div><div class="sheet-foot"><button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="submit" id="x-save">Enregistrer</button></div></form>`;
}
