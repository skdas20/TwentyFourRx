"use client";
import React from "react";

type Props = {
  width?: number;
  variant?: "dark" | "inverted" | "onRed";
  animated?: boolean;
  className?: string;
};

export default function LogoAnimated({
  width = 240,
  variant = "inverted",
  animated = true,
  className = "",
}: Props) {
  const fg =
    variant === "onRed" ? "#000000" :
    variant === "inverted" ? "#FFFFFF" :
    "#0B0B0C";

  return (
    <svg
      viewBox="0 0 360 160"
      width={width}
      height={(width / 360) * 160}
      role="img"
      aria-label="24Rx logo"
      className={className}
      style={{ display: "block", color: fg } as React.CSSProperties}
    >
      <style>
        {`
        :root{ --logo-fg:${fg}; --logo-accent:#EE2B2B; }
        .line{ stroke: var(--logo-fg); stroke-width:14; stroke-linecap:round; pathLength:100; stroke-dasharray:100; stroke-dashoffset:100; }
        #word{ transform-box:fill-box; transform-origin:50% 50%; opacity:${animated ? 0 : 1}; }
        ${animated ? `
          @keyframes draw{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
          @keyframes up{from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:translateY(0)}}
          @keyframes glint{0%{transform:translateX(-120%) skewX(-15deg);opacity:0}30%{opacity:.9}60%{opacity:.9}100%{transform:translateX(120%) skewX(-15deg);opacity:0}}
          #top{ animation: draw .55s ease-out .05s forwards }
          #bot{ animation: draw .55s ease-out .15s forwards }
          #word{ animation: up .45s ease-out .25s forwards }
          #glint{ animation: glint 1.6s ease-in-out .7s infinite; mix-blend-mode: screen; }
          @media (prefers-reduced-motion: reduce){ #top,#bot,#word,#glint{ animation:none !important; opacity:1 } }
        ` : ``}
      `}
      </style>

      <line id="top" className="line" x1="24" y1="36" x2="336" y2="36" />
      <line id="bot" className="line" x1="24" y1="124" x2="336" y2="124" />

      <g id="word" fill="var(--logo-fg)" fontFamily="Inter, Space Grotesk, system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
        <text x="96" y="102" fontWeight="800" fontSize="64">24 R</text>
        <text x="250" y="110" fontWeight="700" fontSize="34">x</text>
      </g>

      <rect id="glint" x="70" y="44" width="220" height="64" fill="url(#sweep)" opacity={animated ? 1 : 0} />
      <defs>
        <linearGradient id="sweep" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0"  stopColor="rgba(255,255,255,0)"/>
          <stop offset=".5" stopColor="rgba(255,255,255,.85)"/>
          <stop offset="1"  stopColor="rgba(255,255,255,0)"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
