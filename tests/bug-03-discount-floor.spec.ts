import { expect, test } from '@playwright/test';
import { CartPage } from './pages/CartPage';

/**
 * BUG-03 — скидка обнуляет стоимость товаров вместо нижней границы 1 ₽.
 * Требование: SPEC.md, правила расчёта, «Нижняя граница» — «сумма товаров
 * после скидки не уходит в минус и не обнуляется: минимум — 1 ₽.
 * Доставка считается отдельно и прибавляется к этой единице».
 * Баг-репорт: qa/bugs/bug-03.md
 */
test('BUG-03: скидка больше корзины оставляет 1 ₽ за товары', async ({ page }) => {
  const cart = new CartPage(page);
  const PASTA = 'Паста спагетти';

  await cart.openClean();
  await cart.addToCart(PASTA, 2);

  await test.step('исходное состояние: 270 ₽ товаров и платная доставка', async () => {
    expect(await cart.amountValue('Товары')).toBe(270);
    expect(await cart.amountValue('Доставка')).toBe(400);
  });

  await test.step('код 1+1 даёт 500 ₽ скидки на корзину в 270 ₽', async () => {
    await cart.applyPromo('1+1');
    await expect(cart.promoActiveBadge).toBeVisible();
  });

  await test.step('товары не обнуляются, итог — 1 ₽ плюс доставка', async () => {
    // Скидка не может съесть больше, чем сумма товаров минус нижняя граница.
    expect(await cart.amountValue('Скидка по промокоду')).toBe(-269);
    expect(await cart.amountValue('Итого')).toBe(401);
  });
});
