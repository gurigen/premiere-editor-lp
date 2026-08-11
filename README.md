# プレミアエディター LP 初回実装

作成日: 2026-05-06

## 目的

編集クリックス計画の新コンセプト版として、サービス名を `プレミアエディター` に固定したPC向けLPの初回実装。

今回は全セクションの骨格を置きつつ、特に以下を優先して作成した。

- ファーストビュー
- 映画フィルム/映画テープのデザインモチーフ
- 1時間ごとのDAY1/DAY2スケジュール
- カット1、カット2、BGM、SE、添削、コミュニティ導線

## 現在の構成

説明順ではなく、購入判断順へ並び替え済み。

1. First View
2. 4つの即理解カード
3. なぜ必要か
4. 強み紹介
5. Schedule
6. 中間CTA
7. Works / Review
8. PRESENT
9. Plan / Price
10. Voice / Recommended
11. Final CTA
12. Q&A

独立した `Flow`、`Profile`、`Compare`、`Instructors`、`Sales Support` セクションは初回構成から外した。必要な要素はFV、強み、Review、Price、Q&Aへ吸収する。

## ファイル

- `index.html`: LP本文
- `styles.css`: レイアウト、赤黒シック、映画フィルム表現
- `scripts.js`: シーン目次の選択状態、Q&Aのビデオテープ風アコーディオン制御
- `assets/`: 既存LPからコピーした表示素材
- `output/`: 確認スクリーンショット出力先

## First View / 起動画面

ファーストビューから細かいプロジェクトカード、工程チップ、チェックランプ、右下コンソールを削除。
最初の3秒で「REVIEW OK」と「添削後、案件紹介コミュニティ導線へ。」を大きく読ませる構成に変更した。

- 左側はフルロゴ、メインコピー、`OUTPUT CHECK / REVIEW OK` と実践範囲を同じ情報ブロックに整理
- `SCENE 01 / PREMIERE EDITOR` と `クリックスch監修 / PC編集者向け` の小見出しは削除
- `カット、BGM、SE、提出前チェック、添削、営業導線まで。` の説明文を太く明確な本文として表示
- 右側は監修キャラクターと編集モニター素材に絞り、重複する小型コンソール演出は削除
- 赤はCTAと `REVIEW OK` ブロックの左ラインに限定

Figmaへ移す場合は、`hero-copy`、`hero-route-panel`、`hero-route-detail`、`hero-stage` の4部品で分ける。
現在のFigma接続は `View` 権限のため、キャンバスへの直接反映は未実施。

確認画像:

- `output/hero-deep-dive-desktop.png`
- `output/hero-deep-dive-mobile.png`

## Opening Movie / 表紙直後の生成OP

Seedance 2.0で生成した5秒OP動画を、ページ読み込み直後の全画面イントロとして追加済み。

- 元動画: `C:\Users\gurig\Downloads\seedance2_Video_20260525_074750.mp4`
- 実装先: `assets/video/pleedi-opening-seedance-20260525.mp4`
- 仕様: 1280x720 / 約5秒 / MP4
- LP上ではサイト読み込み直後に固定オーバーレイで再生し、表紙はその背後で待機
- 最後の7フレームは使用しない。`frame_0114.jpg` を最終ホールド画像として使う
- `frame_0114` 相当の時刻で動画を停止し、0.4秒ホールドしてから0.4秒でフェードアウト
- フェードアウト完了後に表紙のロゴ、立ち絵、文字、画像がキラーン演出込みで登場する

## WHY / Diagnosis

`WHY` セクションを、通常の悩みカードから「提出前エラーチェック画面」へ作り替え済み。
FVの後に急に説明資料っぽく落ちないよう、案件に出せない原因を編集ソフトの診断モニターとして見せる。

- `SCENE 03 / DIAGNOSIS` として、案件前チェックの位置づけに変更
- 左側に `PRE-SUBMIT CHECK` モニターを配置
- 右側に4つのエラークリップを配置
  - `QUALITY GAP`: OK基準がない
  - `AUDIO FLOAT`: BGM/SEが不安
  - `NO REVIEW`: 添削がない
  - `ROUTE LOST`: 案件導線がない
- 3.3秒ごとにエラー内容が自動で切り替わり、クリックでも即時切替
- 下部に、プレミアエディターで解決する3段階を整理
  - 1時間ごとに工程化
  - 添削でOK基準へ
  - OK後コミュニティへ
- 赤はアクティブエラー、再生ヘッド、メーターだけに限定し、通常面はガンメタと金ラインで統一

Figmaへ移す場合は、`diagnosis-monitor`、`diagnosis-clip`、`diagnosis-resolve` の3部品で分ける。
現在のFigma接続は `View` 権限のため、キャンバスへの直接反映は未実施。

確認画像:

- `output/diagnosis-deep-dive-desktop.png`
- `output/diagnosis-deep-dive-desktop-viewport.png`
- `output/diagnosis-deep-dive-mobile.png`
- `output/diagnosis-deep-dive-mobile-viewport.png`
- `output/diagnosis-deep-dive-auto-desktop.png`

## STRENGTH / Quality Gate

`STRENGTH` セクションを、通常の4カードから「案件提出前の品質ゲート」へ作り替え済み。
`WHY / Diagnosis` のエラーに対する回答として、工程、音、添削、案件導線を1本の編集プロジェクトで締める見せ方に変更した。

- 左側に `QUALITY GATE / BEFORE SUBMIT` コンソールを配置
- 右側に4つのゲートボタンを配置
  - `GATE 01 / TIME`: 1時間ごとの工程設計
  - `GATE 02 / AUDIO`: BGM / SEまで実践
  - `GATE 03 / REVIEW`: 制作物を添削
  - `GATE 04 / ROUTE`: OK後コミュニティ
- 3秒ごとにゲート内容が自動で切り替わり、クリックでも即時切替
- `SUBMIT READINESS` バーと `CUT / BGM / SE / REVIEW / COMMUNITY` 小型チップは削除し、コンソール本文だけに集中
- 生成素材 `05-timeline-clip-blocks.png` と `09-audio-waveform-icon.png` を控えめに背景として使用
- 赤はアクティブゲートに限定し、通常面は黒、ガンメタ、金ラインで統一

確認画像:

- `output/strength-long-full-desktop.png`
- `output/strength-long-full-mobile.png`

## Logo

ユーザー提供の透過PNGロゴを、LP内 `assets/` にコピーして適用済み。

- フルロゴ元: `E:\LPお手本 (2)\assets\premiere-editor\premiere-editor-wordmark-sparkle-transparent.png`
- ミニロゴ元: `E:\LPお手本 (2)\assets\premiere-editor\premiere-editor-pe-monogram-sparkle-transparent.png`
- ファーストビューにフルロゴ、ヘッダー左上にミニロゴを配置
- フルロゴは `assets/premiere-editor-wordmark-sparkle-transparent.png` に保存
- ミニロゴは `assets/premiere-editor-pe-monogram-sparkle-transparent.png` に保存
- LP側の表示用コピーは、暗背景で読めるように余白をトリミングし、黒文字を白、黄色アクセントを赤へ調整

確認画像:

- `output/png-logo-applied-desktop.png`
- `output/png-logo-applied-mobile.png`
- `output/logo-applied-hero-desktop.png`
- `output/logo-applied-hero-mobile.png`
- `output/mini-logo-header-desktop.png`
- `output/mini-logo-header-mobile.png`

## Generated Asset Kit 01

画像生成で作成した素材集を `assets/generated-kit-01/` に保存し、分解済みの透過PNGをLPへ実装済み。
装飾過多にならないよう、各素材は「編集機材」「承認」「カット」「LINE確認」など意味がある場所だけに配置している。

- FV: 編集モニター群、赤いスパークル
- WHY / Diagnosis: 診断モニターパネル
- PRESENT: テープケース束、コミュニティパス
- Plan / Price: エクスポート設定パネル、入会金CUT斬撃ライン
- Voice / Recommended: APPROVEDスタンプ
- Final CTA: LINE吹き出し
- Q&A: フィルムリール背景

主な実装素材:

- `assets/generated-kit-01/cutouts/01-editing-monitor-cluster.png`
- `assets/generated-kit-01/cutouts/02-film-reel.png`
- `assets/generated-kit-01/cutouts/06-export-settings-panel.png`
- `assets/generated-kit-01/cutouts/07-approved-stamp-mark.png`
- `assets/generated-kit-01/cutouts/08-line-chat-bubbles.png`
- `assets/generated-kit-01/cutouts/10-community-pass-card.png`
- `assets/generated-kit-01/cutouts/11-red-cut-slash.png`
- `assets/generated-kit-01/cutouts/13-tape-case-stack.png`
- `assets/generated-kit-01/cutouts/14-diagnosis-monitor-panel.png`
- `assets/generated-kit-01/cutouts/15-red-sparkle-motif.png`

## シーン目次

ヘッダーの通常ナビを削除し、クリック可能な横スクロール目次へ導線を一本化済み。
左端にはミニロゴを入れ、以降をビデオテープ風のシーン目次として扱う。

- `TOP`: ファーストビューへ移動
- `QUICK`: 4つの即理解カードへ移動
- `PHILO`: 開校思想/理念ページへ移動
- `WHY`: 悩み/必要性セクションへ移動
- `STRENGTH`: 強み紹介へ移動
- `SCHEDULE`: スケジュールへ移動
- `REVIEW`: 添削セクションへ移動
- `PRESENT`: 特典セクションへ移動
- `PRICE`: 料金セクションへ移動
- `VOICE`: 利用者の声/推薦へ移動
- `LINE`: 最終CTAへ移動
- `Q&A`: Q&Aへ移動

PC/スマホともに横スクロールのフィルム目次として表示する。左右矢印で1コマずつ送り、右端のコマにカーソルを合わせた場合だけ0.3秒ごとに右へ自動送りする。上段の `強み / スケジュール / 料金 / 推薦 / Q&A` の通常ナビと `LINEで確認` ボタンは、目次側に役割を集約したため削除した。

見た目は、単なるフィルムコマではなくビデオテープ寄りに調整済み。ただし装飾過多を避けるため、両端の丸いリール表現と矢印ボタン内のリール装飾は削除済み。

- 黒いVHSカセット本体のような横長レール
- 中央を走る赤い磁気テープライン
- 各コマにネジ穴、ラベル面、テープ窓風スリットを追加

## Philosophy / 洗練された紙面セクション

`QUICK` の直後に、白背景の編集理念ページを追加。
黒いフィルム調LPの中で一度だけ余白を作り、赤い大見出し、縦罫線、黄色マーカーの本文で「開校への想い」を読ませる構成。

- 参考画像の `PHILOSOPHY` ページに近い、余白の広い2カラム紙面
- 左に大きな赤い `PHILOSOPHY`、右に本文
- 強調語句は黄色マーカーで処理し、グラデーションやカード装飾は使わない
- 上下には薄いフィルム穴だけを入れ、映像フィルムのコンセプトと接続
- 既存の暗い `WHY / DIAGNOSIS` は残し、理念ページの後に診断パートへ進む

確認画像:

- `output/philosophy-editorial-desktop.png`

## Diagnosis / 静かな提出前チェック

`WHY / DIAGNOSIS` は、安っぽく見えやすい自動アニメーションを停止し、静的な検査レポート調へ変更。

- `ERROR` 表記を `CHECK` 表記へ変更
- 3.3秒ごとの自動切り替えを停止し、クリック時だけ内容が切り替わる仕様へ変更
- 赤い再生ヘッドの走行、メーターの伸縮、アラートの差し替えアニメーションを削除
- 背景はフラットな黒煙色、罫線はワイン/シャンパンゴールド寄りに整理
- ホバー時の横ズレをやめ、枠線だけが静かに反応する見え方へ変更

確認画像:

- `output/header-scene-index-desktop.png`
- `output/header-scene-index-mobile.png`
- `output/header-scene-target-present.png`
- `output/header-scene-target-faq.png`
- `output/single-row-header-desktop.png`
- `output/single-row-header-mobile.png`

## Q&A演出

Q&Aは標準の `details/summary` ではなく、独自のアコーディオンへ変更済み。

- 質問の左に、参考画像寄せの黒いフィルムリール風アイコンを配置
- 質問をクリックすると、該当リールが動く
- 回答は黒いテープパネルとして開く
- 回答表示時にスキャンラインや表示演出が入る
- `prefers-reduced-motion` ではアニメーションを抑制
- Q&Aセクション背景は白ではなく、赤黒の暗いフィルム室トーンへ変更

現在は、ユーザー選定により全質問を `Q 04 / D: フィルム装填` の演出へ統一している。

- `Q 01 / フィルム装填`
- `Q 02 / フィルム装填`
- `Q 03 / フィルム装填`
- `Q 04 / フィルム装填`
- `Q 05 / フィルム装填`

確認画像:

- `output/faq-tape-desktop.png`

## Works Tape / 実績一覧

`Works / Review` セクション内に、サムネイル実績を編集テープに乗せて横流しする第1案を追加済み。

- 画像は `assets/works/` にコピーして管理
- PC/スマホともに、黒赤のテープフレーム上をサムネイルカードが流れる
- 上下にフィルム穴、中央に赤いテープラインを入れて動画編集感を出す
- カーソルを合わせても横流れは止めず、テープが再生され続ける見え方にする
- `prefers-reduced-motion` では自動アニメーションを抑制
- 将来は `.work-media` 内の画像をYouTube埋め込みへ差し替え、作品実績として使う想定

確認画像:

- `output/works-tape-desktop.png`
- `output/works-tape-mobile.png`

## Works Select / 案2

`Works Tape` の下に、流れる実績から1本を編集モニターへ読み込む第2案を追加済み。

- 左側の大きなモニターに選択中サムネイルを表示
- 右側にタグ、タイトル、短い解説を表示
- 下部の小さいサムネボタンで表示内容を切り替える
- 3.2秒ごとに自動で次の実績へ進み、クリック時は選択した実績へ即時切り替え
- 将来はメイン画面をYouTube埋め込みへ差し替える想定

確認画像:

- `output/works-focus-desktop.png`
- `output/works-focus-mobile.png`
- `output/works-focus-auto-desktop.png`

## Schedule Timeline / 案3

旧案3の `Works Timeline` は撤回し、`Schedule` セクションを講座進行そのものの編集タイムラインへ作り替え済み。

- 2列のDAYカードと4段レーン表現を廃止し、横長1本の編集クリップ列として表示
- `DAY 1 / BUILD` と `DAY 2 / REVIEW` は上部の帯で分け、工程自体は1列で流す
- `カット1`、`カット2`、`BGM`、`SE`、`REVIEW`、`COMMUNITY` を大きめのクリップとして見せる
- 赤い再生ヘッド線がタイムライン上を走る。生成PNGの再生ヘッドマーカーは削除
- 1.9秒ごとに現在工程の表示が切り替わり、クリップクリックでも即時切り替え
- ヘッダー目次の `CUT 01`、`CUT 02`、`BGM`、`SE`、`COMMUNITY` のアンカーは新タイムライン内へ維持
- 下に `SCENE 05(別案） / SCHEDULE` として、白背景でDAY1/DAY2を縦リスト表示する読みやすさ優先の別案を追加

確認画像:

- `output/schedule-course-singleline-desktop.png`
- `output/schedule-course-singleline-mobile.png`
- `output/schedule-course-singleline-auto-desktop.png`

## PRESENT / 支給セット

`PRESENT` セクションを、単なる特典カードではなく「編集者になるための支給セット棚」として作り替え済み。

- Google Fonts Icons / Material Symbolsを導入
- 営業サポート、オンライン学習、案件紹介コミュニティ、土日受講を4つのテープケース風カードとして表示
- `PRESENT 03 / COMMUNITY PASS` を赤く強調
- 添削OK後の卒業後コミュニティ入会金カット条件を下部のパス表示として追加
- PCは4ケース横並び、スマホは縦積み

確認画像:

- `output/present-price-desktop.png`
- `output/present-price-mobile.png`

## PRICE / 料金ボード

`Price / Plan` セクションを、編集ソフトの書き出し前チェック画面として作り込み済み。

- 講座本体価格は「LINEで確認」とし、未確定表示の雑さを避ける
- 卒業後コミュニティの月額 `4,900円` を大きく表示
- `入会金 CUT` を赤いカット演出で強調
- アフターサポート `10,000円`、土日対応、講座本体確認を編集トラック風に整理
- 左側に料金判断の要点と確認順、右側に `EXPORT SETTINGS / PRICE CHECK` の操作盤を配置
- 赤はCTA、ステータスランプ、入会金CUT、再生ヘッドだけに限定

確認画像:

- `output/price-deep-dive-desktop.png`
- `output/price-deep-dive-mobile.png`
- `output/price-deep-dive-mobile-board.png`
- `output/price-board-desktop.png`
- `output/price-board-mobile.png`

## VOICE / RECOMMENDED

`Voice / Recommended` セクションを、映画の試写レビュー欄のような信頼補強パートへ作り替え済み。

- 受講者の声は `REVIEW DECK` として、上部モニターへ読み込む構成
- 3枚のレビュー・チケットをクリックすると、モニターの見出し、本文、ステータスが切り替わる
- 3.6秒ごとに自動で次のレビューへ切り替わり、試写中の動きを出す
- 右側に `RECOMMENDED` の監修コメントカードと推薦理由キューを配置
- クリックスch監修の立ち絵素材を推薦カード内に使用
- 下部に、工程進行、添削OK基準、卒業後コミュニティ、LINE確認の信頼チェックを横並びで整理
- 赤は推薦カードの認証ラインとアイコンだけに抑え、通常カードはガンメタ/黒/白罫線/金ラベルで統一
- Figmaへ移す場合は、`voice-review-wall`、`voice-monitor`、`voice-ticket`、`recommended-card`、`trust-reel` の5部品で分ける

確認画像:

- `output/voice-deep-dive-desktop.png`
- `output/voice-deep-dive-desktop-auto.png`
- `output/voice-deep-dive-mobile.png`
- `output/voice-deep-dive-mobile-tickets.png`
- `output/voice-deep-dive-mobile-recommended.png`
- `output/voice-recommended-desktop.png`
- `output/voice-recommended-mobile.png`

## Motion Gimmicks / 追加演出

ユーザー指示により、スクロール進捗の磁気テープ化とセクション間カットフラッシュは削除済み。現在は、意味のある場所に絞って以下の演出を入れている。

1. ヒーロー起動演出
   - 初回表示時に、編集ソフトが立ち上がるように見出し、監修ラベル、CTA、ビジュアルが順番に点灯する。

2. 入会金CUTの斬撃ライン
   - `入会金 CUT` カードに赤い斜線が走り、カットされた印象を強める。

3. LINE CTAのタイピング演出
   - LINE導線で、確認メッセージが1行ずつ届くように表示する。

4. 信頼チェックのOKランプ
   - 工程、添削、コミュニティ、LINE確認の4項目が順番に点灯する。

5. 背景の微細フィルムノイズ
   - 全体へ薄いフィルム傷、粒子、走査線を重ねる。主張は弱め。

6. 目次のシーンジャンプ強化
   - ヘッダー目次を押すと、該当セクションに `NOW PLAYING` ラベルが一瞬出る。

7. RECOMMENDEDの認証スタンプ
   - 推薦カードが画面に入ると、`APPROVED` スタンプが押される。
   - 本文の可読性を邪魔しないよう、カード上部へ配置。

確認画像:

- `output/gimmick-hero-startup-desktop.png`
- `output/gimmick-voice-approved-progress.png`
- `output/gimmick-voice-approved-progress-mobile.png`
- `output/motion-price-cut-desktop.png`
- `output/motion-line-typing-desktop.png`
- `output/motion-line-typing-mobile.png`
- `output/motion-trust-lamps-desktop.png`
- `output/motion-now-playing-schedule.png`
- `output/motion-header-no-progress.png`

## Red Accent Policy / 呼吸感調整

ユーザー確認により、赤黒グラデーションを全ボックスへ敷く方針は中止。赤は「意味のある強調」に限定し、通常面はガンメタ、黒、白罫線、金ラベルで呼吸感を出す。

- 通常カード、棚、料金ボード、実績テープ面は中立色へ変更
- 赤を残す場所は、CTA、`COMMUNITY PASS`、`入会金 CUT`、再生ヘッド、アクティブ状態など
- セクション背景の赤い面グラデーションを減らし、白/スチール系の薄い光と金ラインへ置換
- Q&Aは暗いフィルム室トーンを維持しつつ、背景の赤い面発光は抑制

追加調整:

- 生成した縦長LP案に合わせ、基本背景をほぼフラットな黒煙色へ寄せた
- `trust-reel` の4項目は、赤黒グラデーションのカードではなく、映像フィルムのコマとして再設計
- `工程で進行`、`添削OK基準`、`卒業後コミュニティ`、`LINEで条件確認` は、スモークグレーの面、ワイン色の細線、シャンパンゴールドのアイコンで統一
- セクション背景と `voice-review-wall` の赤い面発光を減らし、フィルム穴と罫線で映像感を出す方針に変更

確認画像:

- `output/present-price-breathing-desktop.png`
- `output/present-price-breathing-mobile.png`
- `output/price-board-breathing-desktop.png`
- `output/review-breathing-desktop.png`

## 次に磨く優先順

1. REVIEW の添削OK導線を、より審査/試写室っぽく作り込む
2. 中間CTAを、LINE確認へ自然に進むカットインとして強化する
3. Voice / Recommended の実素材差し替え
4. Q&Aの質問追加と開閉アニメーションの微調整

## 本番前の未確定

- LINE URL
- 講座本体価格
- コミュニティ入会金の通常価格
- 月額4,900円の税込/税抜
- アフターサポート10,000円の税込/税抜
- 利用者の声、推薦者の実素材
- 講師プロフィールと許諾済み写真

## 2026-08 Space Hybrid / 5月赤黒版 + 7月演出

5月版の赤黒シックなレイアウトを本文・UIの基準として残し、7月版から必要な演出だけを移植したローカル統合版。

- ページ読込直後に、操作不要でワームホールへ突入し、そのままヒーローを表示
- Three.jsの固定宇宙背景を追加し、ページスクロール量に合わせてカメラが奥へ前進
- 7月版にあった3本の3Dタイムラインレール、クリップ、ゲートは不採用
- ヘッダーの `00:00`、`00:12`、`00:24` … のタイムコード目次を維持
- 上部の細い再生バーと現在シーンを、実際のスクロール位置へ同期
- WebGLやES Modulesが使えない場合は、7秒以内に静的背景で本文を表示するフォールバック付き

主な追加ファイル:

- `js/cinematic-background.js`
- `js/warp.js`
- `lib/three.module.min.js`

ローカル確認:

```powershell
python -m http.server 4178
```

ブラウザで `http://127.0.0.1:4178/` を開く。`file://` 直開きではES Modulesを読み込めないため、必ずローカルサーバー経由で確認する。
