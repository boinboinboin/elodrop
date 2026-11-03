// A section of a page: spaced from the next, its content in the page's container, with a heading
// and an introduction if given
import type { ReactNode } from "react";

export default function Section({
  title,
  intro,
  id,
  className = "",
  titleClassName = "text-3xl mb-4",
  children,
}: {
  title?: ReactNode;
  intro?: ReactNode;
  id?: string;
  className?: string;
  titleClassName?: string;
  children?: ReactNode;
}) {
  return (
    <section className={`base-section ${className}`} id={id}>
      <div className="base-container px-4">
        {title && <h2 className={titleClassName}>{title}</h2>}
        {/* A div, not a p: an intro can be several paragraphs (blocks()) */}
        {intro && <div className="text-gray-700 mb-4 max-w-3xl space-y-3 [&_strong]:font-semibold">{intro}</div>}
        {children}
      </div>
    </section>
  );
}
