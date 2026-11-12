// Migration : ancien modèle (events/*/participants) -> nouveau (events + registrations + phones).
// Usage : node scripts/migrate.js sauvegardes/rtdb-2026-11-12.json
// Écrit deux fichiers dans sauvegardes/ (git-ignoré) :
//   migration-prod.json : données réelles migrées (pour la production)
//   migration-test.json : mêmes données, noms et téléphones anonymisés (pour le projet de test)
const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src) { console.error('Usage : node scripts/migrate.js <sauvegarde.json>'); process.exit(1); }
const old = JSON.parse(fs.readFileSync(src, 'utf8'));
const outDir = path.dirname(src);

const toLocalPhone = p => String(p).replace(/[\s.\-]/g, '').replace(/^\+33/, '0');

function build(anonymize) {
  const out = { events: {}, registrations: {}, phones: {} };
  let n = 0;
  for (const [eid, e] of Object.entries(old.events || {})) {
    const parts = Object.entries(e.participants || {});
    const { participants, ...rest } = e;
    out.events[eid] = { ...rest, taken: parts.length, description: rest.description || '' };
    if (!parts.length) continue;
    out.registrations[eid] = {};
    out.phones[eid] = {};
    for (const [rid, p] of parts) {
      n++;
      const phone = anonymize ? `060000${String(n).padStart(4, '0')}` : toLocalPhone(p.phone);
      if (!/^0[1-9][0-9]{8}$/.test(phone)) { console.warn(`Téléphone invalide ignoré : ${eid}/${rid}`); continue; }
      if (out.phones[eid][phone]) { console.warn(`Doublon ignoré : ${eid}/${rid}`); continue; }
      out.registrations[eid][rid] = {
        name: anonymize ? `Inscrit ${n}` : String(p.name).trim().slice(0, 60),
        phone, people: 1, status: 'ok',
        createdAt: Date.parse(p.registeredAt) || Date.now(),
      };
      out.phones[eid][phone] = rid;
    }
    out.events[eid].taken = Object.keys(out.registrations[eid]).length;
  }
  return out;
}

for (const [name, anon] of [['migration-prod.json', false], ['migration-test.json', true]]) {
  const data = build(anon);
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(data, null, 1));
  const regs = Object.values(data.registrations).reduce((s, r) => s + Object.keys(r).length, 0);
  console.log(`${name} : ${Object.keys(data.events).length} événements, ${regs} inscriptions`);
}
