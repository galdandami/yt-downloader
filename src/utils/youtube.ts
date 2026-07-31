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
 * Constructs Vevioz download API button URL
 */
export function getVeviozMp4Url(videoId: string): string {
  return `https://api.vevioz.com/@api/button/mp4/${videoId}`;
}

/**
 * Constructs Vevioz MP3 audio download URL
 */
export function getVeviozMp3Url(videoId: string): string {
  return `https://api.vevioz.com/@api/button/mp3/${videoId}`;
}

