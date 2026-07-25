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
  deviceId: string;
}
