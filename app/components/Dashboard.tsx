"use client";

import { useState } from "react";
import LockerScene from "./LockerScene";
import {
  CABINETS,
  CABINET_STATS,
  FOOD_PRODUCT_COUNT,
  FOOD_PRODUCT_SINCE,
  LOCKERS,
  SEMESTERS,
  STATUS_META,
  TOTAL_STATS,
  WEEKS,
  type CabinetKey,
  type LockerStatus,
} from "../lib/lockers";

// 顯示順序：智取食光在前
const CABINET_KEYS: CabinetKey[] = ["food", "campus"];
const CABINET_COLOR: Record<CabinetKey, string> = { campus: "#754930", food: "#B9DBB0" };
const fmt = (n: number) => n.toLocaleString("en-US");

function Card({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="shrink-0 rounded-2xl border border-navy/10 bg-white/80 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold tracking-wider text-navy/60">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Legend() {
  return (
    <ul className="flex gap-3 text-[11px] text-navy/60">
      {CABINET_KEYS.map((k) => (
        <li key={k} className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm" style={{ background: CABINET_COLOR[k] }} />
          {CABINETS[k].name}
        </li>
      ))}
    </ul>
  );
}

/** 長條圖：各學期使用次數（兩座櫃子堆疊） */
function SemesterBars() {
  const totals = SEMESTERS.map((_, i) => CABINET_STATS.campus.history[i] + CABINET_STATS.food.history[i]);
  const peak = Math.max(...totals);
  return (
    <div className="flex h-32 items-end gap-2">
      {SEMESTERS.map((sem, i) => {
        const current = i === SEMESTERS.length - 1;
        return (
          <div key={sem} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="font-mono text-[10px] tabular-nums text-navy/60">{fmt(totals[i])}</span>
            <div
              className="flex w-full flex-col gap-px overflow-hidden rounded-t"
              style={{ height: `${(totals[i] / peak) * 72}%`, opacity: current ? 1 : 0.55 }}
            >
              {CABINET_KEYS.map((k) => (
                <div
                  key={k}
                  title={`${CABINETS[k].name} ${fmt(CABINET_STATS[k].history[i])} 次`}
                  style={{ flexGrow: CABINET_STATS[k].history[i], background: CABINET_COLOR[k] }}
                />
              ))}
            </div>
            <span className={`font-mono text-[10px] ${current ? "font-semibold text-navy" : "text-navy/45"}`}>
              {sem}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** 折線圖：本學期每週使用次數 */
function WeeklyLines() {
  const W = 340;
  const H = 140;
  const pad = { l: 28, r: 8, t: 8, b: 20 };
  const peak = Math.max(...CABINET_KEYS.flatMap((k) => CABINET_STATS[k].weekly));
  const top = Math.ceil(peak / 50) * 50;
  const x = (i: number) => pad.l + (i / (WEEKS.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / top) * (H - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="本學期每週使用次數折線圖">
      {[0, top / 2, top].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#1b2a4a" strokeOpacity={v === 0 ? 0.25 : 0.08} />
          <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#1b2a4a" fillOpacity="0.5">
            {v}
          </text>
        </g>
      ))}
      {WEEKS.map((w, i) => (
        <text key={w} x={x(i)} y={H - 5} textAnchor="middle" fontSize="9" fill="#1b2a4a" fillOpacity="0.5">
          {w}
        </text>
      ))}
      {CABINET_KEYS.map((k) => {
        const data = CABINET_STATS[k].weekly;
        const last = data.length - 1;
        return (
          <g key={k}>
            {/* 最後一週尚未結束，用虛線表示 */}
            <polyline
              points={data
                .slice(0, last)
                .map((v, i) => `${x(i)},${y(v)}`)
                .join(" ")}
              fill="none"
              stroke={CABINET_COLOR[k]}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <line
              x1={x(last - 1)}
              y1={y(data[last - 1])}
              x2={x(last)}
              y2={y(data[last])}
              stroke={CABINET_COLOR[k]}
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
            {data.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#fff" stroke={CABINET_COLOR[k]} strokeWidth="2">
                <title>{`第 ${WEEKS[i]} 週 ${CABINETS[k].name} ${v} 次`}</title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/** 圓餅圖：歷史累計中兩座櫃子的佔比 */
function ShareDonut() {
  const r = 38;
  const c = 2 * Math.PI * r;
  const total = TOTAL_STATS.totalCount;
  const segments = CABINET_KEYS.map((k) => ({ k, value: CABINET_STATS[k].totalCount }));
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90" role="img" aria-label="歷史累計佔比圓餅圖">
        {segments.map((seg, i) => {
          const len = (seg.value / total) * c;
          const offset = segments.slice(0, i).reduce((a, s) => a + (s.value / total) * c, 0);
          return (
            <circle
              key={seg.k}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={CABINET_COLOR[seg.k]}
              strokeWidth="18"
              strokeDasharray={`${Math.max(len - 1.5, 0)} ${c}`}
              strokeDashoffset={-offset}
            />
          );
        })}
      </svg>
      <ul className="flex-1 space-y-3">
        {segments.map((seg) => (
          <li key={seg.k}>
            <div className="flex items-center gap-1.5 text-xs text-navy/60">
              <span className="h-2 w-2 rounded-sm" style={{ background: CABINET_COLOR[seg.k] }} />
              {CABINETS[seg.k].name}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xl font-semibold tabular-nums text-navy">
                {Math.round((seg.value / total) * 100)}%
              </span>
              <span className="font-mono text-xs tabular-nums text-navy/50">{fmt(seg.value)} 次</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Dashboard() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = LOCKERS.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      {/* 左：3D 櫃體 */}
      <div className="relative min-h-[45dvh] flex-1 overflow-hidden">
        <LockerScene lockers={LOCKERS} selectedId={selectedId} onSelect={setSelectedId} />

        <header className="pointer-events-none absolute left-6 top-5">
          <div className="text-xs font-medium tracking-[0.2em] text-amber-600">藝402 ・ 資訊管理系</div>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-navy">
            商業智慧研究中心
            <span className="block text-lg font-semibold text-navy/75">智取櫃使用統計</span>
          </h1>
          <div className="mt-1 text-sm text-navy/55">智慧數位轉型服務基地</div>
        </header>

        <div className="pointer-events-none absolute bottom-5 left-6 right-6 flex flex-wrap items-center justify-between gap-3">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 rounded-full bg-white/75 px-4 py-2 text-xs text-navy/75 backdrop-blur">
            {(Object.keys(STATUS_META) as LockerStatus[]).map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <span className="h-1.5 w-4 rounded-full" style={{ background: STATUS_META[s].color }} />
                {STATUS_META[s].label}
              </li>
            ))}
          </ul>
          <div className="text-xs text-navy/45">拖曳旋轉 ・ 滾輪縮放 ・ 點擊格子查看</div>
        </div>
      </div>

      {/* 右：歷史數據 */}
      <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto border-navy/10 bg-white/40 p-4 lg:w-[400px] lg:border-l">
        <div className="px-1 text-sm font-semibold text-navy">統計數據</div>

        <Card title="智取櫃使用率" aside={<Legend />}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "本學期使用", value: TOTAL_STATS.semesterCount },
              { label: "歷史累計", value: TOTAL_STATS.totalCount },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-xs text-navy/55">{s.label}</div>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="font-mono text-4xl font-semibold tabular-nums text-navy">{fmt(s.value)}</span>
                  <span className="text-xs text-navy/50">次</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-navy/50">各學期使用次數</div>
          <SemesterBars />
        </Card>

        <Card title="本學期每週使用次數" aside={<span className="text-[11px] text-navy/45">週次</span>}>
          <WeeklyLines />
        </Card>

        <Card title="歷史累計佔比">
          <ShareDonut />
        </Card>

        <section className="shrink-0 overflow-hidden rounded-2xl border border-navy/10 bg-white/80">
          <div className="h-1" style={{ background: CABINET_COLOR.food }} />
          <div className="flex items-end justify-between gap-3 p-4">
            <div>
              <h2 className="text-[13px] font-semibold tracking-wider text-navy/60">智取食光商品累積</h2>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-4xl font-semibold tabular-nums text-navy">
                  {fmt(FOOD_PRODUCT_COUNT)}
                </span>
                <span className="text-sm text-navy/55">件</span>
              </div>
            </div>
            <div className="pb-1 text-right text-xs text-navy/50">{FOOD_PRODUCT_SINCE}起累積</div>
          </div>
        </section>

        <Card title="選取的格子">
          {selected ? (
            <div className="flex gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl font-mono text-3xl font-bold"
                style={{
                  background: CABINET_COLOR[selected.cabinet],
                  color: selected.cabinet === "food" ? "#1b2a4a" : "#fff",
                }}
              >
                {selected.letter}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-navy">{CABINETS[selected.cabinet].name}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                    style={{ background: STATUS_META[selected.status].color }}
                  >
                    {STATUS_META[selected.status].label}
                  </span>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-navy/50">本學期使用</dt>
                    <dd className="font-mono text-base font-semibold tabular-nums text-navy">
                      {fmt(selected.semesterCount)} 次
                    </dd>
                  </div>
                  <div>
                    <dt className="text-navy/50">歷史累計</dt>
                    <dd className="font-mono text-base font-semibold tabular-nums text-navy/75">
                      {fmt(selected.totalCount)} 次
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : (
            <p className="py-3 text-center text-sm text-navy/45">點擊左側任一格櫃門，查看該格的使用次數</p>
          )}
        </Card>
      </aside>
    </div>
  );
}
