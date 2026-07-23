"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fmtDuration } from "@/lib/criteria";

export default function AdminPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin").then(async (r) => {
      if (r.status === 401) return router.replace("/login");
      if (r.status === 403) return setError("管理者権限がありません");
      const d = await r.json();
      setData(d);
    });
  }, [router]);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <p style={{ color: "var(--muted)" }}>読み込み中...</p>;

  return (
    <div>
      <h1>管理者ダッシュボード</h1>

      <div className="card">
        <h2>ユーザー別成績(平均スコア順)</h2>
        <table>
          <thead>
            <tr>
              <th>#</th><th>ニックネーム</th><th>メール</th><th>提出数</th>
              <th>平均スコア</th><th>ベスト</th><th>平均所要時間</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((u, i) => (
              <tr key={u.id}>
                <td>{i + 1}</td>
                <td>{u.nickname}</td>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>{u.email}</td>
                <td>{u.submissions}</td>
                <td><strong>{u.avg_score}</strong>点</td>
                <td>{u.best_score}点</td>
                <td>{fmtDuration(u.avg_duration)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>最近の提出(50件)</h2>
        <table>
          <thead>
            <tr><th>日時</th><th>ユーザー</th><th>会議</th><th>スコア</th><th>所要時間</th><th></th></tr>
          </thead>
          <tbody>
            {data.recent.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.created_at).toLocaleString("ja-JP")}</td>
                <td>{s.nickname}</td>
                <td>{s.title}</td>
                <td><strong>{s.total_score}</strong>点</td>
                <td>{fmtDuration(s.duration_seconds)}</td>
                <td><Link href={`/result/${s.id}`}>詳細</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
