"use client";

import { useState } from "react";
import LockerScene from "./LockerScene";
import {
  CABINETS,
  CABINET_STATS,
  CURRENT_SEMESTER,
  FOOD_PRODUCT_COUNT,
  LOCKERS,
  SEMESTERS,
  STATUS_META,
  TOTAL_STATS,
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

function Stat({
  label,
  value,
  strong,
  unit = "次",
}: {
  label: string;
  value: number;
  strong?: boolean;
  unit?: string;
}) {
  return (
    <div>
      <div className="text-xs text-navy/55">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span
          className={`font-mono font-semibold tabular-nums text-navy ${strong ? "text-[28px] leading-9" : "text-2xl text-navy/75"}`}
        >
          {fmt(value)}
        </span>
        <span className="text-xs text-navy/50">{unit}</span>
      </div>
    </div>
  );
}

/** 智取櫃合計：兩座櫃子個別統計後加總 */
function TotalCard() {
  const rows = [
    { label: "本學期使用", total: TOTAL_STATS.semesterCount, pick: (k: CabinetKey) => CABINET_STATS[k].semesterCount },
    { label: "歷史累計", total: TOTAL_STATS.totalCount, pick: (k: CabinetKey) => CABINET_STATS[k].totalCount },
  ];
  return (
    <section className="shrink-0 rounded-2xl bg-navy p-4 text-white">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold">智取櫃</h2>
        <span className="text-xs text-white/55">校園智取櫃 ＋ 智取食光</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="text-xs text-white/60">{row.label}</div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="font-mono text-3xl font-semibold tabular-nums">{fmt(row.total)}</span>
              <span className="text-xs text-white/55">次</span>
            </div>
            <div className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
              <div className="bg-white/45" style={{ flexGrow: row.pick("campus") }} />
              <div style={{ flexGrow: row.pick("food"), background: CABINET_COLOR.food }} />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-white/60">
              <span>{fmt(row.pick("campus"))}</span>
              <span>{fmt(row.pick("food"))}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 單一櫃體：本學期＋歷史累計＋各學期長條 */
function CabinetCard({ cabinet }: { cabinet: CabinetKey }) {
  const stats = CABINET_STATS[cabinet];
  const color = CABINET_COLOR[cabinet];
  const peak = Math.max(...stats.history);
  return (
    <section className="shrink-0 overflow-hidden rounded-2xl border border-navy/10 bg-white/80">
      <div className="h-1" style={{ background: color }} />
      <div className="p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-bold text-navy">{CABINETS[cabinet].name}</h2>
          <span className="text-xs text-navy/45">{CABINETS[cabinet].note}</span>
        </div>
        <div className={`mt-3 grid ${cabinet === "food" ? "grid-cols-3 gap-2" : "grid-cols-2 gap-3"}`}>
          <Stat label="本學期使用" value={stats.semesterCount} strong />
          <Stat label="歷史累計" value={stats.totalCount} strong={cabinet === "food"} />
          {cabinet === "food" && <Stat label="商品數量" value={FOOD_PRODUCT_COUNT} unit="項" strong />}
        </div>
        <div className="mt-4 flex h-20 items-end gap-2">
          {SEMESTERS.map((sem, i) => {
            const current = i === SEMESTERS.length - 1;
            return (
              <div key={sem} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="font-mono text-[10px] tabular-nums text-navy/60">{fmt(stats.history[i])}</span>
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${(stats.history[i] / peak) * 62}%`,
                    background: color,
                    opacity: current ? 1 : 0.45,
                  }}
                />
                <span className={`font-mono text-[10px] ${current ? "font-semibold text-navy" : "text-navy/45"}`}>
                  {sem}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = LOCKERS.find((l) => l.id === selectedId) ?? null;
  const monthPeak = Math.max(...CABINET_KEYS.flatMap((k) => CABINET_STATS[k].monthly.map((m) => m.count)));

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
        <div className="flex items-start justify-between px-1">
          <div>
            <div className="text-sm font-semibold text-navy">{CURRENT_SEMESTER.label}</div>
            <div className="text-xs text-navy/50">{CURRENT_SEMESTER.range}</div>
          </div>
        </div>

        <TotalCard />

        {CABINET_KEYS.map((key) => (
          <CabinetCard key={key} cabinet={key} />
        ))}

        <Card
          title="本學期每月使用次數"
          aside={
            <ul className="flex gap-3 text-[11px] text-navy/60">
              {CABINET_KEYS.map((k) => (
                <li key={k} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm" style={{ background: CABINET_COLOR[k] }} />
                  {CABINETS[k].name}
                </li>
              ))}
            </ul>
          }
        >
          <div className="flex h-28 items-end gap-4">
            {CABINET_STATS.campus.monthly.map((m, i) => (
              <div key={m.month} className="flex h-full flex-1 flex-col justify-end gap-1">
                <div className="flex flex-1 items-end gap-1">
                  {CABINET_KEYS.map((k) => {
                    const count = CABINET_STATS[k].monthly[i].count;
                    return (
                      <div key={k} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                        <span className="font-mono text-[10px] tabular-nums text-navy/60">{fmt(count)}</span>
                        <div
                          className="w-full rounded-t"
                          style={{ height: `${(count / monthPeak) * 80}%`, background: CABINET_COLOR[k] }}
                        />
                      </div>
                    );
                  })}
                </div>
                <span className="text-center text-[11px] text-navy/50">{m.month}</span>
              </div>
            ))}
          </div>
        </Card>

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
