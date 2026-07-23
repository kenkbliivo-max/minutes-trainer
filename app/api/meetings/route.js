import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateMeeting } from "@/lib/claude";
import { checkAndConsume } from "@/lib/rateLimit";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const theme = (body.theme || "").slice(0, 200) || "新規事業の検討";
    const participants = Math.max(2, Math.min(6, parseInt(body.participants) || 4));
    const length = ["short", "medium", "long"].includes(body.length)
      ? body.length
      : "medium";
    const difficulty = Math.max(1, Math.min(3, parseInt(body.difficulty) || 1));
    const noRewind = !!body.noRewind;
    const timeLimit = body.timeLimitMinutes
      ? Math.max(5, Math.min(120, parseInt(body.timeLimitMinutes)))
      : null;

    const remaining = await checkAndConsume(user.id, "generates");

    const meeting = await generateMeeting({
      theme,
      participants,
      length,
      difficulty,
    });

    const r = await query(
      `insert into meetings
         (user_id, title, theme, difficulty, length, participants, utterances, no_rewind, time_limit_minutes)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       returning id`,
      [
        user.id,
        meeting.title,
        theme,
        difficulty,
        length,
        JSON.stringify(meeting.participants),
        JSON.stringify(meeting.utterances),
        noRewind,
        timeLimit,
      ]
    );
    return NextResponse.json({ id: r.rows[0].id, remaining });
  } catch (err) {
    return jsonError(err);
  }
}
