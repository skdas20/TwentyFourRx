"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import "./logo-animations.css";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
  isLoggedIn?: boolean;
}

export default function Logo({
  size = "md",
  showText = false,
  href = "/",
  isLoggedIn = false,
}: LogoProps) {
  const router = useRouter();

  const sizeMap = {
    sm: "h-8",
    md: "h-12",
    lg: "h-16",
  };

  const LogoSVG = () => (
    <svg
      viewBox="0 0 200 85"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeMap[size]} w-auto select-none`}
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* Define gradient animations for shine effect */}
      <defs>
        {/* Light mode gradients */}
        <linearGradient id="textShine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(17, 24, 39)">
            <animate attributeName="stop-color" values="rgb(17, 24, 39);rgb(59, 130, 246);rgb(17, 24, 39)" dur="6s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="rgb(59, 130, 246)">
            <animate attributeName="stop-color" values="rgb(59, 130, 246);rgb(17, 24, 39);rgb(59, 130, 246)" dur="6s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="rgb(17, 24, 39)">
            <animate attributeName="stop-color" values="rgb(17, 24, 39);rgb(59, 130, 246);rgb(17, 24, 39)" dur="6s" repeatCount="indefinite" />
          </stop>
          <animateTransform attributeName="gradientTransform" type="translate" from="-1 0" to="1 0" dur="6s" repeatCount="indefinite" />
        </linearGradient>

        <linearGradient id="lineShine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(17, 24, 39)">
            <animate attributeName="stop-color" values="rgb(17, 24, 39);rgb(239, 68, 68);rgb(17, 24, 39)" dur="6s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="rgb(239, 68, 68)">
            <animate attributeName="stop-color" values="rgb(239, 68, 68);rgb(17, 24, 39);rgb(239, 68, 68)" dur="6s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="rgb(17, 24, 39)">
            <animate attributeName="stop-color" values="rgb(17, 24, 39);rgb(239, 68, 68);rgb(17, 24, 39)" dur="6s" repeatCount="indefinite" />
          </stop>
          <animateTransform attributeName="gradientTransform" type="translate" from="-1 0" to="1 0" dur="6s" repeatCount="indefinite" />
        </linearGradient>

        {/* Dark mode gradients */}
        <linearGradient id="textShineDark" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(255, 255, 255)">
            <animate attributeName="stop-color" values="rgb(255, 255, 255);rgb(96, 165, 250);rgb(255, 255, 255)" dur="6s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="rgb(96, 165, 250)">
            <animate attributeName="stop-color" values="rgb(96, 165, 250);rgb(255, 255, 255);rgb(96, 165, 250)" dur="6s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="rgb(255, 255, 255)">
            <animate attributeName="stop-color" values="rgb(255, 255, 255);rgb(96, 165, 250);rgb(255, 255, 255)" dur="6s" repeatCount="indefinite" />
          </stop>
          <animateTransform attributeName="gradientTransform" type="translate" from="-1 0" to="1 0" dur="6s" repeatCount="indefinite" />
        </linearGradient>

        <linearGradient id="lineShineDark" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(255, 255, 255)">
            <animate attributeName="stop-color" values="rgb(255, 255, 255);rgb(248, 113, 113);rgb(255, 255, 255)" dur="6s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="rgb(248, 113, 113)">
            <animate attributeName="stop-color" values="rgb(248, 113, 113);rgb(255, 255, 255);rgb(248, 113, 113)" dur="6s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="rgb(255, 255, 255)">
            <animate attributeName="stop-color" values="rgb(255, 255, 255);rgb(248, 113, 113);rgb(255, 255, 255)" dur="6s" repeatCount="indefinite" />
          </stop>
          <animateTransform attributeName="gradientTransform" type="translate" from="-1 0" to="1 0" dur="6s" repeatCount="indefinite" />
        </linearGradient>
      </defs>

      {/* GEOMETRY LOGIC:
        1. Bottom Line: Starts at 0 (extends LEFT of text).
        2. Text "24R": Starts at 30.
        3. Top Line: Starts at 30, but is longer (extends RIGHT over the 'x').
      */}

      {/* TOP LINE: Aligned with '2', extends far right over 'x' */}
      <rect
        className="logo-top-line"
        x="30"
        y="0"
        width="150"
        height="8"
      />

      {/* TEXT: 24R */}
      <text
        className="logo-text"
        x="30"
        y="62"
        fontSize="62"
        fontWeight="700"
        letterSpacing="-2"
      >
        24R
      </text>

      {/* BOTTOM LINE: Extends far left, stops before 'x' */}
      <rect
        className="logo-bottom-line"
        x="0"
        y="72"
        width="145"
        height="8"
      />

      {/* TEXT: x (Subscript) */}
      <text
        className="logo-text"
        x="152"
        y="78"
        fontSize="40"
        fontWeight="700"
      >
        x
      </text>
    </svg>
  );

  const LogoContent = () => (
    <div className="flex items-center gap-2 group">
      <LogoSVG />
      
      {showText && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-opacity">
          Medicine Trading
        </span>
      )}
    </div>
  );

  const handleClick = (e: React.MouseEvent) => {
    if (isLoggedIn) {
      e.preventDefault();
      router.refresh();
    }
  };

  if (href) {
    return (
      <Link href={href} className="inline-block" onClick={handleClick}>
        <LogoContent />
      </Link>
    );
  }

  return <LogoContent />;
}