import { createHash, randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { EdeSchema, activeIntervals } from "@bombillo/domain";
import { NotFoundError, TooManyReportsError } from "../http/errors";
import type { OutageRepository } from "../repositories/types";
import type { ScenarioService } from "../services/scenario-service";

type Deps = { repo: OutageRepository; scenarios: ScenarioService };

const CircuitQuery = z.object({
  provinceId: z.string().optional(),
  ede: EdeSchema.optional(),
  q: z.string().trim().min(2).max(60).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

const OutageQuery = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  ede: EdeSchema.optional(),
});

const SnapshotQuery = z.object({
  /** Instante en ISO 8601. Si se omite, se usa el inicio del escenario. */
  at: z.string().datetime({ offset: true }).optional(),
});

const ReportBody = z.object({
  circuitCode: z.string().min(3).max(20).optional(),
  location: z.tuple([z.number().min(-72.1).max(-68.2), z.number().min(17.4).max(20)]),
  status: z.enum(["off", "on"]),
  /** Identificador anónimo generado por la app en el primer arranque. */
  deviceId: z.string().uuid(),
});

/** Máximo de reportes por dispositivo en 10 minutos (primera capa anti-abuso). */
const REPORTS_PER_WINDOW = 3;

export async function v1Routes(app: FastifyInstance, { repo, scenarios }: Deps) {
  app.get("/provinces", async () => ({ items: await repo.listProvinces() }));

  app.get("/circuits", async (req) => repo.listCircuits(CircuitQuery.parse(req.query)));

  app.get<{ Params: { code: string } }>("/circuits/:code", async (req) => {
    const circuit = await repo.getCircuit(req.params.code.toUpperCase());
    if (!circuit) throw new NotFoundError("Circuito", req.params.code);
    return circuit;
  });

  app.get("/planned-outages", async (req) => ({
    items: await repo.listPlannedOutages(OutageQuery.parse(req.query)),
  }));

  app.get("/scenarios", async () => ({
    items: (await repo.listScenarios()).map(({ seed: _seed, ...s }) => s),
  }));

  app.get<{ Params: { id: string } }>("/scenarios/:id/timeline", async (req, reply) => {
    const tl = await scenarios.timeline(req.params.id);
    if (!tl) throw new NotFoundError("Escenario", req.params.id);
    // La línea de tiempo es inmutable para un escenario: se puede cachear fuerte.
    reply.header("cache-control", "public, max-age=3600");
    return tl;
  });

  app.get<{ Params: { id: string } }>("/scenarios/:id/snapshot", async (req) => {
    const { at } = SnapshotQuery.parse(req.query);
    const snap = await scenarios.snapshot(req.params.id, at ? Date.parse(at) : undefined);
    if (!snap) throw new NotFoundError("Escenario", req.params.id);
    return snap;
  });

  app.get<{ Params: { id: string; code: string } }>(
    "/scenarios/:id/circuits/:code",
    async (req) => {
      const { at } = SnapshotQuery.parse(req.query);
      const tl = await scenarios.timeline(req.params.id);
      const circuit = await repo.getCircuit(req.params.code);
      if (!tl) throw new NotFoundError("Escenario", req.params.id);
      if (!circuit) throw new NotFoundError("Circuito", req.params.code);
      const t = at ? Date.parse(at) : tl.start;
      return {
        circuit,
        active: activeIntervals(tl, t).get(circuit.code) ?? null,
        history: tl.intervals.filter((i) => i.circuitCode === circuit.code && i.start <= t),
      };
    },
  );

  app.post("/reports", async (req, reply) => {
    const body = ReportBody.parse(req.body);
    const deviceHash = createHash("sha256").update(body.deviceId).digest("hex").slice(0, 32);
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    if ((await repo.countRecentReports(deviceHash, since)) >= REPORTS_PER_WINDOW) {
      throw new TooManyReportsError();
    }
    const report = {
      id: randomUUID(),
      circuitCode: body.circuitCode ?? null,
      location: body.location,
      status: body.status,
      receivedAt: new Date().toISOString(),
      deviceHash,
    };
    await repo.saveReport(report);
    // 202: el reporte entra a la cola de consenso; no cambia el mapa por sí solo.
    return reply.status(202).send({ id: report.id, status: "queued" });
  });
}
