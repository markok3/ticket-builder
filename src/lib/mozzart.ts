import { MatchOdds, MozzartMatch } from "./types";

const BASE = "https://www.mozzartbet.mk";

const HEADERS = {
  "Content-Type": "application/json",
  "X-Requested-With": "XMLHttpRequest",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Referer: `${BASE}/mk`,
};

const PAGE_SIZE = 100;
const ODDS_BATCH_SIZE = 40;
const FOOTBALL_SPORT_ID = 1;

interface RawMatch {
  id: number;
  matchNumber: number;
  startTime: number;
  participants: { name: string }[] | null;
  competition: { name: string } | null;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Mozzart ${path} responded with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Today's date in the bookmaker's timezone (Europe/Skopje), formatted YYYY-MM-DD. */
function todayInSkopje(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Skopje",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Fetch today's football matches that haven't started yet.
 * Player-prop pseudo-matches (single participant) are filtered out.
 */
export async function fetchTodaysMatches(): Promise<MozzartMatch[]> {
  const date = todayInSkopje();
  const raw: RawMatch[] = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total && offset < 1000) {
    const page = await post<{ matches: RawMatch[]; total: number }>("/betOffer2", {
      date,
      sportIds: [FOOTBALL_SPORT_ID],
      competitionIds: [],
      sort: "bytime",
      specials: null,
      subgames: [],
      size: PAGE_SIZE,
      offset,
      mostPlayed: false,
      type: "betting",
      numberOfGames: 0,
      activeCompleteOffer: false,
      lang: "mk",
    });
    raw.push(...page.matches);
    total = page.total;
    if (page.matches.length === 0) break;
    offset += PAGE_SIZE;
  }

  const now = Date.now();
  return raw
    .filter((m) => m.participants?.length === 2 && m.startTime > now)
    .map((m) => ({
      id: m.id,
      matchNumber: m.matchNumber,
      startTime: m.startTime,
      home: m.participants![0].name,
      visitor: m.participants![1].name,
      competition: m.competition?.name ?? "",
    }));
}

export interface LivescoreMatch {
  id: number;
  matchNumber: number;
  startTime: number;
  /** 0 = not started, 1 = live, 2 = finished */
  matchEventStatusShort: number;
  score: {
    time: string | null;
    periodScores: {
      periodType: string[];
      scoreType: string;
      home: string;
      visitor: string;
    }[];
  } | null;
}

/** Fetch livescore state for all matches inside the given time window. */
export async function fetchLivescores(fromTime: number, toTime: number): Promise<LivescoreMatch[]> {
  const res = await post<{ matches: LivescoreMatch[] }>("/livescores2", {
    fromTime,
    toTime,
    by: "time",
    size: 500,
    offset: 0,
  });
  return res.matches ?? [];
}

/** Fetch odds for the given subgames, batching match ids to keep requests small. */
export async function fetchOdds(matchIds: number[], subgames: number[]): Promise<MatchOdds[]> {
  const batches: number[][] = [];
  for (let i = 0; i < matchIds.length; i += ODDS_BATCH_SIZE) {
    batches.push(matchIds.slice(i, i + ODDS_BATCH_SIZE));
  }
  const results = await Promise.all(
    batches.map((ids) => post<MatchOdds[]>("/getBettingOdds", { matchIds: ids, subgames }))
  );
  return results.flat();
}
