import { defineConfig } from '@playwright/test';

/**
 * Стенд и адрес зафиксированы правилами проекта (AGENTS.md):
 * порт 8765, страница http://localhost:8765/app/index.html.
 * Менять их нельзя — тест-план и README ссылаются на конкретный адрес.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8765',
    trace: 'retain-on-failure',
  },
  webServer: {
    // На Windows команды python3 не существует: вызов уходит в заглушку
    // Microsoft Store и падает с exit 9009, а вместе с ним падает весь прогон.
    // Проверено на чистой Windows 11 — qa/evidence/clean-machine-report.md.
    command: `${process.platform === 'win32' ? 'python' : 'python3'} -m http.server 8765`,
    url: 'http://localhost:8765/app/index.html',
    cwd: '.',
    reuseExistingServer: true,
    timeout: 10_000,
  },
});
