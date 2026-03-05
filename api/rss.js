// Vercel serverless function — proxies RSS feeds to avoid CORS issues
// Usage: /api/rss?url=https://example.com/feed/

const ALLOWED_DOMAINS = [
  'dysautonomiainternational.org',
  'thedysautonomiaproject.org',
  'healthrising.org',
  'www.healthrising.org',
];

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const parsed = new URL(url);
    if (!ALLOWED_DOMAINS.some((d) => parsed.hostname === d || parsed.hostname === `www.${d}`)) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'POTSense/1.0 RSS Reader' },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Feed returned ${response.status}` });
    }

    const xml = await response.text();

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(xml);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch feed' });
  }
}
