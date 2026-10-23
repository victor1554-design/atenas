import React from 'react';
import { ExternalLink, Layers, Monitor } from 'lucide-react';

interface HeaderNavProps {
  obsMode: boolean;
  onToggleObsMode: () => void;
  onOpenObsGuide: () => void;
  onOpenRulesModal: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  obsMode,
  onToggleObsMode,
  onOpenObsGuide,
  onOpenRulesModal,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 border-b border-slate-800 bg-slate-950/80 px-6 py-3.5 backdrop-blur-md">
      {/* Zone 1: Single text element wordmark */}
      <a href="/" className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2">
        <span className="flex h-3 w-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
        <span>TikTok Live Drawing Runner</span>
      </a>

      {/* Zone 2: Clean single-line text links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
        <button
          onClick={onOpenRulesModal}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Reglas de Regalos
        </button>
        <button
          onClick={onOpenObsGuide}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Guía OBS Studio
        </button>
        <span className="text-slate-500">·</span>
        <span className="text-slate-400 whitespace-nowrap shrink-0">
          Animación: <strong className="text-slate-200">2.0 Segundos</strong>
        </span>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleObsMode}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            obsMode
              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-lg shadow-amber-500/20'
              : 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          {obsMode ? <Monitor className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
          <span>{obsMode ? 'Volver al Estudio' : 'Vista Limpia OBS'}</span>
        </button>
      </div>
    </header>
  );
};
