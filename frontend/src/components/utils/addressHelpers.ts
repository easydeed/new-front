import { GoogleAddressComponent } from '../types/PropertySearchTypes';

// Helper function to extract street address
export const extractStreetAddress = (components: GoogleAddressComponent[], placeName?: string): string => {
  const streetNumber = getComponent(components, 'street_number');
  const route = getComponent(components, 'route');
  
  if (streetNumber && route) {
    return `${streetNumber} ${route}`;
  } else if (placeName) {
    return placeName;
  } else if (route) {
    return route;
  }
  return '';
};

// Helper function to get component by type
export const getComponent = (
  components: GoogleAddressComponent[],
  type: string,
  nameType: 'long_name' | 'short_name' = 'long_name'
): string | null => {
  const component = components.find((comp) => comp.types.includes(type));
  return component ? component[nameType] || null : null;
};

// Helper function to get county fallback based on city and state
export const getCountyFallback = (city: string, state: string): string => {
  // Common California county mappings for major cities
  const countyMappings: {[key: string]: string} = {
    'los angeles': 'Los Angeles',
    'beverly hills': 'Los Angeles',
    'santa monica': 'Los Angeles',
    'hollywood': 'Los Angeles',
    'pasadena': 'Los Angeles',
    'glendale': 'Los Angeles',
    'burbank': 'Los Angeles',
    'long beach': 'Los Angeles',
    'torrance': 'Los Angeles',
    'la verne': 'Los Angeles',
    'pomona': 'Los Angeles',
    'san francisco': 'San Francisco',
    'oakland': 'Alameda',
    'san jose': 'Santa Clara',
    'san diego': 'San Diego',
    'sacramento': 'Sacramento',
    'fresno': 'Fresno',
    'bakersfield': 'Kern',
    'anaheim': 'Orange',
    'santa ana': 'Orange',
    'riverside': 'Riverside',
    'stockton': 'San Joaquin',
    'irvine': 'Orange',
    'fremont': 'Alameda',
    'san bernardino': 'San Bernardino',
    'modesto': 'Stanislaus'
  };

  if (state === 'CA' && city) {
    return countyMappings[city.toLowerCase()] || '';
  }
  return '';
};

