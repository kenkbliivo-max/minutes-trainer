import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

// 会議の再生終了時(または再挑戦開始時)に呼ぶ: 提出タイマー開始
export async function POST(req, { params }) {
  try {
    const user = await requireUser();
    const { restart } = await req.json().catch(() => ({}));
    const r = await query(
      restart
        ? `update meetings set timer_started_at = now()
           where id = $1 and user_id = $2 returning timer_started_at`
        : `update meetings set timer_started_at = coalesce(timer_started_at, now())
           where id = $1 and user_id = $2 returning timer_started_at`,
      [params.id, user.id]
    );
    if (!r.rows[0])
      return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ timerStartedAt: r.rows[0].timer_started_at });
  } catch (err) {
    return jsonError(err);
  }
}
