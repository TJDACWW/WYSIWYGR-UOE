import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(__dirname, 'data');
const WORKSPACE_FILE = path.join(DATA_DIR, 'workspace.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readWorkspace(): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(WORKSPACE_FILE)) return null;
    const raw = fs.readFileSync(WORKSPACE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function writeWorkspace(payload: Record<string, unknown>) {
  ensureDataDir();
  const tmpFile = `${WORKSPACE_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), 'utf-8');
  fs.renameSync(tmpFile, WORKSPACE_FILE);
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '15mb' }));
  app.use(express.text({ type: 'text/plain', limit: '15mb' }));

  app.get('/api/workspace', (_req, res) => {
    const data = readWorkspace();
    if (!data) {
      res.status(200).json({ empty: true });
      return;
    }
    res.status(200).json(data);
  });

  app.post('/api/workspace', (req, res) => {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }
      if (!body || typeof body !== 'object') {
        res.status(400).json({ error: 'Invalid workspace payload' });
        return;
      }
      writeWorkspace(body as Record<string, unknown>);
      res.status(200).json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to save workspace' });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WYSIWYGR&UOE server listening on port ${PORT}`);
  });
}

startServer();
