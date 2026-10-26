// Schlichte Strich-Icons (inline, keine Icon-Bibliothek nötig)
type P = { className?: string }
const base = (className = 'size-6') => ({
  className,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export const IconDumbbell = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
  </svg>
)
export const IconHome = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />
  </svg>
)
export const IconList = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </svg>
)
export const IconChart = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M3 3v18h18M7 15l4-4 3 3 6-7" />
  </svg>
)
export const IconMore = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="5" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="19" cy="12" r="1.2" />
  </svg>
)
export const IconCheck = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)
export const IconPlus = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const IconMinus = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M5 12h14" />
  </svg>
)
export const IconTrash = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
)
export const IconSwap = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
  </svg>
)
export const IconUp = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="m6 15 6-6 6 6" />
  </svg>
)
export const IconDown = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)
export const IconBack = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="m15 18-6-6 6-6" />
  </svg>
)
export const IconClose = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
export const IconChevron = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
)
