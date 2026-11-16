// An image's address on Sanity's image servers: cropped as set in the Studio (rect=left,top,width,height in pixels,
// from the fraction cut off each side), and with a width, scaled to it in the format the browser takes best
// (auto=format: WebP or AVIF). The club logos use it without a width; the written pages' images with one, for srcset.
import type { SanityImage } from "@/types";

export function sanityImageUrl(image: Pick<SanityImage, "url" | "width" | "height" | "crop">, width?: number): string {
  const params: string[] = [];
  const c = image.crop;
  if (c && image.width && image.height) {
    const left = Math.round(c.left * image.width);
    const top = Math.round(c.top * image.height);
    params.push(`rect=${left},${top},${Math.round((1 - c.left - c.right) * image.width)},${Math.round((1 - c.top - c.bottom) * image.height)}`);
  }
  if (width) params.push(`w=${width}`, "fit=max", "auto=format");
  return params.length ? `${image.url}?${params.join("&")}` : image.url;
}

/** srcset for an image shown at most `width` CSS pixels wide: 1×, 1.5× and 2× */
export const sanitySrcSet = (image: Pick<SanityImage, "url" | "width" | "height" | "crop">, width: number) =>
  [1, 1.5, 2].map((x) => `${sanityImageUrl(image, Math.round(width * x))} ${Math.round(width * x)}w`).join(", ");
