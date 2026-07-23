"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from "recharts";
import { CRITERIA_LABELS, fmtDuration } from "@/lib/criteria";

export default function ResultPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/submissions/${id}`).then(async (r) => {
      if (r.status === 401) return router.replace("/login");
      const d = await r.json();
      if (!r.ok) return setError(d.error || "読み込みに失敗しました");
      setData(d);
    });
  }, [id, router]);

  async function rechallenge() {
    setBusy(true);
    await fetch(`/api/meetings/${data.submission.meeting_id}/finish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ restart: true }),
    });
    router.push(`/play/${data.submission.meeting_id}`);
  }

  if (error) return <div className="error">{error}</div>;
  if (!data) return <p style={{ color: "var(--muted)" }}>読み込み中...</p>;

  const s = data.submission;
  const scores = s.criteria?.scores || {};
  const comments = s.criteria?.comments || {};
  const radarData = Object.entries(CRITERIA_LABELS).map(([key, label]) => ({
    subject: label,
    score: scores[key] ?? 0,
  }));

  return (
    <div>
      <h1>採点結果: {s.meeting_title}</h1>
      <p style={{ color: "var(--muted)", fontSize: 14 }}>
        {s.attempt}回目の提出 / {new Date(s.created_at).toLocaleString("ja-JP")}
      </p>

      <div className="grid2">
        <div className="card" style={{ textAlign: "center" }}>
          <h2>総合スコア</h2>
          <div className="score-big">{s.total_score}<span style={{ fontSize: 20 }}> / 100</span></div>
          <p style={{ margin: 4 }}>
            所要時間: <strong>{fmtDuration(s.duration_seconds)}</strong>
            {s.overtime && <span className="badge warn">制限時間超過</span>}
          </p>
          <p style={{ fontSize: 13 }}>
            <a href={`/api/submissions/${s.id}/pdf`} target="_blank">提出したPDFを開く</a>
          </p>
        </div>
        <div className="card">
          <h2>観点別スコア(5段階)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 5]} tickCount={6} />
              <Radar dataKey="score" stroke="#2b5cd9" fill="#2b5cd9" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2>観点別の講評</h2>
        <table>
          <thead>
            <tr><th>観点</th><th>点</th><th>コメント</th></tr>
          </thead>
          <tbody>
            {Object.entries(CRITERIA_LABELS).map(([key, label]) => (
              <tr key={key}>
                <td style={{ whiteSpace: "nowrap" }}>{label}</td>
                <td><strong>{scores[key] ?? "-"}</strong>/5</td>
                <td>{comments[key] || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>✅ 良かった点</h2>
          <ul>{(s.good_points || []).map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
        <div className="card">
          <h2>⚠️ 不足していた点</h2>
          <ul>{(s.weak_points || []).map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
      </div>

      <div className="card">
        <h2>🔧 具体的な改善策</h2>
        {(s.improvements || []).map((im, i) => (
          <div key={i} style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
            <blockquote style={{ margin: "0 0 6px", padding: "6px 12px", background: "#fafbfd", borderLeft: "3px solid var(--accent)", fontSize: 14 }}>
              {im.quote}
            </blockquote>
            <p style={{ margin: "4px 0" }}><strong>問題点:</strong> {im.problem}</p>
            <p style={{ margin: "4px 0" }}><strong>改善策:</strong> {im.suggestion}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>📖 模範例との比較</h2>
        <p style={{ fontSize: 14 }}>{s.comparison}</p>
        <div className="grid2">
          <div>
            <h3>あなたの提出物(抽出テキスト)</h3>
            <div className="model-doc">{s.extracted_text}</div>
          </div>
          <div>
            <h3>模範議事ドキュメント</h3>
            <div className="model-doc">{s.model_answer}</div>
          </div>
        </div>
      </div>

      {(s.focus_points || []).length > 0 && (
        <div className="focus-card">
          <strong>💡 次回意識するポイント</strong>
          <ul>{s.focus_points.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
      )}

      {data.attempts?.length > 1 && (
        <div className="card">
          <h2>この会議への挑戦履歴</h2>
          <table>
            <thead>
              <tr><th>試行</th><th>スコア</th><th>所要時間</th><th></th></tr>
            </thead>
            <tbody>
              {data.attempts.map((a) => (
                <tr key={a.id} style={a.id === s.id ? { background: "var(--accent-soft)" } : {}}>
                  <td>{a.attempt}回目</td>
                  <td><strong>{a.total_score}</strong>点</td>
                  <td>{fmtDuration(a.duration_seconds)}</td>
                  <td>{a.id !== s.id && <Link href={`/result/${a.id}`}>見る</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn secondary" onClick={rechallenge} disabled={busy}>
          🔁 同じ会議に再挑戦する
        </button>
        <Link href="/new" className="btn">＋ 新しい練習</Link>
        <Link href="/dashboard" className="btn secondary">ダッシュボードへ</Link>
      </div>
    </div>
  );
}
