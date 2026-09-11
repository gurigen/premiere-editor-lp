import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

const code = readFileSync(new URL('../js/hero-video.js', import.meta.url), 'utf8');
function fixture({ reduced = false, saveData = false } = {}) {
  const events = {};
  const video = {
    paused: true, dataset: { src: 'assets/hero-fourcut.mp4' },
    getAttribute: () => video.src || null,
    closest: () => ({}),
    addEventListener: (name, fn) => { events[name] = fn; },
    play: () => { video.paused = false; events.play?.(); return Promise.resolve(); },
    pause: () => { video.paused = true; events.pause?.(); },
  };
  let click, intersection, mutation, preference, visibility;
  let intro = true;
  const button = { hidden: true, addEventListener: (_, fn) => { click = fn; } };
  const media = { matches: reduced, addEventListener: (_, fn) => { preference = fn; } };
  const document = {
    hidden: false,
    querySelector: name => name === '.hero-background-video' ? video : button,
    body: { classList: { contains: () => intro } },
    addEventListener: (_, fn) => { visibility = fn; },
  };
  runInNewContext(code, {
    document, window: { matchMedia: () => media }, navigator: { connection: { saveData } },
    IntersectionObserver: class { constructor(fn) { intersection = fn; } observe() {} },
    MutationObserver: class { constructor(fn) { mutation = fn; } observe() {} },
  });
  return { video, button, document, media, events,
    view: value => intersection([{ isIntersecting: value }]),
    reveal: () => { intro = false; mutation(); },
    click: () => click(), visibility: () => visibility(), preference: () => preference(),
  };
}
const normal = fixture();
normal.view(true);
assert(!normal.video.src, 'Wait for intro before downloading');
normal.reveal();
assert.equal(normal.video.paused, false);
assert.equal(normal.video.muted, true);
normal.click();
assert.equal(normal.video.paused, true);
normal.view(false); normal.view(true);
assert.equal(normal.video.paused, true, 'Keep the user pause choice');
normal.click();
assert.equal(normal.video.paused, false);
normal.document.hidden = true; normal.visibility();
assert.equal(normal.video.paused, true);
normal.document.hidden = false; normal.visibility();
assert.equal(normal.video.paused, false);
normal.view(false);
assert.equal(normal.video.paused, true, 'Do not decode offscreen video');
normal.view(true);
normal.media.matches = true; normal.preference();
assert.equal(normal.video.paused, true);
for (const options of [{ reduced: true }, { saveData: true }]) {
  const limited = fixture(options);
  limited.view(true); limited.reveal();
  assert(!limited.video.src, 'Static poster without automatic video download');
  limited.click();
  assert.equal(limited.video.paused, false, 'Allow explicit play');
  limited.events.error();
  assert.equal(limited.video.hidden, true);
  assert.equal(limited.button.hidden, true);
}
console.log('PASS: intro, autoplay, user pause, visibility, reduced motion, save-data and error fallback');
