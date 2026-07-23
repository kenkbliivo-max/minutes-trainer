"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { CRITERIA_LABELS, fmtDuration } from "@/lib/criteria";

export default function Dashboard() {
  const [history, setHistory] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/history").then(async (r) => {
      if (r.status === 401) return router.replace("/login");
      const d = await r.json();
      setHistory(d.history || []);
    });
  }, [router]);

  if (!history) return <p style={{ color: "var(--muted)" }}>読み込み中...</p>;

  const latest = history[history.length - 1];
  const focus = latest?.focus_points || [];

  const trend = history.map((h, i) => ({
    name: `#${i + 1}`,
    スコア: h.total_score,
    所要分: h.duration_seconds != null ? Math.round(h.duration_seconds / 60) : null,
  }));

  // 観点別平均 (直近5回)
  const recent = history.slice(-5);
  const radarData = Object.entries(CRITERIA_LABELS).map(([key, label]) => {
    const vals = recent
      .map((h) => h.criteria?.scores?.[key])
      .filter((v) => v != null);
    return {
      subject: label,
      score: vals.length
        ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
        : 0,
    };
  });

  return (
    <div>
      <h1>ダッシュボード</h1>

      {focus.length > 0 && (
        <div className="focus-card">
          <strong>💡 次回意識するポイント(前回の講評より)</strong>
          <ul>
            {focus.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <Link href="/new" className="btn">＋ 新しい練習を始める</Link>
      </div>

      {history.length === 0 ? (
        <div className="card">
          <p>まだ練習履歴がありません。「新しい練習を始める」から最初の会議を生成しましょう。</p>
        </div>
      ) : (
        <>
          <div className="grid2">
            <div className="card">
              <h2>スコアと所要時間の推移</h2>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="l" domain={[0, 100]} />
                  <YAxis yAxisId="r" orientation="right" />
                  <Tooltip />
                  <Line yAxisId="l" type="monotone" dataKey="スコア" stroke="#2b5cd9" strokeWidth={2} />
                  <Line yAxisId="r" type="monotone" dataKey="所要分" stroke="#e8a33d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h2>観点別レーダー(直近5回平均)</h2>
              <ResponsiveContainer width="100%" height={240}>
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
            <h2>練習履歴</h2>
            <table>
              <thead>
                <tr>
                  <th>日時</th>
                  <th>会議</th>
                  <th>難易度</th>
                  <th>試行</th>
                  <th>スコア</th>
                  <th>所要時間</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((h) => (
                  <tr key={h.id}>
                    <td>{new Date(h.created_at).toLocaleString("ja-JP")}</td>
                    <td>{h.title}</td>
                    <td>{"★".repeat(h.difficulty)}</td>
                    <td>{h.attempt}回目</td>
                    <td>
                      <strong>{h.total_score}</strong>点
                      {h.overtime && <span className="badge warn">時間超過</span>}
                    </td>
                    <td>{fmtDuration(h.duration_seconds)}</td>
                    <td>
                      <Link href={`/result/${h.id}`}>結果を見る</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
