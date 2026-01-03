import { ConversationContext } from "./types";

/**
 * System prompt for memory extraction
 */
export const EXTRACTION_SYSTEM_PROMPT = `あなたは会話から重要な情報を抽出する専門家です。
ユーザーとアシスタントの会話を分析し、記憶として保存すべき情報を JSON 形式で出力してください。

## 抽出すべき情報

### 1. Profile（長期記憶）
ユーザーの永続的な特徴や好み：
- 呼び方の好み（敬語/タメ口）
- 興味・関心事
- 仕事・職業
- 性格的な特徴
- 禁止事項やNG

### 2. Episode（中期記憶）
最近の出来事や状況：
- 今日/今週の予定
- 進行中のプロジェクト
- 最近の出来事
- 一時的な状況

### 3. Knowledge（知識）
事実情報やメモ：
- 技術的な決定事項
- 設定情報
- TODO やタスク
- 重要なメモ

## 抽出しない情報

以下は保存しないでください：
- 一般的な挨拶や相槌
- 秘密情報（パスワード、API キー、個人情報）
- 一時的な質問への回答（「今何時？」など）
- 既に保存済みの情報の重複

## 出力形式

必ず以下の JSON 形式で出力してください：

\`\`\`json
{
  "profileUpdates": [
    {
      "key": "プロファイルのキー",
      "value": "値",
      "confidence": 0.0-1.0
    }
  ],
  "memoriesToUpsert": [
    {
      "kind": "profile|episode|knowledge",
      "title": "簡潔なタイトル",
      "content": "詳細な内容",
      "tags": ["タグ1", "タグ2"],
      "importance": 0.0-1.0,
      "existingMemoryId": "更新の場合は既存のID"
    }
  ],
  "archiveCandidates": [
    {
      "memoryId": "アーカイブすべき記憶のID",
      "reason": "理由"
    }
  ],
  "skipReason": "抽出すべきものがない場合の理由"
}
\`\`\`

## 重要度の基準

- 0.9-1.0: 常に参照すべき重要な情報
- 0.7-0.8: 頻繁に参照すべき情報
- 0.5-0.6: 必要に応じて参照する情報
- 0.3-0.4: 補足的な情報
- 0.1-0.2: あまり重要でない情報`;

/**
 * Build user prompt for memory extraction
 */
export function buildExtractionPrompt(context: ConversationContext): string {
  let prompt = "## 会話履歴\n\n";

  for (const msg of context.recentMessages) {
    const role = msg.role === "user" ? "ユーザー" : "アシスタント";
    prompt += `**${role}**: ${msg.content}\n\n`;
  }

  if (context.existingProfiles.length > 0) {
    prompt += "## 既存の Profile\n\n";
    for (const profile of context.existingProfiles) {
      prompt += `- ${profile.key}: ${profile.value}\n`;
    }
    prompt += "\n";
  }

  if (context.relatedMemories.length > 0) {
    prompt += "## 関連する既存の記憶\n\n";
    for (const memory of context.relatedMemories) {
      prompt += `- [${memory.id}] (${memory.kind}) ${memory.title}: ${memory.content}\n`;
    }
    prompt += "\n";
  }

  prompt += `## タスク

上記の会話から、記憶として保存すべき情報を抽出してください。
既存の記憶と重複する場合は、更新として existingMemoryId を指定してください。
古くなった情報があれば archiveCandidates に追加してください。

JSON 形式で出力してください。`;

  return prompt;
}
