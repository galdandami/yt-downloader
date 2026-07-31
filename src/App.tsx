import React, { useState, useEffect } from 'react';
import { UrlInputCard } from './components/UrlInputCard';
import { VideoResultSection } from './components/VideoResultSection';
import { PlaylistResultSection } from './components/PlaylistResultSection';
import { DownloadHistory } from './components/DownloadHistory';
import { PwaPromptModal } from './components/PwaPromptModal';
import { YouTubeVideoInfo, YouTubePlaylistInfo, HistoryItem } from './types';
import { fetchVideoInfo, fetchPlaylistInfo, isYouTubePlaylist } from './utils/youtube';

const HISTORY_STORAGE_KEY = 'yt_downloader_history_v1';

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null);
  const [playlistInfo, setPlaylistInfo] = useState<YouTubePlaylistInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showPwaModal, setShowPwaModal] = useState(false);

  // Load download history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load history from localStorage', e);
    }
  }, []);

  // Save video item to history
  const saveVideoToHistory = (info: YouTubeVideoInfo) => {
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== info.id);
      const updated: HistoryItem[] = [
        {
          id: info.id,
          title: info.title,
          thumbnailUrl: info.thumbnailUrl,
          url: info.url,
          type: 'video',
          timestamp: Date.now(),
        },
        ...filtered,
      ].slice(0, 10);

      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save history', e);
      }

      return updated;
    });
  };

  // Save playlist item to history
  const savePlaylistToHistory = (info: YouTubePlaylistInfo) => {
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== info.id);
      const updated: HistoryItem[] = [
        {
          id: info.id,
          title: info.title,
          thumbnailUrl: info.thumbnailUrl,
          url: info.originalUrl,
          type: 'playlist',
          itemCount: info.itemCount,
          timestamp: Date.now(),
        },
        ...filtered,
      ].slice(0, 10);

      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save history', e);
      }

      return updated;
    });
  };

  const handleFetchMedia = async (url: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setVideoInfo(null);
    setPlaylistInfo(null);

    try {
      if (isYouTubePlaylist(url)) {
        const pInfo = await fetchPlaylistInfo(url);
        setPlaylistInfo(pInfo);
        savePlaylistToHistory(pInfo);
      } else {
        const vInfo = await fetchVideoInfo(url);
        setVideoInfo(vInfo);
        saveVideoToHistory(vInfo);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Не удалось распознать ссылку YouTube. Проверьте правильность и повторите.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear history storage', e);
    }
  };

  return (
    <div className="min-h-screen mesh-bg text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Background Ambient Glow Accent Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-1/3 left-[-100px] w-[500px] h-[500px] bg-pink-600/15 blur-[160px] rounded-full" />
        <div className="absolute bottom-10 right-[-100px] w-[500px] h-[500px] bg-indigo-600/15 blur-[160px] rounded-full" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Main Content Area */}
        <main className="container mx-auto px-4 pt-10 pb-4 flex-1 flex flex-col items-center justify-center">
          {/* Centered URL Card */}
          <UrlInputCard
            onFetchVideo={handleFetchMedia}
            isLoading={isLoading}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
          />

          {/* Video Result Section */}
          <VideoResultSection
            videoInfo={videoInfo}
            onClear={() => setVideoInfo(null)}
          />

          {/* Playlist Result Section */}
          <PlaylistResultSection
            playlistInfo={playlistInfo}
            onClear={() => setPlaylistInfo(null)}
          />

          {/* Recent Downloads History */}
          <DownloadHistory
            history={history}
            onSelectHistoryItem={(url) => handleFetchMedia(url)}
            onClearHistory={handleClearHistory}
          />
        </main>

        {/* Footer */}
        <footer className="w-full border-t border-white/10 py-6 text-center text-xs text-slate-400 mt-12">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© {new Date().getFullYear()} YouTube Downloader. Все права защищены.</p>
            <p className="flex items-center justify-center space-x-1">
              <span>Создано с React & Tailwind CSS</span>
            </p>
          </div>
        </footer>
      </div>

      {/* PWA Safari Modal */}
      <PwaPromptModal
        isOpen={showPwaModal}
        onClose={() => setShowPwaModal(false)}
      />
    </div>
  );
}

