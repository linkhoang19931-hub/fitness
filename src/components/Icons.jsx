// Bộ icon vẽ tay cho app, nét bo tròn kiểu SF Symbols.
// Icon tab có 2 trạng thái: nét (thường) và đặc (đang chọn).

const stroke = (w = 1.8) => ({
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: w,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

const Svg = ({ size = 24, vb = 24, children, ...p }) => (
  <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} aria-hidden="true" {...p}>
    {children}
  </svg>
);

/* ---------- Tab: Tập (tạ đơn) ---------- */
export const IconDumbbell = ({ filled, ...p }) => (
  <Svg vb={28} {...p}>
    <g {...stroke(1.9)} fill={filled ? 'currentColor' : 'none'}>
      <rect x="6.2" y="7.5" width="3.6" height="13" rx="1.5" />
      <rect x="18.2" y="7.5" width="3.6" height="13" rx="1.5" />
      <rect x="2.6" y="10.2" width="2.8" height="7.6" rx="1.2" />
      <rect x="22.6" y="10.2" width="2.8" height="7.6" rx="1.2" />
    </g>
    <path d="M9.8 14h8.4" {...stroke(2.4)} />
  </Svg>
);

/* ---------- Tab: PFC (dĩa & dao) ---------- */
export const IconFork = ({ filled, ...p }) => (
  <Svg vb={28} {...p}>
    <g {...stroke(1.9)}>
      <path d="M7 4.5v5.8a3.3 3.3 0 0 0 6.6 0V4.5" />
      <path d="M10.3 4.5v6.2M10.3 13.6v10" />
      <path d="M21 23.6V4.4" />
    </g>
    <path
      d="M21 4.4c-2.7 1.5-4.1 4.6-4.1 8.7v2.6c0 .5.4.9.9.9H21"
      {...stroke(1.9)}
      fill={filled ? 'currentColor' : 'none'}
    />
  </Svg>
);

/* ---------- Tab: Cơ thể (cân điện tử) ---------- */
export const IconScale = ({ filled, ...p }) => (
  <Svg vb={28} {...p}>
    <rect x="3.6" y="3.6" width="20.8" height="20.8" rx="6" {...stroke(1.9)} fill={filled ? 'currentColor' : 'none'} />
    <g {...stroke(1.9)} stroke={filled ? 'var(--bg)' : 'currentColor'}>
      <path d="M8.6 13a5.4 5.4 0 0 1 10.8 0" />
      <path d="M14 13l2.3-2.6" />
    </g>
  </Svg>
);

/* ---------- Tab: Cài đặt (bánh răng sinh bằng toạ độ cực) ---------- */
function gearPath(cx, cy, rOuter, rInner, teeth) {
  const pts = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    const w = step * 0.22; // nửa bề rộng đỉnh răng
    const s = step * 0.3; // chân răng
    pts.push([a - s, rInner], [a - w, rOuter], [a + w, rOuter], [a + s, rInner]);
  }
  return (
    pts
      .map(([a, r], i) => `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`)
      .join(' ') + 'Z'
  );
}
const GEAR = gearPath(14, 14, 11, 8.6, 8);
const HOLE = 'M14 10.4a3.6 3.6 0 1 0 0 7.2a3.6 3.6 0 1 0 0-7.2Z';
export const IconGear = ({ filled, ...p }) => (
  <Svg vb={28} {...p}>
    {filled ? (
      <path d={`${GEAR} ${HOLE}`} fill="currentColor" fillRule="evenodd" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    ) : (
      <>
        <path d={GEAR} {...stroke(1.8)} />
        <circle cx="14" cy="14" r="3.6" {...stroke(1.8)} />
      </>
    )}
  </Svg>
);

/* ---------- Icon thao tác ---------- */
export const IconCheck = (p) => (
  <Svg {...p}>
    <path d="M5.5 12.6l4.2 4.2 8.8-9.6" {...stroke(2.6)} />
  </Svg>
);
export const IconChevron = ({ dir = 'right', ...p }) => (
  <Svg {...p} style={{ transform: { left: 'rotate(180deg)', down: 'rotate(90deg)', up: 'rotate(-90deg)' }[dir] }}>
    <path d="M9.5 5.5L16 12l-6.5 6.5" {...stroke(2.2)} />
  </Svg>
);
export const IconTrash = (p) => (
  <Svg {...p}>
    <g {...stroke(1.7)}>
      <path d="M4.5 6.5h15M9.5 6.5V4.8c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2v1.7" />
      <path d="M6.3 6.5l.9 12.4c.1 1 .9 1.8 1.9 1.8h5.8c1 0 1.8-.8 1.9-1.8l.9-12.4" />
      <path d="M10.2 10.5v6.2M13.8 10.5v6.2" />
    </g>
  </Svg>
);
export const IconCamera = (p) => (
  <Svg {...p}>
    <g {...stroke(1.8)}>
      <path d="M3.5 8.6c0-1.1.9-2 2-2h2.2l1.4-2h5.8l1.4 2h2.2c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2h-13c-1.1 0-2-.9-2-2z" />
      <circle cx="12" cy="12.8" r="3.6" />
    </g>
  </Svg>
);
export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" {...stroke(2.2)} />
  </Svg>
);
export const IconFlame = (p) => (
  <Svg {...p}>
    <path
      d="M12 21c3.6 0 6-2.5 6-5.9 0-3.4-2.4-5.3-3.6-8.6-.3-.8-1.3-1-1.8-.3-.9 1.4-1.1 2.9-1 4.2-1.1-.6-1.8-1.7-2-2.9-.1-.7-1-1-1.5-.4C6.7 9.2 6 11.4 6 15.1 6 18.5 8.4 21 12 21z"
      fill="currentColor"
    />
  </Svg>
);
export const IconTimer = (p) => (
  <Svg {...p}>
    <g {...stroke(1.8)}>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 9.5v4l2.6 1.6M9.5 3h5" />
    </g>
  </Svg>
);
export const IconBook = (p) => (
  <Svg {...p}>
    <g {...stroke(1.8)}>
      <path d="M12 6.5c-1.8-1.3-4.3-2-7.5-2v13c3.2 0 5.7.7 7.5 2 1.8-1.3 4.3-2 7.5-2v-13c-3.2 0-5.7.7-7.5 2z" />
      <path d="M12 6.5v13" />
    </g>
  </Svg>
);
export const IconSearch = (p) => (
  <Svg {...p}>
    <g {...stroke(2)}>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="M15.6 15.6L20 20" />
    </g>
  </Svg>
);
export const IconInfo = (p) => (
  <Svg {...p}>
    <g {...stroke(1.8)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.2" />
    </g>
    <circle cx="12" cy="7.9" r="1.15" fill="currentColor" />
  </Svg>
);

export const IconMoon = ({ filled, ...p }) => (
  <Svg vb={28} {...p}>
    <path
      d="M22.6 17.4A9.6 9.6 0 0 1 10.6 5.4a.6.6 0 0 0-.8-.7A10.2 10.2 0 1 0 23.3 18.2a.6.6 0 0 0-.7-.8Z"
      {...stroke(1.9)}
      fill={filled ? 'currentColor' : 'none'}
    />
    <path d="M18.5 4.5v3M17 6h3M22.5 9.5v2M21.5 10.5h2" {...stroke(1.6)} />
  </Svg>
);
export const IconSunrise = (p) => (
  <Svg {...p}>
    <g {...stroke(1.9)}>
      <path d="M5 17a7 7 0 0 1 14 0" />
      <path d="M2.5 17h19M12 3.5v3M4.6 9.6l1.8 1.4M19.4 9.6l-1.8 1.4M7 21h10" />
    </g>
  </Svg>
);
