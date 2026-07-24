import { expect, test as base } from "@playwright/test";
import { seedDatabase } from "./seed-database";

export const test = base.extend<{ databaseSeed: void }>({
  databaseSeed: [
    async ({ browser }, use) => {
      void browser;
      seedDatabase();
      await use();
    },
    { auto: true },
  ],
});

export { expect };
