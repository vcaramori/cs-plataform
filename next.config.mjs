/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@pinecone-database/pinecone'],
  },
};

export default nextConfig;
