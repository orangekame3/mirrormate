# MirrorMate メモリ・RAG システム実装レビュー

## 概要

本実装により、MirrorMate に**永続的なユーザーコンテキスト**を提供する機能を追加しました。これにより、AI がユーザーの情報を記憶し、過去の会話内容を踏まえた応答が可能になります。

### 実装前の課題

- 会話はセッション内でのみ有効で、ブラウザをリロードすると忘れてしまう
- ユーザーの好みや特性を毎回伝える必要がある
- 過去の会話内容を活用できない

### 実装後の改善

- ユーザー情報を SQLite データベースに永続化
- 会話から自動的にメモリを抽出・保存
- RAG により関連するメモリを検索し、コンテキストとして LLM に提供

---

## アーキテクチャ

```
┌──────────────────────────────────────────────────────────────────┐
│                        リクエストフロー                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ユーザー入力                                                      │
│       │                                                           │
│       ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    RAG コンテキスト取得                       │ │
│  │  1. ユーザーのプロファイルメモリを取得                         │ │
│  │  2. 入力文をベクトル化（Ollama Embedding）                    │ │
│  │  3. 類似度検索で関連メモリを取得                              │ │
│  │  4. コンテキストをフォーマット                                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│       │                                                           │
│       ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    LLM 呼び出し                               │ │
│  │  システムプロンプト + メモリコンテキスト + ユーザー入力        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│       │                                                           │
│       ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    メモリ抽出（非同期）                        │ │
│  │  1. 会話内容を LLM で分析                                     │ │
│  │  2. 記憶すべき情報を抽出                                      │ │
│  │  3. Embedding を生成してデータベースに保存                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 実装内容

### 1. データベース層（SQLite + Drizzle ORM）

**新規ファイル:**
- `src/lib/db/schema.ts` - テーブル定義
- `src/lib/db/index.ts` - DB クライアント

**追加テーブル:**

| テーブル | 説明 |
|---------|------|
| `users` | ユーザー管理 |
| `sessions` | セッション管理 |
| `messages` | メッセージ履歴 |
| `memories` | メモリ（プロファイル/エピソード/ナレッジ） |
| `memory_embeddings` | ベクトル埋め込み（類似度検索用） |

**技術選定理由:**
- **SQLite**: サーバーレス、ファイルベース、Docker 環境でも扱いやすい
- **Drizzle ORM**: TypeScript ファースト、型安全、軽量

### 2. Embedding プロバイダー

**新規ファイル:**
- `src/lib/embedding/types.ts` - インターフェース定義
- `src/lib/embedding/ollama.ts` - Ollama Embedding 実装
- `src/lib/embedding/similarity.ts` - コサイン類似度計算

**機能:**
- テキストをベクトル（1024次元）に変換
- Ollama の `/api/embed` エンドポイントを使用
- bge-m3 モデルによる多言語対応

**実装例:**
```typescript
const provider = new OllamaEmbeddingProvider({ model: "bge-m3" });
const result = await provider.embed("こんにちは");
// result.vector: [0.123, -0.456, ...] (1024次元)
```

### 3. メモリリポジトリ

**新規ファイル:**
- `src/lib/repositories/memory.ts` - メモリ CRUD + 類似度検索
- `src/lib/repositories/user.ts` - ユーザー管理
- `src/lib/repositories/session.ts` - セッション管理

**主要機能:**

| メソッド | 説明 |
|---------|------|
| `create()` | メモリ作成 |
| `findById()` | ID で検索 |
| `findProfiles()` | プロファイルメモリ取得 |
| `searchSimilar()` | ベクトル類似度検索 |
| `saveEmbedding()` | Embedding 保存 |

**類似度検索の実装:**
```typescript
async searchSimilar(userId, queryVector, { topK, threshold, kind }) {
  // 1. 対象メモリを取得
  // 2. 各メモリとのコサイン類似度を計算
  // 3. 閾値以上のものを類似度順にソート
  // 4. 上位 K 件を返却
}
```

### 4. メモリ抽出システム

**新規ファイル:**
- `src/lib/memory/types.ts` - 型定義
- `src/lib/memory/prompts.ts` - LLM プロンプト読み込み
- `src/lib/memory/extractor.ts` - メモリ抽出
- `src/lib/memory/handler.ts` - 保存処理
- `config/memory.yaml` - 抽出プロンプト設定（外部ファイル化）

**プロンプトの外部ファイル化:**

既存の `character.yaml` と同様に、メモリ抽出プロンプトも外部ファイル化：

```yaml
# config/memory.yaml
memory:
  extraction:
    systemPrompt: |
      あなたは会話から重要な情報を抽出する専門家です。
      ユーザーとアシスタントの会話を分析し、記憶として保存すべき情報を JSON 形式で出力してください。
      ...

    labels:
      user: ユーザー
      assistant: アシスタント
      conversationHistory: "## 会話履歴"
      existingProfiles: "## 既存の Profile"
      relatedMemories: "## 関連する既存の記憶"
      task: |
        ## タスク
        上記の会話から、記憶として保存すべき情報を抽出してください。
        ...
```

**メリット:**
- コードを変更せずにプロンプトをカスタマイズ可能
- 言語の切り替えが容易
- デプロイ後でも設定変更可能

**抽出フロー:**

1. 会話履歴を LLM に送信
2. LLM が以下を JSON で返却:
   - `profileUpdates`: プロファイル更新
   - `memoriesToUpsert`: 新規/更新メモリ
   - `archiveCandidates`: アーカイブ候補
3. 信頼度でフィルタリング
4. データベースに保存

### 5. RAG サービス

**新規ファイル:**
- `src/lib/memory/rag.ts` - RAG 実装
- `src/lib/memory/service.ts` - 統合サービス

**RAG コンテキスト取得:**
```typescript
async retrieve(userId, userInput, config) {
  // 1. プロファイルメモリを取得（常に含める）
  // 2. ユーザー入力を Embedding 化
  // 3. エピソード/ナレッジから類似検索
  // 4. 重複排除 + ソート
  return { profiles, retrievedMemories, usedMemoryIds };
}
```

**コンテキストフォーマット例:**
```
[User Profile]
- 名前: 太郎
- 好きな食べ物: ラーメン

[Related Information]
- [Important] (Note) 先週末に旅行に行った
- (Recent) 天気について質問した
```

### 6. API エンドポイント

**更新ファイル:**
- `src/app/api/chat/route.ts` - RAG 統合

**新規ファイル:**
- `src/app/api/memories/route.ts` - 一覧/作成
- `src/app/api/memories/[id]/route.ts` - 詳細/更新/削除

**Chat API の変更点:**
```typescript
// RAG コンテキスト取得
const ragContext = await rag.retrieve(userId, lastUserMessage);
const formattedContext = rag.formatContext(ragContext);

// システムプロンプトにコンテキスト追加
const systemPromptWithContext = `${systemPrompt}\n\n${formattedContext}`;

// 非同期でメモリ抽出（レスポンスをブロックしない）
memService.processConversation(userId, messages, usedMemoryIds)
  .catch(console.error);
```

### 7. メモリ管理 UI

**新規ファイル:**
- `src/app/control/memory/page.tsx` - 管理画面

**機能:**
- メモリ一覧表示（種類・ステータスでフィルタ）
- 新規メモリ作成
- 既存メモリ編集
- メモリ削除（ソフト/ハード）

### 8. Docker 対応

**更新ファイル:**
- `Dockerfile` - better-sqlite3 ビルド対応
- `compose.yaml` - データボリューム追加
- `config/providers.docker.yaml` - Embedding 設定追加

**主な変更:**
```yaml
volumes:
  - mirrormate-data:/app/data  # SQLite 永続化

volumes:
  mirrormate-data:
```

---

## 設定ファイル

### providers.yaml（プロバイダー設定）

```yaml
providers:
  embedding:
    enabled: true
    provider: ollama
    ollama:
      model: bge-m3
      baseUrl: "http://localhost:11434"

  memory:
    enabled: true
    rag:
      topK: 8           # 取得するメモリの最大数
      threshold: 0.3    # 類似度の閾値
    extraction:
      autoExtract: true      # 自動抽出の有効化
      minConfidence: 0.5     # 抽出の最小信頼度
```

### memory.yaml（プロンプト設定）

```yaml
memory:
  extraction:
    systemPrompt: |
      あなたは会話から重要な情報を抽出する専門家です。
      ...

    labels:
      user: ユーザー
      assistant: アシスタント
      ...
```

---

## メモリの種類

| 種類 | 用途 | 例 |
|------|------|-----|
| `profile` | ユーザーの永続的な情報 | 名前、好み、性格 |
| `episode` | 最近のイベント・出来事 | 昨日の会話内容 |
| `knowledge` | 学習した事実情報 | ユーザーの仕事、趣味 |

---

## 技術的なポイント

### 1. 非同期メモリ抽出

レスポンス時間に影響を与えないよう、メモリ抽出は非同期で実行:

```typescript
// レスポンス返却後に非同期で実行
memService.processConversation(userId, messages, usedMemoryIds)
  .catch(console.error);
```

### 2. コサイン類似度によるセマンティック検索

テキストの意味的な類似性に基づいて関連メモリを検索:

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

### 3. 設定の外部ファイル化

既存のパターンに従い、プロンプトも外部ファイル化：

| 設定ファイル | 内容 |
|-------------|------|
| `character.yaml` | AI キャラクター設定 |
| `memory.yaml` | メモリ抽出プロンプト |
| `providers.yaml` | プロバイダー設定 |

### 4. フォールバック機構

Embedding プロバイダーが利用できない場合のフォールバック:

```typescript
if (rag && memoryConfig?.enabled) {
  try {
    const ragContext = await rag.retrieve(userId, input);
    // ...
  } catch (error) {
    // RAG 失敗時はシンプルなコンテキストを使用
    const simpleContext = await getSimpleContext(userId);
  }
}
```

### 5. WAL モードによる並行処理

SQLite の WAL モードを有効化して読み書き性能を向上:

```typescript
sqlite.pragma("journal_mode = WAL");
```

---

## ファイル構成

```
src/lib/
├── db/                      # データベース層
│   ├── index.ts             # DB クライアント
│   └── schema.ts            # スキーマ定義
├── embedding/               # Embedding プロバイダー
│   ├── index.ts             # エクスポート
│   ├── ollama.ts            # Ollama 実装
│   ├── similarity.ts        # 類似度計算
│   └── types.ts             # 型定義
├── memory/                  # メモリシステム
│   ├── index.ts             # エクスポート
│   ├── extractor.ts         # メモリ抽出
│   ├── handler.ts           # 保存処理
│   ├── prompts.ts           # プロンプト読み込み
│   ├── rag.ts               # RAG サービス
│   ├── service.ts           # 統合サービス
│   └── types.ts             # 型定義
├── repositories/            # リポジトリ層
│   ├── index.ts             # エクスポート
│   ├── memory.ts            # メモリリポジトリ
│   ├── session.ts           # セッションリポジトリ
│   └── user.ts              # ユーザーリポジトリ
└── providers/
    └── embedding.ts         # Embedding プロバイダー設定

config/
├── memory.yaml              # メモリ抽出プロンプト（新規）
└── providers.yaml           # プロバイダー設定（更新）

src/app/
├── api/
│   ├── chat/route.ts        # 更新: RAG 統合
│   └── memories/            # 新規: メモリ API
│       ├── route.ts
│       └── [id]/route.ts
└── control/
    └── memory/page.tsx      # 新規: 管理 UI
```

---

## 今後の拡張可能性

1. **ベクトル DB への移行**: Pinecone、Weaviate などへの移行が容易な設計
2. **複数 Embedding プロバイダー**: OpenAI Embedding などの追加
3. **メモリの自動整理**: 古いメモリの自動アーカイブ
4. **マルチユーザー対応**: 複数ユーザーの完全分離
5. **メモリのインポート/エクスポート**: バックアップ機能

---

## まとめ

本実装により、MirrorMate は以下の能力を獲得しました:

| 機能 | 説明 |
|------|------|
| **永続的な記憶** | ユーザー情報をデータベースに保存 |
| **自動学習** | 会話からメモリを自動抽出 |
| **セマンティック検索** | 意味的な関連性に基づくメモリ検索 |
| **コンテキスト拡張** | RAG により関連情報を LLM に提供 |
| **管理 UI** | メモリの確認・編集が可能 |
| **設定の外部ファイル化** | コード変更なしにプロンプトをカスタマイズ |

これにより、MirrorMate は単なるチャットボットから、**ユーザーを理解し記憶するパーソナルアシスタント**へと進化しました。
