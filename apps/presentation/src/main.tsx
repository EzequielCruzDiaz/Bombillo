import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { dataset, provinces } from "@bombillo/data";
import { BombilloApp, LocalDataSource } from "@bombillo/ui";
import "@bombillo/ui/styles.css";

// Modo presentación: el motor corre en el navegador con la semilla embebida.
const source = new LocalDataSource(dataset, provinces);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BombilloApp source={source} showPitch />
  </StrictMode>,
);
