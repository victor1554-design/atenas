import React, { useEffect, useRef, useState } from 'react';
import { DonorItem } from '../types/tiktok';
import { prepareImageForDrawing, renderSketchFrame, PreparedDrawingData } from '../utils/drawingEngine';
import { soundEngine } from '../utils/audio';
import { BrushTool } from './BrushTool';
import { Paintbrush, Sparkles } from 'lucide-react';

interface DrawingStationProps {
  currentDonor: DonorItem | null;
  onDrawingComplete: (donor: DonorItem, finalDataUrl: string) => void;
  showBrushCursor: boolean;
}

export const DrawingStation: React.FC<DrawingStationProps> = ({
  currentDonor,
  onDrawingComplete,
  showBrushCursor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [brushTip, setBrushTip] = useState<{ x: number; y: number; angle: number }>({
    x: 0,
    y: 0,
    angle: -35,
  });
  const preparedRef = useRef<PreparedDrawingData | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Exact 2.0 seconds requirement:
  const DRAW_DURATION_MS = 2000;

  // Sizing by tier:
  // Heart: 130px
  // Flower: 100px (pequeño a color)
  // Donut: 160px (mediano a color)
  // Big Gift: 180px
  const canvasSize =
    !currentDonor
      ? 130
      : currentDonor.giftTier === 'flower'
      ? 100
      : currentDonor.giftTier === 'donut'
      ? 160
      : currentDonor.giftTier === 'heart'
      ? 130
      : 180;

  useEffect(() => {
    if (!currentDonor) {
      setProgress(0);
      return;
    }

    let isCancelled = false;
    preparedRef.current = null;
    setProgress(0);
    startTimeRef.current = null;

    prepareImageForDrawing(currentDonor.avatarUrl, canvasSize, canvasSize, currentDonor.giftTier).then(
      (prepared) => {
        if (isCancelled) return;
        preparedRef.current = prepared;

        // Start 2.0 seconds animation
        const animate = (timestamp: number) => {
          if (!startTimeRef.current) startTimeRef.current = timestamp;
          const elapsed = timestamp - startTimeRef.current;
          const currentProg = Math.min(1, elapsed / DRAW_DURATION_MS);
          setProgress(currentProg);

          // Audio feedback
          if (elapsed % 180 < 25) {
            soundEngine.playPencilScratch();
          }

          if (canvasRef.current && preparedRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              const tip = renderSketchFrame(ctx, preparedRef.current, currentProg, currentDonor.giftTier);
              setBrushTip({ x: tip.x, y: tip.y, angle: tip.angle });
            }
          }

          if (currentProg < 1) {
            animFrameRef.current = requestAnimationFrame(animate);
          } else {
            // Finished strictly at 2.0s!
            if (canvasRef.current) {
              const finalDataUrl = canvasRef.current.toDataURL('image/png');
              if (currentDonor.giftTier !== 'big_gift') {
                soundEngine.playDrawComplete(currentDonor.giftTier);
              }
              onDrawingComplete(currentDonor, finalDataUrl);
            }
          }
        };

        animFrameRef.current = requestAnimationFrame(animate);
      }
    );

    return () => {
      isCancelled = true;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [currentDonor?.id, canvasSize]);

  if (!currentDonor) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/60 p-5 text-center backdrop-blur-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 text-rose-400">
          <Paintbrush className="h-6 w-6 stroke-[1.8]" />
        </div>
        <p className="mt-3 text-sm font-bold text-slate-200">Plotter con Pincel en Espera</p>
        <p className="text-xs text-slate-400 mt-0.5">Dona un regalo para pintar la foto en vivo</p>
      </div>
    );
  }

  const secondsRemaining = Math.max(0, (DRAW_DURATION_MS * (1 - progress)) / 1000).toFixed(1);

  // Position of the plotter carriage along the horizontal guide rail
  const railProgress = brushTip.x / canvasSize;
  const carriageOffsetPercent = Math.max(10, Math.min(90, railProgress * 100));

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-slate-700/80 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
      {/* 1. MECHANICAL PLOTTER GUIDE RAIL (Inspired by user's reference video) */}
      <div className="relative mb-3 rounded-xl bg-slate-950 p-2 border border-slate-800">
        {/* Metal guide bar */}
        <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 shadow-inner">
          {/* Sliding Mechanical Carriage holding the brush */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-75 ease-out"
            style={{ left: `${carriageOffsetPercent}%` }}
          >
            <div className="relative flex flex-col items-center">
              {/* Carriage mount with bearings */}
              <div className="h-4 w-7 rounded bg-gradient-to-b from-purple-500 to-purple-700 border border-purple-300 shadow-md" />
              {/* Vertical pen sleeve / clamp */}
              <div className="h-2 w-2 bg-slate-200 border border-slate-400" />
            </div>
          </div>
        </div>

        {/* Status text */}
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 font-bold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Pintando con Pincel</span>
          </div>
          <div className="font-mono text-slate-300">
            <span className="text-rose-400 font-bold">{secondsRemaining}s</span> / 2.0s
          </div>
        </div>
      </div>

      {/* 2. ARTIST PAPER SHEET / CLIPBOARD CANVAS (White textured sheet) */}
      <div className="relative mx-auto flex items-center justify-center rounded-2xl bg-white p-3 shadow-xl" style={{ minHeight: canvasSize + 16 }}>
        {/* Top clipboard clip detail */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-3.5 w-16 rounded-b-md bg-slate-400 border border-slate-500 shadow-sm z-10" />

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className="rounded-full shadow-inner"
            style={{ width: canvasSize, height: canvasSize }}
          />

          {/* REALISTIC PAINTBRUSH TOOL */}
          {showBrushCursor && progress < 1 && (
            <BrushTool
              x={brushTip.x}
              y={brushTip.y}
              angle={brushTip.angle}
              tier={currentDonor.giftTier}
              isDrawing={progress > 0 && progress < 1}
              scale={canvasSize > 140 ? 1.15 : 0.95}
            />
          )}
        </div>
      </div>

      {/* 3. FLUID PROGRESS BAR (0.0 to 2.0s) */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 via-rose-500 to-amber-400 transition-all duration-75"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {/* 4. DONOR INFO FOOTER */}
      <div className="mt-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-base">{currentDonor.giftIcon}</span>
          <span className="font-extrabold text-slate-100">@{currentDonor.username}</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">
          {currentDonor.giftTier === 'heart' && '❤️ Corazón · Pincel Tinta Negra B&N'}
          {currentDonor.giftTier === 'flower' && '🌸 Flor · Pincel Acuarela Pequeño'}
          {currentDonor.giftTier === 'donut' && '🍩 Donut · Pincel Acuarela Mediano'}
          {currentDonor.giftTier === 'big_gift' && '👑 Regalo Grande · Preparando GOOT'}
        </p>
      </div>
    </div>
  );
};
