// Structured data (schema.org JSON-LD) for search engines and answer engines: what a page is about
// (a player, a club, a tournament, the site), in a script tag they read and visitors don't see.
// "<" is escaped so a name can't end the script early.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c") }} />;
}
