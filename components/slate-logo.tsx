"use client";

export function SlateMark({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="36" height="36" rx="9" fill="#141417" />
      <rect x="2.5" y="2.5" width="35" height="35" rx="8.5" stroke="rgba(255,255,255,0.12)" />
      <path
        d="M10.5 24.8L20 29.8L29.5 24.8"
        stroke="rgba(255,255,255,0.42)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 19.6L20 24.6L29.5 19.6"
        stroke="rgba(255,255,255,0.72)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 10L29.5 15L20 20L10.5 15L20 10Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function SlateWordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <SlateMark size={size} />
      <span className="text-[15px] font-semibold tracking-[-0.025em] text-[var(--fg)]">
        Slate
      </span>
    </span>
  );
}
