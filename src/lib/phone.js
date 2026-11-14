// Numéros : formats français (06…, +33…) et internationaux (+32…, 0032…, etc.).
// Forme enregistrée (« normalisée ») : 10 chiffres « 0XXXXXXXXX » pour un numéro français,
// « +CCCCCCCC » (+ puis 8 à 15 chiffres, sans espace) pour tout autre pays.
// Même motif que database.rules.json : (0[1-9][0-9]{8}|\+[1-9][0-9]{7,14})
export const normalizePhone = p => {
  let s = String(p).replace(/[\s.\-()]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  const fr = s.match(/^\+330?([1-9]\d{8})$/); // +33 6… ou +33 (0)6…
  return fr ? '0' + fr[1] : s;
};
export const validPhone = p => /^(0[1-9]\d{8}|\+[1-9]\d{7,14})$/.test(normalizePhone(p));
// Saisie : numéro français groupé par deux ; numéro international laissé tel quel (caractères parasites retirés).
export const formatPhone = v => /^\s*(\+|00)/.test(v)
  ? v.replace(/[^\d+\s.\-()]/g, '').replace(/(?!^\s*)\+/g, '').slice(0, 24)
  : v.replace(/\D/g, '').slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ').trim();
export const intlPhone = p => { const n = normalizePhone(p); return n.startsWith('+') ? n.slice(1) : '33' + n.slice(1); };
export const spacedPhone = p => { const n = normalizePhone(p); return n.startsWith('+') ? n : n.replace(/(\d{2})(?=\d)/g, '$1 '); };
