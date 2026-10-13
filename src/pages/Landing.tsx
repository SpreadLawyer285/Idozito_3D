import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Cube3D from "../assets/components/Cube";

const TOTAL = 300;

type BlockProps = { left?: boolean; children: ReactNode; className?: string };
const Block = ({ left, children, className = "" }: BlockProps) => (
  <div
    className={`relative z-20 w-full md:w-[42%] ${
      left ? "" : "md:ml-auto"
    } ${className}`}
  >
    {children}
  </div>
);
const Row = ({
  id,
  children,
  dark,
}: {
  id: string;
  children: ReactNode;
  dark?: boolean;
}) => (
  <section
    id={id}
    className={`flex min-h-screen items-end px-6 pb-16 md:items-center md:px-20 md:pb-0 ${
      dark ? "bg-[#1f1f1f] text-stone-100" : ""
    }`}
  >
    {children}
  </section>
);
const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
    {children}
  </h2>
);
const P = ({ children }: { children: ReactNode }) => (
  <p className="mt-5 max-w-md text-lg leading-relaxed opacity-70">{children}</p>
);

const FACES: [string, string][] = [
  [
    "10 perc",
    "Egy forduló, és fut az idő. A kocka tudja, melyik oldalán állsz.",
  ],
  [
    "50 perc",
    "Mély munkához. Nincs menü, nincs gomb: maga a kocka a beállítás.",
  ],
  [
    "5 perc",
    "Rövid szünet vagy gyors feladat. A felső lap mindig a kiválasztott idő.",
  ],
];
const USES: [string, string][] = [
  ["Pomodoro", "25 perc fókusz, 5 perc szünet."],
  ["Főzés", "Tészta, tojás, tea: tedd le, és felejtsd el."],
  ["Meeting", "Mindenki látja, mennyi van hátra."],
  ["Tanulás", "Gyerekeknek is érthető: fordítsd meg, és indul."],
];
const SPECS: [string, string][] = [
  ["Méret", "60 × 60 × 60 mm"],
  ["Idők", "5 · 10 · 50 perc és még három oldal"],
  ["Kijelző", "Kör alakú, visszaszámláló gyűrűvel"],
  ["Csatlakozás", "Két port a hátoldalon"],
  ["Anyag", "Matt műanyag, lekerekített élek"],
];

export default function Landing() {
  const [remaining, setRemaining] = useState(TOTAL);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(
      () => setRemaining((r) => (r > 0 ? r - 1 : 0)),
      1000
    );
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (remaining === 0) setRunning(false);
  }, [remaining]);

  const toggle = () => {
    if (remaining === 0) setRemaining(TOTAL);
    setRunning((r) => !r);
  };

  return (
    <main className="bg-gradient-to-b from-[#f2f1ee] to-[#d8d7d3] font-sans text-[#2b2b2b]">
      <Cube3D remaining={remaining} total={TOTAL} />

      <header className="fixed left-0 top-0 z-30 flex w-full justify-between px-6 py-5 text-sm font-medium md:px-20">
        <span>Flip Timer</span>
        <span className="flex gap-6">
          <Link to="/timer" className="underline-offset-4 hover:underline">
            Kipróbálom
          </Link>
          <a href="#specs" className="underline-offset-4 hover:underline">
            Rendelés
          </a>
        </span>
      </header>

      <Row id="hero">
        <Block left>
          <h1 className="text-5xl font-semibold leading-[1.02] tracking-tight md:text-8xl">
            Az idő egy fordításnyira van.
          </h1>
          <P>
            Időzítő kocka, amit nem kell beállítani. Told az egeret, és pörgesd
            a kockát.
          </P>
        </Block>
      </Row>

      <section id="flip">
        {FACES.map(([t, d]) => (
          <div
            key={t}
            className="flex h-screen items-end px-6 pb-16 md:items-center md:px-20 md:pb-0"
          >
            <Block className="md:ml-auto">
              <H2>{t}</H2>
              <P>{d}</P>
            </Block>
          </div>
        ))}
      </section>

      <Row id="display">
        <Block left>
          <H2>Látod, mennyi van még hátra.</H2>
          <P>A narancs gyűrű másodpercenként fogy. Próbáld ki a kockán.</P>
          <button
            onClick={toggle}
            className="mt-8 rounded-full bg-[#2b2b2b] px-8 py-3 font-medium text-white transition hover:bg-[#f08a4b] hover:text-[#2b2b2b]"
          >
            {running ? "Szünet" : remaining === 0 ? "Újra" : "Indítás"}
          </button>
        </Block>
      </Row>

      <Row id="back" dark>
        <Block className="md:ml-auto">
          <H2>A hátoldalon minden, ami kell.</H2>
          <P>
            Egy kapcsoló a be- és kikapcsoláshoz, mellette két csatlakozó. Más
            nincs, szándékosan.
          </P>
        </Block>
      </Row>

      <section
        id="use"
        className="flex min-h-screen flex-col justify-between px-6 py-24 md:px-20"
      >
        <div className="relative z-20 md:w-1/2">
          <H2>Minden helyzetre van egy oldala.</H2>
        </div>
        <ul className="relative z-20 grid gap-x-10 gap-y-6 md:grid-cols-4">
          {USES.map(([t, d]) => (
            <li key={t} className="border-t border-[#2b2b2b]/20 pt-4">
              <h3 className="text-xl font-semibold">{t}</h3>
              <p className="mt-1 opacity-70">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <Row id="specs">
        <Block className="md:ml-auto">
          <H2>Fordítsd meg a napodat.</H2>
          <dl className="mt-8 divide-y divide-[#2b2b2b]/15 text-lg">
            {SPECS.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 py-3">
                <dt className="opacity-60">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <button className="mt-8 rounded-full bg-[#f08a4b] px-8 py-3 font-medium text-[#2b2b2b] transition hover:bg-[#2b2b2b] hover:text-white">
            Értesítést kérek
          </button>
        </Block>
      </Row>
    </main>
  );
}
