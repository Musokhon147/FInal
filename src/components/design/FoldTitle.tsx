/**
 * Headline whose letters fold up into place in 3D, once, on page load.
 * Words stay unbroken; screen readers get the plain text.
 */
export default function FoldTitle({ text, className = "", delay = 0.25 }: { text: string; className?: string; delay?: number }) {
  let i = 0;
  return (
    <h1 className={className} aria-label={text}>
      {text.split(" ").map((word, w) => (
        <span key={w} aria-hidden="true" className="inline-block whitespace-nowrap" style={{ perspective: "600px" }}>
          {Array.from(word).map((ch) => {
            const d = delay + i++ * 0.035;
            return <span key={i} className="fold-letter" style={{ animationDelay: `${d}s` }}>{ch}</span>;
          })}
          {w < text.split(" ").length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </h1>
  );
}
