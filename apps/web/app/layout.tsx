import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@bombillo/ui/styles.css";

export const metadata: Metadata = {
  title: "Bombillo RD",
  description:
    "Mapa del estado de la energía eléctrica en República Dominicana: cortes programados, averías y reportes ciudadanos.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0f15",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-DO">
      <head>
        {/* Se enlazan directo (no next/font) para que el build no dependa de red. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
