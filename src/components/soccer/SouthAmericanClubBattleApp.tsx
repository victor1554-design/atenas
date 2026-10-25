import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Shield, Copy, Check, Play, Pause } from 'lucide-react';
import { SoccerTeam } from '../../types/soccer';
import { INITIAL_SOCCER_TEAMS } from '../../data/southAmericanTeams';
import { ClubCrest } from './ClubCrest';

interface SouthAmericanClubBattleAppProps {
  isObsOverlay?: boolean;
  isTikTokConnected: boolean;
  tiktokUsername: string;
}

export const SouthAmericanClubBattleApp: React.FC<SouthAmericanClubBattleAppProps> = ({
  isObsOverlay = false,
  isTikTokConnected,
  tiktokUsername,
}) => {
  const [teams, setTeams] = useState<SoccerTeam[]>(INITIAL_SOCCER_TEAMS);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [soundVolume, setSoundVolume] = useState<number>(0.8);
  const [copiedObs, setCopiedObs] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(300);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Sound helper
  const playSound = useCallback((file: string) => {
    if (!soundEnabled) return;
    try {
      const audio = new Audio(`/assets/aistudio/${file}`);
      audio.volume = soundVolume;
      audio.play().catch(() => {});
    } catch {}
  }, [soundEnabled, soundVolume]);

  // Timer countdown
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsLeft]);

  // Handle SSE TikTok events scoped to soccer app
  useEffect(() => {
    if (isObsOverlay) return;
    const eventSource = new EventSource('/api/tiktok/stream?app=soccer');

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'gift') {
          const g = parsed.data;
          const giftNameLower = (g.giftName || '').toLowerCase();
          const username = (g.username || '').toLowerCase();
          const pts = (g.coins || 1) * 2;

          setTeams((prev) => {
            const found = prev.find((t) => t.aliases.some((a) => username.includes(a) || giftNameLower.includes(a)));
            const targetId = found ? found.id : prev[0].id;

            return prev.map((t) => {
              if (t.id === targetId) {
                return {
                  ...t,
                  points: t.points + pts,
                  votesCount: t.votesCount + 1,
                  recentDonors: [
                    {
                      username: g.nickname || g.username,
                      avatarUrl: g.avatarUrl,
                      points: pts,
                      giftIcon: g.giftIcon || '🎁',
                      timestamp: Date.now(),
                    },
                    ...t.recentDonors.slice(0, 4),
                  ],
                };
              }
              return t;
            }).sort((a, b) => b.points - a.points);
          });
        }
      } catch {}
    };

    return () => {
      eventSource.close();
    };
  }, [isObsOverlay]);

  const handleCopyObsLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?overlay=1&app=soccer`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedObs(true);
      setTimeout(() => setCopiedObs(false), 2500);
    });
  };

  const sortedTeams = [...teams].sort((a, b) => b.points - a.points);
  const leader = sortedTeams[0];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-full w-full flex-col bg-slate-950 text-white overflow-y-auto select-none p-4 lg:p-6">
      {/* Header controls */}
      {!isObsOverlay && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-900/90 px-6 py-4 rounded-2xl mb-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-500 shadow-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider uppercase text-white">
                Batalla de Clubes Sudamericanos
              </h1>
              <p className="text-xs text-slate-400">Torneo en vivo • TikTok Live</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-slate-950 border border-slate-800 px-4 py-2">
              <span className="text-sm font-mono font-bold text-amber-400">{formatTime(secondsLeft)}</span>
              {!isTimerRunning ? (
                <button
                  onClick={() => setIsTimerRunning(true)}
                  className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  <Play className="h-3 w-3" />
                </button>
              ) : (
                <button
                  onClick={() => setIsTimerRunning(false)}
                  className="rounded-lg bg-amber-600 px-2 py-1 text-xs font-bold text-white hover:bg-amber-500"
                >
                  <Pause className="h-3 w-3" />
                </button>
              )}
            </div>

            <button
              onClick={handleCopyObsLink}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20"
            >
              {copiedObs ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>OBS Link</span>
            </button>
          </div>
        </div>
      )}

      {/* Leader Showcase */}
      {leader && (
        <div className="mb-8 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="flex items-center gap-4">
            <ClubCrest teamId={leader.id} size={64} primaryColor={leader.primaryColor} secondaryColor={leader.secondaryColor} />
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-emerald-400 mb-1">
                <Trophy className="h-3.5 w-3.5" /> Líder del Torneo
              </div>
              <h2 className="text-3xl font-black uppercase tracking-wide text-white">{leader.name} {leader.flag}</h2>
              <p className="text-xs text-slate-400">Hashtag: {leader.hashtag}</p>
            </div>
          </div>
          <div className="text-center md:text-right">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Puntuación Total</div>
            <div className="text-5xl font-black font-mono text-emerald-400">{leader.points.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sortedTeams.map((team, idx) => (
          <div
            key={team.id}
            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
              idx === 0
                ? 'border-emerald-500/50 bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-slate-500 w-5">#{idx + 1}</span>
              <ClubCrest teamId={team.id} size={40} primaryColor={team.primaryColor} secondaryColor={team.secondaryColor} />
              <div>
                <h4 className="text-sm font-bold text-white uppercase">{team.name}</h4>
                <p className="text-[10px] text-slate-400">{team.country} {team.flag}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-black font-mono text-cyan-400">{team.points}</div>
              <div className="text-[10px] text-slate-500">pts</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
