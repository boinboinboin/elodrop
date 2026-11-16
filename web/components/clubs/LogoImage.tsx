// A club logo: scaled by Sanity's image servers to its size on screen (utils/clubs.ts logoSrc), and inverted in the
// dark theme when it's black on transparent (`invert`: the Studio's "Invert in dark mode"; .dark-invert in
// app/globals.css). Its size is set by `className` (w-5 h-5), or by `size` alone when there's none, in Tailwind units.
import { logoSrc } from "@/utils/clubs";

interface Props {
  src: string;
  /** Its width on screen in Tailwind units (w-5 is 5), for the image's size */
  size: number;
  invert?: boolean;
  /** Its size and anything else (else width and height from `size`) */
  className?: string;
  alt?: string;
  title?: string;
  lazy?: boolean;
}

export default function LogoImage({ src, size, invert, className, alt = "", title, lazy }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small logos from the CMS or public/
    <img
      src={logoSrc(src, size)}
      alt={alt}
      title={title}
      loading={lazy ? "lazy" : undefined}
      className={`object-contain shrink-0${className ? ` ${className}` : ""}${invert ? " dark-invert" : ""}`}
      style={className ? undefined : { width: `${size * 0.25}rem`, height: `${size * 0.25}rem` }}
    />
  );
}
