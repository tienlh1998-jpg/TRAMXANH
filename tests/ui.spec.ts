import { test, expect } from '@playwright/test';

test('Mobile public page, setup login, and protected routes', async ({ page }) => {
 await page.setViewportSize({ width: 390, height: 844 });
 const errors: string[] = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.goto('/');
 await expect(page).toHaveTitle(/EcoPoint/);
 await expect(page.getByRole('heading', { name: 'Chào bạn!' })).toBeVisible();
 await expect(page.getByRole('navigation')).toBeVisible();
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
 await page.screenshot({ path: 'test-results/ecopoint-mobile.png', fullPage: true });
 await page.getByRole('link', { name: 'Quét trạm', exact: true }).last().click();
 await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
 if(await page.getByRole('status').count()) await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeDisabled();
 await page.screenshot({ path: 'test-results/ecopoint-login.png', fullPage: true });
 for (const url of ['/hoc-sinh', '/quan-tri', '/tram', '/giao-vien', '/hoc-sinh/qr', '/hoc-sinh/qua', '/hoc-sinh/phieu-qua', '/hoc-sinh/xep-hang', '/hoc-sinh/thanh-qua', '/quan-tri/phieu-qua']) {
  await page.goto(url);
  await expect(page).toHaveURL(/\/dang-nhap(?:\?status=setup)?$/);
 }
 for(const section of ['hoc-sinh','vat-lieu','tram','qua','phan-cong','bao-cao','giao-dich','nhat-ky','cau-hinh']){
  await page.goto(`/quan-tri/${section}`);
  await expect(page).toHaveURL(/\/dang-nhap(?:\?status=setup)?$/);
 }
 expect(errors).toEqual([]);
});
test('Desktop keeps the Stitch app frame', async ({ page }) => {
 await page.setViewportSize({ width: 1440, height: 1000 });
 await page.goto('/');
 await expect(page.getByRole('heading', { name: 'Chào bạn!' })).toBeVisible();
 await expect(page.locator('.app-shell')).toHaveCount(1);
 const box = await page.locator('.app-shell').boundingBox();
 expect(box?.width).toBe(448);
 await page.screenshot({ path: 'test-results/ecopoint-desktop.png', fullPage: true });
});

test('Login password visibility, student registration and recovery navigation',async({page})=>{
 await page.goto('/dang-nhap');await page.locator('#password').fill('Test-password-123');
 await page.getByRole('button',{name:'Hiện mật khẩu',exact:true}).click();await expect(page.locator('#password')).toHaveAttribute('type','text');await expect(page.locator('#password')).toHaveValue('Test-password-123');
 await page.getByRole('button',{name:'Ẩn mật khẩu',exact:true}).click();await expect(page.locator('#password')).toHaveAttribute('type','password');
 await page.getByRole('link',{name:'Đăng ký học sinh',exact:true}).click();await expect(page.getByRole('heading',{name:'Đăng ký EcoPoint'})).toBeVisible();await expect(page.locator('#confirm-password')).toHaveAttribute('type','password');
 await page.getByRole('link',{name:'Đã có tài khoản? Đăng nhập'}).click();await page.getByRole('link',{name:'Quên mật khẩu?',exact:true}).click();await expect(page.getByRole('button',{name:'Gửi liên kết đặt lại'})).toBeVisible();
});

test('Registration preserves entered details after a server validation failure',async({page})=>{
 await page.goto('/dang-ky');await page.locator('#full-name').fill('Học sinh thử');await page.locator('#email').fill('student@example.invalid');await page.locator('#password').fill('Password-123');await page.locator('#confirm-password').fill('Different-123');await page.getByRole('button',{name:'Đăng ký học sinh',exact:true}).click();await expect(page.locator('.login-form [role=alert]')).toContainText('hai mật khẩu giống nhau');await expect(page.locator('#full-name')).toHaveValue('Học sinh thử');await expect(page.locator('#email')).toHaveValue('student@example.invalid');await expect(page.locator('#password')).toHaveValue('Password-123');
});

test('Small phone, centered QR, offline notice and response headers',async({page,context})=>{
 await page.setViewportSize({width:320,height:740});
 const response=await page.goto('/');
 await expect(page.getByRole('heading',{name:'Chào bạn!'})).toBeVisible();
 const qr=await page.locator('.qr-nav').boundingBox();
 expect(Math.abs((qr!.x+qr!.width/2)-160)).toBeLessThan(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(response?.headers()['x-content-type-options']).toBe('nosniff');
 expect(response?.headers()['x-frame-options']).toBe('DENY');
 await context.setOffline(true);
 await expect(page.locator('.connection-status[role=alert]')).toContainText('Đang mất kết nối');
 await context.setOffline(false);
 await expect(page.getByText('Đang mất kết nối.',{exact:false})).toHaveCount(0);
});


