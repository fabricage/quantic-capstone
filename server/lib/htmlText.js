/**
 * htmlText.js
 * Purpose: Tiny HTML helpers for listing parsers. No extra scrape library.
 */

export function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripTags(html) {
  return decodeHtml(String(html ?? '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' '));
}

export function attr(html, name) {
  const double = html.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'));
  if (double) return decodeHtml(double[1]);
  const single = html.match(new RegExp(`${name}\\s*=\\s*'([^']*)'`, 'i'));
  return single ? decodeHtml(single[1]) : '';
}

export function compactDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^\d{8}$/.test(raw)) return raw;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}${iso[2]}${iso[3]}`;
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    return `${us[3]}${us[1].padStart(2, '0')}${us[2].padStart(2, '0')}`;
  }
  const months = {
    january: '01',
    february: '02',
    march: '03',
    april: '04',
    may: '05',
    june: '06',
    july: '07',
    august: '08',
    september: '09',
    october: '10',
    november: '11',
    december: '12',
  };
  const long = raw.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (long) {
    const month = months[long[1].toLowerCase()];
    if (month) return `${long[3]}${month}${long[2].padStart(2, '0')}`;
  }
  return '';
}
