import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DonorItem,
  GiftTier,
  PRESET_GIFTS,
  StreamSettings,
  TierTriggers,
  DEFAULT_TIER_TRIGGERS,
  TIER_PRIORITY,
  ColorDonorItem,
  ColorFrameTier,
  ColorTierTriggers,
  DEFAULT_COLOR_TIER_TRIGGERS,
  COLOR_TIER_PRIORITY,
  findTikTokGift,
  triggerCaption,
} from './types/tiktok';
import { PRESET_AVATARS } from './utils/avatarPresets';
import { soundEngine } from './utils/audio';
import { ContinuousPrinter, PaperRow, PrintedItem, PaperRowType } from './components/ContinuousPrinter';
import { StreamerConsole } from './components/StreamerConsole';
import { ColorPhotoPrinter } from './components/ColorPhotoPrinter';
import { ColorPrinterConsole } from './components/ColorPrinterConsole';
import { HeaderNav } from './components/HeaderNav';
import { RulesModal } from './components/RulesModal';
import { ObsGuideModal } from './components/ObsGuideModal';
import { AppSelector, ActiveAppId } from './components/AppSelector';
import { SouthAmericanClubBattleApp } from './components/soccer/SouthAmericanClubBattleApp';
import { Cr7MessiBattleApp } from './components/soccer/Cr7MessiBattleApp';
import { Sparkles, Printer } from 'lucide-react';

// Only the latest printed rows are kept: older ones scroll off and are dropped (real-time only, no history)
const MAX_VISIBLE_ROWS = 6;

// Settings the OBS overlay (separate browser) must mirror from the panel
const SHARED_SETTING_KEYS: (keyof StreamSettings)[] = [
  'tierTriggers',
  'colorTierTriggers',
  'plotterSound',
  'plotterVolume',
];

const INITIAL_WALL_ITEMS: ColorDonorItem[] = [
  // Left 2x2 Grid (Slots 0..3): Exclusively Blanco y Negro (bw_follow)
  {
    id: 'wall_1',
    username: 'alexis_c',
    displayName: 'Alexis Carbajal',
    avatarUrl: PRESET_AVATARS[1].dataUrl,
    frameTier: 'bw_follow',
    giftName: 'Seguir',
    giftIcon: '➕',
    coins: 0,
    timestamp: Date.now() - 60000,
    actionText: 'Siguiendo',
  },
  {
    id: 'wall_2',
    username: 'mariana_live',
    displayName: 'MARIANA',
    avatarUrl: PRESET_AVATARS[4].dataUrl,
    frameTier: 'bw_follow',
    giftName: 'Seguir',
    giftIcon: '➕',
    coins: 0,
    timestamp: Date.now() - 55000,
    actionText: 'Siguiendo',
  },
  {
    id: 'wall_3',
    username: 'carlos_bw',
    displayName: 'Carlos M.',
    avatarUrl: PRESET_AVATARS[2].dataUrl,
    frameTier: 'bw_follow',
    giftName: 'Seguir',
    giftIcon: '➕',
    coins: 0,
    timestamp: Date.now() - 50000,
    actionText: 'Siguiendo',
  },
  {
    id: 'wall_4',
    username: 'lucia_tk',
    displayName: 'Lucía G.',
    avatarUrl: PRESET_AVATARS[0].dataUrl,
    frameTier: 'bw_follow',
    giftName: 'Seguir',
    giftIcon: '➕',
    coins: 0,
    timestamp: Date.now() - 45000,
    actionText: 'Siguiendo',
  },
  // Right 2x2 Grid (Slots 4..7): Fixed positions for Rosa (4), Dorado (5), Esmeralda (6), Diamante (7)
  {
    id: 'wall_5',
    username: 'denis_rose',
    displayName: 'Denis 🍓',
    avatarUrl: PRESET_AVATARS[0].dataUrl,
    frameTier: 'color_rose',
    giftName: 'Rosa',
    giftIcon: '🌹',
    coins: 1,
    timestamp: Date.now() - 40000,
    actionText: '🌹 con Rose',
  },
  {
    id: 'wall_6',
    username: 'antonio_hd',
    displayName: 'Antonio El Hijo',
    avatarUrl: PRESET_AVATARS[5].dataUrl,
    frameTier: 'frame_gold',
    giftName: 'Corazón coreano',
    giftIcon: '🫰',
    coins: 5,
    timestamp: Date.now() - 35000,
    actionText: '🫰 con Corazón (5)',
  },
  {
    id: 'wall_7',
    username: 'yeison_tc',
    displayName: 'Yeison TC',
    avatarUrl: PRESET_AVATARS[2].dataUrl,
    frameTier: 'frame_emerald',
    giftName: 'Collar de amistad',
    giftIcon: '📿',
    coins: 10,
    timestamp: Date.now() - 30000,
    actionText: '📿 con Collar (10)',
  },
  {
    id: 'wall_8',
    username: 'jeffrey_vip',
    displayName: 'jeffrey',
    avatarUrl: PRESET_AVATARS[3].dataUrl,
    frameTier: 'frame_azure',
    giftName: 'Rosquilla',
    giftIcon: '🍩',
    coins: 30,
    timestamp: Date.now() - 25000,
    actionText: '🍩 con Rosquilla',
  },
];

const INITIAL_VIP_CENTER: ColorDonorItem = {
  id: 'vip_init',
  username: 'lowkey.v03',
  displayName: 'lowkey.v03',
  avatarUrl: PRESET_AVATARS[3].dataUrl,
  frameTier: 'frame_mythic',
  giftName: 'Corona',
  giftIcon: '👑',
  coins: 99,
  timestamp: Date.now() - 120000,
  actionText: '👑 con Corona VIP',
};

export default function App() {
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isUrlOverlay = urlParams?.get('overlay') === '1';
  const initialApp = (urlParams?.get('app') as ActiveAppId) || 'printer';

  const [activeApp, setActiveApp] = useState<ActiveAppId>(initialApp);
  const activeAppRef = useRef<ActiveAppId>(activeApp);
  activeAppRef.current = activeApp;

  const [settings, setSettings] = useState<StreamSettings>({
    tiktokUsername: 'amyhan_stream',
    conveyorSpeed: 60,
    soundEnabled: true,
    soundVolume: 0.6,
    showBrushCursor: true,
    autoSimulateRandomDonations: false,
    obsMode: isUrlOverlay,
    conveyorPosition: 'center',
    bannerText: '¡Impresora continua de fotos en vivo TikTok!',
    drawOnLikes: true,
    likesThreshold: 1,
    tierTriggers: DEFAULT_TIER_TRIGGERS,
    colorTierTriggers: DEFAULT_COLOR_TIER_TRIGGERS,
    plotterSound: 'pencil',
    plotterVolume: 0.8,
  });

  // ---------------- APP 1 STATE (Plotter Continuo) ----------------
  const [activeDrawing, setActiveDrawing] = useState<DonorItem | null>(null);
  const [activeRowItems, setActiveRowItems] = useState<PrintedItem[]>([]);
  const [activeRowType, setActiveRowType] = useState<PaperRowType>('trio_row');
  const [drawingQueue, setDrawingQueue] = useState<DonorItem[]>([]);
  const [completedRows, setCompletedRows] = useState<PaperRow[]>([]);
  const [recentDonors, setRecentDonors] = useState<DonorItem[]>([]);

  // ---------------- APP 4 STATE (Impresora a Color 1 a 1) ----------------
  const [colorActiveDonor, setColorActiveDonor] = useState<ColorDonorItem | null>(null);
  const [colorQueue, setColorQueue] = useState<ColorDonorItem[]>([]);
  const [colorPrintedCount, setColorPrintedCount] = useState<number>(1701);
  const [colorWallItems, setColorWallItems] = useState<ColorDonorItem[]>(INITIAL_WALL_ITEMS);
  const [colorVipItem, setColorVipItem] = useState<ColorDonorItem>(INITIAL_VIP_CENTER);
  const [colorRecentDonors, setColorRecentDonors] = useState<ColorDonorItem[]>([]);

  // ---------------- INDEPENDENT PER-APP CONNECTION STATE ----------------
  const [connectionsByApp, setConnectionsByApp] = useState<
    Record<
      ActiveAppId,
      {
        isConnected: boolean;
        isConnecting: boolean;
        error: string | null;
        totalLikes: number;
      }
    >
  >({
    printer: { isConnected: false, isConnecting: false, error: null, totalLikes: 0 },
    soccer: { isConnected: false, isConnecting: false, error: null, totalLikes: 0 },
    cr7: { isConnected: false, isConnecting: false, error: null, totalLikes: 0 },
    color_printer: { isConnected: false, isConnecting: false, error: null, totalLikes: 0 },
  });

  const [usernamesByApp, setUsernamesByApp] = useState<Record<ActiveAppId, string>>({
    printer: 'amyhan_stream',
    soccer: 'amyhan_stream',
    cr7: 'amyhan_stream',
    color_printer: 'amyhan_stream',
  });

  const currentAppConnection = connectionsByApp[activeApp];
  const isTikTokConnected = currentAppConnection.isConnected;
  const isConnecting = currentAppConnection.isConnecting;
  const connectionError = currentAppConnection.error;
  const totalLikesCount = currentAppConnection.totalLikes;

  const updateAppConnection = useCallback(
    (
      appId: ActiveAppId,
      patch: Partial<{
        isConnected: boolean;
        isConnecting: boolean;
        error: string | null;
        totalLikes: number;
      }>
    ) => {
      setConnectionsByApp((prev) => ({
        ...prev,
        [appId]: { ...prev[appId], ...patch },
      }));
    },
    []
  );

  const likeBuckets = useRef<
    Record<string, { count: number; avatarUrl: string; displayName: string; timer?: ReturnType<typeof setTimeout> }>
  >({});
  const colorLikeBuckets = useRef<
    Record<string, { count: number; avatarUrl: string; displayName: string; timer?: ReturnType<typeof setTimeout> }>
  >({});

  const triggersRef = useRef<TierTriggers>(settings.tierTriggers);
  triggersRef.current = settings.tierTriggers;

  const colorTriggers = settings.colorTierTriggers || DEFAULT_COLOR_TIER_TRIGGERS;
  const colorTriggersRef = useRef<ColorTierTriggers>(colorTriggers);
  colorTriggersRef.current = colorTriggers;

  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);
  const [isObsGuideModalOpen, setIsObsGuideModalOpen] = useState<boolean>(false);

  // Sync sound engine with settings
  useEffect(() => {
    soundEngine.setEnabled(settings.soundEnabled);
    soundEngine.setVolume(settings.soundVolume);
    soundEngine.setPlotterSound(settings.plotterSound);
    soundEngine.setPlotterVolume(settings.plotterVolume);
  }, [settings.soundEnabled, settings.soundVolume, settings.plotterSound, settings.plotterVolume]);

  const updateSettings = (newSettings: Partial<StreamSettings>) => {
    if (typeof newSettings.tiktokUsername === 'string') {
      const targetApp = activeAppRef.current;
      setUsernamesByApp((prev) => ({
        ...prev,
        [targetApp]: newSettings.tiktokUsername!,
      }));
    }
    setSettings((prev) => ({ ...prev, ...newSettings }));
    const shared = Object.fromEntries(
      Object.entries(newSettings).filter(([key]) => SHARED_SETTING_KEYS.includes(key as keyof StreamSettings))
    );
    if (Object.keys(shared).length > 0) {
      fetch('/api/shared-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shared),
      }).catch(() => {});
    }
  };

  const activeSettings: StreamSettings = {
    ...settings,
    tiktokUsername: usernamesByApp[activeApp] ?? settings.tiktokUsername,
  };

  // Load the shared settings saved on the server (set from the panel)
  useEffect(() => {
    fetch('/api/shared-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === 'object') setSettings((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});
  }, []);

  // ============================================================================
  // APP 1 LOGIC: PLOTTER CONTINUO
  // ============================================================================
  const processNextInQueue = useCallback((remainingItems: PrintedItem[] = []) => {
    setDrawingQueue((prevQueue) => {
      if (prevQueue.length === 0) {
        setActiveDrawing(null);
        return [];
      }
      const [nextDonor, ...rest] = prevQueue;
      if (nextDonor.giftTier === 'big_gift') {
        setActiveRowType('big_goot_row');
      } else if (nextDonor.giftTier === 'donut' || remainingItems.some((i) => i.giftTier === 'donut')) {
        setActiveRowType('duo_row');
      } else {
        setActiveRowType('trio_row');
      }
      setActiveDrawing(nextDonor);
      return rest;
    });
  }, []);

  useEffect(() => {
    if (!activeDrawing) return;
    if (activeDrawing.giftTier === 'big_gift') {
      if (activeRowType !== 'big_goot_row') {
        setActiveRowType('big_goot_row');
      }
    } else if (activeDrawing.giftTier === 'donut') {
      if (activeRowItems.length >= 2) {
        soundEngine.playPaperFeedSound();
        const flushedRow: PaperRow = {
          id: `row_${Date.now()}_flush_med`,
          type: activeRowItems.some((i) => i.giftTier === 'donut') ? 'duo_row' : 'trio_row',
          items: activeRowItems,
          maxItems: activeRowItems.some((i) => i.giftTier === 'donut') ? 2 : 3,
        };
        setCompletedRows((prev) => [flushedRow, ...prev].slice(0, MAX_VISIBLE_ROWS));
        setActiveRowItems([]);
      }
      if (activeRowType !== 'duo_row') {
        setActiveRowType('duo_row');
      }
    } else {
      const shouldBeDuo = activeRowItems.some((i) => i.giftTier === 'donut');
      const targetType: PaperRowType = shouldBeDuo ? 'duo_row' : 'trio_row';
      if (activeRowType !== targetType) {
        setActiveRowType(targetType);
      }
    }
  }, [activeDrawing, activeRowItems, activeRowType]);

  const handleTriggerGift = useCallback(
    (
      tier: GiftTier,
      customName?: string,
      customAvatar?: string,
      customComment?: string,
      customIcon?: string,
      customGiftName?: string
    ) => {
      const giftDef = PRESET_GIFTS.find((g) => g.tier === tier) || PRESET_GIFTS[0];
      const randomAvatar = PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)];
      const sampleNames = [
        'kaylalai5',
        'p_r69',
        'Thai_Mark',
        'osama_wag',
        'xs_binod',
        'NOOR_vip',
        'carlos_live',
        'sofia_star',
      ];
      const donorUsername =
        customName?.trim() ||
        sampleNames[Math.floor(Math.random() * sampleNames.length)];

      const newDonor: DonorItem = {
        id: `donor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        username: donorUsername,
        avatarUrl: customAvatar || randomAvatar.dataUrl,
        giftTier: tier,
        giftName: customGiftName || triggerCaption(triggersRef.current[tier]),
        coins: giftDef.coins,
        giftIcon: customIcon || giftDef.icon,
        timestamp: Date.now(),
        comment: customComment,
        status: 'drawing',
      };

      if (!activeDrawing) {
        if (tier === 'big_gift') {
          setActiveRowType('big_goot_row');
        } else if (tier === 'donut') {
          if (activeRowItems.length >= 2) {
            soundEngine.playPaperFeedSound();
            const flushedRow: PaperRow = {
              id: `row_${Date.now()}_flush_med`,
              type: activeRowItems.some((i) => i.giftTier === 'donut') ? 'duo_row' : 'trio_row',
              items: activeRowItems,
              maxItems: activeRowItems.some((i) => i.giftTier === 'donut') ? 2 : 3,
            };
            setCompletedRows((prev) => [flushedRow, ...prev].slice(0, MAX_VISIBLE_ROWS));
            setActiveRowItems([]);
          }
          setActiveRowType('duo_row');
        } else if (activeRowItems.some((i) => i.giftTier === 'donut')) {
          setActiveRowType('duo_row');
        } else {
          setActiveRowType('trio_row');
        }
        setActiveDrawing(newDonor);
      } else {
        if (tier === 'big_gift') {
          setDrawingQueue((prev) => [newDonor, ...prev]);
        } else {
          setDrawingQueue((prev) => [...prev, newDonor]);
        }
      }
    },
    [activeDrawing, activeRowItems]
  );

  const handleDrawingComplete = (completedDonor: DonorItem, finalDataUrl: string) => {
    const isBig = completedDonor.giftTier === 'big_gift';
    const isMed = completedDonor.giftTier === 'donut';

    const newItem: PrintedItem = {
      ...completedDonor,
      drawnCanvasDataUrl: finalDataUrl,
      status: 'completed',
      slotSize: isBig ? 195 : isMed ? 96 : 72,
      colIndex: activeRowItems.length,
    };

    setRecentDonors((prev) => [completedDonor, ...prev.slice(0, 9)]);

    if (isBig) {
      if (activeRowItems.length > 0) {
        const flushedRow: PaperRow = {
          id: `row_${Date.now()}_flush`,
          type: activeRowItems.some((i) => i.giftTier === 'donut') ? 'duo_row' : 'trio_row',
          items: activeRowItems,
          maxItems: activeRowItems.some((i) => i.giftTier === 'donut') ? 2 : 3,
        };
        setCompletedRows((prev) => [flushedRow, ...prev].slice(0, MAX_VISIBLE_ROWS));
      }

      const spacerRow: PaperRow = {
        id: `spacer_${Date.now()}`,
        type: 'blank_spacer',
        items: [],
        maxItems: 1,
      };
      const bigRow: PaperRow = {
        id: `row_${Date.now()}_big`,
        type: 'big_goot_row',
        items: [{ ...newItem, colIndex: 0 }],
        maxItems: 1,
      };

      setCompletedRows((prev) => [bigRow, spacerRow, ...prev].slice(0, MAX_VISIBLE_ROWS));
      setActiveRowItems([]);
      setActiveRowType('trio_row');
      processNextInQueue([]);
      return;
    }

    const updatedActiveItems = [...activeRowItems, newItem];
    const hasMedInRow = isMed || activeRowType === 'duo_row' || updatedActiveItems.some((i) => i.giftTier === 'donut');
    const currentRowTargetMax = hasMedInRow ? 2 : 3;

    if (updatedActiveItems.length >= currentRowTargetMax) {
      soundEngine.playPaperFeedSound();

      const newFullRow: PaperRow = {
        id: `row_${Date.now()}`,
        type: currentRowTargetMax === 2 ? 'duo_row' : 'trio_row',
        items: updatedActiveItems,
        maxItems: currentRowTargetMax,
      };

      setCompletedRows((prev) => [newFullRow, ...prev].slice(0, MAX_VISIBLE_ROWS));
      setActiveRowItems([]);
      setActiveRowType('trio_row');
      processNextInQueue([]);
    } else {
      setActiveRowItems(updatedActiveItems);
      if (hasMedInRow) {
        setActiveRowType('duo_row');
      }
      processNextInQueue(updatedActiveItems);
    }
  };

  const handleClearQueue = () => {
    setDrawingQueue([]);
    setActiveRowItems([]);
    setCompletedRows([]);
    setActiveDrawing(null);
  };

  // ============================================================================
  // APP 4 LOGIC: IMPRESORA A COLOR (1 HOJA A LA VEZ + MARCOS)
  // ============================================================================
  const handleTriggerColorPrint = useCallback(
    (
      tier: ColorFrameTier,
      customName?: string,
      customAvatar?: string,
      customActionText?: string,
      customIcon?: string
    ) => {
      const randomAvatar = PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)];
      const sampleNames = [
        'Denis 🍓',
        'Alexis Carbajal',
        'Yeison TC',
        'MARIANA',
        'Angie:3',
        'saltiel',
        'Antonio El Hijo',
        'RaulCastroJimenez',
      ];
      const displayName =
        customName?.trim() ||
        sampleNames[Math.floor(Math.random() * sampleNames.length)];

      const trigger = colorTriggersRef.current[tier];
      const giftDef = findTikTokGift(trigger.giftName);
      const defaultCoinsMap: Record<ColorFrameTier, number> = {
        bw_follow: 0,
        color_rose: 1,
        frame_gold: 5,
        frame_emerald: 10,
        frame_azure: 30,
        frame_mythic: 99,
      };
      const coins =
        trigger.mode === 'gift' && giftDef
          ? giftDef.coins
          : defaultCoinsMap[tier];

      const defaultIcon =
        trigger.mode === 'follow'
          ? '➕'
          : trigger.mode === 'likes'
          ? '❤️'
          : trigger.mode === 'text'
          ? '💬'
          : giftDef?.icon || '🌹';

      const defaultAction =
        trigger.mode === 'follow'
          ? 'Siguiendo'
          : trigger.mode === 'likes'
          ? `❤️ ${trigger.likes} likes`
          : trigger.mode === 'text'
          ? `💬 "${trigger.text}"`
          : `${giftDef?.icon || '🌹'} con ${giftDef?.label || trigger.giftName}`;

      const newColorDonor: ColorDonorItem = {
        id: `cprint_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        username: displayName.toLowerCase().replace(/\s+/g, '_'),
        displayName,
        avatarUrl: customAvatar || randomAvatar.dataUrl,
        frameTier: tier,
        giftName: giftDef?.label || trigger.giftName || 'Seguir',
        giftIcon: customIcon || defaultIcon,
        coins,
        timestamp: Date.now(),
        actionText: customActionText || defaultAction,
      };

      const COLOR_TIER_PRIORITY_RANK: Record<ColorFrameTier, number> = {
        frame_mythic: 6,  // 1° Prioridad máxima: Marco Místico (VIP)
        frame_azure: 5,   // 2° Prioridad: Marco Diamante
        frame_emerald: 4, // 3° Prioridad: Marco Esmeralda
        frame_gold: 3,    // 4° Prioridad: Marco Dorado
        color_rose: 2,    // 5° Prioridad: Color Rosa
        bw_follow: 1,     // 6° Prioridad: Blanco y Negro
      };

      setColorActiveDonor((currentActive) => {
        if (!currentActive) {
          return newColorDonor;
        }
        // Cola con prioridad estricta por jerarquía de marco (y orden de llegada dentro del mismo nivel)
        setColorQueue((prev) => {
          const newRank = COLOR_TIER_PRIORITY_RANK[newColorDonor.frameTier];
          const insertIdx = prev.findIndex(
            (item) => COLOR_TIER_PRIORITY_RANK[item.frameTier] < newRank
          );
          if (insertIdx === -1) {
            return [...prev, newColorDonor];
          }
          return [
            ...prev.slice(0, insertIdx),
            newColorDonor,
            ...prev.slice(insertIdx),
          ];
        });
        return currentActive;
      });
    },
    []
  );

  const handleColorPrintComplete = useCallback((completed: ColorDonorItem, slotIndex?: number) => {
    setColorPrintedCount((prev) => prev + 1);
    setColorRecentDonors((prev) => [completed, ...prev.slice(0, 14)]);

    if (completed.frameTier === 'frame_mythic') {
      setColorVipItem(completed);
    } else {
      const tierFixedSlot: Record<Exclude<ColorFrameTier, 'frame_mythic'>, number> = {
        bw_follow: 0,
        color_rose: 4,
        frame_gold: 5,
        frame_emerald: 6,
        frame_azure: 7,
      };
      const fixedSlot = tierFixedSlot[completed.frameTier];
      setColorWallItems((prev) => {
        const next = [...prev];
        const targetIdx = typeof slotIndex === 'number' ? slotIndex : fixedSlot;
        next[targetIdx] = completed;
        return next;
      });
    }

    setColorQueue((prevQueue) => {
      if (prevQueue.length === 0) {
        setColorActiveDonor(null);
        return [];
      }
      const [next, ...rest] = prevQueue;
      setColorActiveDonor(next);
      return rest;
    });
  }, []);

  const handleClearColorQueue = () => {
    setColorQueue([]);
    setColorActiveDonor(null);
  };

  const triggerGiftRef = useRef(handleTriggerGift);
  triggerGiftRef.current = handleTriggerGift;

  const triggerColorPrintRef = useRef(handleTriggerColorPrint);
  triggerColorPrintRef.current = handleTriggerColorPrint;

  const LIKE_SETTLE_MS = 2500;
  const registerLikes = useCallback(
    (username: string, displayName: string, avatarUrl: string, count: number) => {
      const key = (username || 'espectador').toLowerCase().trim();
      const bucket = likeBuckets.current[key] || { count: 0, avatarUrl: '', displayName };
      bucket.count += count;
      if (avatarUrl) bucket.avatarUrl = avatarUrl;
      if (displayName) bucket.displayName = displayName;
      if (bucket.timer) clearTimeout(bucket.timer);

      bucket.timer = setTimeout(() => {
        const triggers = triggersRef.current;
        const tier = TIER_PRIORITY.find(
          (t) => triggers[t].mode === 'likes' && bucket.count >= triggers[t].likes
        );
        if (!tier) return;
        triggerGiftRef.current(
          tier,
          bucket.displayName,
          bucket.avatarUrl || undefined,
          `❤️ ${bucket.count} likes en pantalla`,
          '❤️',
          `${bucket.count} likes`
        );
        delete likeBuckets.current[key];
      }, LIKE_SETTLE_MS);

      likeBuckets.current[key] = bucket;
    },
    []
  );

  const registerColorLikes = useCallback(
    (username: string, displayName: string, avatarUrl: string, count: number) => {
      const key = (username || 'espectador').toLowerCase().trim();
      const bucket = colorLikeBuckets.current[key] || { count: 0, avatarUrl: '', displayName };
      bucket.count += count;
      if (avatarUrl) bucket.avatarUrl = avatarUrl;
      if (displayName) bucket.displayName = displayName;
      if (bucket.timer) clearTimeout(bucket.timer);

      bucket.timer = setTimeout(() => {
        const triggers = colorTriggersRef.current;
        const tier = COLOR_TIER_PRIORITY.find(
          (t) => triggers[t].mode === 'likes' && bucket.count >= triggers[t].likes
        );
        if (!tier) return;
        triggerColorPrintRef.current(
          tier,
          bucket.displayName,
          bucket.avatarUrl || undefined,
          `❤️ ${bucket.count} likes`,
          '❤️'
        );
        delete colorLikeBuckets.current[key];
      }, LIKE_SETTLE_MS);

      colorLikeBuckets.current[key] = bucket;
    },
    []
  );

  // Real-time TikTok Live SSE (Server-Sent Events) listener strictly scoped to the activeApp
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;
    const subscribedApp = activeApp;

    function connectSSE() {
      eventSource = new EventSource(`/api/tiktok/stream?app=${encodeURIComponent(subscribedApp)}`);

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'shared-settings') {
            if (parsed.data && typeof parsed.data === 'object') {
              setSettings((prev) => ({ ...prev, ...parsed.data }));
            }
            return;
          }

          // Ignore any event that is not for the currently active app
          if (parsed.appId && parsed.appId !== subscribedApp) {
            return;
          }
          if (activeAppRef.current !== subscribedApp) {
            return;
          }

          if (parsed.type === 'status' || parsed.type === 'connected') {
            const connected = !!parsed.data?.isConnected;
            const err = parsed.data?.lastError || null;
            updateAppConnection(subscribedApp, {
              isConnected: connected,
              error: connected ? null : err,
            });
            if (parsed.data?.username) {
              setUsernamesByApp((prev) => ({
                ...prev,
                [subscribedApp]: parsed.data.username,
              }));
            }
            if (parsed.type === 'connected') {
              if (subscribedApp === 'printer') {
                likeBuckets.current = {};
                handleClearQueue();
              } else if (subscribedApp === 'color_printer') {
                colorLikeBuckets.current = {};
                handleClearColorQueue();
              }
            }
          } else if (parsed.type === 'disconnected') {
            updateAppConnection(subscribedApp, { isConnected: false });
          } else if (parsed.type === 'error') {
            updateAppConnection(subscribedApp, {
              isConnected: false,
              error: parsed.data?.error || 'Error de conexión con TikTok Live',
            });
          } else if (subscribedApp === 'printer') {
            // ================= APP 1 ONLY: PLOTTER CONTINUO =================
            if (parsed.type === 'follow') {
              const follow = parsed.data;
              const triggers = triggersRef.current;
              const tier = TIER_PRIORITY.find((t) => triggers[t].mode === 'follow');
              if (!tier) return;
              triggerGiftRef.current(
                tier,
                follow.nickname || follow.username,
                follow.avatarUrl,
                '➕ Siguiendo',
                '➕',
                'Seguir'
              );
            } else if (parsed.type === 'gift') {
              const gift = parsed.data;
              const triggers = triggersRef.current;
              const tier = TIER_PRIORITY.find(
                (t) =>
                  triggers[t].mode === 'gift' &&
                  triggers[t].giftName.toLowerCase() === (gift.giftName || '').toLowerCase()
              );
              if (!tier) return;
              const def = findTikTokGift(gift.giftName);
              triggerGiftRef.current(
                tier,
                gift.nickname || gift.username,
                gift.avatarUrl,
                `${def?.icon || '🎁'} ${def?.label || gift.giftName} (x${gift.repeatCount || 1})`,
                def?.icon
              );
            } else if (parsed.type === 'chat') {
              const chat = parsed.data;
              const trigger = triggersRef.current.heart;
              const keyword = trigger.text.trim().toLowerCase();
              const comment = (chat.comment || '').trim().toLowerCase();
              if (trigger.mode !== 'text' || !keyword) return;
              if (comment === keyword || comment.startsWith(`${keyword} `)) {
                triggerGiftRef.current(
                  'heart',
                  chat.displayName || chat.uniqueId,
                  chat.avatarUrl,
                  `💬 Escribió "${chat.comment}"`,
                  '💬'
                );
              }
            } else if (parsed.type === 'like') {
              const likeData = parsed.data;
              setConnectionsByApp((prev) => ({
                ...prev,
                printer: {
                  ...prev.printer,
                  totalLikes: likeData.totalLikes
                    ? likeData.totalLikes
                    : prev.printer.totalLikes + (likeData.likeCount || 1),
                },
              }));
              registerLikes(
                likeData.username,
                likeData.nickname || likeData.username,
                likeData.avatarUrl,
                likeData.likeCount || 1
              );
            }
          } else if (subscribedApp === 'color_printer') {
            // ================= APP 4 ONLY: IMPRESORA A COLOR (1 A 1) =================
            if (parsed.type === 'follow') {
              const follow = parsed.data;
              const triggers = colorTriggersRef.current;
              const tier =
                COLOR_TIER_PRIORITY.find((t) => triggers[t].mode === 'follow') || 'bw_follow';
              triggerColorPrintRef.current(
                tier,
                follow.nickname || follow.username,
                follow.avatarUrl,
                'Siguiendo',
                '➕'
              );
            } else if (parsed.type === 'gift') {
              const gift = parsed.data;
              const triggers = colorTriggersRef.current;
              const giftNameLower = (gift.giftName || '').toLowerCase();
              const coins = Number(gift.coins || 1);

              // First match exact configured gift name, or fallback by coin value matching the 5 gift tiers
              let tier = COLOR_TIER_PRIORITY.find(
                (t) =>
                  triggers[t].mode === 'gift' &&
                  triggers[t].giftName.toLowerCase() === giftNameLower
              );
              if (!tier) {
                if (coins >= 99) tier = 'frame_mythic';
                else if (coins >= 30) tier = 'frame_azure';
                else if (coins >= 10) tier = 'frame_emerald';
                else if (coins >= 5) tier = 'frame_gold';
                else tier = 'color_rose';
              }

              const def = findTikTokGift(gift.giftName);
              triggerColorPrintRef.current(
                tier,
                gift.nickname || gift.username,
                gift.avatarUrl,
                `${def?.icon || '🌹'} con ${def?.label || gift.giftName}`,
                def?.icon || '🌹'
              );
            } else if (parsed.type === 'chat') {
              const chat = parsed.data;
              const triggers = colorTriggersRef.current;
              const comment = (chat.comment || '').trim().toLowerCase();
              const tier = COLOR_TIER_PRIORITY.find((t) => {
                const kw = triggers[t].text.trim().toLowerCase();
                return (
                  triggers[t].mode === 'text' &&
                  kw &&
                  (comment === kw || comment.startsWith(`${kw} `))
                );
              });
              if (!tier) return;
              triggerColorPrintRef.current(
                tier,
                chat.displayName || chat.uniqueId,
                chat.avatarUrl,
                `💬 "${chat.comment}"`,
                '💬'
              );
            } else if (parsed.type === 'like') {
              const likeData = parsed.data;
              setConnectionsByApp((prev) => ({
                ...prev,
                color_printer: {
                  ...prev.color_printer,
                  totalLikes: likeData.totalLikes
                    ? likeData.totalLikes
                    : prev.color_printer.totalLikes + (likeData.likeCount || 1),
                },
              }));
              registerColorLikes(
                likeData.username,
                likeData.nickname || likeData.username,
                likeData.avatarUrl,
                likeData.likeCount || 1
              );
            }
          }
        } catch (e) {
          console.error('Error procesando evento TikTok:', e);
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        reconnectTimeout = setTimeout(connectSSE, 4000);
      };
    }

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [activeApp, registerLikes, registerColorLikes, updateAppConnection]);

  // Connect or disconnect from real TikTok Live stream independently for the activeApp
  const handleToggleTikTokConnection = async () => {
    const targetApp = activeApp;
    const targetConn = connectionsByApp[targetApp];
    const targetUsername = usernamesByApp[targetApp] ?? settings.tiktokUsername;

    updateAppConnection(targetApp, { error: null });

    if (targetConn.isConnected) {
      try {
        await fetch('/api/tiktok/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appId: targetApp }),
        });
        updateAppConnection(targetApp, { isConnected: false });
      } catch (err) {
        console.error('Error al desconectar de TikTok:', err);
      }
    } else {
      const cleanUser = targetUsername.replace(/^@/, '').trim();
      if (!cleanUser) {
        updateAppConnection(targetApp, {
          error: 'Por favor ingresa tu nombre de usuario de TikTok',
        });
        return;
      }

      updateAppConnection(targetApp, { isConnecting: true });
      try {
        const res = await fetch('/api/tiktok/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUser, appId: targetApp }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          updateAppConnection(targetApp, {
            isConnected: false,
            error:
              data.error ||
              'No se pudo conectar a TikTok Live. Verifica que estés transmitiendo en vivo actualmente.',
          });
        } else {
          updateAppConnection(targetApp, {
            isConnected: true,
            error: null,
          });
        }
      } catch (err: any) {
        updateAppConnection(targetApp, {
          isConnected: false,
          error: 'Error de red al conectar con el servidor.',
        });
      } finally {
        updateAppConnection(targetApp, { isConnecting: false });
      }
    }
  };

  // Initial demo completed row matching user's video layout (row 2 has 3 completed portraits)
  useEffect(() => {
    const initialTrioRow: PaperRow = {
      id: 'row_init_1',
      type: 'trio_row',
      maxItems: 3,
      items: [
        {
          id: 'sample_1',
          username: 'Thai_Mark',
          avatarUrl: PRESET_AVATARS[0].dataUrl,
          giftTier: 'flower',
          giftName: 'Flor',
          coins: 10,
          giftIcon: '🌸',
          timestamp: Date.now() - 30000,
          status: 'completed',
          colIndex: 0,
          slotSize: 72,
        },
        {
          id: 'sample_2',
          username: 'osama_wag',
          avatarUrl: PRESET_AVATARS[1].dataUrl,
          giftTier: 'heart',
          giftName: 'Corazón',
          coins: 1,
          giftIcon: '❤️',
          timestamp: Date.now() - 25000,
          status: 'completed',
          colIndex: 1,
          slotSize: 72,
        },
        {
          id: 'sample_3',
          username: 'kaylalai5',
          avatarUrl: PRESET_AVATARS[2].dataUrl,
          giftTier: 'flower',
          giftName: 'Flor',
          coins: 10,
          giftIcon: '🌸',
          timestamp: Date.now() - 20000,
          status: 'completed',
          colIndex: 2,
          slotSize: 72,
        },
      ],
    };

    setCompletedRows([initialTrioRow]);
  }, []);

  const handleSelectApp = (appId: ActiveAppId) => {
    // Ensure inactive apps stop any pending print/drawing queue when switching
    if (appId !== 'printer') {
      setDrawingQueue([]);
      setActiveDrawing(null);
      Object.values(likeBuckets.current).forEach((b) => b.timer && clearTimeout(b.timer));
      likeBuckets.current = {};
    }
    if (appId !== 'color_printer') {
      setColorQueue([]);
      setColorActiveDonor(null);
      Object.values(colorLikeBuckets.current).forEach((b) => b.timer && clearTimeout(b.timer));
      colorLikeBuckets.current = {};
    }

    setActiveApp(appId);
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      p.set('app', appId);
      window.history.replaceState(null, '', `?${p.toString()}`);
    }
  };

  const handleSimulateLikes = (count = 1) => {
    setConnectionsByApp((prev) => ({
      ...prev,
      [activeApp]: {
        ...prev[activeApp],
        totalLikes: prev[activeApp].totalLikes + count,
      },
    }));
    const randomAvatar = PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)];
    const sampleNames = ['carlos_live', 'sofia_star', 'ana_taps', 'mateo_tiktok', 'lucia_fans'];
    const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    if (activeApp === 'color_printer') {
      registerColorLikes(randomName, randomName, randomAvatar.dataUrl, count);
    } else if (activeApp === 'printer') {
      registerLikes(randomName, randomName, randomAvatar.dataUrl, count);
    }
  };

  // Dedicated OBS Overlay full-screen render
  if (isUrlOverlay && activeApp === 'soccer') {
    return (
      <SouthAmericanClubBattleApp
        isObsOverlay={true}
        isTikTokConnected={isTikTokConnected}
        tiktokUsername={activeSettings.tiktokUsername}
      />
    );
  }

  if (isUrlOverlay && activeApp === 'cr7') {
    return (
      <Cr7MessiBattleApp
        isObsOverlay={true}
        isTikTokConnected={isTikTokConnected}
        tiktokUsername={activeSettings.tiktokUsername}
      />
    );
  }

  if (isUrlOverlay && activeApp === 'color_printer') {
    return (
      <div className="w-screen h-screen bg-transparent overflow-hidden flex items-center justify-center p-2">
        <ColorPhotoPrinter
          activeDonor={colorActiveDonor}
          queueCount={colorQueue.length}
          printedCount={colorPrintedCount}
          wallItems={colorWallItems}
          vipCenterItem={colorVipItem}
          onPrintComplete={handleColorPrintComplete}
          obsMode={false}
          colorTierTriggers={colorTriggers}
        />
      </div>
    );
  }

  if (isUrlOverlay && activeApp === 'printer') {
    return (
      <div className="w-screen h-screen bg-transparent overflow-hidden flex items-center justify-center p-2">
        <ContinuousPrinter
          activeDonor={activeDrawing}
          activeCol={activeRowItems.length}
          activeRowType={activeRowType}
          activeRowItems={activeRowItems}
          onDrawingComplete={handleDrawingComplete}
          completedRows={completedRows}
          obsMode={true}
          tierTriggers={settings.tierTriggers}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Application Selector Tab */}
      <AppSelector
        activeApp={activeApp}
        onSelectApp={handleSelectApp}
        isTikTokConnected={isTikTokConnected}
        tiktokUsername={activeSettings.tiktokUsername}
      />

      {activeApp === 'soccer' ? (
        <SouthAmericanClubBattleApp
          isObsOverlay={false}
          isTikTokConnected={isTikTokConnected}
          tiktokUsername={activeSettings.tiktokUsername}
        />
      ) : activeApp === 'cr7' ? (
        <Cr7MessiBattleApp
          isObsOverlay={false}
          isTikTokConnected={isTikTokConnected}
          tiktokUsername={activeSettings.tiktokUsername}
          isConnecting={isConnecting}
          connectionError={connectionError}
          onToggleTikTokConnection={handleToggleTikTokConnection}
          settings={activeSettings}
          onUpdateSettings={updateSettings}
        />
      ) : activeApp === 'color_printer' ? (
        <>
          <HeaderNav
            obsMode={settings.obsMode}
            onToggleObsMode={() => updateSettings({ obsMode: !settings.obsMode })}
            onOpenObsGuide={() => setIsObsGuideModalOpen(true)}
            onOpenRulesModal={() => setIsRulesModalOpen(true)}
          />

          <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* LEFT COLUMN: PHOTO PRINTER 3D COLOR PRINTER SCENE (5 cols) */}
            <section className="lg:col-span-5 flex flex-col items-center justify-start min-h-[680px]">
              <div className="w-full max-w-[460px] flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-fuchsia-400 flex items-center gap-1.5">
                  <Printer className="h-3.5 w-3.5" />
                  <span>Impresora a Color 1 a 1 (PHOTO PRINTER)</span>
                </span>
                {colorQueue.length > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-mono font-bold text-amber-300 border border-amber-500/30">
                    {colorQueue.length} en cola
                  </span>
                )}
              </div>

              <ColorPhotoPrinter
                activeDonor={colorActiveDonor}
                queueCount={colorQueue.length}
                printedCount={colorPrintedCount}
                wallItems={colorWallItems}
                vipCenterItem={colorVipItem}
                onPrintComplete={handleColorPrintComplete}
                obsMode={settings.obsMode}
                colorTierTriggers={colorTriggers}
              />
            </section>

            {/* RIGHT COLUMN: COLOR PRINTER CONSOLE (7 cols) */}
            <section className="lg:col-span-7 flex flex-col">
              <ColorPrinterConsole
                settings={activeSettings}
                colorTierTriggers={colorTriggers}
                onUpdateSettings={updateSettings}
                onTriggerColorPrint={handleTriggerColorPrint}
                onClearQueue={handleClearColorQueue}
                recentDonors={colorRecentDonors}
                isTikTokConnected={isTikTokConnected}
                isConnecting={isConnecting}
                connectionError={connectionError}
                onToggleTikTokConnection={handleToggleTikTokConnection}
                totalLikesCount={totalLikesCount}
                onSimulateLikes={handleSimulateLikes}
              />
            </section>
          </main>
        </>
      ) : (
        <>
          {/* Top Bar strictly following guidelines */}
          <HeaderNav
            obsMode={settings.obsMode}
            onToggleObsMode={() => updateSettings({ obsMode: !settings.obsMode })}
            onOpenObsGuide={() => setIsObsGuideModalOpen(true)}
            onOpenRulesModal={() => setIsRulesModalOpen(true)}
          />

          {/* Main Studio Viewport */}
          <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* LEFT COLUMN: CONTINUOUS PRINTER CLIPBOARD (5 cols) */}
            <section className="lg:col-span-5 flex flex-col items-center justify-start min-h-[680px]">
              <div className="w-full max-w-md flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Plotter Continuo TikTok Live</span>
                </span>
                {drawingQueue.length > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-mono font-bold text-amber-300 border border-amber-500/30">
                    {drawingQueue.length} en espera
                  </span>
                )}
              </div>

              {/* THE CONTINUOUS PRINTER COMPONENT */}
              <ContinuousPrinter
                activeDonor={activeDrawing}
                activeCol={activeRowItems.length}
                activeRowType={activeRowType}
                activeRowItems={activeRowItems}
                onDrawingComplete={handleDrawingComplete}
                completedRows={completedRows}
                obsMode={settings.obsMode}
                tierTriggers={settings.tierTriggers}
              />
            </section>

            {/* RIGHT COLUMN: STREAMER CONSOLE, SIMULATOR & SETTINGS (7 cols) */}
            <section className="lg:col-span-7 flex flex-col">
              <StreamerConsole
                settings={activeSettings}
                onUpdateSettings={updateSettings}
                onTriggerGift={handleTriggerGift}
                onClearQueue={handleClearQueue}
                recentDonors={recentDonors}
                isTikTokConnected={isTikTokConnected}
                isConnecting={isConnecting}
                connectionError={connectionError}
                onToggleTikTokConnection={handleToggleTikTokConnection}
                totalLikesCount={totalLikesCount}
                onSimulateLikes={handleSimulateLikes}
              />
            </section>
          </main>
        </>
      )}

      {/* Explanatory Modals */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />
      <ObsGuideModal
        isOpen={isObsGuideModalOpen}
        onClose={() => setIsObsGuideModalOpen(false)}
        defaultApp={activeApp}
      />
    </div>
  );
}

