import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  try {
    const user = await requireUser();
    const r = await query(
      `select pdf_data, pdf_filename from submissions
       where id = $1 and (user_id = $2 or $3)`,
      [params.id, user.id, user.is_admin]
    );
    const s = r.rows[0];
    if (!s || !s.pdf_data)
      return NextResponse.json({ error: "not found" }, { status: 404 });
    return new NextResponse(s.pdf_data, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${encodeURIComponent(
          s.pdf_filename || "minutes.pdf"
        )}"`,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
