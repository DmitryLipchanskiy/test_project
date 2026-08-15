import { expect, test } from '@playwright/test';
import { CartPage } from './pages/CartPage';

/**
 * BUG-02 — промокод применяется в любом регистре и с пробелами по краям.
 * Требование: SPEC.md, правила расчёта, шаг 3 — «коды сравниваются точно:
 * регистр значим, пробелы по краям не отбрасываются».
 * Баг-репорт: qa/bugs/bug-02.md
 */
test('BUG-02: промокод сравнивается точно, без trim и приведения регистра', async ({ page }) => {
  const cart = new CartPage(page);
  const TEA = 'Зелёный чай';

  await cart.openClean();
  await cart.addToCart(TEA);

  const invalidCodes = ['FRESH_START', 'Fresh_Start', '  fresh_start  '];

  for (const code of invalidCodes) {
    await test.step(`код ${JSON.stringify(code)} не должен применяться`, async () => {
      await cart.applyPromo(code);

      // Скидки нет, итог равен товарам плюс доставка.
      await expect(cart.promoActiveBadge).toBeHidden();
      expect(await cart.amountValue('Итого')).toBe(940.5);

      const state = await cart.storedState();
      expect(state.promo).toBeNull();
    });
  }

  await test.step('точное написание кода работает', async () => {
    await cart.applyPromo('fresh_start');
    await expect(cart.promoActiveBadge).toBeVisible();
    expect(await cart.amountValue('Итого')).toBe(886.45);
  });
});
