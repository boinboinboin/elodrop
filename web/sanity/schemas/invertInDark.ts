// A box on an image (a club's logo, a badge's art): shown inverted in the dark theme (Lights out, app/globals.css),
// for a black or dark grey image on a transparent background, which would vanish on black.
// scripts/mark-dark-logos.mts finds them.
import { defineField } from "sanity";

export const invertInDark = defineField({
  name: "invertInDark",
  title: "Invert in dark mode",
  type: "boolean",
  description: "Tick for a black-and-white image that would vanish on black: the dark theme shows it white (its colours about the same)",
});
