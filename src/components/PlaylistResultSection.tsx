import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ListVideo,
  Download,
  Film,
  Music,
  ExternalLink,
  Copy,
  Check,
  Share2,
  FileSpreadsheet,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  Play
} from 'lucide-react';
import { YouTubePlaylistInfo, PlaylistItem } from '../types';
import { getDownloadMirrorUrls, getDirectDownloadLink } from '../utils/youtube';

interface PlaylistResultSectionProps {
  playlistInfo: YouTubePlaylistInfo | null;
  onClear: () => void;
  onSelectSingleVideo?: (url: string) => void;
}

export const PlaylistResultSection: React.FC<PlaylistResultSectionProps> = ({
  playlistInfo,
  onClear,
  onSelectSingleVideo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'mp4' | 'mp3'>('mp4');
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activePreviewVideo, setActivePreviewVideo] = useState<PlaylistItem | null>(null);

  if (!playlistInfo) return null;

  const filteredItems = playlistInfo.items.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.authorName && item.authorName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === playlistInfo.items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(playlistInfo.items.map((i) => i.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const targetItems = selectedIds.size > 0
    ? playlistInfo.items.filter((i) => selectedIds.has(i.id))
    : playlistInfo.items;

  // Batch download opening handler
  const handleBatchDownload = () => {
    targetItems.forEach((item, index) => {
      const url = getDownloadMirrorUrls(item.id, selectedFormat)[0].url;
      setTimeout(() => {
        window.open(url, '_blank', 'noopener,noreferrer');
      }, index * 400);
    });
  };

  const handleCopyAllLinks = async () => {
    const links = targetItems
      .map((item) =>
        `${item.title}\n${getDownloadMirrorUrls(item.id, selectedFormat)[0].url}`
      )
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(links);
      setCopiedBatch(true);
      setTimeout(() => setCopiedBatch(false), 2500);
    } catch (err) {
      console.warn('Failed to copy playlist links', err);
    }
  };

  const handleExportM3u = () => {
    let content = '#EXTM3U\n';
    targetItems.forEach((item) => {
      const dlUrl = getDownloadMirrorUrls(item.id, selectedFormat)[0].url;
      content += `#EXTINF:-1,${item.title}\n${dlUrl}\n`;
    });

    const blob = new Blob([content], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${playlistInfo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_playlist.m3u`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 30, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: 20, height: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-4xl mx-auto mt-6 glass-card p-6 sm:p-8 relative overflow-hidden text-slate-100"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 flex items-center justify-center shadow-md">
            <ListVideo className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
              Плейлист YouTube Загружен ({playlistInfo.itemCount} треков)
            </span>
            <h3 className="text-lg font-bold text-white truncate max-w-md">
              {playlistInfo.title}
            </h3>
          </div>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-slate-400 hover:text-white transition-colors underline"
        >
          Закрыть плейлист
        </button>
      </div>

      {/* Playlist Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8 items-center bg-black/20 p-5 rounded-2xl border border-white/5">
        <div className="md:col-span-4 relative rounded-xl overflow-hidden aspect-video bg-slate-950 border border-white/10 shadow-lg group">
          <img
            src={playlistInfo.thumbnailUrl}
            alt={playlistInfo.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
            <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold text-white flex items-center space-x-1.5">
              <ListVideo className="w-3.5 h-3.5 text-indigo-400" />
              <span>{playlistInfo.itemCount} Видео</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-8 space-y-4">
          <div>
            <span className="text-xs font-semibold text-purple-400 block mb-1">
              Автор: {playlistInfo.authorName || 'YouTube Автор'}
            </span>
            <h2 className="text-xl font-bold text-white leading-snug">
              {playlistInfo.title}
            </h2>
          </div>

          {/* Quick Format Toggle */}
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400 font-medium">Формат скачивания:</span>
            <div className="flex bg-black/30 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setSelectedFormat('mp4')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedFormat === 'mp4'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>MP4 Видео</span>
              </button>
              <button
                onClick={() => setSelectedFormat('mp3')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedFormat === 'mp3'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>MP3 Аудио</span>
              </button>
            </div>
          </div>

          {/* Batch Action Buttons */}
          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              onClick={handleBatchDownload}
              className="dl-pulse flex-1 min-w-[180px] bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white font-extrabold text-sm py-3 px-5 rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>
                Скачать {selectedIds.size > 0 ? `(${selectedIds.size})` : 'Весь плейлист'} ({selectedFormat.toUpperCase()})
              </span>
            </button>

            <button
              onClick={handleExportM3u}
              className="px-4 py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-white/10 flex items-center space-x-1.5 transition-colors"
              title="Экспорт M3U плейлиста для плееров"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>.M3U Файл</span>
            </button>

            <button
              onClick={handleCopyAllLinks}
              className="px-4 py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-white/10 flex items-center space-x-1.5 transition-colors"
            >
              {copiedBatch ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Ссылки скопированы!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Копировать ссылки</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Embedded preview modal or inline player if active */}
      {activePreviewVideo && (
        <div className="mb-6 p-4 bg-slate-950 rounded-2xl border border-white/10 relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300 truncate pr-4">
              Предпросмотр: {activePreviewVideo.title}
            </span>
            <button
              onClick={() => setActivePreviewVideo(null)}
              className="text-xs text-rose-400 hover:underline"
            >
              Закрыть плеер
            </button>
          </div>
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${activePreviewVideo.id}?autoplay=1`}
              title={activePreviewVideo.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Video List Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        {/* Search inside playlist */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по плейлисту..."
            className="w-full glass-input text-xs text-white placeholder-slate-500 pl-9 pr-3 py-2.5 rounded-xl outline-none"
          />
        </div>

        {/* Select All Toggle */}
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={toggleSelectAll}
            className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white transition-colors"
          >
            {selectedIds.size === playlistInfo.items.length ? (
              <CheckSquare className="w-4 h-4 text-indigo-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            <span>
              {selectedIds.size === playlistInfo.items.length ? 'Снять выделение' : 'Выделить все'}
            </span>
          </button>
          <span className="text-xs text-slate-500">
            Показано: {filteredItems.length} из {playlistInfo.itemCount}
          </span>
        </div>
      </div>

      {/* Playlist Videos List */}
      <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
        {filteredItems.map((item, index) => {
          const isSelected = selectedIds.has(item.id);
          const mp4Url = getDownloadMirrorUrls(item.id, 'mp4')[0].url;
          const mp3Url = getDownloadMirrorUrls(item.id, 'mp3')[0].url;

          return (
            <div
              key={item.id + index}
              className={`flex items-center space-x-3 p-3 rounded-2xl border transition-all ${
                isSelected
                  ? 'bg-indigo-950/40 border-indigo-500/40'
                  : 'glass-card-sm hover:bg-white/[0.06] border-white/5'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleSelectItem(item.id)}
                className="text-slate-500 hover:text-indigo-400 p-1"
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-600" />
                )}
              </button>

              {/* Index Number */}
              <span className="text-xs font-semibold text-slate-500 w-5 text-right shrink-0">
                {item.position || index + 1}
              </span>

              {/* Thumbnail */}
              <div
                onClick={() => setActivePreviewVideo(item)}
                className="relative w-20 h-12 rounded-xl overflow-hidden bg-slate-950 shrink-0 cursor-pointer group shadow-sm"
              >
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                  <Play className="w-3.5 h-3.5 text-white fill-current opacity-90 group-hover:scale-110 transition-transform" />
                </div>
              </div>

              {/* Title & Author */}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white truncate hover:text-indigo-300 transition-colors">
                  {item.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {item.authorName || playlistInfo.authorName}
                </p>
              </div>

              {/* Action Download Buttons */}
              <div className="flex items-center space-x-1.5 shrink-0">
                <a
                  href={mp4Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-500 text-white text-[11px] font-bold flex items-center space-x-1 transition-all shadow-sm"
                  title="Скачать MP4 Видео"
                >
                  <Film className="w-3 h-3" />
                  <span>MP4</span>
                </a>

                <a
                  href={mp3Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/80 hover:bg-amber-400 text-slate-950 text-[11px] font-bold flex items-center space-x-1 transition-all shadow-sm"
                  title="Скачать MP3 Аудио"
                >
                  <Music className="w-3 h-3" />
                  <span>MP3</span>
                </a>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs">
            Видео не найдены по запросу "{searchQuery}"
          </div>
        )}
      </div>
    </motion.section>
  );
};
