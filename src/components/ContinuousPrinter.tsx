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
  const isDuoRow =
    activeRowType === 'duo_row' ||
    activeDonor?.giftTier === 'donut' ||
    activeRowItems.some((item) => item.giftTier === 'donut');
  const effectiveActiveCol = isDuoRow && activeCol >= 2 ? 0 : activeCol;

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

          // Guarantee canvas bitmap matches currentSize x currentSize before drawing
          if (activeCanvasRef.current) {
            if (
              activeCanvasRef.current.width !== currentSize ||
              activeCanvasRef.current.height !== currentSize
            ) {
              activeCanvasRef.current.width = currentSize;
              activeCanvasRef.current.height = currentSize;
            }
          }

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

        {/* Semi-transparent legend at bottom of printer */}
        <div className="pointer-events-none absolute bottom-5 left-1/2 z-30 -translate-x-1/2 flex flex-col w-56 rounded-2xl border border-white/15 bg-slate-950/35 p-3 backdrop-blur-[2px] space-y-1.5">
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
            className={`relative w-full max-w-[430px] flex flex-col rounded-[2.2rem] border-4 ${
              obsMode
                ? 'border-emerald-600/70 bg-transparent'
                : 'border-[#0f5328] bg-gradient-to-b from-[#1ca650] via-[#15803d] to-[#115e2d] shadow-[0_28px_65px_rgba(0,0,0,0.75),inset_0_2px_4px_rgba(255,255,255,0.28),inset_0_-6px_14px_rgba(0,0,0,0.45)]'
            } pt-3 px-3 pb-4 transition-transform duration-500`}
            style={{
              transform: is3DView ? 'rotateX(8deg) rotateZ(-4deg)' : 'none',
              minHeight: '690px',
            }}
          >
          {/* CHASSIS INDUSTRIAL BEVEL & CORNER SOCKET BOLTS */}
          {!obsMode && (
            <div className="pointer-events-none absolute inset-1.5 rounded-[1.85rem] border border-emerald-300/20 shadow-[inset_0_0_18px_rgba(0,0,0,0.35)]">
              <div className="absolute top-2.5 left-3 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-slate-200 to-slate-600 border border-slate-800 shadow flex items-center justify-center">
                <div className="h-1 w-1 rounded-full bg-slate-900" />
              </div>
              <div className="absolute top-2.5 right-3 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-slate-200 to-slate-600 border border-slate-800 shadow flex items-center justify-center">
                <div className="h-1 w-1 rounded-full bg-slate-900" />
              </div>
              <div className="absolute bottom-2.5 left-3 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-slate-200 to-slate-600 border border-slate-800 shadow flex items-center justify-center">
                <div className="h-1 w-1 rounded-full bg-slate-900" />
              </div>
              <div className="absolute bottom-2.5 right-3 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-slate-200 to-slate-600 border border-slate-800 shadow flex items-center justify-center">
                <div className="h-1 w-1 rounded-full bg-slate-900" />
              </div>
            </div>
          )}

          {/* TOP FULL-WIDTH PAPER ROLL DISPENSER (Thick 3D roll of white paper unwinding seamlessly onto the platen) */}
          <div className="relative z-20 mx-1 -mt-7 mb-0 flex items-center justify-center">
            {/* Left steel axle bracket + visible spiral side of paper roll with kraft core */}
            <div className="relative z-20 flex items-center">
              <div className="h-5 w-2 rounded-l-sm bg-gradient-to-b from-slate-500 via-slate-200 to-slate-700 border border-slate-800 shadow-md" />
              <div className="h-11 w-2.5 rounded-l-md bg-gradient-to-b from-slate-300 via-slate-100 to-slate-400 border-y border-l border-slate-400 flex items-center justify-center shadow-sm">
                {/* Cardboard core end */}
                <div className="h-4 w-1 rounded-full bg-amber-800/80 border border-amber-950/60" />
              </div>
            </div>

            {/* Main full-width 3D cylindrical roll of continuous white paper */}
            <div
              className="relative flex-1 h-11 border-y border-slate-300 shadow-[0_10px_18px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col justify-between"
              style={{
                background:
                  'linear-gradient(180deg, #cbd5e1 0%, #f1f5f9 14%, #ffffff 38%, #f8fafc 62%, #e2e8f0 84%, #94a3b8 100%)',
              }}
            >
              {/* Subtle concentric paper layer lines across the roll */}
              <div
                className="pointer-events-none absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(148,163,184,0.35) 3px, rgba(148,163,184,0.35) 4px)',
                }}
              />
              {/* Top specular highlight on cylinder */}
              <div className="h-1.5 w-full bg-white/90 blur-[0.5px]" />

              {/* Subtle Tractor-feed sprocket holes visible wrapping around the roll */}
              <div className="pointer-events-none absolute inset-y-0 left-1 w-2.5 flex flex-col justify-between items-center py-1.5 opacity-60">
                <span className="h-1 w-1.5 rounded-full bg-slate-400/80" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400/90" />
                <span className="h-1 w-1.5 rounded-full bg-slate-500/80" />
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-1 w-2.5 flex flex-col justify-between items-center py-1.5 opacity-60">
                <span className="h-1 w-1.5 rounded-full bg-slate-400/80" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400/90" />
                <span className="h-1 w-1.5 rounded-full bg-slate-500/80" />
              </div>

              {/* Bottom shadow crease where paper unwinds onto the flat board */}
              <div className="h-2 w-full bg-gradient-to-b from-transparent via-slate-400/40 to-slate-600/60" />
            </div>

            {/* Right visible spiral side of paper roll with kraft core + steel axle bracket */}
            <div className="relative z-20 flex items-center">
              <div className="h-11 w-2.5 rounded-r-md bg-gradient-to-b from-slate-300 via-slate-100 to-slate-400 border-y border-r border-slate-400 flex items-center justify-center shadow-sm">
                {/* Cardboard core end */}
                <div className="h-4 w-1 rounded-full bg-amber-800/80 border border-amber-950/60" />
              </div>
              <div className="h-5 w-2 rounded-r-sm bg-gradient-to-b from-slate-500 via-slate-200 to-slate-700 border border-slate-800 shadow-md" />
            </div>
          </div>

          {/* DUAL HARDENED CHROME VERTICAL LINEAR GUIDE RODS (Left and Right extremities) */}
          <div
            className="pointer-events-none absolute left-[8px] top-7 bottom-12 w-3 rounded-full shadow-[2px_0_8px_rgba(0,0,0,0.55)] border border-slate-600/80 z-30"
            style={{
              background:
                'linear-gradient(90deg, #475569 0%, #cbd5e1 25%, #ffffff 48%, #94a3b8 78%, #334155 100%)',
            }}
          >
            {/* Top machined shaft collar mount */}
            <div className="absolute -top-1.5 -left-1 h-3 w-4.5 rounded-sm bg-gradient-to-r from-slate-700 via-slate-400 to-slate-800 border border-slate-900 shadow-md" />
            {/* Bottom machined shaft collar + rubber damper */}
            <div className="absolute -bottom-1.5 -left-1 h-3.5 w-4.5 rounded-sm bg-gradient-to-b from-slate-900 to-slate-700 border border-slate-950 shadow-md flex items-center justify-center">
              <div className="h-1 w-2.5 rounded-full bg-amber-500/60" />
            </div>
          </div>
          <div
            className="pointer-events-none absolute right-[8px] top-7 bottom-12 w-3 rounded-full shadow-[-2px_0_8px_rgba(0,0,0,0.55)] border border-slate-600/80 z-30"
            style={{
              background:
                'linear-gradient(90deg, #475569 0%, #cbd5e1 25%, #ffffff 48%, #94a3b8 78%, #334155 100%)',
            }}
          >
            {/* Top machined shaft collar mount */}
            <div className="absolute -top-1.5 -left-1 h-3 w-4.5 rounded-sm bg-gradient-to-r from-slate-700 via-slate-400 to-slate-800 border border-slate-900 shadow-md" />
            {/* Bottom machined shaft collar + rubber damper */}
            <div className="absolute -bottom-1.5 -left-1 h-3.5 w-4.5 rounded-sm bg-gradient-to-b from-slate-900 to-slate-700 border border-slate-950 shadow-md flex items-center justify-center">
              <div className="h-1 w-2.5 rounded-full bg-amber-500/60" />
            </div>
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
            {/* Left CNC Anodized Stepper Pillow Block with LM8UU Linear Bearing Sleeve */}
            <div
              className="absolute -left-2 -top-2.5 h-9 w-9 rounded-lg border border-purple-300/60 shadow-[0_8px_16px_rgba(0,0,0,0.65),inset_0_1px_2px_rgba(255,255,255,0.35)] flex items-center justify-center"
              style={{
                background:
                  'linear-gradient(145deg, #7e22ce 0%, #581c87 45%, #2e1065 100%)',
              }}
            >
              {/* Corner hex bolts */}
              <span className="absolute top-1 left-1 h-1 w-1 rounded-full bg-slate-300" />
              <span className="absolute top-1 right-1 h-1 w-1 rounded-full bg-slate-300" />
              <span className="absolute bottom-1 left-1 h-1 w-1 rounded-full bg-slate-300" />
              <span className="absolute bottom-1 right-1 h-1 w-1 rounded-full bg-slate-300" />
              {/* Brass & Chrome Linear Bushing */}
              <div className="h-4.5 w-4.5 rounded-full border-2 border-amber-400/90 bg-gradient-to-b from-slate-700 via-slate-900 to-black shadow-inner flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-slate-300 via-white to-slate-400" />
              </div>
            </div>

            {/* Right CNC Anodized Stepper Pillow Block with LM8UU Linear Bearing Sleeve */}
            <div
              className="absolute -right-2 -top-2.5 h-9 w-9 rounded-lg border border-purple-300/60 shadow-[0_8px_16px_rgba(0,0,0,0.65),inset_0_1px_2px_rgba(255,255,255,0.35)] flex items-center justify-center"
              style={{
                background:
                  'linear-gradient(145deg, #7e22ce 0%, #581c87 45%, #2e1065 100%)',
              }}
            >
              {/* Corner hex bolts */}
              <span className="absolute top-1 left-1 h-1 w-1 rounded-full bg-slate-300" />
              <span className="absolute top-1 right-1 h-1 w-1 rounded-full bg-slate-300" />
              <span className="absolute bottom-1 left-1 h-1 w-1 rounded-full bg-slate-300" />
              <span className="absolute bottom-1 right-1 h-1 w-1 rounded-full bg-slate-300" />
              {/* Brass & Chrome Linear Bushing */}
              <div className="h-4.5 w-4.5 rounded-full border-2 border-amber-400/90 bg-gradient-to-b from-slate-700 via-slate-900 to-black shadow-inner flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-slate-300 via-white to-slate-400" />
              </div>
            </div>

            {/* Extruded Aluminum V-Slot Crossbar Rail + Toothed GT2 Timing Belt */}
            <div
              className="relative h-4 mx-4 rounded-sm border border-slate-500 shadow-[0_6px_12px_rgba(0,0,0,0.45)] flex items-center overflow-hidden"
              style={{
                background:
                  'linear-gradient(180deg, #94a3b8 0%, #f1f5f9 25%, #cbd5e1 52%, #64748b 85%, #334155 100%)',
              }}
            >
              {/* Upper & lower precision rail grooves */}
              <div className="absolute top-0.5 inset-x-1 h-[1px] bg-white/80" />
              {/* Dark recessed V-slot channel with rubber GT2 timing belt teeth */}
              <div
                className="relative mx-2 h-1.5 w-full rounded-full bg-slate-900 shadow-inner flex items-center overflow-hidden"
              >
                <div
                  className="w-full h-full opacity-75"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, #0f172a 0px, #0f172a 3px, #475569 3px, #475569 5px)',
                  }}
                />
              </div>
              <div className="absolute bottom-0.5 inset-x-1 h-[1px] bg-slate-900/40" />
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

          {/* 3. CONTINUOUS WHITE ARTIST PAPER SHEET (Unwinds directly from top roll and reaches bottom roller) */}
          <div className="relative z-10 flex-1 rounded-b-xl bg-gradient-to-b from-slate-200/90 via-white via-8% to-white shadow-[0_12px_28px_rgba(0,0,0,0.45)] border-x-2 border-slate-300 mx-3 -mt-1 pt-7 pb-6 px-3 flex flex-col overflow-hidden">
            {/* Top unwind shadow right underneath the roll cylinder */}
            <div className="pointer-events-none absolute top-0 inset-x-0 h-5 bg-gradient-to-b from-slate-500/35 via-slate-300/15 to-transparent z-10" />

            {/* Tractor-feed side strips with perforated sprocket holes */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-3.5 bg-slate-100/80 border-r border-dashed border-slate-300/80 flex flex-col justify-between items-center py-3 z-10">
              {Array.from({ length: 18 }).map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-slate-300 border border-slate-400/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]"
                />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-3.5 bg-slate-100/80 border-l border-dashed border-slate-300/80 flex flex-col justify-between items-center py-3 z-10">
              {Array.from({ length: 18 }).map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-slate-300 border border-slate-400/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]"
                />
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

                    {/* GIANT "GOAT" RUBBER STAMP ON PAPER - Physical stamp slams down and leaves ink seal */}
                    <AnimatePresence>
                      {isGootStampedOnPaper && (
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none z-30">
                          {/* Ink shockwave ring when the stamp hits the paper */}
                          <motion.div
                            initial={{ scale: 0.5, opacity: 0.9 }}
                            animate={{ scale: 1.75, opacity: 0 }}
                            transition={{ duration: 0.45, ease: 'easeOut' }}
                            className="absolute inset-0 rounded-lg border-2 border-red-600/70"
                          />

                          {/* Stamped Ink Seal left on the paper */}
                          <motion.div
                            initial={{ scale: 1.5, opacity: 0, rotate: -14 }}
                            animate={{ scale: [1.5, 0.92, 1], opacity: 1, rotate: -7 }}
                            transition={{ duration: 0.28, ease: 'easeOut' }}
                            className="relative select-none rounded-md bg-amber-50/95 px-2.5 py-0.5 border-[3px] border-red-700 shadow-[0_6px_16px_rgba(185,28,28,0.45)]"
                            style={{
                              boxShadow:
                                '0 6px 16px rgba(185,28,28,0.4), inset 0 0 0 1px rgba(255,255,255,0.6)',
                            }}
                          >
                            {/* Inner dashed stamp frame */}
                            <div className="border-[1.5px] border-dashed border-red-700/85 rounded-xs px-2.5 py-0.5 flex flex-col items-center leading-none">
                              <span className="text-[7px] font-black tracking-[0.22em] text-red-700/90 uppercase">
                                ★ OFFICIAL SEAL ★
                              </span>
                              <span className="font-goot text-3xl sm:text-4xl font-black tracking-widest text-red-700 uppercase drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]">
                                GOAT
                              </span>
                              <span className="text-[6px] font-extrabold tracking-[0.25em] text-red-700/85 uppercase">
                                ★ ★ ★
                              </span>
                            </div>
                            {/* Subtle distressed ink speckles */}
                            <div
                              className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen"
                              style={{
                                backgroundImage:
                                  'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 0)',
                                backgroundSize: '5px 5px',
                              }}
                            />
                          </motion.div>

                          {/* 3D Physical Wooden & Brass Rubber Stamp Tool slamming down and lifting up */}
                          <motion.div
                            initial={{ y: -95, scale: 1.35, opacity: 0 }}
                            animate={{
                              y: [-95, -4, -4, -110],
                              scale: [1.35, 0.96, 1, 1.25],
                              opacity: [0, 1, 1, 0],
                            }}
                            transition={{
                              duration: 0.75,
                              times: [0, 0.28, 0.55, 1],
                              ease: 'easeInOut',
                            }}
                            className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 flex flex-col items-center z-40 drop-shadow-[0_16px_18px_rgba(0,0,0,0.65)]"
                          >
                            {/* Wooden stamp knob top */}
                            <div className="h-7 w-9 rounded-full bg-gradient-to-r from-amber-950 via-amber-700 to-amber-950 border-2 border-amber-950 shadow-inner" />
                            {/* Wooden stamp shaft */}
                            <div className=" -mt-1.5 h-8 w-4 bg-gradient-to-r from-amber-950 via-amber-800 to-amber-950 border-x border-amber-950" />
                            {/* Brass ferrule ring */}
                            <div className="h-2.5 w-8 rounded-xs bg-gradient-to-r from-yellow-700 via-amber-300 to-yellow-800 border border-amber-950" />
                            {/* Heavy metallic stamp base */}
                            <div className="h-3.5 w-28 rounded-t-md bg-gradient-to-b from-slate-300 via-slate-500 to-slate-800 border-2 border-slate-900 shadow-md" />
                            {/* Red rubber ink pad bottom */}
                            <div className="h-2 w-26 rounded-b-xs bg-red-800 border-x border-b border-red-950" />
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="mt-5 text-center">
                    <div className="text-sm font-black text-slate-900">
                      👑 @{activeDonor.username}
                    </div>
                  </div>
                </div>
              ) : isDuoRow ? (
                /* CASE 2: DUO ROW (2 drawings per row when Donut medium is present. Pure white paper) */
                <div className="grid grid-cols-2 gap-4 items-center justify-items-center min-h-[140px]">
                  {[0, 1].map((col) => {
                    const isActive = activeDonor && effectiveActiveCol === col;
                    const existingItem = activeRowItems[col];
                    const itemTier = isActive ? activeDonor.giftTier : existingItem?.giftTier;
                    const itemSize = getSlotSize(itemTier);

                    return (
                      <div key={col} className="relative flex flex-col items-center w-full">
                        {isActive ? (
                          <div className="relative flex flex-col items-center">
                            <div
                              className="flex items-center justify-center shrink-0"
                              style={{ width: 96, height: 96 }}
                            >
                              <canvas
                                key={activeDonor.id}
                                ref={activeCanvasRef}
                                width={itemSize}
                                height={itemSize}
                                className={`rounded-full shadow-md bg-slate-50 aspect-square shrink-0 ${
                                  activeDonor.giftTier === 'donut' ? 'border-2 border-amber-400' : 'ring-2 ring-emerald-500'
                                }`}
                                style={{
                                  width: itemSize,
                                  height: itemSize,
                                  minWidth: itemSize,
                                  minHeight: itemSize,
                                }}
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
                            <div
                              className="flex items-center justify-center shrink-0"
                              style={{ width: 96, height: 96 }}
                            >
                              <img
                                src={existingItem.drawnCanvasDataUrl || existingItem.avatarUrl}
                                alt={existingItem.username}
                                className={`rounded-full shadow-sm object-cover aspect-square shrink-0 ${
                                  existingItem.giftTier === 'donut' ? 'border-2 border-amber-400' : 'border border-slate-300'
                                }`}
                                style={{
                                  width: itemSize,
                                  height: itemSize,
                                  minWidth: itemSize,
                                  minHeight: itemSize,
                                }}
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
                    const isActive = activeDonor && effectiveActiveCol === col;
                    const existingItem = activeRowItems[col];
                    const itemTier = isActive ? activeDonor.giftTier : existingItem?.giftTier;
                    const itemSize = getSlotSize(itemTier);

                    return (
                      <div key={col} className="relative flex flex-col items-center w-full">
                        {isActive ? (
                          <div className="relative flex flex-col items-center">
                            <canvas
                              key={activeDonor.id}
                              ref={activeCanvasRef}
                              width={itemSize}
                              height={itemSize}
                              className="rounded-full shadow-md ring-2 ring-emerald-500 bg-slate-50 aspect-square shrink-0"
                              style={{
                                width: itemSize,
                                height: itemSize,
                                minWidth: itemSize,
                                minHeight: itemSize,
                              }}
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
                              className="rounded-full object-cover shadow-sm border border-slate-300 aspect-square shrink-0"
                              style={{
                                width: itemSize,
                                height: itemSize,
                                minWidth: itemSize,
                                minHeight: itemSize,
                              }}
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

            {/* COMPLETED ROWS FEED DOWNWARDS */}
            <div className="relative z-10 flex-1 overflow-y-auto space-y-3 pr-1 max-h-[420px]">
              <AnimatePresence>
                {completedRows.map((row) => {
                  if (row.type === 'blank_spacer') {
                    return (
                      <div key={row.id} className="h-10 w-full bg-transparent" />
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
                        className="relative flex flex-col items-center justify-center py-3"
                      >
                        <div className="relative flex items-center justify-center">
                          <img
                            src={bigItem.drawnCanvasDataUrl || bigItem.avatarUrl}
                            alt={bigItem.username}
                            className="rounded-full shadow-xl border-4 border-amber-400 object-cover"
                            style={{ width: 195, height: 195 }}
                          />
                          {/* GOAT ink stamp lower down so it does NOT cover the face/profile */}
                          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none z-20">
                            <div
                              className="relative select-none rounded-md bg-amber-50/95 px-2.5 py-0.5 border-[3px] border-red-700 shadow-lg -rotate-7"
                              style={{
                                boxShadow:
                                  '0 4px 12px rgba(185,28,28,0.35), inset 0 0 0 1px rgba(255,255,255,0.6)',
                              }}
                            >
                              <div className="border-[1.5px] border-dashed border-red-700/85 rounded-xs px-2.5 py-0.5 flex flex-col items-center leading-none">
                                <span className="text-[7px] font-black tracking-[0.22em] text-red-700/90 uppercase">
                                  ★ OFFICIAL SEAL ★
                                </span>
                                <span className="font-goot text-3xl sm:text-4xl font-black tracking-widest text-red-700 uppercase drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]">
                                  GOAT
                                </span>
                                <span className="text-[6px] font-extrabold tracking-[0.25em] text-red-700/85 uppercase">
                                  ★ ★ ★
                                </span>
                              </div>
                              <div
                                className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen"
                                style={{
                                  backgroundImage:
                                    'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 0)',
                                  backgroundSize: '5px 5px',
                                }}
                              />
                            </div>
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
                              <div className="flex items-center justify-center shrink-0" style={{ width: 96, height: 96 }}>
                              <div className="relative shrink-0" style={{ width: itemSize, height: itemSize }}>
                                <img
                                  src={item.drawnCanvasDataUrl || item.avatarUrl}
                                  alt={item.username}
                                  className={`rounded-full object-cover shadow-sm aspect-square shrink-0 ${
                                    item.giftTier === 'donut'
                                      ? 'border-2 border-amber-400'
                                      : 'border border-slate-300'
                                  }`}
                                  style={{
                                    width: itemSize,
                                    height: itemSize,
                                    minWidth: itemSize,
                                    minHeight: itemSize,
                                  }}
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

            {/* Bottom curl shadow where paper meets the lower roller */}
            <div className="pointer-events-none absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-slate-400/40 via-slate-200/20 to-transparent" />
          </div>

          {/* 4. BOTTOM METALLIC ROLLER / PAPER FEED BAR */}
          <div className="relative z-20 mx-1 -mt-2 flex items-center">
            {/* Left Roller End Cap */}
            <div className="h-5 w-3 rounded-l-md bg-gradient-to-b from-slate-600 via-slate-800 to-slate-950 border border-slate-700 shadow-md" />
            {/* Main Lower Metallic Bar */}
            <div
              className="h-6 flex-1 rounded-full border-2 border-slate-700 shadow-[0_8px_18px_rgba(0,0,0,0.65)] relative overflow-hidden"
              style={{
                background:
                  'linear-gradient(180deg, #475569 0%, #94a3b8 22%, #f8fafc 45%, #cbd5e1 60%, #334155 88%, #0f172a 100%)',
              }}
            >
              {/* Rubber grip rings on bottom roller */}
              <div className="absolute inset-y-0 left-8 w-4 bg-slate-900/80 border-x border-slate-600/50" />
              <div className="absolute inset-y-0 right-8 w-4 bg-slate-900/80 border-x border-slate-600/50" />
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-6 bg-slate-900/80 border-x border-slate-600/50" />
            </div>
            {/* Right Roller End Cap */}
            <div className="h-5 w-3 rounded-r-md bg-gradient-to-b from-slate-600 via-slate-800 to-slate-950 border border-slate-700 shadow-md" />
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
