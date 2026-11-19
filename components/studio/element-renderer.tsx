"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { getVectorIcon } from "@/lib/icons";
import { cssFilterFromImageFilters } from "@/lib/presets";
import type {
  CanvasElement,
  ChartElement,
  DrawElement,
  IconElement,
  ImageElement,
  QrCodeElement,
  ShapeElement,
  TableElement,
  TextElement,
} from "@/lib/types";

function shapeClipOrSvg(el: ShapeElement) {
  const { width: w, height: h } = el;
  const cx = w / 2;
  const cy = h / 2;
  const gradId = `grad_${el.id}`;
  const fillVal =
    el.gradientTo ? `url(#${gradId})` : el.fill === "transparent" || !el.fill ? "none" : el.fill;
  const dash =
    el.strokeDash === "dashed" ? "10 7" : el.strokeDash === "dotted" ? "3 6" : undefined;

  const angleRad = (((el.gradientAngle ?? 135) - 90) * Math.PI) / 180;
  const x1 = 50 - Math.cos(angleRad) * 50;
  const y1 = 50 - Math.sin(angleRad) * 50;
  const x2 = 50 + Math.cos(angleRad) * 50;
  const y2 = 50 + Math.sin(angleRad) * 50;

  const common = {
    fill: el.shape === "line" ? "none" : fillVal,
    stroke:
      el.shape === "line"
        ? el.stroke && el.stroke !== "transparent"
          ? el.stroke
          : el.fill
        : el.stroke && el.stroke !== "transparent"
          ? el.stroke
          : "none",
    strokeWidth: el.shape === "line" ? Math.max(2, el.strokeWidth || 4) : el.strokeWidth || 0,
    strokeDasharray: dash,
    vectorEffect: "non-scaling-stroke" as const,
  };

  let node: React.ReactNode = null;
  switch (el.shape) {
    case "circle":
      node = <ellipse cx={cx} cy={cy} rx={Math.max(1, w / 2 - (el.strokeWidth || 0) / 2)} ry={Math.max(1, h / 2 - (el.strokeWidth || 0) / 2)} {...common} />;
      break;
    case "pill":
      node = <rect x={0} y={0} width={w} height={h} rx={Math.min(w, h) / 2} {...common} />;
      break;
    case "triangle":
      node = <polygon points={`${cx},2 ${w - 2},${h - 2} 2,${h - 2}`} {...common} />;
      break;
    case "diamond":
      node = <polygon points={`${cx},2 ${w - 2},${cy} ${cx},${h - 2} 2,${cy}`} {...common} />;
      break;
    case "pentagon": {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = ((-90 + i * 72) * Math.PI) / 180;
        return `${(cx + (w / 2 - 2) * Math.cos(a)).toFixed(1)},${(cy + (h / 2 - 2) * Math.sin(a)).toFixed(1)}`;
      }).join(" ");
      node = <polygon points={pts} {...common} />;
      break;
    }
    case "hexagon": {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = ((-30 + i * 60) * Math.PI) / 180;
        return `${(cx + (w / 2 - 2) * Math.cos(a)).toFixed(1)},${(cy + (h / 2 - 2) * Math.sin(a)).toFixed(1)}`;
      }).join(" ");
      node = <polygon points={pts} {...common} />;
      break;
    }
    case "star": {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const rf = i % 2 === 0 ? 1 : 0.44;
        const a = ((-90 + i * 36) * Math.PI) / 180;
        return `${(cx + (w / 2 - 2) * rf * Math.cos(a)).toFixed(1)},${(cy + (h / 2 - 2) * rf * Math.sin(a)).toFixed(1)}`;
      }).join(" ");
      node = <polygon points={pts} {...common} />;
      break;
    }
    case "arrow":
      node = (
        <polygon
          points={`0,${h * 0.28} ${w * 0.62},${h * 0.28} ${w * 0.62},0 ${w},${cy} ${w * 0.62},${h} ${w * 0.62},${h * 0.72} 0,${h * 0.72}`}
          {...common}
        />
      );
      break;
    case "bubble": {
      const bh = h * 0.82;
      const r = Math.min(24, w * 0.14, h * 0.16);
      const d = `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${bh - r} Q ${w} ${bh} ${w - r} ${bh} L ${w * 0.34} ${bh} L ${w * 0.16} ${h} L ${w * 0.2} ${bh} L ${r} ${bh} Q 0 ${bh} 0 ${bh - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
      node = <path d={d} {...common} />;
      break;
    }
    case "blob": {
      const d = `M ${w * 0.5} ${h * 0.04} C ${w * 0.88} ${h * 0.02}, ${w * 1.02} ${h * 0.34}, ${w * 0.92} ${h * 0.64} C ${w * 0.82} ${h * 0.95}, ${w * 0.44} ${h * 1.02}, ${w * 0.2} ${h * 0.88} C ${-w * 0.02} ${h * 0.74}, ${w * 0.01} ${h * 0.34}, ${w * 0.16} ${h * 0.16} C ${w * 0.28} ${h * 0.04}, ${w * 0.38} ${h * 0.05}, ${w * 0.5} ${h * 0.04} Z`;
      node = <path d={d} {...common} />;
      break;
    }
    case "line":
      node = <line x1={0} y1={cy} x2={w} y2={cy} strokeLinecap="round" {...common} />;
      break;
    default:
      node = (
        <rect
          x={(el.strokeWidth || 0) / 2}
          y={(el.strokeWidth || 0) / 2}
          width={Math.max(1, w - (el.strokeWidth || 0))}
          height={Math.max(1, h - (el.strokeWidth || 0))}
          rx={el.borderRadius ?? 0}
          {...common}
        />
      );
      break;
  }

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} className="block overflow-visible">
      {el.gradientTo && (
        <defs>
          <linearGradient id={gradId} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}>
            <stop offset="0%" stopColor={el.fill} />
            <stop offset="100%" stopColor={el.gradientTo} />
          </linearGradient>
        </defs>
      )}
      {node}
    </svg>
  );
}

function ImageMaskWrapper({ el }: { el: ImageElement }) {
  const clipStyle: React.CSSProperties = {};
  if (el.mask === "circle") clipStyle.borderRadius = "9999px";
  else if (el.mask === "rounded") clipStyle.borderRadius = "36px";
  else if (el.mask === "arch") clipStyle.borderRadius = "9999px 9999px 0 0";
  else if (el.mask === "hexagon")
    clipStyle.clipPath = "polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)";
  else if (el.mask === "star")
    clipStyle.clipPath =
      "polygon(50% 0%, 63% 36%, 100% 38%, 71% 61%, 80% 98%, 50% 76%, 20% 98%, 29% 61%, 0% 38%, 37% 36%)";
  else if (el.mask === "blob") clipStyle.borderRadius = "58% 42% 62% 38% / 44% 56% 44% 56%";
  else if (el.mask === "phone") {
    clipStyle.borderRadius = "38px";
    clipStyle.border = `${Math.max(6, Math.round(el.width * 0.04))}px solid #0F172A`;
  } else if (el.mask === "laptop") {
    clipStyle.borderRadius = "18px 18px 4px 4px";
    clipStyle.border = `${Math.max(6, Math.round(el.width * 0.03))}px solid #0F172A`;
  } else {
    clipStyle.borderRadius = `${el.borderRadius || 0}px`;
    if (el.stroke && el.strokeWidth) {
      clipStyle.border = `${el.strokeWidth}px solid ${el.stroke}`;
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden" style={clipStyle}>
      <img
        src={el.src}
        alt={el.name || "Design image"}
        draggable={false}
        className="h-full w-full select-none"
        style={{
          objectFit: el.fit || "cover",
          filter: cssFilterFromImageFilters(el.filters),
        }}
      />
      {el.filters?.vignette > 0 && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle, rgba(0,0,0,0) 35%, rgba(0,0,0,${(el.filters.vignette / 100) * 0.78}) 100%)`,
          }}
        />
      )}
    </div>
  );
}

function QrView({ el }: { el: QrCodeElement }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(el.value || "https://mworld-slate.laflabs-tech.workers.dev", {
      width: 360,
      margin: 1,
      color: { dark: el.fgColor || "#0F172A", light: el.bgColor || "#FFFFFF" },
    })
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [el.value, el.fgColor, el.bgColor]);

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded bg-slate-100 text-xs text-slate-500">
        QR
      </div>
    );
  }
  return <img src={src} alt="QR Code" draggable={false} className="h-full w-full object-contain select-none" />;
}

function ChartView({ el }: { el: ChartElement }) {
  const palette = ["#4F46E5", "#06B6D4", "#F43F5E", "#10B981", "#F59E0B", "#8B5CF6"];
  const data = el.data.length ? el.data : [{ label: "A", value: 10 }];
  const maxVal = Math.max(1, ...data.map((d) => d.value));
  const titleH = el.title ? 40 : 10;
  const chartH = Math.max(40, el.height - titleH - 42);
  const chartW = Math.max(40, el.width - 32);

  if (el.chartKind === "pie" || el.chartKind === "donut") {
    const total = data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1;
    const r = Math.min(chartW, chartH) * 0.42;
    const cx = el.width * 0.38;
    const cy = titleH + chartH / 2 + 8;
    const slices = data.reduce<
      {
        start: number;
        path: string;
        full: boolean;
        color: string;
        d: (typeof data)[number];
      }[]
    >((acc, d, idx) => {
      const start = idx === 0 ? -Math.PI / 2 : acc[idx - 1].start + (Math.max(0, data[idx - 1].value) / total) * Math.PI * 2;
      const span = (Math.max(0, d.value) / total) * Math.PI * 2;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const end = start + span;
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const large = span > Math.PI ? 1 : 0;
      const path =
        span >= Math.PI * 1.999
          ? ""
          : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      acc.push({ start, path, full: span >= Math.PI * 1.999, color: d.color || palette[idx % palette.length], d });
      return acc;
    }, []);

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${el.width} ${el.height}`} className="block">
        {el.title && (
          <text x={8} y={26} fill={el.textColor} fontFamily="Plus Jakarta Sans, sans-serif" fontSize={22} fontWeight={700}>
            {el.title}
          </text>
        )}
        {slices.map((s, idx) =>
          s.full ? (
            <circle key={idx} cx={cx} cy={cy} r={r} fill={s.color} />
          ) : (
            <path key={idx} d={s.path} fill={s.color} />
          ),
        )}
        {el.chartKind === "donut" && <circle cx={cx} cy={cy} r={r * 0.54} fill="#FFFFFF" />}
        {data.map((d, idx) => (
          <g key={idx} transform={`translate(${cx + r + 24}, ${titleH + 18 + idx * 30})`}>
            <rect width={14} height={14} rx={3} fill={d.color || palette[idx % palette.length]} />
            <text x={22} y={12} fill={el.textColor} fontFamily="Inter, sans-serif" fontSize={16} fontWeight={500}>
              {d.label} ({d.value})
            </text>
          </g>
        ))}
      </svg>
    );
  }

  if (el.chartKind === "line") {
    const pts = data.map((d, idx) => ({
      x: 24 + (idx / Math.max(1, data.length - 1)) * (chartW - 16),
      y: titleH + 12 + chartH - (d.value / maxVal) * chartH,
      label: d.label,
      value: d.value,
    }));
    const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${el.width} ${el.height}`} className="block">
        {el.title && (
          <text x={8} y={26} fill={el.textColor} fontFamily="Plus Jakarta Sans, sans-serif" fontSize={22} fontWeight={700}>
            {el.title}
          </text>
        )}
        <polyline points={poly} fill="none" stroke={el.accentColor} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r={6} fill={el.accentColor} />
            <text x={p.x} y={titleH + chartH + 34} textAnchor="middle" fill={el.textColor} fontSize={14} fontFamily="Inter, sans-serif">
              {p.label}
            </text>
            {el.showValues && (
              <text x={p.x} y={p.y - 12} textAnchor="middle" fill={el.textColor} fontSize={14} fontWeight={600} fontFamily="Inter, sans-serif">
                {p.value}
              </text>
            )}
          </g>
        ))}
      </svg>
    );
  }

  const gap = 16;
  const barW = Math.max(16, (chartW - gap * (data.length - 1)) / data.length);
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${el.width} ${el.height}`} className="block">
      {el.title && (
        <text x={8} y={26} fill={el.textColor} fontFamily="Plus Jakarta Sans, sans-serif" fontSize={22} fontWeight={700}>
          {el.title}
        </text>
      )}
      {data.map((d, idx) => {
        const bh = Math.max(6, (d.value / maxVal) * chartH);
        const bx = 16 + idx * (barW + gap);
        const by = titleH + 12 + chartH - bh;
        return (
          <g key={idx}>
            <rect x={bx} y={by} width={barW} height={bh} rx={8} fill={d.color || el.accentColor || palette[idx % palette.length]} />
            <text x={bx + barW / 2} y={titleH + chartH + 34} textAnchor="middle" fill={el.textColor} fontSize={14} fontWeight={500} fontFamily="Inter, sans-serif">
              {d.label}
            </text>
            {el.showValues && (
              <text x={bx + barW / 2} y={by - 8} textAnchor="middle" fill={el.textColor} fontSize={14} fontWeight={700} fontFamily="Inter, sans-serif">
                {d.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function DrawView({ el }: { el: DrawElement }) {
  if (el.points.length < 2) return null;
  const d = el.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(1, el.width)} ${Math.max(1, el.height)}`} className="block overflow-visible">
      <path
        d={d}
        fill="none"
        stroke={el.color}
        strokeWidth={el.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={el.brush === "highlighter" ? 0.42 : 1}
      />
    </svg>
  );
}

function IconView({ el }: { el: IconElement }) {
  const icon = getVectorIcon(el.iconId);
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 24 24"
      fill={el.fillColor && el.fillColor !== "transparent" ? el.fillColor : "none"}
      stroke={el.color}
      strokeWidth={el.strokeWidth || 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="block"
    >
      {icon.paths.map((d, idx) => (
        <path key={idx} d={d} />
      ))}
    </svg>
  );
}

function CurvedTextView({ el }: { el: TextElement }) {
  const curve = el.curve ?? 0;
  const pathId = `curve_${el.id}`;
  const midY = el.height / 2;
  const ctrlY = midY - (curve / 100) * (el.height * 0.9);
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${el.width} ${el.height}`} className="block overflow-visible">
      <defs>
        <path id={pathId} d={`M 8 ${midY} Q ${el.width / 2} ${ctrlY} ${el.width - 8} ${midY}`} />
      </defs>
      <text
        fill={el.color}
        fontFamily={`"${el.fontFamily}", sans-serif`}
        fontSize={el.fontSize}
        fontWeight={el.fontWeight}
        fontStyle={el.italic ? "italic" : "normal"}
        letterSpacing={el.letterSpacing || 0}
      >
        <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
          {el.text}
        </textPath>
      </text>
    </svg>
  );
}

export function ElementRenderer({
  element,
  editing,
  onChangeText,
  onEndEdit,
  onChangeTableCell,
}: {
  element: CanvasElement;
  editing?: boolean;
  onChangeText?: (text: string) => void;
  onEndEdit?: () => void;
  onChangeTableCell?: (row: number, col: number, value: string) => void;
}) {
  if (element.type === "shape") return <>{shapeClipOrSvg(element)}</>;
  if (element.type === "image") return <ImageMaskWrapper el={element} />;
  if (element.type === "icon") return <IconView el={element} />;
  if (element.type === "draw") return <DrawView el={element} />;
  if (element.type === "chart") return <ChartView el={element} />;
  if (element.type === "qrcode") return <QrView el={element} />;

  if (element.type === "table") {
    const tbl = element as TableElement;
    const padY = Math.max(6, Math.round(tbl.fontSize * 0.35));
    const padX = Math.max(10, Math.round(tbl.fontSize * 0.6));
    return (
      <div className="h-full w-full overflow-hidden">
        <table
          className="h-full w-full border-collapse table-fixed"
          style={{
            fontFamily: `"${tbl.fontFamily}", sans-serif`,
            fontSize: `${tbl.fontSize}px`,
            lineHeight: 1.3,
          }}
        >
          <tbody>
            {tbl.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    style={{
                      backgroundColor: ri === 0 ? tbl.headerBg : tbl.cellBg,
                      color: ri === 0 ? tbl.headerColor : tbl.cellColor,
                      border: `1px solid ${tbl.borderColor}`,
                      fontWeight: ri === 0 ? 600 : 400,
                      padding: `${padY}px ${padX}px`,
                      verticalAlign: "middle",
                      wordBreak: "break-word",
                    }}
                  >
                    {editing && onChangeTableCell ? (
                      <input
                        value={cell}
                        onChange={(e) => onChangeTableCell(ri, ci, e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full bg-transparent outline-none"
                        style={{ color: "inherit", fontWeight: "inherit", fontSize: "inherit" }}
                      />
                    ) : (
                      <span>{cell}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Text element
  const t = element as TextElement;
  if (t.curve && Math.abs(t.curve) > 2 && !editing) {
    return <CurvedTextView el={t} />;
  }

  const textStyle: React.CSSProperties = {
    fontFamily: `"${t.fontFamily}", sans-serif`,
    fontSize: `${t.fontSize}px`,
    fontWeight: t.fontWeight,
    fontStyle: t.italic ? "italic" : "normal",
    textDecoration: [t.underline ? "underline" : "", t.strikethrough ? "line-through" : ""]
      .filter(Boolean)
      .join(" ") || "none",
    color: t.color,
    textAlign: t.align,
    lineHeight: t.lineHeight || 1.2,
    letterSpacing: `${t.letterSpacing || 0}px`,
    textTransform: t.textTransform || "none",
    backgroundColor: t.backgroundColor && t.backgroundColor !== "transparent" ? t.backgroundColor : undefined,
    padding: t.backgroundColor && t.backgroundColor !== "transparent" ? `${t.backgroundPadding ?? 10}px` : undefined,
    borderRadius: t.backgroundColor && t.backgroundColor !== "transparent" ? `${t.backgroundRadius ?? 10}px` : undefined,
    textShadow:
      t.shadowColor && t.shadowBlur
        ? `${t.shadowOffsetX ?? 0}px ${t.shadowOffsetY ?? 4}px ${t.shadowBlur}px ${t.shadowColor}`
        : undefined,
    WebkitTextStroke:
      t.strokeColor && t.strokeWidth ? `${t.strokeWidth}px ${t.strokeColor}` : undefined,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };

  if (editing && onChangeText) {
    return (
      <textarea
        autoFocus
        value={t.text}
        onChange={(e) => onChangeText(e.target.value)}
        onBlur={onEndEdit}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Escape") onEndEdit?.();
        }}
        className="h-full w-full resize-none bg-transparent outline-none"
        style={textStyle}
      />
    );
  }

  return (
    <div className="h-full w-full select-none" style={textStyle}>
      {t.text}
    </div>
  );
}
