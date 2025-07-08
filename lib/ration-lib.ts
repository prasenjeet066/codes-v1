interface MediaDimensions {
  width: number;
  height: number;
}

interface AspectRatio {
  ratio: number;
  decimal: string;
  common ? : string;
}

/**
 * Calculates the greatest common divisor of two numbers
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Gets common aspect ratio names
 */
function getCommonRatioName(width: number, height: number): string | undefined {
  const ratios: Record < string, string > = {
    '16:9': '16:9 (Widescreen)',
    '4:3': '4:3 (Standard)',
    '3:2': '3:2 (Classic)',
    '1:1': '1:1 (Square)',
    '9:16': '9:16 (Vertical/Mobile)',
    '21:9': '21:9 (Ultrawide)',
    '5:4': '5:4 (Monitor)',
    '3:4': '3:4 (Portrait)',
    '2:3': '2:3 (Portrait Classic)'
  };
  
  const ratioKey = `${width}:${height}`;
  return ratios[ratioKey];
}

/**
 * Calculates aspect ratio from media dimensions
 */
export function calculateAspectRatio(dimensions: MediaDimensions): AspectRatio {
  const { width, height } = dimensions;
  
  if (width <= 0 || height <= 0) {
    throw new Error('Width and height must be positive numbers');
  }
  
  // Calculate decimal ratio
  const ratio = width / height;
  
  // Calculate simplified ratio
  const divisor = gcd(width, height);
  const simplifiedWidth = width / divisor;
  const simplifiedHeight = height / divisor;
  
  // Format as string ratio
  const decimal = `${simplifiedWidth}:${simplifiedHeight}`;
  
  // Check for common ratio names
  const common = getCommonRatioName(simplifiedWidth, simplifiedHeight);
  
  return {
    ratio,
    decimal,
    common
  };
}

/**
 * Gets aspect ratio from an HTML image element
 */
export function getImageRatio(img: HTMLImageElement): AspectRatio {
  if (!img.complete) {
    throw new Error('Image must be fully loaded');
  }
  
  return calculateAspectRatio({
    width: img.naturalWidth,
    height: img.naturalHeight
  });
}

/**
 * Gets aspect ratio from an HTML video element
 */
export function getVideoRatio(video: HTMLVideoElement): AspectRatio {
  if (video.readyState === 0) {
    throw new Error('Video metadata must be loaded');
  }
  
  return calculateAspectRatio({
    width: video.videoWidth,
    height: video.videoHeight
  });
}

/**
 * Gets aspect ratio from a video source URL
 */
export function getVideoRatioFromSrc(src: string): Promise < AspectRatio > {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous'; // Handle CORS if needed
    
    video.onloadedmetadata = () => {
      try {
        const ratio = getVideoRatio(video);
        resolve(ratio);
      } catch (error) {
        reject(error);
      }
    };
    
    video.onerror = () => {
      reject(new Error(`Failed to load video from: ${src}`));
    };
    
    video.src = src;
  });
}

/**
 * Gets aspect ratio from an image source URL
 */
export function getImageRatioFromSrc(src: string): Promise < AspectRatio > {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Handle CORS if needed
    
    img.onload = () => {
      try {
        const ratio = getImageRatio(img);
        resolve(ratio);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image from: ${src}`));
    };
    
    img.src = src;
  });
}

/**
 * Gets aspect ratio from a file (works with images and videos)
 */
export function getMediaRatioFromFile(file: File): Promise < AspectRatio > {
  return new Promise((resolve, reject) => {
    const fileType = file.type;
    
    if (fileType.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        try {
          const ratio = getImageRatio(img);
          resolve(ratio);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
      
    } else if (fileType.startsWith('video/')) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        try {
          const ratio = getVideoRatio(video);
          URL.revokeObjectURL(video.src);
          resolve(ratio);
        } catch (error) {
          reject(error);
        }
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video'));
      };
      video.src = URL.createObjectURL(file);
      
    } else {
      reject(new Error('File must be an image or video'));
    }
  });
}

/**
 * Utility function to check if ratio is landscape, portrait, or square
 */
export function getOrientation(ratio: AspectRatio): 'landscape' | 'portrait' | 'square' {
  if (ratio.ratio > 1) return 'landscape';
  if (ratio.ratio < 1) return 'portrait';
  return 'square';
}

/**
 * Calculates height based on width and aspect ratio
 */
export function getHeightFromWidth(width: number, ratio: AspectRatio): number {
  if (width <= 0) {
    throw new Error('Width must be a positive number');
  }
  return Math.round(width / ratio.ratio);
}

/**
 * Calculates width based on height and aspect ratio
 */
export function getWidthFromHeight(height: number, ratio: AspectRatio): number {
  if (height <= 0) {
    throw new Error('Height must be a positive number');
  }
  return Math.round(height * ratio.ratio);
}

/**
 * Calculates dimensions based on one dimension and aspect ratio
 */
export function calculateDimensions(
  knownDimension: { width: number } | { height: number },
  ratio: AspectRatio
): MediaDimensions {
  if ('width' in knownDimension) {
    return {
      width: knownDimension.width,
      height: getHeightFromWidth(knownDimension.width, ratio)
    };
  } else {
    return {
      width: getWidthFromHeight(knownDimension.height, ratio),
      height: knownDimension.height
    };
  }
}

// Example usage:
/*
// From dimensions
const ratio1 = calculateAspectRatio({ width: 1920, height: 1080 });
console.log(ratio1); // { ratio: 1.777..., decimal: "16:9", common: "16:9 (Widescreen)" }

// Calculate height from width and ratio
const height = getHeightFromWidth(800, ratio1);
console.log(height); // 450 (800 ÷ 1.777... = 450)

// Calculate width from height and ratio
const width = getWidthFromHeight(400, ratio1);
console.log(width); // 711 (400 × 1.777... = 711)

// Calculate full dimensions
const dimensions1 = calculateDimensions({ width: 1200 }, ratio1);
console.log(dimensions1); // { width: 1200, height: 675 }

const dimensions2 = calculateDimensions({ height: 600 }, ratio1);
console.log(dimensions2); // { width: 1067, height: 600 }

// From video source URL
getVideoRatioFromSrc('https://example.com/video.mp4').then(ratio => {
  console.log(`Video aspect ratio: ${ratio.decimal} (${ratio.common || 'Custom'})`);
  console.log(`Orientation: ${getOrientation(ratio)}`);
  
  // Calculate height for 800px width
  const height = getHeightFromWidth(800, ratio);
  console.log(`For 800px width, height should be: ${height}px`);
});

// From image source URL
getImageRatioFromSrc('https://example.com/image.jpg').then(ratio => {
  console.log(`Image aspect ratio: ${ratio.decimal} (${ratio.common || 'Custom'})`);
  
  // Calculate width for 400px height
  const width = getWidthFromHeight(400, ratio);
  console.log(`For 400px height, width should be: ${width}px`);
});

// From file
const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
const file = fileInput.files?.[0];
if (file) {
  getMediaRatioFromFile(file).then(ratio => {
    console.log(`Aspect ratio: ${ratio.decimal} (${ratio.common || 'Custom'})`);
    console.log(`Orientation: ${getOrientation(ratio)}`);
    
    // Calculate dimensions for responsive design
    const mobileDimensions = calculateDimensions({ width: 320 }, ratio);
    console.log(`Mobile (320px): ${mobileDimensions.width}x${mobileDimensions.height}`);
    
    const desktopDimensions = calculateDimensions({ width: 1920 }, ratio);
    console.log(`Desktop (1920px): ${desktopDimensions.width}x${desktopDimensions.height}`);
  });
}
*/