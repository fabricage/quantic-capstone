/**
 * cpscWebsite.test.js
 * Purpose: CPSC listing dates, /s3fs-public/ absolutize, first photo, firm-from-title, matches.
 */
import { describe, expect, it } from 'vitest';
import {
  absolutizeCpscUrl,
  firmFromCpscTitle,
  parseCpscListing,
  parseCpscListingDate,
  websiteRecallMatches,
} from '../lib/cpscWebsite.js';

const listingHtml = `
<div class="recall-list">
  <div class="recall-list__date">September 03, 2026</div>
  <div class="recall-list__images">
    <img src="/s3fs-public/crib.jpg" alt="Crib still">
    <img src="/s3fs-public/label.gif" alt="Label gif">
  </div>
  <div class="recall-list__title">
    <a href="/Recalls/2026/Acme-Recalls-Cribs-Due-to-Entrapment">Acme Toys Recalls Cribs Due to Entrapment Hazard</a>
  </div>
  <div class="recall-list__label">Hazard:</div>
  <p>Entrapment hazard in the crib slats.</p>
</div>
<div class="recall-list">
  <div class="recall-list__date">January 15, 2000</div>
  <div class="recall-list__title">
    <a href="/Recalls/2000/Old-Toy">Vintage Block Company Issues Recall of Wooden Toys</a>
  </div>
</div>
`;

describe('CPSC listing helpers', () => {
  it('parses long US dates', () => {
    expect(parseCpscListingDate('September 03, 2026')).toBe('20260903');
    expect(parseCpscListingDate('January 15, 2000')).toBe('20000115');
  });

  it('absolutizes root-relative /s3fs-public/ photos against cpsc.gov', () => {
    expect(absolutizeCpscUrl('/s3fs-public/crib.jpg')).toBe(
      'https://www.cpsc.gov/s3fs-public/crib.jpg',
    );
    expect(absolutizeCpscUrl('https://www.cpsc.gov/s3fs-public/crib.jpg')).toBe(
      'https://www.cpsc.gov/s3fs-public/crib.jpg',
    );
  });

  it('parses rows, prefers the first photo in recall-list__images, and firms from titles', () => {
    const rows = parseCpscListing(listingHtml);
    expect(rows).toHaveLength(2);
    expect(rows[0].product).toMatch(/Acme Toys Recalls Cribs/i);
    expect(rows[0].firm).toBe('Acme Toys');
    expect(rows[0].reason).toMatch(/entrapment/i);
    expect(rows[0].recallDate).toBe('20260903');
    expect(rows[0].imageUrl).toBe('https://www.cpsc.gov/s3fs-public/crib.jpg');
    expect(rows[0].imageAlt).toBe('Crib still');
    expect(rows[0].url).toContain('/Recalls/2026/Acme-Recalls-Cribs-Due-to-Entrapment');
    expect(rows[1].firm).toBe('Vintage Block Company');
  });

  it('matches keywords and date windows', () => {
    const [recent] = parseCpscListing(listingHtml);
    expect(websiteRecallMatches(recent, { q: 'crib' })).toBe(true);
    expect(websiteRecallMatches(recent, { q: 'blender' })).toBe(false);
    expect(websiteRecallMatches(recent, { dateFrom: '2026-09-01', dateTo: '2026-09-30' })).toBe(
      true,
    );
    expect(websiteRecallMatches(recent, { dateFrom: '2020-01-01', dateTo: '2020-12-31' })).toBe(
      false,
    );
  });

  it('extracts a firm from common title patterns', () => {
    expect(firmFromCpscTitle('Truststone Group Recalls XO Poppy Power Banks')).toBe(
      'Truststone Group',
    );
    expect(firmFromCpscTitle('Acme Voluntarily Recalls Ladders')).toBe('Acme');
  });
});
