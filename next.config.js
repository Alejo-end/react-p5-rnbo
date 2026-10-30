// Next inlines its bootstrap scripts, so scripts stay on 'unsafe-inline' but
// only from this origin. @rnbo/js 1.3 evaluates each patch's code as a string
// and loads its audio worklet from a blob: URL. Client-side navigation keeps
// the first page's policy, so both hold for every page. Chakra injects styles;
// the font comes from Google.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Vercel already sends HSTS with preload on every deployment.
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // The piano reads Web MIDI, which this list leaves allowed.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
  rewrites: async () => {
    return [
      {
        source: '/sketches',
        destination: '/',
      },
    ]
  },
}

module.exports = nextConfig
