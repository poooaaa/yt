/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Search, Play, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface VideoAuthor {
  name: string;
  url: string;
}

interface VideoData {
  title: string;
  id: string;
  url: string;
  duration: string;
  views: number;
  uploadDate: string;
  author: VideoAuthor;
  thumbnail: string;
}

// Global cache to share avatars between components
const avatarCache: { [url: string]: string } = {};
const nameToAvatarCache: { [name: string]: string } = {};

const getBaseName = (name: string) => name.split(' and ')[0].trim();

const ChannelAvatar = ({ url, name }: { url: string; name: string }) => {
  const baseName = getBaseName(name);
  const [avatar, setAvatar] = useState<string | null>(
    avatarCache[url] || nameToAvatarCache[baseName] || null
  );

  useEffect(() => {
    // Jika sudah ada di cache URL atau cache Nama, gunakan itu
    if (avatarCache[url]) {
      setAvatar(avatarCache[url]);
      return;
    }
    if (nameToAvatarCache[baseName]) {
      setAvatar(nameToAvatarCache[baseName]);
      return;
    }

    // Hanya fetch jika URL valid (bukan search query)
    if (url.includes('/@') || url.includes('/channel/') || url.includes('/user/')) {
      fetch(`/api/channel-image?url=${encodeURIComponent(url)}`)
        .then(res => res.json())
        .then(data => {
          if (data.imageUrl) {
            avatarCache[url] = data.imageUrl;
            nameToAvatarCache[baseName] = data.imageUrl;
            setAvatar(data.imageUrl);
          }
        })
        .catch(() => {});
    }
  }, [url, baseName]);

  // Cek secara berkala apakah ada avatar baru untuk nama ini (sinkronisasi antar komponen)
  useEffect(() => {
    if (!avatar && nameToAvatarCache[baseName]) {
      setAvatar(nameToAvatarCache[baseName]);
    }
    const interval = setInterval(() => {
      if (!avatar && nameToAvatarCache[baseName]) {
        setAvatar(nameToAvatarCache[baseName]);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [avatar, baseName]);

  return (
    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
      {avatar ? (
        <img src={avatar} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="text-gray-300 text-xs font-bold uppercase">
          {name.charAt(0)}
        </span>
      )}
    </div>
  );
};

export default function App() {
  const [query, setQuery] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [results, setResults] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery || (trimmedQuery === lastQuery && results.length > 0)) return;

    // Blur input on submit
    const input = document.getElementById('youtube-search-input');
    if (input) input.blur();

    setLoading(true);
    setLastQuery(trimmedQuery);
    setError(null);
    setResults([]);
    setPlayingVideoId(null);
    setIsVideoLoading(false);
    
    try {
      const res = await fetch(`/api/search/youtube?query=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data && data.status && Array.isArray(data.data)) {
        setResults(data.data);
      } else {
        setError('No results found.');
      }
    } catch (err: any) {
      console.error(err);
      setError('An error occurred while fetching results.');
    } finally {
      setLoading(false);
    }
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return (views / 1000000).toFixed(1) + 'M';
    }
    if (views >= 1000) {
      return (views / 1000).toFixed(1) + 'K';
    }
    return views.toString();
  };

  return (
    <div className="min-h-screen bg-[#111015] flex flex-col items-center">
      {/* Search Bar Container */}
      <div className="w-full max-w-xl mt-8 px-6 mb-8 flex items-center gap-3">
        {/* Gambar di luar kolom pencarian (lebih kecil) */}
        <img 
          src="https://www.cloudsky.biz.id/api/file/img-yt.png" 
          alt="logo" 
          className="w-7 h-7 rounded-full shrink-0 object-contain"
          referrerPolicy="no-referrer"
        />
        
        {/* Kolom Pencarian (lebih ramping) */}
        <form 
          onSubmit={handleSearch}
          className="flex-1 flex items-center px-4 py-2 rounded-full bg-[#202124] border border-transparent focus-within:border-[#3c4043] focus-within:shadow-xl transition-all shadow-md"
        >
          <Search className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Telusuri... "
            className="flex-1 bg-transparent border-none outline-none text-gray-100 text-base"
            id="youtube-search-input"
            autoComplete="off"
          />
        </form>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-4xl px-4 py-2 pb-24 flex flex-col gap-6 items-center">
        
        {/* Welcome Text Area */}
        {!loading && results.length === 0 && !error && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium text-gray-300">Temukan inspirasi Anda</p>
            <p className="text-sm mt-2 text-gray-500">Mulai mencari dengan mengetik kata kunci di kolom pencarian.</p>
          </div>
        )}

        {/* Loading Spinner in Center */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 pointer-events-none">
            <motion.img 
              src="https://static.vecteezy.com/system/resources/thumbnails/055/687/065/small_2x/gemini-google-icon-symbol-logo-free-png.png"
              className="w-12 h-12 object-contain"
              animate={{ rotate: [0, 180, 180, 360, 360] }}
              transition={{
                duration: 2,
                times: [0, 0.4, 0.5, 0.9, 1],
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="w-full text-red-400 bg-red-950/30 p-4 rounded-xl flex items-center gap-3 border border-red-900/50">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        {/* Search Results */}
        {!loading && results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {results.map((video) => (
              <div 
                key={video.id} 
                className={`bg-[#202124] rounded-xl overflow-hidden hover:bg-[#303134] transition-colors cursor-pointer group border border-transparent hover:border-[#3c4043]`}
                onClick={() => {
                  if (playingVideoId !== video.id) {
                    setPlayingVideoId(video.id);
                    setIsVideoLoading(true);
                  }
                }}
              >
                <div className="relative aspect-video bg-black flex items-center justify-center">
                  {playingVideoId === video.id && (
                    <>
                      {isVideoLoading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black">
                          <motion.img 
                            src="https://static.vecteezy.com/system/resources/thumbnails/055/687/065/small_2x/gemini-google-icon-symbol-logo-free-png.png"
                            className="w-10 h-10"
                            animate={{ rotate: [0, 180, 180, 360, 360] }}
                            transition={{
                              duration: 2,
                              times: [0, 0.4, 0.5, 0.9, 1],
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                        </div>
                      )}
                      <iframe 
                        className={`w-full h-full border-0 transition-opacity duration-300 ${isVideoLoading ? 'opacity-0' : 'opacity-100'}`}
                        src={`https://www.youtube.com/embed/${video.id}?autoplay=1`} 
                        title="YouTube video player" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen
                        onLoad={() => setIsVideoLoading(false)}
                      ></iframe>
                    </>
                  )}
                  {playingVideoId !== video.id && (
                    <>
                      <img 
                        src={video.thumbnail} 
                        alt={video.title} 
                        className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                        {video.duration}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                        <div className="bg-red-600 rounded-full p-3 shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 text-white fill-current" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="p-4 flex gap-3">
                  <ChannelAvatar url={video.author.url} name={video.author.name} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-100 font-medium text-sm line-clamp-2 leading-tight mb-1">
                      {video.title}
                    </h3>
                    <p className="text-gray-400 text-xs truncate">
                      {video.author.name}
                    </p>
                    <p className="text-gray-400 text-[11px] mt-0.5">
                      {formatViews(video.views)} views • {video.uploadDate}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


