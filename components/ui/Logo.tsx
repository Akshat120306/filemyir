export default function Logo({ size = 36, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shield background */}
        <path d="M20 2L4 9v10c0 9.4 6.8 18.2 16 20.4C29.2 37.2 36 28.4 36 19V9L20 2z" fill="#1E3A8A" />
        <path d="M20 2L4 9v10c0 9.4 6.8 18.2 16 20.4C29.2 37.2 36 28.4 36 19V9L20 2z" fill="url(#shieldGrad)" />

        {/* Checkmark */}
        <path d="M11 20.5l5.5 5.5 3-3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Upward arrow */}
        <path d="M22 25V15m0 0l-3.5 3.5M22 15l3.5 3.5" stroke="#FCD34D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Indian tricolor accent at bottom of shield */}
        <path d="M9.5 30.5 Q20 34 30.5 30.5" stroke="#FF9933" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M8 32.5 Q20 36 32 32.5" stroke="white" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6" />
        <path d="M10 34 Q20 37.5 30 34" stroke="#138808" strokeWidth="1.5" strokeLinecap="round" fill="none" />

        <defs>
          <linearGradient id="shieldGrad" x1="4" y1="2" x2="36" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <div>
          <p className="font-bold leading-tight" style={{ color: '#F1F5F9', fontSize: size * 0.38, letterSpacing: '-0.3px' }}>FilemyITR</p>
        </div>
      )}
    </div>
  )
}
