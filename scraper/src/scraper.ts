import axios from 'axios';
import * as cheerio from 'cheerio';
import pdfParse from 'pdf-parse';

const INDEX_URL = 'https://www.police.pref.hyogo.lg.jp/traffic/violation/jyouho/index.htm';
const BASE_URL = 'https://www.police.pref.hyogo.lg.jp';
const PDF_LINK_RE = /\/traffic\/violation\/jyouho\/data\/(\d{8})\.pdf/;

export interface PdfInfo {
  url: string;
  year: number;
  month: number;
  startDay: number;
}

export async function fetchPdfList(): Promise<PdfInfo[]> {
  const res = await axios.get(INDEX_URL, {
    responseType: 'text',
    headers: { 'User-Agent': 'HyogoTrafficChecker/1.0 (informational; contact: github.com/mikuu3934)' },
    timeout: 15000,
  });
  const $ = cheerio.load(res.data as string);
  const results: PdfInfo[] = [];

  $('a[href]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    const m = PDF_LINK_RE.exec(href);
    if (m) {
      const dateStr = m[1]; // YYYYMMDD
      const year = parseInt(dateStr.slice(0, 4), 10);
      const month = parseInt(dateStr.slice(4, 6), 10);
      const startDay = parseInt(dateStr.slice(6, 8), 10);
      const url = href.startsWith('http') ? href : BASE_URL + href;
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
