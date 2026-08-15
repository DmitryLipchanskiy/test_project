import { Locator, Page, expect } from '@playwright/test';

/**
 * Page Object страницы «каталог + корзина».
 *
 * Селекторы взяты из разметки приложения: карточка каталога — .product,
 * строка корзины — .line внутри #cart-lines, блок итогов — #totals,
 * промокод — #promo-*. Приложение — зафиксированный артефакт наивного прогона
 * и не правится, поэтому data-testid здесь не добавить: работаем с тем, что есть.
 *
 * Все элементы строки корзины берутся ВНУТРИ .line нужного товара.
 * Глобальные .qty-btn.first() / .last() выглядели бы короче, но при двух
 * позициях в корзине взяли бы кнопки от разных товаров — молча и без падения.
 */
export class CartPage {
  readonly page: Page;
  readonly catalog: Locator;
  readonly cartLines: Locator;
  readonly emptyMessage: Locator;
  readonly promoInput: Locator;
  readonly promoApply: Locator;
  readonly promoMessage: Locator;
  readonly promoActiveBadge: Locator;
  readonly totals: Locator;

  constructor(page: Page) {
    this.page = page;
    this.catalog = page.locator('#catalog .product');
    this.cartLines = page.locator('#cart-lines .line');
    this.emptyMessage = page.locator('#cart-lines .cart-empty');
    this.promoInput = page.locator('#promo-input');
    this.promoApply = page.locator('#promo-apply');
    this.promoMessage = page.locator('#promo-msg');
    this.promoActiveBadge = page.locator('#promo-active-box .promo-active');
    this.totals = page.locator('#totals');
  }

  /** Открывает страницу с пустым хранилищем: каждый тест стартует с чистого состояния. */
  async openClean(): Promise<void> {
    await this.page.goto('/app/index.html');
    await this.page.evaluate(() => localStorage.clear());
    await this.page.reload();
    await expect(this.catalog.first()).toBeVisible();
  }

  /** Добавляет товар в корзину кликом по кнопке в его карточке каталога. */
  async addToCart(productName: string, times = 1): Promise<void> {
    const card = this.catalog.filter({ hasText: productName });
    for (let i = 0; i < times; i++) {
      await card.locator('.add-btn').click();
    }
  }

  // --- элементы конкретной строки корзины ---

  /** Строка корзины по названию товара. Все её элементы ищутся только внутри неё. */
  line(productName: string): Locator {
    return this.cartLines.filter({ hasText: productName });
  }

  quantityInput(productName: string): Locator {
    return this.line(productName).locator('.qty-input');
  }

  minusButton(productName: string): Locator {
    return this.line(productName).locator('.l-controls .qty-btn').first();
  }

  plusButton(productName: string): Locator {
    return this.line(productName).locator('.l-controls .qty-btn').last();
  }

  removeButton(productName: string): Locator {
    return this.line(productName).locator('.del-btn');
  }

  /** Сумма по строке товара — «135,00 ₽ / шт» относится к цене, это итог строки. */
  lineSum(productName: string): Locator {
    return this.line(productName).locator('.l-sum');
  }

  // --- действия ---

  /**
   * Задаёт количество в поле руками.
   * Значение применяется по Enter или потере фокуса — зафиксированное требование
   * SPEC.md (строка 9 списка неоднозначностей), а не случайность реализации.
   */
  async setQuantity(productName: string, value: string): Promise<void> {
    const input = this.quantityInput(productName);
    await input.fill(value);
    await input.press('Enter');
  }

  async increaseQuantity(productName: string): Promise<void> {
    await this.plusButton(productName).click();
  }

  async decreaseQuantity(productName: string): Promise<void> {
    await this.minusButton(productName).click();
  }

  async removeItem(productName: string): Promise<void> {
    await this.removeButton(productName).click();
  }

  async applyPromo(code: string): Promise<void> {
    await this.promoInput.fill(code);
    await this.promoApply.click();
  }

  async quantityValue(productName: string): Promise<string> {
    return this.quantityInput(productName).inputValue();
  }

  // --- итоги ---

  /** Строка итогов по названию: «Товары», «Доставка», «Итого», «Скидка по промокоду». */
  amount(rowLabel: string): Locator {
    return this.totals
      .locator('.row')
      .filter({ hasText: rowLabel })
      .locator('span')
      .last();
  }

  /** Сумма в рублях числом: «13 365,00 ₽» → 13365. Пробелы в разметке неразрывные. */
  async amountValue(rowLabel: string): Promise<number> {
    const raw = (await this.amount(rowLabel).innerText()).trim();
    const normalized = raw
      .replace(/[\s  ]/g, '')
      .replace('₽', '')
      .replace('−', '-')
      .replace(',', '.');
    return Number(normalized);
  }

  /** Состояние в localStorage — то, что переживёт перезагрузку. */
  async storedState(): Promise<{ cart: Record<string, number>; promo: string | null }> {
    const raw = await this.page.evaluate(() =>
      localStorage.getItem('naive-cart-state-v1'),
    );
    return raw ? JSON.parse(raw) : { cart: {}, promo: null };
  }
}
