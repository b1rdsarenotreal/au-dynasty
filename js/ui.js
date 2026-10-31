// Shared UI pieces: the league in memory, saving, school and conference
// labels, game cards, the game detail dialog and small form helpers.

import { saveLeague } from './store.js?v=20261030222729';
import { esc } from './util.js?v=20261030222729';
import { winner } from './game.js?v=20261030222729';
import { weekLabel, yearLabel } from './league.js?v=20261030222729';
import { logoFor } from './logos.js?v=20261030222729';

export { esc };
export const ctx = { league: null, render: () => {} };
export const app = document.getElementById('app');
export const modal = document.getElementById('modal');
export const $ = (sel, root = app) => root.querySelector(sel);
export const $$ = (sel, root = app) => [...root.querySelectorAll(sel)];
export const L = () => ctx.league;
export const VY = () => ctx.league.years[ctx.league.viewYear];

let saveTimer;
export function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveLeague(ctx.league), 200); }
export function flushSave() { clearTimeout(saveTimer); return saveLeague(ctx.league); }
export function changed() { persist(); ctx.render(); }

export function toast(msg, error = false) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast show' + (error ? ' error' : '');
  clearTimeout(t._t); t._t = setTimeout(() => (t.className = 'toast'), error ? 5000 : 2600);
}

// Text color that reads on a background color.
export function readableOn(hex) {
  const h = (hex || '#333333').replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? '#111111' : '#ffffff';
}

// Badge letters: up to 4 on big badges; small ones get 1-2 letters so they
// stay readable (Duke → D, Michigan State → MS).
function initials(s, size) {
  const short = s.short || s.name || '?';
  const words = short.replace(/&/g, ' ').replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter(Boolean);
  if (s.abbr) return size < 30 ? s.abbr.slice(0, 3) : s.abbr;
  if (size >= 30) return short.length <= 4 ? short.toUpperCase() : words.length > 1 ? words.slice(0, 3).map(w => w[0]).join('').toUpperCase() : short.slice(0, 3).toUpperCase();
  if (short.length <= 3 && short === short.toUpperCase()) return short;
  return words.length > 1 ? words.slice(0, 2).map(w => w[0]).join('').toUpperCase() : words[0][0].toUpperCase();
}

// A square monogram in the school's colors.
export function badge(id, size = 20) {
  const s = L().schools[id] || { short: id, colors: ['#555555', '#999999'] };
  const [c1, c2] = s.colors;
  const txt = initials(s, size);
  const fs = Math.round(size * (txt.length > 3 ? 0.34 : txt.length > 2 ? 0.4 : txt.length > 1 ? 0.5 : 0.62));
  const mono = `<span class="tbadge" style="--tc:${c1};--ta:${c2};--tt:${readableOn(c1)};width:${size}px;height:${size}px;font-size:${fs}px">${esc(txt)}</span>`;
  const url = logoFor(s);
  if (!url) return mono;
  // If the image fails to load, the monogram takes its place.
  return `<span class="logo" style="width:${size}px;height:${size}px" data-fb="${esc(mono)}"><img src="${esc(url)}" alt="" width="${size}" height="${size}" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.outerHTML=this.parentNode.dataset.fb"></span>`;
}

export const schoolHref = id => `#/school/${encodeURIComponent(id)}`;
export const sportHref = (id, tab = '') => `#/sport/${id}${tab ? `/${tab}` : ''}`;
export const confHref = id => `#/conference/${encodeURIComponent(id)}`;

export function school(id, { link = true, size = 18, seed = null, rec = '' } = {}) {
  const s = L().schools[id];
  const name = esc(s?.short || id);
  const label = link ? `<a class="team-link" href="${schoolHref(id)}">${name}</a>` : name;
  return `<span class="team">${seed ? `<span class="rank">${seed}</span>` : ''}${badge(id, size)}${label}${rec ? ` <span class="muted small">${esc(rec)}</span>` : ''}</span>`;
}

export function confBadge(id, { link = true } = {}) {
  if (!id) return '<span class="cbadge ind">IND</span>';
  const c = L().conferences[id];
  if (!c) return '<span class="cbadge ind">?</span>';
  const b = `<span class="cbadge" style="--cc:${c.color}" title="${esc(c.name)}">${esc(c.abbr)}</span>`;
  return link ? `<a href="${confHref(id)}" style="text-decoration:none">${b}</a>` : b;
}

export const sportName = id => L().sports[id]?.name || id;

// A finished or upcoming game as a small card.
export function gameCard(sport, ss, g) {
  const c = g.c && L().conferences[g.c];
  const fin = g.hs != null, w = fin ? winner(g) : null;
  const row = (side, t, s) => `<div class="ln"><div class="t ${fin ? (w === side ? 'winner' : w ? 'loser' : '') : ''}">${school(t, { link: false })}</div><div class="s">${fin ? s : ''}</div></div>`;
  const notes = [];
  if (g.p) notes.push(`<span class="badge gold">Championship</span>`);
  if (g.n) notes.push(`Game ${g.n}`);
  if (g.ot) notes.push(sport.model === 'innings' ? `${sport.params.innings + g.ot} inn` : g.ot > 1 ? `${g.ot}OT` : 'OT');
  if (g.so) notes.push('Shootout');
  if (g.neu) notes.push('Neutral site');
  return `<div class="game ${c ? 'conf' : ''} ${fin ? '' : 'pending'}" style="${c ? `--cc:${c.color}` : ''}" data-game="${g.id}" data-sport="${sport.id}">
    ${row('away', g.a, g.as)}${row('home', g.h, g.hs)}
    <div class="meta">${c ? confBadge(g.c, { link: false }) : '<span>Non-conference</span>'}${notes.map(n => `<span>${n}</span>`).join('')}${fin ? '<span class="badge final" style="margin-left:auto">Final</span>' : ''}</div>
  </div>`;
}

export function bindGameCards(root = app) {
  for (const el of $$('[data-game]', root)) el.onclick = () => openGame(el.dataset.sport, Number(el.dataset.game));
}

function periodLabels(sport, n, g) {
  const p = sport.params;
  if (sport.model === 'innings') return Array.from({ length: n }, (_, i) => i + 1);
  if (sport.model === 'sets') return Array.from({ length: n }, (_, i) => (p.flights ? `P${i + 1}` : `S${i + 1}`));
  const reg = sport.model === 'football' ? 4 : p.periods;
  return Array.from({ length: n }, (_, i) => (i < reg ? (reg === 2 ? `${i + 1}H` : reg === 3 ? `P${i + 1}` : `Q${i + 1}`) : n - reg > 1 ? `OT${i - reg + 1}` : 'OT'));
}

export function openModal(html, bind = () => {}) {
  modal.innerHTML = html;
  modal.showModal();
  for (const b of $$('[data-close]', modal)) b.onclick = () => modal.close();
  bind(modal);
}

export function openGame(sportId, id) {
  const lg = L(), sport = lg.sports[sportId], ss = VY().sports[sportId];
  const g = ss?.games.find(x => x.id === id);
  if (!g) return;
  const fin = g.hs != null, w = fin ? winner(g) : null;
  const n = fin ? Math.max(g.line[0].length, g.line[1].length) : 0;
  const labels = fin ? periodLabels(sport, n, g) : [];
  const total = sport.model === 'sets' ? (sport.params.flights ? 'Pts' : 'Sets') : sport.model === 'innings' ? 'R' : 'T';
  const extra = sport.model === 'innings' && g.hits ? ['H', 'E'] : [];
  const row = (side, t, line, s, i) => `<tr><td>${school(t)}</td>${line.map(x => `<td>${x == null ? 'x' : x}</td>`).join('')}<td class="tot ${w === side ? 'winner' : ''}">${s}</td>${extra.length ? `<td>${g.hits[i]}</td><td>${g.errors[i]}</td>` : ''}</tr>`;
  const conf = g.c ? `${confBadge(g.c)} conference game` : 'Non-conference';
  const where = g.neu ? 'Neutral site' : `at ${esc(lg.schools[g.h]?.city || '')}${lg.schools[g.h]?.state ? `, ${esc(lg.schools[g.h].state)}` : ''}`;
  openModal(`<div class="modal-head"><h2>${esc(lg.schools[g.a]?.short)} at ${esc(lg.schools[g.h]?.short)}</h2><button class="btn ghost" data-close>Close</button></div>
    <div class="modal-body stack">
      <div class="muted">${esc(sport.name)} · ${weekLabel(lg.viewYear, g.w)} · ${yearLabel(lg.viewYear)} · ${where} · ${conf}${g.p ? ' · National championship' : ''}</div>
      ${fin ? `<div class="lscore"><table><thead><tr><th></th>${labels.map(l => `<th>${l}</th>`).join('')}<th>${total}</th>${extra.map(x => `<th>${x}</th>`).join('')}</tr></thead>
        <tbody>${row('away', g.a, g.line[1], g.as, 1)}${row('home', g.h, g.line[0], g.hs, 0)}</tbody></table></div>
        ${g.so ? `<div class="hint">Tied after overtime; ${esc(lg.schools[g.so === 'home' ? g.h : g.a]?.short)} won the shootout.</div>` : ''}
        ${g.detail ? `<div class="small muted">Pairs: ${g.detail.map((d, i) => `#${i + 1} ${d}`).join(' · ')}</div>` : ''}`
        : '<div class="empty">Not played yet.</div>'}
    </div>`);
}

// <option> list helper.
export function options(list, selected) {
  return list.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(selected) ? 'selected' : ''}>${esc(l)}</option>`).join('');
}
