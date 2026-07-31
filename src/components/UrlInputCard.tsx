import React, { useState } from 'react';
import { Youtube, Link, Clipboard, X, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';

interface UrlInputCardProps {
  onFetchVideo: (url: string) => void;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export const UrlInputCard: React.FC<UrlInputCardProps> = ({
  onFetchVideo,
  isLoading,
  errorMessage,
  onClearError,
}) => {
  const [inputUrl, setInputUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    onFetchVideo(inputUrl.trim());
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text.trim());
        onClearError();
      }
    } catch (err) {
      console.warn('Clipboard read permission denied', err);
    }
  };

  const handleClear = () => {
    setInputUrl('');
    onClearError();
  };

  return (
    <div className="w-full max-w-2xl mx-auto glass-card p-6 sm:p-10 relative overflow-hidden transition-all shadow-2xl">
      {/* Background glow accents */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center mb-8">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium mb-4 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Скачивание Видео, Shorts и Плейлистов</span>
        </div>
        
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2 bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          YouTube Video & Playlist Downloader
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
          Вставьте ссылку на любое видео, Shorts или плейлист YouTube для быстрого скачивания в MP4 и MP3.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
        <div className="relative flex items-center">
          <div className="absolute left-4 text-slate-400 pointer-events-none flex items-center">
            <Link className="w-5 h-5 text-indigo-400" />
          </div>

          <input
            type="url"
            value={inputUrl}
            onChange={(e) => {
              setInputUrl(e.target.value);
              if (errorMessage) onClearError();
            }}
            placeholder="Вставьте ссылку на видео или плейлист YouTube..."
            className="w-full glass-input text-white placeholder-slate-400 text-sm sm:text-base pl-12 pr-24 py-4 rounded-2xl outline-none transition-all duration-200 shadow-inner"
            required
            autoComplete="off"
            spellCheck="false"
          />

          <div className="absolute right-3 flex items-center space-x-1.5">
            {inputUrl ? (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Очистить"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePaste}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium transition-colors border border-white/10"
                title="Вставить из буфера"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Вставить</span>
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="flex items-center space-x-2 text-rose-300 text-sm bg-rose-500/15 border border-rose-500/30 px-4 py-3 rounded-xl animate-fadeIn backdrop-blur-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Get Video Button */}
        <button
          type="submit"
          disabled={isLoading || !inputUrl.trim()}
          className="get-btn w-full relative group overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base py-4 rounded-2xl shadow-xl shadow-indigo-500/25 active:scale-[0.99] transition-all duration-200 flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Загрузка данных...</span>
            </>
          ) : (
            <>
              <Youtube className="w-5 h-5 fill-current" />
              <span>Получить Видео / Плейлист</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

