//reactFetch.ts
const base = import.meta.env.VITE_API_BASE_URL;
const res = await fetch(`${base}/hello`);
