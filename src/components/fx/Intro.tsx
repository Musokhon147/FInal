/**
 * First visit only: the eight-pointed star draws itself, then the curtain lifts.
 * Pure CSS; the head script adds html.intro-seen on later visits, which hides it.
 * It never takes clicks, so the page is usable underneath from the first frame.
 */
export default function Intro() {
  return (
    <div className="intro print:hidden" aria-hidden="true">
      <svg viewBox="-50 -50 100 100" className="intro-star">
        <path pathLength="1" d="M0-44L12.6-30.4 31.1-31.1 30.4-12.6 44 0 30.4 12.6 31.1 31.1 12.6 30.4 0 44-12.6 30.4-31.1 31.1-30.4 12.6-44 0-30.4-12.6-31.1-31.1-12.6-30.4Z" />
        <path pathLength="1" className="intro-inner" d="M0-22L15.6-15.6 22 0 15.6 15.6 0 22-15.6 15.6-22 0-15.6-15.6Z" />
        <circle r="5" className="intro-dot" />
      </svg>
    </div>
  );
}
