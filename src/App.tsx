import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DonorItem,
  GiftTier,
  PRESET_GIFTS,
  StreamSettings,
  TierTriggers,
  DEFAULT_TIER_TRIGGERS,
  TIER_PRIORITY,
  findTikTokGift,
  triggerCaption,
} from './types/tiktok';
import { PRESET_AVATARS } from './utils/avatarPresets';
import { soundEngine } from './utils/audio';
import { ContinuousPrinter, PaperRow, PrintedItem, PaperRowType } from './components/ContinuousPrinter';
import { StreamerConsole } from './components/StreamerConsole';
import { HeaderNav } from './components/HeaderNav';
import { RulesModal } from './components/RulesModal';
import { ObsGuideModal } from './components/ObsGuideModal';
import { AppSelector, ActiveAppId } from './components/AppSelector';
import { SouthAmericanClubBattleApp } from './components/soccer/SouthAmericanClubBattleApp';
import { Cr7MessiBattleApp } from './components/soccer/Cr7MessiBattleApp';
import { Sparkles } from 'lucide-react';

// Settings the OBS overlay (separate browser) must mirror from the panel
const SHARED_SETTING_KEYS: (keyof StreamSettings)[] = ['tierTriggers', 'plotterSound', 'plotterVolume'];

export default function App() {
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isUrlOverlay = urlParams?.get('overlay') === '1';
  const initialApp = (urlParams?.get('app') as ActiveAppId) || 'printer';

  const [activeApp, setActiveApp] = useState<ActiveAppId>(initialApp);

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
    plotterSound: 'pencil',
    plotterVolume: 0.8,
  });

  const [activeDrawing, setActiveDrawing] = useState<DonorItem | null>(null);
  const [activeRowItems, setActiveRowItems] = useState<PrintedItem[]>([]);
  const [activeRowType, setActiveRowType] = useState<PaperRowType>('trio_row');
  const [drawingQueue, setDrawingQueue] = useState<DonorItem[]>([]);
  const [completedRows, setCompletedRows] = useState<PaperRow[]>([]);
  const [recentDonors, setRecentDonors] = useState<DonorItem[]>([]);
  const [isTikTokConnected, setIsTikTokConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [totalLikesCount, setTotalLikesCount] = useState<number>(0);

  const likeBuckets = useRef<
    Record<string, { count: number; avatarUrl: string; displayName: string; timer?: ReturnType<typeof setTimeout> }>
  >({});
  const triggersRef = useRef<TierTriggers>(settings.tierTriggers);
  triggersRef.current = settings.tierTriggers;

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
    setSettings((prev) => ({ ...prev, ...newSettings }));
    const shared = Object.fromEntries(
      Object.entries(newSettings).filter(([key]) => SHARED_SETTING_KEYS.includes(key as keyof StreamSettings))
    );
    if (Object.keys(shared).length > 0) {
      // Share with the OBS overlay, which runs in a separate browser
      fetch('/api/shared-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shared),
      }).catch(() => {});
    }
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

  // Dispatch next item in queue when current drawing finishes
  const processNextInQueue = useCallback(() => {
    setDrawingQueue((prevQueue) => {
      if (prevQueue.length === 0) {
        setActiveDrawing(null);
        return [];
      }
      const [nextDonor, ...rest] = prevQueue;
      setActiveDrawing(nextDonor);
      return rest;
    });
  }, []);

  // Handle incoming gift event (from simulator, TikTok or custom donor)
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
        // If starting with medium donut or big gift, adjust activeRowType
        if (tier === 'big_gift') {
          setActiveRowType('big_goot_row');
        } else if (tier === 'donut') {
          setActiveRowType('duo_row');
        } else {
          setActiveRowType('trio_row');
        }
        setActiveDrawing(newDonor);
      } else {
        // Priority Queue: Big gift jumps immediately to the front of the queue
        if (tier === 'big_gift') {
          setDrawingQueue((prev) => [newDonor, ...prev]);
        } else {
          setDrawingQueue((prev) => [...prev, newDonor]);
        }
      }
    },
    [activeDrawing]
  );

  // When 2.0s drawing completes at the active line under the pen
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

    setRecentDonors((prev) => [completedDonor, ...prev.slice(0, 25)]);

    // 1. BIG GIFT (1 per row, covers half the paper + GOOT stamp)
    if (isBig) {
      // If there were any partial items at the top row, flush them down
      if (activeRowItems.length > 0) {
        const flushedRow: PaperRow = {
          id: `row_${Date.now()}_flush`,
          type: activeRowType,
          items: activeRowItems,
          maxItems: activeRowType === 'duo_row' ? 2 : 3,
        };
        setCompletedRows((prev) => [flushedRow, ...prev]);
      }

      // Add the big GOOT row
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

      setCompletedRows((prev) => [bigRow, spacerRow, ...prev]);
      setActiveRowItems([]);
      setActiveRowType('trio_row');
      processNextInQueue();
      return;
    }

    // 2. MEDIUM DONUT OR SMALL (Hearts & Flowers)
    const updatedActiveItems = [...activeRowItems, newItem];
    const currentRowTargetMax = (isMed || activeRowType === 'duo_row') ? 2 : 3;

    // CHECK: IS THE CURRENT ROW FULLY DRAWN?
    if (updatedActiveItems.length >= currentRowTargetMax) {
      // The row has been FULLY drawn! Now it advances down the continuous roll!
      soundEngine.playPaperFeedSound();

      const newFullRow: PaperRow = {
        id: `row_${Date.now()}`,
        type: currentRowTargetMax === 2 ? 'duo_row' : 'trio_row',
        items: updatedActiveItems,
        maxItems: currentRowTargetMax,
      };

      setCompletedRows((prev) => [newFullRow, ...prev]);
      setActiveRowItems([]);
      setActiveRowType('trio_row'); // Next fresh row defaults to trio
    } else {
      // THE ROW IS NOT FULL YET: IT STAYS RIGHT AT THE TOP ROW!
      // Does not scroll down until all drawings in the row are complete!
      setActiveRowItems(updatedActiveItems);
      if (isMed) {
        setActiveRowType('duo_row');
      }
    }

    // Process next queued item
    processNextInQueue();
  };

  const handleClearQueue = () => {
    setDrawingQueue([]);
    setActiveRowItems([]);
    setCompletedRows([]);
    setActiveDrawing(null);
  };

  const triggerGiftRef = useRef(handleTriggerGift);
  triggerGiftRef.current = handleTriggerGift;

  // Accumulate a viewer's screen taps; once they pause, print the highest
  // "likes" tier they reached (big > medium > small color > small B/N).
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
        // Not enough taps for any tier yet: keep accumulating
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

  // Real-time TikTok Live SSE (Server-Sent Events) listener
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    function connectSSE() {
      eventSource = new EventSource('/api/tiktok/stream');

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'shared-settings') {
            if (parsed.data && typeof parsed.data === 'object') {
              setSettings((prev) => ({ ...prev, ...parsed.data }));
            }
            return;
          }
          if (activeApp !== 'printer') {
            return;
          }
          if (parsed.type === 'status' || parsed.type === 'connected') {
            setIsTikTokConnected(!!parsed.data?.isConnected);
            if (parsed.type === 'connected') {
              // Live started: wipe simulated/demo prints so only real viewers are printed
              likeBuckets.current = {};
              handleClearQueue();
            }
            if (parsed.data?.lastError) {
              setConnectionError(parsed.data.lastError);
            } else if (parsed.data?.isConnected) {
              setConnectionError(null);
            }
          } else if (parsed.type === 'shared-settings') {
            if (parsed.data && typeof parsed.data === 'object') {
              setSettings((prev) => ({ ...prev, ...parsed.data }));
            }
          } else if (parsed.type === 'disconnected') {
            setIsTikTokConnected(false);
          } else if (parsed.type === 'error') {
            setConnectionError(parsed.data?.error || 'Error de conexión con TikTok Live');
            setIsTikTokConnected(false);
          } else if (parsed.type === 'gift') {
            // REAL GIFT: print on the highest-priority tier configured for this gift
            const gift = parsed.data;
            const triggers = triggersRef.current;
            const tier = TIER_PRIORITY.find(
              (t) =>
                triggers[t].mode === 'gift' &&
                triggers[t].giftName.toLowerCase() === (gift.giftName || '').toLowerCase()
            );
            if (!tier) return;
            const def = findTikTokGift(gift.giftName);
            handleTriggerGift(
              tier,
              gift.nickname || gift.username,
              gift.avatarUrl,
              `${def?.icon || '🎁'} ${def?.label || gift.giftName} (x${gift.repeatCount || 1})`,
              def?.icon
            );
          } else if (parsed.type === 'chat') {
            // REAL CHAT: only the B/N tier can be triggered by a keyword
            const chat = parsed.data;
            const trigger = triggersRef.current.heart;
            const keyword = trigger.text.trim().toLowerCase();
            const comment = (chat.comment || '').trim().toLowerCase();
            if (trigger.mode !== 'text' || !keyword) return;
            if (comment === keyword || comment.startsWith(`${keyword} `)) {
              handleTriggerGift(
                'heart',
                chat.displayName || chat.uniqueId,
                chat.avatarUrl,
                `💬 Escribió "${chat.comment}"`,
                '💬'
              );
            }
          } else if (parsed.type === 'like') {
            // REAL TIKTOK LIVE LIKES (Me Gusta / Corazones flotantes ❤️)
            const likeData = parsed.data;
            if (likeData.totalLikes) {
              setTotalLikesCount(likeData.totalLikes);
            } else {
              setTotalLikesCount((prev) => prev + (likeData.likeCount || 1));
            }
            registerLikes(
              likeData.username,
              likeData.nickname || likeData.username,
              likeData.avatarUrl,
              likeData.likeCount || 1
            );
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
  }, [handleTriggerGift]);

  // Connect or disconnect from real TikTok Live stream
  const handleToggleTikTokConnection = async () => {
    setConnectionError(null);

    if (isTikTokConnected) {
      try {
        await fetch('/api/tiktok/disconnect', { method: 'POST' });
        setIsTikTokConnected(false);
      } catch (err) {
        console.error('Error al desconectar de TikTok:', err);
      }
    } else {
      const cleanUser = settings.tiktokUsername.replace(/^@/, '').trim();
      if (!cleanUser) {
        setConnectionError('Por favor ingresa tu nombre de usuario de TikTok');
        return;
      }

      setIsConnecting(true);
      try {
        const res = await fetch('/api/tiktok/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUser }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setConnectionError(
            data.error || 'No se pudo conectar a TikTok Live. Verifica que estés transmitiendo en vivo actualmente.'
          );
          setIsTikTokConnected(false);
        } else {
          setIsTikTokConnected(true);
          setConnectionError(null);
        }
      } catch (err: any) {
        setConnectionError('Error de red al conectar con el servidor.');
        setIsTikTokConnected(false);
      } finally {
        setIsConnecting(false);
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
    setActiveApp(appId);
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      p.set('app', appId);
      window.history.replaceState(null, '', `?${p.toString()}`);
    }
  };

  const handleSimulateLikes = (count = 1) => {
    setTotalLikesCount((prev) => prev + count);
    const randomAvatar = PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)];
    const sampleNames = ['carlos_live', 'sofia_star', 'ana_taps', 'mateo_tiktok', 'lucia_fans'];
    const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    registerLikes(randomName, randomName, randomAvatar.dataUrl, count);
  };



  // Dedicated OBS Overlay full-screen render
  if (isUrlOverlay && activeApp === 'soccer') {
    return (
      <SouthAmericanClubBattleApp
        isObsOverlay={true}
        isTikTokConnected={isTikTokConnected}
        tiktokUsername={settings.tiktokUsername}
      />
    );
  }

  if (isUrlOverlay && activeApp === 'cr7') {
    return (
      <Cr7MessiBattleApp
        isObsOverlay={true}
        isTikTokConnected={isTikTokConnected}
        tiktokUsername={settings.tiktokUsername}
      />
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
        tiktokUsername={settings.tiktokUsername}
      />

      {activeApp === 'soccer' ? (
        <SouthAmericanClubBattleApp
          isObsOverlay={false}
          isTikTokConnected={isTikTokConnected}
          tiktokUsername={settings.tiktokUsername}
        />
      ) : activeApp === 'cr7' ? (
        <Cr7MessiBattleApp
          isObsOverlay={false}
          isTikTokConnected={isTikTokConnected}
          tiktokUsername={settings.tiktokUsername}
          isConnecting={isConnecting}
          connectionError={connectionError}
          onToggleTikTokConnection={handleToggleTikTokConnection}
          settings={settings}
          onUpdateSettings={updateSettings}
        />
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
                settings={settings}
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
