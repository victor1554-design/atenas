import React, { useState } from 'react';
import {
  ColorDonorItem,
  ColorFrameTier,
  ColorTierTriggers,
  StreamSettings,
  TierTrigger,
  TriggerMode,
  TIKTOK_GIFTS,
  COLOR_TIER_PRIORITY,
  findTikTokGift,
  describeColorTrigger,
  PLOTTER_SOUNDS,
} from '../types/tiktok';
import { soundEngine } from '../utils/audio';
import { PRESET_AVATARS } from '../utils/avatarPresets';
import {
  Volume2,
  VolumeX,
  Copy,
  Check,
  Play,
  RotateCcw,
  Radio,
  Sliders,
  Upload,
  User,
  History,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface ColorPrinterConsoleProps {
  settings: StreamSettings;
  colorTierTriggers: ColorTierTriggers;
  onUpdateSettings: (newSettings: Partial<StreamSettings>) => void;
  onTriggerColorPrint: (
    tier: ColorFrameTier,
    customName?: string,
    customAvatar?: string,
    customActionText?: string,
    customIcon?: string
  ) => void;
  onClearQueue: () => void;
  recentDonors: ColorDonorItem[];
  isTikTokConnected: boolean;
  isConnecting?: boolean;
  connectionError?: string | null;
  onToggleTikTokConnection: () => void;
  totalLikesCount?: number;
  onSimulateLikes?: (count?: number) => void;
}

const COLOR_TIER_CARDS: {
  tier: ColorFrameTier;
  title: string;
  subtitle: string;
  boxClass: string;
  iconClass: string;
  badgeClass: string;
  buttonClass: string;
}[] = [
  {
    tier: 'bw_follow',
    title: '1. Blanco y Negro',
    subtitle: 'Seguir (+ Seguir)',
    boxClass: 'border border-stone-700 bg-stone-900/90',
    iconClass: 'bg-stone-950 border-stone-700',
    badgeClass: 'bg-red-600 text-white font-black',
    buttonClass: 'bg-stone-700 text-white hover:bg-stone-600',
  },
  {
    tier: 'color_rose',
    title: '2. Color Rosa',
    subtitle: 'Rosa (1 moneda)',
    boxClass: 'border border-pink-800/70 bg-gradient-to-br from-pink-950/50 to-slate-900',
    iconClass: 'bg-pink-900/50 border-pink-700/60',
    badgeClass: 'bg-pink-600 text-white font-bold',
    buttonClass: 'bg-pink-600 text-white hover:bg-pink-500',
  },
  {
    tier: 'frame_gold',
    title: '3. Marco Dorado',
    subtitle: 'Corazón Coreano (5)',
    boxClass: 'border border-amber-700/70 bg-gradient-to-br from-amber-950/50 to-slate-900',
    iconClass: 'bg-amber-900/50 border-amber-600/60',
    badgeClass: 'bg-amber-500 text-slate-950 font-black',
    buttonClass: 'bg-amber-500 text-slate-950 font-black hover:bg-amber-400',
  },
  {
    tier: 'frame_emerald',
    title: '4. Marco Esmeralda',
    subtitle: 'Collar / Rosa (10)',
    boxClass: 'border border-emerald-700/70 bg-gradient-to-br from-emerald-950/50 to-slate-900',
    iconClass: 'bg-emerald-900/50 border-emerald-600/60',
    badgeClass: 'bg-emerald-500 text-slate-950 font-black',
    buttonClass: 'bg-emerald-600 text-white font-bold hover:bg-emerald-500',
  },
  {
    tier: 'frame_azure',
    title: '5. Marco Diamante',
    subtitle: 'Rosquilla (30)',
    boxClass: 'border border-cyan-600/70 bg-gradient-to-br from-cyan-950/50 to-slate-900',
    iconClass: 'bg-cyan-900/50 border-cyan-500/60',
    badgeClass: 'bg-cyan-400 text-slate-950 font-black',
    buttonClass: 'bg-cyan-500 text-slate-950 font-black hover:bg-cyan-400',
  },
  {
    tier: 'frame_mythic',
    title: '6. Marco Místico VIP',
    subtitle: 'Corona / Gorra (99)',
    boxClass: 'border-2 border-fuchsia-500/80 bg-gradient-to-br from-purple-950/70 via-fuchsia-950/40 to-slate-900',
    iconClass: 'bg-fuchsia-500/20 border-fuchsia-400/70',
    badgeClass: 'bg-fuchsia-500 text-white font-black',
    buttonClass: 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-black hover:from-fuchsia-500 hover:to-purple-500 shadow',
  },
];

export const ColorPrinterConsole: React.FC<ColorPrinterConsoleProps> = ({
  settings,
  colorTierTriggers,
  onUpdateSettings,
  onTriggerColorPrint,
  onClearQueue,
  recentDonors,
  isTikTokConnected,
  isConnecting = false,
  connectionError = null,
  onToggleTikTokConnection,
  totalLikesCount = 0,
  onSimulateLikes,
}) => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'custom' | 'settings' | 'history'>('simulator');
  const [customUsername, setCustomUsername] = useState('denis_tiktok');
  const [customComment, setCustomComment] = useState('🌹 con Rose');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].dataUrl);
  const [copiedObsLink, setCopiedObsLink] = useState(false);

  const handleCopyObsLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?app=color_printer&overlay=1`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedObsLink(true);
      setTimeout(() => setCopiedObsLink(false), 2500);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedAvatar(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Top Header & TikTok Live Connection status */}
      <div className="border-b border-slate-800/80 bg-slate-950/80 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-fuchsia-500 animate-pulse" />
              Panel Impresora a Color (App 4)
            </h2>
            <p className="text-xs text-slate-400">
              Imprime 1 hoja a la vez: Seguir = B/N · Rosa = Color · Regalos = Marcos y Cuadro VIP
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyObsLink}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all"
              title="Copiar enlace transparente para OBS Studio o TikTok Live Studio"
            >
              {copiedObsLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedObsLink ? '¡Enlace Copiado!' : 'Copiar URL para OBS'}</span>
            </button>
          </div>
        </div>

        {/* Live TikTok Streamer Bar */}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 p-2">
          <div className="flex-1 flex items-center gap-2 px-2">
            <span className="text-xs font-bold text-slate-400">@</span>
            <input
              type="text"
              value={settings.tiktokUsername}
              onChange={(e) => onUpdateSettings({ tiktokUsername: e.target.value })}
              placeholder="tu_usuario_de_tiktok"
              disabled={isConnecting || isTikTokConnected}
              className="w-full bg-transparent text-xs font-semibold text-white placeholder-slate-500 focus:outline-none disabled:opacity-70"
            />
          </div>
          <button
            onClick={onToggleTikTokConnection}
            disabled={isConnecting}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              isConnecting
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-wait'
                : isTikTokConnected
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                : 'bg-rose-600 text-white hover:bg-rose-500'
            }`}
          >
            {isConnecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isTikTokConnected ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Radio className="h-3.5 w-3.5" />
            )}
            <span>
              {isConnecting
                ? 'Conectando...'
                : isTikTokConnected
                ? 'En Vivo (Desconectar)'
                : 'Conectar Live'}
            </span>
          </button>
        </div>

        {/* Status / Error feedback */}
        {connectionError && (
          <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-[11px] text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Error de conexión TikTok Live: </span>
              <span>{connectionError}</span>
            </div>
          </div>
        )}

        {isTikTokConnected && (
          <div className="mt-2.5 flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-[11px] text-emerald-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-bold text-emerald-200">
                  En Vivo (Solo App 4) con @{settings.tiktokUsername}
                </span>
              </div>
              <span className="flex items-center gap-1 font-mono font-bold text-rose-300 bg-rose-950/70 border border-rose-500/40 px-2.5 py-0.5 rounded-full text-[11px] shadow-sm">
                ❤️ {totalLikesCount.toLocaleString()} likes en vivo
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-emerald-900/40 text-[10px] text-slate-300">
              <span className="truncate">
                {COLOR_TIER_PRIORITY.map((t) => describeColorTrigger(t, colorTierTriggers[t])).join(' · ')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 px-3 pt-2 gap-1 text-xs font-medium">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-1.5 rounded-t-xl px-4 py-2 transition-colors ${
            activeTab === 'simulator'
              ? 'bg-slate-900 text-white font-bold border-t border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Play className="h-3.5 w-3.5" />
          <span>Disparador y Marcos (6)</span>
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex items-center gap-1.5 rounded-t-xl px-4 py-2 transition-colors ${
            activeTab === 'custom'
              ? 'bg-slate-900 text-white font-bold border-t border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>Donante Personalizado</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-1.5 rounded-t-xl px-4 py-2 transition-colors ${
            activeTab === 'settings'
              ? 'bg-slate-900 text-white font-bold border-t border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Ajustes & OBS</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 rounded-t-xl px-4 py-2 transition-colors ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white font-bold border-t border-x border-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Historial ({recentDonors.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* TAB 1: 6 FRAME TIERS CONFIGURATOR & SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Configuración de Seguir, Rosa y Marcos (6 Niveles del Video)
              </p>
              <button
                onClick={() =>
                  onUpdateSettings({
                    colorTierTriggers: { ...colorTierTriggers },
                    plotterSound: settings.plotterSound,
                    plotterVolume: settings.plotterVolume,
                  })
                }
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white"
              >
                Forzar actualización
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {COLOR_TIER_CARDS.map((card) => {
                const trigger = colorTierTriggers[card.tier];
                const gift = findTikTokGift(trigger.giftName);
                const icon =
                  trigger.mode === 'follow'
                    ? '➕'
                    : trigger.mode === 'likes'
                    ? '❤️'
                    : trigger.mode === 'text'
                    ? '💬'
                    : gift?.icon || '🎁';

                const updateTrigger = (patch: Partial<TierTrigger>) =>
                  onUpdateSettings({
                    colorTierTriggers: {
                      ...colorTierTriggers,
                      [card.tier]: { ...trigger, ...patch },
                    },
                  });

                const testActionText =
                  trigger.mode === 'follow'
                    ? 'Siguiendo'
                    : trigger.mode === 'likes'
                    ? `❤️ ${trigger.likes} likes`
                    : trigger.mode === 'text'
                    ? `💬 "${trigger.text}"`
                    : `${gift?.icon || '🎁'} con ${gift?.label || trigger.giftName}`;

                return (
                  <div key={card.tier} className={`flex flex-col justify-between rounded-2xl p-3.5 shadow-md ${card.boxClass}`}>
                    <div>
                      <div className="flex w-full items-center justify-between gap-1">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg border ${card.iconClass}`}>
                          {icon}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${card.badgeClass}`}>
                          {card.title}
                        </span>
                      </div>

                      <div className="mt-2 space-y-2">
                        <select
                          value={trigger.mode}
                          onChange={(e) => updateTrigger({ mode: e.target.value as TriggerMode })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white focus:outline-none focus:border-slate-500"
                        >
                          <option value="follow">➕ Seguir (Follow)</option>
                          <option value="gift">🎁 Regalo de TikTok</option>
                          <option value="likes">❤️ Corazones (likes)</option>
                          <option value="text">💬 Texto en el chat</option>
                        </select>

                        {trigger.mode === 'follow' && (
                          <div className="rounded-lg bg-slate-950/80 border border-slate-800 px-2.5 py-1.5 text-[11px] text-slate-300">
                            Se activa cada vez que un espectador da <strong>+ Seguir</strong>
                          </div>
                        )}

                        {trigger.mode === 'likes' && (
                          <label className="flex items-center gap-2 text-xs text-slate-300">
                            <span>Mínimo</span>
                            <input
                              type="number"
                              min={1}
                              value={trigger.likes}
                              onChange={(e) => updateTrigger({ likes: Math.max(1, Number(e.target.value) || 1) })}
                              className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white focus:outline-none"
                            />
                            <span>❤️</span>
                          </label>
                        )}

                        {trigger.mode === 'text' && (
                          <input
                            type="text"
                            value={trigger.text}
                            onChange={(e) => updateTrigger({ text: e.target.value })}
                            placeholder="Ej: yo"
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white focus:outline-none"
                          />
                        )}

                        {trigger.mode === 'gift' && (
                          <select
                            value={trigger.giftName}
                            onChange={(e) => updateTrigger({ giftName: e.target.value })}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white focus:outline-none"
                          >
                            {TIKTOK_GIFTS.map((g) => (
                              <option key={g.name} value={g.name}>
                                {g.icon} {g.label} ({g.coins})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        trigger.mode === 'likes' && onSimulateLikes
                          ? onSimulateLikes(trigger.likes)
                          : onTriggerColorPrint(card.tier, undefined, undefined, testActionText, icon)
                      }
                      className={`mt-3 w-full rounded-xl py-1.5 text-xs font-bold transition-all active:scale-95 ${card.buttonClass}`}
                    >
                      Probar {card.title}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOM DONOR */}
        {activeTab === 'custom' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Nombre de Usuario de TikTok</label>
              <div className="mt-1 flex items-center rounded-xl border border-slate-700 bg-slate-800 px-3 py-2">
                <span className="text-slate-400 font-bold">@</span>
                <input
                  type="text"
                  value={customUsername}
                  onChange={(e) => setCustomUsername(e.target.value)}
                  className="ml-1 w-full bg-transparent text-sm font-semibold text-white focus:outline-none"
                  placeholder="usuario_donante"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Subtítulo en la Hoja Impresa</label>
              <input
                type="text"
                value={customComment}
                onChange={(e) => setCustomComment(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
                placeholder="Ej: Siguiendo / 🌹 con Rose"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-2 block">
                Selecciona Avatar o Sube una Foto
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {PRESET_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    onClick={() => setSelectedAvatar(av.dataUrl)}
                    className={`relative shrink-0 rounded-full p-0.5 transition-all ${
                      selectedAvatar === av.dataUrl
                        ? 'ring-2 ring-rose-500 scale-105'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={av.dataUrl} alt={av.name} className="h-11 w-11 rounded-full object-cover" />
                  </button>
                ))}

                <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-dashed border-slate-600 bg-slate-800 text-slate-400 hover:text-white hover:border-slate-400 transition-colors">
                  <Upload className="h-4 w-4" />
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="pt-2">
              <label className="text-xs font-semibold text-slate-400 mb-2 block">
                Imprimir Hoja Individual con Marco:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COLOR_TIER_CARDS.map((card) => (
                  <button
                    key={card.tier}
                    onClick={() =>
                      onTriggerColorPrint(
                        card.tier,
                        customUsername,
                        selectedAvatar,
                        card.tier === 'bw_follow' ? 'Siguiendo' : customComment
                      )
                    }
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition-all ${card.buttonClass}`}
                  >
                    <span>{card.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SETTINGS & OBS */}
        {activeTab === 'settings' && (
          <div className="space-y-5">
            {/* Audio Toggle & Volume */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  {settings.soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-slate-500" />
                  )}
                  <span>Sonidos de Impresora y Fanfarria</span>
                </div>
                <button
                  onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    settings.soundEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {settings.soundEnabled ? 'Activado' : 'Silencio'}
                </button>
              </div>

              {settings.soundEnabled && (
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Volumen general</span>
                    <span className="font-mono">{Math.round(settings.soundVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={settings.soundVolume}
                    onChange={(e) => onUpdateSettings({ soundVolume: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Printer sound picker */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <div>
                <div className="text-sm font-semibold text-slate-200">Sonido del Motor al Imprimir 🖨️</div>
                <div className="text-xs text-slate-400">Elige el sonido mientras sale la hoja de la impresora</div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {PLOTTER_SOUNDS.map((sound) => (
                  <button
                    key={sound.id}
                    title={sound.description}
                    onClick={() => {
                      onUpdateSettings({ plotterSound: sound.id });
                      soundEngine.setPlotterSound(sound.id);
                      soundEngine.previewDrawingSound();
                    }}
                    className={`rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition-all ${
                      settings.plotterSound === sound.id
                        ? 'bg-cyan-600 text-white border border-cyan-400 shadow'
                        : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {sound.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear queue */}
            <div className="pt-2">
              <button
                onClick={onClearQueue}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-900/60 bg-rose-950/30 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-900/50 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Vaciar Cola de Impresión</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {recentDonors.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-8">
                Aún no hay hojas impresas registradas en esta sesión.
              </p>
            ) : (
              recentDonors.map((donor) => (
                <div
                  key={donor.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={donor.avatarUrl}
                      alt={donor.displayName}
                      className={`h-9 w-9 rounded-full object-cover border border-slate-700 ${
                        donor.frameTier === 'bw_follow' ? 'grayscale' : ''
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold text-white">{donor.displayName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <span>{donor.actionText}</span>
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-amber-400 font-bold">
                    {donor.coins > 0 ? `+${donor.coins}` : 'FOLLOW'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
