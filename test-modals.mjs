import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('🚀 Opening app at http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  
  // Take screenshot of initial state
  await page.screenshot({ path: 'tmp/01-initial.png', fullPage: false });
  console.log('📸 Screenshot saved: tmp/01-initial.png');
  
  // Check if login page loaded
  const title = await page.title();
  console.log('Page title:', title);
  
  // Try to login if needed
  const hasLoginForm = await page.locator('input[type="text"], input[type="email"]').count();
  if (hasLoginForm > 0) {
    console.log('🔐 Found login form, attempting login...');
    await page.fill('input[type="text"], input[type="email"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tmp/02-after-login.png', fullPage: true });
    console.log('📸 Screenshot saved: tmp/02-after-login.png');
  }
  
  // Look for roles and groups links/buttons
  const rolesLink = page.locator('text=角色权限').first();
  const groupsLink = page.locator('text=小组管理').first();
  
  if (await rolesLink.isVisible()) {
    console.log('👤 Found Roles link, clicking...');
    await rolesLink.click();
    await page.waitForTimeout(1000);
    
    // Look for add role button
    const addBtn = page.locator('text=新增角色').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'tmp/03-add-role-modal.png', fullPage: false });
      console.log('📸 Screenshot saved: tmp/03-add-role-modal.png (checking animation)');
    }
  }
  
  if (await groupsLink.isVisible()) {
    console.log('👥 Found Groups link, clicking...');
    await groupsLink.click();
    await page.waitForTimeout(1000);
    
    // Look for random group button
    const randomBtn = page.locator('text=随机分组').first();
    if (await randomBtn.isVisible()) {
      await randomBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'tmp/04-random-group-modal.png', fullPage: false });
      console.log('📸 Screenshot saved: tmp/04-random-group-modal.png (checking animation)');
    }
  }
  
  console.log('✅ Test complete!');
  await browser.close();
})();
