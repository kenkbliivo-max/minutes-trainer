# 議事録練習アプリ

架空の会議をAIが生成 → テキスト+音声(TTS)で再生 → 議事ドキュメントをPDFで提出 → AIが6観点で採点・講評・模範例と比較。履歴とグラフで成長を振り返れるWebアプリです。

## 機能一覧

- 会議の自動生成(テーマ・参加人数・長さ・難易度を選択。難易度で脱線や曖昧さが増加)
- 再生: テキスト逐次表示+音声読み上げ(発言者ごとに声を変化)、一時停止/再開、巻き戻し不可モード
- PDF提出(Word書き出しPDF対応・日本語抽出確認済み)
- 再生終了から提出までの所要時間を自動計測(サーバー時刻基準)
- 採点: 総合100点+6観点5段階(網羅性/構造化/客観性/わかりやすさ/第三者理解/思考の積み上げ)、講評、引用付き改善策、模範議事ドキュメントとの比較
- ダッシュボード: スコア/所要時間の推移グラフ、観点別レーダーチャート、履歴・提出PDFの見返し
- 再挑戦モード(同じ会議に再提出してスコア比較)、制限時間モード、次回意識ポイントのカード表示
- アカウント(メール+パスワード)、1日あたりのAI利用回数制限(悪用対策)
- 管理者ダッシュボード(全ユーザーの成績ランキング・提出一覧。最初に登録したユーザーが自動で管理者)

## 無料で公開する手順(所要 約15分)

Google Gemini APIの無料枠を使えば**完全無料**で運用できます(ホスティング・DBも無料枠)。詳しい画面付きの手順は同梱の「セットアップガイド.md」を参照してください。

### 1. データベース (Supabase 無料枠)

1. https://supabase.com で無料アカウントを作成し、新しいプロジェクトを作成
2. 左メニュー「SQL Editor」で、このリポジトリの `schema.sql` の内容を貼り付けて実行
3. 「Project Settings → Database」の接続文字列(URI, **Transaction pooler** 推奨)をコピー → これが `DATABASE_URL`

### 2. AIのAPIキー(どちらか一方)

- 【無料】Google Gemini: https://aistudio.google.com で「Get API key」→ 作成 → これが `GEMINI_API_KEY`
- 【従量課金・高品質】Anthropic Claude: https://console.anthropic.com でキー作成 → これが `ANTHROPIC_API_KEY`(月額上限の設定推奨)

両方設定した場合はGeminiが優先されます。

### 3. デプロイ (Vercel 無料枠)

1. このフォルダをGitHubリポジトリにpush
2. https://vercel.com で「New Project」→ リポジトリを選択
3. 「Environment Variables」に以下を設定:

| 変数 | 値 |
|---|---|
| `DATABASE_URL` | 手順1の接続文字列 |
| `GEMINI_API_KEY` | 手順2のキー(無料のGeminiを使う場合) |
| `ANTHROPIC_API_KEY` | (Claudeを使う場合のみ) |
| `JWT_SECRET` | 適当な長いランダム文字列 |
| `ADMIN_EMAIL` | (任意) 管理者にしたいメールアドレス |
| `DAILY_GENERATE_LIMIT` | (任意) 1人1日の会議生成回数。既定5 |
| `DAILY_SCORE_LIMIT` | (任意) 1人1日の採点回数。既定10 |

4. Deploy。発行されたURLを共有すれば、URLを知っている人は誰でも利用できます

### ローカルで動かす場合

```bash
cp .env.example .env.local   # 値を記入
npm install
npm run dev                  # http://localhost:3000
```

## 使い方

1. 新規登録(最初に登録した人が管理者になります)
2. 「新しい練習」で会議を生成 → 再生(TTSはON/OFF可)
3. 再生終了と同時にタイマー開始。WordなどでドキュメントをまとめてPDFに書き出し、アップロードして提出
4. 採点結果・講評・模範例を確認。「再挑戦」で同じ会議に書き直して再提出も可能

## 技術メモ

- Next.js 14 (App Router) / PostgreSQL / Recharts
- TTS: ブラウザ内蔵のWeb Speech API(無料・サーバー負荷なし)。Chrome/Edge推奨
- PDF抽出: pdfjs-dist(日本語CMap同梱)。画像化(スキャン)PDFは不可、テキストPDFのみ
- PDFの上限4MB(Vercelのリクエスト上限のため)
- 会議生成・採点: Gemini(既定 `gemini-2.5-flash`、無料枠あり)またはClaude(既定 `claude-sonnet-5`、従量課金)。環境変数で切替
- 想定同時利用者数: 無料枠で〜10名程度の研修利用を想定

## 未確定事項への対応(依頼書7章)

1. 管理者機能: 実装済み(全ユーザーのスコア・提出の閲覧、ランキング)
2. AI利用コスト対策: 1ユーザー1日あたりの生成/採点回数制限(環境変数で変更可)+Anthropicコンソール側の月額上限設定を推奨
