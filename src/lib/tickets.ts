import { canCombine } from "./markets";
import { Selection, Ticket, TicketLeg } from "./types";

export interface BuildOptions {
  target: number;
  tolerance: number;
  count: number;
  legs: number;
}

export const DEFAULT_OPTIONS: BuildOptions = { target: 5, tolerance: 0.5, count: 10, legs: 2 };

/** Candidates explored per ticket; the pool is payout-sorted, so the best combos come first. */
const MAX_CANDIDATES_PER_TICKET = 1000;

interface Candidate {
  legs: Selection[];
  totalOdd: number;
  diff: number;
  payoutPct: number;
}

function toLeg(s: Selection): TicketLeg {
  return {
    matchId: s.matchId,
    code: s.code,
    teams: s.teams,
    competition: s.competition,
    kickoff: s.kickoff,
    market: s.market,
    pick: s.pick,
    odd: s.odd,
    marketPayoutPct: s.marketPayoutPct,
  };
}

/**
 * Build N-leg tickets: combine selections so the total odd lands in
 * `[target, target + tolerance]` (never below the target), rank by lowest
 * bookmaker margin (highest payout), tie-broken by closeness to the target.
 * Several tips may come from the same match when they don't overlap
 * (see `canCombine`). Displayed tickets never share a match.
 *
 * Tickets are found one at a time: each pass searches only matches not used by
 * an earlier ticket (payout-sorted DFS with product-bound pruning), takes the
 * best candidate, and repeats. This keeps every displayed ticket disjoint
 * while still surfacing variety beyond the few lowest-margin matches.
 */
export function buildTickets(pool: Selection[], opts: BuildOptions): Ticket[] {
  const { target, tolerance, count, legs } = opts;
  const lo = target;
  const hi = target + tolerance;

  const sortedAll = pool
    .filter((s) => s.odd < hi)
    .sort((a, b) => b.marketPayoutPct - a.marketPayoutPct || a.odd - b.odd);

  const usedMatches = new Set<number>();
  const tickets: Ticket[] = [];

  while (tickets.length < count) {
    const sorted = sortedAll.filter((s) => !usedMatches.has(s.matchId));
    if (sorted.length < legs) break;

    const minOdd = Math.min(...sorted.map((s) => s.odd));
    const maxOdd = Math.max(...sorted.map((s) => s.odd));
    const candidates: Candidate[] = [];
    const chosen: Selection[] = [];

    function dfs(startIdx: number, product: number): void {
      if (candidates.length >= MAX_CANDIDATES_PER_TICKET) return;
      const remaining = legs - chosen.length;
      if (remaining === 0) {
        if (product >= lo && product <= hi) {
          candidates.push({
            legs: [...chosen],
            totalOdd: product,
            diff: product - target,
            payoutPct: chosen.reduce((sum, s) => sum + s.marketPayoutPct, 0) / legs,
          });
        }
        return;
      }
      // Even the cheapest/priciest remaining legs can't bring the product in-window.
      if (product * Math.pow(minOdd, remaining) > hi) return;
      if (product * Math.pow(maxOdd, remaining) < lo) return;

      for (let i = startIdx; i <= sorted.length - remaining; i++) {
        if (candidates.length >= MAX_CANDIDATES_PER_TICKET) return;
        const s = sorted[i];
        if (product * s.odd * Math.pow(minOdd, remaining - 1) > hi) continue;
        if (!canCombine(chosen, s)) continue;
        chosen.push(s);
        dfs(i + 1, product * s.odd);
        chosen.pop();
      }
    }

    dfs(0, 1);
    if (candidates.length === 0) break;

    // Highest payout first (payouts within 0.1% count as equal), then closest to target.
    candidates.sort((x, y) => {
      const px = Math.round(x.payoutPct * 10);
      const py = Math.round(y.payoutPct * 10);
      if (px !== py) return py - px;
      return x.diff - y.diff;
    });

    const best = candidates[0];
    best.legs.forEach((s) => usedMatches.add(s.matchId));
    tickets.push({
      totalOdd: Math.round(best.totalOdd * 100) / 100,
      payoutPct: Math.round(best.payoutPct * 10) / 10,
      legs: [...best.legs].sort((x, y) => x.kickoff - y.kickoff).map(toLeg),
    });
  }

  return tickets;
}
