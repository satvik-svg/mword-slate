"use client";

import type { CSSProperties } from "react";

export type MWorldAppKey = "chat" | "calendar" | "room" | "paper" | "board" | "slate";

export function MWorldAppIcon({
  app,
  size = 32,
  className = "",
  style,
}: {
  app: MWorldAppKey;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const shared = {
    width: size,
    height: size,
    style,
  };

  if (app === "chat") {
    return (
      <img
        src="https://chat.mworld.tech/brand/logo-mark-256.png"
        alt="MChat"
        width={size}
        height={size}
        className={`shrink-0 rounded-[22%] object-cover ${className}`}
        style={style}
      />
    );
  }

  if (app === "room") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        fill="none"
        className={`shrink-0 ${className}`}
        {...shared}
      >
        <rect width="64" height="64" rx="16" fill="#0F172A" />
        <rect x="10" y="18" width="30" height="28" rx="7" fill="#1A73E8" />
        <path
          d="M40 27.5L52.2 19.8C53.5 19 55 19.9 55 21.4V42.6C55 44.1 53.5 45 52.2 44.2L40 36.5V27.5Z"
          fill="#0F9D58"
        />
        <circle cx="25" cy="32" r="5" fill="#FFFFFF" />
      </svg>
    );
  }

  if (app === "board") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        fill="none"
        className={`shrink-0 ${className}`}
        {...shared}
      >
        <rect width="64" height="64" rx="16" fill="#0F172A" />
        <rect x="1" y="1" width="62" height="62" rx="15" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="1.5" fill="rgba(255,255,255,0.22)" />
        <circle cx="32" cy="16" r="1.5" fill="rgba(255,255,255,0.22)" />
        <circle cx="48" cy="16" r="1.5" fill="rgba(255,255,255,0.22)" />
        <circle cx="16" cy="48" r="1.5" fill="rgba(255,255,255,0.22)" />
        <circle cx="48" cy="48" r="1.5" fill="rgba(255,255,255,0.22)" />
        <rect x="13" y="15" width="18" height="14" rx="4" fill="#14B8A6" />
        <rect x="33" y="35" width="18" height="14" rx="4" fill="#FDE68A" />
        <path d="M31 22H39C40.6569 22 42 23.3431 42 25V33" stroke="#F8FAFC" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M38.5 30.5L42 34L45.5 30.5" stroke="#F8FAFC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20" cy="41" r="6" stroke="#94A3B8" strokeWidth="2.25" />
      </svg>
    );
  }

  if (app === "slate") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 40 40"
        fill="none"
        className={`shrink-0 ${className}`}
        {...shared}
      >
        <rect x="1" y="1" width="38" height="38" rx="9.5" fill="#141417" />
        <rect x="1.5" y="1.5" width="37" height="37" rx="9" stroke="rgba(255,255,255,0.14)" />
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
        <path d="M20 10L29.5 15L20 20L10.5 15L20 10Z" fill="#FFFFFF" />
      </svg>
    );
  }

  if (app === "calendar") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        fill="none"
        className={`shrink-0 ${className}`}
        {...shared}
      >
        <rect width="64" height="64" rx="16" fill="#0F172A" />
        <rect x="12" y="14" width="40" height="38" rx="8" fill="#FFFFFF" />
        <path d="M12 22C12 17.5817 15.5817 14 20 14H44C48.4183 14 52 17.5817 52 22V27H12V22Z" fill="#2563EB" />
        <rect x="21" y="10" width="4" height="8" rx="2" fill="#93C5FD" />
        <rect x="39" y="10" width="4" height="8" rx="2" fill="#93C5FD" />
        <rect x="19" y="33" width="6" height="5" rx="1.5" fill="#CBD5E1" />
        <rect x="29" y="33" width="6" height="5" rx="1.5" fill="#2563EB" />
        <rect x="39" y="33" width="6" height="5" rx="1.5" fill="#CBD5E1" />
        <rect x="19" y="42" width="6" height="5" rx="1.5" fill="#CBD5E1" />
        <rect x="29" y="42" width="6" height="5" rx="1.5" fill="#CBD5E1" />
        <rect x="39" y="42" width="6" height="5" rx="1.5" fill="#CBD5E1" />
      </svg>
    );
  }

  // Paper
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={`shrink-0 ${className}`}
      {...shared}
    >
      <rect width="64" height="64" rx="16" fill="#2F2E2A" />
      <rect x="1" y="1" width="62" height="62" rx="15" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
      <path d="M18 15H39L46 22V49H18V15Z" rx="3" fill="#FAFAF9" />
      <path d="M38 15V23H46" fill="#D6D3D1" />
      <rect x="24" y="29" width="16" height="3" rx="1.5" fill="#2F2E2A" />
      <rect x="24" y="35.5" width="16" height="3" rx="1.5" fill="#78716C" />
      <rect x="24" y="42" width="11" height="3" rx="1.5" fill="#A8A29E" />
    </svg>
  );
}
