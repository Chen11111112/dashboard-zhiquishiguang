// 示範數據 — 之後可換成真實 API。
// 櫃體配置依現場照片：每座 5 欄 × 4 列，字母跳過 E、F。

export type CabinetKey = "campus" | "food";
export type LockerStatus = "empty" | "occupied" | "overdue" | "maintenance";

export interface Locker {
  id: string;
  cabinet: CabinetKey;
  letter: string;
  row: number;
  col: number;
  status: LockerStatus;
  /** 存入時間 HH:mm（空櫃為 null） */
  since: string | null;
  /** 已存放分鐘數 */
  minutes: number;
  /** 單號 */
  ref: string | null;
  /** 各學期使用次數，順序同 SEMESTERS */
  history: number[];
  /** 本學期使用次數 */
  semesterCount: number;
  /** 歷史累計使用次數 */
  totalCount: number;
}

/** 學期列表，最後一個是本學期 */
export const SEMESTERS = ["113-2", "114-1", "114-2", "115-1"] as const;
export const CURRENT_SEMESTER = { label: "115 學年度第 1 學期", range: "2026/9/7 起，截至 11/12" };

export const LETTER_ROWS = ["ABCDG", "HIJKL", "MNOPQ", "RSTUV"] as const;

export const CABINETS: Record<CabinetKey, { name: string; title: string; note: string }> = {
  campus: { name: "校園智取櫃", title: "校園智取櫃", note: "包裹・物品寄取" },
  food: { name: "智取食光", title: "智取食光", note: "餐點取餐" },
};

export const STATUS_META: Record<LockerStatus, { label: string; color: string }> = {
  empty: { label: "空櫃", color: "#2e9e6b" },
  occupied: { label: "待取件", color: "#2f6fde" },
  overdue: { label: "逾時未取", color: "#e5484d" },
  maintenance: { label: "維護中", color: "#9aa0a6" },
};

// 固定種子的亂數，確保伺服器與瀏覽器渲染結果一致
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOW_MINUTES = 12 * 60 + 40; // 示範用的「現在」= 12:40

function buildLockers(): Locker[] {
  const rand = mulberry32(402);
  const usageRand = mulberry32(2026);
  // 各學期的整體熱度（本學期只過了約一半）
  const semesterScale = [0.55, 0.85, 1, 0.62];
  const out: Locker[] = [];
  (Object.keys(CABINETS) as CabinetKey[]).forEach((cabinet) => {
    LETTER_ROWS.forEach((letters, row) => {
      [...letters].forEach((letter, col) => {
        const r = rand();
        const busy = cabinet === "food" ? 0.62 : 0.42;
        let status: LockerStatus = "empty";
        if (r < 0.05) status = "maintenance";
        else if (r < 0.05 + busy * 0.18) status = "overdue";
        else if (r < 0.05 + busy) status = "occupied";

        let minutes = 0;
        let since: string | null = null;
        let ref: string | null = null;
        if (status === "occupied" || status === "overdue") {
          minutes =
            status === "overdue"
              ? 130 + Math.floor(rand() * 160)
              : 4 + Math.floor(rand() * (cabinet === "food" ? 40 : 110));
          const t = NOW_MINUTES - minutes;
          since = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
          ref = `${cabinet === "food" ? "F" : "C"}-${1000 + Math.floor(rand() * 9000)}`;
        }
        // 中間兩列最順手，使用次數較高
        const reach = row === 1 || row === 2 ? 1.25 : 0.85;
        const base = (cabinet === "food" ? 95 : 48) * reach;
        const history = semesterScale.map((k) => Math.round(base * k * (0.7 + usageRand() * 0.6)));
        out.push({
          id: `${cabinet}-${letter}`,
          cabinet,
          letter,
          row,
          col,
          status,
          since,
          minutes,
          ref,
          history,
          semesterCount: history[history.length - 1],
          totalCount: history.reduce((a, b) => a + b, 0),
        });
      });
    });
  });
  return out;
}

export const LOCKERS: Locker[] = buildLockers();

export interface CabinetStats {
  semesterCount: number;
  totalCount: number;
  /** 各學期使用次數，順序同 SEMESTERS */
  history: number[];
  /** 本學期各週使用次數，順序同 WEEKS */
  weekly: number[];
}

/** 本學期週次（第 10 週只到 11/12） */
export const WEEKS = Array.from({ length: 10 }, (_, i) => i + 1);

const WEEK_SHARE: Record<CabinetKey, number[]> = {
  campus: [0.07, 0.1, 0.1, 0.11, 0.12, 0.1, 0.12, 0.11, 0.11],
  food: [0.06, 0.09, 0.11, 0.12, 0.11, 0.12, 0.1, 0.12, 0.11],
};

function buildStats(cabinet: CabinetKey): CabinetStats {
  const list = LOCKERS.filter((l) => l.cabinet === cabinet);
  const history = SEMESTERS.map((_, i) => list.reduce((a, l) => a + l.history[i], 0));
  const semesterCount = history[history.length - 1];
  const weekly = WEEK_SHARE[cabinet].map((share) => Math.round(semesterCount * share));
  weekly.push(semesterCount - weekly.reduce((a, b) => a + b, 0)); // 最後一週補足總數
  return { semesterCount, totalCount: history.reduce((a, b) => a + b, 0), history, weekly };
}

export const CABINET_STATS: Record<CabinetKey, CabinetStats> = {
  campus: buildStats("campus"),
  food: buildStats("food"),
};

/** 智取食光累積商品件數 */
export const FOOD_PRODUCT_COUNT = 1346;
export const FOOD_PRODUCT_SINCE = "114 年 12 月";

/** 智取櫃合計 = 校園智取櫃 + 智取食光 */
export const TOTAL_STATS = {
  semesterCount: CABINET_STATS.campus.semesterCount + CABINET_STATS.food.semesterCount,
  totalCount: CABINET_STATS.campus.totalCount + CABINET_STATS.food.totalCount,
};
