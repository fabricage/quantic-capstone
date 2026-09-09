/**
 * location.test.js
 * Purpose: Parse filters, classify country text, CPSC shapes, FDA origin, match, clause.
 */
import { describe, expect, it } from 'vitest';
import {
  classifyCountry,
  fdaCountrySearchClause,
  originDisplayLabel,
  originFromCpscCountries,
  originFromCpscRecord,
  originFromFdaRecord,
  originMatchesFilter,
  parseLocationFilter,
} from '../lib/location.js';

describe('parseLocationFilter', () => {
  it('accepts usa|china|other and ignores junk', () => {
    expect(parseLocationFilter('USA')).toBe('usa');
    expect(parseLocationFilter('china')).toBe('china');
    expect(parseLocationFilter('Other')).toBe('other');
    expect(parseLocationFilter('mexico')).toBe('');
    expect(parseLocationFilter('')).toBe('');
  });
});

describe('classifyCountry', () => {
  it('maps China/PRC/"includes china", USA variants, other, and blank', () => {
    expect(classifyCountry('China')).toBe('china');
    expect(classifyCountry('PRC')).toBe('china');
    expect(classifyCountry('Includes China and Vietnam')).toBe('china');
    expect(classifyCountry('United States')).toBe('usa');
    expect(classifyCountry('USA')).toBe('usa');
    expect(classifyCountry('US')).toBe('usa');
    expect(classifyCountry('America')).toBe('usa');
    expect(classifyCountry('Mexico')).toBe('other');
    expect(classifyCountry('')).toBe('');
    expect(classifyCountry(null)).toBe('');
  });
});

describe('CPSC ManufacturerCountries shapes', () => {
  it('reads { Country }, { Name }, or strings and lets China win', () => {
    expect(originFromCpscCountries([{ Country: 'China' }])).toBe('china');
    expect(originFromCpscCountries([{ Name: 'United States' }])).toBe('usa');
    expect(originFromCpscCountries(['Mexico'])).toBe('other');
    expect(originFromCpscCountries([{ Country: 'United States' }, { Name: 'China' }])).toBe(
      'china',
    );
    expect(originFromCpscRecord({ ManufacturerCountries: [{ Country: 'China' }] })).toBe(
      'china',
    );
  });
});

describe('FDA origin and filter match', () => {
  it('reads FDA country as the recalling-firm country', () => {
    expect(originFromFdaRecord({ country: 'United States' })).toBe('usa');
    expect(originFromFdaRecord({ country: 'China' })).toBe('china');
    expect(originFromFdaRecord({})).toBe('');
  });

  it('excludes unknown origin when a filter is set', () => {
    expect(originMatchesFilter('china', 'china')).toBe(true);
    expect(originMatchesFilter('usa', 'china')).toBe(false);
    expect(originMatchesFilter('', 'china')).toBe(false);
    expect(originMatchesFilter('', '')).toBe(true);
  });
});

describe('fdaCountrySearchClause', () => {
  it('builds the openFDA country clause', () => {
    expect(fdaCountrySearchClause('usa')).toBe('country:"United States"');
    expect(fdaCountrySearchClause('china')).toBe('country:"China"');
    expect(fdaCountrySearchClause('other')).toBe(
      '-country:"United States" AND -country:"China"',
    );
    expect(fdaCountrySearchClause('')).toBe('');
  });
});

describe('originDisplayLabel', () => {
  it('returns short labels', () => {
    expect(originDisplayLabel('usa')).toBe('USA');
    expect(originDisplayLabel('china')).toBe('China');
    expect(originDisplayLabel('other')).toBe('Other');
    expect(originDisplayLabel('')).toBe('');
  });
});
