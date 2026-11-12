export const toLocalPhone = p => String(p).replace(/[\s.\-]/g, '').replace(/^\+33/, '0');
export const validPhone = p => /^0[1-9]\d{8}$/.test(toLocalPhone(p)); // même motif que les règles Firebase
export const formatPhone = v => v.replace(/\D/g, '').slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ').trim();
export const intlPhone = p => '33' + toLocalPhone(p).slice(1);
export const spacedPhone = p => toLocalPhone(p).replace(/(\d{2})(?=\d)/g, '$1 ');
