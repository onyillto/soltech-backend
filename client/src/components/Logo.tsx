const DARK_BLUE = "#2C5A82";
const LIGHT_BLUE = "#A9CDE4";

/**
 * The actual SOLTECH mark: a big triangle tessellated into 9 smaller
 * triangles (a 3-row triangular grid — 6 "upward" + 3 "downward"), in the
 * brand's two blues with thin white gaps between segments.
 */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg
      className="logo-mark"
      width={size}
      height={size * 0.9}
      viewBox="0 0 100 90"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g stroke="#fff" strokeWidth={1.6} strokeLinejoin="round">
        {/* upward-pointing triangles */}
        <polygon points="50,0 33.3,28.9 66.7,28.9" fill={DARK_BLUE} />
        <polygon points="33.3,28.9 16.7,57.7 50,57.7" fill={LIGHT_BLUE} />
        <polygon points="66.7,28.9 50,57.7 83.3,57.7" fill={DARK_BLUE} />
        <polygon points="16.7,57.7 0,86.6 33.3,86.6" fill={DARK_BLUE} />
        <polygon points="50,57.7 33.3,86.6 66.7,86.6" fill={LIGHT_BLUE} />
        <polygon points="83.3,57.7 66.7,86.6 100,86.6" fill={DARK_BLUE} />

        {/* downward-pointing triangles */}
        <polygon points="33.3,28.9 66.7,28.9 50,57.7" fill={LIGHT_BLUE} />
        <polygon points="16.7,57.7 50,57.7 33.3,86.6" fill={LIGHT_BLUE} />
        <polygon points="50,57.7 83.3,57.7 66.7,86.6" fill={DARK_BLUE} />
      </g>
    </svg>
  );
}
