// Dev-only shim so `/api/*` serverless functions (api/**/*.js) work under
// plain `vite --host`, not just under a real Vercel deployment or `vercel dev`.
// Those handlers are written for Vercel's Node runtime, which augments the
// response with Express-like helpers (res.status/res.json) and pre-parses
// JSON bodies into req.body - neither exists on Vite's raw connect server,
// so this polyfills just enough of that surface to run the same handler code.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method === 'GET' || req.method === 'HEAD') return resolve(undefined);
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      if (!raw) return resolve(undefined);
      try { resolve(JSON.parse(raw)); }
      catch { reject(Object.assign(new Error('JSON inválido'), { statusCode: 400 })); }
    });
    req.on('error', reject);
  });
}

function withVercelShims(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.end(JSON.stringify(payload)); return res; };
  return res;
}

export default function localApiPlugin(apiDir = 'api') {
  const root = path.resolve(process.cwd(), apiDir);

  return {
    name: 'local-api-shim',
    apply: 'serve',
    configureServer(server) {
      // Non-VITE_-prefixed vars the handlers expect (process.env, not
      // import.meta.env) - mirror them from the VITE_ ones already in .env
      // so we don't need a second copy of the same secrets.
      process.env.SUPABASE_URL ||= process.env.VITE_SUPABASE_URL;
      process.env.SUPABASE_SERVICE_ROLE_KEY ||= process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const urlPath = req.url.split('?')[0];
        const relative = urlPath.replace(/^\/api\//, '');
        const candidates = [
          path.join(root, `${relative}.js`),
          path.join(root, relative, 'index.js'),
        ];
        const filePath = candidates.find((p) => fs.existsSync(p));
        if (!filePath) return next();

        try {
          const mod = await server.ssrLoadModule(pathToFileURL(filePath).href);
          const handler = mod.default;
          if (typeof handler !== 'function') return next();

          req.body = await readJsonBody(req);
          req.query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
          withVercelShims(res);

          await handler(req, res);
        } catch (err) {
          console.error(`[local-api] ${req.method} ${req.url} failed:`, err);
          if (!res.headersSent) {
            res.statusCode = Number(err?.statusCode) || 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: err?.message || 'Error interno' }));
          }
        }
      });
    },
  };
}
