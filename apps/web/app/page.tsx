import { MapClient } from "../src/map-client";

export default function HomePage() {
  return <MapClient apiUrl={process.env.NEXT_PUBLIC_API_URL ?? ""} />;
}
