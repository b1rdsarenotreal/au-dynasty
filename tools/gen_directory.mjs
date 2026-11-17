import fs from 'node:fs';
// Writes js/directory.js from AAU Soccer's school and logo lists (the sport
// apps keep the same lists). Run: node tools/gen_directory.mjs (with the
// aau-soccer repo next to this one).
const S = await import(new URL('../../aau-soccer/js/aau-schools.js', import.meta.url).href);
const LG = await import(new URL('../../aau-soccer/js/', import.meta.url).href + 'logo-import.js');
const schools = Object.fromEntries(Object.entries(S.AAU_SCHOOLS).map(([k, v]) => [k, { abbr: v.abbr, mascot: v.mascot, color: v.color, altColor: v.altColor, city: v.city, conference: v.conference, ...(v.joins ? { joins: v.joins } : {}), ...(v.crop ? { crop: v.crop } : {}), ...(LG.DEFAULT_LOGOS[k] ? { logo: LG.DEFAULT_LOGOS[k] } : {}) }]));
const confs = Object.fromEntries(Object.entries(S.AAU_CONFERENCES).map(([k, v]) => [k, { abbr: v.abbr, color: v.color, altColor: v.altColor, logo: v.logo }]));
const out = `// The AAU's schools and conferences, for the Realignment page: every member
// school (and the owner's next ones) with its look, and the all-sports
// conferences with their logos. Copied from the sport apps' js/aau-schools.js
// and logo-import.js (Nov. 2026); regenerate with tools/gen_directory.mjs
// when those change.

export const DIRECTORY_SCHOOLS = {
${Object.entries(schools).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}
};

export const DIRECTORY_CONFERENCES = {
${Object.entries(confs).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}
};
`;
fs.writeFileSync(new URL('../js/directory.js', import.meta.url), out);
console.log(Object.keys(schools).length, Object.keys(confs).length);
