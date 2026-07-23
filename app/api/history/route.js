import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const r = await query(
      `select s.id, s.attempt, s.total_score, s.criteria, s.duration_seconds,
              s.overtime, s.focus_points, s.created_at,
              m.id as meeting_id, m.title, m.difficulty
       from submissions s
       join meetings m on m.id = s.meeting_id
       where s.user_id = $1
       order by s.created_at asc`,
      [user.id]
    );
    return NextResponse.json({ history: r.rows });
  } catch (err) {
    return jsonError(err);
  }
}
