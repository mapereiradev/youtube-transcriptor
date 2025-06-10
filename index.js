import express from 'express';
import puppeteer from 'puppeteer-core';

const executablePath = '/snap/bin/brave';

const app = express();
app.use(express.json());

app.post('/transcribe', async (req, res) => {
  const { url, format } = req.body;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid or missing YouTube URL.' });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: false,
      defaultViewport: { width: 1080, height: 1024 },
      args: ['--no-sandbox', '--brave-shields-up']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Wait for main content
    await page.waitForSelector('#info-container', { timeout: 10000 });

    // Click to reveal transcript
    await page.evaluate(() => {
      const infoContainer = document.querySelector('#info-container');
      if (infoContainer) infoContainer.click();

      const button = document.querySelector('#primary-button')?.children?.[0]?.children?.[0]?.children?.[0];
      if (button) button.click();
    });

    await new Promise(resolve => setTimeout(resolve, 2500));

    const transcript = await page.evaluate(() => {
      const segmentsContainer = document.querySelector('#segments-container');
      if (!segmentsContainer) return '';
      if (!format || format !== 'markdown') {
        const segments = segmentsContainer.querySelectorAll('yt-formatted-string');
        return Array.from(segments).map(el => el.innerText).join(' ');
      }
      const dicc = Array.from(segmentsContainer.children).reduce((acc, curr) => {
        if (curr.tagName === 'ytd-transcript-section-header-renderer'.toUpperCase()) {
          acc[curr.innerText] = '';
          acc.currentTitle = curr.innerText;
          return acc;
        }
        acc[acc.currentTitle] += `${curr.getElementsByTagName('yt-formatted-string')[0].innerText} `;
        return acc;
      }, {});
      const result = Object.keys(dicc).reduce((acc, curr) => acc +=`\n## ${curr}\n${dicc[curr]}`,'');
      delete result.currentTitle;
      return result;
    }, format);
    // const title = await page.evaluate(() => { document.querySelector('title').innerText });

    await browser.close();

    res.send(transcript);
    // return res.json(transcript);

  } catch (err) {
    console.error('Failed to extract transcript:', err);
    if (browser) await browser.close();
    return res.status(500).json({ error: 'Failed to extract transcript' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

