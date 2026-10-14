interface EytaaLogoProps {
  className?: string;
  size?: number;
  variant?: "color" | "white" | "dark";
  showWordmark?: boolean;
}

/**
 * EYTAA Brand Mark (Free-standing emblem, transparent background)
 * Inspired by እይታ (vision, sight, viewing) and cinematic forward playback.
 * Completely standalone without any bounding box or black square surround.
 */
export function EytaaLogo({
  className = "w-5 h-5",
  size,
  variant = "color",
  showWordmark = false,
}: EytaaLogoProps) {
  const style = size ? { width: size, height: size } : undefined;

  const renderSymbol = () => {
    switch (variant) {
      case "white":
        return (
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]"
          >
            {/* Outer Vision Aperture Ring */}
            <circle cx="50" cy="50" r="42" stroke="#FFFFFF" strokeWidth="6" opacity="0.9" />
            <circle cx="50" cy="50" r="32" stroke="#FFFFFF" strokeWidth="2" opacity="0.25" strokeDasharray="3 3" />
            
            {/* Vision Aperture Blades */}
            <path d="M50 8L60 30" stroke="#FFFFFF" strokeWidth="3" opacity="0.6" strokeLinecap="round" />
            <path d="M92 50L70 60" stroke="#FFFFFF" strokeWidth="3" opacity="0.6" strokeLinecap="round" />
            <path d="M50 92L40 70" stroke="#FFFFFF" strokeWidth="3" opacity="0.6" strokeLinecap="round" />
            <path d="M8 50L30 40" stroke="#FFFFFF" strokeWidth="3" opacity="0.6" strokeLinecap="round" />

            {/* Precision Play Prism */}
            <path d="M42 34L68 50L42 66V34Z" fill="#FFFFFF" />
          </svg>
        );

      case "dark":
        return (
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <circle cx="50" cy="50" r="42" stroke="#0B0F17" strokeWidth="6" />
            <circle cx="50" cy="50" r="32" stroke="#0B0F17" strokeWidth="2" opacity="0.3" strokeDasharray="3 3" />
            <path d="M50 8L60 30" stroke="#0B0F17" strokeWidth="3" strokeLinecap="round" />
            <path d="M92 50L70 60" stroke="#0B0F17" strokeWidth="3" strokeLinecap="round" />
            <path d="M50 92L40 70" stroke="#0B0F17" strokeWidth="3" strokeLinecap="round" />
            <path d="M8 50L30 40" stroke="#0B0F17" strokeWidth="3" strokeLinecap="round" />
            <path d="M42 34L68 50L42 66V34Z" fill="#0B0F17" />
          </svg>
        );

      case "color":
      default:
        // Standalone Color Emblem with Transparent Background:
        // Luminous Amber Gold + Electric Cyan vision aperture enclosing faceted white & gold play prism
        return (
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full overflow-visible drop-shadow-[0_4px_16px_rgba(245,158,11,0.35)]"
          >
            <defs>
              {/* Luminous Gold Gradient */}
              <linearGradient id="eytaaGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="40%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>

              {/* Luminous Cyan Gradient */}
              <linearGradient id="eytaaCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7DD3FC" />
                <stop offset="50%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>

              {/* Ambient Glow Filter */}
              <filter id="glowEffect" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Outer Vision Aperture Ring (እይታ - Vision Lens) */}
            {/* Top-Right to Bottom-Right Arc (Cyan Light) */}
            <path
              d="M50 8C73.196 8 92 26.804 92 50C92 73.196 73.196 92 50 92"
              stroke="url(#eytaaCyanGrad)"
              strokeWidth="7"
              strokeLinecap="round"
            />

            {/* Bottom-Left to Top-Left Arc (Amber Gold Glow) */}
            <path
              d="M50 92C26.804 92 8 73.196 8 50C8 26.804 26.804 8 50 8"
              stroke="url(#eytaaGoldGrad)"
              strokeWidth="7"
              strokeLinecap="round"
            />

            {/* Secondary Aperture Iris Blades (Camera / Vision shutter) */}
            <g opacity="0.85">
              <path d="M50 14L62 36" stroke="url(#eytaaGoldGrad)" strokeWidth="3" strokeLinecap="round" />
              <path d="M86 50L64 62" stroke="url(#eytaaCyanGrad)" strokeWidth="3" strokeLinecap="round" />
              <path d="M50 86L38 64" stroke="url(#eytaaCyanGrad)" strokeWidth="3" strokeLinecap="round" />
              <path d="M14 50L36 38" stroke="url(#eytaaGoldGrad)" strokeWidth="3" strokeLinecap="round" />
            </g>

            {/* Precision Internal Focus Reticle */}
            <circle
              cx="50"
              cy="50"
              r="26"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeOpacity="0.22"
              strokeDasharray="3 3"
            />

            {/* Center Play Prism (Forward Movement) */}
            <g filter="url(#glowEffect)">
              {/* White Core Triangle */}
              <path
                d="M42 33L70 50L42 67V33Z"
                fill="#FFFFFF"
              />
              {/* Upper Gold Facet */}
              <path
                d="M42 33L70 50L42 50V33Z"
                fill="url(#eytaaGoldGrad)"
                opacity="0.88"
              />
              {/* Lower Cyan Facet */}
              <path
                d="M42 50L70 50L42 67V50Z"
                fill="url(#eytaaCyanGrad)"
                opacity="0.88"
              />
            </g>
          </svg>
        );
    }
  };

  if (!showWordmark) {
    return (
      <div style={style} className={`inline-flex shrink-0 items-center justify-center ${className}`}>
        {renderSymbol()}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div style={style} className="shrink-0 w-5 h-5 flex items-center justify-center">
        {renderSymbol()}
      </div>
      <span className="font-black tracking-[0.18em] text-white text-xs uppercase font-sans">
        EYTAA
      </span>
    </div>
  );
}
