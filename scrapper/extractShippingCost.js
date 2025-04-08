// 📁 scraper/extractShippingCost.js
const { logInfo, logWarning } = require('../utils/logger');

module.exports = async function extractShippingCost(page, productName) {
  logInfo(`🌍 Checking shipping info for: "${productName}"`);

  try {
    const cardHandle = await page.$x(`//h2[contains(text(), "${productName}")]`);
    if (!cardHandle || cardHandle.length === 0) {
      logWarning(`🔍 Could not find card for: ${productName}`);
      return { shipsToIsrael: false, shippingCost: null };
    }

    const container = await cardHandle[0].evaluateHandle(el => el.closest('.s-widget-container'));
    const shippingText = await container.evaluate(el => el.innerText);

    const match = shippingText.match(/\$(\d{1,3}(?:\.\d{2})?)\s+Shipping & Import Fees/);
    const shippingCost = match ? parseFloat(match[1]) : null;
    const shipsToIsrael = Boolean(match);

    if (shipsToIsrael) {
      logInfo(`✅ Shipping to Israel: $${shippingCost}`);
    } else {
      logWarning(`🚫 No shipping to Israel info found for: ${productName}`);
    }

    return { shipsToIsrael, shippingCost };
  } catch (err) {
    logWarning(`⚠️ Failed to extract shipping info for ${productName}: ${err.message}`);
    return { shipsToIsrael: false, shippingCost: null };
  }
};
