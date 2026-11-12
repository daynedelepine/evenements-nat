import { ic } from './icons.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
// Tout texte saisi par un utilisateur passe par esc() avant innerHTML
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible : le site fonctionne sans */ } },
};

export function toast(msg, action) {
  const box = $('#toasts'), el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
  if (action) $('button', el).addEventListener('click', () => { action.fn(); el.remove(); });
  box.append(el); setTimeout(() => el.remove(), action ? 6000 : 3500);
}

export function initTheme() {
  const root = document.documentElement, saved = store.get('nat-theme', null);
  if (saved) root.dataset.theme = saved;
  const btn = $('#theme-btn');
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const paint = () => { btn.innerHTML = ic(isDark() ? 'sun' : 'moon'); btn.setAttribute('aria-label', isDark() ? 'Passer en mode clair' : 'Passer en mode sombre'); };
  btn.addEventListener('click', () => { root.dataset.theme = isDark() ? 'light' : 'dark'; store.set('nat-theme', root.dataset.theme); paint(); });
  paint();
}

export function openSheet(dlg, html) {
  if (html !== undefined) $('.sheet-slot', dlg).innerHTML = html;
  if (!dlg.open) dlg.showModal();
}
// Fermeture : bouton [data-close] ou clic sur le fond
document.addEventListener('click', e => {
  const close = e.target.closest('[data-close]');
  if (close) close.closest('dialog').close();
  else if (e.target instanceof HTMLDialogElement) e.target.close();
});

export function initOfflineBanner() {
  const sync = () => { const b = $('#offline'); if (b) b.hidden = navigator.onLine; };
  addEventListener('online', sync); addEventListener('offline', sync); sync();
}

export function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type: type + ';charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
