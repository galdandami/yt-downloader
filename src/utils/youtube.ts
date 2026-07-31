import { YouTubeVideoInfo, YouTubePlaylistInfo, PlaylistItem } from '../types';

/**
 * Helper to perform fetch with a strict timeout to prevent infinite pending promises
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Parses YouTube Video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://music.youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - Plain VIDEO_ID (11 chars)
 */
export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Plain 11-char ID check
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex for YouTube URLs
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = trimmed.match(regExp);

  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Extracts Playlist ID from YouTube playlist URL
 * e.g., https://www.youtube.com/playlist?list=PLAYLIST_ID
 * or https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID
 */
export function extractPlaylistId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  const match = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    const listId = match[1];
    // Ignore private system playlists: WL (Watch Later), LL (Liked Videos)
    if (listId === 'WL' || listId === 'LL') {
      return null;
    }
    return listId;
  }

  if (trimmed.startsWith('PL') || trimmed.startsWith('UU') || trimmed.startsWith('FL') || trimmed.startsWith('RD')) {
    if (/^[a-zA-Z0-9_-]{10,40}$/.test(trimmed)) {
      return trimmed;
    }
  }

  return null;
}

/**
 * Checks if the URL is a YouTube Shorts URL
 */
export function isYouTubeShorts(url: string): boolean {
  return url.toLowerCase().includes('/shorts/');
}

/**
 * Checks if the input is a YouTube Playlist URL
 */
export function isYouTubePlaylist(url: string): boolean {
  return Boolean(extractPlaylistId(url));
}

/**
 * Fetches video details via YouTube oEmbed API or fallback metadata
 */
export async function fetchVideoInfo(input: string): Promise<YouTubeVideoInfo> {
  const videoId = extractYouTubeId(input);
  if (!videoId) {
    throw new Error('Недействительная ссылка на YouTube или ID видео. Пожалуйста, введите корректную ссылку.');
  }

  const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const maxResThumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const hqThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const isShort = isYouTubeShorts(input);

  let title = `Видео YouTube (${videoId})`;
  let authorName = 'Канал YouTube';

  try {
    // Attempt oEmbed API fetch with 3.5s timeout
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
    const response = await fetchWithTimeout(oembedUrl, {}, 3500);
    if (response.ok) {
      const data = await response.json();
      if (data.title) {
        title = data.title;
      }
      if (data.author_name) {
        authorName = data.author_name;
      }
    }
  } catch (err) {
    console.warn('oEmbed fetch failed or timed out, using fallback title', err);
  }

  return {
    id: videoId,
    url: cleanUrl,
    title,
    authorName,
    thumbnailUrl: maxResThumbnail,
    fallbackThumbnailUrl: hqThumbnail,
    embedUrl,
    isShort,
    fetchedAt: Date.now()
  };
}

/**
 * Fetches YouTube Playlist items using fallback public API endpoints & YouTube Atom RSS feed
 */
export async function fetchPlaylistInfo(input: string): Promise<YouTubePlaylistInfo> {
  const playlistId = extractPlaylistId(input);
  if (!playlistId) {
    throw new Error('Недействительная ссылка на плейлист YouTube.');
  }

  let title = `Плейлист YouTube (${playlistId})`;
  let authorName = 'Канал YouTube';
  let items: PlaylistItem[] = [];

  // Try fetching from Invidious / Piped public API mirrors first
  const apiMirrors = [
    `https://inv.tux.pizza/api/v1/playlists/${playlistId}`,
    `https://invidious.nerdvpn.de/api/v1/playlists/${playlistId}`,
    `https://pipedapi.kavin.rocks/playlists/${playlistId}`
  ];

  for (const mirrorUrl of apiMirrors) {
    try {
      const res = await fetchWithTimeout(mirrorUrl, {}, 3000);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.title || data.videos)) {
          if (data.title) title = data.title;
          if (data.author) authorName = data.author;

          const rawVideos = data.videos || data.relatedStreams || [];
          if (Array.isArray(rawVideos) && rawVideos.length > 0) {
            items = rawVideos.map((v: any, index: number) => {
              const videoId = v.videoId || v.id || extractYouTubeId(v.url || '');
              const videoTitle = v.title || `Трек ${index + 1}`;
              const author = v.author || v.uploaderName || authorName;
              return {
                id: videoId,
                title: videoTitle,
                videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                fallbackThumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                authorName: author,
                duration: v.lengthSeconds ? `${Math.floor(v.lengthSeconds / 60)}:${(v.lengthSeconds % 60).toString().padStart(2, '0')}` : undefined,
                position: index + 1,
              };
            });
            break;
          }
        }
      }
    } catch (e) {
      console.warn('API mirror failed or timed out:', mirrorUrl, e);
    }
  }

  // Fallback to YouTube RSS Feed via CORS proxy if API mirrors failed
  if (items.length === 0) {
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
      const rssRes = await fetchWithTimeout(proxyUrl, {}, 3500);
      
      if (rssRes.ok) {
        const xmlText = await rssRes.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        const feedTitle = xmlDoc.querySelector('title')?.textContent;
        if (feedTitle) title = feedTitle;

        const authorEl = xmlDoc.querySelector('author name')?.textContent;
        if (authorEl) authorName = authorEl;

        const entries = Array.from(xmlDoc.querySelectorAll('entry'));
        if (entries.length > 0) {
          items = entries.map((entry, index) => {
            const videoId = entry.querySelector('videoId')?.textContent || 
                            entry.querySelector('id')?.textContent?.replace('yt:video:', '') || '';
            const entryTitle = entry.querySelector('title')?.textContent || `Видео ${index + 1}`;
            const entryAuthor = entry.querySelector('author name')?.textContent || authorName;
            return {
              id: videoId,
              title: entryTitle,
              videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
              thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
              fallbackThumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              authorName: entryAuthor,
              position: index + 1
            };
          }).filter(item => Boolean(item.id));
        }
      }
    } catch (err) {
      console.warn('RSS feed fallback failed', err);
    }
  }

  // Ultimate fallback: if URL has a video ID (watch?v=...&list=...), fetch that single video
  if (items.length === 0) {
    const singleVideoId = extractYouTubeId(input);
    if (singleVideoId) {
      const singleInfo = await fetchVideoInfo(input);
      title = `Плейлист (${singleInfo.title})`;
      authorName = singleInfo.authorName || 'Канал YouTube';
      items = [
        {
          id: singleInfo.id,
          title: singleInfo.title,
          videoUrl: singleInfo.url,
          thumbnailUrl: singleInfo.thumbnailUrl,
          fallbackThumbnailUrl: singleInfo.fallbackThumbnailUrl,
          authorName: singleInfo.authorName,
          position: 1
        }
      ];
    } else {
      throw new Error('Не удалось загрузить треки плейлиста. Убедитесь, что ссылка ведет на публичный плейлист.');
    }
  }

  const playlistThumbnail = items[0]?.thumbnailUrl || `https://img.youtube.com/vi/${playlistId}/hqdefault.jpg`;

  return {
    id: playlistId,
    title,
    authorName,
    thumbnailUrl: playlistThumbnail,
    itemCount: items.length,
    items,
    originalUrl: `https://www.youtube.com/playlist?list=${playlistId}`,
    fetchedAt: Date.now()
  };
}

/**
 * Tries Cobalt API and Invidious instances directly from client browser
 * Returns direct media stream URL or converter page fallback
 */
export async function getDirectDownloadLinkClient(videoId: string, format: 'mp4' | 'mp3' = 'mp4'): Promise<{ url: string; isDirect: boolean }> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  const cobaltInstances = [
    'https://api.cobalt.tools/',
    'https://co.wuk.sh/',
    'https://cobalt.api.scno.co/'
  ];

  for (const instance of cobaltInstances) {
    try {
      const res = await fetchWithTimeout(instance, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: videoUrl,
          videoQuality: '720',
          downloadMode: format === 'mp3' ? 'audio' : 'video',
          audioFormat: 'mp3',
          youtubeVideoCodec: 'h264'
        })
      }, 4000);

      if (res.ok) {
        const data = await res.json();
        if (data) {
          if ((data.status === 'redirect' || data.status === 'stream') && data.url) {
            return { url: data.url, isDirect: true };
          }
          if (data.url && typeof data.url === 'string') {
            return { url: data.url, isDirect: true };
          }
          if (Array.isArray(data.picker) && data.picker.length > 0 && data.picker[0].url) {
            return { url: data.picker[0].url, isDirect: true };
          }
        }
      }
    } catch (e) {
      console.warn('Client Cobalt fetch failed:', instance, e);
    }
  }

  // Try client-side Invidious stream extraction
  const invidiousInstances = [
    'https://invidious.nerdvpn.de',
    'https://inv.riverside.rocks',
    'https://invidious.drgns.space'
  ];

  for (const instance of invidiousInstances) {
    try {
      const res = await fetchWithTimeout(`${instance}/api/v1/videos/${videoId}`, {}, 3500);
      if (res.ok) {
        const data = await res.json();
        if (format === 'mp3' && Array.isArray(data.adaptiveFormats)) {
          const audio = data.adaptiveFormats.find((f: any) => f.type?.includes('audio') && f.url);
          if (audio?.url) return { url: audio.url, isDirect: true };
        } else if (Array.isArray(data.formatStreams) && data.formatStreams.length > 0) {
          const video = data.formatStreams.find((f: any) => f.url && f.container === 'mp4') || data.formatStreams[0];
          if (video?.url) return { url: video.url, isDirect: true };
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Fallback to Y2Mate conversion page URL
  return { url: `https://www.youtubepp.com/watch?v=${videoId}`, isDirect: false };
}

/**
 * Legacy wrapper
 */
export async function getDirectDownloadLink(videoId: string, format: 'mp4' | 'mp3'): Promise<string> {
  const result = await getDirectDownloadLinkClient(videoId, format);
  return result.url;
}

export interface DownloadMirror {
  name: string;
  url: string;
  description: string;
  badge: string;
}

/**
 * Returns top working alternative download server links
 */
export function getDownloadMirrorUrls(videoId: string, format: 'mp4' | 'mp3' = 'mp4'): DownloadMirror[] {
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  return [
    {
      name: 'Y2Mate',
      url: `https://www.youtubepp.com/watch?v=${videoId}`,
      description: 'Быстрое скачивание MP4 и MP3',
      badge: 'Сервер 1'
    },
    {
      name: 'SaveFrom',
      url: `https://www.ssyoutube.com/watch?v=${videoId}`,
      description: 'Прямая загрузка без программ',
      badge: 'Сервер 2'
    },
    {
      name: '10Downloader',
      url: `https://10downloader.com/download?v=${videoId}`,
      description: 'Высокое качество видео',
      badge: 'Сервер 3'
    },
    {
      name: 'Loader.to',
      url: `https://loader.to/api/card/?url=${encodeURIComponent(ytUrl)}&f=${format}`,
      description: 'Облачная конвертация',
      badge: 'Сервер 4'
    }
  ];
}

/**
 * Legacy Vevioz fallback compatibility (now using Y2Mate mirror)
 */
export function getVeviozMp4Url(videoId: string): string {
  return `https://www.youtubepp.com/watch?v=${videoId}`;
}

export function getVeviozMp3Url(videoId: string): string {
  return `https://www.youtubepp.com/watch?v=${videoId}`;
}


