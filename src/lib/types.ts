export interface MozzartMatch {
  id: number;
  matchNumber: number;
  startTime: number;
  home: string;
  visitor: string;
  competition: string;
}

export interface MozzartKodd {
  winStatus: string;
  value: string;
  subGame: {
    id: number;
    gameId: number;
    gameName: string;
    subGameName: string;
    subGameDescription: string;
  };
}

export interface MatchOdds {
  id: number;
  kodds: Record<string, MozzartKodd>;
}

export interface Selection {
  matchId: number;
  code: number;
  teams: string;
  competition: string;
  kickoff: number;
  market: string;
  family: string;
  constraints: import("./markets").GoalConstraints;
  pick: string;
  odd: number;
  /** Payout percentage of the market this selection belongs to (100 - margin). */
  marketPayoutPct: number;
}

export interface TicketLeg {
  matchId: number;
  code: number;
  teams: string;
  competition: string;
  kickoff: number;
  market: string;
  pick: string;
  odd: number;
  marketPayoutPct: number;
}

export interface Ticket {
  totalOdd: number;
  payoutPct: number;
  legs: TicketLeg[];
}

export interface TicketsResponse {
  generatedAt: string;
  matchCount: number;
  tickets: Ticket[];
}

export interface SavedTicket {
  id: string;
  addedAt: string;
  totalOdd: number;
  payoutPct: number;
  legs: TicketLeg[];
}

export interface MatchScore {
  matchId: number;
  status: "upcoming" | "live" | "finished";
  minute: string | null;
  home: number | null;
  visitor: number | null;
  htHome: number | null;
  htVisitor: number | null;
}

export interface ScoresResponse {
  generatedAt: string;
  scores: MatchScore[];
}
