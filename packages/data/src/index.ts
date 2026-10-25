import { DatasetSchema, type Dataset } from "@bombillo/domain";
import rawDataset from "../generated/dataset.json";
import provincesGeo from "../generated/provinces.geojson.json";

/** Semilla validada en tiempo de carga: si el JSON no cumple el esquema, falla temprano. */
export const dataset: Dataset = DatasetSchema.parse(rawDataset);

export type ProvinceFeature = {
  type: "Feature";
  properties: { id: string; name: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
};

export const provinces = provincesGeo as unknown as {
  type: "FeatureCollection";
  features: ProvinceFeature[];
};
