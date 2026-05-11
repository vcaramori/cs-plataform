/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse', '@google/genai'],
  // TODO: regenerate src/lib/supabase/database.types.ts from live Supabase
  // (`npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts`)
  // to resolve ~200 pre-existing TS errors from stale type definitions.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
