"use client";

import * as React from "react";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Keyboard,
  HardHat,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Polished trade-simulation placeholders. Each variant renders a convincing,
 * on-brand interactive mock keyed by `simType`. They are functional enough to
 * feel real (you can click and get feedback) while clearly flagged as a preview
 * of the full interactive simulation that is coming soon.
 */
export function TradeSimulation({
  simType,
  inspiration,
}: {
  simType: string | null;
  inspiration: string | null;
}) {
  const body = renderSim(simType);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card to-[#0f1512] shadow-lg">
      {/* Header bar */}
      <div className="relative flex items-center justify-between border-b border-border bg-raised/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Interactive Simulation
            </p>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Hands-on practice
            </p>
          </div>
        </div>
        <span className="rounded-full bg-primary/15 px-3 py-1 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
          Full interactive simulation coming soon
        </span>
      </div>

      {/* Sim body */}
      <div className="p-5">{body}</div>

      {/* Footer */}
      {inspiration && (
        <div className="border-t border-border px-5 py-2.5">
          <p className="text-[11px] text-muted-foreground">
            Inspired by{" "}
            <span className="font-medium text-muted-foreground/90">{inspiration}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function renderSim(simType: string | null) {
  switch (simType) {
    case "wire-color-identification":
      return <WireColorSim />;
    case "tape-measure-reading":
      return <TapeMeasureSim />;
    case "order-picking":
      return <OrderPickingSim />;
    case "pipe-fitting-match":
      return <PipeFittingSim />;
    case "ppe-selection":
      return <PpeSelectionSim />;
    default:
      return <GenericSim simType={simType} />;
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function Prompt({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-sm text-foreground">{children}</p>;
}

function Feedback({ correct, children }: { correct: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm",
        correct
          ? "bg-[#5FE08A]/12 text-[#5FE08A]"
          : "bg-[#FF6B6B]/12 text-[#FF6B6B]",
      )}
    >
      {correct ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}
      <span>{children}</span>
    </div>
  );
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <RotateCcw className="h-3.5 w-3.5" /> Try again
    </button>
  );
}

// ---------------------------------------------------------------------------
// 1. Electrical — wire color identification
// ---------------------------------------------------------------------------
const WIRES: { color: string; swatch: string; role: string; label: string }[] = [
  { color: "Black", swatch: "#1b1b1b", role: "hot", label: "Hot (Live)" },
  { color: "White", swatch: "#f4f1e8", role: "neutral", label: "Neutral" },
  { color: "Green", swatch: "#3fae57", role: "ground", label: "Ground" },
  { color: "Red", swatch: "#d33b3b", role: "hot", label: "Hot (Live)" },
];

function WireColorSim() {
  const [picked, setPicked] = React.useState<number | null>(null);
  // Task: identify the GROUND wire.
  const answer = WIRES.findIndex((w) => w.role === "ground");
  return (
    <div>
      <Prompt>
        A standard US receptacle has these conductors. <strong>Click the wire
        that carries the equipment ground.</strong>
      </Prompt>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {WIRES.map((w, i) => {
          const isPicked = picked === i;
          return (
            <button
              key={w.color}
              onClick={() => setPicked(i)}
              className={cn(
                "group flex flex-col items-center gap-2 rounded-xl border p-3 transition",
                isPicked
                  ? i === answer
                    ? "border-[#5FE08A] ring-2 ring-[#5FE08A]/40"
                    : "border-[#FF6B6B] ring-2 ring-[#FF6B6B]/40"
                  : "border-border hover:border-primary/50",
              )}
            >
              <span
                className="h-12 w-12 rounded-full ring-2 ring-black/20 shadow-inner"
                style={{ backgroundColor: w.swatch }}
              />
              <span className="text-xs font-medium text-foreground">{w.color}</span>
              {isPicked && (
                <span className="text-[10px] text-muted-foreground">{w.label}</span>
              )}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <Feedback correct={picked === answer}>
          {picked === answer
            ? "Correct — the green conductor is the equipment ground."
            : "Not quite — ground is the green conductor. Black and red are hot, white is neutral."}
        </Feedback>
      )}
      {picked !== null && <ResetButton onClick={() => setPicked(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Carpentry — read a tape measure
// ---------------------------------------------------------------------------
function TapeMeasureSim() {
  // Target mark at 2 + 5/8" (2.625). Options as fractions.
  const target = 2.625;
  const options = ['2 1/2"', '2 5/8"', '2 3/4"', '2 3/8"'];
  const correct = 1;
  const [picked, setPicked] = React.useState<number | null>(null);

  const inchPx = 110;
  const totalInches = 4;
  const width = inchPx * totalInches + 30;
  const markX = 15 + target * inchPx;

  const ticks: React.ReactNode[] = [];
  for (let i = 0; i <= totalInches * 16; i++) {
    const x = 15 + (i / 16) * inchPx;
    const isInch = i % 16 === 0;
    const isHalf = i % 8 === 0;
    const isQuarter = i % 4 === 0;
    const isEighth = i % 2 === 0;
    const h = isInch ? 34 : isHalf ? 26 : isQuarter ? 20 : isEighth ? 14 : 9;
    ticks.push(
      <line
        key={i}
        x1={x}
        y1={10}
        x2={x}
        y2={10 + h}
        stroke="#7a6f4a"
        strokeWidth={isInch ? 1.6 : 1}
      />,
    );
    if (isInch) {
      ticks.push(
        <text key={`t${i}`} x={x + 3} y={26} fontSize="11" fill="#3a3420" fontWeight="600">
          {i / 16}
        </text>,
      );
    }
  }

  return (
    <div>
      <Prompt>
        Read the tape. <strong>What measurement does the red arrow point to?</strong>
      </Prompt>
      <div className="overflow-x-auto rounded-xl bg-[#f3e9c6] p-3 ring-1 ring-[#d8c98e]">
        <svg width={width} height={72} role="img" aria-label="Tape measure">
          <rect x={0} y={6} width={width} height={44} rx={4} fill="#f6edcf" />
          {ticks}
          {/* Pointer */}
          <line x1={markX} y1={6} x2={markX} y2={60} stroke="#d33b3b" strokeWidth={2} />
          <polygon
            points={`${markX - 6},60 ${markX + 6},60 ${markX},50`}
            fill="#d33b3b"
          />
        </svg>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((o, i) => (
          <button
            key={o}
            onClick={() => setPicked(i)}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm font-medium transition",
              picked === i
                ? i === correct
                  ? "border-[#5FE08A] bg-[#5FE08A]/10 text-[#5FE08A]"
                  : "border-[#FF6B6B] bg-[#FF6B6B]/10 text-[#FF6B6B]"
                : "border-border text-foreground hover:border-primary/50",
            )}
          >
            {o}
          </button>
        ))}
      </div>
      {picked !== null && (
        <Feedback correct={picked === correct}>
          {picked === correct
            ? 'Correct — the arrow lands on the fifth eighth past the 2" mark: 2 5/8".'
            : 'Look again — the arrow sits between the 1/2" and 3/4" marks, on the 5/8" tick.'}
        </Feedback>
      )}
      {picked !== null && <ResetButton onClick={() => setPicked(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Warehouse — order picking
// ---------------------------------------------------------------------------
const PICK_LIST = [
  { sku: "BX-204", qty: 3, bin: "A3" },
  { sku: "PL-118", qty: 1, bin: "C1" },
  { sku: "TR-052", qty: 5, bin: "B4" },
];
const BINS = ["A3", "B2", "C1", "A1", "B4", "C3"];

function OrderPickingSim() {
  const [step, setStep] = React.useState(0);
  const [wrong, setWrong] = React.useState<string | null>(null);
  const done = step >= PICK_LIST.length;
  const current = PICK_LIST[step];

  function choose(bin: string) {
    if (done) return;
    if (bin === current.bin) {
      setWrong(null);
      setStep((s) => s + 1);
    } else {
      setWrong(bin);
    }
  }

  return (
    <div>
      <Prompt>
        Fill the order. <strong>Tap the bin that matches the highlighted pick
        line.</strong>
      </Prompt>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Pick list */}
        <div className="rounded-xl border border-border bg-card/60">
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pick List · Order #80213
          </div>
          <ul className="divide-y divide-border">
            {PICK_LIST.map((line, i) => {
              const isActive = i === step;
              const isDone = i < step;
              return (
                <li
                  key={line.sku}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 text-sm",
                    isActive && "bg-primary/10",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-[#5FE08A]" />
                    ) : (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-border text-[10px] text-muted-foreground">
                        {i + 1}
                      </span>
                    )}
                    <span className={cn("font-mono", isDone && "text-muted-foreground line-through")}>
                      {line.sku}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">Qty {line.qty} · Bin {line.bin}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Warehouse bin grid */}
        <div className="grid grid-cols-3 gap-2">
          {BINS.map((bin) => {
            const isWrong = wrong === bin;
            return (
              <button
                key={bin}
                onClick={() => choose(bin)}
                disabled={done}
                className={cn(
                  "flex h-16 flex-col items-center justify-center rounded-xl border text-sm font-semibold transition",
                  isWrong
                    ? "border-[#FF6B6B] bg-[#FF6B6B]/10 text-[#FF6B6B]"
                    : "border-border bg-raised/50 text-foreground hover:border-primary/50 hover:bg-primary/5",
                  done && "opacity-60",
                )}
              >
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Bin</span>
                {bin}
              </button>
            );
          })}
        </div>
      </div>
      {done ? (
        <Feedback correct>Order complete — all 3 lines picked accurately. Nice work.</Feedback>
      ) : wrong ? (
        <Feedback correct={false}>
          Bin {wrong} doesn&apos;t match. The active line needs bin {current.bin}.
        </Feedback>
      ) : null}
      {(done || wrong) && (
        <ResetButton
          onClick={() => {
            setStep(0);
            setWrong(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Plumbing — pipe fitting match
// ---------------------------------------------------------------------------
const FITTINGS = [
  { name: "90° Elbow", use: "Turn a corner", glyph: "L" },
  { name: "Tee", use: "Branch a line", glyph: "T" },
  { name: "Coupling", use: "Join two straight pipes", glyph: "=" },
];

function PipeFittingSim() {
  // Task: which fitting branches a line into two? -> Tee (index 1)
  const correct = 1;
  const [picked, setPicked] = React.useState<number | null>(null);
  return (
    <div>
      <Prompt>
        You need to add a branch off a straight run of pipe.{" "}
        <strong>Select the correct fitting.</strong>
      </Prompt>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {FITTINGS.map((f, i) => (
          <button
            key={f.name}
            onClick={() => setPicked(i)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 transition",
              picked === i
                ? i === correct
                  ? "border-[#5FE08A] ring-2 ring-[#5FE08A]/40"
                  : "border-[#FF6B6B] ring-2 ring-[#FF6B6B]/40"
                : "border-border hover:border-primary/50",
            )}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-raised text-2xl font-bold text-primary">
              {f.glyph}
            </span>
            <span className="text-sm font-medium text-foreground">{f.name}</span>
            <span className="text-[11px] text-muted-foreground">{f.use}</span>
          </button>
        ))}
      </div>
      {picked !== null && (
        <Feedback correct={picked === correct}>
          {picked === correct
            ? "Correct — a tee fitting branches one line into two."
            : "Not the right fit — a tee is what branches a run. An elbow turns a corner; a coupling joins straight pipe."}
        </Feedback>
      )}
      {picked !== null && <ResetButton onClick={() => setPicked(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Construction — PPE selection
// ---------------------------------------------------------------------------
const PPE = [
  { name: "Hard Hat", icon: HardHat, needed: true },
  { name: "Safety Glasses", icon: Sparkles, needed: true },
  { name: "Steel-Toe Boots", icon: CheckCircle2, needed: true },
  { name: "Headphones", icon: Keyboard, needed: false },
];

function PpeSelectionSim() {
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [checked, setChecked] = React.useState(false);
  function toggle(i: number) {
    setChecked(false);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }
  const allCorrect =
    PPE.every((p, i) => p.needed === selected.has(i));

  return (
    <div>
      <Prompt>
        You&apos;re entering an active framing site with overhead work.{" "}
        <strong>Select every item of required PPE.</strong>
      </Prompt>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PPE.map((p, i) => {
          const Icon = p.icon as LucideIcon;
          const on = selected.has(i);
          const show = checked && on && !p.needed;
          const miss = checked && !on && p.needed;
          return (
            <button
              key={p.name}
              onClick={() => toggle(i)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-3 transition",
                show
                  ? "border-[#FF6B6B] bg-[#FF6B6B]/10"
                  : miss
                    ? "border-[#F5B14C] bg-[#F5B14C]/10"
                    : on
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50",
              )}
            >
              <Icon className={cn("h-7 w-7", on ? "text-primary" : "text-muted-foreground")} />
              <span className="text-xs font-medium text-foreground">{p.name}</span>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setChecked(true)}
        className="mt-4 inline-flex h-9 items-center justify-center rounded-full bg-primary px-5 text-xs font-medium text-primary-foreground transition hover:bg-primary-hover"
      >
        Check my PPE
      </button>
      {checked && (
        <Feedback correct={allCorrect}>
          {allCorrect
            ? "Correct — hard hat, safety glasses, and steel-toe boots. Headphones are not PPE."
            : "Review the highlights — required PPE here is a hard hat, safety glasses, and steel-toe boots."}
        </Feedback>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic fallback (typing / keyboarding / self-assessment, etc.)
// ---------------------------------------------------------------------------
function GenericSim({ simType }: { simType: string | null }) {
  const isTyping = simType?.includes("typing") || simType?.includes("keyboard");
  const sample = "the quick brown fox jumps over the lazy dog";
  const [typed, setTyped] = React.useState("");
  const accuracy =
    typed.length === 0
      ? 100
      : Math.round(
          (typed.split("").filter((c, i) => c === sample[i]).length / typed.length) *
            100,
        );

  if (isTyping) {
    return (
      <div>
        <Prompt>
          Warm up your hands. <strong>Type the line below as accurately as you
          can.</strong>
        </Prompt>
        <div className="rounded-xl bg-raised/40 p-4 font-mono text-sm leading-relaxed">
          {sample.split("").map((c, i) => {
            const t = typed[i];
            return (
              <span
                key={i}
                className={cn(
                  t == null
                    ? "text-muted-foreground"
                    : t === c
                      ? "text-[#5FE08A]"
                      : "bg-[#FF6B6B]/20 text-[#FF6B6B]",
                )}
              >
                {c}
              </span>
            );
          })}
        </div>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value.slice(0, sample.length))}
          placeholder="Start typing…"
          className="mt-3 w-full rounded-xl border border-border bg-card px-4 py-2.5 font-mono text-sm text-foreground outline-none focus:border-primary"
        />
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            Progress:{" "}
            <span className="font-semibold text-foreground">
              {Math.round((typed.length / sample.length) * 100)}%
            </span>
          </span>
          <span>
            Accuracy:{" "}
            <span
              className={cn(
                "font-semibold",
                accuracy >= 95 ? "text-[#5FE08A]" : "text-foreground",
              )}
            >
              {accuracy}%
            </span>
          </span>
        </div>
      </div>
    );
  }

  // Generic interactive (e.g. EI stress self-assessment) — Likert style.
  return (
    <GenericLikert />
  );
}

function GenericLikert() {
  const items = [
    "I notice when I'm getting stressed before it builds up.",
    "I can name what I'm feeling in the moment.",
    "I take a pause before reacting under pressure.",
  ];
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const scale = ["Rarely", "Sometimes", "Often", "Always"];
  return (
    <div>
      <Prompt>
        A quick self-check. <strong>There are no right answers — choose what fits
        you today.</strong>
      </Prompt>
      <div className="space-y-4">
        {items.map((it, i) => (
          <div key={i}>
            <p className="mb-2 text-sm text-foreground">{it}</p>
            <div className="grid grid-cols-4 gap-2">
              {scale.map((s, v) => (
                <button
                  key={s}
                  onClick={() => setAnswers((a) => ({ ...a, [i]: v }))}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-xs font-medium transition",
                    answers[i] === v
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {Object.keys(answers).length === items.length && (
        <div className="mt-4 rounded-xl bg-primary/10 px-4 py-3 text-sm text-foreground">
          Thanks for reflecting. Noticing your patterns is the first step toward
          managing them — that&apos;s exactly the skill this lesson builds.
        </div>
      )}
    </div>
  );
}
