const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const forbiddenWords = require('./scrapper/utils/forbiddenWords');

puppeteer.use(StealthPlugin());

async function handleCookiesPopup(page) {
  try {
    const cookiesButton = await page.$('#sp-cc-accept');
    if (cookiesButton) await cookiesButton.click();
  } catch (err) {
    console.log('⚠️ Could not handle cookies popup:', err.message);
  }
}

(async () => {
  const searchPhrase = 'terra mystica';
  const fullSearch = `${searchPhrase} board game`;
  const scrapeToPage = 1;

  console.log(`🔍 Searching for "${searchPhrase}" with "board game" suffix...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

  const homeUrl = 'https://www.amazon.com/';
  await page.goto(homeUrl, { waitUntil: 'domcontentloaded' });
  await handleCookiesPopup(page);

  await page.waitForSelector('#twotabsearchtextbox');
  await page.type('#twotabsearchtextbox', fullSearch, { delay: 100 });
  await page.click('#nav-search-submit-button');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  const url = page.url();
  const cardData = [];

  async function scrapePage(url, currentPage = 1, scrapeToPage = null) {
    console.log(`📄 Scraping page ${currentPage}...`);
    if (scrapeToPage && currentPage > scrapeToPage) return;

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await handleCookiesPopup(page);
    await page.waitForSelector('.s-widget-container');

    const pageCardData = await page.evaluate((searchPhrase, forbiddenWords) => {
    const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const normalizedSearch = normalize(searchPhrase);
    const cards = Array.from(document.querySelectorAll('.s-widget-container'));
    
    const result = { valid: [], rejected: [] };
    
    console.log(`🔍 Normalized search phrase: "${normalizedSearch}"`);
    console.log(`🔎 Found ${cards.length} result cards on the page.`);
    
    for (const card of cards) {
        const productName = card.querySelector('h2')?.textContent.trim() || '';
        const priceText = card.querySelector('.a-price .a-offscreen')?.textContent || 'N/A';
        const image = card.querySelector('img')?.src || null;
    
        const normalizedProduct = normalize(productName);
        const priceValue = parseFloat(priceText.replace(/[^0-9.]/g, ''));
    
        // בדיקת שם
        if (!normalizedProduct.includes(normalizedSearch)) {
        console.log(`❌ Rejected: "${productName}" – Missing search phrase`);
        result.rejected.push({ productName, price: priceText, reason: 'Does not include search term' });
        continue;
        }
    
        // בדיקת מילים אסורות
        const forbidden = forbiddenWords.find(word => normalizedProduct.includes(normalize(word)));
        if (forbidden) {
        console.log(`❌ Rejected: "${productName}" – Contains forbidden word: ${forbidden}`);
        result.rejected.push({ productName, price: priceText, reason: `Contains forbidden word: ${forbidden}` });
        continue;
        }
    
        // בדיקת מחיר חוקי
        if (isNaN(priceValue)) {
        console.log(`❌ Rejected: "${productName}" – Invalid or missing price: "${priceText}"`);
        result.rejected.push({ productName, price: priceText, reason: 'Invalid or missing price' });
        continue;
        }
    
        // הצלחה
        console.log(`✅ Accepted: "${productName}" – $${priceValue}`);
        result.valid.push({ productName, price: priceText, priceValue, image });
    }
    
    return result;
    }, searchPhrase, forbiddenWords);
                

    console.log(`✅ Found ${pageCardData.valid.length} valid product(s)`);
    if (pageCardData.rejected.length > 0) {
      console.log('🚫 Rejected products:');
      pageCardData.rejected.forEach(p => console.log(`  - ${p.productName} ❌ (${p.reason})`));
    }

    cardData.push(...pageCardData.valid);
  }

  await scrapePage(url, 1, scrapeToPage);

  const outputFilename = 'scrapedData.json';
  fs.writeFileSync(outputFilename, JSON.stringify(cardData, null, 2), 'utf8');
  console.log(`📁 Data saved to ${outputFilename}`);

  await browser.close();
})();

//TODO still need to devide the main chunk into files (not neccerally) 
// complete data for country search
//add more pages if not found and limit number of results and add timeouts.