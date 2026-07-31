import React from 'react';
import { X, Share, PlusSquare, Smartphone, Check, ArrowUpRight } from 'lucide-react';

interface PwaPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaPromptModal: React.FC<PwaPromptModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 mx-auto flex items-center justify-center shadow-lg shadow-red-500/30">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white">Install App on Home Screen</h3>
          <p className="text-xs text-slate-400">
            Enjoy full-screen YouTube Video Downloader right from your phone home screen!
          </p>
        </div>

        {/* iOS Safari Guide */}
        <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
          <div className="font-bold text-red-400 flex items-center space-x-1.5">
            <span>iOS Safari Instructions:</span>
          </div>
          <ol className="space-y-2 text-slate-300">
            <li className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                1
              </span>
              <span>
                Tap the <Share className="w-3.5 h-3.5 inline-block text-blue-400 mx-1" /> <strong>Share</strong> button in Safari's bottom toolbar.
              </span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                2
              </span>
              <span>
                Scroll down and tap <PlusSquare className="w-3.5 h-3.5 inline-block text-emerald-400 mx-1" /> <strong>Add to Home Screen</strong>.
              </span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                3
              </span>
              <span>Tap <strong>Add</strong> in the top right corner. Done!</span>
            </li>
          </ol>
        </div>

        {/* Android / Desktop Guide */}
        <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
          <div className="font-bold text-slate-300">Android Chrome / Desktop:</div>
          <p className="text-slate-400">
            Tap the browser menu (<strong>⋮</strong>) and select <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
