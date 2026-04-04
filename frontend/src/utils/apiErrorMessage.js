/**
 * Build one string from FastAPI / axios error responses (detail string, list, or network).
 */
export function getApiErrorMessage(error, fallback = 'Something went wrong') {
  const res = error?.response;
  if (!res) {
    if (error?.message === 'Network Error') {
      return 'Network error — check that the API is running and REACT_APP_BACKEND_URL matches it (e.g. http://127.0.0.1:8000).';
    }
    return fallback;
  }

  const d = res.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) {
    return (
      d
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item.msg === 'string') return item.msg;
          return JSON.stringify(item);
        })
        .join(' ')
        .trim() || fallback
    );
  }
  if (d && typeof d === 'object' && typeof d.msg === 'string') return d.msg;
  if (typeof res.data?.message === 'string') return res.data.message;
  return `${fallback} (HTTP ${res.status})`;
}
