import { NavLink, Outlet } from 'react-router'
import { useStore } from '../state/store'
import { IconChart, IconDumbbell, IconHome, IconList, IconMore } from './Icons'

const NAV = [
  { to: '/', label: 'Training', icon: IconDumbbell, end: true },
  { to: '/uebersicht', label: 'Übersicht', icon: IconHome, end: false },
  { to: '/verlauf', label: 'Verlauf', icon: IconList, end: false },
  { to: '/fortschritt', label: 'Fortschritt', icon: IconChart, end: false },
  { to: '/mehr', label: 'Mehr', icon: IconMore, end: false },
]

function SyncBadge() {
  const { mode, sync } = useStore()
  if (mode === 'guest') return <span className="text-xs text-zinc-500">Gastmodus · nur lokal</span>
  const text =
    sync.status === 'syncing'
      ? 'Abgleich …'
      : sync.status === 'offline'
        ? `Offline${sync.pending ? ` · ${sync.pending} ausstehend` : ''}`
        : sync.status === 'error'
          ? 'Abgleich fehlgeschlagen'
          : sync.pending > 0
            ? `${sync.pending} ausstehend`
            : 'Synchron'
  const color = sync.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-zinc-500'
  return <span className={`text-xs ${color}`}>{text}</span>
}

export function Layout() {
  return (
    <div className="mx-auto min-h-dvh max-w-3xl">
      <header className="pt-safe sticky top-0 z-20 bg-zinc-100/90 backdrop-blur dark:bg-zinc-950/90">
        <div className="flex h-12 items-center justify-between px-4">
          <span className="text-lg font-semibold tracking-tight">Gym App</span>
          <SyncBadge />
        </div>
      </header>
      <main className="pb-nav px-4 pt-2">
        <Outlet />
      </main>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${
                  isActive ? 'font-semibold text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'
                }`
              }
            >
              <Icon className="size-6" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
