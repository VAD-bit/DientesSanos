import manifest from '../../assets/instagram/manifest.json';

// Vite inyecta las URLs finales de cada imagen empaquetada.
const imageModules = import.meta.glob('../../assets/instagram/*.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
});

const fileToUrl = () => {
  const map = {};
  for (const [path, url] of Object.entries(imageModules)) {
    map[path.split('/').pop()] = url;
  }
  return map;
};

// Devuelve los posts más recientes ya descargados localmente (scripts/fetch-instagram.mjs).
// Si el manifest está vacío, devuelve [] y la UI cae en fallback (card con link al perfil).
export function getInstagramPosts(limit = 4) {
  const urls = fileToUrl();
  return (manifest || [])
    .map((post) => ({ ...post, image: urls[post.file] || null }))
    .filter((post) => post.image)
    .slice(0, limit);
}
