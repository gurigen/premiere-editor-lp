# Premiere Editor LP ― Timeline Universe

クリックスch監修の動画編集実践プログラム「プレミアエディター」LP公開用リポジトリです。

現行版は Three.js 製の没入型LP「Timeline Universe」。
起動 → 書き出しワープ → タイムライン宇宙に着地 → スクロール(＝再生ヘッド)で
SCENE 01〜11 のクリップを走行しながら講座内容を読む構成になっています。

## Public URL

https://gurigen.github.io/premiere-editor-lp/

## Hosting

- Provider: GitHub Pages
- Source: `main` branch, repository root
- Site type: static HTML/CSS/JS (ビルド工程なし)

## Files

- `index.html`: LP本文(全シーンのコピー)と共有用メタ情報
- `css/style.css`: シネマグレードのビジュアル表現・全コンポーネント
- `js/main.js`: 演出制御(起動→ワープ→着地→スクロール走行)
- `js/world.js`: タイムライン宇宙(レーン・クリップ・ゲート・再生ヘッド)
- `js/warp.js`: 書き出しワープのGLSLトンネルシェーダー
- `js/audio.js`: WebAudioによるプロシージャル環境音・効果音
- `js/tween.js`: 依存ゼロの軽量トゥイーン(fortuneと共通設計)
- `lib/three.module.min.js`: Three.js 本体
- `assets/`: 公開ページが参照する画像素材
- `fortune/`: 仮想占い館「宵闇の占い館」(Three.js 製の3D占い体験。`/fortune/` で公開)

## Fallbacks

- WebGL非対応: 3Dを止め、静的グラデーション背景で全文閲覧可
- `prefers-reduced-motion`: ワープ演出とカメラ揺れを省略
- JavaScript無効: `noscript` で起動画面を外し、通常スクロールで全文閲覧可

## Before Production Use

- LINE CTA URL is still a placeholder (`#`).
- Course price and some conditions are still marked for confirmation in the page copy.
- Works section uses image samples; card slots are designed to be swapped to YouTube embeds.
