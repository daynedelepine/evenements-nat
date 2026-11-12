// Tests des règles de sécurité en tant que VISITEUR (sans connexion) via l'API REST.
// Usage : node scripts/test-rules.js https://evenements-nat-test-default-rtdb.firebaseio.com
// À lancer sur le projet de TEST uniquement (le script crée puis supprime des inscriptions factices).
const DB = (process.argv[2] || '').replace(/\/$/, '');
if (!DB.includes('test')) { console.error('Refusé : l’URL doit être celle du projet de test.'); process.exit(1); }

const call = async (method, path, body) => {
  const r = await fetch(`${DB}/${path}.json`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
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
  check('Le visiteur ne peut pas relire son inscription', denied(await call('GET', `registrations/${free}/${rid}`)));
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
  console.log(`\n${ok} réussis, ${ko} échec(s).`);
  process.exit(ko ? 1 : 0);
})();
