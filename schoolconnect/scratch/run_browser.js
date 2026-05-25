import puppeteer from 'puppeteer';

async function run() {
  console.log('Launching automated visible browser window...');
  
  // Launch in headful mode
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null, // Full size viewport
    args: [
      '--start-maximized',
      '--window-size=1200,800'
    ]
  });

  const page = await browser.newPage();
  
  // Navigate to local dev server
  console.log('Navigating to SchoolConnect login page...');
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle2' });

  console.log('Logging in as Admin demo user...');
  
  // Wait for the login form elements
  await page.waitForSelector('input[type="email"]');
  
  // Visual typing simulation
  await page.type('input[type="email"]', 'admin@stxaviers.edu.in', { delay: 100 });
  await page.type('input[type="password"]', 'Admin@1234', { delay: 100 });
  
  // Wait and click sign in button
  const submitButton = await page.waitForSelector('button[type="submit"]');
  await submitButton.click();
  
  console.log('Login successful! You can now use this window parallelly.');
  
  // Keep the browser open
  await new Promise(resolve => {
    browser.on('disconnected', resolve);
  });
  console.log('Browser window closed.');
}

run().catch(console.error);
