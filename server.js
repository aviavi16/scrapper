import express from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import cors from 'cors';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get('/scrape', async (req, res) => {
  const gameName = req.query.name;
  if (!gameName) return res.status(400).json({ error: 'Missing ?name= parameter' });

  console.log(`\n🔍 Starting scrape for: "${gameName}"`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
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
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Referer': 'https://www.philibertnet.com/',
    });

    await page.setViewport({ width: 1200, height: 800 });

    // Warm up session
    const homepage = 'https://www.philibertnet.com/en/';
    console.log(`🌐 Visiting homepage: ${homepage}`);
    await page.goto(homepage, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Navigate to search page
    const searchUrl = `https://www.philibertnet.com/en/search?controller=search&s=${encodeURIComponent(gameName)}`;
    console.log(`🔍 Navigating to search page: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    const currentUrl = page.url();
    if (currentUrl === homepage) {
      throw new Error('Redirected to homepage or search blocked');
    }

    let productUrl = currentUrl;
    const linkSelector = '.product-title > a';

    try {
      await page.waitForSelector(linkSelector, { timeout: 7000 });
      productUrl = await page.$eval(linkSelector, el => el.href);
      console.log(`🔗 Found product URL: ${productUrl}`);
    } catch {
      console.log('ℹ️ Already on product page or no results.');
    }

    // Navigate to product page
    await page.goto(productUrl, { waitUntil: 'networkidle2' });

    const imageSelector = '#bigpic';
    await page.waitForSelector(imageSelector, { timeout: 10000 });

    const imageUrl = await page.$eval(imageSelector, img => img.src);
    console.log(`✅ Found image URL: ${imageUrl}`);

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
      console.warn('⚠️ Failed to capture error output');
    }

    return res.status(500).json({ error: 'Scraping failed', details: err.message });
  } finally {
    await browser.close();
    console.log('🧹 Browser closed');
  }
});

// ✅ Required for Fly.io: bind to 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Scraper running at http://localhost:${PORT}/scrape?name=Cascadia`);
});
