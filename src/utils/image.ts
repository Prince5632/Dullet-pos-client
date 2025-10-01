import { API_CONFIG } from '../config/api';

/**
 * Resolves image source URL with proper handling for different image types
 * @param value - Image data (base64, URL, or backend path)
 * @param options - Configuration options
 * @returns Resolved image URL or undefined if no value provided
 */
export function resolveImageSrc(
  value?: string | null, 
  options: {
    /** Whether to use backend URL for relative paths */
    useBackendUrl?: boolean;
    /** Default image type for base64 encoding */
    defaultImageType?: string;
    /** Backend endpoint path for images */
    backendPath?: string;
  } = {}
): string | undefined {
  if (!value) {
    return undefined;
  }

  const { 
    useBackendUrl = false, 
    defaultImageType = 'jpeg',
    backendPath = '/uploads/images'
  } = options;

  // If it's already a complete URL (http/https), return as is
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  // If it's already a data URL, return as is
  if (value.startsWith('data:')) {
    return value;
  }

  // If useBackendUrl is true and value looks like a file path, construct backend URL
  if (useBackendUrl && (value.includes('/') || value.includes('.'))) {
    const cleanPath = value.startsWith('/') ? value : `/${value}`;
    return `${API_CONFIG.BASE_URL}${backendPath}${cleanPath}`;
  }

  // Default case - assume it's a base64 string and add data URL prefix
  return `data:image/${defaultImageType};base64,${value}`;
}

/**
 * Specialized function for profile photos and user avatars
 * @param value - Profile photo data
 * @returns Resolved profile photo URL
 */
export function resolveProfileImageSrc(value?: string | null): string | undefined {
  return resolveImageSrc(value, { 
    useBackendUrl: true, 
    backendPath: '/uploads/profiles',
    defaultImageType: 'jpeg'
  });
}

/**
 * Specialized function for captured images (attendance, orders, visits)
 * @param value - Captured image data
 * @returns Resolved captured image URL
 */
export function resolveCapturedImageSrc(value?: string | null): string | undefined {
  return resolveImageSrc(value, { 
    useBackendUrl: false, // Captured images are typically base64
    defaultImageType: 'jpeg'
  });
}

/**
 * Specialized function for product images
 * @param value - Product image data
 * @returns Resolved product image URL
 */
export function resolveProductImageSrc(value?: string | null): string | undefined {
  return resolveImageSrc(value, { 
    useBackendUrl: true, 
    backendPath: '/uploads/products',
    defaultImageType: 'jpeg'
  });
}

/**
 * Legacy function name for backward compatibility
 * @deprecated Use resolveImageSrc instead
 */
export function formatImageSrc(value?: string | null): string | undefined {
  return resolveCapturedImageSrc(value);
}


