export interface SoccerTeam {
  id: string;
  name: string;
  shortName: string;
  country: string;
  countryCode: string;
  flag: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  hashtag: string;
  aliases: string[]; // strictly team names and nicknames, NO numbers
  points: number; // current round points
  votesCount: number; // votes in current round
  winsCount: number; // number of times won a round (Palmarés histórico)
  recentDonors: {
    username: string;
    avatarUrl: string;
    points: number;
    giftIcon: string;
    timestamp: number;
  }[];
}

export type GiftVoteType = 'heart' | 'rose' | 'donut' | 'lion' | 'custom';

export interface GiftPointDef {
  type: GiftVoteType;
  name: string;
  icon: string;
  points: number;
  description: string;
  aliases: string[];
}

export const SOCCER_GIFT_POINTS: Record<GiftVoteType, GiftPointDef> = {
  heart: {
    type: 'heart',
    name: 'Corazón',
    icon: '❤️',
    points: 1,
    description: 'Corazón / Heart / Like (1 pt)',
    aliases: ['corazon', 'heart', 'corazón', 'like', 'finger heart'],
  },
  rose: {
    type: 'rose',
    name: 'Rosa',
    icon: '🌹',
    points: 5,
    description: 'Rosa / Rose / Flor (5 pts)',
    aliases: ['rosa', 'rose', 'flor', 'flower', 'gg'],
  },
  donut: {
    type: 'donut',
    name: 'Donut',
    icon: '🍩',
    points: 10,
    description: 'Donut / Dona (10 pts)',
    aliases: ['donut', 'dona', 'doughnut'],
  },
  lion: {
    type: 'lion',
    name: 'León',
    icon: '🦁',
    points: 150,
    description: 'León / Lion (150 pts)',
    aliases: ['leon', 'león', 'lion', 'universe', 'universo', 'falcon', 'ballon'],
  },
  custom: {
    type: 'custom',
    name: 'Personalizado',
    icon: '⚽',
    points: 1,
    description: 'Puntaje libre',
    aliases: [],
  },
};

export interface UserAffiliation {
  uniqueId: string; // tiktok username lowercase
  displayName: string;
  avatarUrl: string;
  teamId: string;
  assignedAt: number;
  totalPointsContributed: number;
  lastComment?: string;
}

export interface SoccerVoteLog {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  teamId: string;
  teamName: string;
  giftName: string;
  giftIcon: string;
  pointsAdded: number;
  timestamp: number;
}

export interface RoundTimerState {
  totalSeconds: number; // e.g. 300 (5 min), 600 (10 min)
  secondsLeft: number;
  isActive: boolean;
  isFinished: boolean;
  roundNumber: number;
  winnerTeamId: string | null;
}
