import puppeteer from 'puppeteer-core';
import { marked } from 'marked';


export async function transcribeHandler(req, res) {
  const { url, format } = req.body;
  const transcript = await transcribe(url, format);
  res.send(transcript);
}

export async function homeHandler(req, res) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Simple Input Form</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                padding: 50px;
                max-width: 400px;
                margin: auto;
            }
            .form-group {
                margin-bottom: 20px;
            }
            input[type="text"] {
                width: 100%;
                padding: 8px;
                font-size: 14px;
                box-sizing: border-box;
            }
            button {
                padding: 10px 20px;
                font-size: 14px;
                cursor: pointer;
            }
        </style>
    </head>
    <body>
        <form action="render-transcript" method="post">
            <div class="form-group">
                <label for="url-input">Enter your text:</label>
                <input type="text" id="url" name="url" required>
            </div>
            <div class="form-group">
              <input type="checkbox" id="format" name="format" value="markdown">
              <label for="format">Markdown format</label>
            </div>
            <button type="submit">Submit</button>
        </form>
    </body>
    </html>`
  res.send(html);
}

export async function renderHandler(req, res) {
  const { url, format } = req.body;
  const htmlContent = marked(await transcribe(url, format));
  const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <link rel="stylesheet" href="/css/github-markdown.css">
            <title>Markdown Renderer</title>
            <style>
              body {
                box-sizing: border-box;
                margin: 0 auto;
                padding: 40px;
                max-width: 800px;
              }
            </style>
        </head>
        <body>
            <article class="markdown-body">
                ${htmlContent}
            </article>
        </body>
        </html>
    `;
  res.send(html);
}

export async function getChannelVideosIds(req, res) {

  const channelName = req.query.channelName;
  const url = `https://www.youtube.com/@${channelName}/videos`

  let browser;

  try {
    browser = await puppeteer.launch({
      // executablePath: process.env.BRAVE_EXECUTABLE || '/usr/bin/brave-browser',
      executablePath:  '/snap/bin/brave',
      headless: false,
      defaultViewport: { width: 1280, height: 1024 },
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    await page.evaluate(async () => {
      const delay = ms => new Promise(res => setTimeout(res, ms));
      let lastHeight = 0;
      while (true) {
        window.scrollBy(0, 2000);
        await delay(1000);
        const currentHeight = document.documentElement.scrollHeight;
        if (currentHeight === lastHeight) break;
        lastHeight = currentHeight;
      }
    });

    const videoIds = await page.evaluate(() => {
      const matches = [...document.body.innerHTML.matchAll(/watch\?v=([a-zA-Z0-9_-]{11})/g)].map(m => m[1]);
      return [...new Set(matches)];
    });

    await browser.close();

    const fullUrls = videoIds.map(id => `https://www.youtube.com/watch?v=${id}`);
    return res.json({ count: fullUrls.length, videos: fullUrls });

  } catch (err) {
    console.error('Failed to extract videos:', err);
    if (browser) await browser.close();
    return res.status(500).json({ error: 'Failed to extract video list' });
  }
}

async function transcribe(url, format) {
  // const executablePath = '/snap/bin/brave';
  const executablePath = process.env.BRAVE_EXECUTABLE || '/usr/bin/brave-browser';


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

    const transcript = await page.evaluate((format) => {
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
      const result = Object.keys(dicc).reduce(
        (acc, curr) => {
          if (curr !== 'currentTitle') {
            acc +=`\n## ${curr}\n${dicc[curr]}`
          }
          return acc;
        },'');
      delete result.currentTitle
      return result;
    }, format);

    await browser.close();

    return transcript;

  } catch (err) {
    console.error('Failed to extract transcript:', err);
    if (browser) await browser.close();
    return res.status(500).json({ error: 'Failed to extract transcript' });
  }
}