import en from '../../messages/en.json';
import fr from '../../messages/fr.json';

function keyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') {
    return [prefix];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('messages', () => {
  it('keeps the locale catalogs in sync', () => {
    expect(keyPaths(fr).sort()).toEqual(keyPaths(en).sort());
  });
});
