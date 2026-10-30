/** Dibujitos a mano alzada, en el color de la marca. */

const trazo = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function Galleta({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path
        d="M32 7c6 1 8 4 13 6s11 0 11 6-3 8-2 13 4 9 0 13-9 2-13 5-6 8-12 8-8-4-13-6-11 0-12-6 3-8 2-13-4-9 0-13 9-2 13-5S26 6 32 7Z"
        {...trazo}
      />
      <circle cx="25" cy="26" r="2.5" fill="currentColor" />
      <circle cx="39" cy="24" r="2" fill="currentColor" />
      <circle cx="35" cy="39" r="3" fill="currentColor" />
      <circle cx="24" cy="41" r="2" fill="currentColor" />
    </svg>
  );
}

export function Taza({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M12 26h34v14a12 12 0 0 1-12 12H24a12 12 0 0 1-12-12V26Z" {...trazo} />
      <path d="M46 30h4a7 7 0 0 1 0 14h-4" {...trazo} />
      <path d="M22 16c2-3-2-5 0-8M32 16c2-3-2-5 0-8" {...trazo} />
    </svg>
  );
}

export function Corazon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path
        d="M32 52S10 39 10 25a11 11 0 0 1 22-4 11 11 0 0 1 22 4c0 14-22 27-22 27Z"
        {...trazo}
      />
    </svg>
  );
}

/** Óvalo dibujado a mano para los sellos sobre las fotos. */
export function Ovalo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 56" className={className} preserveAspectRatio="none" aria-hidden>
      <path
        d="M60 4C26 4 4 13 4 28s23 24 56 24 56-10 56-24S94 4 60 4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
