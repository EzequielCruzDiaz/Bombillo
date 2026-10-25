import type { Metadata } from "next";
import { Pitch } from "@bombillo/ui";

export const metadata: Metadata = { title: "Propuesta · Bombillo RD" };

/** Página estática (renderizada en el servidor) con la propuesta de negocio. */
export default function PropuestaPage() {
  return (
    <main
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "32px max(16px, env(safe-area-inset-left, 0px))",
        height: "auto",
      }}
    >
      <p className="eyebrow">
        <a href="/">← Volver al mapa</a>
      </p>
      <Pitch />
    </main>
  );
}
