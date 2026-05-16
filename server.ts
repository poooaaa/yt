import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes FIRST
  app.get("/api/search/youtube", async (req, res) => {
    try {
      const query = req.query.query as string;
      if (!query) {
         res.status(400).json({ error: "Missing query" });
         return;
      }
      const fetchReq = await fetch(`https://exsalapi.my.id/api/search/youtube?query=${encodeURIComponent(query)}&apikey=exs_pooopp_f477b967`);
      if (!fetchReq.ok) {
        throw new Error(`HTTP error! status: ${fetchReq.status}`);
      }
      const data = await fetchReq.json();
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch from YouTube API" });
    }
  });

  app.get("/api/channel-image", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) return res.status(400).json({ error: "Missing url" });

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      const html = await response.text();
      
      // Extract og:image dengan regex yang lebih fleksibel
      const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i);
      
      let imageUrl = ogMatch ? ogMatch[1] : null;

      if (imageUrl) {
        // Tangani kasus double URL (https://youtube.comhttps://...)
        const cleanMatch = imageUrl.match(/https:\/\/(yt3\.(?:ggpht\.com|googleusercontent\.com))\/[^"'\s<>]+/);
        if (cleanMatch) {
          imageUrl = cleanMatch[0];
        }

        // Hapus parameter resize (=s atau -c) untuk mendapatkan kualitas HD/Asli
        // Contoh: ...=s68-c-k... -> ...
        if (imageUrl.includes('=s')) {
          imageUrl = imageUrl.split('=s')[0];
        } else if (imageUrl.includes('-c-k')) {
           imageUrl = imageUrl.split('-c-k')[0];
        }
      }

      if (imageUrl) {
        res.json({ imageUrl });
      } else {
        res.status(404).json({ error: "Not found" });
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
