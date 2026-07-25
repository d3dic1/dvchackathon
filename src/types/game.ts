export interface GameProps {
  isActive: boolean;
  onScore: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  soundEnabled: boolean;
  reducedMotion: boolean;
}

export interface GameMeta {
  slug: string;
  title: string;
  instruction: string;
  accentColor: string;
  component: React.ComponentType<GameProps>;
}

export interface ScoreEntry {
  deviceId: string;
  gameSlug: string;
  score: number;
  timestamp: number;
}

export interface LeaderboardEntry {
  rank: number;
  score: number;
  /** COALESCE(user_id, device_id) — effective player identity returned by the server */
  deviceId: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  playerEntry: LeaderboardEntry | null;
  rivalEntry: LeaderboardEntry | null;
  totalPlayers: number;
  /** Server-resolved effective identity for the requesting device */
  myPlayerId: string;
}
