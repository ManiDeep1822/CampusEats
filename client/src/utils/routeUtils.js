/**
 * Fetches a road-following route from the OSRM Routing API.
 * @param {Array} start [lat, lng]
 * @param {Array} end [lat, lng]
 * @returns {Promise<Array>} A promise resolving to an array of [lat, lng] coordinates.
 */
export const fetchOSRMRoute = async (start, end) => {
  try {
    // OSRM expects [lng, lat]
    const startLngLat = `${start[1]},${start[0]}`;
    const endLngLat = `${end[1]},${end[0]}`;
    
    const url = `https://router.project-osrm.org/route/v1/driving/${startLngLat};${endLngLat}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('OSRM route fetch failed:', data.message);
      return [start, end]; // Fallback to a straight line
    }
    
    // OSRM returns [lng, lat], Leaflet needs [lat, lng]
    const coordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
    return coordinates;
  } catch (error) {
    console.error('Error fetching OSRM route:', error);
    return [start, end]; // Fallback to a straight line
  }
};
