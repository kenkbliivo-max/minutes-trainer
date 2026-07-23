import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const r = await query("select * from users where email = $1", [
      (email || "").toLowerCase().trim(),
    ]);
    const user = r.rows[0];
    if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
      return NextResponse.json(
        { error: "メールアドレスまたはパスワードが違います" },
        { status: 401 }
      );
    }
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
