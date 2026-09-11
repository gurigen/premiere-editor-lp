import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const lineUrl = 'https://utage-system.com/line/open/0CJLkc0Iv7Bt';
const count = (pattern) => [...html.matchAll(pattern)].length;
assert.equal(count(/data-purchase-link/g), 2, 'Price and final purchase paths required; top removed by request');
assert.equal(count(/>LINEで無料個別相談<\/a>/g), 2, 'Two consultation paths required');
assert.equal(count(/LINE追加後に「個別相談希望」と送ってください。日程予約フォームをご案内します。/g), 2);
assert.equal(count(/相談は無料・オンライン約20分。その場で申込みを決める必要はありません。/g), 2);
assert(html.includes('<title>プレエディ@エンタメ動画編集スクール</title>'));
assert(!/id="works"|id="works-focus"|講師・クリックスchのサムネイル制作実績|気になる実績を、大きく見る。/.test(html));
const hero = html.slice(html.indexOf('<section class="hero '), html.indexOf('<section class="offer '));
assert(!/data-purchase-link|consult-button|hero-purchase-note|hero-consult-note/.test(hero), 'Top enrollment paths must stay removed');
assert(hero.includes('hero-logo') && hero.includes('href="#contact"'), 'Preserve logo and separate gift link');
assert(hero.includes('muted loop playsinline preload="none"'), 'Background video must be silent, inline, and lazy-started');
assert(hero.includes('hero-video-toggle'), 'Provide a background motion control');
assert(existsSync(resolve(root, 'assets/hero-fourcut.mp4')));
assert(existsSync(resolve(root, 'assets/hero-fourcut-poster.jpg')));
for (const anchor of html.matchAll(/<a\b[^>]*data-line-link[^>]*>/g)) {
  assert(anchor[0].includes(`href="${lineUrl}"`), 'LINE destination mismatch');
}
assert(count(/data-line-link/g) >= 4, 'Consultation and gift destinations required');
assert(!/href="#"/.test(html), 'Empty link found');
assert(!/全6章|6 CHAPTERS|ノーカット|198,000|100,000円|利用者の声|Premiere Editor|PREMIERE EDITOR/.test(html), 'Outdated claim or service name');
for (const id of ['offer', 'community', 'price', 'faq']) {
  const start = html.indexOf(`id="${id}"`);
  assert(start >= 0, `Missing ${id}`);
  const nextSection = html.indexOf('<section ', start);
  const segment = html.slice(start, nextSection < 0 ? undefined : nextSection);
  assert(segment.includes('納品OK'), `Missing participation condition in ${id}`);
}
for (const lesson of ['音合わせ', '荒カット', '本カット', 'テロップ作り・打ち', '効果音・BGM', '素材作り', '演出レパートリー', '後編カット', '後編テロップ', '後編BGM・SE', '後編演出1・2']) assert(html.includes(lesson), `Missing lesson ${lesson}`);
assert(html.includes('教材の課題のみ'));
assert(html.includes('Discordで動画URLまたはファイル'));
assert(html.includes('2026年9月4日確認'));
assert(html.includes('受講生の学習成果を示すものではありません'));
assert(html.includes('解説を入れずに編集工程を見せる'));
assert(html.includes('すべてのジャンルを講座内で直接教えるものではありません'));
assert(html.includes('教材の視聴完了だけで自動参加にはなりません'));
assert(html.includes('編集未経験の方は、お申込み前にご相談ください'));
assert(html.includes('メモリ容量だけで動作を保証するものではありません'));
assert(html.includes('name="robots" content="noindex, nofollow"') || process.argv.includes('--publish'));
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, 'Duplicate IDs break navigation or accessible descriptions');
for (const match of html.matchAll(/aria-(?:controls|describedby)="([^"]+)"/g)) {
  for (const id of match[1].split(/\s+/)) assert(ids.includes(id), `Missing ARIA target: ${id}`);
}
for (const match of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(match[1]), `Missing section target: ${match[1]}`);
for (const match of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)) {
  const url = match[1];
  if (/^(?:https?:|data:|#)/.test(url)) continue;
  assert(existsSync(resolve(root, url)), `Missing local resource: ${url}`);
}
const blockers = [...new Set([...html.matchAll(/data-release-blocker="([^"]+)"/g)].map(m => m[1]))];
console.log('PASS: Content, participation rules, CTA count, LINE URLs, and local resources');
console.log('Publication blockers:', blockers.join(', ') || 'none');
if (process.argv.includes('--publish')) {
  assert.equal(blockers.length, 0, 'DO NOT PUBLISH: unresolved items remain');
  assert.equal(count(/<a\b[^>]*data-purchase-link[^>]*>/g), 2, 'Purchase buttons must be verified links');
}
