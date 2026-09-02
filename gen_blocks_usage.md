# Gen Blocks Usage

## Goal

赤黒のプレミア編集画面モチーフと宇宙ワープ演出を保ちながら、LPを実際の「プレエディ」商品内容に合わせて全面更新する。

## Stack

- HTML / CSS / Vanilla JavaScript
- Three.js（ローカル同梱）
- GLSLフルスクリーンワープ
- 追加フレームワーク・追加CDNなし

## Reused Blocks

- 赤黒の編集画面風レイアウト
- タイムコード付きシーン目次
- `warp.js` のワープシェーダー
- `cinematic-background.js` の宇宙背景とスクロール連動カメラ
- 既存の講師・制作実績・ロゴ素材

## New / Revised Blocks

- 実際の商品内容に合わせた17段階の購入判断フロー
- AI時代の編集判断、作業量、録画教材、6章構成、AIツール、添削、コミュニティ、価格、特典、Q&A
- foriioの人物カードを参考にした、3名の「期待の声」カード
- 受講可能／推奨の2列で比較できるPC環境Q&A
- WebP最適化、画像遅延読み込み、画像寸法指定
- Q&Aの`aria-controls`／`aria-labelledby`
- ハッシュ付き直接リンクの保持
- `prefers-reduced-motion` 時の背景停止

## Verification

- 隔離したローカルHTTPサーバーとChromiumでPC／スマホを実画面確認
- ワープ終了後に本文が表示され、Three.jsキャンバスが生成されることを確認
- 3本の3Dタイムラインレールが存在しないことを確認
- 17個のタイムコード項目が最終CTAまで追従することを確認
- Q&Aをクリックし、PC要件が開くことを確認
- 全遅延画像を読み込み後、欠落0件を確認
- PC／スマホとも横はみ出し0px、コンソールエラー0件を確認
- 動きを減らす設定と`#faq`直接リンクを確認

## Open Item

正式なLINE登録URLは未提供。受領後、ページ内CTAを同一URLへ接続する。
