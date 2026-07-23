import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  try {
    const user = await requireUser();
    const r = await query(
      `select s.id, s.meeting_id, s.attempt, s.pdf_filename, s.extracted_text,
              s.total_score, s.criteria, s.good_points, s.weak_points,
              s.improvements, s.model_answer, s.comparison, s.focus_points,
              s.duration_seconds, s.overtime, s.created_at,
              m.title as meeting_title, m.no_rewind, m.time_limit_minutes
       from submissions s
       join meetings m on m.id = s.meeting_id
       where s.id = $1 and (s.user_id = $2 or $3)`,
      [params.id, user.id, user.is_admin]
    );
    const s = r.rows[0];
    if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });

    // 同じ会議の他の試行 (再挑戦比較用)
    const others = await query(
      `select id, attempt, total_score, duration_seconds, created_at
       from submissions where meeting_id = $1 and user_id = $2 order by attempt`,
      [s.meeting_id, user.id]
    );

    return NextResponse.json({ submission: s, attempts: others.rows });
  } catch (err) {
    return jsonError(err);
  }
}
