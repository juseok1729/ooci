import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['oracledb'],
  // see src/lib/react-image-shim.tsx
  turbopack: { resolveAlias: { 'react-image': './src/lib/react-image-shim.tsx' } },
}

export default nextConfig
