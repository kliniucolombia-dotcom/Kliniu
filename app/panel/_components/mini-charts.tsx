// Gráficos livianos hechos a mano (sin librería) para no agregar una dependencia
// solo para sparklines/área/donut simples.

function buildPath(values: number[], width: number, height: number, pad = 3) {
  if (values.length === 0) return { line: "", area: "", max: 0, min: 0 };
  const min = Math.min(...values, 0);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (height - pad * 2) * (1 - (v - min) / range);
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${height - pad} L${points[0][0].toFixed(1)},${height - pad} Z`;
  return { line, area, max, min };
}

const compactCOP = (n: number) => {
  if (n >= 1_000_000) return `$${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
};

export function Sparkline({ values, color, width = 96, height = 32 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length < 2) return <div style={{ width, height }} />;
  const { line } = buildPath(values, width, height);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AreaChart({
  values, labels, color, height = 220, gradientId = "areaGradient",
}: { values: number[]; labels: string[]; color: string; height?: number; gradientId?: string }) {
  const chartWidth = 100; // porcentual vía viewBox, escala con el contenedor
  if (values.length < 2) return <div className="flex h-[220px] items-center justify-center text-xs text-[#94A3B8]">Sin datos suficientes</div>;
  const { line, area, max } = buildPath(values, chartWidth, height, 4);
  const ySteps = [max, max * 0.75, max * 0.5, max * 0.25, 0];

  return (
    <div className="flex gap-2">
      <div className="flex w-12 shrink-0 flex-col justify-between py-1 text-right text-[10px] text-[#94A3B8]">
        {ySteps.map((v, i) => <span key={i}>{compactCOP(v)}</span>)}
      </div>
      <div className="flex-1">
        <svg viewBox={`0 0 ${chartWidth} ${height}`} preserveAspectRatio="none" className="h-[220px] w-full">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} stroke="none" />
          <path d={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="mt-1 flex justify-between text-[10px] text-[#94A3B8]">
          <span>{labels[0]}</span>
          <span>{labels[Math.floor(labels.length / 2)]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      </div>
    </div>
  );
}

export function DonutChart({
  slices, size = 160, thickness = 22,
}: { slices: { label: string; value: number; color: string }[]; size?: number; thickness?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const arcs = slices.map((s) => {
    const fraction = total > 0 ? s.value / total : 0;
    const dash = fraction * circumference;
    const arc = { ...s, dash, gap: circumference - dash, offset };
    offset += dash;
    return arc;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth={thickness} />
      {total > 0 && arcs.map((a) => (
        <circle
          key={a.label}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={a.color}
          strokeWidth={thickness}
          strokeDasharray={`${a.dash} ${a.gap}`}
          strokeDashoffset={-a.offset}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  );
}
