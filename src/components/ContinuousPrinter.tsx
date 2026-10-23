import React, { useEffect, useRef, useState } from 'react';
import { DonorItem, GiftTier, TierTriggers, TIER_PRIORITY, describeTrigger } from '../types/tiktok';
import { prepareImageForDrawing, renderSketchFrame, PreparedDrawingData } from '../utils/drawingEngine';
import { soundEngine } from '../utils/audio';
import { PlotterCarriage } from './PlotterCarriage';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { Eye } from 'lucide-react';

export type PaperRowType = 'trio_row' | 'duo_row' | 'big_goot_row' | 'blank_spacer';

export interface PrintedItem extends DonorItem {
  slotSize: number;
  colIndex: number; // 0, 1, 2
}

export interface PaperRow {
  id: string;
  type: PaperRowType;
  items: PrintedItem[];
  maxItems: number; // 3 for trio_row, 2 for duo_row, 1 for big_goot_row
}

interface ContinuousPrinterProps {
  activeDonor: DonorItem | null;
  activeCol: number; // 0, 1, or 2 in current active row
  activeRowType: PaperRowType;
  activeRowItems: PrintedItem[]; // items already drawn in the top row
  onDrawingComplete: (donor: DonorItem, finalDataUrl: string) => void;
  completedRows: PaperRow[]; // rows that have been completed and rolled down
  obsMode: boolean;
  tierTriggers: TierTriggers;
}

/**
 * Calculates the exact offset in local CSS pixels of an element relative to an ancestor root.
 * Completely immune to CSS 3D perspectives or screen scaling!
 */
function getLocalOffset(element: HTMLElement | null, root: HTMLElement | null): { x: number; y: number } {
  if (!element || !root) return { x: 215, y: 70 };
  let x = 0;
  let y = 0;
  let cur: HTMLElement | null = element;
  let safety = 0;
  while (cur && cur !== root && safety < 30) {
    x += cur.offsetLeft;
    y += cur.offsetTop;
    cur = cur.offsetParent as HTMLElement | null;
    safety++;
  }
  return { x, y };
}

export const ContinuousPrinter: React.FC<ContinuousPrinterProps> = ({
  activeDonor,
  activeCol,
  activeRowType,
  activeRowItems,
  onDrawingComplete,
  completedRows,
  obsMode,
  tierTriggers,
}) => {
  const chassisRef = useRef<HTMLDivElement | null>(null);
  const gantryRef = useRef<HTMLDivElement | null>(null);
  const carriageRef = useRef<HTMLDivElement | null>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [drawProgress, setDrawProgress] = useState<number>(0);
  const [isAdvancingBlank, setIsAdvancingBlank] = useState<boolean>(false);
  const [isGootStampedOnPaper, setIsGootStampedOnPaper] = useState<boolean>(false);
  const [is3DView, setIs3DView] = useState<boolean>(!obsMode);
  const preparedRef = useRef<PreparedDrawingData | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const stopPrintSoundRef = useRef<(() => void) | null>(null);

  // Exact 2.0s duration requirement
  const DRAW_DURATION_MS = 2000;

  // Exact physical offset from horizontal rail centerline to the tip of the drawing nib:
  // - Rail height is 16px, center is at +8px.
  // - Carriage clamp is centered on the rail.
  // - Lower barrel (12px) + red band (4px) + cone (8px) + nib (4px) extends 38px below clamp center.
  // Total vertical distance from gantryRef top to nib tip = 8px + 38px = 46px!
  const PEN_TIP_OFFSET_Y = 46;

  // Fixed standard sizes: Never change between drawing, waiting, or completed!
  // - Small (Heart B&N / Flower): 72px (fits 3 in row)
  // - Medium (Donut): 96px (fits 2 in row)
  // - Big Gift: 195px (covers half paper + GOOT)
  const getSlotSize = (tier?: GiftTier) => {
    if (tier === 'big_gift') return 195;
    if (tier === 'donut') return 96;
    return 72;
  };

  const currentSize = getSlotSize(activeDonor?.giftTier);
  const isBigGift = activeDonor?.giftTier === 'big_gift';

  // Idle park handler: when no donor is drawing, park carriage at upper right
  useEffect(() => {
    if (!activeDonor) {
      if (gantryRef.current) {
        gantryRef.current.style.transition = 'top 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        gantryRef.current.style.top = '28px';
      }
      if (carriageRef.current) {
        carriageRef.current.style.transition = 'left 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        carriageRef.current.style.left = '80%';
      }
    }
  }, [activeDonor]);

  // Drawing animation loop with 100% synchronized pen tip tracking
  useEffect(() => {
    if (!activeDonor) {
      setDrawProgress(0);
      setIsAdvancingBlank(false);
      setIsGootStampedOnPaper(false);
      return;
    }

    let isCancelled = false;
    setDrawProgress(0);
    setIsGootStampedOnPaper(false);
    startTimeRef.current = null;
    preparedRef.current = null;

    if (activeDonor.giftTier === 'big_gift') {
      setIsAdvancingBlank(true);
      soundEngine.playPaperFeedSound();
      soundEngine.playGootFanfare();

      const advanceTimer = setTimeout(() => {
        if (isCancelled) return;
        setIsAdvancingBlank(false);
        startDrawing();
      }, 700);

      return () => {
        isCancelled = true;
        clearTimeout(advanceTimer);
      };
    } else {
      startDrawing();
    }

    function startDrawing() {
      if (!activeDonor) return;

      prepareImageForDrawing(activeDonor.avatarUrl, currentSize, currentSize, activeDonor.giftTier).then(
        (prepared) => {
          if (isCancelled) return;
          preparedRef.current = prepared;
          stopPrintSoundRef.current = soundEngine.startDrawingSound(DRAW_DURATION_MS);

          // Pre-align pen carriage to the start position of the drawing
          if (chassisRef.current && activeCanvasRef.current) {
            const offset = getLocalOffset(activeCanvasRef.current, chassisRef.current);
            const cx = currentSize / 2;
            const radius = currentSize / 2 - 3;
            const startX = offset.x + cx;
            const startY = offset.y + (cx - radius);

            if (gantryRef.current) {
              gantryRef.current.style.transition = 'top 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
              gantryRef.current.style.top = `${startY - PEN_TIP_OFFSET_Y}px`;
            }
            if (carriageRef.current) {
              carriageRef.current.style.transition = 'left 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
              carriageRef.current.style.left = `${startX}px`;
            }
          }

          const animate = (timestamp: number) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const elapsed = timestamp - startTimeRef.current;
            const currentProg = Math.min(1, elapsed / DRAW_DURATION_MS);
            setDrawProgress(currentProg);

            if (activeCanvasRef.current && preparedRef.current) {
              const ctx = activeCanvasRef.current.getContext('2d');
              if (ctx) {
                // 1. Render sketch frame on the canvas
                const tip = renderSketchFrame(ctx, preparedRef.current, currentProg, activeDonor.giftTier);

                // 2. Real-time 2-axis CNC tracking:
                // Locks the nib tip directly onto (tip.x, tip.y) with zero pixel error!
                if (chassisRef.current && activeCanvasRef.current) {
                  const offset = getLocalOffset(activeCanvasRef.current, chassisRef.current);
                  const targetX = offset.x + tip.x;
                  const targetY = offset.y + tip.y;

                  if (gantryRef.current) {
                    gantryRef.current.style.transition = 'none';
                    gantryRef.current.style.top = `${targetY - PEN_TIP_OFFSET_Y}px`;
                  }
                  if (carriageRef.current) {
                    carriageRef.current.style.transition = 'none';
                    carriageRef.current.style.left = `${targetX}px`;
                  }
                }
              }
            }

            if (currentProg < 1) {
              animFrameRef.current = requestAnimationFrame(animate);
            } else {
              // Exact 2.0s reached!
              // Return gantry back to top immediately so the pencil never stays covering the finished drawing!
              if (gantryRef.current) {
                gantryRef.current.style.transition = 'top 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
                gantryRef.current.style.top = '28px';
              }
              if (carriageRef.current) {
                carriageRef.current.style.transition = 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
                carriageRef.current.style.left = '80%';
              }

              if (activeDonor.giftTier === 'big_gift') {
                setIsGootStampedOnPaper(true);

                try {
                  confetti({
                    particleCount: 130,
                    spread: 95,
                    origin: { y: 0.4 },
                    colors: ['#F59E0B', '#EAB308', '#FE2C55', '#25F4EE', '#FFFFFF'],
                  });
                } catch {
                  // Suppressed
                }

                setTimeout(() => {
                  if (isCancelled) return;
                  if (activeCanvasRef.current) {
                    const finalDataUrl = activeCanvasRef.current.toDataURL('image/png');
                    soundEngine.playPaperFeedSound();
                    onDrawingComplete(activeDonor, finalDataUrl);
                  }
                }, 1500);
              } else {
                if (activeCanvasRef.current) {
                  const finalDataUrl = activeCanvasRef.current.toDataURL('image/png');
                  onDrawingComplete(activeDonor, finalDataUrl);
                }
              }
            }
          };

          animFrameRef.current = requestAnimationFrame(animate);
        }
      );
    }

    return () => {
      isCancelled = true;
      stopPrintSoundRef.current?.();
      stopPrintSoundRef.current = null;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [activeDonor?.id, currentSize]);

  return (
    <div className="relative flex flex-col xl:flex-row items-center xl:items-start justify-center h-full w-full gap-5 select-none p-2">
      {/* Main Column (Perspective toggle + Printer Chassis) */}
      <div className="relative flex flex-col items-center justify-start w-full max-w-[430px]">

        {/* Semi-transparent legend floating over the bottom of the printer */}
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2 flex flex-col w-56 rounded-2xl border border-white/15 bg-slate-950/35 p-3 backdrop-blur-[2px] space-y-1.5">
          {TIER_PRIORITY.slice()
            .reverse()
            .map((tier) => (
              <div
                key={tier}
                className="rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white drop-shadow"
              >
                {describeTrigger(tier, tierTriggers[tier])}
              </div>
            ))}
        </div>
        {!obsMode && (
          <div className="mb-2 flex items-center justify-end w-full px-2 text-xs">
            <button
              onClick={() => setIs3DView(!is3DView)}
              className="flex items-center gap-1 rounded-lg bg-slate-800/80 border border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <Eye className="h-3.5 w-3.5 text-cyan-400" />
              <span>{is3DView ? 'Vista 3D Inclinada' : 'Vista Frontal 2D'}</span>
            </button>
          </div>
        )}

        {/* 1. CHASSIS CONTAINER (Green printer base with metallic guide rods) */}
        <div
          className="w-full flex justify-center transition-transform duration-500"
          style={{
            perspective: is3DView ? '1200px' : 'none',
          }}
        >
          <div
            ref={chassisRef}
            className={`relative w-full max-w-[430px] flex flex-col rounded-t-[2.2rem] rounded-b-[1.8rem] border-4 ${
              obsMode
                ? 'border-emerald-600/70 bg-transparent'
                : 'border-[#15803d] bg-[#16a34a] shadow-[0_25px_60px_rgba(0,0,0,0.6)]'
            } pt-3 px-3 pb-8 transition-transform duration-500`}
            style={{
              transform: is3DView ? 'rotateX(8deg) rotateZ(-4deg)' : 'none',
              minHeight: '660px',
            }}
          >
          {/* TOP PAPER ROLL CYLINDER */}
          <div className="relative z-20 mx-auto -mt-6 mb-2 flex h-8 w-64 items-center justify-center rounded-xl bg-gradient-to-b from-slate-100 via-white to-slate-300 border-2 border-slate-400 shadow-lg">
            <div className="h-1.5 w-48 rounded-full bg-slate-300 shadow-inner" />
          </div>

          {/* DUAL METALLIC VERTICAL GUIDE RODS (Left and Right extremities) */}
          <div className="pointer-events-none absolute left-[8px] top-7 bottom-12 w-2.5 rounded-full bg-gradient-to-r from-slate-400 via-slate-100 to-slate-400 shadow-md border border-slate-400 z-30">
            {/* Rubber end stop at bottom */}
            <div className="absolute -bottom-1 -left-0.5 h-2.5 w-3.5 rounded-sm bg-slate-900 border border-slate-700 shadow" />
          </div>
          <div className="pointer-events-none absolute right-[8px] top-7 bottom-12 w-2.5 rounded-full bg-gradient-to-r from-slate-400 via-slate-100 to-slate-400 shadow-md border border-slate-400 z-30">
            {/* Rubber end stop at bottom */}
            <div className="absolute -bottom-1 -left-0.5 h-2.5 w-3.5 rounded-sm bg-slate-900 border border-slate-700 shadow" />
          </div>

          {/* 2. HORIZONTAL MECHANICAL GANTRY ASSEMBLY SLIDING ALONG VERTICAL RAILS */}
          {/* Slides up and down along the vertical guide rods during Y-strokes! */}
          <div
            ref={gantryRef}
            className="absolute inset-x-0 z-40 will-change-transform pointer-events-none"
            style={{
              top: '28px',
              transition: 'top 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Left Purple Corner Stepper Block with Chrome Linear Bearing Sleeve */}
            <div className="absolute -left-2 -top-2.5 h-9 w-9 rounded-lg bg-gradient-to-b from-fuchsia-800 via-purple-900 to-purple-950 border-2 border-purple-400 shadow-xl flex items-center justify-center">
              <div className="h-4 w-4 rounded-full border-2 border-slate-300 bg-slate-800/80 shadow-inner" />
            </div>

            {/* Right Purple Corner Stepper Block with Chrome Linear Bearing Sleeve */}
            <div className="absolute -right-2 -top-2.5 h-9 w-9 rounded-lg bg-gradient-to-b from-fuchsia-800 via-purple-900 to-purple-950 border-2 border-purple-400 shadow-xl flex items-center justify-center">
              <div className="h-4 w-4 rounded-full border-2 border-slate-300 bg-slate-800/80 shadow-inner" />
            </div>

            {/* Silver Crossbar Rail connecting both purple blocks */}
            <div className="relative h-4 mx-4 rounded-md bg-gradient-to-b from-slate-300 via-slate-100 to-slate-400 border border-slate-400 shadow-md flex items-center">
              <div className="absolute inset-x-2 h-1 bg-slate-600/40 rounded-full" />
            </div>

            {/* MOTORIZED MARKER / PEN CARRIAGE (Positioned in real-time right over the drawing stroke!) */}
            <div
              ref={carriageRef}
              className="absolute top-2 -translate-x-1/2 -translate-y-1/2 will-change-transform pointer-events-none z-40"
              style={{
                left: '80%',
                transition: 'left 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <PlotterCarriage
                isDrawing={drawProgress > 0 && drawProgress < 1}
                tier={activeDonor?.giftTier}
              />
            </div>
          </div>

          {/* 3. CONTINUOUS WHITE ARTIST PAPER SHEET (Reaches and curves around bottom roller) */}
          <div
            className="relative z-10 flex-1 rounded-t-2xl rounded-b-2xl bg-white shadow-[0_18px_32px_rgba(0,0,0,0.45)] border-2 border-b-4 border-slate-300 mx-3 pt-7 pb-4 px-3 flex flex-col overflow-hidden"
            style={{
              marginBottom: '-22px', // Paper extends past green board bottom edge, wrapping around spool
            }}
          >
            {/* Side perforated alignment holes */}
            <div className="pointer-events-none absolute inset-y-0 left-1 w-2 flex flex-col justify-between py-4 opacity-25">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-1 w-2 flex flex-col justify-between py-4 opacity-25">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              ))}
            </div>

            {/* BLANK ADVANCE WHITE FEED (Smooth blank expansion for Big Gift) */}
            {isAdvancingBlank && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 60 }}
                exit={{ height: 0 }}
                className="w-full bg-white transition-all"
              />
            )}

            {/* TOP ACTIVE LINE (Row being drawn right now under the pen! Clean paper, no dashed lines) */}
            <div className="relative z-20 pb-2">
              {/* CASE 1: BIG DONATION (1 drawing covering half the paper + GOOT badge at the bottom) */}
              {isBigGift && activeDonor ? (
                <div className="relative flex flex-col items-center justify-center py-2">
                  <div className="relative flex items-center justify-center">
                    <canvas
                      ref={activeCanvasRef}
                      width={195}
                      height={195}
                      className="relative rounded-full shadow-2xl border-4 border-amber-400 bg-slate-50"
                      style={{ width: 195, height: 195 }}
                    />

                    {/* GIANT "GOOT" BADGE ON PAPER - Positioned lower down so it does NOT cover the face/profile */}
                    <AnimatePresence>
                      {isGootStampedOnPaper && (
                        <motion.div
                          initial={{ scale: 2.2, y: 15, opacity: 0 }}
                          animate={{ scale: 1, y: 0, opacity: 1 }}
                          transition={{ type: 'spring', damping: 14, stiffness: 220 }}
                          className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none z-30"
                        >
                          <span className="font-goot text-4xl sm:text-5xl font-black tracking-wider text-amber-400 bg-amber-950/95 border-3 border-amber-400 rounded-xl px-4 py-1 shadow-2xl drop-shadow-[0_6px_14px_rgba(245,158,11,0.5)] -rotate-3">
                            GOOT
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="mt-5 text-center">
                    <div className="text-sm font-black text-slate-900">
                      👑 @{activeDonor.username}
                    </div>
                  </div>
                </div>
              ) : activeRowType === 'duo_row' ? (
                /* CASE 2: DUO ROW (2 drawings per row when Donut medium is present. Pure white paper) */
                <div className="grid grid-cols-2 gap-4 items-center justify-items-center min-h-[140px]">
                  {[0, 1].map((col) => {
                    const isActive = activeDonor && activeCol === col;
                    const existingItem = activeRowItems[col];
                    const itemTier = isActive ? activeDonor.giftTier : existingItem?.giftTier;
                    const itemSize = getSlotSize(itemTier);

                    return (
                      <div key={col} className="relative flex flex-col items-center w-full">
                        {isActive ? (
                          <div className="relative flex flex-col items-center">
                            <div className="flex items-center justify-center" style={{ height: 96 }}>
                              <canvas
                                ref={activeCanvasRef}
                                width={itemSize}
                                height={itemSize}
                                className={`rounded-full shadow-md bg-slate-50 ${
                                  activeDonor.giftTier === 'donut' ? 'border-2 border-amber-400' : 'ring-2 ring-emerald-500'
                                }`}
                                style={{ width: itemSize, height: itemSize }}
                              />
                            </div>

                            <div className="mt-1.5 text-center">
                              <div className="text-xs font-black text-slate-900 truncate max-w-[125px]">
                                @{activeDonor.username}
                              </div>
                              <div className="text-[10px] text-amber-600 font-bold flex items-center justify-center gap-1">
                                <span>{activeDonor.giftIcon}</span>
                                <span>{activeDonor.giftName}</span>
                              </div>
                            </div>
                          </div>
                        ) : existingItem ? (
                          <div className="flex flex-col items-center opacity-90">
                            <div className="flex items-center justify-center" style={{ height: 96 }}>
                              <img
                                src={existingItem.drawnCanvasDataUrl || existingItem.avatarUrl}
                                alt={existingItem.username}
                                className={`rounded-full shadow-sm object-cover ${
                                  existingItem.giftTier === 'donut' ? 'border-2 border-amber-400' : 'border border-slate-300'
                                }`}
                                style={{ width: itemSize, height: itemSize }}
                              />
                            </div>
                            <div className="text-xs font-black text-slate-800 mt-1.5 truncate max-w-[120px]">
                              @{existingItem.username}
                            </div>
                            <div className="text-[10px] text-slate-500">Welcome</div>
                          </div>
                        ) : (
                          <div style={{ width: 96, height: 96 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* CASE 3: TRIO ROW (3 drawings per row for Hearts B&N and Flowers small - matching screenshot!) */
                <div className="grid grid-cols-3 gap-2 items-center justify-items-center min-h-[120px]">
                  {[0, 1, 2].map((col) => {
                    const isActive = activeDonor && activeCol === col;
                    const existingItem = activeRowItems[col];
                    const itemSize = 72;

                    return (
                      <div key={col} className="relative flex flex-col items-center w-full">
                        {isActive ? (
                          <div className="relative flex flex-col items-center">
                            <canvas
                              ref={activeCanvasRef}
                              width={itemSize}
                              height={itemSize}
                              className="rounded-full shadow-md ring-2 ring-emerald-500 bg-slate-50"
                              style={{ width: itemSize, height: itemSize }}
                            />

                            <div className="mt-1 text-center">
                              <div className="text-[11px] font-black text-slate-900 truncate max-w-[90px]">
                                @{activeDonor.username}
                              </div>
                              <div className="text-[10px] text-slate-500 font-bold flex items-center justify-center gap-0.5">
                                <span>{activeDonor.giftIcon}</span>
                                <span>{activeDonor.giftName}</span>
                              </div>
                            </div>
                          </div>
                        ) : existingItem ? (
                          <div className="flex flex-col items-center opacity-90">
                            <img
                              src={existingItem.drawnCanvasDataUrl || existingItem.avatarUrl}
                              alt={existingItem.username}
                              className="rounded-full object-cover shadow-sm border border-slate-300"
                              style={{ width: itemSize, height: itemSize }}
                            />
                            <div className="text-[10px] font-black text-slate-800 mt-1 truncate max-w-[85px]">
                              @{existingItem.username}
                            </div>
                            <div className="text-[9px] text-slate-500">Welcome</div>
                          </div>
                        ) : (
                          <div style={{ width: 72, height: 72 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* COMPLETED ROWS FEED DOWNWARDS (Only full rows that have finished printing roll down!) */}
            <div className="relative flex-1 overflow-y-auto space-y-3 pr-1 max-h-[420px]">
              <AnimatePresence>
                {completedRows.map((row) => {
                  if (row.type === 'blank_spacer') {
                    return (
                      <div key={row.id} className="h-10 w-full bg-white" />
                    );
                  }

                  if (row.type === 'big_goot_row' && row.items[0]) {
                    const bigItem = row.items[0];
                    return (
                      <motion.div
                        key={row.id}
                        initial={{ opacity: 0, y: -24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="relative flex flex-col items-center justify-center py-3 bg-white"
                      >
                        <div className="relative flex items-center justify-center">
                          <img
                            src={bigItem.drawnCanvasDataUrl || bigItem.avatarUrl}
                            alt={bigItem.username}
                            className="rounded-full shadow-xl border-4 border-amber-400 object-cover"
                            style={{ width: 195, height: 195 }}
                          />
                          {/* GOOT badge lower down so it does NOT cover the face/profile */}
                          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none z-20">
                            <span className="font-goot text-4xl sm:text-5xl font-black tracking-wider text-amber-400 bg-amber-950/95 border-3 border-amber-400 rounded-xl px-4 py-1 shadow-lg -rotate-3">
                              GOOT
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 text-center">
                          <div className="text-sm font-black text-slate-900">
                            👑 @{bigItem.username}
                          </div>
                        </div>
                      </motion.div>
                    );
                  }

                  if (row.type === 'duo_row') {
                    return (
                      <motion.div
                        key={row.id}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                        className="grid grid-cols-2 gap-4 items-start justify-items-center py-2"
                      >
                        {row.items.map((item) => {
                          const itemSize = getSlotSize(item.giftTier);
                          return (
                            <div key={item.id} className="flex flex-col items-center w-full">
                              {/* Fixed-height box so medium and small circles share the same center line */}
                              <div className="flex items-center justify-center" style={{ height: 96 }}>
                              <div className="relative">
                                <img
                                  src={item.drawnCanvasDataUrl || item.avatarUrl}
                                  alt={item.username}
                                  className={`rounded-full object-cover shadow-sm ${
                                    item.giftTier === 'donut'
                                      ? 'border-2 border-amber-400'
                                      : 'border border-slate-300'
                                  }`}
                                  style={{ width: itemSize, height: itemSize }}
                                />
                                {item.giftTier === 'donut' && (
                                  <span className="absolute -bottom-1 -right-1 rounded-full bg-amber-600 text-white text-[9px] px-1 font-bold shadow">
                                    🍩 Med
                                  </span>
                                )}
                                {item.giftTier === 'heart' && (
                                  <span className="absolute -bottom-1 -right-1 rounded-full bg-slate-900 text-white text-[9px] px-1 font-bold shadow">
                                    ❤️ B&N
                                  </span>
                                )}
                                {item.giftTier === 'flower' && (
                                  <span className="absolute -bottom-1 -right-1 rounded-full bg-pink-600 text-white text-[9px] px-1 font-bold shadow">
                                    🌸 Mini
                                  </span>
                                )}
                              </div>
                              </div>
                              <div className="mt-1 text-center">
                                <div className="text-xs font-black text-slate-900 truncate max-w-[120px]">
                                  @{item.username}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {item.giftName}
                                </div>
                                <div className="text-[9px] text-slate-400">Welcome</div>
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    );
                  }

                  // 3-Slot Trio Row (Heart B&N & Flower small)
                  return (
                    <motion.div
                      key={row.id}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      className="grid grid-cols-3 gap-2 items-start justify-items-center py-2"
                    >
                      {row.items.map((item) => (
                        <div key={item.id} className="flex flex-col items-center">
                          <div className="relative">
                            <img
                              src={item.drawnCanvasDataUrl || item.avatarUrl}
                              alt={item.username}
                              className="rounded-full object-cover shadow-sm border border-slate-300"
                              style={{ width: 72, height: 72 }}
                            />
                            {item.giftTier === 'heart' && (
                              <span className="absolute -bottom-1 -right-1 rounded-full bg-slate-900 text-white text-[9px] px-1 font-bold shadow">
                                ❤️ B&N
                              </span>
                            )}
                            {item.giftTier === 'flower' && (
                              <span className="absolute -bottom-1 -right-1 rounded-full bg-pink-600 text-white text-[9px] px-1 font-bold shadow">
                                🌸 Mini
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-center">
                            <div className="text-[11px] font-black text-slate-900 truncate max-w-[85px]">
                              @{item.username}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {item.giftName}
                            </div>
                            <div className="text-[9px] text-slate-400">Welcome</div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* CURVED BOTTOM SPOOL EDGE (Visual effect of paper wrapping around the bottom roller into infinite loop) */}
            <div className="mt-auto pt-2 flex items-center justify-center">
              <div className="h-1.5 w-40 rounded-full bg-slate-200 shadow-inner" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
