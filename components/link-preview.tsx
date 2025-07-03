import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// Cache for storing previews to avoid repeated requests
const previewCache = new Map();

// Utility functions
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

const getDomainInfo = (url) => {
  try {
    const urlObj = new URL(url);
    return {
      domain: urlObj.hostname,
      protocol: urlObj.protocol,
      pathname: urlObj.pathname
    };
  } catch {
    return { domain: '', protocol: '', pathname: '' };
  }
};

const getFaviconUrl = (url) => {
  const { domain, protocol } = getDomainInfo(url);
  return `${protocol}//${domain}/favicon.ico`;
};

// Main LinkPreview Component
const LinkPreview = ({ 
  url, 
  className = '',
  variant = 'default', // 'default', 'compact', 'minimal', 'card'
  showFavicon = true,
  showDomain = true,
  maxRetries = 2,
  timeout = 10000,
  placeholder = null,
  onLoad = null,
  onError = null,
  enableCache = true,
  showFullUrl = false,
  customParser = null,
  fallbackImage = null
}) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [imageError, setImageError] = useState(false);
  const abortControllerRef = useRef(null);

  // Advanced metadata extraction
  const extractMetadata = useCallback((doc, url) => {
    const getMetaContent = (selectors) => {
      for (const selector of selectors) {
        const element = doc.querySelector(selector);
        if (element) {
          return element.getAttribute('content') || element.textContent || element.getAttribute('href');
        }
      }
      return null;
    };

    const resolveUrl = (relativeUrl, baseUrl) => {
      if (!relativeUrl) return null;
      try {
        return relativeUrl.startsWith('http') ? relativeUrl : new URL(relativeUrl, baseUrl).href;
      } catch {
        return null;
      }
    };

    // Extract title with multiple fallbacks
    const title = getMetaContent([
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'meta[property="twitter:title"]',
      'meta[name="title"]',
      'title',
      'h1'
    ]);

    // Extract description with multiple fallbacks
    const description = getMetaContent([
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[property="twitter:description"]',
      'meta[name="description"]',
      'meta[name="summary"]'
    ]);

    // Extract image with multiple fallbacks
    const imageUrl = getMetaContent([
      'meta[property="og:image"]',
      'meta[property="og:image:url"]',
      'meta[name="twitter:image"]',
      'meta[property="twitter:image"]',
      'meta[name="twitter:image:src"]',
      'link[rel="image_src"]'
    ]);

    // Extract additional metadata
    const siteName = getMetaContent([
      'meta[property="og:site_name"]',
      'meta[name="application-name"]',
      'meta[name="apple-mobile-web-app-title"]'
    ]);

    const type = getMetaContent([
      'meta[property="og:type"]'
    ]);

    const publishedTime = getMetaContent([
      'meta[property="article:published_time"]',
      'meta[name="date"]',
      'time[datetime]'
    ]);

    const author = getMetaContent([
      'meta[property="article:author"]',
      'meta[name="author"]',
      'meta[name="creator"]'
    ]);

    const keywords = getMetaContent([
      'meta[name="keywords"]',
      'meta[property="article:tag"]'
    ]);

    return {
      title: title?.trim() || 'No title available',
      description: description?.trim() || 'No description available',
      image: resolveUrl(imageUrl, url),
      siteName: siteName?.trim(),
      type: type?.trim() || 'website',
      publishedTime: publishedTime?.trim(),
      author: author?.trim(),
      keywords: keywords?.trim(),
      favicon: getFaviconUrl(url),
      domain: getDomainInfo(url).domain
    };
  }, []);

  // Advanced fetch with timeout and retries
  const fetchWithTimeout = useCallback(async (url, options = {}) => {
    const { timeout: timeoutMs = 10000, ...fetchOptions } = options;
    
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => abortControllerRef.current.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: abortControllerRef.current.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }, []);

  // Main fetch function with multiple strategies
  const fetchPreview = useCallback(async () => {
    if (!url || !isValidUrl(url)) {
      setError('Invalid URL provided');
      setLoading(false);
      return;
    }

    // Check cache first
    if (enableCache && previewCache.has(url)) {
      const cachedPreview = previewCache.get(url);
      setPreview(cachedPreview);
      setLoading(false);
      onLoad?.(cachedPreview);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let htmlContent = '';
      let success = false;

      // Strategy 1: Direct fetch (might fail due to CORS)
      if (!success) {
        try {
          const response = await fetchWithTimeout(url, { timeout });
          if (response.ok) {
            htmlContent = await response.text();
            success = true;
          }
        } catch (err) {
          console.log('Direct fetch failed, trying proxy...');
        }
      }

      // Strategy 2: CORS proxy services
      const proxyServices = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://cors-anywhere.herokuapp.com/${url}`
      ];

      for (const proxyUrl of proxyServices) {
        if (!success) {
          try {
            const response = await fetchWithTimeout(proxyUrl, { timeout });
            if (response.ok) {
              const data = await response.json();
              htmlContent = data.contents || data;
              success = true;
              break;
            }
          } catch (err) {
            console.log(`Proxy ${proxyUrl} failed:`, err.message);
          }
        }
      }

      if (!success) {
        throw new Error('All fetch strategies failed');
      }

      // Parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // Use custom parser if provided
      let metadata;
      if (customParser && typeof customParser === 'function') {
        metadata = customParser(doc, url);
      } else {
        metadata = extractMetadata(doc, url);
      }

      // Add fallback image if none found
      if (!metadata.image && fallbackImage) {
        metadata.image = fallbackImage;
      }

      // Cache the result
      if (enableCache) {
        previewCache.set(url, metadata);
      }

      setPreview(metadata);
      onLoad?.(metadata);

    } catch (err) {
      console.error('Error fetching preview:', err);
      
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchPreview(), 1000 * (retryCount + 1)); // Exponential backoff
      } else {
        setError(err.message);
        onError?.(err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, timeout, maxRetries, retryCount, enableCache, customParser, fallbackImage, extractMetadata, fetchWithTimeout, onLoad, onError]);

  useEffect(() => {
    fetchPreview();
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPreview]);

  // Retry function
  const handleRetry = () => {
    setRetryCount(0);
    setError(null);
    fetchPreview();
  };

  // Render loading state
  if (loading) {
    if (placeholder) return placeholder;
    
    return (
      <div className={`border border-gray-200 rounded-lg overflow-hidden animate-pulse ${className}`}>
        <div className={`${variant === 'compact' ? 'flex space-x-3 p-3' : 'block'}`}>
          {variant !== 'minimal' && (
            <div className={`bg-gray-300 ${
              variant === 'compact' ? 'w-16 h-12 flex-shrink-0' : 'w-full h-48'
            } rounded`}></div>
          )}
          <div className={`${variant === 'compact' ? 'flex-1' : 'p-4'} space-y-2`}>
            <div className="bg-gray-300 h-4 rounded w-3/4"></div>
            <div className="bg-gray-300 h-3 rounded w-full"></div>
            {variant !== 'minimal' && <div className="bg-gray-300 h-3 rounded w-1/2"></div>}
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`border border-red-200 bg-red-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-red-600 text-sm font-medium">Failed to load preview</p>
            <p className="text-red-500 text-xs mt-1">{error}</p>
            {showFullUrl && (
              <Link 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs break-all mt-2 block"
              >
                {url}
              </Link>
            )}
          </div>
          <button
            onClick={handleRetry}
            className="ml-3 px-3 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!preview) return null;

  const { domain } = getDomainInfo(url);

  // Render different variants
  const renderVariant = () => {
    switch (variant) {
      case 'minimal':
        return (
          <div className="flex items-center space-x-2">
            {showFavicon && (
              <Image
                src={preview.favicon}
                alt=""
                width={16}
                height={16}
                className="rounded-sm"
                onError={() => setImageError(true)}
              />
            )}
            <span className="text-sm font-medium text-gray-900 truncate">
              {preview.title}
            </span>
            {showDomain && (
              <span className="text-xs text-gray-500">• {domain}</span>
            )}
          </div>
        );

      case 'compact':
        return (
          <div className="flex space-x-3">
            {preview.image && !imageError && (
              <div className="w-20 h-14 flex-shrink-0 relative rounded overflow-hidden">
                <Image
                  src={preview.image}
                  alt={preview.title}
                  fill
                  className="object-cover"
                  sizes="80px"
                  onError={() => setImageError(true)}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 text-sm line-clamp-1 mb-1">
                {preview.title}
              </h3>
              <p className="text-gray-600 text-xs line-clamp-2 mb-1">
                {preview.description}
              </p>
              {showDomain && (
                <div className="flex items-center text-xs text-gray-400">
                  {showFavicon && (
                    <Image
                      src={preview.favicon}
                      alt=""
                      width={12}
                      height={12}
                      className="rounded-sm mr-1"
                      onError={() => setImageError(true)}
                    />
                  )}
                  <span className="truncate">{domain}</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'card':
        return (
          <div className="space-y-3">
            {preview.image && !imageError && (
              <div className="w-full h-56 relative rounded-lg overflow-hidden">
                <Image
                  src={preview.image}
                  alt={preview.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 400px"
                  onError={() => setImageError(true)}
                />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-gray-900 text-lg line-clamp-2 flex-1">
                  {preview.title}
                </h3>
                {preview.type && (
                  <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full flex-shrink-0">
                    {preview.type}
                  </span>
                )}
              </div>
              
              <p className="text-gray-600 text-sm line-clamp-3">
                {preview.description}
              </p>
              
              {(preview.author || preview.publishedTime) && (
                <div className="flex items-center text-xs text-gray-500 space-x-2">
                  {preview.author && <span>By {preview.author}</span>}
                  {preview.author && preview.publishedTime && <span>•</span>}
                  {preview.publishedTime && (
                    <span>{new Date(preview.publishedTime).toLocaleDateString()}</span>
                  )}
                </div>
              )}
              
              {showDomain && (
                <div className="flex items-center text-sm text-gray-400 pt-2 border-t">
                  {showFavicon && (
                    <Image
                      src={preview.favicon}
                      alt=""
                      width={16}
                      height={16}
                      className="rounded-sm mr-2"
                      onError={() => setImageError(true)}
                    />
                  )}
                  <span>{preview.siteName || domain}</span>
                </div>
              )}
            </div>
          </div>
        );

      default: // 'default'
        return (
          <div className="flex">
            {preview.image && !imageError && (
              <div className="w-32 h-24 flex-shrink-0 relative rounded-l-lg overflow-hidden">
                <Image
                  src={preview.image}
                  alt={preview.title}
                  fill
                  className="object-cover"
                  sizes="128px"
                  onError={() => setImageError(true)}
                />
              </div>
            )}
            <div className="flex-1 p-4 min-w-0">
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm">
                  {preview.title}
                </h3>
                <p className="text-gray-600 text-xs line-clamp-2">
                  {preview.description}
                </p>
                {showDomain && (
                  <div className="flex items-center text-xs text-gray-400 pt-1">
                    {showFavicon && (
                      <Image
                        src={preview.favicon}
                        alt=""
                        width={12}
                        height={12}
                        className="rounded-sm mr-1"
                        onError={() => setImageError(true)}
                      />
                    )}
                    <span className="truncate">{preview.siteName || domain}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  const containerClasses = `
    ${variant === 'minimal' ? 'inline-flex' : 'block'}
    ${variant !== 'minimal' ? 'border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-gray-300' : ''}
    ${variant === 'compact' || variant === 'default' ? 'bg-white' : ''}
    ${variant === 'card' ? 'bg-white shadow-sm' : ''}
    ${className}
  `;

  if (variant === 'minimal') {
    return (
      <Link 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`${containerClasses} hover:opacity-80 transition-opacity`}
        title={preview.description}
      >
        {renderVariant()}
      </Link>
    );
  }

  return (
    <Link 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className={containerClasses}
    >
      <div className={variant === 'card' ? 'p-6' : variant === 'compact' ? 'p-3' : ''}>
        {renderVariant()}
      </div>
    </Link>
  );
};

export default LinkPreview;
