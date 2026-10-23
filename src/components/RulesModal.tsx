import React from 'react';
import { X, Sparkles, Clock, ArrowUp, CheckCircle } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
          <Sparkles className="h-4 w-4" />
          <span>Reglas de Donación en TikTok Live</span>
        </div>

        <h3 className="mt-1 text-xl font-extrabold text-white">
          Cómo se dibujan las fotos de perfil
        </h3>

        <div className="mt-5 space-y-3">
          {/* Rule 1: Heart */}
          <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-2xl border border-slate-700">
              ❤️
            </span>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Dona un Corazón</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                  Blanco y Negro
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                La foto de perfil se dibuja con trazos de lápiz carbón monocromático en blanco y negro.
              </p>
            </div>
          </div>

          {/* Rule 2: Flower */}
          <div className="flex items-start gap-3 rounded-2xl border border-pink-900/40 bg-pink-950/20 p-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-900/40 text-2xl border border-pink-700/40">
              🌸
            </span>
            <div>
              <div className="text-sm font-bold text-pink-200 flex items-center gap-2">
                <span>Dona una Flor / Rosa</span>
                <span className="rounded bg-pink-950 px-1.5 py-0.5 text-[10px] text-pink-300">
                  Color Pequeño
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Se dibuja a color vívido en formato compacto / pequeño sobre la cinta.
              </p>
            </div>
          </div>

          {/* Rule 3: Donut */}
          <div className="flex items-start gap-3 rounded-2xl border border-amber-900/40 bg-amber-950/20 p-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-900/40 text-2xl border border-amber-700/40">
              🍩
            </span>
            <div>
              <div className="text-sm font-bold text-amber-200 flex items-center gap-2">
                <span>Dona una Donut</span>
                <span className="rounded bg-amber-950 px-1.5 py-0.5 text-[10px] text-amber-300">
                  Color Mediano
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Se dibuja a todo color con tamaño mediano y mayor destaque visual.
              </p>
            </div>
          </div>

          {/* Rule 4: Big Gift / GOOT */}
          <div className="flex items-start gap-3 rounded-2xl border-2 border-yellow-500/70 bg-yellow-950/25 p-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-500/20 text-2xl border border-yellow-500/50">
              👑
            </span>
            <div>
              <div className="text-sm font-black text-amber-200 flex items-center gap-2">
                <span>Dona un León / Universo</span>
                <span className="rounded bg-yellow-500 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                  GOOT
                </span>
              </div>
              <p className="mt-0.5 text-xs text-amber-300/90">
                ¡Dibuja en <strong>toda la pantalla completa</strong> con animación monumental y estampa la palabra <strong>GOOT</strong> con fuegos artificiales!
              </p>
            </div>
          </div>
        </div>

        {/* Footnote on 2s & Conveyor */}
        <div className="mt-5 rounded-2xl bg-slate-950/80 p-3.5 text-xs text-slate-300 border border-slate-800 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-rose-300">
            <Clock className="h-3.5 w-3.5" />
            <span>Tiempo exacto de dibujo: 2.0 segundos</span>
          </div>
          <div className="flex items-center gap-2 font-semibold text-cyan-300">
            <ArrowUp className="h-3.5 w-3.5" />
            <span>Mecánica de corredora: Va dibujando, va subiendo y desaparece suavemente al llegar arriba</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  );
};
