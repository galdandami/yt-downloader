import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import ytdl from '@distube/ytdl-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to extract YouTube video ID
function extractVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  if (match && match[1]) return match[1];
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

// Helper fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// 1. Cobalt API instances provider
async function getCobaltDownloadUrl(videoId: string, format: 'mp4' | 'mp3'): Promise<string | null> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const instances = [
    'https://api.cobalt.tools',
    'https://co.wuk.sh',
    'https://cobalt.api.scno.co',
    'https://cobalt.qtf.im',
    'https://api.v0.cobalt.tools'
  ];

  for (const instance of instances) {
    try {
      const res = await fetchWithTimeout(instance, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: JSON.stringify({
          url: videoUrl,
          videoQuality: '720',
          downloadMode: format === 'mp3' ? 'audio' : 'video',
          audioFormat: 'mp3',
        })
      }, 4500);

      if (res.ok) {
        const data = await res.json();
        if (data) {
          if (typeof data.url === 'string' && data.url) {
            return data.url;
          }
          if (Array.isArray(data.picker) && data.picker.length > 0 && data.picker[0].url) {
            return data.picker[0].url;
          }
        }
      }
    } catch (e) {
      // ignore and try next instance
    }
  }
  return null;
}

// 2. Invidious API instance stream provider
async function getInvidiousDownloadUrl(videoId: string, format: 'mp4' | 'mp3'): Promise<string | null> {
  const invidiousInstances = [
    'https://invidious.nerdvpn.de',
    'https://inv.riverside.rocks',
    'https://vid.puffyan.us',
    'https://invidious.drgns.space'
  ];

  for (const instance of invidiousInstances) {
    try {
      const res = await fetchWithTimeout(`${instance}/api/v1/videos/${videoId}`, {}, 4000);
      if (res.ok) {
        const data = await res.json();
        if (format === 'mp3') {
          if (Array.isArray(data.adaptiveFormats)) {
            const audioStream = data.adaptiveFormats.find((f: any) => f.type?.includes('audio') && f.url);
            if (audioStream?.url) return audioStream.url;
          }
        } else {
          if (Array.isArray(data.formatStreams)) {
            const videoStream = data.formatStreams.find((f: any) => f.url && f.qualityLabel);
            if (videoStream?.url) return videoStream.url;
          }
          if (Array.isArray(data.adaptiveFormats)) {
            const videoStream = data.adaptiveFormats.find((f: any) => f.type?.includes('video') && f.url);
            if (videoStream?.url) return videoStream.url;
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
  return null;
}

// 3. Distube ytdl-core provider
async function getYtdlDownloadUrl(videoId: string, format: 'mp4' | 'mp3'): Promise<string | null> {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdl.getInfo(videoUrl);
    if (format === 'mp3') {
      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
      if (audioFormats.length > 0 && audioFormats[0].url) {
        return audioFormats[0].url;
      }
    } else {
      const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
      if (videoFormats.length > 0 && videoFormats[0].url) {
        return videoFormats[0].url;
      }
      const allVideo = ytdl.filterFormats(info.formats, 'videoonly');
      if (allVideo.length > 0 && allVideo[0].url) {
        return allVideo[0].url;
      }
    }
  } catch (e) {
    console.warn('ytdl-core extraction error:', e);
  }
  return null;
}

// API endpoint to resolve direct download link
app.get('/api/get-link', async (req, res) => {
  const { url, format = 'mp4' } = req.query;
  const videoId = extractVideoId(url as string);

  if (!videoId) {
    return res.status(400).json({ error: 'Недействительный URL YouTube' });
  }

  const fmt = format === 'mp3' ? 'mp3' : 'mp4';

  // Strategy order: Cobalt -> Invidious -> ytdl-core -> Fallback web mirror
  let directUrl = await getCobaltDownloadUrl(videoId, fmt);
  if (!directUrl) {
    directUrl = await getInvidiousDownloadUrl(videoId, fmt);
  }
  if (!directUrl) {
    directUrl = await getYtdlDownloadUrl(videoId, fmt);
  }

  if (directUrl) {
    return res.json({
      success: true,
      downloadUrl: `/api/download?id=${videoId}&format=${fmt}`,
      directUrl: directUrl,
      videoId: videoId
    });
  }

  // Fallback to top working mirror
  const fallbackUrl = `https://www.youtubepp.com/watch?v=${videoId}`;
  return res.json({
    success: true,
    downloadUrl: fallbackUrl,
    directUrl: fallbackUrl,
    isFallback: true,
    videoId: videoId
  });
});

// API endpoint to stream or redirect the file download
app.get('/api/download', async (req, res) => {
  const { id, format = 'mp4', title = 'youtube-video' } = req.query;
  const videoId = extractVideoId(id as string);

  if (!videoId) {
    return res.status(400).send('Invalid video ID');
  }

  const fmt = format === 'mp3' ? 'mp3' : 'mp4';
  const cleanTitle = (title as string).replace(/[^a-zA-Z0-9_\-\u0400-\u04FF ]/g, '').trim() || 'video';
  const ext = fmt === 'mp3' ? 'mp3' : 'mp4';

  let directUrl = await getCobaltDownloadUrl(videoId, fmt);
  if (!directUrl) {
    directUrl = await getInvidiousDownloadUrl(videoId, fmt);
  }
  if (!directUrl) {
    directUrl = await getYtdlDownloadUrl(videoId, fmt);
  }

  if (directUrl) {
    try {
      // Pipe stream from media URL with Content-Disposition attachment so browser downloads directly!
      const mediaResponse = await fetch(directUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (mediaResponse.ok && mediaResponse.body) {
        const contentType = fmt === 'mp3' ? 'audio/mpeg' : 'video/mp4';
        const filename = encodeURIComponent(`${cleanTitle}.${ext}`);

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`);

        if (mediaResponse.headers.get('content-length')) {
          res.setHeader('Content-Length', mediaResponse.headers.get('content-length')!);
        }

        // Convert web ReadableStream to node stream or pipe bytes
        const reader = mediaResponse.body.getReader();
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(Buffer.from(value));
            }
            res.end();
          } catch (streamErr) {
            console.error('Error streaming download response:', streamErr);
            if (!res.headersSent) {
              res.redirect(directUrl!);
            }
          }
        };
        return pump();
      }
    } catch (e) {
      console.warn('Proxy streaming error, falling back to direct redirect:', e);
    }

    // Direct redirect if stream piping fails
    return res.redirect(directUrl);
  }

  // Final fallback: redirect to y2mate downloader page
  return res.redirect(`https://www.youtubepp.com/watch?v=${videoId}`);
});

async function startServer() {
  // Vite middleware for development mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
