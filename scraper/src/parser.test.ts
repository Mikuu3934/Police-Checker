import { parsePdfText } from './parser';

const SAMPLE = `
6 月の取締り重点
20
神戸 県道小部明石線 速度
阪神 国道１７６号 飲酒
東播 県道高砂北条線 速度
西播 国道２５０号 速度
但馬 国道９号 飲酒
淡路 県道阿万福良湊線 速度
高速 第二神明道路 速度
土
19
神戸 市道垂水妙法寺線 速度
阪神 県道尼崎宝塚線 飲酒
東播 県道小野香寺線 飲酒
西播 県道上郡末広線 速度
但馬 国道３１２号 速度
淡路 県道福良江井岩屋線 速度
高速 神戸淡路鳴門自動車道 速度
金
但馬 県道宮津養父線 速度
淡路 国道２８号 交差点関連
高速 中国縦貫自動車道 速度
速度
阪神 国道４３号 速度
東播 国道１７５号 交差点関連
西播 国道３１２号 飲酒
◎　速度違反取締り ◎　飲酒運転取締り
取締り重点路線 取締り内容
17 水
神戸 市道山手幹線 速度
阪神 県道多可柏原線 速度
東播 県道小野香寺線 交差点関連
西播 県道養父宍粟線 速度
但馬 国道１７８号 交差点関連
◎　交差点関連違反取締り ◎　自転車違反指導取締り
日 曜 地区
淡路 県道洲本灘賀集線 交差点関連
高速 阪神高速神戸線 速度
`;

const result = parsePdfText(SAMPLE, 2026, 6);

console.log('=== Parse result ===');
for (const day of result.days) {
  console.log(`${day.date} (${day.weekday}): ${day.entries.length} entries`);
  for (const e of day.entries) {
    console.log(`  ${e.area} ${e.road} ${e.type}`);
  }
}

if (result.warnings.length > 0) {
  console.log('\n=== Warnings ===');
  for (const w of result.warnings) {
    console.log(`  [${w.context}] ${w.raw}`);
  }
}

// Basic assertions
const day17 = result.days.find(d => d.date === '2026-06-17');
const day19 = result.days.find(d => d.date === '2026-06-19');
const day20 = result.days.find(d => d.date === '2026-06-20');

if (!day17) throw new Error('Missing day 2026-06-17');
if (day17.weekday !== '水') throw new Error(`Wrong weekday for 17: ${day17.weekday}`);
if (!day17.entries.find(e => e.area === '神戸' && e.road === '市道山手幹線')) throw new Error('Missing 神戸 entry for day 17');

if (!day19) throw new Error('Missing day 2026-06-19');
if (day19.weekday !== '金') throw new Error(`Wrong weekday for 19: ${day19.weekday}`);

if (!day20) throw new Error('Missing day 2026-06-20');
if (day20.weekday !== '土') throw new Error(`Wrong weekday for 20: ${day20.weekday}`);

console.log('\nAll assertions passed.');
