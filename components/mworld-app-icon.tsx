"use client";

import { useId, type CSSProperties } from "react";

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
  const uid = useId().replace(/:/g, "");
  const shared = {
    width: size,
    height: size,
    style,
  };

  if (app === "chat") {
    const gradId = `mchat-grad-${uid}`;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        fill="none"
        className={`shrink-0 ${className}`}
        {...shared}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill={`url(#${gradId})`} />
        <path
          d="M32 13C20.954 13 12 20.82 12 30.467c0 4.623 2.063 8.826 5.426 11.95L15 50.5l8.458-3.516A21.82 21.82 0 0 0 32 48.933c11.046 0 20-7.82 20-17.466S43.046 13 32 13Z"
          fill="#FFFFFF"
        />
        <path
          d="M21.5 37.5V25.8h4.2v1.85c.95-1.35 2.4-2.1 4.25-2.1 1.9 0 3.35.75 4.2 2.25 1.1-1.5 2.7-2.25 4.6-2.25 3.15 0 5.25 2.05 5.25 5.45v6.5h-4.3v-5.9c0-1.5-.75-2.35-2-2.35s-2.1.85-2.1 2.35v5.9h-4.2v-5.9c0-1.5-.75-2.35-2-2.35s-2.1.85-2.1 2.35v5.9h-3.8Z"
          fill="#0D9488"
        />
      </svg>
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
        <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1.5" />
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
    const gradId = `mboard-grad-${uid}`;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        fill="none"
        className={`shrink-0 ${className}`}
        {...shared}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#6D28D9" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill={`url(#${gradId})`} />
        <circle cx="16" cy="16" r="1.5" fill="rgba(255,255,255,0.28)" />
        <circle cx="32" cy="16" r="1.5" fill="rgba(255,255,255,0.28)" />
        <circle cx="48" cy="16" r="1.5" fill="rgba(255,255,255,0.28)" />
        <circle cx="16" cy="48" r="1.5" fill="rgba(255,255,255,0.28)" />
        <circle cx="48" cy="48" r="1.5" fill="rgba(255,255,255,0.28)" />
        <rect x="13" y="15" width="18" height="14" rx="4" fill="#2DD4BF" />
        <rect x="33" y="35" width="18" height="14" rx="4" fill="#FDE68A" />
        <path d="M31 22H39C40.6569 22 42 23.3431 42 25V33" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M38.5 30.5L42 34L45.5 30.5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20" cy="41" r="6" stroke="rgba(255,255,255,0.65)" strokeWidth="2.25" />
      </svg>
    );
  }

  if (app === "slate") {
    const gradId = `mslate-grad-${uid}`;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 40 40"
        fill="none"
        className={`shrink-0 ${className}`}
        {...shared}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F43F5E" />
            <stop offset="100%" stopColor="#DB2777" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill={`url(#${gradId})`} />
        <path
          d="M10.5 25.2L20 30.2L29.5 25.2"
          stroke="rgba(255,255,255,0.58)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10.5 19.8L20 24.8L29.5 19.8"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M20 9.5L29.5 14.5L20 19.5L10.5 14.5L20 9.5Z" fill="#FFFFFF" />
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
        <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" fill="#FFFFFF" stroke="#DBEAFE" strokeWidth="1.5" />
        <path d="M1 16C1 7.71573 7.71573 1 16 1H48C56.2843 1 63 7.71573 63 16V23H1V16Z" fill="#2563EB" />
        <rect x="19" y="8" width="5" height="9" rx="2.5" fill="#BFDBFE" />
        <rect x="40" y="8" width="5" height="9" rx="2.5" fill="#BFDBFE" />
        <rect x="14" y="31" width="9" height="7" rx="2" fill="#E2E8F0" />
        <rect x="27.5" y="31" width="9" height="7" rx="2" fill="#2563EB" />
        <rect x="41" y="31" width="9" height="7" rx="2" fill="#E2E8F0" />
        <rect x="14" y="43" width="9" height="7" rx="2" fill="#E2E8F0" />
        <rect x="27.5" y="43" width="9" height="7" rx="2" fill="#E2E8F0" />
        <rect x="41" y="43" width="9" height="7" rx="2" fill="#93C5FD" />
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
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" fill="#FAFAF9" stroke="#E7E5E4" strokeWidth="1.5" />
      <path d="M17 13H39L47 21V51H17V13Z" fill="#FFFFFF" stroke="#D6D3D1" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M39 13V21H47" fill="#E7E5E4" />
      <rect x="23" y="28" width="18" height="3.2" rx="1.6" fill="#44403C" />
      <rect x="23" y="35" width="18" height="3.2" rx="1.6" fill="#A8A29E" />
      <rect x="23" y="42" width="12" height="3.2" rx="1.6" fill="#D6D3D1" />
    </svg>
  );
}
