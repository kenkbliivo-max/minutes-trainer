import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { query } from "./db";

const COOKIE_NAME = "mt_session";

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");
}

export async function createSession(userId) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret());
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export function clearSession() {
  cookies().delete(COOKIE_NAME);
}

export async function getUser() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const r = await query(
      "select id, email, nickname, is_admin from users where id = $1",
      [payload.uid]
    );
    return r.rows[0] || null;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getUser();
  if (!user) {
    const err = new Error("unauthorized");
    err.status = 401;
    throw err;
  }
  return user;
}
