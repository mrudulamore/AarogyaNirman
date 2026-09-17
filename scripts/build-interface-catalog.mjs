import fs from 'node:fs';
const result = {};
for (const line of fs.readFileSync('src/i18n/locales/interface.tsv', 'utf8').split(/\r?\n/).filter(Boolean)) {
  const parts = line.split('|');
  if (parts.length !== 3 || parts.some(p => !p.trim())) throw new Error(`Invalid translation: ${line}`);
  const [source, hi, mr] = parts;
  if (result[source]) throw new Error(`Duplicate translation: ${source}`);
  result[source] = [hi, mr];
}
fs.writeFileSync('src/i18n/locales/interface.json', JSON.stringify(result, null, 2) + '\n');
console.log(`Built ${Object.keys(result).length} Hindi and Marathi interface translations`);
