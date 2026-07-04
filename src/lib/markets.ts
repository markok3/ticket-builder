import { MatchOdds, MozzartMatch, Selection } from "./types";

const INF = Number.POSITIVE_INFINITY;

/** Inclusive goal-count range; used to check that two same-match tips can both win. */
export type GoalRange = [number, number];

export interface GoalConstraints {
  /** Full-time total goals implied by the tip. */
  ft?: GoalRange;
  /** First-half total goals implied by the tip. */
  fh?: GoalRange;
  /** Second-half total goals implied by the tip. */
  sh?: GoalRange;
}

interface LegDef extends GoalConstraints {
  id: number;
}

/**
 * A market is a set of subgames whose outcomes cover the whole event, so the
 * bookmaker's payout percentage is computable: payout = coverage / Σ(1/oddᵢ).
 * `coverage` is 1 for true partitions; double chance covers every outcome
 * twice, hence coverage 2. Selections from the same `family` are never
 * combined on one match — their tips overlap by construction.
 */
export interface MarketDef {
  label: string;
  family: string;
  coverage: number;
  legs: LegDef[];
}

/** Sports offered in the UI; ids are Mozzart's sport ids. */
export const SPORTS = [
  { id: 1, label: "Football" },
  { id: 2, label: "Basketball" },
  { id: 5, label: "Tennis" },
  { id: 8, label: "Baseball" },
  { id: 10, label: "Rugby" },
  { id: 14, label: "Boxing" },
] as const;

export const SPORT_IDS = SPORTS.map((s) => s.id as number);
export const SPORT_LABELS = new Map<number, string>(SPORTS.map((s) => [s.id, s.label]));

const FOOTBALL_MARKETS: MarketDef[] = [
  {
    label: "Конечен тип (1X2)",
    family: "ft-result",
    coverage: 1,
    legs: [{ id: 1001001001 }, { id: 1001001002 }, { id: 1001001003 }],
  },
  {
    label: "Двојна шанса",
    family: "ft-result",
    coverage: 2,
    legs: [{ id: 1001002001 }, { id: 1001002002 }, { id: 1001002003 }],
  },
  {
    label: "Вкупно голови (0-1 / 2+)",
    family: "ft-goals",
    coverage: 1,
    legs: [
      { id: 1001003001, ft: [0, 1] },
      { id: 1001003012, ft: [2, INF] },
    ],
  },
  {
    label: "Вкупно голови (0-2 / 3+)",
    family: "ft-goals",
    coverage: 1,
    legs: [
      { id: 1001003002, ft: [0, 2] },
      { id: 1001003004, ft: [3, INF] },
    ],
  },
  {
    label: "Вкупно голови (0-3 / 4+)",
    family: "ft-goals",
    coverage: 1,
    legs: [
      { id: 1001003013, ft: [0, 3] },
      { id: 1001003005, ft: [4, INF] },
    ],
  },
  {
    label: "Двата тима постигнуваат гол (ГГ/НГ)",
    family: "btts",
    coverage: 1,
    legs: [{ id: 1001130001, ft: [2, INF] }, { id: 1001130002 }],
  },
  {
    label: "Прво полувреме (1X2)",
    family: "fh-result",
    coverage: 1,
    legs: [{ id: 1001004001 }, { id: 1001004002 }, { id: 1001004003 }],
  },
  {
    label: "Второ полувреме (1X2)",
    family: "sh-result",
    coverage: 1,
    legs: [{ id: 1001019001 }, { id: 1001019002 }, { id: 1001019003 }],
  },
  {
    label: "Голови прво полувреме (0 / 1+)",
    family: "fh-goals",
    coverage: 1,
    legs: [
      { id: 1001008008, fh: [0, 0] },
      { id: 1001008001, fh: [1, INF] },
    ],
  },
  {
    label: "Голови прво полувреме (0-1 / 2+)",
    family: "fh-goals",
    coverage: 1,
    legs: [
      { id: 1001008005, fh: [0, 1] },
      { id: 1001008002, fh: [2, INF] },
    ],
  },
  {
    label: "Голови второ полувреме (0 / 1+)",
    family: "sh-goals",
    coverage: 1,
    legs: [
      { id: 1001009008, sh: [0, 0] },
      { id: 1001009001, sh: [1, INF] },
    ],
  },
  {
    label: "Голови второ полувреме (0-1 / 2+)",
    family: "sh-goals",
    coverage: 1,
    legs: [
      { id: 1001009005, sh: [0, 1] },
      { id: 1001009002, sh: [2, INF] },
    ],
  },
  {
    label: "Поминува",
    family: "advance",
    coverage: 1,
    legs: [{ id: 1001089001 }, { id: 1001089003 }],
  },
];

/**
 * Non-football markets. Goal constraints don't apply, so same-match overlap is
 * prevented purely by families: every winner-flavoured market (match winner,
 * handicap) shares the `result` family so at most one lands on a ticket per
 * match. Families only need to be unique within a sport — a match belongs to
 * exactly one sport.
 */
const BASKETBALL_MARKETS: MarketDef[] = [
  {
    label: "Конечен тип (1X2)",
    family: "result",
    coverage: 1,
    legs: [{ id: 1002017001 }, { id: 1002017002 }, { id: 1002017003 }],
  },
  {
    label: "Победник на натпреварот",
    family: "result",
    coverage: 1,
    legs: [{ id: 1002196001 }, { id: 1002196003 }],
  },
  {
    label: "Победник со хендикеп",
    family: "result",
    coverage: 1,
    legs: [{ id: 1002001001 }, { id: 1002001003 }],
  },
  {
    label: "Прво полувреме (1X2)",
    family: "fh-result",
    coverage: 1,
    legs: [{ id: 1002025001 }, { id: 1002025002 }, { id: 1002025003 }],
  },
  {
    label: "Вкупно поени",
    family: "total",
    coverage: 1,
    legs: [{ id: 1002027001 }, { id: 1002027003 }],
  },
];

const TENNIS_MARKETS: MarketDef[] = [
  {
    label: "Конечен тип",
    family: "result",
    coverage: 1,
    legs: [{ id: 1005017001 }, { id: 1005017003 }],
  },
  {
    label: "Хендикеп сетови",
    family: "result",
    coverage: 1,
    legs: [{ id: 1005001001 }, { id: 1005001003 }],
  },
  {
    label: "Хендикеп гемови",
    family: "result",
    coverage: 1,
    legs: [{ id: 1005085001 }, { id: 1005085003 }],
  },
  {
    label: "Прв сет",
    family: "set1",
    coverage: 1,
    legs: [{ id: 1005022001 }, { id: 1005022002 }],
  },
  {
    label: "Вкупно гемови",
    family: "total",
    coverage: 1,
    legs: [{ id: 1005087001 }, { id: 1005087003 }],
  },
];

const BASEBALL_MARKETS: MarketDef[] = [
  {
    label: "Конечен тип",
    family: "result",
    coverage: 1,
    legs: [{ id: 1008017001 }, { id: 1008017003 }],
  },
  {
    label: "Хендикеп поени",
    family: "result",
    coverage: 1,
    legs: [{ id: 1008001001 }, { id: 1008001003 }],
  },
  {
    label: "Прв ининг (1X2)",
    family: "inning1",
    coverage: 1,
    legs: [{ id: 1008199001 }, { id: 1008199002 }, { id: 1008199003 }],
  },
  {
    label: "Вкупно поени",
    family: "total",
    coverage: 1,
    legs: [{ id: 1008027001 }, { id: 1008027003 }],
  },
];

const RUGBY_MARKETS: MarketDef[] = [
  {
    label: "Конечен тип (1X2)",
    family: "result",
    coverage: 1,
    legs: [{ id: 1010017001 }, { id: 1010017002 }, { id: 1010017003 }],
  },
  {
    label: "Хендикеп поени",
    family: "result",
    coverage: 1,
    legs: [{ id: 1010001001 }, { id: 1010001003 }],
  },
  {
    label: "Прво полувреме (1X2)",
    family: "fh-result",
    coverage: 1,
    legs: [{ id: 1010025001 }, { id: 1010025002 }, { id: 1010025003 }],
  },
  {
    label: "Вкупно поени",
    family: "total",
    coverage: 1,
    legs: [{ id: 1010027001 }, { id: 1010027003 }],
  },
  {
    label: "Вкупно поени прво полувреме",
    family: "fh-total",
    coverage: 1,
    legs: [{ id: 1010028001 }, { id: 1010028003 }],
  },
];

const BOXING_MARKETS: MarketDef[] = [
  {
    label: "Конечен тип",
    family: "result",
    coverage: 1,
    legs: [{ id: 1014017001 }, { id: 1014017003 }],
  },
];

export const MARKETS_BY_SPORT: Record<number, MarketDef[]> = {
  1: FOOTBALL_MARKETS,
  2: BASKETBALL_MARKETS,
  5: TENNIS_MARKETS,
  8: BASEBALL_MARKETS,
  10: RUGBY_MARKETS,
  14: BOXING_MARKETS,
};

/** Union of subgame ids for the given sports — sports use disjoint id ranges. */
export function subgameIdsForSports(sportIds: number[]): number[] {
  return sportIds.flatMap((sport) =>
    (MARKETS_BY_SPORT[sport] ?? []).flatMap((m) => m.legs.map((l) => l.id))
  );
}

/** Family pairs that are too correlated to combine even though goal math allows it. */
const INCOMPATIBLE_FAMILIES: [string, string][] = [["ft-result", "advance"]];

export function marketPayoutPct(odds: number[], coverage: number): number {
  const impliedSum = odds.reduce((sum, o) => sum + 1 / o, 0);
  return (coverage / impliedSum) * 100;
}

function intersect(a?: GoalRange, b?: GoalRange): GoalRange | null {
  const lo = Math.max(a?.[0] ?? 0, b?.[0] ?? 0);
  const hi = Math.min(a?.[1] ?? INF, b?.[1] ?? INF);
  return lo <= hi ? [lo, hi] : null;
}

/**
 * A tip may join a partial ticket only if it doesn't overlap the tips already
 * chosen on the same match: different market families, no blacklisted
 * correlated pair, and at least one first-half/second-half goal split under
 * which all of the match's tips win together.
 */
export function canCombine(existing: Selection[], next: Selection): boolean {
  const sameMatch = existing.filter((s) => s.matchId === next.matchId);
  if (sameMatch.length === 0) return true;

  for (const s of sameMatch) {
    if (s.family === next.family) return false;
    if (
      INCOMPATIBLE_FAMILIES.some(
        ([x, y]) => (s.family === x && next.family === y) || (s.family === y && next.family === x)
      )
    ) {
      return false;
    }
  }

  let ft: GoalRange | null = next.constraints.ft ?? [0, INF];
  let fh: GoalRange | null = next.constraints.fh ?? [0, INF];
  let sh: GoalRange | null = next.constraints.sh ?? [0, INF];
  for (const s of sameMatch) {
    ft = intersect(ft ?? undefined, s.constraints.ft);
    fh = intersect(fh ?? undefined, s.constraints.fh);
    sh = intersect(sh ?? undefined, s.constraints.sh);
    if (!ft || !fh || !sh) return false;
  }
  // Some fh + sh sum must land inside the ft range.
  return fh[0] + sh[0] <= ft[1] && fh[1] + sh[1] >= ft[0];
}

/**
 * Turn raw odds into a flat pool of candidate selections, each annotated with
 * the payout percentage of its market. Markets with a missing or suspended
 * outcome are skipped — the margin wouldn't be computable.
 */
export function buildSelectionPool(matches: MozzartMatch[], odds: MatchOdds[]): Selection[] {
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const pool: Selection[] = [];

  for (const { id, kodds } of odds) {
    const match = matchById.get(id);
    if (!match || !kodds) continue;

    for (const market of MARKETS_BY_SPORT[match.sport] ?? []) {
      const legs = market.legs.map((l) => ({ def: l, kodd: kodds[String(l.id)] }));
      if (legs.some(({ kodd }) => !kodd || kodd.winStatus !== "ACTIVE")) continue;

      const values = legs.map(({ kodd }) => parseFloat(kodd.value));
      if (values.some((v) => !Number.isFinite(v) || v <= 1)) continue;

      const payoutPct = marketPayoutPct(values, market.coverage);
      legs.forEach(({ def, kodd }, i) => {
        // Handicap/total markets carry their line separately (e.g. "175.5");
        // plain markets have type NONE with a sentinel value of "-1".
        const line =
          kodd.subGame.specialOddValueType !== "NONE" ? kodd.specialOddValue : undefined;
        pool.push({
          matchId: match.id,
          code: match.matchNumber,
          teams: `${match.home} - ${match.visitor}`,
          competition: match.competition,
          sport: SPORT_LABELS.get(match.sport) ?? "",
          kickoff: match.startTime,
          market: market.label,
          family: market.family,
          constraints: { ft: def.ft, fh: def.fh, sh: def.sh },
          pick: line ? `${kodd.subGame.subGameName} (${line})` : kodd.subGame.subGameName,
          odd: values[i],
          marketPayoutPct: payoutPct,
        });
      });
    }
  }

  return pool;
}
