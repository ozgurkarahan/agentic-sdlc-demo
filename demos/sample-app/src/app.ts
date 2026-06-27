import express, { type Express, type RequestHandler } from 'express';
import { generateCode } from './code.js';
import { config } from './config.js';
import { LinkStore } from './store/linkStore.js';

export interface CreateAppOptions {
  extraMiddleware?: RequestHandler[];
}

interface ShortenRequestBody {
  url?: unknown;
}

function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function createUniqueCode(store: LinkStore): string {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateCode(6);
    if (!store.has(code)) {
      return code;
    }
  }

  throw new Error('Unable to generate a unique link code');
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  const store = new LinkStore();
  const { extraMiddleware = [] } = options;

  app.use(express.json());
  if (extraMiddleware.length > 0) {
    app.use(...extraMiddleware);
  }

  app.get('/healthz', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.post('/shorten', (request, response) => {
    const { url } = request.body as ShortenRequestBody;

    if (!isValidHttpUrl(url)) {
      response.status(400).json({ error: 'A valid http or https url is required' });
      return;
    }

    const code = createUniqueCode(store);
    const record = store.create(code, url);
    response.status(201).json({ code: record.code, shortUrl: `${config.baseUrl}/${record.code}` });
  });

  app.get('/api/links', (_request, response) => {
    response.status(200).json(store.list());
  });

  app.get('/:code', (request, response) => {
    const record = store.incrementHits(request.params.code);

    if (!record) {
      response.status(404).json({ error: 'Short link not found' });
      return;
    }

    response.redirect(302, record.url);
  });

  return app;
}

