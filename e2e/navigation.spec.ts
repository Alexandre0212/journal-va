import { PrismaClient } from "@prisma/client";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "playwright/test";

test.afterAll(async () => {
  const prisma = new PrismaClient();
  try {
    const tasks = await prisma.task.findMany({
      where: { title: { startsWith: "Contrôle technique" } },
      select: { id: true },
    });
    const ids = tasks.map((task) => task.id);
    if (!ids.length) return;
    await prisma.taskHistory.deleteMany({ where: { taskId: { in: ids } } });
    await prisma.activityLog.deleteMany({ where: { entity: "task", entityId: { in: ids } } });
    await prisma.task.deleteMany({ where: { id: { in: ids } } });
  } finally {
    await prisma.$disconnect();
  }
});

test("le tableau de bord s'ouvre avec les trois projets", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /entreprises à fort potentiel/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "SAFYA", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "TRIAGE+", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "RacTac", exact: true })).toBeVisible();
  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((item) => item.impact === "critical")).toEqual([]);
});

test("une tâche créée part en corbeille puis revient", async ({ page }) => {
  const title = `Contrôle technique ${Date.now().toString(36)}`;
  await page.goto("/taches");
  await page.getByRole("button", { name: "Nouvelle tâche" }).click();
  await page.getByRole("textbox", { name: "Tâche", exact: true }).fill(title);
  await page.getByRole("button", { name: "Ajouter la tâche" }).click();
  await expect(page.getByText("Enregistré")).toBeVisible();
  const card = page.getByRole("button", { name: title, exact: true });
  await expect(card).toBeVisible();
  await page.getByRole("button", { name: `Actions pour ${title}` }).click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await page.getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByText("Tâche envoyée dans la corbeille")).toBeVisible();
  await expect(card).toHaveCount(0);
  await page.goto("/corbeille");
  const trashed = page.locator("li").filter({ hasText: title });
  await expect(trashed.getByText(title)).toBeVisible();
  await trashed.getByRole("button", { name: "Restaurer" }).click();
  await expect(page.getByText("Enregistré")).toBeVisible();
  await page.goto("/taches");
  const restored = page.getByRole("button", { name: title, exact: true });
  await expect(restored).toBeVisible();
  await page.getByRole("button", { name: `Actions pour ${title}` }).click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await page.getByRole("button", { name: "Confirmer" }).click();
  await expect(restored).toHaveCount(0);
});
