// Minimal, dependency-free SVG chart builders styled by system.css chart-* classes.

export function areaChart(values, { width = 600, height = 140, pad = 8 } = {}) {
  if (!values.length) return '';
  const max = Math.max(1, ...values);
  const stepX = (width - pad * 2) / Math.max(1, values.length - 1);
  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = height - pad - (v / max) * (height - pad * 2);
    return [x, y];
  });
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${height - pad} L${points[0][0].toFixed(1)},${height - pad} Z`;
  return `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.55" />
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" class="chart-axis" />
      <path d="${areaPath}" class="chart-area" />
      <path d="${linePath}" class="chart-line" />
    </svg>
  `;
}

export function barChart(items, { width = 600, height = 140, pad = 8, max = null } = {}) {
  if (!items.length) return '';
  const m = max || Math.max(1, ...items.map((i) => i.value));
  const gap = 4;
  const barW = (width - pad * 2) / items.length - gap;
  return `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" class="chart-axis" />
      ${items
        .map((it, i) => {
          const h = Math.max(1, (it.value / m) * (height - pad * 2));
          const x = pad + i * (barW + gap);
          const y = height - pad - h;
          return `<rect class="chart-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="2"/>`;
        })
        .join('')}
    </svg>
  `;
}
