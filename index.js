import express from 'express';

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

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/plain,application/octet-stream,application/zip,*/*',
        'Referer': 'https://sbi.sberbank.ru/'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send(text.slice(0, 1000));
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(buffer);

  } catch (e) {
    res.status(500).send(e.message);
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Sber proxy started on port ${port}`);
});
