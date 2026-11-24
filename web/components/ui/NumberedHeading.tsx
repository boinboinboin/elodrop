// A section's heading with its number in its colour before it ("01 The idea"): How it works' parts
// (components/how-it-works/Part) and EloStonk's rules. `small` for a section inside a tab rather than a page.
export default function NumberedHeading({ id, number, color, title, small = false }: { id: string; number: number; color: string; title: string; small?: boolean }) {
  return (
    <div className={`flex items-baseline gap-3 ${small ? "mb-2" : "mb-4"}`}>
      <span aria-hidden="true" className="font-mono text-sm font-semibold" style={{ color }}>{String(number).padStart(2, "0")}</span>
      <h2 id={id} className={small ? "text-2xl" : "text-3xl"}>{title}</h2>
    </div>
  );
}
