# Отчёт: проверка запуска по README на чистой машине

**Репозиторий:** `https://github.com/DmitryLipchanskiy/test_project.git` (приватный)
**Коммит:** `53b9878` «README: кликабельные ссылки на артефакты», ветка `main`
**Дата проверки:** 2026-08-15
**`git status` после всех шагов:** чисто, рабочее дерево не изменено

---

## Вердикт

**Содержательная часть работы воспроизводится полностью.** Прогон тестов дал ровно
обещанные README `1 passed, 3 failed`, зелёным оказался именно `bug-03`, приложение
открылось в описанном виде. Спека, тесты и баг-репорты на чистой машине подтверждаются.

**Условие «поднимается на чистой машине» на Windows формально не выполнено.**
Шаг 3 README не работает: команды `python3` в Windows не существует. Без ручной
подмены на `python` стенд не стартует, а вместе с ним не стартует и автозапуск
сервера в `playwright.config.ts`.

Все найденные проблемы — про переносимость инструкции, ни одна не задевает качество
самой QA-работы.

---

## Стенд

Исходное состояние машины — действительно чистое:

| Параметр | Значение |
|---|---|
| ОС | Windows 11 Pro 10.0.26200 |
| Оболочка | PowerShell 5.1.26100.9168 |
| Было установлено | только `git 2.55.0.windows.4` |
| Отсутствовало | `node`, `npm`, `python`, `docker`, `gh` |

Доставлено в ходе проверки (через `winget`):

| Пакет | Версия | Команда |
|---|---|---|
| Node.js LTS | 24.19.0 | `winget install --id OpenJS.NodeJS.LTS -e` |
| npm | 11.17.0 | в составе Node.js |
| Python | 3.13.15 | `winget install --id Python.Python.3.13 -e` |
| @playwright/test | 1.62.1 | `npm install` |
| Chromium | 151.0.7922.34 | `npx playwright install chromium` |

---

## Пошаговый результат

| Шаг README | Команда | Итог |
|---|---|---|
| Пререквизиты | Node.js 18+, Python 3 | названы, способ установки не описан |
| 1 | `npm install` | ✅ 3 пакета, 0 уязвимостей, ~8 с |
| 2 | `npx playwright install chromium` | ✅ exit 0 |
| 3 | `python3 -m http.server 8765` | ❌ **exit 9009**, команды нет |
| 3′ | `python -m http.server 8765` | ✅ `HTTP/1.0 200 OK` |
| 4 | открыть `http://localhost:8765/app/index.html` | ✅ 8 товаров, «Корзина пуста. Добавьте товары из каталога.», итог 0,00 ₽ |
| 5 | `npx playwright test` | ✅ **`1 passed, 3 failed`** |

---

## Вывод прогона тестов

```
Running 4 tests using 4 workers

  ok 1 tests\bug-03-discount-floor.spec.ts:11:5 › BUG-03: скидка больше корзины оставляет 1 ₽ за товары (745ms)
  x  2 tests\bug-01-quantity-cap.spec.ts:10:5 › BUG-01: количество не поднимается выше 99 (688ms)
  x  4 tests\bug-02-promo-exact-match.spec.ts:10:5 › BUG-02: промокод сравнивается точно, без trim и приведения регистра (5.7s)
  x  3 tests\bug-04-empty-cart-promo.spec.ts:11:5 › BUG-04: удаление всех товаров снимает применённую скидку (5.8s)

  3 failed
  1 passed (8.3s)
```

Характер падений совпадает с баг-репортами:

- **BUG-01** — `expect(received).toBe(expected)`, ожидалось `"99"`, получено `"100"`
- **BUG-02** — `locator('#promo-active-box .promo-active')` ожидался `hidden`, получен `visible`
- **BUG-04** — тот же локатор, тот же `visible` вместо `hidden`

---

## Найденные проблемы

### П-1. `python3` не существует на Windows — блокирующая

Вызов попадает в заглушку Microsoft Store и завершается кодом `9009`:

```
python3 : Python was not found; run without arguments to install from the Microsoft Store,
or disable this shortcut from Settings > Apps > Advanced app settings > App execution aliases.
EXITCODE=9009
```

Работают `python` и `py`, обе дают `Python 3.13.15`.

**Два места, не одно:**

| Файл | Строка | Контекст |
|---|---|---|
| `README.md` | 41 | шаг 3, «Поднять стенд» |
| `playwright.config.ts` | 17 | `webServer.command` |

Второе проверено отдельно: стенд был погашен, затем запущен `npx playwright test
tests/bug-03-discount-floor.spec.ts`, чтобы сработал автозапуск сервера. Результат:

```
[WebServer] Python was not found; run without arguments to install from the Microsoft Store
Error: Process from config.webServer was not able to start. Exit code: 9009
```

**Следствие.** Обещание шага 5 — «стенд из шага 3 может остаться запущенным,
конфигурация переиспользует его» — на Windows работает только в одну сторону.
`reuseExistingServer: true` действительно подхватывает уже поднятый стенд, но сам
поднять его не может. Единственный рабочий путь на Windows: сначала вручную
запустить сервер через `python`, потом прогонять тесты.

### П-2. `lsof` не существует на Windows — среднее

`README.md:46` при занятом порте советует:

```bash
lsof -nP -iTCP:8765 -sTCP:LISTEN
```

Windows-эквивалент:

```powershell
Get-NetTCPConnection -LocalPort 8765 -State Listen | Select-Object OwningProcess
```

### П-3. `curl -sI` в PowerShell делает не то — среднее

`AGENTS.md`, раздел «Как запускать и проверять», проверяет стенд через
`curl -sI http://localhost:8765/app/index.html | head -1`.

В PowerShell 5.1 `curl` — это алиас `Invoke-WebRequest`, который не понимает
ни `-sI`, ни `head`. Нужен явный `curl.exe` (в Windows 10+ он есть):

```powershell
curl.exe -sI http://localhost:8765/app/index.html | Select-Object -First 1
# HTTP/1.0 200 OK
```

Коварство в том, что это не падает громко — легко принять ошибку алиаса за
недоступный стенд и уйти чинить не то.

### П-4. Установка рантаймов не описана — низкое

README называет «Node.js 18+ и Python 3», но не говорит, откуда их взять. Для
условия «чистая машина» это пробел, хотя сам факт явно названных пререквизитов
уже лучше среднего по больнице.

### П-5. Нет шага `git clone`, репозиторий приватный — низкое

README начинается сразу с `npm install`. Проверяющий с чистой машины упрётся
в клонирование раньше всех остальных шагов, а `git clone` без авторизации даёт
`404` — у аккаунта нет ни одного публичного репозитория.

---

## Рабочая последовательность для Windows

Проверена целиком, приводит к `1 passed, 3 failed`:

```powershell
winget install --id OpenJS.NodeJS.LTS -e --source winget
winget install --id Python.Python.3.13 -e --source winget
# перезапустить терминал, чтобы подхватился PATH

git clone https://github.com/DmitryLipchanskiy/test_project.git
cd test_project

npm install
npx playwright install chromium

# в отдельном окне терминала, из корня репозитория:
python -m http.server 8765

# обратно в первом окне:
npx playwright test
```

---

## Предлагаемые правки

Не внесены — файлы не менялись, коммитов нет.

**1. `playwright.config.ts:17`** — делает конфиг переносимым:

```ts
// было
command: 'python3 -m http.server 8765',

// стало
command: `${process.platform === 'win32' ? 'python' : 'python3'} -m http.server 8765`,
```

**2. `README.md`** — короткий блок про Windows после шага 3: команда `python`
вместо `python3`, `Get-NetTCPConnection` вместо `lsof`.

**3. `AGENTS.md`** — в разделе «Как запускать и проверять» оговорить `curl.exe`
для PowerShell.

Правки затрагивают конфиг тестов и документацию, но не `app/` — запрет
на изменение артефакта наивного прогона не нарушается. Тем не менее
`playwright.config.ts` относится к зафиксированной обвязке, так что менять
его стоит осознанно и отдельным коммитом.

---

## Границы проверки

Что в эту проверку **не входило** — чтобы следующая сессия не приняла
непроверенное за проверенное:

- **Только Windows.** На macOS и Linux README, судя по всему, работает как
  написано; там `python3` — правильная команда. Проблемы П-1…П-3 существуют
  ровно на Windows.
- **Содержание QA-артефактов не аудировалось.** Читались `README.md`,
  `AGENTS.md`, `CLAUDE.md`, `package.json`, `playwright.config.ts`.
  `SPEC.md`, `qa/test-plan.md`, баг-репорты, `qa/discrepancies.md`
  и журнал `sessions/` не проверялись на согласованность — проверялась
  только воспроизводимость запуска.
- **Совпадение результата проверено по строке итога и по характеру падений**,
  а не сверкой с `qa/evidence/playwright-run-02-after-fix.txt` построчно.
- **Файлы не изменялись, ничего не коммитилось и не пушилось.**
- **Утверждения README об истории коммитов** (порядок `4da25d3` до `882ddef`,
  содержимое `git show 4da25d3:SPEC.md`) не перепроверялись.
