import * as fs from 'fs';
import * as path from 'path';
import { fetchPdfList, downloadAndExtractText } from './scraper';
import { parsePdfText } from './parser';
import { TrafficData, DayData } from './types';

const OUTPUT_DIR = process.env.OUTPUT_DIR ?? path.join(__dirname, '../../docs');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'traffic.json');

async function main() {
  console.log(`[${new Date().toISOString()}] Starting Hyogo traffic scraper`);

  let pdfList;
  try {
    pdfList = await fetchPdfList();
    console.log(`Found ${pdfList.length} PDF(s):`, pdfList.map(p => p.url).join(', '));
  } catch (err) {
    console.error('Failed to fetch PDF list:', err);
    process.exit(1);
  }

  if (pdfList.length === 0) {
    console.error('No PDFs found on index page — layout may have changed');
    process.exit(1);
  }

  const allDays: DayData[] = [];

  for (const pdf of pdfList) {
    console.log(`Downloading ${pdf.url}`);
    let text: string;
    try {
      text = await downloadAndExtractText(pdf.url);
    } catch (err) {
      console.error(`Failed to download/parse ${pdf.url}:`, err);
      continue;
    }

    const { days, warnings } = parsePdfText(text, pdf.year, pdf.month);
    if (warnings.length > 0) {
      console.warn(`[PARSE WARNINGS for ${pdf.url}]`);
      for (const w of warnings) {
        console.warn(`  [${w.context}] ${w.raw}`);
      }
    }
    console.log(`  Parsed ${days.length} day(s), ${days.reduce((n, d) => n + d.entries.length, 0)} entries`);
    allDays.push(...days);
  }

  // Deduplicate and sort
  const dateMap = new Map<string, DayData>();
  for (const day of allDays) {
    const existing = dateMap.get(day.date);
    if (!existing || existing.entries.length < day.entries.length) {
      dateMap.set(day.date, day);
    }
  }
  const sortedDays = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  const result: TrafficData = {
    updatedAt: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }).replace(' ', 'T') + '+09:00',
    days: sortedDays,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Check if existing data differs before writing
  let shouldWrite = true;
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const existing: TrafficData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      const existingDays = JSON.stringify(existing.days);
      const newDays = JSON.stringify(result.days);
      if (existingDays === newDays) {
        console.log('No change in data — skipping write');
        shouldWrite = false;
      }
    } catch {
      // can't read existing, overwrite
    }
  }

  if (shouldWrite) {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`Wrote ${sortedDays.length} days to ${OUTPUT_FILE}`);
  }

  console.log(`[${new Date().toISOString()}] Done`);
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
