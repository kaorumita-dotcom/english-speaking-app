# 独り言英会話 - デザインドキュメント

## コンセプト
大学1年生（英語初級レベル）が、身近なテーマについて約1分間英語で話し、即座にフィードバックを受けられる英語スピーキング練習アプリ。

## Screen List

### 1. ホーム画面 (Home)
- アプリのメインエントリーポイント
- 今日のスピーキングテーマを表示（ランダム選択）
- 「Start Speaking」ボタン
- 過去の練習履歴サマリー（直近5件、ローカル保存）

### 2. 録音画面 (Recording)
- 1分間のカウントダウンタイマー（円形プログレス）
- 録音中のアニメーション（波形インジケーター）
- テーマの表示
- 「Stop」ボタン（途中終了可能）
- 録音時間の表示

### 3. 結果画面 (Results)
- Words Per Minute (WPM) の表示
- CEFRレベルの表示（A1〜C2）
- 良い点のフィードバック（表現・内容を褒める）
- 文法の注意点（1〜2つ）
- まとめの褒め言葉と励まし
- 「Try Again」ボタン
- 「Back to Home」ボタン

### 4. 履歴画面 (History)
- 過去の練習記録一覧（日時、テーマ、WPM、CEFRレベル）
- タップで詳細フィードバックを確認可能

## Primary Content and Functionality

### ホーム画面
- **テーマカード**: ランダムに選ばれた身近なテーマ（例：「Your favorite food」「Your morning routine」「Your best friend」）
- **スタートボタン**: 大きく目立つCTAボタン
- **履歴プレビュー**: 直近の練習結果をカード形式で表示（WPM、CEFRレベル）
- **テーマ変更ボタン**: 別のテーマに変更可能

### 録音画面
- **カウントダウンタイマー**: 60秒の円形プログレスバー
- **テーマ表示**: 画面上部に現在のテーマ
- **録音インジケーター**: 音声波形アニメーション
- **停止ボタン**: 途中で終了可能（最低10秒以上で分析可能）

### 結果画面
- **WPMスコア**: 大きな数字で表示
- **CEFRレベルバッジ**: カラーコード付きレベル表示
- **フィードバックセクション**:
  - 良い点（緑色のカード）
  - 文法注意点（オレンジ色のカード）
  - 励ましメッセージ（青色のカード）

### 履歴画面
- **練習記録リスト**: FlatListで表示
- **各アイテム**: 日時、テーマ、WPM、CEFRレベル

## Key User Flows

### メインフロー
1. ユーザーがアプリを開く → ホーム画面
2. テーマを確認（変更も可能）
3. 「Start Speaking」をタップ → 録音画面へ遷移
4. 3秒のカウントダウン後、録音開始
5. 1分間英語で話す（途中停止も可能）
6. 録音終了 → ローディング画面（分析中）
7. 結果画面にフィードバック表示
8. 「Try Again」で新しいテーマ or 「Home」に戻る

### 履歴確認フロー
1. タブバーの「History」をタップ
2. 過去の練習一覧を確認
3. アイテムをタップ → 詳細フィードバックを表示

## Color Choices

| Token | Light | Dark | 用途 |
|-------|-------|------|------|
| primary | #4F46E5 | #818CF8 | メインアクセント（インディゴ） |
| background | #FAFBFC | #0F172A | 画面背景 |
| surface | #F1F5F9 | #1E293B | カード背景 |
| foreground | #0F172A | #F1F5F9 | メインテキスト |
| muted | #64748B | #94A3B8 | サブテキスト |
| border | #E2E8F0 | #334155 | ボーダー |
| success | #10B981 | #34D399 | 良い点フィードバック |
| warning | #F59E0B | #FBBF24 | 文法注意点 |
| error | #EF4444 | #F87171 | エラー |

## タブ構成
- **Home** (house.fill): ホーム画面
- **History** (clock.fill): 履歴画面

## テーマリスト（初期セット）
身近で話しやすいテーマを20個用意:
1. Your favorite food
2. Your morning routine
3. Your best friend
4. Your hometown
5. Your hobby
6. Your dream vacation
7. Your favorite movie or TV show
8. Your daily schedule
9. Your family
10. Your favorite season
11. What you did last weekend
12. Your favorite music
13. Your school life
14. Your pet (or dream pet)
15. Your favorite place to relax
16. What makes you happy
17. Your favorite sport
18. Your ideal weekend
19. A skill you want to learn
20. Your favorite memory

## 技術アーキテクチャ
- **音声録音**: expo-audio（マイク録音）
- **音声認識**: サーバーサイドWhisper API（transcribeAudio）
- **AI分析**: サーバーサイドLLM（invokeLLM）でフィードバック生成
- **音声アップロード**: S3ストレージ（storagePut）
- **データ保存**: AsyncStorage（ローカル履歴保存）
- **ナビゲーション**: Expo Router（タブ + スタック）
