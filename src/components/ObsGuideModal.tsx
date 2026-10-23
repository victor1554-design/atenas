import React, { useState } from 'react';
import { X, Copy, Check, Monitor, ExternalLink, Volume2, Sparkles, Trophy } from 'lucide-react';
import { ActiveAppId } from './AppSelector';

interface ObsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultApp?: ActiveAppId;
}

export const ObsGuideModal: React.FC<ObsGuideModalProps> = ({
  isOpen,
  onClose,
  defaultApp = 'soccer',
}) => {
  const [selectedApp, setSelectedApp] = useState<ActiveAppId>(defaultApp);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const soccerUrl = `${origin}/?app=soccer&overlay=1`;
  const printerUrl = `${origin}/?app=printer&overlay=1`;
  const currentUrl = selectedApp === 'soccer' ? soccerUrl : printerUrl;

  const copyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
          <Monitor className="h-4 w-4" />
          <span>Integración con OBS Studio y TikTok Live Studio</span>
        </div>

        <h3 className="mt-1 text-xl font-black text-white">
          Pasos para Conectar OBS a tu Transmisión
        </h3>

        {/* App Switcher Tabs */}
        <div className="mt-4 flex rounded-xl bg-slate-950 p-1 border border-slate-800">
          <button
            onClick={() => setSelectedApp('soccer')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              selectedApp === 'soccer'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="h-4 w-4" />
            <span>Batalla de Clubes</span>
          </button>
          <button
            onClick={() => setSelectedApp('printer')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              selectedApp === 'printer'
                ? 'bg-cyan-500 text-neutral-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Impresora de Fotos</span>
          </button>
        </div>

        {/* Copy Box */}
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/90 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-300 text-xs">
              URL de la Fuente de Navegador (Overlay Transparente):
            </span>
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>Abrir vista previa</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-cyan-300 font-mono text-xs select-all focus:outline-none"
            />
            <button
              onClick={copyUrl}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 font-bold text-xs transition-all shadow-md ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-cyan-600 text-white hover:bg-cyan-500'
              }`}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? '¡Copiado!' : 'Copiar URL'}</span>
            </button>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="mt-5 space-y-3.5 text-xs text-slate-300">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-black text-xs">
              1
            </span>
            <div>
              <strong className="text-white text-sm">Abrir OBS Studio y crear Fuente:</strong>
              <p className="text-slate-400 mt-0.5">
                En el panel inferior de <strong>Fuentes (Sources)</strong> de OBS, haz clic en el botón <strong>+</strong> y selecciona <strong>"Navegador"</strong> (Browser Source). Nómbralo por ejemplo <em className="text-cyan-300">"TikTok - {selectedApp === 'soccer' ? 'Fútbol' : 'Impresora'}"</em>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-black text-xs">
              2
            </span>
            <div>
              <strong className="text-white text-sm">Pegar la URL y ajustar Resolución:</strong>
              <div className="text-slate-400 mt-1 space-y-1">
                <p>En el campo <strong>URL</strong>, pega la URL que copiaste arriba.</p>
                <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800 space-y-1 font-mono text-[11px]">
                  {selectedApp === 'soccer' ? (
                    <>
                      <div className="text-amber-400 font-bold">⚽ Para Batalla de Fútbol (Pantalla Completa):</div>
                      <div>• Ancho (Width): <strong className="text-white">1920</strong> o <strong className="text-white">1280</strong></div>
                      <div>• Alto (Height): <strong className="text-white">1080</strong> o <strong className="text-white">720</strong></div>
                      <div className="text-slate-500 mt-1">O en formato vertical TikTok: Ancho 1080, Alto 1920</div>
                    </>
                  ) : (
                    <>
                      <div className="text-cyan-400 font-bold">🖨️ Para Impresora de Fotos:</div>
                      <div>• Formato Vertical (TikTok): Ancho <strong className="text-white">1080</strong>, Alto <strong className="text-white">1920</strong></div>
                      <div>• Barra / Banner lateral: Ancho <strong className="text-white">450</strong>, Alto <strong className="text-white">850</strong></div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-black text-xs">
              3
            </span>
            <div>
              <strong className="text-white text-sm">Habilitar Audio en Directo:</strong>
              <p className="text-slate-400 mt-0.5">
                Marca la casilla <span className="text-cyan-300 font-semibold">"Controlar audio vía OBS"</span> (Control audio via OBS). Esto permitirá que los silbatos de árbitro, porras y fanfarrias se escuchen en tu transmisión y puedas regular el volumen desde el Mezclador de Audio de OBS.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-black text-xs">
              4
            </span>
            <div>
              <strong className="text-white text-sm">Fondo Transparente Automático:</strong>
              <p className="text-slate-400 mt-0.5">
                Gracias al parámetro <code className="text-cyan-300">overlay=1</code>, el fondo es completamente transparente. Puedes colocar detrás tu cámara web, gameplay o el fondo que desees.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition-colors"
          >
            Entendido, Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

