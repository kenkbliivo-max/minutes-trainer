import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getUser();
    return NextResponse.json({ user });
  } catch (err) {
    return jsonError(err);
  }
}
