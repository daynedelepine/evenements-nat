// Tests des règles de sécurité en tant que VISITEUR (sans connexion) via l'API REST.
// Usage : node scripts/test-rules.js https://evenements-nat-test-default-rtdb.firebaseio.com
// À lancer sur le projet de TEST uniquement (le script crée puis supprime des inscriptions factices).
const DB = (process.argv[2] || '').replace(/\/$/, '');
if (!DB.includes('test')) { console.error('Refusé : l’URL doit être celle du projet de test.'); process.exit(1); }

const call = async (method, path, body, tok) => {
  const r = await fetch(`${DB}/${path}.json${tok ? '?auth=' + tok : ''}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null; try { json = await r.json(); } catch { /* corps vide */ }
  return { status: r.status, json };
};
let ok = 0, ko = 0;
const check = (name, cond) => { cond ? ok++ : ko++; console.log(`${cond ? 'OK  ' : 'ÉCHEC'}  ${name}`); };
const denied = r => r.status === 401 || r.status === 403;

(async () => {
  const ev = (await call('GET', 'events')).json || {};
  const ids = Object.keys(ev);
  check('Lecture publique des événements', ids.length > 0);
  check('Aucun inscrit dans la lecture publique', ids.every(i => !('participants' in ev[i]) && !('registrations' in ev[i])));
  check('Lecture de /registrations refusée', denied(await call('GET', 'registrations')));
  check('Lecture de /phones refusée', denied(await call('GET', 'phones')));
  check('Lecture de la racine refusée', denied(await call('GET', '')));
  check('Écriture d’un événement refusée', denied(await call('PUT', 'events/intrus', { name: 'x' })));
  check('Modification du nom d’un événement refusée', denied(await call('PUT', `events/${ids[0]}/name`, 'piraté')));
  check('Suppression d’un événement refusée', denied(await call('DELETE', `events/${ids[0]}`)));
  check('Modification de maxParticipants refusée', denied(await call('PUT', `events/${ids[0]}/maxParticipants`, 999)));
  check('Mise en corbeille (deletedAt) par un visiteur refusée', denied(await call('PUT', `events/${ids[0]}/deletedAt`, Date.now())));
  check('Annulation (cancelled) par un visiteur refusée', denied(await call('PUT', `events/${ids[0]}/cancelled`, true)));

  const free = ids.find(i => ev[i].taken < ev[i].maxParticipants - 1);
  const full = ids.find(i => ev[i].taken >= ev[i].maxParticipants);
  const T = ev[free].taken, rid = '-testRegA', phone = '0611223344';
  const reg = (people = 1, extra = {}) => ({ name: 'Test Visiteur', phone, people, status: 'ok', createdAt: Date.now(), ...extra });
  const upd = (e, r, ph, id, taken, data) => call('PATCH', '', { [`registrations/${e}/${id}`]: data, [`phones/${e}/${ph}`]: id, [`events/${e}/taken`]: taken });

  check('Inscription sans incrément du compteur refusée', denied(await upd(free, 0, phone, rid, T, reg())));
  check('Inscription avec mauvais incrément (+2 pour 1 personne) refusée', denied(await upd(free, 0, phone, rid, T + 2, reg())));
  check('Téléphone invalide refusé', denied(await upd(free, 0, '12345', rid, T + 1, reg(1, { phone: '12345' }))));
  check('5 personnes refusé', denied(await upd(free, 0, phone, rid, T + 5, reg(5))));
  check('Champ inconnu refusé', denied(await upd(free, 0, phone, rid, T + 1, reg(1, { admin: true }))));
  check('Nom trop court refusé', denied(await upd(free, 0, phone, rid, T + 1, reg(1, { name: 'A' }))));

  const good = await upd(free, 0, phone, rid, T + 1, reg());
  check('Inscription valide acceptée', good.status === 200);
  check('Compteur public incrémenté', (await call('GET', `events/${free}/taken`)).json === T + 1);
  check('Doublon de téléphone refusé', denied(await upd(free, 0, phone, '-testRegB', T + 2, reg())));
  check('Inscription concurrente périmée (même compteur) refusée', denied(await upd(free, 0, '0655443322', '-testRegC', T + 1, reg(1, { phone: '0655443322' }))));
  const st = await call('GET', `registrations/${free}/${rid}/status`);
  check('Le visiteur peut lire le STATUT de son inscription (identifiant connu)', st.status === 200 && st.json === 'ok');
  check('Le visiteur ne peut pas relire l’inscription complète', denied(await call('GET', `registrations/${free}/${rid}`)));
  check('Le visiteur ne peut pas lire le téléphone d’une inscription', denied(await call('GET', `registrations/${free}/${rid}/phone`)));
  check('Le visiteur ne peut pas lister les inscriptions d’un événement', denied(await call('GET', `registrations/${free}`)));
  check('Hausse du compteur de +10 refusée', denied(await call('PUT', `events/${free}/taken`, T + 11)));

  if (full) {
    const Tf = ev[full].taken;
    check('Inscription « ok » sur événement complet refusée', denied(await upd(full, 0, '0677889900', '-testFull', Tf + 1, reg(1, { phone: '0677889900' }))));
    const w = await call('PATCH', '', { [`registrations/${full}/-testWait`]: reg(1, { phone: '0677889900', status: 'wait' }), [`phones/${full}/0677889900`]: '-testWait' });
    check('Liste d’attente sur événement complet acceptée', w.status === 200);
    const wd = await call('PATCH', '', { [`registrations/${full}/-testWait`]: null, [`phones/${full}/0677889900`]: null });
    check('Retrait de la liste d’attente accepté', wd.status === 200);
  }

  const cancel = await call('PATCH', '', { [`registrations/${free}/${rid}`]: null, [`phones/${free}/${phone}`]: null, [`events/${free}/taken`]: T });
  check('Annulation par le visiteur (identifiant connu) acceptée', cancel.status === 200);
  check('Compteur revenu à sa valeur initiale', (await call('GET', `events/${free}/taken`)).json === T);
  check('Suppression en masse de /registrations refusée', denied(await call('DELETE', 'registrations')));

  /* ---------- Mur d'idées (jalon 6) : visiteurs anonymes, et administrateur si ADMIN_EMAIL / ADMIN_PASSWORD sont définies ---------- */
  const KEY = ((await import('node:fs')).readFileSync(new URL('../src/firebase.js', import.meta.url), 'utf8').match(/test: \{\s*apiKey: '([^']+)'/) || [])[1];
  const idt = async (path, body) => (await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${path}?key=${KEY}`, { method: 'POST', body: JSON.stringify({ returnSecureToken: true, ...body }) })).json());
  const A = await idt('signUp', {}), B = await idt('signUp', {});
  if (!A.idToken) { console.log('\nAuthentification anonyme indisponible (activez-la dans la console Firebase du projet de test) : tests des idées ignorés.'); ko++; }
  else {
    const R = Date.now().toString(36), TS = { '.sv': 'timestamp' }, ia = A.idToken, ib = B.idToken, ua = A.localId, ub = B.localId;
    const idea = (uid, extra = {}) => ({ text: 'Idée de test automatique', name: 'Testeur', createdAt: TS, status: 'pending', uid, ...extra });
    const create = (tok, uid, id, data, lim = true) => call('PATCH', '', { [`ideas/${id}`]: data, ...(lim ? { [`ideaLimit/${uid}`]: TS } : {}) }, tok);

    check('Idées : lecture de /ideas refusée (visiteur)', denied(await call('GET', 'ideas')));
    check('Idées : lecture de /ideas refusée (anonyme)', denied(await call('GET', 'ideas', undefined, ia)));
    check('Idées : lecture de /ideaLimit refusée (anonyme)', denied(await call('GET', 'ideaLimit', undefined, ia)));
    check('Idées : lecture de /ideaVotes refusée (anonyme)', denied(await call('GET', 'ideaVotes', undefined, ia)));
    check('Idées : lecture publique de /ideasPublic autorisée', (await call('GET', 'ideasPublic')).status === 200);
    check('Idées : création sans connexion refusée', denied(await call('PATCH', '', { [`ideas/-tI0${R}`]: idea('x'), 'ideaLimit/x': TS })));
    check('Idées : statut « ok » refusé', denied(await create(ia, ua, `-tI1${R}`, idea(ua, { status: 'ok' }))));
    check('Idées : uid d’un autre refusé', denied(await create(ia, ua, `-tI2${R}`, idea(ub))));
    check('Idées : texte de 141 caractères refusé', denied(await create(ia, ua, `-tI3${R}`, idea(ua, { text: 'x'.repeat(141) }))));
    check('Idées : prénom de 31 caractères refusé', denied(await create(ia, ua, `-tI4${R}`, idea(ua, { name: 'x'.repeat(31) }))));
    check('Idées : champ inconnu refusé', denied(await create(ia, ua, `-tI5${R}`, idea(ua, { votes: 99 }))));
    check('Idées : date falsifiée refusée', denied(await create(ia, ua, `-tI6${R}`, idea(ua, { createdAt: 1 }))));
    check('Idées : création sans mise à jour de la limite refusée', denied(await create(ia, ua, `-tI7${R}`, idea(ua), false)));
    check('Idées : écriture de la limite d’un autre refusée', denied(await call('PUT', `ideaLimit/${ub}`, TS, ia)));
    const ok1 = await create(ia, ua, `-tIdeaA${R}`, idea(ua));
    check('Idées : création valide (en attente) acceptée', ok1.status === 200);
    check('Idées : 2e idée immédiate (limite 5 min) refusée', denied(await create(ia, ua, `-tIdeaA2${R}`, idea(ua))));
    check('Idées : modification de l’idée par son auteur refusée', denied(await call('PATCH', `ideas/-tIdeaA${R}`, { status: 'ok' }, ia)));
    check('Idées : une idée en attente n’est pas publique', (await call('GET', `ideasPublic/-tIdeaA${R}`)).json === null);
    check('Idées : création de ideasPublic par un anonyme refusée', denied(await call('PUT', 'ideasPublic/-tP0', { text: 'x', name: 'x', createdAt: 1, votes: 5 }, ia)));
    const okB = await create(ib, ub, `-tIdeaB${R}`, idea(ub));
    check('Idées : un autre appareil peut proposer (limite par appareil)', okB.status === 200);

    const EM = process.env.ADMIN_EMAIL, PW = process.env.ADMIN_PASSWORD;
    let admin = null;
    if (!EM || !PW) console.log('\nADMIN_EMAIL / ADMIN_PASSWORD non définies dans cette fenêtre.');
    else {
      const r = await idt('signInWithPassword', { email: EM, password: PW });
      admin = r.idToken;
      if (!admin) console.log('\nConnexion admin refusée par Firebase :', r.error?.message);
      else if (r.localId !== 'DHxXDMMYv7hWHt259q3lAWzvIQb2') { console.log('\nCe compte n’est pas l’admin du projet de test.'); admin = null; }
    }
    if (!admin) console.log('\n(ADMIN_EMAIL / ADMIN_PASSWORD absentes : tests administrateur et votes ignorés)');
    else {
      const pub = await call('PATCH', '', { [`ideas/-tIdeaA${R}/status`]: 'ok', [`ideasPublic/-tIdeaA${R}`]: { text: 'Idée de test automatique', name: 'Testeur', createdAt: Date.now(), votes: 0 } }, admin);
      check('Admin : publication acceptée', pub.status === 200);
      check('Admin : lecture de /ideas acceptée', (await call('GET', 'ideas', undefined, admin)).status === 200);
      check('Visiteur : idée publiée lisible', (await call('GET', `ideasPublic/-tIdeaA${R}/text`)).json === 'Idée de test automatique');
      const vote = (tok, uid, v, val = true) => call('PATCH', '', { [`ideaVotes/-tIdeaA${R}/${uid}`]: val, ['ideasPublic/-tIdeaA'+R+'/votes']: v }, tok);
      check('Vote : compteur seul (+1 sans vote) refusé', denied(await call('PUT', `ideasPublic/-tIdeaA${R}/votes`, 1, ia)));
      check('Vote : +2 refusé', denied(await vote(ia, ua, 2)));
      check('Vote : au nom d’un autre refusé', denied(await vote(ia, ub, 1)));
      check('Vote : valeur autre que true refusée', denied(await vote(ia, ua, 1, 'oui')));
      check('Vote : +1 avec le vote accepté', (await vote(ia, ua, 1)).status === 200);
      check('Vote : deuxième vote du même appareil refusé', denied(await vote(ia, ua, 2)));
      check('Vote : autre appareil +1 accepté', (await vote(ib, ub, 2)).status === 200);
      check('Vote : lecture de son propre vote autorisée', (await call('GET', `ideaVotes/-tIdeaA${R}/${ua}`, undefined, ia)).json === true);
      check('Vote : lecture du vote d’un autre refusée', denied(await call('GET', `ideaVotes/-tIdeaA${R}/${ub}`, undefined, ia)));
      check('Vote : lister les votants refusé', denied(await call('GET', `ideaVotes/-tIdeaA${R}`, undefined, ia)));
      check('Vote : retrait sans décrément refusé', denied(await call('PUT', `ideaVotes/-tIdeaA${R}/${ua}`, null, ia)));
      check('Vote : retrait avec -1 accepté', (await call('PATCH', '', { [`ideaVotes/-tIdeaA${R}/${ua}`]: null, ['ideasPublic/-tIdeaA'+R+'/votes']: 1 }, ia)).status === 200);
      check('Vote : décrément seul (sans retirer le vote) refusé', denied(await call('PUT', `ideasPublic/-tIdeaA${R}/votes`, 0, ib)));
      check('Vote : modification du texte publié par un anonyme refusée', denied(await call('PUT', `ideasPublic/-tIdeaA${R}/text`, 'piraté', ia)));
      const c = await call('PATCH', '', { [`ideas/-tIdeaA${R}`]: null, [`ideas/-tIdeaB${R}`]: null, [`ideasPublic/-tIdeaA${R}`]: null, [`ideaVotes/-tIdeaA${R}`]: null, [`ideaLimit/${ua}`]: null, [`ideaLimit/${ub}`]: null }, admin);
      check('Nettoyage des données de test (admin)', c.status === 200);
    }
    if (!admin) console.log(`À supprimer à la main (console, projet de test) : ideas/-tIdeaA${R}, ideas/-tIdeaB${R}, ideaLimit/` + ua + ', ideaLimit/' + ub);
  }
  console.log(`\n${ok} réussis, ${ko} échec(s).`);
  process.exit(ko ? 1 : 0);
})();
