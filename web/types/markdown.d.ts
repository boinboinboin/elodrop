// Markdown files imported as text (next.config.ts: the changelog, for the "What's new" page)
declare module "*.md" {
  const text: string;
  export default text;
}
