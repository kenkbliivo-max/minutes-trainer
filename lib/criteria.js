export const CRITERIA_LABELS = {
  coverage: "網羅性",
  structure: "構造化",
  objectivity: "客観性",
  clarity: "わかりやすさ",
  thirdparty: "第三者理解",
  accumulation: "思考の積み上げ",
};

export function fmtDuration(sec) {
  if (sec == null) return "-";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}分${String(s).padStart(2, "0")}秒`;
}
