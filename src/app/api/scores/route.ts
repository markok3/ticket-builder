import { NextRequest, NextResponse } from "next/server";
import { fetchLivescores, LivescoreMatch } from "@/lib/mozzart";
import { MatchScore, ScoresResponse } from "@/lib/types";

const CACHE_TTL_MS = 20_000;
const HOUR_MS = 3_600_000;

let cached: { at: number; key: string; matches: LivescoreMatch[] } | null = null;

async function getLivescores(fromTime: number, toTime: number): Promise<LivescoreMatch[]> {
  const key = `${fromTime}-${toTime}`;
  if (cached && cached.key === key && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.matches;
  }
  const matches = await fetchLivescores(fromTime, toTime);
  cached = { at: Date.now(), key, matches };
  return matches;
}

function period(m: LivescoreMatch, type: string): { home: number; visitor: number } | null {
  const p = m.score?.periodScores?.find(
    (ps) => ps.scoreType === "GOAL" && ps.periodType.includes(type)
  );
  if (!p) return null;
  const home = parseInt(p.home, 10);
  const visitor = parseInt(p.visitor, 10);
  return Number.isFinite(home) && Number.isFinite(visitor) ? { home, visitor } : null;
}

function toMatchScore(m: LivescoreMatch): MatchScore {
  const status = m.matchEventStatusShort === 1 ? "live" : m.matchEventStatusShort === 2 ? "finished" : "upcoming";
  const current = period(m, "CURRENT");
  const ht = period(m, "PERIOD_1");
  return {
    matchId: m.id,
    status,
    minute: status === "live" ? m.score?.time ?? null : null,
    home: current?.home ?? null,
    visitor: current?.visitor ?? null,
    htHome: ht?.home ?? null,
    htVisitor: ht?.visitor ?? null,
  };
}

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("matchIds") ?? "";
  const matchIds = idsParam
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
  const from = Number(req.nextUrl.searchParams.get("from"));
  const to = Number(req.nextUrl.searchParams.get("to"));

  if (matchIds.length === 0 || !Number.isFinite(from) || !Number.isFinite(to) || from > to) {
    return NextResponse.json({ error: "matchIds, from and to are required" }, { status: 400 });
  }

  try {
    const matches = await getLivescores(from - HOUR_MS, to + 8 * HOUR_MS);
    const wanted = new Set(matchIds);
    const scores = matches.filter((m) => wanted.has(m.id)).map(toMatchScore);
    const body: ScoresResponse = { generatedAt: new Date().toISOString(), scores };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch livescores from mozzartbet.mk: ${message}` },
      { status: 502 }
    );
  }
}
