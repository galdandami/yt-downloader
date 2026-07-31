import React from 'react';
import { Youtube, Download, Smartphone } from 'lucide-react';

interface HeaderProps {
  onShowPwaModal?: () => void;
  isPwaInstallable?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onShowPwaModal, isPwaInstallable }) => {
  return (
    <header className="w-full max-w-4xl mx-auto pt-6 pb-4 px-4 flex items-center justify-between border-b border-white/10 mb-8">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Youtube className="w-5 h-5 text-indigo-400" />
          </div>
        </div>
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent">
            YouTube Downloader
          </h1>
          <p className="text-xs text-slate-400">Видео, Shorts и Плейлисты</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {onShowPwaModal && (
          <button
            onClick={onShowPwaModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 transition-all shadow-sm backdrop-blur-md"
            title="Установить PWA Приложение"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">PWA Мобильная версия</span>
          </button>
        )}
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Онлайн</span>
        </div>
      </div>
    </header>
  );
};

