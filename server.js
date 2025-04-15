import express from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import cors from 'cors';
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

// 🧠 Global error logging to catch silent crashes (especially on Fly.io)
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});
puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get('/scrape', async (req, res) => {
  const gameName = req.query.name;
  if (!gameName) return res.status(400).json({ error: 'Missing ?name= parameter' });

  console.log(`\n🔍 Starting scrape for: "${gameName}"`);

  const browser = await puppeteer.launch({
    headless: true, // או 'new'
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-zygote',
      '--single-process',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'fr-FR,fr;q=1.0',
      'Referer': 'https://www.philibertnet.com/',
    });

    await page.setViewport({ width: 1200, height: 800 });

    console.log('🌐 Navigating to homepage...');
    await page.goto('https://www.philibertnet.com/en/', { waitUntil: 'domcontentloaded' });

    // 🍪 קבלת עוגיות
    try {
      console.log('🍪 Trying to accept cookies...');
      await page.waitForSelector('#didomi-notice-agree-button', { timeout: 5000 });
      await page.click('#didomi-notice-agree-button');
      console.log('✅ Cookies accepted');
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.warn('⚠️ Cookie popup not found or failed to click');
      await page.screenshot({ path: 'cookie-failure.png', fullPage: true });
      console.log('📸 Screenshot saved: cookie-failure.png');
    }

    // 🔍 חיפוש המשחק
    console.log('🔎 Typing into search box...');
    await page.waitForSelector('#search_query_top', { timeout: 8000 });
    await page.type('#search_query_top', gameName);
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // 🖼️ חיפוש תמונה מתוך תוצאות
    let imageUrl = null;
    try {
      await page.waitForSelector('li.ajax_block_product img', { timeout: 7000 });
      imageUrl = await page.$eval('li.ajax_block_product img', img => img.src);
      console.log(`✅ Found image URL: ${imageUrl}`);

     // 🧠 Smart upgrade to highest quality image
      const qualityLevels = ['zoom_default', 'thickbox_default', 'large_default'];

      for (const quality of qualityLevels) {
        const testUrl = imageUrl.replace('medium_default', quality);
        try {
          const head = await axios.head(testUrl);
          if (head.status === 200) {
            console.log(`🔄 Upgraded image URL to "${quality}": ${testUrl}`);
            imageUrl = testUrl;
            break;
          }
        } catch {
          console.log(`❌ Image version "${quality}" not found.`);
        }
      }


    } catch (err) {
      console.error('❌ Failed to find product image in search results.');
      await page.screenshot({ path: 'no-image.png', fullPage: true });
      fs.writeFileSync('search-page.html', await page.content());
      return res.status(404).json({
        error: 'Image not found in search results.',
        hint: 'See no-image.png and search-page.html for debugging.'
      });
    }

    await browser.close();
    console.log('🧹 Browser closed');

    return res.json({ imageUrl });

  } catch (err) {
    console.error('❌ Scraping failed:', err.message);
    try {
      const pages = await browser.pages();
      const page = pages[0];
      await page.screenshot({ path: 'error.png', fullPage: true });
      fs.writeFileSync('error.html', await page.content());
      console.log('📸 Screenshot saved to error.png');
      console.log('📝 HTML saved to error.html');
    } catch {
      console.warn('⚠️ Could not save error output');
    }

    await browser.close();
    return res.status(500).json({ error: 'Scraping failed', details: err.message });
  }
});

app.get('/ping', (req, res) => {
  console.log('🔔 Received ping → Scraper is awake!');
  res.status(200).send('✅ Scraper is alive');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Scraper running at http://localhost:${PORT}/scrape?name=Cascadia`);
});
