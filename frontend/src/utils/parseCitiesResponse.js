/**
 * Normalizes GET /api/cities — supports legacy plain array or { cities, popular }.
 */
export function parseCitiesResponse(data) {
  if (!data) return { cities: [], popular: [] };
  if (Array.isArray(data)) return { cities: data, popular: [] };
  return {
    cities: Array.isArray(data.cities) ? data.cities : [],
    popular: Array.isArray(data.popular) ? data.popular : [],
  };
}
