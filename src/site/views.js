// Rendus HTML du site public (fonctions pures : état -> chaîne). Tout texte saisi passe par esc().
import { ic } from '../lib/icons.js';
import { esc } from '../lib/dom.js';
import { richHtml } from '../lib/richtext.js';
import { CATS, seats, isNew, mapsLink } from '../lib/events.js';
import { startOf, isUpcoming, isoDay, today, fmtLong, fmtTime, monthLabel, shortDow, shortMon, relDay } from '../lib/dates.js';

/** « +N » : personnes inscrites en plus de soi (vide si inscription individuelle). */
export const plus = r => (r && r.people > 1 ? ` <b>+${r.people - 1}</b>` : '');

export function card(e, { past = false, mine = false } = {}) {
  const s = seats(e), c = CATS[e.cat], d = startOf(e), rel = relDay(e);
  const btn = past ? '' : e.cancelled ? `<span class="chip cat-aperos">${ic('x')}Annulé</span>` : mine ? `<span class="chip ${mine.status === 'wait' ? 'cat-cafes' : 'cat-tables'}">${ic(mine.status === 'wait' ? 'clock' : 'check')}${mine.status === 'wait' ? 'En attente' : 'Inscrit'}${plus(mine)}</span>`
    : `<button type="button" class="btn ${s.full ? '' : 'primary'} sm" data-reg="${esc(e.id)}">${s.full ? 'Liste d’attente' : 'S’inscrire'}</button>`;
  return `<article class="card ${c.cls} ${past ? 'past' : ''}">
    <div class="card-top">
      <div class="datebox" aria-hidden="true"><span class="dow">${shortDow(d)}</span><span class="day">${d.getDate()}</span><span class="mon">${shortMon(d)}</span></div>
      <div class="card-body">
        <span class="chip ${c.cls}">${ic(c.icon)}${c.label}${isNew(e) && !past ? '<span class="badge">Nouveau</span>' : ''}</span>
        <button type="button" class="card-link" data-open="${esc(e.id)}">${esc(e.name)}</button>
        <div class="meta"><span>${ic('clock')}${rel ? `<b>${rel}</b> · ` : ''}${fmtTime(e)}</span><span>${ic('pin')}${esc(e.place)}</span></div>
      </div>
    </div>
    <div class="card-foot">
      <div class="seats">
        <span class="seats-text ${s.tone}">${past ? `${e.taken} participants` : e.cancelled ? 'Événement annulé' : s.text}</span>
        <div class="meter ${s.tone}" role="img" aria-label="${e.taken} places prises sur ${e.max}"><span style="width:${s.pct}%"></span></div>
      </div>
      ${btn}
    </div>
  </article>`;
}

export const skeletons = () => `<div class="grid" style="margin-top:14px">${'<div class="skeleton"></div>'.repeat(4)}</div>`;
export const empty = (t, sub = '', icon = 'calendar') => `<div class="empty">${ic(icon)}<p><b>${t}</b></p><p>${sub}</p></div>`;

export const filtered = (events, { cat, free }) =>
  events.filter(isUpcoming).filter(e => (cat === 'all' || e.cat === cat) && (!free || seats(e).left > 0)).sort((a, b) => startOf(a) - startOf(b));

export function renderList(list, mineIds) {
  if (!list.length) return empty('Aucun événement ne correspond', 'Essayez un autre filtre ou revenez bientôt : de nouveaux rendez-vous sont publiés régulièrement.');
  const groups = {};
  list.forEach(e => (groups[monthLabel(startOf(e))] ??= []).push(e));
  return Object.entries(groups).map(([m, evs]) =>
    `<h2 class="month">${m}</h2><div class="grid">${evs.map(e => card(e, { mine: mineIds.get(e.id) })).join('')}</div>`).join('');
}

export function renderMonth(list, upcomingCount, { month, day }, mineIds) {
  const t = today();
  const first = new Date(t.getFullYear(), t.getMonth() + month, 1);
  const lead = (first.getDay() + 6) % 7, days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const on = iso => list.filter(e => e.date === iso);
  let cells = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map(d => `<span class="cal-dow">${d}</span>`).join('');
  cells += '<span></span>'.repeat(lead);
  for (let d = 1; d <= days; d++) {
    const iso = isoDay(new Date(first.getFullYear(), first.getMonth(), d)), evs = on(iso), isToday = iso === isoDay(t);
    const dots = evs.map(e => `<i class="${CATS[e.cat].cls}"></i>`).join('');
    cells += evs.length
      ? `<button type="button" class="cal-day ${isToday ? 'today' : ''}" data-day="${iso}" aria-pressed="${day === iso}" aria-label="${d} : ${evs.length} événement${evs.length > 1 ? 's' : ''}">${d}<span class="dots">${dots}</span></button>`
      : `<span class="cal-day muted ${isToday ? 'today' : ''}">${d}</span>`;
  }
  const sel = day && on(day).length ? on(day) : null;
  return `<div class="cal">
    <div class="cal-head">
      <button type="button" class="icon-btn" data-month="-1" aria-label="Mois précédent" ${month <= 0 ? 'disabled style="opacity:.4"' : ''}>${ic('left')}</button>
      <h2>${monthLabel(first)}</h2>
      <button type="button" class="icon-btn" data-month="1" aria-label="Mois suivant">${ic('right')}</button>
    </div>
    <div class="cal-grid">${cells}</div></div>
    <div class="grid" style="margin-top:14px">${sel ? sel.map(e => card(e, { mine: mineIds.get(e.id) })).join('') : ''}</div>
    ${!sel ? `<p class="hint" style="margin-top:12px;text-align:center">${upcomingCount ? 'Touchez un jour marqué d’un point pour voir ses événements.' : ''}</p>` : ''}`;
}

export function renderMine(regs, byId) {
  const rows = regs.map(r => ({ r, e: byId(r.eventId) })).filter(x => x.e);
  if (!rows.length) return `<div class="empty" style="grid-column:1/-1">${ic('ticket')}<p><b>Aucune inscription</b></p><p>Vos réservations apparaîtront ici.</p><button class="btn primary" type="button" data-goto="events">Voir les événements</button></div>`;
  return rows.sort((x, y) => startOf(x.e) - startOf(y.e)).map(({ r, e }) => {
    const d = startOf(e), wait = r.status === 'wait', gone = r.status === 'removed', past = !isUpcoming(e);
    const chip = gone ? ['cat-aperos', 'x', 'Inscription retirée'] : wait ? ['cat-cafes', 'clock', 'Liste d’attente'] : ['cat-tables', 'check', 'Place réservée'];
    return `<article class="card ${CATS[e.cat].cls} ${past ? 'past' : ''}"><div class="card-top">
      <div class="datebox" aria-hidden="true"><span class="dow">${shortDow(d)}</span><span class="day">${d.getDate()}</span><span class="mon">${shortMon(d)}</span></div>
      <div class="card-body"><span class="chip ${chip[0]}">${ic(chip[1])}${chip[2]}</span>${e.cancelled ? `<span class="chip cat-aperos">${ic('x')}Événement annulé</span>` : ''}
      <button type="button" class="card-link" data-open="${esc(e.id)}">${esc(e.name)}</button>
      <div class="meta"><span>${ic('clock')}${fmtLong(e)} · ${fmtTime(e)}</span><span>${ic('users')}${r.people} personne${r.people > 1 ? 's' : ''}${plus(r)}</span></div>
      ${wait && !past && !e.cancelled ? '<p class="hint">Vous serez prévenu(e) ici et par WhatsApp si une place se libère.</p>' : ''}
      ${gone ? '<p class="hint">Nat a retiré cette inscription. Contactez-le pour toute question.</p>' : ''}</div></div>
      <div class="actions">
        ${gone ? `<button class="btn sm" type="button" data-forget="${esc(r.id)}">${ic('x')}Masquer</button>` : `${past ? '' : `<button class="btn sm" type="button" data-ics="${esc(e.id)}">${ic('calendar')}Agenda</button>
        <a class="btn sm" href="${mapsLink(e)}" target="_blank" rel="noopener">${ic('route')}Itinéraire</a>
        <button class="btn sm danger" type="button" data-cancel="${esc(r.id)}">${ic('x')}Annuler</button>`}`}
      </div></article>`;
  }).join('');
}

export function cancelSheet(e, r) {
  const wait = r.status === 'wait';
  return `
    <div class="sheet-head"><h2 id="sheet-title">Annuler l’inscription ?</h2>
      <button class="icon-btn" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="sheet-body">
      <div class="recap"><b>${esc(e.name)}</b><br>${fmtLong(e)} · ${fmtTime(e)}<br>${r.people} personne${r.people > 1 ? 's' : ''}${plus(r)}${wait ? ' · liste d’attente' : ''}</div>
      <p class="note">${wait ? 'Vous quitterez la liste d’attente.' : `Votre place${r.people > 1 ? 's seront libérées' : ' sera libérée'} pour les personnes en attente.`} Pour revenir, il faudra vous réinscrire (sous réserve de places).</p>
      <p class="error" id="e-cancel" role="alert" hidden></p>
    </div>
    <div class="sheet-foot" style="display:grid;gap:8px">
      <button class="btn danger block" type="button" id="c-confirm" data-cancel-ok="${esc(r.id)}">Oui, annuler mon inscription</button>
      <button class="btn block" type="button" data-close>Conserver ma place</button>
    </div>`;
}

export function cancelledSheet(e, waHref) {
  return `
    <div class="sheet-head"><h2 id="sheet-title">Inscription annulée</h2>
      <button class="icon-btn" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="sheet-body"><div class="success">
      <div class="tick">${ic('check')}</div>
      <p>Votre inscription à <b>${esc(e.name)}</b> est annulée.</p>
      <p class="hint">Par courtoisie, vous pouvez prévenir Nat par WhatsApp.</p>
      <a class="btn wa block" href="${waHref}" target="_blank" rel="noopener">${ic('chat')}Prévenir Nat sur WhatsApp</a>
    </div></div>
    <div class="sheet-foot"><button class="btn block" type="button" data-close>Terminé</button></div>`;
}

export function eventSheet(e, mine) {   // mine : inscription de cet appareil ou undefined
  const s = seats(e), c = CATS[e.cat], past = !isUpcoming(e);
  return `
    <div class="sheet-head"><div><span class="chip ${c.cls}">${ic(c.icon)}${c.label}</span><h2 id="sheet-title" style="margin-top:8px">${esc(e.name)}</h2></div>
      <button class="icon-btn" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="sheet-body">
      <div class="rows">
        <div class="row">${ic('calendar')}<span><b style="text-transform:capitalize">${fmtLong(e)}</b> à ${fmtTime(e)}</span></div>
        <div class="row">${ic('pin')}<span>${esc(e.place)}</span></div>
        <div class="row">${ic('users')}<span>${e.taken} / ${e.max} participants</span></div>
      </div>
      <div class="seats"><span class="seats-text ${s.tone}">${e.cancelled ? 'Événement annulé' : s.text}</span><div class="meter ${s.tone}"><span style="width:${s.pct}%"></span></div></div>
      ${e.desc ? `<div class="note rich">${richHtml(e.desc)}</div>` : ''}
      <div class="actions">
        <button class="btn sm" type="button" data-share="${esc(e.id)}">${ic('share')}Partager</button>
        <button class="btn sm" type="button" data-ics="${esc(e.id)}">${ic('calendar')}Agenda</button>
        <a class="btn sm" href="${mapsLink(e)}" target="_blank" rel="noopener">${ic('route')}Itinéraire</a>
      </div>
    </div>
    <div class="sheet-foot" ${mine && !past && mine.status !== 'removed' ? 'style="display:grid;gap:8px"' : ''}>
      ${past ? '<button class="btn block" type="button" data-close>Événement terminé</button>'
        : e.cancelled ? '<button class="btn block" type="button" data-close>Événement annulé</button>'
        : mine && mine.status !== 'removed' ? `<p class="hint" style="text-align:center">${mine.status === 'wait' ? 'Vous êtes sur liste d’attente' : 'Vous êtes inscrit(e)'}${plus(mine)}</p><button class="btn danger block" type="button" data-cancel="${esc(mine.id)}">Annuler mon inscription</button>`
        : `<button class="btn primary block" type="button" data-reg="${esc(e.id)}">${s.full ? 'Rejoindre la liste d’attente' : 'S’inscrire à cet événement'}</button>`}
    </div>`;
}

export function formSheet(e, me, maxP) {
  const s = seats(e);
  return `
    <div class="sheet-head"><div><h2 id="sheet-title">${s.full ? 'Liste d’attente' : 'Réserver'}</h2><p class="hint" style="margin-top:4px">${esc(e.name)} · ${fmtLong(e)} · ${fmtTime(e)}</p></div>
      <button class="icon-btn" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
    <form id="reg-form" novalidate style="display:contents">
      <div class="sheet-body">
        ${s.full ? `<p class="note">L'événement est complet. Vous serez prévenu(e) par WhatsApp si une place se libère.</p>` : ''}
        <div class="field"><label for="f-name">Votre nom</label>
          <input id="f-name" type="text" autocomplete="name" maxlength="60" value="${esc(me.name)}" aria-describedby="e-name" required>
          <p class="error" id="e-name" hidden>${ic('info')}Indiquez votre prénom et votre nom.</p></div>
        <div class="field"><label for="f-phone">Téléphone</label>
          <input id="f-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="06 12 34 56 78" value="${esc(me.phone)}" aria-describedby="e-phone h-phone" required>
          <p class="hint" id="h-phone">Utilisé uniquement par Nat, jamais affiché publiquement.</p>
          <p class="error" id="e-phone" hidden>${ic('info')}Numéro invalide. Exemple : 06 12 34 56 78.</p></div>
        <div class="field"><span class="label" id="l-people">Nombre de personnes</span>
          <div class="stepper" role="group" aria-labelledby="l-people">
            <button type="button" data-step="-1" aria-label="Une personne de moins">${ic('minus')}</button><output id="f-people" aria-live="polite">1</output><button type="button" data-step="1" aria-label="Une personne de plus">${ic('plus')}</button></div>
          <p class="hint">Jusqu'à ${maxP} personne${maxP > 1 ? 's' : ''} par réservation.</p></div>
        <div class="field"><label for="f-note">Allergies, régime, remarques <span class="hint">(facultatif)</span></label><textarea id="f-note" rows="2" maxlength="200"></textarea></div>
        <label class="check"><input type="checkbox" id="f-mem" checked> Mémoriser mon nom et mon numéro sur cet appareil</label>
        <p class="error" id="e-form" role="alert" hidden></p>
      </div>
      <div class="sheet-foot"><button class="btn primary block" type="submit" id="f-submit">${s.full ? 'Rejoindre la liste d’attente' : 'Confirmer l’inscription'}</button></div>
    </form>`;
}

export function successSheet(e, name, people, wait, waHref) {
  return `
    <div class="sheet-head"><h2 id="sheet-title">${wait ? 'Sur liste d’attente' : 'Inscription enregistrée'}</h2>
      <button class="icon-btn" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="sheet-body"><div class="success">
      <div class="tick">${ic('check')}</div>
      <p><b>${esc(name)}</b>, ${wait ? 'vous êtes inscrit(e) en liste d’attente.' : 'votre place est réservée.'}</p>
      <div class="recap"><b>${esc(e.name)}</b><br>${fmtLong(e)} · ${fmtTime(e)}<br>${people} personne${people > 1 ? `s (vous + ${people - 1})` : ''}</div>
      <p class="hint">Dernière étape : envoyez votre confirmation à Nat par WhatsApp.</p>
      <a class="btn wa block" href="${waHref}" target="_blank" rel="noopener">${ic('chat')}Envoyer ma confirmation sur WhatsApp</a>
      <div class="actions" style="justify-content:center"><button class="btn sm" type="button" data-ics="${esc(e.id)}">${ic('calendar')}Agenda</button>
      <a class="btn sm" href="${mapsLink(e)}" target="_blank" rel="noopener">${ic('route')}Itinéraire</a></div>
    </div></div>
    <div class="sheet-foot"><button class="btn block" type="button" data-close>Terminé</button></div>`;
}

/* ---------- Mur d'idées ---------- */
/** Idées de cet appareil encore en attente de relecture, puis idées publiées (déjà triées). Tout texte passe par esc(). */
export function ideasList(list, voted, mine, pending, canVote) {
  const items = [
    ...pending.map(p => `<article class="idea mine"><div class="idea-body"><p class="idea-text">${esc(p.text)}</p>
      <p class="hint"><span class="badge soft" style="margin:0">En attente de relecture</span> ${esc(p.name)} · votre idée</p></div></article>`),
    ...list.map(i => {
      const on = voted.has(i.id);
      return `<article class="idea"><div class="idea-body"><p class="idea-text">${esc(i.text)}</p>
        <p class="hint">${esc(i.name)}${mine.has(i.id) ? ' · votre idée' : ''}</p></div>
        <button type="button" class="like" data-like="${esc(i.id)}" aria-pressed="${on}" aria-label="${on ? 'Retirer mon vote' : 'J’aime cette idée'} (${i.votes} vote${i.votes > 1 ? 's' : ''})" ${canVote ? '' : 'disabled'}>${ic('heart')}<b>${i.votes}</b></button></article>`;
    })];
  return items.length ? items.join('') : empty('Pas encore d’idée publiée', 'Soyez la première personne à proposer un thème.', 'bulb');
}
