import React from 'react';
import { Clock, Trash2, Play, Download, ListVideo } from 'lucide-react';
import { HistoryItem } from '../types';

interface DownloadHistoryProps {
  history: HistoryItem[];
  onSelectHistoryItem: (url: string) => void;
  onClearHistory: () => void;
}

export const DownloadHistory: React.FC<DownloadHistoryProps> = ({
  history,
  onSelectHistoryItem,
  onClearHistory,
}) => {
  if (history.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-10 glass-card p-6 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
        <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span>Недавние Загрузки ({history.length})</span>
        </div>
        <button
          onClick={onClearHistory}
          className="flex items-center space-x-1 text-xs text-slate-400 hover:text-rose-400 transition-colors"
          title="Очистить историю"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Очистить историю</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {history.map((item) => (
          <div
            key={item.id + item.timestamp}
            onClick={() => onSelectHistoryItem(item.url)}
            className="group flex items-center space-x-3 p-2.5 rounded-2xl glass-card-sm hover:bg-white/[0.08] border border-white/5 transition-all cursor-pointer hover:scale-[1.01]"
          >
            <div className="relative w-20 h-12 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-white/10">
              <img
                src={item.thumbnailUrl}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                {item.type === 'playlist' ? (
                  <ListVideo className="w-4 h-4 text-indigo-300" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-white fill-current opacity-90 group-hover:opacity-100" />
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1 mb-0.5">
                {item.type === 'playlist' && (
                  <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded">
                    Плейлист {item.itemCount ? `(${item.itemCount})` : ''}
                  </span>
                )}
              </div>
              <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                {item.title}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {new Date(item.timestamp).toLocaleDateString()}
              </p>
            </div>

            <div className="pr-1 text-slate-400 group-hover:text-white transition-colors">
              <Download className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

