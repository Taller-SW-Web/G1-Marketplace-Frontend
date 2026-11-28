/** Ilustraciones SVG decorativas para estados vacíos (aria-hidden; el texto lo da EmptyState). */
const common = { width: 120, height: 96, viewBox: "0 0 120 96", fill: "none", "aria-hidden": true as const, focusable: "false" as const };

export function CartIllustration() {
  return <svg {...common} className="illustration">
    <ellipse cx="60" cy="86" rx="40" ry="5" fill="#1b181214" />
    <path d="M22 22h10l9 42h44l9-30H36" stroke="#1b1812" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M40 34h52l-7 22H45z" fill="#fce3d0" />
    <circle cx="47" cy="76" r="6" fill="#1b1812" />
    <circle cx="81" cy="76" r="6" fill="#1b1812" />
    <path d="M70 8v14m-7-7h14" stroke="#f76707" strokeWidth="4" strokeLinecap="round" className="illustration__spark" />
  </svg>;
}

export function OrdersIllustration() {
  return <svg {...common} className="illustration">
    <ellipse cx="60" cy="86" rx="40" ry="5" fill="#1b181214" />
    <path d="M28 34l32-16 32 16v38L60 86 28 72z" fill="#fce3d0" stroke="#1b1812" strokeWidth="4" strokeLinejoin="round" />
    <path d="M28 34l32 16 32-16M60 50v36" stroke="#1b1812" strokeWidth="4" strokeLinejoin="round" />
    <path d="M44 26l32 16" stroke="#f76707" strokeWidth="4" strokeLinecap="round" />
    <circle cx="96" cy="16" r="6" fill="#c3e504" className="illustration__spark" />
  </svg>;
}

export function TrackingIllustration() {
  return <svg {...common} className="illustration">
    <ellipse cx="60" cy="86" rx="44" ry="5" fill="#1b181214" />
    <path d="M14 30h52v40H14z" fill="#fce3d0" stroke="#1b1812" strokeWidth="4" strokeLinejoin="round" />
    <path d="M66 42h20l14 14v14H66z" fill="#fff" stroke="#1b1812" strokeWidth="4" strokeLinejoin="round" />
    <circle cx="32" cy="74" r="7" fill="#1b1812" />
    <circle cx="86" cy="74" r="7" fill="#1b1812" />
    <path d="M2 40h8M0 50h8M4 60h6" stroke="#f76707" strokeWidth="4" strokeLinecap="round" className="illustration__spark" />
  </svg>;
}
