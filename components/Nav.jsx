"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Nav() {
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }

  return (
    <nav className="nav">
      <Link href="/" className="brand">📝 議事録練習</Link>
      {user && (
        <>
          <Link href="/dashboard">ダッシュボード</Link>
          <Link href="/new">新しい練習</Link>
          {user.is_admin && <Link href="/admin">管理者</Link>}
        </>
      )}
      <span className="spacer" />
      {user ? (
        <>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {user.nickname}
          </span>
          <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>
            ログアウト
          </a>
        </>
      ) : (
        <Link href="/login">ログイン</Link>
      )}
    </nav>
  );
}
