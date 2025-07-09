import { useState, useEffect, useRef, useCallback } from 'react';
import Spinner from "@/components/loader/spinner"
import Image from 'next/image';
import Link from 'next/link';
import {getVideoRatioFromSrc,getImageRatioFromSrc,getHeightFromWidth} from "@/lib/ration-lib"

function LinkPreview({ url ,variant}) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true); // Start loading when component mounts
  const [error, setError] = useState('');
  const [imageH , setH] = useState(0)
  const imageRef = useRef<HTMLImageElement>(null)
  useEffect(() => {
    // Only fetch if a URL is provided
    if (!url) {
      setPreview(null);
      setLoading(false);
      setError('No URL provided to the LinkPreviewCard.');
      return;
    }

    const fetchLinkPreview = async () => {
      setLoading(true);
      setError('');
      setPreview(null);

      try {
        const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (data && data.data && data.data.title) {
          setPreview({
            title: data.data.title,
            description: data.data.description || 'No description available.',
            image: data.data.image && data.data.image.url ? data.data.image.url : 'https://placehold.co/400x225/E0E0E0/666666?text=No+Image',
            url: data.data.url || url,
            domain: new URL(data.data.url || url).hostname,
          });
        } else {
          setError('Could not generate a preview for this URL. Please check the URL or try another one.');
          setPreview(null);
        }
      } catch (e) {
        console.error('Error fetching link preview:', e);
        setError(`Failed to fetch preview: ${e.message}. Please ensure the URL is valid and accessible.`);
        setPreview(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLinkPreview();
  }, [url]); // Re-run effect when the URL prop changes

  if (loading) {
    return (
      <div className="mt-8 p-4 text-center text-gray-600">
        <Spinner/>
      </div>
    );
  }

  if (error) {
    return (
      <p className="mt-8 text-red-600 text-sm text-center p-2 bg-red-50 rounded-md border border-red-200">
        {error}
      </p>
    );
  }

  if (!preview) {
    return null; // Don't render anything if no preview data is available after loading/error
  }
  getImageRatioFromSrc(preview.image).then(ratio => {
        const height = getHeightFromWidth(imageRef.current.style.width, ratio);
        setH(height)
  })
  return (
    <div className="border border-gray-200  overflow-hidden bg-white">
      {/* Image Section with Icons */}
      <div className="relative w-full h-auto bg-gray-100 flex items-center justify-center overflow-hidden">
        <img
          src={preview.image}
          ref={imageRef}
          alt="Link Preview"
          className={`object-cover w-full  h-[${imageH}px]`}
          onError={(e) => {
            e.target.onerror = null; // Prevent infinite loop
            e.target.src = 'https://placehold.co/400x160/E0E0E0/666666?text=No+Image'; // Fallback to a generic placeholder
          }}
        />

        {/* Play Icon Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
          <svg className="w-16 h-16 text-white opacity-80" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>

        {/* Open Link Icon */}
        <a
          href={preview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 right-3 bg-white bg-opacity-80 p-2 rounded-full shadow-md hover:bg-opacity-100 transition-opacity duration-200"
          title="Open Link"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
          </svg>
        </a>
      </div>

      {/* Text Content Section */}
      <div className="p-4 bg-white">
        <p className="text-gray-500 text-[9px] font-medium uppercase mb-1 truncate">
          {preview.domain}
        </p>
        <h3 className="text-sm font-bold text-gray-800 mb-2 line-clamp-2">
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline text-blue-700"
          >
            {preview.title}
          </a>
        </h3>
        <p className="text-gray-600 text-[9px] line-clamp-3 mb-3">
          {preview.description}
        </p>
        <a
          href={preview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline text-[9px] truncate block"
          title={preview.url}
        >
          {preview.url.replace(/^(https?:\/\/)?(www\.)?/, '')} {/* Display clean URL */}
        </a>
      </div>
    </div>
  );
}

export default LinkPreview;
