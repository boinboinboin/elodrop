// The Sanity Studio's own root layout (/studio): full-screen, in English, outside the site's languages
import "../globals.css";

export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
