import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { email, nickname, password } = await req.json();
    if (!email || !nickname || !password || password.length < 6) {
      return NextResponse.json(
        { error: "メール・ニックネーム・パスワード(6文字以上)を入力してください" },
        { status: 400 }
      );
    }
    const hash = await bcrypt.hash(password, 10);
    const countRes = await query("select count(*)::int as c from users");
    const isFirst = countRes.rows[0].c === 0;
    const isAdmin =
      isFirst ||
      (process.env.ADMIN_EMAIL &&
        email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase());
    try {
      const r = await query(
        `insert into users (email, nickname, password_hash, is_admin)
         values ($1, $2, $3, $4) returning id`,
        [email.toLowerCase().trim(), nickname.trim(), hash, !!isAdmin]
      );
      await createSession(r.rows[0].id);
      return NextResponse.json({ ok: true });
    } catch (e) {
      if (e.code === "23505") {
        return NextResponse.json(
          { error: "このメールアドレスは既に登録されています" },
          { status: 400 }
        );
      }
      throw e;
    }
  } catch (err) {
    return jsonError(err);
  }
}
