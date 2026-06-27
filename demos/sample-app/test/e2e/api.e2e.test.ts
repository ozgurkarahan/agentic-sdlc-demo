import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';

describe('URL shortener API', () => {
  it('creates a short link and redirects to the original URL', async () => {
    const app = createApp();

    const createResponse = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/docs' })
      .expect(201);

    expect(createResponse.body).toEqual({
      code: expect.stringMatching(/^[0-9A-Za-z]{6}$/),
      shortUrl: expect.stringMatching(/^http:\/\/localhost:3000\/[0-9A-Za-z]{6}$/),
    });

    await request(app)
      .get(`/${createResponse.body.code}`)
      .expect(302)
      .expect('Location', 'https://example.com/docs');
  });

  it('returns 404 for unknown codes', async () => {
    const app = createApp();

    const response = await request(app).get('/missing').expect(404);

    expect(response.body).toEqual({ error: expect.any(String) });
  });

  it('returns 400 for missing or invalid URLs', async () => {
    const app = createApp();

    await request(app)
      .post('/shorten')
      .send({})
      .expect(400)
      .expect(({ body }) => {
        expect(body).toEqual({ error: expect.any(String) });
      });

    await request(app)
      .post('/shorten')
      .send({ url: 'ftp://example.com' })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toEqual({ error: expect.any(String) });
      });
  });

  it('lists links and reflects redirect hits', async () => {
    const app = createApp();

    const createResponse = await request(app)
      .post('/shorten')
      .send({ url: 'https://example.com/hit-me' })
      .expect(201);

    await request(app).get(`/${createResponse.body.code}`).expect(302);
    await request(app).get(`/${createResponse.body.code}`).expect(302);

    const listResponse = await request(app).get('/api/links').expect(200);

    expect(listResponse.body).toEqual([
      {
        code: createResponse.body.code,
        url: 'https://example.com/hit-me',
        hits: 2,
      },
    ]);
  });

  it('reports health without dependencies', async () => {
    const app = createApp();

    const response = await request(app).get('/healthz').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });
});
