/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Hide the English Next.js developer menu; Starlog's Korean settings UI replaces it.
  devIndicators: false,
  serverExternalPackages: ["pdfjs-dist"],
  experimental: {
    // Allow a 100 MB file plus multipart form-data overhead in the local upload route.
    proxyClientMaxBodySize: "110mb",
  },
};

export default nextConfig;
