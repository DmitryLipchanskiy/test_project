import { expect, test } from '@playwright/test';
import { CartPage } from './pages/CartPage';

/**
 * BUG-01 — потолок количества 999 вместо 99.
 * Требование: SPEC.md, сценарий 4 — «верхний потолок 99 штук: кнопка „+" на 99
 * больше не увеличивает количество, ручной ввод 100 и выше обрезается до 99».
 * Баг-репорт: qa/bugs/bug-01.md
 */
test('BUG-01: количество не поднимается выше 99', async ({ page }) => {
  const cart = new CartPage(page);
  const PASTA = 'Паста спагетти';

  await cart.openClean();
  await cart.addToCart(PASTA);

  await test.step('99 — допустимое значение', async () => {
    await cart.setQuantity(PASTA, '99');
    expect(await cart.quantityValue(PASTA)).toBe('99');
    expect(await cart.amountValue('Товары')).toBe(13365);
  });

  await test.step('«+» на потолке не увеличивает количество', async () => {
    await cart.increaseQuantity(PASTA);
    expect(await cart.quantityValue(PASTA)).toBe('99');
  });

  await test.step('ручной ввод выше потолка обрезается до 99', async () => {
    await cart.setQuantity(PASTA, '100');
    expect(await cart.quantityValue(PASTA)).toBe('99');

    await cart.setQuantity(PASTA, '100000');
    expect(await cart.quantityValue(PASTA)).toBe('99');

    const state = await cart.storedState();
    expect(state.cart['pasta']).toBe(99);
  });
});
