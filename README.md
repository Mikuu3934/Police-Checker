# 兵庫取締りチェッカー

兵庫県警察の「交通指導取締り計画」PDFを定期取得・解析し、今日の取締り情報を現在地から近い順に表示するAndroidホーム画面ウィジェットアプリ。

> ⚠️ **注意**: 取締りは予告なく変更・中止される場合があります。本アプリのデータはあくまで参考情報としてご利用ください。

## 構成

```
Police-Checker/
├── scraper/          # Node.js/TypeScript スクレイパー
│   └── src/
│       ├── types.ts       # 型定義
│       ├── parser.ts      # PDFテキストパーサー
│       ├── scraper.ts     # Webスクレイピング＆PDFダウンロード
│       └── index.ts       # エントリーポイント
├── docs/             # GitHub Pages 配信用 JSON
│   └── traffic.json
├── android/          # Android アプリ (Kotlin + Jetpack Glance)
│   └── app/src/main/java/com/example/policechecker/
│       ├── MainActivity.kt
│       ├── data/TrafficRepository.kt
│       ├── location/
│       │   ├── AreaLocationResolver.kt   # 地区→座標マッピング（交換可能インターフェース）
│       │   └── Haversine.kt
│       ├── model/TrafficModels.kt
│       ├── widget/TrafficWidget.kt       # Glanceウィジェット
│       └── work/UpdateWorker.kt          # WorkManager定期更新
└── .github/workflows/scrape.yml  # GitHub Actions cron
```

## セットアップ

### 1. スクレイパー

```bash
cd scraper
npm install
npm run build
node dist/index.js
# → docs/traffic.json が生成される
```

### 2. GitHub Pages 有効化

リポジトリの Settings → Pages → Source: Deploy from a branch → Branch: `main` / `docs`

配信URLは `https://<user>.github.io/<repo>/traffic.json`

### 3. Android アプリ

`android/app/src/main/java/com/example/policechecker/data/TrafficRepository.kt` の `dataUrl` を上記 GitHub Pages URL に変更してから Android Studio でビルド。

## データソース

[兵庫県警察 交通指導取締り計画](https://www.police.pref.hyogo.lg.jp/traffic/violation/jyouho/index.htm)

## 地区代表点（レベル1）

| 地区 | 代表座標 |
|------|---------|
| 神戸 | 34.6901, 135.1956 |
| 阪神 | 34.7355, 135.4141 |
| 東播 | 34.7573, 134.8437 |
| 西播 | 34.8394, 134.3393 |
| 但馬 | 35.5317, 134.3545 |
| 淡路 | 34.3198, 134.8953 |
| 高速 | 34.8500, 135.0000 ← TODO(level2): 広域のため要改善 |
