"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const THEMES = [
  "新規事業の検討",
  "採用方針の見直し",
  "障害対応の振り返り",
  "四半期予算の配分",
  "業務プロセス改善",
  "マーケティング施策の優先順位",
];

export default function NewPractice() {
  const [theme, setTheme] = useState(THEMES[0]);
  const [customTheme, setCustomTheme] = useState("");
  const [participants, setParticipants] = useState(4);
  const [length, setLength] = useState("medium");
  const [difficulty, setDifficulty] = useState(1);
  const [noRewind, setNoRewind] = useState(false);
  const [timeLimit, setTimeLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function generate(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        theme: customTheme.trim() || theme,
        participants,
        length,
        difficulty,
        noRewind,
        timeLimitMinutes: timeLimit ? parseInt(timeLimit) : null,
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      setBusy(false);
      return setError(d.error || "生成に失敗しました");
    }
    router.push(`/play/${d.id}`);
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <h1>新しい練習</h1>
      <div className="card">
        <form onSubmit={generate}>
          <label>会議テーマ</label>
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            {THEMES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <label>自由入力(任意。入力するとこちらを優先)</label>
          <input
            value={customTheme}
            onChange={(e) => setCustomTheme(e.target.value)}
            placeholder="例: 社内ツールのリプレイス検討"
          />
          <div className="grid2">
            <div>
              <label>参加人数</label>
              <select value={participants} onChange={(e) => setParticipants(+e.target.value)}>
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n}名</option>
                ))}
              </select>
            </div>
            <div>
              <label>会議の長さ</label>
              <select value={length} onChange={(e) => setLength(e.target.value)}>
                <option value="short">短い(約20発言)</option>
                <option value="medium">普通(約40発言)</option>
                <option value="long">長い(約65発言)</option>
              </select>
            </div>
          </div>
          <div className="grid2">
            <div>
              <label>難易度</label>
              <select value={difficulty} onChange={(e) => setDifficulty(+e.target.value)}>
                <option value={1}>★ 易しい(論点が整理された会議)</option>
                <option value={2}>★★ 普通(脱線・並行論点あり)</option>
                <option value={3}>★★★ 難しい(脱線多め・結論曖昧)</option>
              </select>
            </div>
            <div>
              <label>制限時間(任意・分)</label>
              <input
                type="number"
                min="5"
                max="120"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                placeholder="なし"
              />
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={noRewind}
              onChange={(e) => setNoRewind(e.target.checked)}
            />
            巻き戻し不可モード(実践に近い緊張感で。再生後に発言ログを見返せません)
          </label>
          {error && <div className="error">{error}</div>}
          <div style={{ marginTop: 20 }}>
            <button className="btn" disabled={busy}>
              {busy ? "会議を生成中...(30秒ほどかかります)" : "会議を生成する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
