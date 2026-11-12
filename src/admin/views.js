// Rendus HTML de l'administration (fonctions pures). Tout texte saisi passe par esc().
import { ic } from '../lib/icons.js';
import { esc } from '../lib/dom.js';
import { CATS, seats, waLink } from '../lib/events.js';
import { startOf, isUpcoming, fmtLong, fmtTime } from '../lib/dates.js';
import { intlPhone, spacedPhone } from '../lib/phone.js';

export function stats(events) {
  const up = events.filter(isUpcoming);
  const taken = up.reduce((n, e) => n + e.taken, 0), cap = up.reduce((n, e) => n + e.max, 0);
  return [[up.length, 'Événements à venir'], [taken, 'Places réservées'], [cap ? Math.round(taken / cap * 100) + ' %' : '–', 'Taux de remplissage']]
    .map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
}

export function eventCards(events) {
  if (!events.length) return `<div class="empty" style="grid-column:1/-1">${ic('calendar')}<p><b>Aucun événement</b></p></div>`;
  return [...events].sort((a, b) => startOf(b) - startOf(a)).map(e => {
    const c = CATS[e.cat], s = seats(e);
    return `<article class="card admin-card ${c.cls}">
      <div><span class="chip ${c.cls}">${ic(c.icon)}${c.label}</span><h3 style="margin-top:6px;font-size:1.1875rem">${esc(e.name)}</h3>
      <div class="meta" style="margin-top:4px"><span>${ic('calendar')}${fmtLong(e)} · ${fmtTime(e)}</span><span>${ic('users')}${e.taken}/${e.max}</span></div></div>
      <div class="meter ${s.tone}"><span style="width:${s.pct}%"></span></div>
      <div class="actions">
        <button class="btn sm primary" type="button" data-guests="${esc(e.id)}">${ic('users')}Inscrits (${e.taken})</button>
        <button class="btn sm danger" type="button" data-del="${esc(e.id)}">${ic('trash')}Supprimer</button>
      </div></article>`;
  }).join('');
}

export function guestsSheet(e, regs) {
  const rows = Object.entries(regs || {}).map(([id, r]) => ({ id, ...r })).sort((a, b) => a.createdAt - b.createdAt);
  const ok = rows.filter(r => r.status !== 'wait'), wait = rows.filter(r => r.status === 'wait');
  const row = r => `<tr>
    <td class="who"><b>${esc(r.name)}</b><small>${esc(spacedPhone(r.phone))}</small>${r.note ? ` <span class="tag">${esc(r.note)}</span>` : ''}</td>
    <td>${esc(r.people)}</td>
    <td style="text-align:right;white-space:nowrap" class="no-print">
      <a class="btn sm wa" target="_blank" rel="noopener" href="${waLink(intlPhone(r.phone), `Bonjour ${r.name.split(' ')[0]}, c'est Nat. Je vous écris au sujet de « ${e.name} ».`)}" aria-label="WhatsApp à ${esc(r.name)}">${ic('chat')}</a>
      <button class="btn sm danger" type="button" data-remove="${esc(r.id)}" aria-label="Retirer ${esc(r.name)}">${ic('trash')}</button></td></tr>`;
  return `
    <div class="sheet-head"><div><h2 id="sheet-title">${esc(e.name)}</h2><p class="hint">${fmtLong(e)} · ${fmtTime(e)} · ${e.taken}/${e.max} places</p></div>
      <button class="icon-btn no-print" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="sheet-body">
      <table class="table"><thead><tr><th>Inscrit</th><th>Pers.</th><th class="no-print"></th></tr></thead>
      <tbody>${ok.length ? ok.map(row).join('') : `<tr><td colspan="3" class="hint">Aucun inscrit pour le moment.</td></tr>`}</tbody></table>
      ${wait.length ? `<h3 style="font-size:1.0625rem">Liste d'attente (${wait.length})</h3><table class="table"><tbody>${wait.map(row).join('')}</tbody></table>` : ''}
    </div>`;
}

export function deleteSheet(e) {
  return `
    <div class="sheet-head"><h2 id="sheet-title">Supprimer l’événement ?</h2>
      <button class="icon-btn" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="sheet-body"><p><b>${esc(e.name)}</b> · ${fmtLong(e)}</p>
      <p class="note">L’événement et ses ${e.taken} inscrit(s) seront supprimés définitivement. Cette action est irréversible.</p></div>
    <div class="sheet-foot"><button class="btn" type="button" data-close>Garder</button><button class="btn danger" type="button" data-confirmdel="${esc(e.id)}">Supprimer définitivement</button></div>`;
}

export function formSheet() {
  return `
    <div class="sheet-head"><h2 id="sheet-title">Nouvel événement</h2>
      <button class="icon-btn" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
    <form id="ev-form" novalidate style="display:contents"><div class="sheet-body">
      <div class="field"><label for="x-name">Nom</label><input id="x-name" type="text" maxlength="100" required></div>
      <div class="field"><label for="x-cat">Catégorie</label><select id="x-cat">${Object.entries(CATS).map(([k, c]) => `<option value="${k}">${c.label}</option>`).join('')}</select></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="field"><label for="x-date">Date</label><input id="x-date" type="date" required></div>
        <div class="field"><label for="x-time">Heure</label><input id="x-time" type="time" required></div></div>
      <div class="field"><label for="x-place">Lieu</label><input id="x-place" type="text" maxlength="150" required></div>
      <div class="field"><label for="x-max">Nombre de places</label><input id="x-max" type="number" min="1" max="100" value="8" required></div>
      <div class="field"><label for="x-desc">Description <span class="hint">(facultatif)</span></label><textarea id="x-desc" rows="3" maxlength="1000"></textarea></div>
      <p class="error" id="x-err" role="alert" hidden></p>
    </div><div class="sheet-foot"><button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="submit" id="x-save">Enregistrer</button></div></form>`;
}
