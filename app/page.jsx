"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => router.replace(d.user ? "/dashboard" : "/login"));
  }, [router]);
  return <p style={{ color: "var(--muted)" }}>読み込み中...</p>;
}
