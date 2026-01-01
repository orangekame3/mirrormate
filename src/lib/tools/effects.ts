import { Tool } from "./types";

export type EffectType = "confetti" | "hearts" | "sparkles";

// Holds the effect to trigger for the current request
let pendingEffect: EffectType | null = null;

export function getPendingEffect(): EffectType | null {
  const effect = pendingEffect;
  pendingEffect = null; // Clear after retrieval
  return effect;
}

export function clearPendingEffect(): void {
  pendingEffect = null;
}

export const effectTool: Tool = {
  definition: {
    name: "show_effect",
    description: `画面にエフェクトを表示します。嬉しいとき、お祝いのとき、感動したときなど、感情を表現したいときに使ってください。
- confetti: 紙吹雪（お祝い、嬉しいニュース、達成）
- hearts: ハート（愛情、感謝、応援）
- sparkles: キラキラ（驚き、発見、素敵なこと）`,
    parameters: {
      type: "object",
      properties: {
        effect: {
          type: "string",
          description: "表示するエフェクトの種類",
          enum: ["confetti", "hearts", "sparkles"],
        },
        reason: {
          type: "string",
          description: "エフェクトを表示する理由（内部ログ用）",
        },
      },
      required: ["effect"],
    },
  },

  async execute(args: Record<string, unknown>): Promise<string> {
    const effect = args.effect as EffectType;
    const reason = args.reason as string | undefined;

    console.log(`[Effect] Triggering ${effect}${reason ? ` - ${reason}` : ""}`);

    pendingEffect = effect;

    return `Displaying ${effect} effect`;
  },
};
