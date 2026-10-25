/**
 * Crea en GitHub las etiquetas, milestones e issues del backlog, y genera docs/roadmap.md.
 * Fuente única: scripts/github/backlog.json.
 *
 *   pnpm roadmap:docs                 # solo regenera docs/roadmap.md
 *   pnpm github:bootstrap --dry-run   # muestra lo que haría
 *   pnpm github:bootstrap             # lo crea (requiere `gh auth login` y estar en el repo)
 *
 * Es idempotente: no duplica etiquetas, milestones ni issues ya existentes (compara por título).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const BacklogSchema = z.object({
  labels: z.array(z.object({ name: z.string(), color: z.string(), description: z.string() })),
  milestones: z.array(z.object({ key: z.string(), title: z.string(), description: z.string() })),
  issues: z.array(
    z.object({
      key: z.string(),
      milestone: z.string(),
      title: z.string(),
      labels: z.array(z.string()),
      body: z.string(),
    }),
  ),
});
type Backlog = z.infer<typeof BacklogSchema>;

const backlog: Backlog = BacklogSchema.parse(
  JSON.parse(readFileSync(join(root, "scripts/github/backlog.json"), "utf8")),
);

// Validaciones de consistencia del backlog.
const labelNames = new Set(backlog.labels.map((l) => l.name));
const milestoneKeys = new Set(backlog.milestones.map((m) => m.key));
for (const issue of backlog.issues) {
  if (!milestoneKeys.has(issue.milestone)) throw new Error(`${issue.key}: milestone desconocido`);
  for (const l of issue.labels)
    if (!labelNames.has(l)) throw new Error(`${issue.key}: etiqueta ${l}`);
}

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

function writeRoadmap() {
  const lines = [
    "# Roadmap",
    "",
    "> Generado desde `scripts/github/backlog.json` con `pnpm roadmap:docs`. No editar a mano.",
    "",
    "| Milestone | Objetivo | Issues |",
    "|---|---|---|",
    ...backlog.milestones.map(
      (m) =>
        `| ${m.title} | ${m.description} | ${backlog.issues.filter((i) => i.milestone === m.key).length} |`,
    ),
    "",
  ];
  for (const m of backlog.milestones) {
    lines.push(`## ${m.title}`, "", m.description, "");
    for (const i of backlog.issues.filter((x) => x.milestone === m.key)) {
      const prio = i.labels.find((l) => l.startsWith("prioridad:"))?.split(":")[1] ?? "";
      const area = i.labels.find((l) => l.startsWith("area:"))?.split(":")[1] ?? "";
      lines.push(`- **${i.key}** ${i.title} · _${area}_ · ${prio}`);
    }
    lines.push("");
  }
  writeFileSync(join(root, "docs/roadmap.md"), lines.join("\n"));
  console.info(
    `docs/roadmap.md: ${backlog.issues.length} issues en ${backlog.milestones.length} milestones`,
  );
}

function gh(argv: string[]): string {
  if (dryRun) {
    console.info(
      `[dry-run] gh ${argv.map((a) => (a.includes(" ") ? JSON.stringify(a) : a)).join(" ")}`,
    );
    return "[]";
  }
  return execFileSync("gh", argv, { encoding: "utf8" });
}

function bootstrap() {
  if (!dryRun) execFileSync("gh", ["auth", "status"], { stdio: "inherit" });

  const existingLabels = new Set(
    (
      JSON.parse(gh(["label", "list", "--limit", "200", "--json", "name"])) as Array<{
        name: string;
      }>
    ).map((l) => l.name),
  );
  for (const l of backlog.labels) {
    if (existingLabels.has(l.name)) continue;
    gh(["label", "create", l.name, "--color", l.color, "--description", l.description]);
  }

  const existingMilestones = new Set(
    (
      JSON.parse(gh(["api", "repos/{owner}/{repo}/milestones?state=all&per_page=100"])) as Array<{
        title: string;
      }>
    ).map((m) => m.title),
  );
  for (const m of backlog.milestones) {
    if (existingMilestones.has(m.title)) continue;
    gh([
      "api",
      "repos/{owner}/{repo}/milestones",
      "-f",
      `title=${m.title}`,
      "-f",
      `description=${m.description}`,
    ]);
  }

  const existingIssues = new Set(
    (
      JSON.parse(
        gh(["issue", "list", "--state", "all", "--limit", "500", "--json", "title"]),
      ) as Array<{
        title: string;
      }>
    ).map((i) => i.title),
  );
  const milestoneTitle = new Map(backlog.milestones.map((m) => [m.key, m.title]));
  for (const i of backlog.issues) {
    const title = `[${i.key}] ${i.title}`;
    if (existingIssues.has(title)) continue;
    gh([
      "issue",
      "create",
      "--title",
      title,
      "--body",
      i.body,
      "--milestone",
      milestoneTitle.get(i.milestone)!,
      ...i.labels.flatMap((l) => ["--label", l]),
    ]);
  }
  console.info(dryRun ? "Dry-run terminado." : "Backlog creado en GitHub.");
}

writeRoadmap();
if (!args.has("--docs-only")) bootstrap();
