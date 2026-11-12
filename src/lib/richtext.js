// Mise en forme légère des descriptions (texte stocké tel quel, 1000 caractères au plus).
// Syntaxe : **gras**, *italique*, [texte](https://adresse), lignes commençant par « - » = liste, ligne vide = nouveau paragraphe.
// Sécurité : tout le texte est échappé AVANT la mise en forme ; seuls <b>, <i>, <ul>, <li>, <p>, <br> et <a href="http(s)://…"> sont produits.
import { esc } from './dom.js';

const LINK = /\[([^\]\n]{1,100})\]\((https?:\/\/[^\s()<>"']{1,300})\)/g;

function inline(line) {
  const links = [];
  let s = esc(line).replace(LINK, (_, label, url) => { links.push(`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`); return `\u0000${links.length - 1}\u0000`; });
  s = s.replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '<b>$1</b>').replace(/\*(?=\S)(.+?)(?<=\S)\*/g, '<i>$1</i>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => links[i]);
}

export function richHtml(text) {
  const out = []; let para = [], list = [];
  const flushPara = () => { if (para.length) out.push(`<p>${para.join('<br>')}</p>`); para = []; };
  const flushList = () => { if (list.length) out.push(`<ul>${list.map(li => `<li>${li}</li>`).join('')}</ul>`); list = []; };
  for (const raw of String(text ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd(), item = line.match(/^\s*[-•]\s+(.*)$/);
    if (item) { flushPara(); list.push(inline(item[1])); }
    else if (!line.trim()) { flushPara(); flushList(); }
    else { flushList(); para.push(inline(line)); }
  }
  flushPara(); flushList();
  return out.join('');
}

// Version sans balisage (agenda .ics, messages).
export const richPlain = text => String(text ?? '').replace(/\r\n?/g, '\n')
  .replace(LINK, '$1 ($2)').replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '$1').replace(/\*(?=\S)(.+?)(?<=\S)\*/g, '$1')
  .replace(/^\s*-\s+/gm, '• ');
