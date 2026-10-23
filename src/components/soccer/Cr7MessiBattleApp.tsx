import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, Volume2, VolumeX, RotateCcw, Copy, Check, Play, Pause, Flame, Sparkles, Sliders, Timer as TimerIcon, Crown, Radio, Gift } from 'lucide-react';

interface Cr7MessiBattleAppProps {
  isObsOverlay?: boolean;
  isTikTokConnected: boolean;
  tiktokUsername: string;
  isConnecting?: boolean;
  connectionError?: string | null;
  onToggleTikTokConnection?: () => void;
  onUpdateSettings?: (newSettings: any) => void;
  settings?: any;
}

interface PlayerStats {
  id: 'messi' | 'cristiano';
  name: string;
  shortName: string;
  teamLabel: string;
  avatar: string;
  points: number;
  votesCount: number;
  aliases: string[];
}

interface GiftPointMapping {
  giftName: string;
  points: number;
  icon: string;
  coins: number;
  label: string;
}

const COMMON_TIKTOK_GIFTS: GiftPointMapping[] = [
  { giftName: 'Rosa', points: 1, icon: '🌹', coins: 1, label: 'Rosa (🌹 - 1)' },
  { giftName: 'Corazón', points: 1, icon: '❤️', coins: 1, label: 'Corazón (❤️ - 1)' },
  { giftName: 'Rosquilla', points: 30, icon: '🍩', coins: 30, label: 'Rosquilla (🍩 - 30)' },
  { giftName: 'Gorra', points: 99, icon: '🧢', coins: 99, label: 'Gorra (🧢 - 99)' },
  { giftName: 'Gafas de sol', points: 199, icon: '🕶️', coins: 199, label: 'Gafas de sol (🕶️ - 199)' },
  { giftName: 'Micrófono', points: 500, icon: '🎤', coins: 500, label: 'Micrófono (🎤 - 500)' },
  { giftName: 'Galaxia', points: 19999, icon: '🌌', coins: 19999, label: 'Galaxia (🌌 - 19999)' },
  { giftName: 'León', points: 29999, icon: '🦁', coins: 29999, label: 'León (🦁 - 29999)' },
  { giftName: 'Tigre', points: 16999, icon: '🐅', coins: 16999, label: 'Tigre (🐅 - 16999)' },
  { giftName: 'Dragón', points: 26999, icon: '🐉', coins: 26999, label: 'Dragón (🐉 - 26999)' },
  { giftName: 'Castillo', points: 20000, icon: '🏰', coins: 20000, label: 'Castillo (🏰 - 20000)' },
];

const DEFAULT_GIFT_MAPPINGS: GiftPointMapping[] = [
  { giftName: 'Corazón', points: 1, icon: '❤️', coins: 1, label: 'Corazón (❤️ - 1)' },
  { giftName: 'Rosa', points: 10, icon: '🌹', coins: 1, label: 'Rosa (🌹 - 1)' },
  { giftName: 'Rosquilla', points: 30, icon: '🍩', coins: 30, label: 'Rosquilla (🍩 - 30)' },
  { giftName: 'León', points: 500, icon: '🦁', coins: 29999, label: 'León (🦁 - 29999)' },
];

interface DonorEntry {
  name: string;
  points: number;
}

export const Cr7MessiBattleApp: React.FC<Cr7MessiBattleAppProps> = ({
  isObsOverlay = false,
  isTikTokConnected,
  tiktokUsername,
  isConnecting = false,
  connectionError = null,
  onToggleTikTokConnection,
  onUpdateSettings,
}) => {
  const [players, setPlayers] = useState<Record<'messi' | 'cristiano', PlayerStats>>({
    messi: {
      id: 'messi',
      name: 'Lionel Messi',
      shortName: 'MESSI',
      teamLabel: 'Argentina / Inter Miami',
      avatar: '/assets/aistudio/MESSI_8d06e45a.jpg',
      points: 0,
      votesCount: 0,
      aliases: ['messi', 'leo', 'argentina', '10', 'pulga'],
    },
    cristiano: {
      id: 'cristiano',
      name: 'Cristiano Ronaldo',
      shortName: 'CR7',
      teamLabel: 'Portugal / Al Nassr',
      avatar: '/assets/aistudio/CR7_47120cfd.webp',
      points: 0,
      votesCount: 0,
      aliases: ['cr7', 'bicho', 'cristiano', 'ronaldo', '7'],
    },
  });

  // Top Donors state for left & right leaderboards
  const [messiDonors, setMessiDonors] = useState<Record<string, DonorEntry>>({});
  const [cristianoDonors, setCristianoDonors] = useState<Record<string, DonorEntry>>({});

  // In-memory viewer affiliation map: username -> 'messi' | 'cristiano' (cleared on reset / match end)
  const viewerAffiliations = useRef<Map<string, 'messi' | 'cristiano'>>(new Map());

  // Configurable gift points with selector
  const [giftMappings, setGiftMappings] = useState<GiftPointMapping[]>(() => {
    try {
      const saved = localStorage.getItem('tiktok_cr7_messi_gifts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          while (parsed.length < 4) {
            parsed.push(DEFAULT_GIFT_MAPPINGS[parsed.length % DEFAULT_GIFT_MAPPINGS.length]);
          }
          return parsed.slice(0, 4);
        }
      }
    } catch {}
    return DEFAULT_GIFT_MAPPINGS;
  });

  // Sound and settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [soundVolume, setSoundVolume] = useState<number>(0.8);
  const [copiedObs, setCopiedObs] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  // Programmable Timer State (default 300s = 5 mins)
  const [matchDurationSeconds, setMatchDurationSeconds] = useState<number>(300);
  const [secondsLeft, setSecondsLeft] = useState<number>(300);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [hasStartedMatch, setHasStartedMatch] = useState<boolean>(false);
  const [isThirtySecondsAlertTriggered, setIsThirtySecondsAlertTriggered] = useState<boolean>(false);
  const [redFlashActive, setRedFlashActive] = useState<boolean>(false);
  const [isMatchOver, setIsMatchOver] = useState<boolean>(false);

  // Series match wins tracking (count of games/matches won after each round)
  const [messiMatchWins, setMessiMatchWins] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('tiktok_cr7_messi_match_wins') || '0', 10);
    } catch {
      return 0;
    }
  });
  const [cristianoMatchWins, setCristianoMatchWins] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('tiktok_cr7_cristiano_match_wins') || '0', 10);
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('tiktok_cr7_messi_match_wins', messiMatchWins.toString());
      localStorage.setItem('tiktok_cr7_cristiano_match_wins', cristianoMatchWins.toString());
    } catch {}
  }, [messiMatchWins, cristianoMatchWins]);

  const [currentLeader, setCurrentLeader] = useState<'messi' | 'cristiano' | 'tie'>('tie');
  const lastAudioPlayRef = useRef<Record<string, number>>({});

  useEffect(() => {
    try {
      localStorage.setItem('tiktok_cr7_messi_gifts', JSON.stringify(giftMappings));
    } catch {}
  }, [giftMappings]);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const isAudioLockedRef = useRef<boolean>(false);

  const playAudio = useCallback((filename: string, volMultiplier = 1.0, isPriority = false) => {
    if (!soundEnabled) return;
    try {
      // If priority lock is active (e.g. intro audio 1 or 30s audio 6 playing), ignore normal audio requests
      if (isAudioLockedRef.current && !isPriority) {
        return;
      }

      // Stop any currently playing audio immediately so no two audios overlap
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
          activeAudioRef.current.currentTime = 0;
        } catch {}
        activeAudioRef.current = null;
      }

      const actualFilename = filename.includes('ronaldo-siuuuu') ? 'siuu_cristiano_8c1061b7.m4a' : filename;
      const audio = new Audio(`/assets/aistudio/${actualFilename}`);

      // Volume normalization / equalization multipliers & gain boost for Siuuu
      let multiplier = volMultiplier;
      if (actualFilename.includes('siuu_cristiano')) {
        multiplier = 1.9; // Extra gain boost for Cristiano Siuuu
      } else if (actualFilename.includes('anda-pa-alla-bobo')) {
        multiplier = 1.4;
      } else if (actualFilename.includes('arranque') || actualFilename.includes('falta_30')) {
        multiplier = 1.25;
      } else if (actualFilename.includes('adelante') || actualFilename.includes('pasa') || actualFilename.includes('cristiano_vuelta')) {
        multiplier = 1.3;
      }

      const finalVolume = Math.min(1.0, soundVolume * multiplier);
      audio.volume = finalVolume;
      audio.playbackRate = 1.12; // Anti-algorithm voice modification while keeping natural pitch

      activeAudioRef.current = audio;

      const isThisPriority = isPriority || actualFilename.includes('arranque') || actualFilename.includes('falta_30') || actualFilename.includes('bobo') || actualFilename.includes('siuu');
      if (isThisPriority) {
        isAudioLockedRef.current = true;
      }

      audio.onended = () => {
        if (activeAudioRef.current === audio) {
          activeAudioRef.current = null;
        }
        if (isThisPriority) {
          isAudioLockedRef.current = false;
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Audio autoplay blocked or failed:", error);
          if (activeAudioRef.current === audio) {
            activeAudioRef.current = null;
          }
          isAudioLockedRef.current = false;
        });
      }
    } catch (e) {
      console.warn("Audio error:", e);
      isAudioLockedRef.current = false;
    }
  }, [soundEnabled, soundVolume]);

  const playAudioWithCooldown = useCallback((key: string, filename: string, cooldownSec: number = 10) => {
    const now = Date.now();
    const lastTime = lastAudioPlayRef.current[key] || 0;
    if (now - lastTime > cooldownSec * 1000) {
      lastAudioPlayRef.current[key] = now;
      playAudio(filename);
    }
  }, [playAudio]);

  const updateLeaderAndEvaluateAudio = useCallback((newMessiPts: number, newCrPts: number) => {
    if (isMatchOver) return;
    let newLeader: 'messi' | 'cristiano' | 'tie' = 'tie';
    if (newMessiPts > newCrPts) newLeader = 'messi';
    else if (newCrPts > newMessiPts) newLeader = 'cristiano';

    if (currentLeader !== newLeader) {
      if (newLeader === 'messi' && currentLeader !== 'messi') {
        if (currentLeader === 'cristiano') {
          playAudio('4._pasa_a_ganar_messi_e79f8f00.mp3');
        } else {
          playAudio('2._adelante_messi_en_el_marcador_7a2a42eb.mp3');
        }
      } else if (newLeader === 'cristiano' && currentLeader !== 'cristiano') {
        if (currentLeader === 'messi') {
          playAudio('5._cristiano_vuelta_966646b4.mp3');
        } else {
          playAudio('3._adelante_el_bicho_681cf113.mp3');
        }
      }
    } else if (currentLeader === newLeader && newLeader !== 'tie') {
      if (newLeader === 'messi') {
        playAudioWithCooldown('messi_lead', '2._adelante_messi_en_el_marcador_7a2a42eb.mp3', 10);
      } else {
        playAudioWithCooldown('cr_lead', '3._adelante_el_bicho_681cf113.mp3', 10);
      }
    }

    setCurrentLeader(newLeader);
  }, [currentLeader, isMatchOver, playAudio, playAudioWithCooldown]);

  const addPoints = useCallback((playerId: 'messi' | 'cristiano', points: number, donorUsername = 'espectador_anonimo', donorName = 'Espectador', giftName = 'Regalo') => {
    if (isMatchOver || !isTimerRunning) return;

    // Record viewer affiliation
    viewerAffiliations.current.set(donorUsername.toLowerCase(), playerId);

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

    // Update Top Donors leaderboards
    if (playerId === 'messi') {
      setMessiDonors((prev) => {
        const current = prev[donorUsername] || { name: donorName || donorUsername, points: 0 };
        return {
          ...prev,
          [donorUsername]: { name: current.name, points: current.points + points }
        };
      });
    } else {
      setCristianoDonors((prev) => {
        const current = prev[donorUsername] || { name: donorName || donorUsername, points: 0 };
        return {
          ...prev,
          [donorUsername]: { name: current.name, points: current.points + points }
        };
      });
    }
  }, [isMatchOver, isTimerRunning, updateLeaderAndEvaluateAudio]);

  // Handle Match Over & Winner Celebration
  useEffect(() => {
    if (hasStartedMatch && secondsLeft <= 0 && !isMatchOver) {
      setIsMatchOver(true);
      setIsTimerRunning(false);
      setRedFlashActive(false);

      const mPts = players.messi.points;
      const cPts = players.cristiano.points;
      if (mPts > cPts) {
        playAudio('anda-pa-alla-bobo_fac96bf6.mp3');
      } else if (cPts > mPts) {
        playAudio('siuu_cristiano_8c1061b7.m4a');
      }
    }
  }, [hasStartedMatch, secondsLeft, isMatchOver, players, playAudio]);

  // SSE TikTok Live listener
  useEffect(() => {
    if (isObsOverlay) return;
    const eventSource = new EventSource('/api/tiktok/stream');

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'chat') {
          const c = parsed.data;
          const comment = (c.comment || '').toLowerCase().trim();
          const username = (c.uniqueId || c.username || '').toLowerCase().trim();
          const displayName = c.nickname || c.uniqueId || c.username || 'Espectador';

          const isMessi = players.messi.aliases.some((a) => comment === a || comment.includes(a));
          const isCr = players.cristiano.aliases.some((a) => comment === a || comment.includes(a));

          if (isMessi && !isCr) {
            viewerAffiliations.current.set(username, 'messi');
          } else if (isCr && !isMessi) {
            viewerAffiliations.current.set(username, 'cristiano');
          }
        } else if (parsed.type === 'gift') {
          const g = parsed.data;
          const username = (g.uniqueId || g.username || 'anon').toLowerCase().trim();
          const displayName = g.nickname || g.uniqueId || g.username || 'Espectador';
          const giftNameLower = (g.giftName || '').toLowerCase();

          const mapping = giftMappings.find((m) => giftNameLower.includes(m.giftName.toLowerCase()));
          const pts = mapping ? mapping.points * (g.repeatCount || 1) : (g.coins || 1);

          let targetPlayer: 'messi' | 'cristiano' = viewerAffiliations.current.get(username) || (players.messi.points <= players.cristiano.points ? 'messi' : 'cristiano');

          addPoints(targetPlayer, pts, username, displayName, g.giftName);
        } else if (parsed.type === 'like') {
          const l = parsed.data;
          const username = (l.username || 'anon').toLowerCase().trim();
          const displayName = l.nickname || l.username || 'Espectador';
          const count = Number(l.likeCount || l.count || 1);

          let targetPlayer: 'messi' | 'cristiano' = viewerAffiliations.current.get(username) || 'messi';

          addPoints(targetPlayer, count, username, displayName, 'Corazón');
        }
      } catch {}
    };

    return () => {
      eventSource.close();
    };
  }, [giftMappings, isObsOverlay, players, addPoints]);

  // Timer countdown
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          const next = prev - 1;
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

  const handleResetMatch = () => {
    setIsTimerRunning(false);
    setHasStartedMatch(false);
    setSecondsLeft(matchDurationSeconds);
    setIsThirtySecondsAlertTriggered(false);
    setRedFlashActive(false);
    setIsMatchOver(false);
    viewerAffiliations.current.clear();
    setMessiDonors({});
    setCristianoDonors({});
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
    const url = `${window.location.origin}${window.location.pathname}?overlay=1&app=cr7`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedObs(true);
      setTimeout(() => setCopiedObs(false), 2500);
    });
  };

  const totalPoints = players.messi.points + players.cristiano.points || 1;
  const messiPercent = Math.round((players.messi.points / totalPoints) * 100);
  const crPercent = 100 - messiPercent;

  const sortedMessiDonors = Object.entries(messiDonors)
    .map(([username, data]) => ({ username, ...data }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);

  const sortedCristianoDonors = Object.entries(cristianoDonors)
    .map(([username, data]) => ({ username, ...data }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);

  return (
    <div className={`relative flex h-full w-full flex-col bg-slate-950 text-white overflow-y-auto select-none transition-all duration-300 ${redFlashActive ? 'ring-8 ring-rose-600 animate-pulse' : ''}`}>
      
      {/* Top Header & Match Timer Controls */}
      {!isObsOverlay && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/90 px-3 lg:px-6 py-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 shadow-md">
              <Flame className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-xs lg:text-sm font-black tracking-wider uppercase text-white">
                Messi vs CR7 Live
              </h1>
              <p className="text-[9px] text-slate-400">Batalla en Directo</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Timer & Program Duration */}
            <div className="flex items-center gap-1.5 rounded-xl bg-slate-950 border border-slate-800 px-2.5 py-1">
              <TimerIcon className={`h-3.5 w-3.5 ${secondsLeft <= 30 ? 'text-rose-500 animate-bounce' : 'text-amber-400'}`} />
              <span className={`text-xs font-mono font-bold ${secondsLeft <= 30 ? 'text-rose-400' : 'text-white'}`}>
                {formatTime(secondsLeft)}
              </span>
              <select
                value={matchDurationSeconds}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setMatchDurationSeconds(val);
                  if (!isTimerRunning) setSecondsLeft(val);
                }}
                className="bg-slate-900 border border-slate-700 rounded text-[10px] text-cyan-400 px-1 py-0.5"
              >
                <option value={10}>10 seg (Prueba)</option>
                <option value={120}>2 min</option>
                <option value={300}>5 min</option>
                <option value={600}>10 min</option>
                <option value={900}>15 min</option>
              </select>

              {!isTimerRunning ? (
                <button
                  onClick={handleStartMatch}
                  className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-500"
                >
                  <Play className="h-3 w-3 inline" />
                </button>
              ) : (
                <button
                  onClick={() => setIsTimerRunning(false)}
                  className="rounded bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-amber-500"
                >
                  <Pause className="h-3 w-3 inline" />
                </button>
              )}
              <button
                onClick={handleResetMatch}
                className="rounded bg-slate-800 p-1 text-slate-300 hover:bg-slate-700"
                title="Reiniciar"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>

            <button
              onClick={() => setIsConfigOpen(true)}
              className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-200 hover:bg-slate-700"
            >
              <Sliders className="h-3.5 w-3.5 text-cyan-400" />
              <span>Regalos</span>
            </button>

            <button
              onClick={handleCopyObsLink}
              className="flex items-center gap-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20"
            >
              {copiedObs ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>OBS</span>
            </button>
          </div>
        </div>
      )}

      {/* TikTok Live Connection Bar */}
      {!isObsOverlay && (
        <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2">
            <Radio className={`h-4 w-4 ${isTikTokConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="font-bold text-slate-300">Conexión TikTok Live:</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
              <span className="px-2 text-slate-500 font-mono">@</span>
              <input
                type="text"
                placeholder="tu_usuario_tiktok"
                value={tiktokUsername}
                onChange={(e) => onUpdateSettings?.({ tiktokUsername: e.target.value })}
                className="bg-transparent px-2 py-1 text-xs text-white focus:outline-none w-36"
              />
            </div>

            <button
              onClick={onToggleTikTokConnection}
              disabled={isConnecting}
              className={`rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                isTikTokConnected
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isConnecting ? (
                <>Conectando...</>
              ) : isTikTokConnected ? (
                <>Desconectar</>
              ) : (
                <>Conectar Live</>
              )}
            </button>
          </div>

          {connectionError && (
            <div className="w-full bg-rose-950/80 border border-rose-800 text-rose-300 px-3 py-1 rounded-lg text-[11px]">
              ⚠️ {connectionError}
            </div>
          )}
        </div>
      )}

      {/* Main Arena with Left & Right Top Donor Leaderboards */}
      <div className="relative flex flex-1 flex-col items-center justify-start p-3 lg:p-6 w-full max-w-7xl mx-auto">
        
        {/* 3-Column Layout: Left Donors | Center Arena | Right Donors */}
        <div className="flex flex-col lg:flex-row gap-4 w-full items-start justify-center">
          
          {/* Left Column: Top 10 Donors for Messi */}
          {!isObsOverlay && (
            <div className="flex flex-col w-full lg:w-64 rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-3 backdrop-blur-md shrink-0 shadow-lg">
              <div className="flex items-center gap-1.5 text-cyan-400 font-black text-xs uppercase mb-2 pb-1.5 border-b border-slate-800">
                <Crown className="h-3.5 w-3.5" />
                <span>Top 10 Donadores Messi</span>
              </div>
              <div className="space-y-1.5 max-h-64 lg:max-h-[420px] overflow-y-auto pr-1">
                {sortedMessiDonors.length === 0 ? (
                  <p className="text-[10px] text-slate-500 text-center py-4">Aún no hay donantes para Messi</p>
                ) : (
                  sortedMessiDonors.map((d, i) => (
                    <div key={d.username} className="flex items-center justify-between rounded-xl bg-slate-950 border border-slate-800/80 px-2.5 py-1 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className={`font-mono font-bold text-[10px] ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-slate-500'}`}>
                          #{i + 1}
                        </span>
                        <span className="font-bold text-white truncate text-[11px]">{d.name}</span>
                      </div>
                      <span className="font-mono font-bold text-cyan-400 shrink-0 text-[11px]">+{d.points}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Center Arena Cards */}
          <div className="flex-1 flex flex-col items-center w-full max-w-xl mx-auto">
            
            {/* Prominent Live Timer Display for Transmission & OBS */}
            <div className="mb-4 flex items-center justify-center">
              <div className={`flex items-center gap-2.5 rounded-2xl border-2 px-6 py-2.5 shadow-2xl backdrop-blur-md transition-all ${
                secondsLeft <= 30 
                  ? 'border-rose-600 bg-rose-950/85 text-rose-300 animate-pulse' 
                  : 'border-amber-500/60 bg-slate-900/90 text-amber-300'
              }`}>
                <TimerIcon className={`h-6 w-6 ${secondsLeft <= 30 ? 'animate-bounce text-rose-400' : 'text-amber-400'}`} />
                <span className="font-mono text-3xl sm:text-4xl font-black tracking-wider">
                  {formatTime(secondsLeft)}
                </span>
                {isTimerRunning && (
                  <span className="ml-2.5 flex h-3.5 w-3.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                  </span>
                )}
              </div>
            </div>

            <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              
              {/* LIONEL MESSI CARD */}
              <div className={`relative flex flex-col items-center rounded-3xl border-2 p-5 transition-all duration-300 backdrop-blur-xl ${
                players.messi.points >= players.cristiano.points 
                  ? 'border-cyan-500 bg-cyan-950/40 shadow-xl shadow-cyan-500/20 scale-102' 
                  : 'border-slate-800 bg-slate-900/60 opacity-90'
              }`}>
                <div className="absolute top-3 left-3 rounded-xl bg-cyan-950/90 border border-cyan-500/50 px-3 py-1 font-mono text-xs font-black text-cyan-300 shadow">
                  🏆 {messiMatchWins}
                </div>
                {players.messi.points > players.cristiano.points && (
                  <div className="absolute -top-3.5 flex items-center gap-1 rounded-full bg-cyan-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-lg">
                    <Crown className="h-3.5 w-3.5" /> Líder
                  </div>
                )}

                <div className="relative mb-3 h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full border-4 border-cyan-400 shadow-lg shadow-cyan-500/40">
                  <img src={players.messi.avatar} alt="Lionel Messi" className="h-full w-full object-cover" />
                </div>

                <h3 className="text-lg sm:text-xl font-black tracking-wide text-white uppercase mb-0.5">
                  {players.messi.name}
                </h3>
                <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest mb-3">
                  {players.messi.teamLabel}
                </p>

                <div className="w-full rounded-2xl bg-slate-950/80 border border-slate-800 p-3 text-center shadow-inner mb-2">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Puntos Totales</div>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-cyan-400">
                    {players.messi.points.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* CRISTIANO RONALDO CARD */}
              <div className={`relative flex flex-col items-center rounded-3xl border-2 p-5 transition-all duration-300 backdrop-blur-xl ${
                players.cristiano.points >= players.messi.points 
                  ? 'border-amber-500 bg-amber-950/40 shadow-xl shadow-amber-500/20 scale-102' 
                  : 'border-slate-800 bg-slate-900/60 opacity-90'
              }`}>
                <div className="absolute top-3 right-3 rounded-xl bg-amber-950/90 border border-amber-500/50 px-3 py-1 font-mono text-xs font-black text-amber-300 shadow">
                  🏆 {cristianoMatchWins}
                </div>
                {players.cristiano.points > players.messi.points && (
                  <div className="absolute -top-3.5 flex items-center gap-1 rounded-full bg-amber-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-lg">
                    <Crown className="h-3.5 w-3.5" /> Líder
                  </div>
                )}

                <div className="relative mb-3 h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full border-4 border-amber-400 shadow-lg shadow-amber-500/40">
                  <img src={players.cristiano.avatar} alt="Cristiano Ronaldo" className="h-full w-full object-cover" />
                </div>

                <h3 className="text-lg sm:text-xl font-black tracking-wide text-white uppercase mb-0.5">
                  {players.cristiano.name}
                </h3>
                <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mb-3">
                  {players.cristiano.teamLabel}
                </p>

                <div className="w-full rounded-2xl bg-slate-950/80 border border-slate-800 p-3 text-center shadow-inner mb-2">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Puntos Totales</div>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-amber-400">
                    {players.cristiano.points.toLocaleString()}
                  </div>
                </div>
              </div>

            </div>

            {/* Progress Bar */}
            <div className="w-full mt-4">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                <span className="text-cyan-400">Messi ({messiPercent}%)</span>
                <span className="text-amber-400">CR7 ({crPercent}%)</span>
              </div>
              <div className="h-4 w-full rounded-full bg-slate-900 border border-slate-800 p-0.5 flex overflow-hidden shadow-inner">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500" style={{ width: `${messiPercent}%` }} />
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-600 transition-all duration-500" style={{ width: `${crPercent}%` }} />
              </div>
            </div>

            {/* Gift Table / Panel */}
            <div className="mt-4 w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-3 backdrop-blur-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5 text-amber-400" />
                  <span>Tabla de Regalos Activos</span>
                </span>
                {!isObsOverlay && (
                  <button
                    onClick={() => setIsConfigOpen(true)}
                    className="text-[10px] text-cyan-400 hover:underline font-bold"
                  >
                    Configurar Regalos +
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {giftMappings.map((g, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-base">{g.icon}</span>
                      <span className="font-bold text-white truncate">{g.giftName}</span>
                    </div>
                    <span className="font-mono font-bold text-cyan-400 shrink-0">+{g.points}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* On-screen instruction banner below gift table */}
            <div className="mt-3 w-full rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-xs font-black uppercase tracking-wider text-amber-300 shadow-md backdrop-blur-md animate-pulse">
              💬 Escribe "Messi" o "CR7" en el chat y luego vota 🗳️
            </div>

            {/* Unobtrusive Vote Simulators placed below donation table as requested */}
            {!isObsOverlay && (
              <div className="mt-3 w-full rounded-xl bg-slate-900/40 border border-slate-800/60 px-3 py-2.5 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-center gap-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Simulador rápido:</span>
                  <button
                    onClick={() => addPoints('messi', 10, 'sim_messi_user', 'Simulador Messi', 'Rosa')}
                    className="rounded bg-cyan-950/60 border border-cyan-800/50 px-3 py-1 font-bold text-cyan-300 hover:bg-cyan-900/60 transition-all text-[11px]"
                  >
                    + Messi (+10 pts)
                  </button>
                  <button
                    onClick={() => addPoints('cristiano', 10, 'sim_cr7_user', 'Simulador CR7', 'Rosa')}
                    className="rounded bg-amber-950/60 border border-amber-800/50 px-3 py-1 font-bold text-amber-300 hover:bg-amber-900/60 transition-all text-[11px]"
                  >
                    + CR7 (+10 pts)
                  </button>
                </div>

                {/* Volume control & dedicated audio test buttons right below simulator */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
                    >
                      {soundEnabled ? <Volume2 className="h-4 w-4 text-cyan-400" /> : <VolumeX className="h-4 w-4 text-rose-500" />}
                      <span className="text-[10px] font-bold uppercase">{soundEnabled ? 'Audio' : 'Silenciado'}</span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Vol:</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={soundVolume}
                        onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                        className="w-20 accent-cyan-400 cursor-pointer"
                      />
                      <span className="text-[10px] font-mono font-bold text-cyan-400 w-7">{Math.round(soundVolume * 100)}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => playAudio('anda-pa-alla-bobo_fac96bf6.mp3')}
                      className="rounded bg-cyan-950/80 border border-cyan-500/50 px-2 py-1 text-[10px] font-bold text-cyan-300 hover:bg-cyan-900 transition-all"
                      title="Reproducir Andá pa' allá, bobo"
                    >
                      🗣️ Bobo
                    </button>
                    <button
                      onClick={() => playAudio('siuu_cristiano_8c1061b7.m4a')}
                      className="rounded bg-amber-950/80 border border-amber-500/50 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-900 transition-all"
                      title="Reproducir Siuuuu"
                    >
                      🔥 Siuuu
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Top 10 Donors for CR7 */}
          {!isObsOverlay && (
            <div className="flex flex-col w-full lg:w-64 rounded-2xl border border-amber-500/30 bg-slate-900/80 p-3 backdrop-blur-md shrink-0 shadow-lg">
              <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs uppercase mb-2 pb-1.5 border-b border-slate-800">
                <Crown className="h-3.5 w-3.5" />
                <span>Top 10 Donadores CR7</span>
              </div>
              <div className="space-y-1.5 max-h-64 lg:max-h-[420px] overflow-y-auto pr-1">
                {sortedCristianoDonors.length === 0 ? (
                  <p className="text-[10px] text-slate-500 text-center py-4">Aún no hay donantes para CR7</p>
                ) : (
                  sortedCristianoDonors.map((d, i) => (
                    <div key={d.username} className="flex items-center justify-between rounded-xl bg-slate-950 border border-slate-800/80 px-2.5 py-1 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className={`font-mono font-bold text-[10px] ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-slate-500'}`}>
                          #{i + 1}
                        </span>
                        <span className="font-bold text-white truncate text-[11px]">{d.name}</span>
                      </div>
                      <span className="font-mono font-bold text-amber-400 shrink-0 text-[11px]">+{d.points}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Configuration Modal with Gift Selector */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-cyan-400" />
                Configurar Puntos por Regalo
              </h3>
              <button onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-white text-sm font-bold">✕</button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {giftMappings.map((map, index) => (
                <div key={index} className="flex items-center justify-between gap-3 rounded-xl bg-slate-950 border border-slate-800 p-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xl">{map.icon}</span>
                    <select
                      value={map.giftName}
                      onChange={(e) => {
                        const selectedName = e.target.value;
                        const preset = COMMON_TIKTOK_GIFTS.find(g => g.giftName === selectedName) || { giftName: selectedName, points: map.points, icon: '🎁', coins: 1, label: selectedName };
                        setGiftMappings((prev) => {
                          const next = [...prev];
                          next[index] = { ...preset, points: map.points };
                          return next;
                        });
                      }}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-white focus:outline-none"
                    >
                      {COMMON_TIKTOK_GIFTS.map((cg) => (
                        <option key={cg.giftName} value={cg.giftName}>
                          {cg.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
                      className="w-20 rounded-lg bg-slate-900 border border-slate-700 px-3 py-1 text-right font-mono text-sm text-cyan-400 focus:outline-none"
                    />
                    <span className="text-xs font-semibold text-slate-400">pts</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsConfigOpen(false)}
                className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2 text-xs font-bold text-white shadow-lg"
              >
                Guardar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Over Celebration Modal */}
      {isMatchOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl border-2 border-amber-400 bg-slate-900 p-6 text-center shadow-2xl overflow-hidden">
            <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-cyan-500/20 blur-2xl"></div>
            <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-amber-500/20 blur-2xl"></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-500/40 px-4 py-1 text-xs font-black text-amber-300 uppercase tracking-widest mb-3">
                <Trophy className="h-4 w-4 text-amber-400 animate-bounce" />
                <span>¡FIN DEL PARTIDO!</span>
              </div>

              {players.messi.points > players.cristiano.points ? (
                <>
                  <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-1">
                    ¡GANA LIONEL MESSI!
                  </h2>
                  <p className="text-cyan-400 font-bold text-sm italic mb-4">
                    "¡Andá pa' allá, bobo!"
                  </p>
                  <div className="relative h-48 w-full max-w-xs rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-xl mb-4">
                    <img
                      src="/assets/aistudio/messi-celebrating-fifa-wc-2014-usagif.gif_2c2771bf.webp"
                      alt="Messi Celebration"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </>
              ) : players.cristiano.points > players.messi.points ? (
                <>
                  <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-1">
                    ¡GANA CRISTIANO RONALDO!
                  </h2>
                  <p className="text-amber-400 font-bold text-sm italic mb-4">
                    "¡Siuuu!"
                  </p>
                  <div className="relative h-48 w-full max-w-xs rounded-2xl overflow-hidden border-2 border-amber-400 shadow-xl mb-4">
                    <img
                      src="/assets/aistudio/portugal-football-cristiano-ronaldo-9rd9twk1304zrqmo_296b638a.webp"
                      alt="CR7 Celebration"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
                    ¡EMPATE ÉPICO!
                  </h2>
                </>
              )}

              <div className="flex gap-4 mb-5 w-full justify-center">
                <div className="rounded-2xl bg-cyan-950/60 border border-cyan-500/40 p-3 w-36 text-center">
                  <div className="text-[10px] text-cyan-300 uppercase font-bold">Messi</div>
                  <div className="text-2xl font-black font-mono text-cyan-400">{players.messi.points} pts</div>
                </div>
                <div className="rounded-2xl bg-amber-950/60 border border-amber-500/40 p-3 w-36 text-center">
                  <div className="text-[10px] text-amber-300 uppercase font-bold">CR7</div>
                  <div className="text-2xl font-black font-mono text-amber-400">{players.cristiano.points} pts</div>
                </div>
              </div>

              <button
                onClick={handleResetMatch}
                className="w-full max-w-xs rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 py-3 text-sm font-black uppercase tracking-wider text-white shadow-xl transition-all"
              >
                Nueva Batalla / Revancha 🔄
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
