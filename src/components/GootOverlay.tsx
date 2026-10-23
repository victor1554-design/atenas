import React, { useEffect, useRef, useState } from 'react';
import { DonorItem } from '../types/tiktok';
import { prepareImageForDrawing, renderSketchFrame, PreparedDrawingData } from '../utils/drawingEngine';
import { soundEngine } from '../utils/audio';
import { BrushTool } from './BrushTool';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Sparkles, X } from 'lucide-react';

interface GootOverlayProps {
  donor: DonorItem | null;
  onClose: (drawnDataUrl?: string) => void;
  showBrushCursor: boolean;
}

export const GootOverlay: React.FC<GootOverlayProps> = ({
  donor,
  onClose,
  showBrushCursor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [brushTip, setBrushTip] = useState<{ x: number; y: number; angle: number }>({
    x: 0,
    y: 0,
    angle: -35,
  });
  const [isGootRevealed, setIsGootRevealed] = useState<boolean>(false);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const preparedRef = useRef<PreparedDrawingData | null>(null);

  // Exact 2.0 seconds requirement
  const DRAW_DURATION_MS = 2000;
  const CANVAS_SIZE = 280;

  useEffect(() => {
    if (!donor) {
      setProgress(0);
      setIsGootRevealed(false);
      return;
    }

    let isCancelled = false;
    setProgress(0);
    setIsGootRevealed(false);
    startTimeRef.current = null;

    soundEngine.playGootFanfare();

    prepareImageForDrawing(donor.avatarUrl, CANVAS_SIZE, CANVAS_SIZE, 'big_gift').then(
      (prepared) => {
        if (isCancelled) return;
        preparedRef.current = prepared;

        const animate = (timestamp: number) => {
          if (!startTimeRef.current) startTimeRef.current = timestamp;
          const elapsed = timestamp - startTimeRef.current;
          const currentProg = Math.min(1, elapsed / DRAW_DURATION_MS);
          setProgress(currentProg);

          if (canvasRef.current && preparedRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              const tip = renderSketchFrame(ctx, preparedRef.current, currentProg, 'big_gift');
              setBrushTip({ x: tip.x, y: tip.y, angle: tip.angle });
            }
          }

          if (currentProg < 1) {
            animFrameRef.current = requestAnimationFrame(animate);
          } else {
            // Reached exactly 2.0s! Trigger GOOT stamp and fireworks!
            setIsGootRevealed(true);

            // Explosive confetti
            try {
              confetti({
                particleCount: 140,
                spread: 110,
                origin: { y: 0.6 },
                colors: ['#F59E0B', '#FBBF24', '#FE2C55', '#25F4EE', '#FFFFFF'],
              });

              setTimeout(() => {
                confetti({
                  particleCount: 80,
                  angle: 60,
                  spread: 55,
                  origin: { x: 0 },
                  colors: ['#F59E0B', '#EAB308', '#FFFFFF'],
                });
                confetti({
                  particleCount: 80,
                  angle: 120,
                  spread: 55,
                  origin: { x: 1 },
                  colors: ['#FE2C55', '#25F4EE', '#FFFFFF'],
                });
              }, 400);
            } catch {
              // Confetti error suppressed
            }

            // Auto dismiss after 5.5 seconds of total celebration
            setTimeout(() => {
              if (canvasRef.current) {
                onClose(canvasRef.current.toDataURL('image/png'));
              } else {
                onClose();
              }
            }, 5500);
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
  }, [donor?.id]);

  if (!donor) return null;

  const secondsRemaining = Math.max(0, (DRAW_DURATION_MS * (1 - progress)) / 1000).toFixed(1);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 overflow-hidden"
      >
        {/* Ambient golden aura background */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[600px] w-[600px] rounded-full bg-gradient-to-r from-amber-500/20 via-rose-500/15 to-cyan-500/20 blur-3xl" />
        </div>

        {/* Close manual button */}
        <button
          onClick={() => {
            const dataUrl = canvasRef.current?.toDataURL('image/png');
            onClose(dataUrl);
          }}
          className="absolute top-6 right-6 z-50 rounded-full bg-slate-800/80 p-2.5 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          title="Cerrar alerta GOOT"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Main Centerpiece */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-xl">
          {/* Header Banner */}
          <motion.div
            initial={{ scale: 0.8, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/10 px-4 py-1.5 text-sm font-bold text-amber-300 shadow-lg shadow-amber-950/50"
          >
            <Crown className="h-4 w-4 text-amber-400 fill-amber-400" />
            <span>¡DONACIÓN MONUMENTAL TIKTOK!</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </motion.div>

          {/* Monumental Canvas Drawing container */}
          <div className="relative my-2 flex items-center justify-center">
            {/* Glowing ring frame */}
            <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-cyan-400 opacity-70 blur-md animate-pulse" />

            <div className="relative rounded-full border-4 border-amber-300 bg-white p-1 shadow-2xl">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="rounded-full"
                style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
              />

              {/* REALISTIC PAINTBRUSH FOR MONUMENTAL GOOT DRAWING */}
              {showBrushCursor && progress < 1 && (
                <BrushTool
                  x={brushTip.x}
                  y={brushTip.y}
                  angle={brushTip.angle}
                  tier="big_gift"
                  isDrawing={progress > 0 && progress < 1}
                  scale={1.4}
                />
              )}
            </div>
          </div>

          {/* Timer before GOOT stamp */}
          {!isGootRevealed && (
            <div className="mt-3 text-xs font-mono text-amber-300/80">
              Pintando con pincel en toda la pantalla: <span className="font-bold text-white">{secondsRemaining}s</span> / 2.0s
            </div>
          )}

          {/* THE GIANT "GOOT" STAMP (Appears upon 2s completion) */}
          <AnimatePresence>
            {isGootRevealed && (
              <motion.div
                initial={{ scale: 3.5, rotate: -15, opacity: 0 }}
                animate={{ scale: [3.5, 0.9, 1.05, 1], rotate: [-15, -4, 0], opacity: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="relative my-2"
              >
                <div className="relative font-goot text-7xl md:text-9xl font-black tracking-tighter uppercase">
                  {/* Shadow glow layer */}
                  <span className="absolute inset-0 select-none text-transparent blur-md bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 opacity-90">
                    GOOT
                  </span>
                  {/* Top vibrant golden chrome text */}
                  <span className="relative select-none bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_10px_20px_rgba(245,158,11,0.6)]">
                    GOOT
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Donor Information */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4"
          >
            <div className="flex items-center justify-center gap-2 text-2xl font-black text-white">
              <span>{donor.giftIcon}</span>
              <span>@{donor.username}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-amber-300">
              {donor.giftName} ({donor.coins.toLocaleString()} Monedas)
            </p>
            {donor.comment && (
              <p className="mt-2 text-base text-slate-300 italic">
                "{donor.comment}"
              </p>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
