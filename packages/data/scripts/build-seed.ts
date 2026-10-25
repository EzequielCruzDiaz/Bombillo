/**
 * Genera la semilla de la demo a partir de las fuentes crudas.
 *
 *   pnpm --filter @bombillo/data build
 *
 * Entradas (raw/):  Excel de Edenorte, PDF→JSON de Edeeste, HTML transcrito de
 * Edesur, notas de prensa, límites provinciales y definición de escenarios.
 * Salida (generated/): dataset.json validado con Zod y provincias simplificadas.
 *
 * Regla: todo dato inventado se marca como provenance = "simulated".
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import {
  DatasetSchema,
  hashString,
  noise,
  type Circuit,
  type CircuitClass,
  type Dataset,
  type Ede,
  type LngLat,
  type PlannedOutage,
  type Province,
  type SourceRef,
} from "@bombillo/domain";
import { contains, interiorPoint, type Geometry } from "./geo";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = (f: string) => join(root, "raw", f);
const readJson = <T>(f: string): T => JSON.parse(readFileSync(raw(f), "utf8")) as T;

export const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/* ---------------------------- Provincias ---------------------------- */

const PROVINCE_EDE: Record<string, Province["ede"]> = {
  ...Object.fromEntries(
    "dajabon duarte espaillat hermanas-mirabal la-vega maria-trinidad-sanchez monsenor-nouel monte-cristi puerto-plata samana santiago santiago-rodriguez sanchez-ramirez valverde"
      .split(" ")
      .map((p) => [p, "edenorte" as const]),
  ),
  ...Object.fromEntries(
    "azua baoruco barahona elias-pina independencia pedernales peravia san-cristobal san-juan san-jose-de-ocoa"
      .split(" ")
      .map((p) => [p, "edesur" as const]),
  ),
  ...Object.fromEntries(
    "el-seibo hato-mayor la-altagracia la-romana monte-plata san-pedro-de-macoris"
      .split(" ")
      .map((p) => [p, "edeeste" as const]),
  ),
  "distrito-nacional": "shared",
  "santo-domingo": "shared",
};

const SMALL_WORDS = new Set(["de", "del", "la", "las", "los", "el", "y"]);
const titleCase = (s: string) =>
  s
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

type GeoFeature = { properties: { province_name: string }; geometry: Geometry };
const geo = readJson<{ features: GeoFeature[] }>("provinces.simplified.geojson");

const geometries = new Map<string, Geometry>();
const provinces: Province[] = geo.features.map((f) => {
  const id = slug(f.properties.province_name);
  const ede = PROVINCE_EDE[id];
  if (!ede) throw new Error(`Provincia sin EDE asignada: ${id}`);
  geometries.set(id, f.geometry);
  return {
    id,
    name: titleCase(f.properties.province_name),
    ede,
    center: interiorPoint(f.geometry),
  };
});
const provinceIds = new Set(provinces.map((p) => p.id));

/* ---------------------------- Utilidades ---------------------------- */

const municipalities = readJson<Record<string, Record<string, LngLat>>>("municipalities.json");

function locate(provinceId: string, municipality: string, key: string): LngLat {
  const geom = geometries.get(provinceId);
  if (!geom) throw new Error(`Provincia desconocida: ${provinceId}`);
  const base =
    municipalities[provinceId]?.[municipality] ??
    provinces.find((p) => p.id === provinceId)!.center;
  for (let attempt = 0; attempt < 12; attempt++) {
    const r = 0.012 + noise(key, attempt, "r") * 0.035;
    const a = noise(key, attempt, "a") * Math.PI * 2;
    const p: LngLat = [
      round(base[0] + Math.cos(a) * r * (attempt < 8 ? 1 : 0.3)),
      round(base[1] + Math.sin(a) * r * 0.85 * (attempt < 8 ? 1 : 0.3)),
    ];
    if (contains(geom, p)) return p;
  }
  const center = provinces.find((p) => p.id === provinceId)!.center;
  return center;
}

const round = (n: number) => Math.round(n * 10000) / 10000;

/** Distribución de clientes por clase (El Día, datos CDEEE): A 38 %, B 7 %, C 19 %, D 36 %. */
function simulatedClass(code: string): CircuitClass {
  const r = noise("class", code);
  if (r < 0.38) return "A";
  if (r < 0.45) return "B";
  if (r < 0.64) return "C";
  return "D";
}

const simulatedClients = (key: string, min: number, max: number) =>
  Math.round((min + noise("clients", key) * (max - min)) / 10) * 10;

const ABBREVIATIONS =
  /(?<!\b(?:Urb|Bo|Bro|Res|Resid|Aut|Carr|Ens|Av|Prol|Sto|Sta|Dr|Km|Mons|Sr|C|Ave))\.\s+/;
function splitZones(text: string): string[] {
  return text
    .split(/,\s*/)
    .flatMap((part) => part.split(ABBREVIATIONS))
    .map((z) => z.trim().replace(/\.$/, ""))
    .filter((z) => z.length > 1);
}

/** "PODA PREVENTIVO" → "Poda preventivo"; conserva siglas conocidas. */
const ACRONYMS = new Set(["itc", "mt", "bt", "eted"]);
const sentenceCase = (s: string) => {
  const words = s
    .toLowerCase()
    .split(/(\W+)/)
    .map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w));
  const text = words.join("");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const circuits = new Map<string, Circuit>();
const outages: PlannedOutage[] = [];

function addCircuit(c: Omit<Circuit, "class" | "location" | "locationApproximate">) {
  const existing = circuits.get(c.code);
  if (existing) {
    existing.zones = [...new Set([...existing.zones, ...c.zones])];
    existing.clients = Math.max(existing.clients, c.clients);
    return existing;
  }
  if (!provinceIds.has(c.provinceId))
    throw new Error(`Provincia inválida ${c.provinceId} en ${c.code}`);
  const circuit: Circuit = {
    ...c,
    class: simulatedClass(c.code),
    location: locate(c.provinceId, c.municipality, c.code),
    locationApproximate: true,
  };
  circuits.set(c.code, circuit);
  return circuit;
}

/* ----------------------------- Edenorte ----------------------------- */

const EDENORTE_SOURCE: SourceRef = {
  label: "Edenorte · Mantenimientos programados del 19 al 23 de octubre 2026",
  url: "https://edenorte.com.do/mantenimientos-programados-del-19-al-23-de-octubre-2026/",
  date: "2026-10-16",
};

async function loadEdenorte() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(raw("edenorte-mantenimientos-2026-10-19_23.xlsx"));
  const ws = wb.getWorksheet("Publicacion Externa");
  if (!ws) throw new Error("No se encontró la hoja 'Publicacion Externa'");

  // Los encabezados vienen debajo de un título con celdas combinadas: se busca
  // la fila que contiene "Circuito" y las columnas se ubican por nombre.
  let headerRow = 0;
  ws.eachRow((row, n) => {
    if (
      !headerRow &&
      (row.values as unknown[]).some((v) => String(v ?? "").trim() === "Circuito")
    ) {
      headerRow = n;
    }
  });
  if (!headerRow) throw new Error("No se encontró la fila de encabezados");
  const header = ws.getRow(headerRow).values as unknown[];
  const col = (name: string) => {
    const i = header.findIndex((v) => String(v ?? "").trim() === name);
    if (i < 0) throw new Error(`Columna '${name}' no encontrada`);
    return i;
  };
  const C = {
    province: col("Provincia"),
    municipality: col("Municipio"),
    scope: col("Alcance"),
    equipment: col("Equipo"),
    circuit: col("Circuito"),
    date: col("Fecha"),
    period: col("Periodo"),
    zones: col("Zonas Afectadas"),
    cause: col("Causa"),
    clients: col("Clientes"),
  };

  let rows = 0;
  ws.eachRow((row, n) => {
    if (n <= headerRow) return;
    const v = (i: number) => {
      const cell = row.getCell(i).value;
      return cell instanceof Date ? cell : String(cell ?? "").trim();
    };
    const code = v(C.circuit) as string;
    if (!code) return;
    rows++;
    const provinceId = slug(v(C.province) as string);
    const municipality = v(C.municipality) as string;
    const [d, m, y] = (v(C.date) as string).split("-");
    const date = `${y}-${m}-${d}`;
    const start = hhmm(row.getCell(C.period).value);
    const end = hhmm(row.getCell(C.period + 2).value);
    const clients = Number(v(C.clients)) || 0;
    const scope = v(C.scope) as string;
    const pct = /([\d.]+)%/.exec(scope);
    const total = pct ? clients / (Number(pct[1]) / 100) : clients;
    const zones = splitZones(v(C.zones) as string);
    const equipment = v(C.equipment) as string;

    addCircuit({
      code,
      ede: "edenorte",
      name: code,
      provinceId,
      municipality,
      clients: Math.max(300, Math.min(18000, Math.round(total / 10) * 10)),
      zones,
      provenance: "official",
      source: EDENORTE_SOURCE,
    });
    outages.push({
      id: `edn-${code}-${date}-${start.replace(":", "")}-${equipment}`,
      circuitCode: code,
      ede: "edenorte",
      start: `${date}T${start}:00-04:00`,
      end: `${date}T${end}:00-04:00`,
      cause: sentenceCase(v(C.cause) as string),
      clientsAffected: clients,
      zones,
      provenance: "official",
      source: EDENORTE_SOURCE,
      note:
        scope === "C" ? "Circuito completo" : `Alcance ${scope} del circuito (equipo ${equipment})`,
    });
  });
  return rows;
}

function hhmm(value: unknown): string {
  if (value instanceof Date) {
    // ExcelJS lee las horas como fechas en UTC sobre 1899-12-30.
    return `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`;
  }
  const s = String(value ?? "").trim();
  if (!/^\d{1,2}:\d{2}/.test(s)) throw new Error(`Hora inválida: ${s}`);
  return s.padStart(5, "0").slice(0, 5);
}

/* ----------------------------- Edeeste ------------------------------ */

type EdeesteControl = {
  source: SourceRef;
  items: Array<{
    code: string;
    name: string;
    province: string;
    municipality: string;
    zones: string[];
  }>;
};

function loadEdeesteControl() {
  const data = readJson<EdeesteControl>("edeeste-control-2025-02-11.json");
  for (const it of data.items) {
    addCircuit({
      code: it.code,
      ede: "edeeste",
      name: it.name,
      provinceId: it.province,
      municipality: it.municipality,
      clients: simulatedClients(it.code, 1500, 9000),
      zones: it.zones,
      provenance: "official",
      source: data.source,
    });
  }
  return data.items.length;
}

type EdeestePress = {
  sources: Record<string, SourceRef>;
  items: Array<{
    source: string;
    date: string;
    start: string;
    end?: string;
    endOptions?: string[];
    cause: string;
    circuits: string[];
  }>;
  locations: Record<string, [string, string, string] | string>;
};

function loadEdeestePress() {
  const data = readJson<EdeestePress>("edeeste-prensa-2026-10-20_21.json");
  let n = 0;
  for (const it of data.items) {
    const source = data.sources[it.source];
    if (!source) throw new Error(`Fuente desconocida ${it.source}`);
    for (const code of it.circuits) {
      const loc = data.locations[code.slice(0, 4)];
      if (!Array.isArray(loc)) throw new Error(`Sin ubicación para ${code}`);
      const [provinceId, municipality, label] = loc;
      addCircuit({
        code,
        ede: "edeeste",
        name: `${label} ${code.slice(-2)}`,
        provinceId,
        municipality,
        clients: simulatedClients(code, 1500, 9000),
        zones: [label],
        provenance: "press",
        source,
      });
      const options = it.endOptions ?? [it.end!];
      const end = options[hashString(code) % options.length]!;
      outages.push({
        id: `ede-${code}-${it.date}`,
        circuitCode: code,
        ede: "edeeste",
        start: `${it.date}T${it.start}:00-04:00`,
        end: `${it.date}T${end}:00-04:00`,
        cause: it.cause,
        clientsAffected: null,
        zones: [label],
        provenance: "press",
        source,
        ...(it.endOptions ? { note: "Hora de cierre aproximada: el medio da un rango." } : {}),
      });
      n++;
    }
  }
  return n;
}

/* ------------------------------ Edesur ------------------------------ */

type EdesurFile = {
  source: SourceRef;
  items: Array<{
    date: string;
    province: string;
    municipality: string;
    start: string;
    end: string;
    zones: string[];
  }>;
};

function loadEdesur() {
  const data = readJson<EdesurFile>("edesur-mantenimientos-2026-10-17_23.json");
  const byKey = new Map<string, string>();
  const counters = new Map<string, number>();
  for (const it of data.items) {
    const key = `${it.province}|${slug(it.zones[0] ?? it.municipality)}`;
    let code = byKey.get(key);
    if (!code) {
      const n = (counters.get(it.province) ?? 0) + 1;
      counters.set(it.province, n);
      code = `SIM-${provinceAbbr(it.province)}${String(n).padStart(2, "0")}`;
      byKey.set(key, code);
    }
    addCircuit({
      code,
      ede: "edesur",
      name: `${it.zones[0] ?? it.municipality} (sintético)`,
      provinceId: it.province,
      municipality: it.municipality,
      clients: Math.round((900 + it.zones.length * 420 + noise("es", code) * 1200) / 10) * 10,
      zones: it.zones,
      provenance: "simulated",
      source: { label: "Circuito sintético creado a partir del programa de Edesur" },
    });
    outages.push({
      id: `eds-${code}-${it.date}-${it.start.replace(":", "")}`,
      circuitCode: code,
      ede: "edesur",
      start: `${it.date}T${it.start}:00-04:00`,
      end: `${it.date}T${it.end}:00-04:00`,
      cause: "Mantenimiento programado",
      clientsAffected: null,
      zones: it.zones,
      provenance: "official",
      source: data.source,
      note: "Edesur no publica el código de circuito.",
    });
  }
  return data.items.length;
}

function provinceAbbr(id: string): string {
  const parts = id.split("-").filter((p) => !SMALL_WORDS.has(p));
  const s = parts.length > 1 ? parts.map((p) => p[0]).join("") : id.slice(0, 3);
  return s.toUpperCase().padEnd(3, "X").slice(0, 3);
}

/* ---------------- Relleno: provincias sin circuitos ----------------- */

function fillGaps(min = 2) {
  let added = 0;
  for (const p of provinces) {
    const count = [...circuits.values()].filter((c) => c.provinceId === p.id).length;
    const names = Object.keys(municipalities[p.id] ?? {});
    for (let i = count; i < min; i++) {
      const code = `SIM-${provinceAbbr(p.id)}${String(90 + i).padStart(2, "0")}`;
      const ede: Ede = p.ede === "shared" ? "edesur" : p.ede;
      addCircuit({
        code,
        ede,
        name: `${p.name} ${i + 1} (sintético)`,
        provinceId: p.id,
        municipality: names[i % Math.max(1, names.length)] ?? p.name,
        clients: simulatedClients(code, 1200, 7000),
        zones: [],
        provenance: "simulated",
        source: { label: "Circuito sintético para cubrir la provincia en la demo" },
      });
      added++;
    }
  }
  return added;
}

/* ------------------------------ Main -------------------------------- */

async function main() {
  const report = {
    edenorteRows: await loadEdenorte(),
    edeesteControl: loadEdeesteControl(),
    edeestePress: loadEdeestePress(),
    edesurItems: loadEdesur(),
    filled: fillGaps(),
  };

  const dataset: Dataset = DatasetSchema.parse({
    generatedAt: new Date().toISOString(),
    provinces,
    circuits: [...circuits.values()].sort((a, b) => a.code.localeCompare(b.code)),
    plannedOutages: outages.sort(
      (a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id),
    ),
    scenarios: readJson("scenarios.json"),
  });

  const out = join(root, "generated");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "dataset.json"), JSON.stringify(dataset));
  writeFileSync(
    join(out, "provinces.geojson.json"),
    JSON.stringify({
      type: "FeatureCollection",
      features: geo.features.map((f) => ({
        type: "Feature",
        properties: {
          id: slug(f.properties.province_name),
          name: titleCase(f.properties.province_name),
        },
        geometry: f.geometry,
      })),
    }),
  );

  const byEde = Object.groupBy(dataset.circuits, (c) => c.ede);
  console.info("Semilla generada:", {
    ...report,
    provinces: dataset.provinces.length,
    circuits: dataset.circuits.length,
    circuitsByEde: Object.fromEntries(Object.entries(byEde).map(([k, v]) => [k, v?.length])),
    plannedOutages: dataset.plannedOutages.length,
    scenarios: dataset.scenarios.length,
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
