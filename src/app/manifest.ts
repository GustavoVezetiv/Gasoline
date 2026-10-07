import type { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest {
  return { name: 'Gasoline', short_name: 'Gasoline', description: 'Preços de combustível do seu grupo', start_url: '/', display: 'standalone', background_color: '#ffffff', theme_color: '#ffffff', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }] }
}
