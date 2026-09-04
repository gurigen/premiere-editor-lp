# SCENE 10 Design QA

- Source visual truth: `https://www.foriio.com/` 「利用者の声」 (Codex in-app Browser, desktop viewport 1280 x 720)
- Implementation: `http://127.0.0.1:4178/?qa=foriio-voices#recommended` (Codex in-app Browser)
- Scope: `SCENE 10 / VOICE & RECOMMENDED` only

## Fidelity check

- Layout: centered kicker and 65px-class heading, followed by a full-bleed horizontal rail with partially cropped edge cards.
- Card geometry: source and implementation both use 586 x 226px cards, 20px gaps, 15px radius, 28px 36px 18px padding, and a subtle 0 2px 10px shadow.
- Type and color: light gray section, black display heading, gray kicker/body copy, white cards, compact 14px testimonial copy.
- Motion: source measured at about 73px/s; implementation measured at about 75px/s with a seamless duplicated rail. Motion pauses on hover/focus.
- Assets: all three supplied portraits load at their natural aspect ratio and are cropped to 50px circular avatars.
- Subscriber counts: YouTube channel pages were checked on 2026-09-04; Nagare 26.9万人, Cameron 20.3万人, and Kiruha 36.2万人 render beside each name without wrapping.
- Responsive: verified at 390 x 844. Cards resize to 338 x 246px, the next card remains visible at the edge, and there is no document-level horizontal overflow.
- Accessibility: semantic blockquotes and articles, descriptive alt text on the original cards, duplicate rail hidden from assistive technology, keyboard focus indicator, and reduced-motion fallback with manual horizontal scrolling.
- Runtime: no browser console warnings/errors and no broken images in desktop or mobile checks.

## Findings

No blocking or material fidelity issues remained after the comparison pass.

final result: passed
