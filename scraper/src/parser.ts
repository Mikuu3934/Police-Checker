import { Area, DayData, EnforcementEntry, ParseWarning } from './types';

const AREAS: Area[] = ['神戸', '阪神', '東播', '西播', '但馬', '淡路', '高速'];
const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];
const ENFORCEMENT_TYPES = ['速度', '飲酒', '交差点関連', '自転車違反指導取締り'];

const AREA_RE = new RegExp(`^(${AREAS.join('|')})\\s+(.+?)\\s+(${ENFORCEMENT_TYPES.join('|')})$`);
const DAY_NUM_RE = /^\d{1,2}$/;
const WEEKDAY_RE = new RegExp(`^(${WEEKDAYS.join('|')})$`);
// "17 水" on one line
const DAY_WEEKDAY_RE = new RegExp(`^(\\d{1,2})\\s+(${WEEKDAYS.join('|')})$`);

export interface ParseResult {
  days: DayData[];
  warnings: ParseWarning[];
}

/**
 * Parse raw text extracted from a Hyogo police enforcement PDF.
 *
 * The PDF text order is non-trivial: day numbers, weekday characters, and
 * area entries can appear interleaved across what looks like multiple columns.
 * Strategy:
 *   1. Tokenise each line as one of: day_num | weekday | day_weekday | area_entry | noise
 *   2. Walk tokens building "pending day" slots, then attach area entries to the
 *      nearest preceding day slot.
 */
export function parsePdfText(text: string, pdfYear: number, pdfMonth: number): ParseResult {
  const warnings: ParseWarning[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  type Token =
    | { kind: 'day_weekday'; day: number; weekday: string }
    | { kind: 'day_num'; day: number }
    | { kind: 'weekday'; weekday: string }
    | { kind: 'area_entry'; entry: EnforcementEntry }
    | { kind: 'noise'; raw: string };

  const tokens: Token[] = [];

  for (const line of lines) {
    const dwMatch = DAY_WEEKDAY_RE.exec(line);
    if (dwMatch) {
      tokens.push({ kind: 'day_weekday', day: parseInt(dwMatch[1], 10), weekday: dwMatch[2] });
      continue;
    }
    if (DAY_NUM_RE.test(line)) {
      tokens.push({ kind: 'day_num', day: parseInt(line, 10) });
      continue;
    }
    if (WEEKDAY_RE.test(line)) {
      tokens.push({ kind: 'weekday', weekday: line });
      continue;
    }
    const areaMatch = AREA_RE.exec(line);
    if (areaMatch) {
      tokens.push({
        kind: 'area_entry',
        entry: { area: areaMatch[1] as Area, road: areaMatch[2], type: areaMatch[3] }
      });
      continue;
    }
    tokens.push({ kind: 'noise', raw: line });
  }

  // --- Build day slots ---
  // A "slot" represents one day block. We track a pending day_num and weekday
  // separately because the PDF sometimes emits them on separate lines and out
  // of order relative to the entries they belong to.
  interface Slot {
    day: number;
    weekday: string;
    entries: EnforcementEntry[];
  }

  const slots: Slot[] = [];
  let pendingDay: number | null = null;
  let pendingWeekday: string | null = null;
  // entries collected before we have a complete day+weekday pair
  let orphanEntries: EnforcementEntry[] = [];

  const flushPending = () => {
    if (pendingDay !== null && pendingWeekday !== null) {
      const existing = slots.find(s => s.day === pendingDay);
      if (existing) {
        // merge orphans into existing slot
        existing.entries.push(...orphanEntries);
      } else {
        slots.push({ day: pendingDay, weekday: pendingWeekday, entries: [...orphanEntries] });
      }
      pendingDay = null;
      pendingWeekday = null;
      orphanEntries = [];
    }
  };

  for (const tok of tokens) {
    if (tok.kind === 'day_weekday') {
      flushPending();
      pendingDay = tok.day;
      pendingWeekday = tok.weekday;
      flushPending();
    } else if (tok.kind === 'day_num') {
      if (pendingDay !== null && pendingWeekday === null) {
        // two consecutive day_nums without weekday — warn and reset
        warnings.push({ context: 'consecutive day_num without weekday', raw: String(pendingDay) });
      }
      flushPending();
      pendingDay = tok.day;
    } else if (tok.kind === 'weekday') {
      if (pendingDay !== null) {
        pendingWeekday = tok.weekday;
        flushPending();
      } else {
        // weekday without preceding day_num — look back to last slot
        if (slots.length > 0 && slots[slots.length - 1].weekday === '') {
          slots[slots.length - 1].weekday = tok.weekday;
        } else {
          warnings.push({ context: 'weekday without pending day_num', raw: tok.weekday });
        }
      }
    } else if (tok.kind === 'area_entry') {
      if (pendingDay !== null && pendingWeekday !== null) {
        // day fully established — attach directly
        const slot = slots.find(s => s.day === pendingDay);
        if (slot) {
          slot.entries.push(tok.entry);
        } else {
          orphanEntries.push(tok.entry);
        }
      } else if (pendingDay !== null) {
        // have day number but weekday not yet seen — buffer; will be flushed when weekday arrives
        orphanEntries.push(tok.entry);
      } else if (slots.length > 0) {
        // no pending day — attach to last known slot (e.g. split column entries)
        slots[slots.length - 1].entries.push(tok.entry);
      } else {
        orphanEntries.push(tok.entry);
        warnings.push({ context: 'area_entry before any day slot', raw: JSON.stringify(tok.entry) });
      }
    } else {
      // noise — ignore but could log
    }
  }
  flushPending();
  // drain remaining orphans to last slot
  if (orphanEntries.length > 0 && slots.length > 0) {
    slots[slots.length - 1].entries.push(...orphanEntries);
    warnings.push({ context: 'orphan entries attached to last slot', raw: JSON.stringify(orphanEntries) });
    orphanEntries = [];
  }

  // Sort slots by day ascending
  slots.sort((a, b) => a.day - b.day);

  const days: DayData[] = slots.map(slot => ({
    date: formatDate(pdfYear, pdfMonth, slot.day),
    weekday: slot.weekday,
    entries: slot.entries
  }));

  return { days, warnings };
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
