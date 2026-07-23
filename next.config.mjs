/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pg", "pdfjs-dist", "bcryptjs"],
    outputFileTracingIncludes: {
      "/api/submissions": [
        "./node_modules/pdfjs-dist/cmaps/**/*",
        "./node_modules/pdfjs-dist/standard_fonts/**/*",
      ],
    },
  },
};

export default nextConfig;
