// AIバックエンド: GEMINI_API_KEY があればGemini(無料枠あり)、
// なければ ANTHROPIC_API_KEY でClaudeを使う

async function callClaude(system, userText, maxTokens = 8000) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userText }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

async function callGemini(system, userText, maxTokens = 8192) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const generationConfig = {
    maxOutputTokens: maxTokens,
    temperature: 0.7,
    responseMimeType: "application/json",
  };
  // 2.5系は思考機能を無効化してトークンを節約
  if (model.startsWith("gemini-2.5")) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig,
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) {
      throw Object.assign(
        new Error("AIの無料枠の利用上限に達しました。しばらく待ってからお試しください。"),
        { status: 429 }
      );
    }
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("");
}

async function callLLM(system, userText, maxTokens = 8000) {
  if (process.env.GEMINI_API_KEY) return callGemini(system, userText, maxTokens);
  if (process.env.ANTHROPIC_API_KEY) return callClaude(system, userText, maxTokens);
  throw new Error(
    "AIのAPIキーが設定されていません(環境変数 GEMINI_API_KEY または ANTHROPIC_API_KEY)"
  );
}

function extractJSON(text) {
  // コードフェンスや前置きを除去してJSONを取り出す
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI応答のJSON解析に失敗しました");
  return JSON.parse(candidate.slice(start, end + 1));
}

const LENGTH_UTTERANCES = { short: 20, medium: 40, long: 65 };

export async function generateMeeting({ theme, participants, length, difficulty }) {
  const count = LENGTH_UTTERANCES[length] || 40;
  const noise =
    difficulty >= 3
      ? "頻繁な脱線・雑談、複数の論点が並行して進む、発言の割り込み、曖昧な言い回し、結論が一部曖昧なまま終わる、後から前の論点に戻る、といった実際の会議のノイズを多く含めてください。"
      : difficulty === 2
      ? "ときどき話が脱線する、2つの論点が並行して議論される場面がある、一部の発言が曖昧、といった軽いノイズを含めてください。"
      : "論点が順番に整理されて進み、結論が明確な、比較的わかりやすい会議にしてください。";

  const system = `あなたは日本企業のリアルな会議を脚本として生成する専門家です。議事録作成のトレーニング用に、架空の会議の逐語的な発言のやり取りを生成します。
必ず以下のJSONだけを出力してください(前置き・説明・コードフェンス不要):
{
  "title": "会議タイトル",
  "agenda": "この会議の議題・背景の説明(2〜3文)",
  "participants": [{"name": "苗字のみの日本人名", "role": "役職・立場"}],
  "utterances": [{"speaker": "participantsのnameと一致", "text": "発言内容"}]
}
要件:
- 発言数は約${count}件。1発言は1〜4文程度で、話し言葉として自然に。
- 発言には具体的な数字・固有名詞(架空)・意見の対立・葛藤を含め、議事録に書く価値のある実質的な内容にする。
- 決定事項だけでなく、決定に至る議論の過程・保留になった論点も含める。
- ${noise}`;

  const user = `テーマ: ${theme}\n参加人数: ${participants}名\n長さ: ${length}(約${count}発言)\n難易度: ${difficulty}(1=易しい〜3=難しい)`;

  const text = await callLLM(system, user, 8000);
  const json = extractJSON(text);
  if (!Array.isArray(json.utterances) || json.utterances.length === 0) {
    throw new Error("会議の生成に失敗しました。もう一度お試しください。");
  }
  return json;
}

export const CRITERIA = [
  { key: "coverage", label: "網羅性", desc: "決定事項だけでなく、議論の過程・論点・葛藤が記録されているか" },
  { key: "structure", label: "構造化", desc: "発言の羅列ではなく、論点ごとに整理・構造化されているか" },
  { key: "objectivity", label: "客観性", desc: "書き手の主観・解釈が混入していないか" },
  { key: "clarity", label: "わかりやすさ", desc: "事実が事実以上にわかりやすく整理されているか" },
  { key: "thirdparty", label: "第三者理解", desc: "会議に参加していない人が読んで、議論の流れと結論が手に取るようにわかるか" },
  { key: "accumulation", label: "思考の積み上げ", desc: "発言者の思考の流れ・積み上げが再現されているか" },
];

export async function scoreMinutes({ meeting, minutesText }) {
  const transcript = meeting.utterances
    .map((u) => `${u.speaker}: ${u.text}`)
    .join("\n");

  const criteriaDesc = CRITERIA.map((c) => `- ${c.key}(${c.label}): ${c.desc}`).join("\n");

  const system = `あなたは議事ドキュメントの採点者です。以下の評価思想に基づいて採点します:
- 目指す議事ドキュメントは、決定事項の記録ではなく「議論そのものを重要なナレッジ」として扱うもの。
- 会話の内容を構造化し、思考の整理まで支援する。
- 書き手の主観は交えず、事実を事実以上にわかりやすく整理し、誰が見ても理解できる。
- 発言者にとっては思考の積み上げになり、参加していない人も内容が手に取るようにわかる。

評価観点(各0〜5点):
${criteriaDesc}

必ず以下のJSONだけを出力してください(前置き・コードフェンス不要):
{
  "criteria": {"coverage": 0-5, "structure": 0-5, "objectivity": 0-5, "clarity": 0-5, "thirdparty": 0-5, "accumulation": 0-5},
  "criteria_comments": {"coverage": "1〜2文の根拠", "structure": "...", "objectivity": "...", "clarity": "...", "thirdparty": "...", "accumulation": "..."},
  "good_points": ["良かった点(具体的に、提出物から引用しながら)", "..."],
  "weak_points": ["不足していた点(具体的に)", "..."],
  "improvements": [{"quote": "提出物または会議中の該当箇所の引用", "problem": "何が問題か", "suggestion": "こう構造化・記述すべきという具体的な改善策"}],
  "model_answer": "この会議に対するお手本の議事ドキュメント全文(Markdown形式。議題/参加者/論点ごとの構造化された議論の整理/決定事項/保留事項/ネクストアクションを含む)",
  "comparison": "模範例と提出物の違いの要約(3〜5文)",
  "focus_points": ["次回意識すべきポイント(1〜3個、短く)"]
}
採点は厳しめに、しかし公平に。improvementsは3〜5件、必ず具体的な引用を伴うこと。`;

  const user = `# 会議情報\nタイトル: ${meeting.title}\n議題: ${meeting.agenda || meeting.theme}\n参加者: ${(meeting.participants || [])
    .map((p) => `${p.name}(${p.role})`)
    .join("、")}\n\n# 会議の全発言\n${transcript}\n\n# 提出された議事ドキュメント(PDFから抽出)\n${minutesText}`;

  const text = await callLLM(system, user, 8000);
  const json = extractJSON(text);

  const scores = {};
  let sum = 0;
  for (const c of CRITERIA) {
    const v = Math.max(0, Math.min(5, Number(json.criteria?.[c.key] ?? 0)));
    scores[c.key] = v;
    sum += v;
  }
  const total = Math.round((sum / (CRITERIA.length * 5)) * 100);

  return {
    total,
    criteria: scores,
    criteriaComments: json.criteria_comments || {},
    goodPoints: json.good_points || [],
    weakPoints: json.weak_points || [],
    improvements: json.improvements || [],
    modelAnswer: json.model_answer || "",
    comparison: json.comparison || "",
    focusPoints: json.focus_points || [],
  };
}
