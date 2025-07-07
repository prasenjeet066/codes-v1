import React, { useState } from 'react';
import { Play, Pause, Maximize2, X } from 'lucide-react';
interface ArrayMedia {
  media_type : 'image' | 'video' | 'gif'
  media_urls : []
}
const MediaGrid = ({array}) => {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [playingVideos, setPlayingVideos] = useState(new Set());

  const handleVideoToggle = (mediaIndex, urlIndex) => {
    const videoId = `${mediaIndex}-${urlIndex}`;
    const newPlayingVideos = new Set(playingVideos);
    
    if (playingVideos.has(videoId)) {
      newPlayingVideos.delete(videoId);
    } else {
      newPlayingVideos.add(videoId);
    }
    
    setPlayingVideos(newPlayingVideos);
  };

  const openLightbox = (mediaItem, urlIndex) => {
    setSelectedMedia({ ...mediaItem, selectedIndex: urlIndex });
  };

  const closeLightbox = () => {
    setSelectedMedia(null);
  };

  const renderMediaItem = (mediaItem, mediaIndex) => {
    const { media_type, media_urls } = mediaItem;
    
    return (
      <div key={mediaIndex} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {media_urls.map((url, urlIndex) => {
            const videoId = `${mediaIndex}-${urlIndex}`;
            const isPlaying = playingVideos.has(videoId);
            
            return (
              <div 
                key={urlIndex}
                className="relative group bg-gray-100 overflow-hidden transition-all duration-300 aspect-square"
              >
                {media_type === 'image' && (
                  <>
                    <img
                      src={url}
                      alt={`Media ${mediaIndex + 1}-${urlIndex + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                      <button
                        onClick={() => openLightbox(mediaItem, urlIndex)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white bg-opacity-80 hover:bg-opacity-100 p-2"
                      >
                        <Maximize2 size={20} className="text-gray-800" />
                      </button>
                    </div>
                  </>
                )}
                
                {media_type === 'video' && (
                  <>
                    <video
                      src={url}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                      ref={(el) => {
                        if (el) {
                          if (isPlaying) {
                            el.play();
                          } else {
                            el.pause();
                          }
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                      <button
                        onClick={() => handleVideoToggle(mediaIndex, urlIndex)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white bg-opacity-80 hover:bg-opacity-100 p-3"
                      >
                        {isPlaying ? (
                          <Pause size={24} className="text-gray-800" />
                        ) : (
                          <Play size={24} className="text-gray-800 ml-1" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => openLightbox(mediaItem, urlIndex)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white bg-opacity-80 hover:bg-opacity-100 p-2"
                    >
                      <Maximize2 size={16} className="text-gray-800" />
                    </button>
                  </>
                )}
                
                {media_type === 'gif' && (
                  <>
                    <img
                      src={url}
                      alt={`GIF ${mediaIndex + 1}-${urlIndex + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                      GIF
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                      <button
                        onClick={() => openLightbox(mediaItem, urlIndex)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white bg-opacity-80 hover:bg-opacity-100 p-2"
                      >
                        <Maximize2 size={20} className="text-gray-800" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="space-y-8">
        {array.map((mediaItem, index) => renderMediaItem(mediaItem, index))}
      </div>
      
      {/* Lightbox Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={closeLightbox}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X size={32} />
            </button>
            
            <div className="bg-white overflow-hidden">
              {selectedMedia.media_type === 'image' && (
                <img
                  src={selectedMedia.media_urls[selectedMedia.selectedIndex]}
                  alt="Expanded view"
                  className="max-w-full max-h-[80vh] object-contain"
                />
              )}
              
              {selectedMedia.media_type === 'video' && (
                <video
                  src={selectedMedia.media_urls[selectedMedia.selectedIndex]}
                  controls
                  autoPlay
                  className="max-w-full max-h-[80vh] object-contain"
                />
              )}
              
              {selectedMedia.media_type === 'gif' && (
                <img
                  src={selectedMedia.media_urls[selectedMedia.selectedIndex]}
                  alt="Expanded GIF view"
                  className="max-w-full max-h-[80vh] object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
      
      
    </div>
  );
};
export default MediaGrid
// Example usage with demo data
