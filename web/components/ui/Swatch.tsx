// A short line in a colour: which line in a chart, or which side in a head to head, is which
export default function Swatch({ color, className = "w-3 h-1" }: { color: string; className?: string }) {
  return <span aria-hidden="true" className={`inline-block rounded-full shrink-0 ${className}`} style={{ background: color }} />;
}
