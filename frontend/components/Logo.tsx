import Link from "next/link";
import "./logo-animations.css";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
}

export default function Logo({
  size = "md",
  showText = false,
  href = "/",
}: LogoProps) {
  const sizes = {
    sm: {
      text: "text-2xl",
      subscript: "text-base",
      paddingYClass: "py-1",
      lineThickness: 2,        // px
      subscriptOffset: 2,      // px down
    },
    md: {
      text: "text-4xl",
      subscript: "text-xl",
      paddingYClass: "py-1.5",
      lineThickness: 3,
      subscriptOffset: 4,
    },
    lg: {
      text: "text-5xl",
      subscript: "text-2xl",
      paddingYClass: "py-2",
      lineThickness: 4,
      subscriptOffset: 5,
    },
  } as const;

  const { text, subscript, paddingYClass, lineThickness, subscriptOffset } =
    sizes[size];

  const LogoContent = () => (
    <div className="flex items-end gap-1">
      {/* Block with 24R and lines */}
      <div className="relative inline-block px-2">
        {/* Top + bottom padding to give space for the lines */}
        <div className={`relative inline-block ${paddingYClass}`}>
          {/* TOP LINE: full width over 24R */}
          <div
            className="absolute left-0 right-0 bg-gray-900 dark:bg-white rounded-sm logo-top-line"
            style={{ height: lineThickness, top: 0 }}
          />

          {/* BOTTOM LINE: slightly inset, does NOT go under the x */}
          <div
            className="absolute bg-gray-900 dark:bg-white rounded-sm logo-bottom-line"
            style={{
              height: lineThickness,
              bottom: 0,
              left: "6%",   // start a bit in from left
              right: "22%", // end before where the x sits
            }}
          />

          {/* 24R text */}
          <span
            className={`${text} font-black text-gray-900 dark:text-white leading-none tracking-tight relative logo-text`}
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 900,
            }}
          >
            24R
          </span>
        </div>
      </div>

      {/* x slightly lower, outside the bottom bar */}
      <span
        className={`${subscript} font-black text-gray-900 dark:text-white leading-none logo-text`}
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontWeight: 900,
          transform: `translateY(${subscriptOffset}px)`,
        }}
      >
        x
      </span>

      {showText && (
        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Medicine Trading
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        <LogoContent />
      </Link>
    );
  }

  return <LogoContent />;
}
