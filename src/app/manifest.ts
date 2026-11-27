import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DAILY — Digital Workspace for University Students',
    short_name: 'DAILY',
    description: 'Plan with intention, focus on what matters, and make every day count.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F9F7FD',
    theme_color: '#F9F7FD',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
