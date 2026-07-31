export interface YouTubeVideoInfo {
  id: string;
  url: string;
  title: string;
  authorName?: string;
  thumbnailUrl: string;
  fallbackThumbnailUrl: string;
  embedUrl: string;
  isShort: boolean;
  fetchedAt: number;
}

export interface PlaylistItem {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  fallbackThumbnailUrl: string;
  authorName?: string;
  duration?: string;
  position: number;
}

export interface YouTubePlaylistInfo {
  id: string;
  title: string;
  authorName?: string;
  thumbnailUrl: string;
  itemCount: number;
  items: PlaylistItem[];
  originalUrl: string;
  fetchedAt: number;
}

export interface HistoryItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  url: string;
  type: 'video' | 'playlist';
  itemCount?: number;
  timestamp: number;
}

export interface DownloadOption {
  label: string;
  quality: string;
  type: 'mp4' | 'mp3';
  url: string;
  recommended?: boolean;
}

