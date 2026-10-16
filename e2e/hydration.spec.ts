import { expect, test } from "playwright/test";

test("le tableau de bord s'hydrate sans écart serveur / client", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (/hydration|did not match|script tag/i.test(text)) problems.push(text);
  });
  page.on("pageerror", (error) => {
    if (/hydration|did not match|script tag/i.test(error.message)) problems.push(error.message);
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /entreprises à fort potentiel/i })).toBeVisible();
  expect(problems).toEqual([]);
});

test("le thème sombre enregistré n'écarte pas l'hydratation", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (/hydration|did not match|script tag/i.test(text)) problems.push(text);
  });
  page.on("pageerror", (error) => {
    if (/hydration|did not match|script tag/i.test(error.message)) problems.push(error.message);
  });
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(problems).toEqual([]);
});

test("le tableau des tâches s'hydrate sans écart serveur / client", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (/hydration|did not match|didn't match|script tag/i.test(text)) problems.push(text);
  });
  page.on("pageerror", (error) => {
    if (/hydration|did not match|didn't match|script tag/i.test(error.message)) problems.push(error.message);
  });
  await page.goto("/taches");
  await expect(page.getByRole("heading", { name: "À faire" })).toBeVisible();
  expect(problems).toEqual([]);
});
