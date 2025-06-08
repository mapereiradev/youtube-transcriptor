import express from 'express';
import puppeteer from 'puppeteer-core';
import os from 'os';
import { writeFile } from 'fs/promises';

// CONFIG
const executablePath = '/snap/bin/brave';

const app = express();
app.use(express.json());

app.post('/transcribe', async (req, res) => {
  const { url } = req.body;
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

    // Click to reveal transcript or similar
    await page.evaluate(() => {
      const infoContainer = document.querySelector('#info-container');
      if (infoContainer) infoContainer.click();

      const button = document.querySelector('.yt-spec-button-shape-next.yt-spec-button-shape-next--outline.yt-spec-button-shape-next--call-to-action.yt-spec-button-shape-next--size-m.yt-spec-button-shape-next--enable-backdrop-filter-experiment');
      if (button) button.click();
    });

    await new Promise(resolve => setTimeout(resolve, 2500));

    const transcript = await page.evaluate(() => {
      const segmentsContainer = document.querySelector('#segments-container');
      if (!segmentsContainer) return '';
      const segments = segmentsContainer.querySelectorAll('yt-formatted-string');
      return Array.from(segments).map(el => el.innerText).join(' ');
    });

    await browser.close();

    return res.json({ transcript });

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

