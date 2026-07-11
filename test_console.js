const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    await page.goto('file:///' + __dirname.replace(/\\/g, '/') + '/index.html');
    await page.waitForTimeout(2000);
    await browser.close();
})();
