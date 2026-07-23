import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  try {
    const user = await requireUser();
    const r = await query(
      "select * from meetings where id = $1 and user_id = $2",
      [params.id, user.id]
    );
    const m = r.rows[0];
    if (!m) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({
      meeting: {
        id: m.id,
        title: m.title,
        theme: m.theme,
        difficulty: m.difficulty,
        length: m.length,
        participants: m.participants,
        utterances: m.utterances,
        noRewind: m.no_rewind,
        timeLimitMinutes: m.time_limit_minutes,
        timerStartedAt: m.timer_started_at,
        createdAt: m.created_at,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
