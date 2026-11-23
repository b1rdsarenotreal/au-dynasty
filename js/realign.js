// Realignment (#/realign): the AAU's conferences as a board. Drag schools
// between conferences, bring schools into the AAU from the directory, add
// conferences. Saving leaves the plan in this browser (IndexedDB
// `aau-realignment`, the one thing the hub writes for the apps); each sport's
// app offers it in its next offseason, where the commissioner reviews and
// applies it (or skips it for that sport). The apps mark a plan applied or
// skipped in their own save (`league.realign[planId]`), which this page reads.

import { ctx, app, modal, $, $$, esc, toast, readableOn, schoolLook, assetUrl } from './ui.js?v=20261122204729';
import { logoFor } from './logos.js?v=20261122204729';
import { DIRECTORY_SCHOOLS, DIRECTORY_CONFERENCES } from './directory.js?v=20261122204729';
import { openApp, appHref } from './live.js?v=20261122204729';

export const REALIGN_KEY = 'aau-realignment';
const OUT = '__out__'; // the "Not in the AAU" tray

// The plan lives in its own small IndexedDB database (`aau-realignment`,
// store 'kv', key 'plan'), shared by every app on the site. localStorage is
// only a fallback: the site's localStorage is shared by all the apps and is
// often full (each caches its logo list there), which is why saving there
// failed (Nov. 2026).
const DB = 'aau-realignment';
function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbDo(mode, fn) {
  const db = await idb();
  try {
    return await new Promise((resolve, reject) => {
      const t = db.transaction('kv', mode), r = fn(t.objectStore('kv'));
      t.oncomplete = () => resolve(r?.result); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error);
    });
  } finally { db.close(); }
}
let planCache; // undefined until read
export function readPlan() { return planCache || null; }
export async function loadPlan() {
  let p = null;
  try { p = await idbDo('readonly', st => st.get('plan')); } catch { /* fall back */ }
  if (!p) try { p = JSON.parse(localStorage.getItem(REALIGN_KEY) || 'null'); } catch { p = null; }
  return (planCache = p || null);
}
async function writePlan(plan) {
  let ok = false;
  try { await idbDo('readwrite', st => st.put(plan, 'plan')); ok = true; } catch (e) { console.warn('saving the plan failed', e); }
  try { localStorage.setItem(REALIGN_KEY, JSON.stringify(plan)); ok = true; } catch { /* full: the database copy is enough */ }
  if (ok) planCache = plan;
  return ok;
}
async function clearPlan() {
  try { await idbDo('readwrite', st => st.delete('plan')); } catch { /* ignore */ }
  try { localStorage.removeItem(REALIGN_KEY); } catch { /* ignore */ }
  planCache = null;
}

const CONF_LINKS = {
  bigten: 'https://content.sportslogos.net/logos/153/4661/full/big_ten_conference_logo_primary_20115933.png',
  ivy: 'https://content.sportslogos.net/logos/153/4824/full/ivy_league_logo_primary_2019_sportslogosnet-9024.png',
  metro: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/METRO_Primary_LtBG.png/500px-METRO_Primary_LtBG.png',
  pac10: 'https://content.sportslogos.net/logos/153/4945/full/pacific-10_conference_logo_wordmark_1995_sportslogosnet-1134.png',
  uaa: 'https://dbukjj6eu5tsf.cloudfront.net/uaasports.info/images/responsive_2023/logo-main.svg',
  wac: 'https://content.sportslogos.net/logos/153/4669/full/western_athletic_conference_logo_primary_19922010.png',
};
const confUrl = u => { const m = /^img\/conf\/(\w+)\.svg$/.exec(u || ''); return assetUrl((m && CONF_LINKS[m[1]]) || u); };

// The AAU's all-sports conferences: the directory's, plus any named in the
// apps' saves that several sports share (a conference made by hand).
function currentAlignment() {
  const votes = {}, confInfo = {}, confSports = {};
  for (const { league, sport } of ctx.live || []) {
    const teams = league.draft?.teams || league.seasons?.[league.currentYear]?.teams || {};
    for (const [s, t] of Object.entries(teams)) {
      if (!t?.conference || t.conference === 'Independent') continue;
      ((votes[s] ||= {})[t.conference] = (votes[s][t.conference] || 0) + 1);
      (confSports[t.conference] ||= new Set()).add(sport.id);
    }
    for (const [c, info] of Object.entries(league.conferences || {})) if (!info?.retired) confInfo[c] ||= info;
  }
  const allSports = new Set(Object.keys(DIRECTORY_CONFERENCES));
  for (const [c, set] of Object.entries(confSports)) if (set.size >= 3) allSports.add(c);
  const schools = {};
  for (const [s, v] of Object.entries(votes)) {
    const best = Object.entries(v).filter(([c]) => allSports.has(c)).sort((a, b) => b[1] - a[1])[0];
    if (best) schools[s] = best[0];
  }
  // No saves in this browser: the directory's members (not the next crop).
  if (!Object.keys(schools).length) for (const [s, x] of Object.entries(DIRECTORY_SCHOOLS)) if (!x.crop) schools[s] = x.conference;
  const conferences = {};
  for (const c of new Set(Object.values(schools))) conferences[c] = { ...(confInfo[c] || {}), ...(DIRECTORY_CONFERENCES[c] || {}) };
  return { schools, conferences };
}

const look = s => {
  const seen = schoolLook(s), dir = DIRECTORY_SCHOOLS[s] || {};
  return { abbr: seen.abbr || dir.abbr, color: seen.color || dir.color || '#666', altColor: dir.altColor, logo: seen.logo || dir.logo || null, mascot: dir.mascot, city: dir.city };
};
function logo(s, size = 22) {
  const t = look(s), url = logoFor({ school: s, logoOverride: t.logo }, { Penn: 'Pennsylvania' });
  const badge = `<span class="tbadge" style="width:${size}px;height:${size}px;font-size:${Math.max(7, size * 0.38)}px;background:${esc(t.color)};color:${esc(readableOn(t.color))}">${esc((t.abbr || s).slice(0, 4))}</span>`;
  return url ? `<span class="logo" data-fb="${esc(badge)}" style="width:${size}px;height:${size}px"><img src="${esc(url)}" alt="" width="${size}" height="${size}" loading="lazy" onerror="this.parentNode.outerHTML=this.parentNode.dataset.fb"></span>` : badge;
}
const confBadge = (c, info, size = 26) => {
  const badge = `<span class="tbadge" style="width:${size}px;height:${size}px;font-size:${size * 0.32}px;background:${esc(info?.color || '#555')};color:#fff">${esc((info?.abbr || c).slice(0, 4))}</span>`;
  return info?.logo ? `<img class="ra-clogo" src="${esc(confUrl(info.logo))}" alt="" width="${size}" height="${size}" data-fb="${esc(badge)}" onerror="this.outerHTML=this.dataset.fb">` : badge;
};

// The board being edited: schools -> conference, the conferences on it.
let state = null;
function startState() {
  const base = currentAlignment(), saved = readPlan(), stamp = ctx.liveStamp || 0;
  state = saved
    ? { base, stamp, schools: { ...saved.schools }, conferences: { ...base.conferences, ...saved.conferences }, savedId: saved.id }
    : { base, stamp, schools: { ...base.schools }, conferences: { ...base.conferences }, savedId: null };
}

function changes() {
  const { base, schools } = state, out = { joins: [], moves: [], leaves: [], newConfs: [] };
  for (const [s, c] of Object.entries(schools)) {
    if (!base.schools[s]) out.joins.push([s, c]);
    else if (base.schools[s] !== c) out.moves.push([s, base.schools[s], c]);
  }
  for (const s of Object.keys(base.schools)) if (!schools[s]) out.leaves.push(s);
  const baseConfs = new Set(Object.values(base.schools));
  out.newConfs = [...new Set(Object.values(schools))].filter(c => !baseConfs.has(c));
  return out;
}
const sortS = list => [...list].sort((a, b) => a.localeCompare(b));

export function renderRealign() {
  if (planCache === undefined) { app.innerHTML = '<div class="empty">Loading…</div>'; loadPlan().then(() => renderRealign()); return; }
  // The saves are read after the first draw: start again from them unless
  // the board has been edited.
  if (!state || (!state.edited && state.stamp !== (ctx.liveStamp || 0))) startState();
  const { schools, conferences, base } = state;
  const ch = changes(), saved = readPlan();
  const members = c => sortS(Object.keys(schools).filter(s => schools[s] === c));
  const order = [...Object.keys(DIRECTORY_CONFERENCES).filter(c => conferences[c]), ...Object.keys(conferences).filter(c => !DIRECTORY_CONFERENCES[c]).sort()];
  const tag = s => !base.schools[s] ? '<span class="ra-tag join">Joins</span>' : base.schools[s] !== schools[s] ? `<span class="ra-tag move" title="From the ${esc(base.schools[s])}">From ${esc(conferences[base.schools[s]]?.abbr || base.schools[s])}</span>` : '';
  const options = s => `<option value="">Move…</option>${order.filter(c => c !== schools[s]).map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}${schools[s] ? `<option value="${OUT}">Not in the AAU</option>` : ''}`;
  const chip = s => `<div class="ra-chip${!base.schools[s] ? ' is-join' : base.schools[s] !== schools[s] ? ' is-move' : ''}" draggable="true" data-school="${esc(s)}">${logo(s)}<span class="ra-name">${esc(s)}</span>${tag(s)}<select class="ra-move" data-move="${esc(s)}" aria-label="Move ${esc(s)}">${options(s)}</select></div>`;
  const card = c => {
    const info = conferences[c] || {}, list = members(c), col = info.color || '#0b1f3a';
    return `<section class="ra-conf" data-drop="${esc(c)}" style="--cc:${esc(col)};--ci:${esc(readableOn(col))}">
      <header class="ra-chead">${confBadge(c, info)}<div><b>${esc(c)}</b><span>${list.length} school${list.length === 1 ? '' : 's'}</span></div>${list.length ? '' : `<button class="btn sm ghost ra-x" data-dropconf="${esc(c)}" title="Remove this conference">✕</button>`}</header>
      <div class="ra-chips">${list.length ? list.map(chip).join('') : '<p class="ra-empty">Drag schools here</p>'}</div>
      <button class="btn sm ghost ra-addhere" data-addto="${esc(c)}">+ Add a school</button></section>`;
  };
  const tray = sortS([...new Set([...Object.keys(DIRECTORY_SCHOOLS), ...Object.keys(base.schools)])].filter(s => !schools[s]));
  const q = (ctx.raQuery || '').trim().toLowerCase();
  const shown = tray.filter(s => !q || s.toLowerCase().includes(q));
  const n = ch.joins.length + ch.moves.length + ch.leaves.length;
  const line = (label, list, f) => list.length ? `<div class="ra-group"><h4>${label} <span class="muted">${list.length}</span></h4>${list.map(f).join('')}</div>` : '';
  const confName = c => esc(conferences[c]?.abbr || c);
  const summary = `${line('Joining the AAU', ch.joins, ([s, c]) => `<div class="ra-line">${logo(s, 18)}<b>${esc(s)}</b><span class="muted">→ ${confName(c)}</span></div>`)}
    ${line('Changing conferences', ch.moves, ([s, a, b]) => `<div class="ra-line">${logo(s, 18)}<b>${esc(s)}</b><span class="muted">${confName(a)} → ${confName(b)}</span></div>`)}
    ${line('Leaving the AAU', ch.leaves, s => `<div class="ra-line">${logo(s, 18)}<b>${esc(s)}</b><span class="muted">from ${confName(base.schools[s])}</span></div>`)}
    ${line('New conferences', ch.newConfs, c => `<div class="ra-line">${confBadge(c, conferences[c], 18)}<b>${esc(c)}</b></div>`)}`;
  // Where each sport stands with the saved plan.
  const status = saved ? (ctx.live || []).map(({ sport, league }) => {
    const st = league.realign?.[saved.id], off = !!league.draft;
    const text = st === 'applied' ? '<span class="ra-st ok">Applied</span>' : st === 'skipped' ? '<span class="ra-st">Skipped</span>' : off ? '<span class="ra-st go">Ready: offseason open</span>' : '<span class="ra-st wait">Next offseason</span>';
    return `<div class="ra-line"><a href="${esc(appHref(sport.id, '#/offseason') || '#')}" data-open="${esc(sport.id)}">${esc(sport.name)}</a><span class="spacer"></span>${text}</div>`;
  }).join('') : '';
  const dirty = !saved || JSON.stringify(sortObj(saved.schools)) !== JSON.stringify(sortObj(schools));
  app.innerHTML = `<div class="section-head"><div><div class="kicker">Every sport</div><h1>Realignment</h1></div>
      <span class="muted small">Drag schools between conferences (or use a school's Move menu), bring schools in from the Not in the AAU list, add conferences. Save, and each sport's app offers the changes in its next offseason for you to review and apply.</span></div>
    <div class="ra-bar card"><b>${n ? `${n} change${n === 1 ? '' : 's'}` : 'No changes yet'}</b>
      <span class="muted small">${ch.joins.length} joining · ${ch.moves.length} moving · ${ch.leaves.length} leaving${ch.newConfs.length ? ` · ${ch.newConfs.length} new conference${ch.newConfs.length === 1 ? '' : 's'}` : ''}</span>
      <span class="spacer"></span>
      <button class="btn" id="ra-newconf">+ Add a conference</button>
      <button class="btn ghost" id="ra-reset" ${n ? '' : 'disabled'}>Start over</button>
      ${saved ? '<button class="btn ghost danger" id="ra-withdraw">Withdraw saved plan</button>' : ''}
      <button class="btn primary" id="ra-save" ${n && dirty ? '' : 'disabled'}>${saved ? 'Save changes for the sports apps' : 'Save for the sports apps'}</button></div>
    ${saved ? `<p class="small muted">Saved ${esc(new Date(saved.saved).toLocaleString())}${dirty ? ' · <b>you have unsaved changes</b>' : ''}.</p>` : ''}
    <div class="ra-layout">
      <div class="ra-board">${order.map(card).join('')}</div>
      <aside class="ra-side">
        <section class="card ra-tray" data-drop="${OUT}"><h3>Not in the AAU</h3><p class="small muted">Drag a school onto a conference to bring it in; drag a member here to take it out of the AAU.</p>
          <input type="text" id="ra-q" placeholder="Find a school…" value="${esc(ctx.raQuery || '')}">
          <div class="ra-chips">${shown.map(s => `<div class="ra-chip out" draggable="true" data-school="${esc(s)}">${logo(s)}<span class="ra-name">${esc(s)}</span>${DIRECTORY_SCHOOLS[s]?.crop ? `<span class="ra-tag" title="Suggested conference">${esc(DIRECTORY_CONFERENCES[DIRECTORY_SCHOOLS[s].conference]?.abbr || '')}</span>` : ''}<select class="ra-move" data-move="${esc(s)}" aria-label="Add ${esc(s)}"><option value="">Add to…</option>${order.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></div>`).join('') || '<p class="ra-empty">No schools match.</p>'}</div></section>
        <section class="card"><h3>Changes</h3>${n || ch.newConfs.length ? summary : '<p class="small muted">Nothing changed from the current alignment.</p>'}</section>
        ${saved ? `<section class="card"><h3>In the sports apps</h3>${status || '<p class="small muted">No sport app saves in this browser yet.</p>'}<p class="small muted">Each app shows the plan on its Offseason page, where you see what it means for that sport (schools that don't play it are left out) and apply it.</p></section>` : ''}
      </aside></div>`;
  bind();
}
const sortObj = o => Object.fromEntries(Object.entries(o).sort((a, b) => a[0].localeCompare(b[0])));

function move(s, to) {
  if (!s) return;
  if (!to || to === OUT) delete state.schools[s]; else state.schools[s] = to;
  state.edited = true;
  renderRealign();
}

function bind() {
  let dragging = null;
  $$('.ra-chip').forEach(el => {
    el.addEventListener('dragstart', e => { dragging = el.dataset.school; e.dataTransfer.setData('text/plain', dragging); e.dataTransfer.effectAllowed = 'move'; el.classList.add('dragging'); });
    el.addEventListener('dragend', () => { el.classList.remove('dragging'); $$('.drag-over').forEach(x => x.classList.remove('drag-over')); });
  });
  $$('[data-drop]').forEach(zone => {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', e => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over'); });
    zone.addEventListener('drop', e => { e.preventDefault(); const s = e.dataTransfer.getData('text/plain') || dragging; move(s, zone.dataset.drop); });
  });
  $$('[data-move]').forEach(sel => (sel.onchange = () => sel.value && move(sel.dataset.move, sel.value)));
  $$('[data-addto]').forEach(b => (b.onclick = () => addSchoolModal(b.dataset.addto)));
  $$('[data-dropconf]').forEach(b => (b.onclick = () => { delete state.conferences[b.dataset.dropconf]; state.edited = true; renderRealign(); }));
  $$('[data-open]').forEach(a => (a.onclick = () => openApp(a.dataset.open)));
  const q = $('#ra-q');
  if (q) q.oninput = () => { ctx.raQuery = q.value; const pos = q.selectionStart; renderRealign(); const nq = $('#ra-q'); nq.focus(); nq.setSelectionRange(pos, pos); };
  $('#ra-newconf').onclick = newConferenceModal;
  $('#ra-reset').onclick = () => { if (!confirm('Go back to the current alignment? Unsaved changes are lost.')) return; state.schools = { ...state.base.schools }; state.conferences = { ...state.base.conferences }; state.edited = true; renderRealign(); };
  if ($('#ra-withdraw')) $('#ra-withdraw').onclick = () => { if (!confirm('Withdraw the saved plan? Sports that already applied it keep their changes; the others won\'t see it.')) return; clearPlan().then(() => { startState(); renderRealign(); toast('Plan withdrawn.'); }); };
  $('#ra-save').onclick = save;
}

function save() {
  const ch = changes();
  const used = new Set(Object.values(state.schools));
  const conferences = Object.fromEntries(Object.entries(state.conferences).filter(([c]) => used.has(c)).map(([c, i]) => [c, { abbr: i.abbr, color: i.color, altColor: i.altColor, logo: i.logo || null }]));
  const info = {};
  for (const s of ch.joins.map(x => x[0])) { const d = DIRECTORY_SCHOOLS[s]; if (d) info[s] = { abbr: d.abbr, mascot: d.mascot, color: d.color, altColor: d.altColor, city: d.city, logo: d.logo || null }; }
  const plan = { id: `r${Date.now().toString(36)}`, saved: new Date().toISOString(), schools: { ...state.schools }, conferences, joins: ch.joins.map(x => x[0]), left: ch.leaves, info };
  writePlan(plan).then(ok => {
    if (!ok) return toast('Could not save the plan in this browser.', true);
    state.savedId = plan.id; renderRealign();
    toast('Saved. Each sport\'s app offers it in its next offseason.');
  });
}

function addSchoolModal(conf) {
  const tray = sortS(Object.keys(DIRECTORY_SCHOOLS).filter(s => !state.schools[s]));
  const moves = sortS(Object.keys(state.schools).filter(s => state.schools[s] !== conf));
  modal.innerHTML = `<div class="modal-head"><h2>Add a school to the ${esc(conf)}</h2><button class="btn ghost" data-x>✕</button></div>
    <div class="modal-body"><input type="text" id="ras-q" placeholder="Find a school…" style="width:100%;margin-bottom:10px">
      <div id="ras-list" class="ra-pick"></div></div>`;
  const draw = () => {
    const q = $('#ras-q', modal).value.trim().toLowerCase(), f = s => !q || s.toLowerCase().includes(q);
    const row = (s, note) => `<button class="ra-pickrow" data-pick="${esc(s)}">${logo(s, 22)}<b>${esc(s)}</b><span class="muted small">${note}</span></button>`;
    $('#ras-list', modal).innerHTML = `${tray.filter(f).length ? `<h4>Not in the AAU</h4>${tray.filter(f).map(s => row(s, DIRECTORY_SCHOOLS[s].city || '')).join('')}` : ''}
      ${moves.filter(f).length ? `<h4>From another conference</h4>${moves.filter(f).map(s => row(s, esc(state.schools[s]))).join('')}` : ''}` || '<p class="muted">No schools match.</p>';
    $$('[data-pick]', modal).forEach(b => (b.onclick = () => { modal.close(); move(b.dataset.pick, conf); }));
  };
  $('#ras-q', modal).oninput = draw;
  $$('[data-x]', modal).forEach(b => (b.onclick = () => modal.close()));
  draw();
  modal.showModal();
  $('#ras-q', modal).focus();
}

function newConferenceModal() {
  const known = Object.keys(DIRECTORY_CONFERENCES).filter(c => !state.conferences[c]);
  modal.innerHTML = `<div class="modal-head"><h2>Add a conference</h2><button class="btn ghost" data-x>✕</button></div>
    <div class="modal-body">
      ${known.length ? `<h4 style="margin-top:0">AAU conferences</h4><div class="ra-pick">${known.map(c => `<button class="ra-pickrow" data-conf="${esc(c)}">${confBadge(c, DIRECTORY_CONFERENCES[c], 26)}<b>${esc(c)}</b></button>`).join('')}</div>` : ''}
      <h4>Or a new one</h4>
      <div class="row" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end"><label class="field" style="flex:2;min-width:180px">Name <input type="text" id="rac-name" placeholder="e.g. Mountain Conference"></label>
      <label class="field" style="width:90px">Abbr. <input type="text" id="rac-abbr" maxlength="5"></label><label class="field">Color <input type="color" id="rac-color" value="#2c5f8a"></label>
      <button class="btn primary" id="rac-add">Add</button></div></div>`;
  $$('[data-x]', modal).forEach(b => (b.onclick = () => modal.close()));
  $$('[data-conf]', modal).forEach(b => (b.onclick = () => { state.conferences[b.dataset.conf] = { ...DIRECTORY_CONFERENCES[b.dataset.conf] }; state.edited = true; modal.close(); renderRealign(); }));
  $('#rac-add', modal).onclick = () => {
    const name = $('#rac-name', modal).value.trim();
    if (!name) return toast('Give the conference a name.', true);
    if (state.conferences[name]) return toast('That conference is already on the board.', true);
    const abbr = $('#rac-abbr', modal).value.trim().toUpperCase() || name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 4);
    state.conferences[name] = { abbr, color: $('#rac-color', modal).value, altColor: '#ffffff', logo: null };
    state.edited = true; modal.close(); renderRealign();
  };
  modal.showModal();
}
