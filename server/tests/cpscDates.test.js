/**
 * cpscDates.test.js
 * Purpose: Announcement date vs a LastPublishDate bump older than 45 days.
 */
import { describe, expect, it } from 'vitest';
import {
  STALE_PUBLISH_DAYS,
  cpscAnnouncementDate,
  cpscSortDate,
  daysBetween,
  isRecentCpscAnnouncement,
  isStaleCpscPublish,
  toCpscDay,
} from '../lib/cpscDates.js';

const oldToy = {
  RecallDate: '2000-03-15T00:00:00',
  LastPublishDate: '2026-09-01T00:00:00',
};

describe('toCpscDay / daysBetween', () => {
  it('parses ISO, dashed, and compact dates to the same UTC day', () => {
    expect(toCpscDay('2026-08-06T00:00:00').toISOString()).toBe('2026-08-06T00:00:00.000Z');
    expect(toCpscDay('2026-08-06').toISOString()).toBe('2026-08-06T00:00:00.000Z');
    expect(toCpscDay('20260806').toISOString()).toBe('2026-08-06T00:00:00.000Z');
  });

  it('counts whole days between two dates', () => {
    expect(daysBetween('2000-03-15', '2000-04-29')).toBe(45);
    expect(daysBetween('2000-03-15', '2000-04-30')).toBe(46);
  });
});

describe('announcement vs publish bump', () => {
  it('treats a publish gap over 45 days as a stale edit, not a new recall', () => {
    expect(STALE_PUBLISH_DAYS).toBe(45);
    expect(cpscAnnouncementDate(oldToy).toISOString()).toBe('2000-03-15T00:00:00.000Z');
    expect(isStaleCpscPublish(oldToy)).toBe(true);
    expect(cpscSortDate(oldToy).toISOString()).toBe('2000-03-15T00:00:00.000Z');
  });

  it('keeps a fresh publish when the gap is 45 days or less', () => {
    const fresh = {
      RecallDate: '2026-07-01T00:00:00',
      LastPublishDate: '2026-08-15T00:00:00',
    };
    expect(daysBetween(fresh.RecallDate, fresh.LastPublishDate)).toBeLessThanOrEqual(45);
    expect(isStaleCpscPublish(fresh)).toBe(false);
    expect(cpscSortDate(fresh).toISOString()).toBe('2026-08-15T00:00:00.000Z');
  });

  it('drops a 2000-era announcement from a 2-year latest window', () => {
    expect(isRecentCpscAnnouncement(oldToy, '2024-09-09')).toBe(false);
    expect(
      isRecentCpscAnnouncement(
        { RecallDate: '2025-01-02T00:00:00', LastPublishDate: '2026-09-01T00:00:00' },
        '2024-09-09',
      ),
    ).toBe(true);
  });
});
