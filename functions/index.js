// Cloud Function proxy minimal pour OpenAI
// - Déploiement ciblé: functions:openaiProxy
// - La clé OPENAI_API_KEY est stockée en secret Functions (pas dans le code)

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

exports.openaiProxy = onRequest({
  region: 'europe-west1',
  secrets: [OPENAI_API_KEY],
  cors: true,
  timeoutSeconds: 540,
}, async (req, res) => {
  try {
    // Forward uniquement POST (chat/responses). Autoriser GET pour santé.
    if (req.method === 'GET') {
      res.status(200).json({ ok: true, service: 'openaiProxy' });
      return;
    }
    if (req.method !== 'POST') {
      res.set('Allow', 'POST, GET');
      res.status(405).send('Method Not Allowed');
      return;
    }

    const base = 'https://api.openai.com';
    const targetUrl = base + (req.url || '/v1/chat/completions');

    const headers = {
      'Authorization': `Bearer ${OPENAI_API_KEY.value()}`,
      'Content-Type': req.get('content-type') || 'application/json',
      'Accept': req.get('accept') || 'application/json',
    };

    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: req.rawBody,
    });

    // Propager status et headers critiques (pour le streaming SSE)
    res.status(resp.status);
    const ct = resp.headers.get('content-type');
    if (ct) res.set('Content-Type', ct);
    const cache = resp.headers.get('cache-control');
    if (cache) res.set('Cache-Control', cache);

    if (resp.body) {
      // Stream web → Node
      const { Readable } = require('node:stream');
      Readable.fromWeb(resp.body).pipe(res);
    } else {
      const text = await resp.text();
      res.send(text);
    }
  } catch (err) {
    logger.error('openaiProxy error', err);
    res.status(500).json({ error: 'proxy_error' });
  }
});


