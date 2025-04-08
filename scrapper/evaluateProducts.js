// 📁 scraper/evaluateProducts.js
module.exports = function evaluateProducts(searchPhrase, forbiddenWords) {
    const normalize = (str) => str.toLowerCase().replace(/[^֐-׿\w\s]/g, '').trim();
    const normalizedSearch = normalize(searchPhrase);
    const cards = Array.from(document.querySelectorAll('.s-widget-container'));
  
    const result = { valid: [], rejected: [] };
    console.log(`🔍 Normalized search phrase: "${normalizedSearch}"`);
    console.log(`📦 Found ${cards.length} result cards.`);
  
    for (const card of cards) {
      const productName = card.querySelector('h2')?.textContent.trim() || '';
      const priceText = card.querySelector('.a-price .a-offscreen')?.textContent || 'N/A';
      const image = card.querySelector('img')?.src || null;
  
      const normalizedProduct = normalize(productName);
      const priceValue = parseFloat(priceText.replace(/[^0-9.]/g, ''));
  
      if (!normalizedProduct.includes(normalizedSearch)) {
        console.log(`❌ Rejected: "${productName}" – Missing search phrase`);
        result.rejected.push({ productName, price: priceText, reason: 'Does not include search term' });
        continue;
      }
  
      const forbidden = forbiddenWords.find(word => normalizedProduct.includes(normalize(word)));
      if (forbidden) {
        console.log(`❌ Rejected: "${productName}" – Contains forbidden word: ${forbidden}`);
        result.rejected.push({ productName, price: priceText, reason: `Contains forbidden word: ${forbidden}` });
        continue;
      }
  
      if (isNaN(priceValue)) {
        console.log(`❌ Rejected: "${productName}" – Invalid price`);
        result.rejected.push({ productName, price: priceText, reason: 'Invalid price' });
        continue;
      }
  
      console.log(`✅ Accepted: "${productName}" – $${priceValue}`);
      result.valid.push({ productName, price: priceText, priceValue, image });
    }
  
    return result;
  };