import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Trophy, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Copy, 
  Check, 
  Play, 
  Pause, 
  Flame, 
  Sparkles,
  Radio,
  Sliders,
  Settings,
  Shield,
  Zap,
  Timer as TimerIcon,
  Crown
} from 'lucide-react';

interface SoccerBattleAppProps {
  isObsOverlay?: boolean;
  isTikTokConnected: boolean;
  tiktokUsername: string;
  onOpenConnectModal?: () => void;
  onOpenObsGuide?: () => void;
}

interface PlayerStats {
  id: 'messi' | 'cristiano';
  name: string;
  shortName: string;
  teamLabel: string;
  avatar: string;
  color: string;
  bgGlow: string;
  points: number;
  votesCount: number;
  aliases: string[];
}

interface GiftPointMapping {
  giftName: string;
  points: number;
  icon: string;
}

const DEFAULT_GIFT_MAPPINGS: GiftPointMapping[] = [
  { giftName: 'Corazón', points: 10, icon: '❤️' },
  { giftName: 'Rosa', points: 20, icon: '🌹' },
  { giftName: 'Donut', points: 50, icon: '🍩' },
  { giftName: 'León', points: 500, icon: '🦁' },
];

export const SoccerBattleApp: React.FC<SoccerBattleAppProps> = ({
  isObsOverlay = false,
  isTikTokConnected,
  tiktokUsername,
}) => {
  // Players State
  const [players, setPlayers] = useState<Record<'messi' | 'cristiano', PlayerStats>>({
    messi: {
      id: 'messi',
      name: 'Lionel Messi',
      shortName: 'MESSI',
      teamLabel: 'Argentina / Inter Miami',
      avatar: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&q=80&w=400',
      color: 'from-cyan-500 to-blue-600',
      bgGlow: 'rgba(6, 182, 212, 0.25)',
      points: 150,
      votesCount: 45,
      aliases: ['messi', 'leo', 'argentina', '10', 'pulga'],
    },
    cristiano: {
      id: 'cristiano',
      name: 'Cristiano Ronaldo',
      shortName: 'CR7',
      teamLabel: 'Portugal / Al Nassr',
      avatar: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=400',
      color: 'from-amber-500 to-rose-600',
      bgGlow: 'rgba(244, 63, 94, 0.25)',
      points: 140,
      votesCount: 42,
      aliases: ['cr7', 'bicho', 'cristiano', 'ronaldo', '7'],
    },
  });

  // Gift Point Mappings (Configurable)
  const [giftMappings, setGiftMappings] = useState<GiftPointMapping[]>(() => {
    try {
      const saved = localStorage.getItem('tiktok_cr7_messi_gifts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_GIFT_MAPPINGS;
  });

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [soundVolume, setSoundVolume] = useState<number>(0.8);
  const [copiedObs, setCopiedObs] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  // Match Timer State (5 minutes = 300 seconds)
  const [secondsLeft, setSecondsLeft] = useState<number>(300);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [hasStartedMatch, setHasStartedMatch] = useState<boolean>(false);
  const [isThirtySecondsAlertTriggered, setIsThirtySecondsAlertTriggered] = useState<boolean>(false);
  const [redFlashActive, setRedFlashActive] = useState<boolean>(false);

  // Leader tracking for audio triggers
  const [currentLeader, setCurrentLeader] = useState<'messi' | 'cristiano' | 'tie'>('tie');
  const lastAudioPlayRef = useRef<Record<string, number>>({});

  // Recent activity logs / animation events
  const [recentEvents, setRecentEvents] = useState<{
    id: string;
    playerName: 'messi' | 'cristiano';
    donorName: string;
    avatarUrl: string;
    points: number;
    giftName: string;
    timestamp: number;
  }[]>([]);

  // Save gift mappings
  useEffect(() => {
    try {
      localStorage.setItem('tiktok_cr7_messi_gifts', JSON.stringify(giftMappings));
    } catch {}
  }, [giftMappings]);

  // Audio Player Helper
  const playAudio = useCallback((filename: string) => {
    if (!soundEnabled) return;
    try {
      const audio = new Audio(`/assets/aistudio/${filename}`);
      audio.volume = soundVolume;
      audio.play().catch(() => {});
    } catch {}
  }, [soundEnabled, soundVolume]);

  // Cooldown audio helper (prevent spamming same voice line)
  const playAudioWithCooldown = useCallback((key: string, filename: string, cooldownSec: number = 10) => {
    const now = Date.now();
    const lastTime = lastAudioPlayRef.current[key] || 0;
    if (now - lastTime > cooldownSec * 1000) {
      lastAudioPlayRef.current[key] = now;
      playAudio(filename);
    }
  }, [playAudio]);

  // Determine leader and check lead change audio triggers
  const updateLeaderAndEvaluateAudio = useCallback((newMessiPts: number, newCrPts: number) => {
    let newLeader: 'messi' | 'cristiano' | 'tie' = 'tie';
    if (newMessiPts > newCrPts) newLeader = 'messi';
    else if (newCrPts > newMessiPts) newLeader = 'cristiano';

    // Check transitions
    if (currentLeader !== newLeader && currentLeader !== 'tie') {
      if (newLeader === 'messi' && currentLeader === 'cristiano') {
        // 4_pasa_ganar_messi.mp3
        playAudio('4._pasa_a_ganar_messi_e79f8f00.mp3');
      } else if (newLeader === 'cristiano' && currentLeader === 'messi') {
        // 5_cristiano_da_vuelta.mp3
        playAudio('5._cristiano_vuelta_167f037d.mp3');
      }
    } else if (currentLeader === newLeader && newLeader !== 'tie') {
      // Maintaining lead (with cooldown)
      if (newLeader === 'messi') {
        playAudioWithCooldown('messi_lead', '2._adelante_messi_en_el_marcador_7a2a42eb.mp3', 12);
      } else {
        playAudioWithCooldown('cr_lead', '3._adelante_el_bicho_681cf113.mp3', 12);
      }
    }

    setCurrentLeader(newLeader);
  }, [currentLeader, playAudio, playAudioWithCooldown]);

  // Add points to a player
  const addPoints = useCallback((playerId: 'messi' | 'cristiano', points: number, donorName = 'Espectador', giftName = 'Regalo', avatarUrl = '') => {
    setPlayers((prev) => {
      const updated = {
        ...prev,
        [playerId]: {
          ...prev[playerId],
          points: prev[playerId].points + points,
          votesCount: prev[playerId].votesCount + 1,
        },
      };
      updateLeaderAndEvaluateAudio(updated.messi.points, updated.cristiano.points);
      return updated;
    });

    setRecentEvents((prev) => [
      {
        id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        playerName: playerId,
        donorName,
        avatarUrl,
        points,
        giftName,
        timestamp: Date.now(),
      },
      ...prev.slice(0, 15),
    ]);
  }, [updateLeaderAndEvaluateAudio]);

  // Handle incoming TikTok events via Server-Sent Events (SSE)
  useEffect(() => {
    if (isObsOverlay) return; // parent App or OBS manages SSE or we listen here if needed

    const eventSource = new EventSource('/api/tiktok/stream');

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'gift') {
          const g = parsed.data;
          const giftNameLower = (g.giftName || '').toLowerCase();
          
          // Check matching gift or points
          const mapping = giftMappings.find((m) => giftNameLower.includes(m.giftName.toLowerCase()));
          const pts = mapping ? mapping.points * (g.repeatCount || 1) : (g.coins || 1) * 2;

          // Check if username or comment mentions messi or cr7
          const un = (g.username || '').toLowerCase();
          const isMessi = players.messi.aliases.some((a) => un.includes(a) || giftNameLower.includes(a));
          const isCr = players.cristiano.aliases.some((a) => un.includes(a) || giftNameLower.includes(a));

          if (isMessi && !isCr) {
            addPoints('messi', pts, g.nickname || g.username, g.giftName, g.avatarUrl);
          } else if (isCr && !isMessi) {
            addPoints('cristiano', pts, g.nickname || g.username, g.giftName, g.avatarUrl);
          } else {
            // Default split or alternate based on who is behind or give to leader/random if neutral
            // By default let user vote via chat or gift prefix
            if (players.messi.points <= players.cristiano.points) {
              addPoints('messi', pts, g.nickname || g.username, g.giftName, g.avatarUrl);
            } else {
              addPoints('cristiano', pts, g.nickname || g.username, g.giftName, g.avatarUrl);
            }
          }
        } else if (parsed.type === 'chat') {
          const c = parsed.data;
          const comment = (c.comment || '').toLowerCase();

          const isMessi = players.messi.aliases.some((a) => comment.includes(a));
          const isCr = players.cristiano.aliases.some((a) => comment.includes(a));

          if (isMessi && !isCr) {
            addPoints('messi', 1, c.displayName, 'Comentario (Messi)', c.avatarUrl);
          } else if (isCr && !isMessi) {
            addPoints('cristiano', 1, c.displayName, 'Comentario (CR7)', c.avatarUrl);
          }
        }
      } catch {}
    };

    return () => {
      eventSource.close();
    };
  }, [giftMappings, isObsOverlay, players]);

  // Match Timer Countdown & 30s Climax
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          const next = prev - 1;
          // Exactly at 30 seconds remaining -> play 6_falta_30_segundos.mp3 and trigger red flash
          if (next === 30 && !isThirtySecondsAlertTriggered) {
            setIsThirtySecondsAlertTriggered(true);
            setRedFlashActive(true);
            playAudio('6._falta_30_segundos_7e82e424.mp3');
          }
          if (next <= 0) {
            setIsTimerRunning(false);
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsLeft, isThirtySecondsAlertTriggered, playAudio]);

  const handleStartMatch = () => {
    if (!hasStartedMatch) {
      setHasStartedMatch(true);
      playAudio('1._arranque_bc03f286.mp3');
    }
    setIsTimerRunning(true);
  };

  const handlePauseMatch = () => {
    setIsTimerRunning(false);
  };

  const handleResetMatch = () => {
    setIsTimerRunning(false);
    setHasStartedMatch(false);
    setSecondsLeft(300);
    setIsThirtySecondsAlertTriggered(false);
    setRedFlashActive(false);
    setPlayers({
      messi: { ...players.messi, points: 0, votesCount: 0 },
      cristiano: { ...players.cristiano, points: 0, votesCount: 0 },
    });
    setCurrentLeader('tie');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyObsLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?overlay=1&app=soccer`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedObs(true);
      setTimeout(() => setCopiedObs(false), 2500);
    });
  };

  const totalPoints = players.messi.points + players.cristiano.points || 1;
  const messiPercent = Math.round((players.messi.points / totalPoints) * 100);
  const crPercent = 100 - messiPercent;

  return (
    <div className={`relative flex h-full w-full flex-col bg-slate-950 text-white overflow-y-auto select-none transition-all duration-300 ${redFlashActive ? 'ring-8 ring-rose-600 animate-pulse' : ''}`}>
      
      {/* Top Header Navigation & Controls */}
      {!isObsOverlay && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-900/90 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 shadow-lg shadow-rose-600/30">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider uppercase bg-gradient-to-r from-cyan-400 via-white to-amber-400 bg-clip-text text-transparent">
                Batalla Épica: Messi vs Cristiano
              </h1>
              <p className="text-xs text-slate-400">
                Transmisión en vivo TikTok Live • Duelo de Leyendas
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Match Timer Badge */}
            <div className="flex items-center gap-2 rounded-xl bg-slate-950 border border-slate-800 px-4 py-2 shadow-inner">
              <TimerIcon className={`h-4 w-4 ${secondsLeft <= 30 ? 'text-rose-500 animate-bounce' : 'text-amber-400'}`} />
              <span className={`text-sm font-mono font-bold ${secondsLeft <= 30 ? 'text-rose-400' : 'text-white'}`}>
                {formatTime(secondsLeft)}
              </span>
              <div className="flex items-center gap-1 ml-2 border-l border-slate-800 pl-2">
                {!isTimerRunning ? (
                  <button
                    onClick={handleStartMatch}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-500 transition-all"
                  >
                    <Play className="h-3 w-3" /> {hasStartedMatch ? 'Reanudar' : 'Iniciar'}
                  </button>
                ) : (
                  <button
                    onClick={handlePauseMatch}
                    className="flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-500 transition-all"
                  >
                    <Pause className="h-3 w-3" /> Pausar
                  </button>
                )}
                <button
                  onClick={handleResetMatch}
                  className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
                  title="Reiniciar Partido"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Config Gifts Button */}
            <button
              onClick={() => setIsConfigOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-all"
            >
              <Sliders className="h-4 w-4 text-cyan-400" />
              <span>Configurar Puntos</span>
            </button>

            {/* Copy OBS Link */}
            <button
              onClick={handleCopyObsLink}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all"
            >
              {copiedObs ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copiedObs ? '¡Copiado!' : 'URL OBS Transparente'}</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-rose-400" />}
            </button>
          </div>
        </div>
      )}

      {/* Main Arena Display (Messi vs Cristiano Head-to-Head) */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6 lg:p-10">
        
        {/* Background stadium effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-80 pointer-events-none" />

        {/* Versus Banner / Live Header */}
        <div className="relative z-10 mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1 text-xs font-extrabold uppercase tracking-widest text-rose-400 backdrop-blur-md mb-3 animate-pulse">
            <Flame className="h-3.5 w-3.5" /> Batalla en Vivo • TikTok Live
          </div>
          <h2 className="text-3xl lg:text-5xl font-black italic tracking-wider uppercase text-white drop-shadow-lg">
            {players.messi.points > players.cristiano.points ? (
              <span className="text-cyan-400">¡Messi lidera el marcador! 🇦🇷</span>
            ) : players.cristiano.points > players.messi.points ? (
              <span className="text-amber-400">¡El Bicho CR7 al frente! 🇵🇹</span>
            ) : (
              <span className="text-white">¡Empate AbsLuto! ⚽</span>
            )}
          </h2>
        </div>

        {/* Dual Player Arena Cards */}
        <div className="relative z-10 grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 items-center">
          
          {/* LIONEL MESSI CARD */}
          <div className={`relative flex flex-col items-center rounded-3xl border-2 p-8 transition-all duration-300 backdrop-blur-xl ${
            players.messi.points >= players.cristiano.points 
              ? 'border-cyan-500 bg-cyan-950/40 shadow-2xl shadow-cyan-500/20 scale-105' 
              : 'border-slate-800 bg-slate-900/60 opacity-90'
          }`}>
            {players.messi.points > players.cristiano.points && (
              <div className="absolute -top-5 flex items-center gap-1 rounded-full bg-cyan-500 px-4 py-1 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg">
                <Crown className="h-4 w-4" /> Líder Actual
              </div>
            )}

            <div className="relative mb-6 h-36 w-36 overflow-hidden rounded-full border-4 border-cyan-400 shadow-2xl shadow-cyan-500/40">
              <img 
                src={players.messi.avatar} 
                alt="Lionel Messi" 
                className="h-full w-full object-cover"
              />
            </div>

            <h3 className="text-2xl lg:text-3xl font-black tracking-wide text-white uppercase mb-1">
              {players.messi.name}
            </h3>
            <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-6">
              {players.messi.teamLabel}
            </p>

            <div className="w-full rounded-2xl bg-slate-950/80 border border-slate-800 p-5 text-center shadow-inner mb-6">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Puntos de Regalos</div>
              <div className="text-4xl lg:text-6xl font-black font-mono text-cyan-400 drop-shadow">
                {players.messi.points.toLocaleString()}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">
                {players.messi.votesCount} interacciones
              </div>
            </div>

            {/* Quick Test Simulator Button for Streamer */}
            {!isObsOverlay && (
              <button
                onClick={() => addPoints('messi', 10, 'StreamerTest', 'Corazón ❤️')}
                className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all"
              >
                + Simular Regalo Messi (10 pts)
              </button>
            )}
          </div>

          {/* CRISTIANO RONALDO CARD */}
          <div className={`relative flex flex-col items-center rounded-3xl border-2 p-8 transition-all duration-300 backdrop-blur-xl ${
            players.cristiano.points >= players.messi.points 
              ? 'border-amber-500 bg-amber-950/40 shadow-2xl shadow-amber-500/20 scale-105' 
              : 'border-slate-800 bg-slate-900/60 opacity-90'
          }`}>
            {players.cristiano.points > players.messi.points && (
              <div className="absolute -top-5 flex items-center gap-1 rounded-full bg-amber-500 px-4 py-1 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg">
                <Crown className="h-4 w-4" /> Líder Actual
              </div>
            )}

            <div className="relative mb-6 h-36 w-36 overflow-hidden rounded-full border-4 border-amber-400 shadow-2xl shadow-amber-500/40">
              <img 
                src={players.cristiano.avatar} 
                alt="Cristiano Ronaldo" 
                className="h-full w-full object-cover"
              />
            </div>

            <h3 className="text-2xl lg:text-3xl font-black tracking-wide text-white uppercase mb-1">
              {players.cristiano.name}
            </h3>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-6">
              {players.cristiano.teamLabel}
            </p>

            <div className="w-full rounded-2xl bg-slate-950/80 border border-slate-800 p-5 text-center shadow-inner mb-6">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Puntos de Regalos</div>
              <div className="text-4xl lg:text-6xl font-black font-mono text-amber-400 drop-shadow">
                {players.cristiano.points.toLocaleString()}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">
                {players.cristiano.votesCount} interacciones
              </div>
            </div>

            {/* Quick Test Simulator Button for Streamer */}
            {!isObsOverlay && (
              <button
                onClick={() => addPoints('cristiano', 10, 'StreamerTest', 'Rosa 🌹')}
                className="w-full rounded-xl bg-amber-600 hover:bg-amber-500 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all"
              >
                + Simular Regalo CR7 (10 pts)
              </button>
            )}
          </div>

        </div>

        {/* Progress Bar Battle Percentage */}
        <div className="relative z-10 w-full max-w-4xl mt-10">
          <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            <span className="text-cyan-400">Messi ({messiPercent}%)</span>
            <span className="text-amber-400">CR7 ({crPercent}%)</span>
          </div>
          <div className="h-6 w-full rounded-full bg-slate-900 border border-slate-800 p-1 overflow-hidden flex shadow-inner">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
              style={{ width: `${messiPercent}%` }}
            />
            <div 
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-600 transition-all duration-500"
              style={{ width: `${crPercent}%` }}
            />
          </div>
        </div>

        {/* Gift Conveyor Preview / Semi-Transparent Overlay Bar */}
        <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-6 py-3 backdrop-blur-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Tabla de Regalos:</span>
          {giftMappings.map((g, idx) => (
            <div key={idx} className="flex items-center gap-1.5 rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs">
              <span className="text-base">{g.icon}</span>
              <span className="font-bold text-white">{g.giftName}:</span>
              <span className="font-mono font-bold text-cyan-400">+{g.points} pts</span>
            </div>
          ))}
        </div>

      </div>

      {/* Gift Points Configuration Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-cyan-400" />
                Configurar Puntos por Regalo
              </h3>
              <button 
                onClick={() => setIsConfigOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {giftMappings.map((map, index) => (
                <div key={index} className="flex items-center justify-between gap-3 rounded-xl bg-slate-950 border border-slate-800 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{map.icon}</span>
                    <span className="text-sm font-bold text-white">{map.giftName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={map.points}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setGiftMappings((prev) => {
                          const next = [...prev];
                          next[index] = { ...next[index], points: val };
                          return next;
                        });
                      }}
                      className="w-20 rounded-lg bg-slate-900 border border-slate-700 px-3 py-1 text-right font-mono text-sm text-cyan-400 focus:outline-none focus:border-cyan-500"
                    />
                    <span className="text-xs font-semibold text-slate-400">pts</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsConfigOpen(false)}
                className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-lg"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
