"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fmtDuration } from "@/lib/criteria";

export default function PlayPage() {
  const { id } = useParams();
  const router = useRouter();

  const [meeting, setMeeting] = useState(null);
  const [phase, setPhase] = useState("loading"); // loading | ready | playing | paused | finished | scoring
  const [shown, setShown] = useState(0); // 表示済み発言数
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [timerStart, setTimerStart] = useState(null); // ms epoch (server基準)
  const [elapsed, setElapsed] = useState(0);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const idxRef = useRef(0);
  const phaseRef = useRef("loading");
  const speedRef = useRef(1);
  const voicesRef = useRef([]);
  const timeoutRef = useRef(null);
  const logRef = useRef(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // 音声一覧のロード(自然な音声を優先: Edgeの"Natural"音声 > Google音声 > 標準)
  useEffect(() => {
    function load() {
      const all = window.speechSynthesis?.getVoices() || [];
      const ja = all.filter((v) => v.lang && v.lang.startsWith("ja"));
      const score = (v) =>
        /natural|neural|online/i.test(v.name) ? 2 : /google/i.test(v.name) ? 1 : 0;
      const best = Math.max(0, ...ja.map(score));
      const top = ja.filter((v) => score(v) === best);
      voicesRef.current = top.length ? top : all;
    }
    load();
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
  }, []);

  useEffect(() => {
    fetch(`/api/meetings/${id}`).then(async (r) => {
      if (r.status === 401) return router.replace("/login");
      const d = await r.json();
      if (!r.ok) return setError(d.error || "読み込みに失敗しました");
      setMeeting(d.meeting);
      if (d.meeting.timerStartedAt) {
        setTimerStart(new Date(d.meeting.timerStartedAt).getTime());
        setShown(d.meeting.utterances.length);
        setPhase("finished");
      } else {
        setPhase("ready");
      }
    });
    return () => {
      window.speechSynthesis?.cancel();
      clearTimeout(timeoutRef.current);
    };
  }, [id, router]);

  // タイマー
  useEffect(() => {
    if (!timerStart) return;
    const t = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - timerStart) / 1000)));
    }, 500);
    return () => clearInterval(t);
  }, [timerStart]);

  // 自動スクロール
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [shown]);

  const speakerIndex = useCallback(
    (name) => {
      const names = (meeting?.participants || []).map((p) => p.name);
      const i = names.indexOf(name);
      return i >= 0 ? i : 0;
    },
    [meeting]
  );

  const finishPlayback = useCallback(async () => {
    setPhase("finished");
    const r = await fetch(`/api/meetings/${id}/finish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const d = await r.json();
    if (d.timerStartedAt) setTimerStart(new Date(d.timerStartedAt).getTime());
  }, [id]);

  const playFrom = useCallback(
    (i) => {
      const utterances = meeting.utterances;
      if (i >= utterances.length) {
        finishPlayback();
        return;
      }
      idxRef.current = i;
      setShown(i + 1);
      const u = utterances[i];

      const next = () => {
        if (phaseRef.current !== "playing") return;
        playFrom(i + 1);
      };

      if (ttsEnabled && window.speechSynthesis) {
        const ut = new SpeechSynthesisUtterance(u.text);
        const vs = voicesRef.current;
        const si = speakerIndex(u.speaker);
        if (vs.length) ut.voice = vs[si % vs.length];
        ut.lang = "ja-JP";
        ut.pitch = 1 + ((si % 4) - 1.5) * 0.12;
        ut.rate = 1.05 * speedRef.current;
        ut.onend = next;
        ut.onerror = next;
        window.speechSynthesis.speak(ut);
      } else {
        const ms =
          Math.max(1800, Math.min(9000, u.text.length * 110)) / speedRef.current;
        timeoutRef.current = setTimeout(next, ms);
      }
    },
    [meeting, ttsEnabled, speakerIndex, finishPlayback]
  );

  function start() {
    setPhase("playing");
    phaseRef.current = "playing";
    playFrom(0);
  }

  function pause() {
    setPhase("paused");
    phaseRef.current = "paused";
    window.speechSynthesis?.cancel();
    clearTimeout(timeoutRef.current);
  }

  function resume() {
    setPhase("playing");
    phaseRef.current = "playing";
    playFrom(idxRef.current); // 現在の発言の頭から再開
  }

  async function submit(e) {
    e.preventDefault();
    if (!file) return setError("PDFファイルを選択してください");
    setError("");
    setPhase("scoring");
    const fd = new FormData();
    fd.append("meetingId", id);
    fd.append("file", file);
    const res = await fetch("/api/submissions", { method: "POST", body: fd });
    const d = await res.json();
    if (!res.ok) {
      setPhase("finished");
      return setError(d.error || "提出に失敗しました");
    }
    router.push(`/result/${d.id}`);
  }

  if (error && !meeting) return <div className="error">{error}</div>;
  if (!meeting) return <p style={{ color: "var(--muted)" }}>読み込み中...</p>;

  const limitSec = meeting.timeLimitMinutes ? meeting.timeLimitMinutes * 60 : null;
  const over = limitSec != null && elapsed > limitSec;
  const hideLog = meeting.noRewind && phase === "finished";

  return (
    <div>
      <h1>{meeting.title}</h1>
      <p style={{ color: "var(--muted)", fontSize: 14 }}>
        テーマ: {meeting.theme} / 難易度: {"★".repeat(meeting.difficulty)} /
        参加者: {(meeting.participants || []).map((p) => `${p.name}(${p.role})`).join("、")}
        {meeting.noRewind && <span className="badge warn" style={{ marginLeft: 8 }}>巻き戻し不可</span>}
      </p>

      {(phase === "ready" || phase === "playing" || phase === "paused") && (
        <div className="card">
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {phase === "ready" && (
              <>
                <button className="btn" onClick={start}>▶ 会議を再生する</button>
                <label style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                  <input
                    type="checkbox"
                    style={{ width: "auto" }}
                    checked={ttsEnabled}
                    onChange={(e) => setTtsEnabled(e.target.checked)}
                  />
                  音声読み上げ(TTS)を使う
                </label>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  💡 Microsoft Edgeで開くと最も自然な音声になります
                </span>
              </>
            )}
            {phase === "playing" && (
              <button className="btn secondary" onClick={pause}>⏸ 一時停止</button>
            )}
            {phase === "paused" && (
              <button className="btn" onClick={resume}>▶ 再開</button>
            )}
            {(phase === "playing" || phase === "paused") && (
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                {shown} / {meeting.utterances.length} 発言
              </span>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
              速度
              <select
                value={speed}
                onChange={(e) => setSpeed(+e.target.value)}
                style={{ width: "auto", padding: "4px 8px" }}
              >
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </label>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 0 }}>
            再生終了と同時に提出タイマーが始まります。メモは自由に取ってOKです。
          </p>
        </div>
      )}

      {!hideLog && shown > 0 && (
        <div className="card">
          <h2>会議ログ{meeting.noRewind && "(巻き戻し不可: 直近の発言のみ表示)"}</h2>
          <div ref={logRef} style={{ maxHeight: 420, overflowY: "auto" }}>
            {(meeting.noRewind
              ? meeting.utterances.slice(Math.max(0, shown - 3), shown)
              : meeting.utterances.slice(0, shown)
            ).map((u, i) => (
              <div className="utterance" key={i}>
                <div className="speaker">{u.speaker}</div>
                <p className="text">{u.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hideLog && (
        <div className="notice">
          巻き戻し不可モードのため、会議ログは表示されません。記憶とメモを頼りに議事ドキュメントを作成してください。
        </div>
      )}

      {(phase === "finished" || phase === "scoring") && (
        <div className="card">
          <h2>議事ドキュメントを提出</h2>
          <div style={{ display: "flex", gap: 24, alignItems: "baseline", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>再生終了からの経過時間</div>
              <div className={`timer ${over ? "over" : ""}`}>{fmtDuration(elapsed)}</div>
            </div>
            {limitSec != null && (
              <div style={{ fontSize: 14, color: over ? "var(--danger)" : "var(--muted)" }}>
                制限時間: {meeting.timeLimitMinutes}分 {over && "(超過中!)"}
              </div>
            )}
          </div>
          <p style={{ fontSize: 14, color: "var(--muted)" }}>
            Word等で議事ドキュメントを作成し、<strong>PDFに書き出して</strong>アップロードしてください(4MBまで)。
          </p>
          <form onSubmit={submit}>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {error && <div className="error">{error}</div>}
            <div style={{ marginTop: 16 }}>
              <button className="btn" disabled={phase === "scoring"}>
                {phase === "scoring" ? "採点中...(1分ほどかかります)" : "提出して採点を受ける"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
