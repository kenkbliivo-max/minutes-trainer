import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { scoreMinutes } from "@/lib/claude";
import { checkAndConsume } from "@/lib/rateLimit";
import { jsonError } from "@/lib/api";
import { extractPdfText } from "@/lib/pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req) {
  try {
    const user = await requireUser();
    const form = await req.formData();
    const meetingId = form.get("meetingId");
    const file = form.get("file");

    if (!meetingId || !file || typeof file === "string") {
      return NextResponse.json(
        { error: "PDFファイルを選択してください" },
        { status: 400 }
      );
    }
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "PDFは4MB以下にしてください" },
        { status: 400 }
      );
    }

    const mr = await query(
      "select * from meetings where id = $1 and user_id = $2",
      [meetingId, user.id]
    );
    const meeting = mr.rows[0];
    if (!meeting)
      return NextResponse.json({ error: "会議が見つかりません" }, { status: 404 });
    if (!meeting.timer_started_at)
      return NextResponse.json(
        { error: "会議の再生が終了していません" },
        { status: 400 }
      );

    const buf = Buffer.from(await file.arrayBuffer());
    let extracted = "";
    try {
      extracted = await extractPdfText(buf);
    } catch (e) {
      console.error("PDF読み取りエラー:", e);
      return NextResponse.json(
        { error: "PDF読み取り失敗(詳細): " + (e && e.message ? e.message : String(e)) },
        { status: 400 }
      );
    }
        { status: 400 }
      );
    }
    if (extracted.length < 50) {
      return NextResponse.json(
        {
          error:
            "PDFからテキストを抽出できませんでした。画像化されたPDFではなく、Word等から書き出したテキストPDFを提出してください",
        },
        { status: 400 }
      );
    }

    await checkAndConsume(user.id, "scores");

    // 所要時間 (再生終了 or 再挑戦開始 → 提出)
    const durRes = await query(
      "select extract(epoch from (now() - timer_started_at))::int as d from meetings where id = $1",
      [meetingId]
    );
    const duration = Math.max(0, durRes.rows[0].d);
    const overtime =
      meeting.time_limit_minutes != null &&
      duration > meeting.time_limit_minutes * 60;

    const attemptRes = await query(
      "select coalesce(max(attempt), 0) + 1 as a from submissions where meeting_id = $1 and user_id = $2",
      [meetingId, user.id]
    );
    const attempt = attemptRes.rows[0].a;

    const result = await scoreMinutes({
      meeting: {
        title: meeting.title,
        theme: meeting.theme,
        agenda: meeting.theme,
        participants: meeting.participants,
        utterances: meeting.utterances,
      },
      minutesText: extracted.slice(0, 30000),
    });

    const r = await query(
      `insert into submissions
        (meeting_id, user_id, attempt, pdf_filename, pdf_data, extracted_text,
         total_score, criteria, good_points, weak_points, improvements,
         model_answer, comparison, focus_points, duration_seconds, overtime)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       returning id`,
      [
        meetingId,
        user.id,
        attempt,
        file.name || "minutes.pdf",
        buf,
        extracted,
        result.total,
        JSON.stringify({ scores: result.criteria, comments: result.criteriaComments }),
        JSON.stringify(result.goodPoints),
        JSON.stringify(result.weakPoints),
        JSON.stringify(result.improvements),
        result.modelAnswer,
        result.comparison,
        JSON.stringify(result.focusPoints),
        duration,
        overtime,
      ]
    );

    return NextResponse.json({ id: r.rows[0].id });
  } catch (err) {
    return jsonError(err);
  }
}
