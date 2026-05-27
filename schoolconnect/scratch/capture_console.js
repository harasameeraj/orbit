import puppeteer from 'puppeteer';

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    console.error('[BROWSER EXCEPTION]:', err.toString());
  });

  console.log('Navigating to http://localhost:5173/ ...');
  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 10000 });
    console.log('Page loaded. Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const html = await page.evaluate(() => document.body.innerHTML);
    console.log('--- DOM BODY CONTENT ---');
    console.log(html);
    console.log('------------------------');

    console.log('Taking screenshot...');
    await page.screenshot({ path: 'scratch/screenshot.png' });
    console.log('Screenshot saved to scratch/screenshot.png');
  } catch (e) {
    console.error('Navigation error:', e.message);
  }

  console.log('Closing browser.');
  await browser.close();
}

run().catch(console.error);
