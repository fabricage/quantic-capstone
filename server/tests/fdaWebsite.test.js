/**
 * fdaWebsite.test.js
 * Purpose: FDA listing dates, food vs drugs, and keyword/date matches.
 */
import { describe, expect, it } from 'vitest';
import {
  fdaWebsiteRecallMatches,
  isFdaFoodProductType,
  parseFdaListing,
  parseFdaListingDate,
} from '../lib/fdaWebsite.js';

const listingHtml = `
<table>
  <tr>
    <td headers="view-field-change-date-2-table-column"><time datetime="2026-09-08T04:00:00Z">09/08/2026</time></td>
    <td headers="view-brand-name-table-column"><a href="/safety/recalls/bmc-luna">BMC</a></td>
    <td headers="view-field-product-description-1-table-column">Luna G3 APAP</td>
    <td headers="view-field-regulated-product-field-table-column">Drugs</td>
    <td headers="view-field-recall-reason-description-1-table-column">Firmware defect</td>
    <td headers="view-company-name-table-column">BMC Medical Co., Ltd.</td>
  </tr>
  <tr>
    <td headers="view-field-change-date-2-table-column"><time datetime="2026-09-08T04:00:00Z">09/08/2026</time></td>
    <td headers="view-brand-name-table-column"><a href="/safety/recalls/created-fresh-chicken-salad">Created Fresh!</a></td>
    <td headers="view-field-product-description-1-table-column">Chicken Salad Wedge</td>
    <td headers="view-field-regulated-product-field-table-column">Food &amp; Beverages, Allergens</td>
    <td headers="view-field-recall-reason-description-1-table-column">Undeclared egg</td>
    <td headers="view-company-name-table-column">FreshPoint</td>
  </tr>
</table>
`;

describe('FDA listing helpers', () => {
  it('parses ISO datetime and US slash dates', () => {
    expect(parseFdaListingDate('<time datetime="2026-09-08T04:00:00Z">09/08/2026</time>')).toBe(
      '20260908',
    );
    expect(parseFdaListingDate('09/08/2026')).toBe('20260908');
  });

  it('keeps food rows and skips drugs', () => {
    expect(isFdaFoodProductType('Drugs')).toBe(false);
    expect(isFdaFoodProductType('Food & Beverages, Allergens')).toBe(true);
    const rows = parseFdaListing(listingHtml);
    expect(rows).toHaveLength(1);
    expect(rows[0].product).toBe('Chicken Salad Wedge');
    expect(rows[0].firm).toBe('FreshPoint');
    expect(rows[0].reason).toMatch(/egg/i);
    expect(rows[0].url).toContain('/safety/recalls/created-fresh-chicken-salad');
    expect(rows[0].recallDate).toBe('20260908');
  });

  it('matches keywords and date windows', () => {
    const [food] = parseFdaListing(listingHtml);
    expect(fdaWebsiteRecallMatches(food, { q: 'chicken' })).toBe(true);
    expect(fdaWebsiteRecallMatches(food, { q: 'firmware' })).toBe(false);
    expect(fdaWebsiteRecallMatches(food, { dateFrom: '2026-09-01' })).toBe(true);
    expect(fdaWebsiteRecallMatches(food, { dateTo: '2026-09-01' })).toBe(false);
  });
});
