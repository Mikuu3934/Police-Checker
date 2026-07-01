import axios from 'axios';
import * as cheerio from 'cheerio';
import pdfParse from 'pdf-parse';

const INDEX_URL = 'https://www.police.pref.hyogo.lg.jp/traffic/violation/jyouho/index.htm';
const INDEX_BASE = 'https://www.police.pref.hyogo.lg.jp/traffic/violation/jyouho/';
const SITE_BASE = 'https://www.police.pref.hyogo.lg.jp';
// Match any href that ends with a YYYYMMDD.pdf pattern
const PDF_DATE_RE = /(\d{8})\.pdf/i;

export interface PdfInfo {
  url: string;
  year: number;
  month: number;
  startDay: number;
}

function resolveUrl(href: string): string {
  if (href.startsWith('http')) return href;
  if (href.startsWith('/')) return SITE_BASE + href;
  // relative path (e.g. "data/20260617.pdf" or "./data/20260617.pdf")
  return INDEX_BASE + href.replace(/^\.\//, '');
}

export async function fetchPdfList(): Promise<PdfInfo[]> {
  const res = await axios.get(INDEX_URL, {
    responseType: 'text',
    headers: { 'User-Agent': 'HyogoTrafficChecker/1.0 (informational; contact: github.com/mikuu3934)' },
    timeout: 15000,
  });
  const $ = cheerio.load(res.data as string);
  const results: PdfInfo[] = [];

  console.log(`Index page fetched, scanning ${$('a[href]').length} links`);

  $('a[href]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    const m = PDF_DATE_RE.exec(href);
    if (m) {
      const dateStr = m[1]; // YYYYMMDD
      const year = parseInt(dateStr.slice(0, 4), 10);
      const month = parseInt(dateStr.slice(4, 6), 10);
      const startDay = parseInt(dateStr.slice(6, 8), 10);
      const url = resolveUrl(href);
      if (!results.find(r => r.url === url)) {
        results.push({ url, year, month, startDay });
      }
    }
  });

  return results;
}

export async function downloadAndExtractText(url: string): Promise<string> {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'HyogoTrafficChecker/1.0 (informational; contact: github.com/mikuu3934)' },
    timeout: 30000,
  });
  const buffer = Buffer.from(res.data as ArrayBuffer);
  const data = await pdfParse(buffer);
  return data.text;
}
