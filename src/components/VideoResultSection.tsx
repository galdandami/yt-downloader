import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Download,
  Play,
  Film,
  Music,
  ExternalLink,
  Copy,
  Check,
  Share2,
  ShieldCheck,
  Loader2,
  Server
} from 'lucide-react';
import { YouTubeVideoInfo } from '../types';
import { getDirectDownloadLink, getDownloadMirrorUrls } from '../utils/youtube';

interface VideoResultSectionProps {
  videoInfo: YouTubeVideoInfo | null;
  onClear: () => void;
}

export const VideoResultSection: React.FC<VideoResultSectionProps> = ({ videoInfo, onClear }) => {
  const [showEmbed, setShowEmbed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeFormat, setActiveFormat] = useState<'mp4' | 'mp3'>('mp4');
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!videoInfo) return null;

  const currentThumbnail = imgSrc || videoInfo.thumbnailUrl;
  const mirrors = getDownloadMirrorUrls(videoInfo.id, activeFormat);
  const mainMirrorUrl = mirrors[0].url;

  const handleMainDownload = async () => {
    setIsDownloading(true);
    try {
      const downloadEndpoint = `/api/download?id=${videoInfo.id}&format=${activeFormat}&title=${encodeURIComponent(videoInfo.title)}`;
      
      // Create temporary invisible anchor to trigger browser native download
      const link = document.createElement('a');
      link.href = downloadEndpoint;
      link.setAttribute('download', `${videoInfo.title}.${activeFormat}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Download trigger error, fallback to mirror', err);
      window.open(mainMirrorUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setTimeout(() => setIsDownloading(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(mainMirrorUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy link', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: videoInfo.title,
          text: `Download ${videoInfo.title} in MP4/MP3!`,
          url: mainMirrorUrl,
        });
      } catch (err) {
        console.log('Share canceled', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleImageError = () => {
    if (currentThumbnail !== videoInfo.fallbackThumbnailUrl) {
      setImgSrc(videoInfo.fallbackThumbnailUrl);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 30, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: 20, height: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-2xl mx-auto mt-6 glass-card p-6 sm:p-8 shadow-2xl overflow-hidden relative text-slate-100"
    >
      {/* Top Status */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Видео Готово К Скачиванию
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-slate-400 hover:text-white transition-colors underline"
        >
          Закрыть
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Thumbnail or Embedded Player */}
        <div className="md:col-span-5 relative group rounded-2xl overflow-hidden bg-slate-950 border border-white/10 aspect-video md:aspect-4/3 shadow-lg">
          {showEmbed ? (
            <iframe
              src={`${videoInfo.embedUrl}?autoplay=1`}
              title={videoInfo.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <>
              <img
                src={currentThumbnail}
                alt={videoInfo.title}
                onError={handleImageError}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent flex items-center justify-center">
                <button
                  onClick={() => setShowEmbed(true)}
                  className="w-12 h-12 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-600/40 hover:scale-110 active:scale-95 transition-all group/btn"
                  title="Воспроизвести Предпросмотр"
                >
                  <Play className="w-5 h-5 fill-current translate-x-0.5" />
                </button>
              </div>

              {/* Video Type Badge */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider">
                {videoInfo.isShort ? '⚡ Shorts' : '🎬 HD Video'}
              </div>
            </>
          )}
        </div>

        {/* Video Info & Controls */}
        <div className="md:col-span-7 space-y-4">
          <div>
            <span className="text-xs font-semibold text-purple-400 block mb-1">
              {videoInfo.authorName || 'YouTube Автор'}
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white leading-snug line-clamp-2">
              {videoInfo.title}
            </h3>
          </div>

          {/* Format Selector Pills */}
          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={() => setActiveFormat('mp4')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                activeFormat === 'mp4'
                  ? 'bg-red-500/20 border-red-500 text-red-400 shadow-sm'
                  : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>MP4 Видео</span>
            </button>
            <button
              onClick={() => setActiveFormat('mp3')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                activeFormat === 'mp3'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm'
                  : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>MP3 Аудио</span>
            </button>
          </div>

          {/* MAIN DOWNLOAD BUTTON */}
          <div className="pt-2">
            <button
              onClick={handleMainDownload}
              disabled={isDownloading}
              className="dl-pulse relative group w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white font-extrabold text-lg py-4 px-6 rounded-2xl shadow-xl transition-all duration-300 transform active:scale-[0.98] overflow-hidden disabled:opacity-75"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                  <span>Подготовка файла...</span>
                </>
              ) : (
                <>
                  <Download className="w-6 h-6 animate-bounce" />
                  <span>Скачать {activeFormat.toUpperCase()}</span>
                  <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="flex items-center justify-between gap-2 pt-1 text-xs">
            <button
              onClick={handleCopyLink}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-black/30 hover:bg-black/50 border border-white/10 text-slate-300 font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Ссылка Скопирована!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Скопировать Ссылку</span>
                </>
              )}
            </button>

            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-black/30 hover:bg-black/50 border border-white/10 text-slate-300 font-medium transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Поделиться</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alternative Download Servers */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Альтернативные Серверы Скачивания</span>
          </div>
          <span className="text-[11px] text-slate-400">Выберите подходящий зеркальный сервер</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {mirrors.map((mirror, index) => (
            <a
              key={index}
              href={mirror.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between group transition-all"
            >
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <Server className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors flex items-center space-x-1.5">
                    <span className="truncate">{mirror.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-300 font-semibold shrink-0">
                      {mirror.badge}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {mirror.description}
                  </div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0 transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

