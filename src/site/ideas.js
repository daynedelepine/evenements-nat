// Mur d'idées : proposition (modérée), liste publiée, vote « J'aime » (un par appareil, via l'authentification anonyme).
import { ref, push, update, get, onValue, serverTimestamp } from 'firebase/database';
import { db } from '../firebase.js';
import { $, store, toast } from '../lib/dom.js';
import { ideasList } from './views.js';

const LIMIT_MS = 5 * 60 * 1000;
let published = [];                       // { id, text, name, votes, createdAt }
let myIdeas = store.get('nat-ideas', []); // idées envoyées depuis cet appareil : { id, text, name, ts }
const voted = new Set();                  // idées que cet appareil a aimées (lues dans la base)
const watching = new Map();
let started = false;

// Identifiant d'appareil aléatoire (aucun compte, aucune donnée personnelle) : un vote par appareil, limite de fréquence.
function newId() { const b = crypto.getRandomValues(new Uint8Array(18)); return btoa(String.fromCharCode(...b)).replaceAll('+', '-').replaceAll('/', '_'); }
let uid = store.get('nat-device', null);
if (!uid) { uid = newId(); store.set('nat-device', uid); }
const getUid = () => Promise.resolve(uid);

function render() {
  const list = [...published].sort((a, b) => b.votes - a.votes || b.createdAt - a.createdAt);
  const ids = new Set(published.map(i => i.id));
  const pending = myIdeas.filter(p => !ids.has(p.id));
  $('#ideas-out').innerHTML = ideasList(list, voted, new Set(myIdeas.map(p => p.id)), pending, true);
}

// Suivi de MON vote sur chaque idée publiée (lecture de la seule clé qui porte mon identifiant).
function watchVotes() {
  published.forEach(i => {
    if (watching.has(i.id)) return;
    watching.set(i.id, onValue(ref(db, `ideaVotes/${i.id}/${uid}`), s => { s.exists() ? voted.add(i.id) : voted.delete(i.id); render(); }, () => {}));
  });
}

export function startIdeas() {
  if (started) return; started = true;
  const name = $('#i-name'); name.value = store.get('nat-idea-name', '') || (store.get('nat-me', { name: '' }).name || '').split(' ')[0];
  onValue(ref(db, 'ideasPublic'), s => {
    published = Object.entries(s.val() || {}).map(([id, v]) => ({ id, text: v.text, name: v.name, votes: v.votes || 0, createdAt: v.createdAt || 0 }));
    render(); watchVotes();
  }, err => { console.error('Lecture des idées impossible :', err.code); $('#ideas-out').innerHTML = '<p class="hint">Impossible de charger les idées. Vérifiez votre connexion.</p>'; });
  render();
}

$('#i-text').addEventListener('input', e => { $('#i-count').textContent = `${e.target.value.length} / 140`; });

$('#idea-form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const name = $('#i-name').value.trim().replace(/\s+/g, ' '), text = $('#i-text').value.trim().replace(/\s+/g, ' ');
  const err = $('#i-err'), btn = $('#i-submit'), fail = m => { err.textContent = m; err.hidden = false; };
  $('#i-thanks').hidden = true; err.hidden = true;
  if (!name) return fail('Indiquez votre prénom.');
  if (text.length < 3) return fail('Décrivez votre idée en quelques mots.');
  const last = Math.max(0, ...myIdeas.map(p => p.ts || 0));
  if (Date.now() - last < LIMIT_MS) return fail('Une idée toutes les 5 minutes : merci de patienter un instant.');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Envoi…';
  try {
    const me = await getUid(), id = push(ref(db, 'ideas')).key;
    await update(ref(db), {
      [`ideas/${id}`]: { text, name, createdAt: serverTimestamp(), status: 'pending', uid: me },
      [`ideaLimit/${me}`]: serverTimestamp(),
    });
    myIdeas.push({ id, text, name, ts: Date.now() }); store.set('nat-ideas', myIdeas.slice(-20)); store.set('nat-idea-name', name);
    $('#i-text').value = ''; $('#i-count').textContent = '0 / 140';
    $('#i-thanks').hidden = false; render();
  } catch (e) {
    console.error('Idée refusée :', e.code || e);
    fail(/permission_denied/i.test(e.message || e.code || '') ? 'Envoi impossible pour le moment : une idée toutes les 5 minutes. Réessayez un peu plus tard.' : 'Envoi impossible. Vérifiez votre connexion puis réessayez.');
  } finally { btn.disabled = false; btn.textContent = 'Proposer mon idée'; }
});

export async function toggleLike(id) {
  const btn = document.querySelector(`[data-like="${CSS.escape(id)}"]`); if (btn) btn.disabled = true;
  try {
    const me = await getUid(), on = voted.has(id);
    for (let attempt = 0; attempt < 2; attempt++) {
      const cur = (await get(ref(db, `ideasPublic/${id}/votes`))).val() ?? 0;
      try {
        // Écriture atomique : mon vote + le compteur (les règles exigent « ancien ± 1 »).
        await update(ref(db), { [`ideaVotes/${id}/${me}`]: on ? null : true, [`ideasPublic/${id}/votes`]: Math.max(0, cur + (on ? -1 : 1)) });
        return;
      } catch (e) { if (attempt) throw e; }   // compteur modifié entre-temps : on relit et on réessaie une fois
    }
  } catch (e) { console.error('Vote refusé :', e.code || e); toast('Vote impossible pour le moment. Réessayez.'); }
  finally { render(); }
}
