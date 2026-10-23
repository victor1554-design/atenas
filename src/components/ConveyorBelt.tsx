import React from 'react';
import { DonorItem } from '../types/tiktok';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy } from 'lucide-react';

interface ConveyorBeltProps {
  conveyorItems: DonorItem[];
  onRemoveItem: (id: string) => void;
  speed: number;
  obsMode: boolean;
}

export const ConveyorBelt: React.FC<ConveyorBeltProps> = ({
  conveyorItems,
  onRemoveItem,
  speed,
  obsMode,
}) => {
  // Travel duration before an item reaches top and disappears
  const travelDuration = Math.max(6, Math.min(25, 600 / (speed || 60)));

  return (
    <div
      className={`relative flex h-full w-full flex-col overflow-hidden rounded-3xl ${
        obsMode
          ? 'bg-transparent'
          : 'border-2 border-slate-700/80 bg-slate-900/60 shadow-2xl backdrop-blur-md'
      }`}
    >
      {/* Top Gradient Mask for smooth fade-out ("desapareciendo") */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-28 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent" />

      {/* Vertical Plotter Guideline */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent" />

      {/* Header bar on top of the runner */}
      {!obsMode && (
        <div className="relative z-30 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 py-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Corredora de Retratos Pintados
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-mono tabular-nums font-bold text-white">{conveyorItems.length}</span> en cola
          </div>
        </div>
      )}

      {/* Running Area (Waterfall upward continuous scroll) */}
      <div className="relative flex-1 overflow-hidden px-4">
        <AnimatePresence>
          {conveyorItems.map((item, index) => {
            const isSmall = item.giftTier === 'flower';
            const isMedium = item.giftTier === 'donut';
            const isHeart = item.giftTier === 'heart';

            const avatarSize = isSmall ? 'h-16 w-16' : isMedium ? 'h-24 w-24' : 'h-20 w-20';
            const paperBorder = isHeart
              ? 'border-slate-300 shadow-slate-900/30'
              : isSmall
              ? 'border-pink-300 shadow-pink-950/30'
              : isMedium
              ? 'border-amber-300 shadow-amber-950/30'
              : 'border-yellow-400 ring-2 ring-yellow-400/50 shadow-yellow-950/40';

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 120, scale: 0.9 }}
                animate={{
                  opacity: [0, 1, 1, 0.7, 0],
                  y: [-10, -560], // Moves continuously upwards
                  scale: [0.9, 1, 1, 0.96, 0.85],
                }}
                transition={{
                  duration: travelDuration,
                  ease: 'linear',
                  times: [0, 0.08, 0.75, 0.92, 1],
                }}
                onAnimationComplete={() => onRemoveItem(item.id)}
                className="absolute inset-x-0 bottom-4 mx-auto flex max-w-sm flex-col items-center pointer-events-none"
                style={{
                  zIndex: 10 + index,
                }}
              >
                {/* Drawn Card Wrapper (Art Paper Card inspired by reference video) */}
                <div
                  className={`group relative flex flex-col items-center rounded-2xl border-2 ${paperBorder} ${
                    obsMode
                      ? 'bg-slate-950/95 shadow-2xl'
                      : 'bg-white shadow-xl text-slate-900'
                  } p-3 backdrop-blur-md transition-transform`}
                >
                  {/* Floating Gift Badge */}
                  <div className="absolute -top-3.5 flex items-center gap-1 rounded-full bg-slate-950 border border-slate-700 px-2.5 py-0.5 text-xs font-semibold shadow-md text-white">
                    <span className="text-sm">{item.giftIcon}</span>
                    <span>{item.giftName}</span>
                  </div>

                  {/* The Drawn Portrait */}
                  <div className="relative mt-2">
                    <img
                      src={item.drawnCanvasDataUrl || item.avatarUrl}
                      alt={item.username}
                      className={`${avatarSize} rounded-full object-cover shadow-md ring-2 ring-slate-200/50`}
                    />
                    {item.giftTier === 'heart' && (
                      <span className="absolute bottom-0 right-0 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white border border-slate-700">
                        B&N
                      </span>
                    )}
                    {item.giftTier === 'flower' && (
                      <span className="absolute bottom-0 right-0 rounded-full bg-pink-600 px-1.5 py-0.5 text-[10px] font-bold text-white border border-pink-400">
                        Color Mini
                      </span>
                    )}
                    {item.giftTier === 'donut' && (
                      <span className="absolute bottom-0 right-0 rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white border border-amber-400">
                        Color Mediano
                      </span>
                    )}
                  </div>

                  {/* Username & Donation info (Under portrait, like the reference video) */}
                  <div className="mt-2 text-center">
                    <div
                      className={`text-xs font-black tracking-tight ${
                        obsMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      @{item.username}
                    </div>
                    {item.comment && (
                      <div className="mt-0.5 max-w-[170px] truncate text-[11px] text-slate-500 italic">
                        "{item.comment}"
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {conveyorItems.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Sparkles className="h-8 w-8 stroke-[1.5] text-slate-600 mb-2" />
            <p className="text-sm font-medium">Los retratos pintados ascenderán por aquí</p>
            <p className="text-xs text-slate-600 mt-1">
              Como en un plotter continuo, suben y se desvanecen en la cima
            </p>
          </div>
        )}
      </div>

      {/* Bottom subtle edge */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-10 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
    </div>
  );
};
