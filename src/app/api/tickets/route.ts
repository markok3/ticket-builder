import { NextRequest, NextResponse } from "next/server";
import { fetchOdds, fetchTodaysMatches } from "@/lib/mozzart";
import { buildSelectionPool, SPORT_IDS, subgameIdsForSports } from "@/lib/markets";
import { buildTickets, DEFAULT_OPTIONS } from "@/lib/tickets";
import { MatchOdds, MozzartMatch, TicketsResponse } from "@/lib/types";

const CACHE_TTL_MS = 60_000;

let cached: { key: string; at: number; matches: MozzartMatch[]; odds: MatchOdds[] } | null = null;

async function getData(sports: number[]): Promise<{ matches: MozzartMatch[]; odds: MatchOdds[] }> {
  const key = [...sports].sort((a, b) => a - b).join(",");
  if (cached && cached.key === key && Date.now() - cached.at < CACHE_TTL_MS) return cached;
  const matches = await fetchTodaysMatches(sports);
  const odds = matches.length
    ? await fetchOdds(matches.map((m) => m.id), subgameIdsForSports(sports))
    : [];
  cached = { key, at: Date.now(), matches, odds };
  return cached;
}

function numParam(req: NextRequest, name: string, fallback: number, min: number, max: number): number {
  const raw = req.nextUrl.searchParams.get(name);
  const value = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** Comma-separated integer list; entries that aren't finite numbers are dropped. */
function idListParam(req: NextRequest, name: string): number[] {
  const raw = req.nextUrl.searchParams.get(name);
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
}

export async function GET(req: NextRequest) {
  const target = numParam(req, "target", DEFAULT_OPTIONS.target, 1.05, 1000);
  // Window above the target scales with it: +0.5 at target 5, +0.135 at target 1.35.
  const defaultTolerance = Math.min(0.5, Math.max(0.05, target * 0.1));
  const tolerance = numParam(req, "tolerance", defaultTolerance, 0.01, target);
  const count = numParam(req, "count", DEFAULT_OPTIONS.count, 1, 50);
  const legs = Math.round(numParam(req, "legs", DEFAULT_OPTIONS.legs, 2, 10));
  const minOdd = numParam(req, "minOdd", DEFAULT_OPTIONS.minOdd, 1.01, 100);
  const requestedSports = idListParam(req, "sports").filter((id) => SPORT_IDS.includes(id));
  const sports = requestedSports.length > 0 ? requestedSports : [1];
  // Matches already used on the caller's saved tickets — never offer them again.
  const excluded = new Set(idListParam(req, "exclude"));

  try {
    const { matches, odds } = await getData(sports);
    const pool = buildSelectionPool(matches, odds).filter((s) => !excluded.has(s.matchId));
    const tickets = buildTickets(pool, { target, tolerance, count, legs, minOdd });
    const body: TicketsResponse = {
      generatedAt: new Date().toISOString(),
      matchCount: matches.length,
      tickets,
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch data from mozzartbet.mk: ${message}` },
      { status: 502 }
    );
  }
}
