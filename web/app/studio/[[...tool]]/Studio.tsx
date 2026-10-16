"use client";

// Sanity's Studio, full-screen. (next-sanity's NextStudio wraps the same component, but its lazy
// import doesn't build with Turbopack in Next.js 16.)
import { Studio as SanityStudio } from "sanity";
import config from "@/sanity.config";

export default function Studio() {
  return (
    <div style={{ height: "100dvh" }}>
      <SanityStudio config={config} />
    </div>
  );
}
