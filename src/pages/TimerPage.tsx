import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CubeViewer, {
  FACE_MINUTES,
  type FaceKey,
} from "../assets/components/CubeViewer";

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
    2,
    "0"
  )}`;

function beep() {
  try {
    const a = new AudioContext();
    [0, 0.28, 0.56].forEach((t) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.15, a.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + t + 0.22);
      o.connect(g).connect(a.destination);
      o.start(a.currentTime + t);
      o.stop(a.currentTime + t + 0.22);
    });
  } catch {
    /* a hang nem kritikus */
  }
}

export default function TimerPage() {
  const [minutes, setMinutes] = useState<number | null>(5);
  const [remaining, setRemaining] = useState(300);
  const [running, setRunning] = useState(false);
  const minutesRef = useRef<number | null>(5);
  const [goTo, setGoTo] = useState<{ key: FaceKey; n: number }>();

  // a kocka megállt egy lapján: ha új lap került felülre, annak idejével indul a visszaszámlálás.
  // Ugyanaz a lap marad felül (pl. csak megmozgattad), akkor az idő fut tovább.
  const onFace = useCallback((m: number | null) => {
    if (m === minutesRef.current) return;
    minutesRef.current = m;
    setMinutes(m);
    setRemaining(m ? m * 60 : 0);
    setRunning(m !== null);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const done = minutes !== null && remaining === 0;
  useEffect(() => {
    if (running && remaining === 0) {
      setRunning(false);
      beep();
    }
  }, [running, remaining]);

  const total = (minutes ?? 5) * 60;
  const pct = minutes ? ((total - remaining) / total) * 100 : 0;
  const status =
    minutes === null
      ? "Ezen az oldalon nincs idő. Fordítsd tovább."
      : done
      ? "Letelt az idő."
      : running
      ? `${minutes} perc fut`
      : `${minutes} perc, indításra vár`;

  return (
    <div className="relative h-screen overflow-hidden bg-[#161514] font-sans text-stone-100">
      {/* izzás a kocka mögött */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          running
            ? "opacity-100"
            : done
            ? "animate-pulse opacity-100"
            : "opacity-25"
        }`}
        style={{
          background:
            "radial-gradient(circle at 50% 52%, rgba(240,138,75,.34), transparent 55%)",
        }}
      />
      {/* a számláló: a kocka fölött, fixen, mindig olvasható */}
      <div className="pointer-events-none absolute inset-x-0 top-[9vh] z-20 flex select-none justify-center">
        <div
          className={`text-[min(17vw,20vh)] font-semibold leading-none tracking-tighter tabular-nums transition-colors duration-500 ${
            done
              ? "text-[#f08a4b]"
              : running
              ? "text-stone-50 [text-shadow:0_0_60px_rgba(240,138,75,.5)]"
              : "text-white/35"
          }`}
        >
          {minutes === null ? "--:--" : fmt(remaining)}
        </div>
      </div>

      <CubeViewer
        remaining={remaining}
        total={total}
        onFace={onFace}
        goTo={goTo}
      />

      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-6 md:p-10">
        <header className="flex items-start justify-between text-sm font-medium">
          <Link
            to="/"
            className="pointer-events-auto opacity-70 transition hover:opacity-100"
          >
            ← Flip Timer
          </Link>
          <p className="max-w-[16rem] text-right opacity-50">
            Húzd meg a kockát. Amelyik lap felül marad, annyi percet számol.
          </p>
        </header>

        <footer className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 text-center">
          <p className="text-lg opacity-80">{status}</p>
          <div className="h-px w-full bg-white/10">
            <div
              className="h-px bg-[#f08a4b] transition-[width] duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="pointer-events-auto flex flex-wrap justify-center gap-2">
            {(Object.entries(FACE_MINUTES) as [FaceKey, number][]).map(
              ([key, m]) => (
                <button
                  key={key}
                  onClick={() => setGoTo({ key, n: Date.now() })}
                  className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
                    minutes === m
                      ? "border-[#f08a4b] bg-[#f08a4b] text-[#161514]"
                      : "border-white/20 hover:border-white/60"
                  }`}
                >
                  {m} perc
                </button>
              )
            )}
          </div>
          <div className="pointer-events-auto flex gap-3">
            <button
              disabled={minutes === null}
              onClick={() =>
                done
                  ? (setRemaining(total), setRunning(true))
                  : setRunning((r) => !r)
              }
              className="rounded-full bg-stone-100 px-8 py-3 font-medium text-[#161514] transition hover:bg-[#f08a4b] disabled:opacity-30"
            >
              {running ? "Szünet" : done ? "Újra" : "Indítás"}
            </button>
            <button
              disabled={minutes === null}
              onClick={() => (setRemaining(total), setRunning(false))}
              className="rounded-full border border-white/20 px-8 py-3 font-medium transition hover:border-white/60 disabled:opacity-30"
            >
              Nullázás
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
