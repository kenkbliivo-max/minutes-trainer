import { query } from "./db";

const LIMITS = {
  generates: () => parseInt(process.env.DAILY_GENERATE_LIMIT || "5", 10),
  scores: () => parseInt(process.env.DAILY_SCORE_LIMIT || "10", 10),
};

// kind: "generates" | "scores"
export async function checkAndConsume(userId, kind) {
  const limit = LIMITS[kind]();
  const r = await query(
    `insert into usage_counters (user_id, day, ${kind})
     values ($1, current_date, 1)
     on conflict (user_id, day)
     do update set ${kind} = usage_counters.${kind} + 1
     where usage_counters.${kind} < $2
     returning ${kind}`,
    [userId, limit]
  );
  if (r.rows.length === 0) {
    const err = new Error(
      `本日のAI利用回数の上限(${limit}回)に達しました。明日また利用してください。`
    );
    err.status = 429;
    throw err;
  }
  return limit - r.rows[0][kind];
}
