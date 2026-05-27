import express from 'express';
import https from 'https';

const app = express();
app.use(express.json({ limit: '2mb' }));

const TOKEN = process.env.PROXY_TOKEN;

app.get('/', (req, res) => {
  res.send('Sber proxy is running');
});

app.post('/download', async (req, res) => {
  try {
    const { token, url } = req.body;

    if (!TOKEN || token !== TOKEN) {
      return res.status(403).send('Forbidden');
    }

    if (!url || !url.startsWith('https://sbi.sberbank.ru:9443/')) {
      return res.status(400).send('Invalid URL');
    }

    const buffer = await downloadSberFile_(url);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(buffer);

  } catch (e) {
    console.error('Proxy error:', e);
    res.status(500).send(e.message || 'Proxy error');
  }
});

function downloadSberFile_(url) {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({
      rejectUnauthorized: false
    });

    const req = https.get(url, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/plain,application/octet-stream,application/zip,*/*',
        'Referer': 'https://sbi.sberbank.ru/'
      }
    }, response => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        let errorText = '';

        response.on('data', chunk => {
          errorText += chunk.toString();
        });

        response.on('end', () => {
          reject(new Error(`Sber HTTP ${response.statusCode}: ${errorText.slice(0, 1000)}`));
        });

        return;
      }

      const chunks = [];

      response.on('data', chunk => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.setTimeout(60000, () => {
      req.destroy(new Error('Sber download timeout'));
    });
  });
}

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Sber proxy started on port ${port}`);
});
