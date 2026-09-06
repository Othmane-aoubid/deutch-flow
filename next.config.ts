import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Native/runtime-resolved packages that must never be bundled — they need
  // the real Node runtime (onnxruntime binaries, ffmpeg executable path).
  serverExternalPackages: ['@xenova/transformers', 'onnxruntime-node', 'ffmpeg-static', 'sharp'],
  compiler: {
    // Enable styled-components SSR support (Primer React uses styled-components)
    styledComponents: true,
  },
  transpilePackages: ['@primer/react', '@primer/octicons-react', 'firebase-admin'],
}

export default nextConfig
