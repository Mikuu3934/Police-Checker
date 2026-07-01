export type Area = '神戸' | '阪神' | '東播' | '西播' | '但馬' | '淡路' | '高速';

export interface EnforcementEntry {
  area: Area;
  road: string;
  type: string;
}

export interface DayData {
  date: string;      // YYYY-MM-DD
  weekday: string;   // 月火水木金土日
  entries: EnforcementEntry[];
}

export interface TrafficData {
  updatedAt: string; // ISO 8601 with JST offset
  days: DayData[];
}

export interface ParseWarning {
  context: string;
  raw: string;
}
