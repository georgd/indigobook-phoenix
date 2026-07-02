import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const abbrevServiceURL = pathToFileURL(path.join(rootDir, 'lib', 'services', 'abbrevService.mjs')).href;
const { AbbrevService } = await import(abbrevServiceURL);

globalThis.Zotero = {
  Prefs: {
    get() {
      return '';
    },
    set() {},
  },
};

const cache = new Map();
const fakeDataStore = {
  async loadJSON(relPath) {
    if (cache.has(relPath)) return cache.get(relPath);
    const absPath = path.join(rootDir, relPath);
    const data = JSON.parse(await fs.readFile(absPath, 'utf8'));
    cache.set(relPath, data);
    return data;
  },
  async loadJSONAny(relPaths) {
    for (const relPath of relPaths || []) {
      try {
        return await this.loadJSON(relPath);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
    return null;
  },
};

const service = new AbbrevService({
  dataStore: fakeDataStore,
  locale: 'de-AT',
});

await service.preload();

const availableDomains = service.getAvailableAbbrevDomains();
assert.ok(Array.isArray(availableDomains.ca), 'Canada should expose abbreviation domains');
assert.ok(availableDomains.ca.includes('fr'), 'Canada should expose the fr abbreviation domain');

const cases = [
  {
    category: 'institution-entire',
    key: 'ogh',
    jurisdiction: 'at',
    expected: 'OGH',
    label: 'Austria canonical court abbreviation resolves from institution-entire',
  },
  {
    category: 'institution-part',
    key: 'ogh',
    jurisdiction: 'at',
    expected: 'Oberster Gerichtshof',
    label: 'Austria display-form court label remains available from institution-part',
  },
  {
    category: 'institution-entire',
    key: 'vfgh',
    jurisdiction: 'at',
    expected: 'VfGH',
    label: 'Austria constitutional court abbreviation resolves from institution-entire',
  },
  {
    category: 'institution-part',
    key: 'vfgh',
    jurisdiction: 'at',
    expected: 'VfSlg',
    label: 'Austria constitutional court reporter-style short form remains distinct in institution-part',
  },
  {
    category: 'institution-entire',
    key: 'ogh',
    jurisdiction: 'at:vienna',
    expected: 'OGH',
    label: 'Institution-entire lookup falls back through jurisdiction chain',
  },
  {
    category: 'institution-part',
    key: 'supreme.court.prov',
    jurisdiction: 'ca:bc',
    expected: 'BC SC',
    label: 'Default Canadian dataset remains in use without a domain hint',
  },
  {
    category: 'institution-part',
    key: 'supreme.court.prov',
    jurisdiction: 'ca:bc@fr',
    expected: 'BC C Supr',
    label: 'French Canadian domain selects auto-ca-fr for provincial court labels',
  },
  {
    category: 'institution-entire',
    key: 'supreme.court',
    jurisdiction: 'ca@fr',
    expected: 'CSC',
    label: 'French Canadian domain selects auto-ca-fr for canonical court abbreviations',
  },
];

let failures = 0;

for (const testCase of cases) {
  const actual = service.lookupForCiteProc(testCase.category, testCase.key, testCase.jurisdiction, { noHints: true })?.value || null;
  try {
    assert.equal(actual, testCase.expected);
    console.log(`PASS ${testCase.label}: ${testCase.category} / ${testCase.jurisdiction} / ${testCase.key} -> ${actual}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${testCase.label}: expected ${testCase.expected} but got ${actual}`);
  }
}

if (failures) {
  process.exitCode = 1;
  console.error(`\n${failures} abbreviation regression test(s) failed.`);
} else {
  console.log(`\nAll ${cases.length} abbreviation regression tests passed.`);
}
