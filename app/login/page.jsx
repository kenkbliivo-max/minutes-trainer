"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, nickname, password }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setError(d.error || "エラーが発生しました");
    router.push("/dashboard");
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <div className="card">
        <h1>{mode === "login" ? "ログイン" : "新規登録"}</h1>
        <p style={{ fontSize: 14, color: "var(--muted)" }}>
          架空の会議で議事ドキュメント作成を練習し、AIの採点・講評で上達するアプリです。
        </p>
        <form onSubmit={submit}>
          <label>メールアドレス</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {mode === "register" && (
            <>
              <label>ニックネーム</label>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} required />
            </>
          )}
          <label>パスワード(6文字以上)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          {error && <div className="error">{error}</div>}
          <div style={{ marginTop: 16 }}>
            <button className="btn" disabled={busy}>
              {busy ? "処理中..." : mode === "login" ? "ログイン" : "登録する"}
            </button>
          </div>
        </form>
        <p style={{ fontSize: 14, marginTop: 16 }}>
          {mode === "login" ? (
            <>初めての方は <a href="#" onClick={(e) => { e.preventDefault(); setMode("register"); }}>新規登録</a></>
          ) : (
            <>アカウントをお持ちの方は <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); }}>ログイン</a></>
          )}
        </p>
      </div>
    </div>
  );
}
