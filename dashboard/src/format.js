export function fmtMoney(n) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

export function fmtMoneyFull(n) {
  return n === undefined || n === null ? "—" : `$${Math.round(n).toLocaleString("es-CL")}`;
}

export function fmtInt(n) {
  return n === undefined || n === null || Number.isNaN(Number(n)) ? "—" : Number(n).toLocaleString("es-CL");
}

export function fmtPct(n) {
  return n === undefined || n === null || Number.isNaN(n) ? "—" : `${(n * 100).toFixed(1)}%`;
}

export function niceMax(v) {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}
