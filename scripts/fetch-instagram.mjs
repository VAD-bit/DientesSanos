#!/usr/bin/env node
// Descarga los últimos posts del Instagram público de la clínica a src/assets/instagram/
// y escribe manifest.json para que el feed del portal los muestre.
//
// Uso (desde la raíz del proyecto, requiere Node 18+):
//   node scripts/fetch-instagram.mjs [username] [count]
//
// Nota: Instagram bloquea IPs de datacenter; ejecutar desde una red doméstica.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const username = process.argv[2] || 'dientes_sanos';
const count = Math.min(Number(process.argv[3] || 8), 12);
const OUT_DIR = path.resolve('src', 'assets', 'instagram');

const IG_APP_ID = '936619743392459';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function fetchProfile() {
  const res = await fetch(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
    {
      headers: {
        'x-ig-app-id': IG_APP_ID,
        'User-Agent': UA,
        Accept: 'application/json',
      },
    },
  );
  if (!res.ok) throw new Error(`Instagram respondió ${res.status} ${res.statusText}`);
  return res.json();
}

function pickPosts(json) {
  const user = json?.data?.user;
  if (!user) throw new Error('Respuesta sin data.user (¿cuenta privada o bloqueo?)');
  const edges = user?.edge_owner_to_timeline_media?.edges || [];
  return edges
    .map((e) => e.node)
    .filter((n) => n?.is_video !== true && n?.display_url)
    .slice(0, count);
}

async function downloadPost(node, index) {
  const ext = 'jpg';
  const file = `post-${String(index + 1).padStart(2, '0')}.${ext}`;
  const res = await fetch(node.display_url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Fallo descarga ${node.display_url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(OUT_DIR, file), buf);
  const caption =
    node.edge_media_to_caption?.edges?.[0]?.node?.text?.slice(0, 140) || '';
  return {
    file,
    shortcode: node.shortcode,
    permalink: `https://www.instagram.com/p/${node.shortcode}/`,
    likes: node.edge_liked_by?.count ?? node.edge_media_preview_like?.count ?? 0,
    comments: node.edge_media_to_comment?.count ?? 0,
    caption,
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`@${username} · últimas ${count} fotos…`);
  const json = await fetchProfile();
  const nodes = pickPosts(json);
  if (nodes.length === 0) {
    console.log('No se encontraron posts de imagen (solo videos o vacío).');
    process.exit(0);
  }
  const manifest = [];
  for (let i = 0; i < nodes.length; i++) {
    try {
      manifest.push(await downloadPost(nodes[i], i));
      console.log(`  ✓ post-${String(i + 1).padStart(2, '0')}.jpg  (${nodes[i].shortcode})`);
    } catch (err) {
      console.warn(`  ✗ post ${i + 1}: ${err.message}`);
    }
  }
  await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Listo: ${manifest.length} imágenes + manifest.json en src/assets/instagram/`);
  console.log('Ahora: npm run build (Vite empaqueta las imágenes automáticamente).');
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
