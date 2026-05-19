type StableWidthLabelProps = {
  /** Currently visible label text. */
  children: string;
  /** All label variants; grid sizes to the widest to prevent layout shift. */
  variants: readonly string[];
};

/**
 * Renders label text at a fixed width equal to the widest variant (e.g. idle vs loading).
 */
export function StableWidthLabel({ children, variants }: StableWidthLabelProps) {
  return (
    <span className="inline-grid">
      {variants.map((variant) => (
        <span
          key={variant}
          className="col-start-1 row-start-1 invisible pointer-events-none"
          aria-hidden
        >
          {variant}
        </span>
      ))}
      <span className="col-start-1 row-start-1">{children}</span>
    </span>
  );
}
