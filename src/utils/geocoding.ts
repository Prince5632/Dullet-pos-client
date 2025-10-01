interface GeocodeResult {
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

interface ReverseGeocodeResponse {
  success: boolean;
  address?: string;
  error?: string;
}

// Cache to store previously fetched addresses
const addressCache = new Map<string, string>();

// Rate limiting
let lastRequestTime = 0;
const RATE_LIMIT_DELAY = 1000; // 1 second between requests

/**
 * Converts latitude and longitude coordinates to a human-readable address
 * using OpenStreetMap's Nominatim reverse geocoding API
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResponse> => {
  try {
    // Create cache key
    const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    
    console.log(`🌍 Reverse geocoding request for: ${cacheKey}`);
    
    // Check cache first
    if (addressCache.has(cacheKey)) {
      console.log(`✅ Cache hit for: ${cacheKey}`);
      return {
        success: true,
        address: addressCache.get(cacheKey)!
      };
    }

    // Rate limiting
    const now = Date.now();
    if (now - lastRequestTime < RATE_LIMIT_DELAY) {
      const waitTime = RATE_LIMIT_DELAY - (now - lastRequestTime);
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastRequestTime = Date.now();

    // Make API request to Nominatim
    console.log(`🌐 Making API request to Nominatim...`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Dullet-POS-Client/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: GeocodeResult = await response.json();
    
    if (!data.display_name) {
      return {
        success: false,
        error: 'No address found for these coordinates'
      };
    }

    // Format the address nicely
    let formattedAddress = '';
    const addr = data.address;
    
    if (addr) {
      const parts = [];
      
      // Add house number and road
      if (addr.house_number && addr.road) {
        parts.push(`${addr.house_number} ${addr.road}`);
      } else if (addr.road) {
        parts.push(addr.road);
      }
      
      // Add neighbourhood or suburb
      if (addr.neighbourhood) {
        parts.push(addr.neighbourhood);
      } else if (addr.suburb) {
        parts.push(addr.suburb);
      }
      
      // Add city
      if (addr.city) {
        parts.push(addr.city);
      }
      
      // Add state and postcode
      if (addr.state) {
        const stateInfo = addr.postcode ? `${addr.state} ${addr.postcode}` : addr.state;
        parts.push(stateInfo);
      }
      
      formattedAddress = parts.join(', ');
    }
    
    // Fallback to display_name if formatted address is empty
    const finalAddress = formattedAddress || data.display_name;
    
    // Cache the result
    addressCache.set(cacheKey, finalAddress);
    
    return {
      success: true,
      address: finalAddress
    };
    
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch address'
    };
  }
};

/**
 * Clears the address cache
 */
export const clearAddressCache = (): void => {
  addressCache.clear();
};

/**
 * Gets the current cache size
 */
export const getCacheSize = (): number => {
  return addressCache.size;
};
