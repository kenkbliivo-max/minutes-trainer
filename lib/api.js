import { NextResponse } from "next/server";

export function jsonError(err) {
  const status = err.status || 500;
  const message = err.status ? err.message : "サーバーエラーが発生しました";
  if (!err.status) console.error(err);
  return NextResponse.json({ error: message }, { status });
}
