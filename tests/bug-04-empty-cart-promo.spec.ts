import { expect, test } from '@playwright/test';
import { CartPage } from './pages/CartPage';

/**
 * BUG-04 — промокод остаётся применённым на пустой корзине.
 * Требование: SPEC.md, таблица состояний, «Все товары удалены» —
 * «„Корзина пуста". Поле промокода очищается, применённая скидка снимается —
 * но код не сгорает: после нового добавления товаров его можно ввести снова».
 * Баг-репорт: qa/bugs/bug-04.md
 */
test('BUG-04: удаление всех товаров снимает применённую скидку', async ({ page }) => {
  const cart = new CartPage(page);
  const PASTA = 'Паста спагетти';

  await cart.openClean();
  await cart.addToCart(PASTA, 2);
  await cart.applyPromo('fresh_start');

  await test.step('скидка действует, пока в корзине есть товар', async () => {
    await expect(cart.promoActiveBadge).toBeVisible();
    expect(await cart.amountValue('Скидка по промокоду')).toBe(-27);
  });

  await test.step('после удаления всех товаров скидка снимается', async () => {
    await cart.removeItem(PASTA);

    await expect(cart.emptyMessage).toHaveText('Корзина пуста. Добавьте товары из каталога.');
    await expect(cart.promoActiveBadge).toBeHidden();

    const state = await cart.storedState();
    expect(state.promo).toBeNull();
  });

  await test.step('код не сгорел: его можно применить заново', async () => {
    await cart.addToCart(PASTA);
    await cart.applyPromo('fresh_start');

    await expect(cart.promoActiveBadge).toBeVisible();
    expect(await cart.amountValue('Скидка по промокоду')).toBe(-13.5);
  });
});
