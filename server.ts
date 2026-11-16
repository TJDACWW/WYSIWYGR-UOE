import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(__dirname, 'data');
const WORKSPACE_FILE = path.join(DATA_DIR, 'workspace.json');
const SHARES_FILE = path.join(DATA_DIR, 'shares.json');

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

interface SharedRecord {
  id: string;
  createdAt: string;
  exercise: Record<string, unknown>;
  a11y?: Record<string, unknown>;
}

function stripExerciseAnswersServer(ex: Record<string, unknown>): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: ex.id,
    type: ex.type,
    title: ex.title,
    subtitle: ex.subtitle,
    instructions: ex.instructions,
    updatedAt: ex.updatedAt,
  };
  const items = Array.isArray(ex.items) ? (ex.items as Record<string, unknown>[]) : [];

  switch (ex.type) {
    case 'multiple-choice-cloze':
      return {
        ...base,
        passageHtml: ex.passageHtml,
        optionCount: ex.optionCount,
        items: items.map((it) => ({
          id: it.id,
          gapNumber: it.gapNumber,
          options: Array.isArray(it.options) ? [...it.options] : [],
          correctIndex: -1,
        })),
      };
    case 'open-cloze':
      return {
        ...base,
        passageHtml: ex.passageHtml,
        items: items.map((it) => ({
          id: it.id,
          gapNumber: it.gapNumber,
          acceptedAnswers: [],
        })),
      };
    case 'word-formation':
      return {
        ...base,
        passageHtml: ex.passageHtml,
        items: items.map((it) => ({
          id: it.id,
          gapNumber: it.gapNumber,
          stemWord: it.stemWord,
          acceptedAnswers: [],
        })),
      };
    case 'key-word-transformation':
      return {
        ...base,
        introHtml: ex.introHtml,
        items: items.map((it) => ({
          id: it.id,
          number: it.number,
          originalSentence: it.originalSentence,
          keyWord: it.keyWord,
          gappedSentence: it.gappedSentence,
          acceptedAnswers: [],
        })),
      };
    case 'multiple-choice':
      return {
        ...base,
        passageHtml: ex.passageHtml,
        items: items.map((it) => ({
          id: it.id,
          number: it.number,
          question: it.question,
          options: Array.isArray(it.options) ? [...it.options] : [],
          correctIndex: -1,
        })),
      };
    case 'gapped-text': {
      const gaps = Array.isArray(ex.gaps) ? (ex.gaps as Record<string, unknown>[]) : [];
      const options = Array.isArray(ex.options) ? (ex.options as Record<string, unknown>[]) : [];
      return {
        ...base,
        passageHtml: ex.passageHtml,
        gaps: gaps.map((g) => ({
          id: g.id,
          gapNumber: g.gapNumber,
          correctLetter: '',
        })),
        options: options.map((o) => ({
          id: o.id,
          letter: o.letter,
          html: o.html,
        })),
      };
    }
    case 'multiple-matching':
    case 'cross-text-matching': {
      const texts = Array.isArray(ex.texts) ? (ex.texts as Record<string, unknown>[]) : [];
      return {
        ...base,
        texts: texts.map((t) => ({
          id: t.id,
          letter: t.letter,
          title: t.title,
          html: t.html,
        })),
        items: items.map((it) => ({
          id: it.id,
          number: it.number,
          question: it.question,
          correctLetter: '',
        })),
      };
    }
    default:
      return base;
  }
}

function readShares(): Record<string, SharedRecord> {
  try {
    if (!fs.existsSync(SHARES_FILE)) return {};
    const raw = fs.readFileSync(SHARES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, SharedRecord>;
    }
    return {};
  } catch {
    return {};
  }
}

function writeShares(shares: Record<string, SharedRecord>) {
  ensureDataDir();
  const tmpFile = `${SHARES_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(shares, null, 2), 'utf-8');
  fs.renameSync(tmpFile, SHARES_FILE);
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

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

  app.post('/api/shares', (req, res) => {
    try {
      const body = req.body as Record<string, unknown> | null;
      if (!body || !body.exercise || typeof body.exercise !== 'object') {
        res.status(400).json({ error: 'Exercise payload is required' });
        return;
      }
      const stripped = stripExerciseAnswersServer(body.exercise as Record<string, unknown>);
      const id = crypto.randomBytes(6).toString('base64url').slice(0, 8);
      const shares = readShares();
      shares[id] = {
        id,
        createdAt: new Date().toISOString(),
        exercise: stripped,
        a11y:
          body.a11y && typeof body.a11y === 'object'
            ? (body.a11y as Record<string, unknown>)
            : undefined,
      };
      writeShares(shares);
      res.status(200).json({ id });
    } catch {
      res.status(500).json({ error: 'Failed to create share link' });
    }
  });

  app.get('/api/shares/:id', (req, res) => {
    const shareId = req.params.id;
    if (!/^[a-zA-Z0-9_-]{4,24}$/.test(shareId)) {
      res.status(400).json({ error: 'Invalid share ID' });
      return;
    }
    const shares = readShares();
    const record = shares[shareId];
    if (!record) {
      res.status(404).json({ error: 'Shared exercise not found' });
      return;
    }
    res.status(200).json({
      id: record.id,
      createdAt: record.createdAt,
      exercise: stripExerciseAnswersServer(record.exercise),
      a11y: record.a11y,
    });
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
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`WYSIWYGR&UOE server listening on port ${PORT}`);
  });
}

startServer();
