"use client";

import { useState } from "react";
import { cn, formatPrice } from "@/lib/utils";

export interface DailyPoint {
  date: string; // ISO date (yyyy-mm-dd)
  revenue: number; // paise
  orders: number;
}

const dayFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

function niceMax(v: number) {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / pow) * pow;
}

/**
 * Single-series daily revenue bar chart (one hue, no legend needed).
 * Thin bars with 4px rounded data ends anchored to the baseline, a 2px gap,
 * recessive grid, per-bar hover/focus tooltip and a table view.
 */
export function RevenueChart({ data }: { data: DailyPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const W = 720;
  const H = 240;
  const pad = { top: 12, right: 8, bottom: 26, left: 48 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = niceMax(Math.max(...data.map((d) => d.revenue / 100), 0));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const slot = innerW / data.length;
  const barW = Math.max(2, slot - 2);
  const y = (rupees: number) => pad.top + innerH - (rupees / max) * innerH;

  const total = data.reduce((s, d) => s + d.revenue, 0);
  const point = active !== null ? data[active] : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-muted">Revenue · last {data.length} days</p>
          <p className="mt-1 font-serif text-3xl tabular-nums">{formatPrice(total)}</p>
        </div>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          className="text-[0.78rem] text-muted underline underline-offset-4 hover:text-ink"
        >
          {asTable ? "Show chart" : "Show as table"}
        </button>
      </div>

      {asTable ? (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-[0.85rem]">
            <thead>
              <tr className="border-b border-line text-left text-[0.7rem] uppercase tracking-[0.12em] text-muted">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 text-right font-medium">Orders</th>
                <th className="py-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date} className="border-b border-line/70">
                  <td className="py-1.5">{dayFmt.format(new Date(d.date))}</td>
                  <td className="py-1.5 text-right tabular-nums">{d.orders}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatPrice(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5">
          <div className="relative min-w-[34rem]">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-auto w-full"
              role="img"
              aria-label={`Daily revenue for the last ${data.length} days, total ${formatPrice(total)}`}
            >
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                  <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)">
                    ₹{compact.format(t)}
                  </text>
                </g>
              ))}
              {data.map((d, i) => {
                const x = pad.left + i * slot + 1;
                const h = Math.max(0, pad.top + innerH - y(d.revenue / 100));
                const r = Math.min(4, barW / 2, h);
                const top = pad.top + innerH - h;
                // Rounded top corners only; the bar stays square on the baseline.
                const path =
                  h <= 0
                    ? ""
                    : `M${x},${pad.top + innerH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${pad.top + innerH} Z`;
                return (
                  <g key={d.date}>
                    {path && <path d={path} fill="var(--brand)" opacity={active === null || active === i ? 1 : 0.45} />}
                    {/* Hit target taller and wider than the mark */}
                    <rect
                      x={pad.left + i * slot}
                      y={pad.top}
                      width={slot}
                      height={innerH}
                      fill="transparent"
                      tabIndex={0}
                      aria-label={`${dayFmt.format(new Date(d.date))}: ${formatPrice(d.revenue)}, ${d.orders} orders`}
                      onMouseEnter={() => setActive(i)}
                      onMouseLeave={() => setActive(null)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      className="cursor-default outline-none"
                    />
                    {(i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) && (
                      <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">
                        {dayFmt.format(new Date(d.date))}
                      </text>
                    )}
                  </g>
                );
              })}
              <line x1={pad.left} x2={W - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="var(--line-strong)" />
            </svg>
            {point && active !== null && (
              <div
                role="status"
                className={cn(
                  "pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-control border border-line bg-canvas px-3 py-2 text-[0.8rem] shadow-md",
                )}
                style={{ left: `${((pad.left + active * slot + slot / 2) / W) * 100}%` }}
              >
                <p className="text-muted">{dayFmt.format(new Date(point.date))}</p>
                <p className="font-medium tabular-nums">{formatPrice(point.revenue)}</p>
                <p className="text-muted">
                  {point.orders} {point.orders === 1 ? "order" : "orders"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
