import { describe, it, expect } from 'vitest';
import esMessages from '../messages/es.json';
import enMessages from '../messages/en.json';

function getNestedKeys(obj: Record<string, any>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getNestedKeys(value, fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys;
}

describe('Bilingual i18n Translation Parity', () => {
  const esKeys = getNestedKeys(esMessages).sort();
  const enKeys = getNestedKeys(enMessages).sort();

  it('has identical keys in Spanish and English dictionaries', () => {
    const missingInEn = esKeys.filter((k) => !enKeys.includes(k));
    const missingInEs = enKeys.filter((k) => !esKeys.includes(k));

    expect(missingInEn, `Keys present in Spanish but missing in English: ${missingInEn.join(', ')}`).toEqual([]);
    expect(missingInEs, `Keys present in English but missing in Spanish: ${missingInEs.join(', ')}`).toEqual([]);
  });

  it('contains non-empty translation strings', () => {
    for (const key of esKeys) {
      const parts = key.split('.');
      let curEs: any = esMessages;
      let curEn: any = enMessages;
      for (const p of parts) {
        curEs = curEs?.[p];
        curEn = curEn?.[p];
      }
      expect(typeof curEs).toBe('string');
      expect(curEs.trim().length).toBeGreaterThan(0);
      expect(typeof curEn).toBe('string');
      expect(curEn.trim().length).toBeGreaterThan(0);
    }
  });
});
