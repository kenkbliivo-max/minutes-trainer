import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user.is_admin)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const users = await query(
      `select u.id, u.email, u.nickname, u.created_at,
              count(s.id)::int as submissions,
              coalesce(round(avg(s.total_score)), 0)::int as avg_score,
              coalesce(max(s.total_score), 0)::int as best_score,
              coalesce(round(avg(s.duration_seconds)), 0)::int as avg_duration
       from users u
       left join submissions s on s.user_id = u.id
       group by u.id
       order by avg_score desc`
    );

    const recent = await query(
      `select s.id, s.total_score, s.duration_seconds, s.created_at,
              u.nickname, m.title
       from submissions s
       join users u on u.id = s.user_id
       join meetings m on m.id = s.meeting_id
       order by s.created_at desc
       limit 50`
    );

    return NextResponse.json({ users: users.rows, recent: recent.rows });
  } catch (err) {
    return jsonError(err);
  }
}
