/** @type {import('next').NextConfig} */
const staticExport = process.env.NEXT_STATIC_EXPORT === "1"
const djangoOrigin =
  process.env.BACKEND_URL?.replace(/\/$/, "") ||
  process.env.DJANGO_ORIGIN?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000"

const nextConfig = {
  trailingSlash: true,
  // Required for react-leaflet when using static export
  images: {
    unoptimized: true,
  },
}

if (staticExport) {
  nextConfig.output = "export"
  // Static hosting (e.g. GitHub Pages) cannot proxy; set NEXT_PUBLIC_API_BASE_URL to a reachable Django URL.
} else {
  nextConfig.rewrites = async () => [
    {
      source: "/api/:path*",
      destination: `${djangoOrigin}/api/:path*`,
    },
  ]
}

export default nextConfig
