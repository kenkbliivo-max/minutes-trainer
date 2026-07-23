/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pg", "pdfjs-dist", "bcryptjs"],
    outputFileTracingIncludes: {
      "/api/submissions": ["./node_modules/pdfjs-dist/**/*"],
    },
  },
};

export default nextConfig;
