import { Link } from 'react-router'
import { IconChevron } from '../components/Icons'

const LINKS = [
  { to: '/plaene', title: 'Trainingspläne', text: 'Übungen, Zielwerte und Notizen' },
  { to: '/uebungen', title: 'Übungsbibliothek', text: 'Suchen und eigene Übungen verwalten' },
  { to: '/koerpergewicht', title: 'Körpergewicht', text: 'Eintragen und Verlauf' },
  { to: '/einstellungen', title: 'Einstellungen', text: 'Einheit, Darstellung, Backup, Konto' },
]

export function MorePage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold tracking-tight">Mehr</h1>
      <ul className="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
        {LINKS.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="flex min-h-16 items-center gap-3 px-4 py-3">
              <div className="flex-1">
                <div className="font-medium">{l.title}</div>
                <div className="text-sm text-zinc-500">{l.text}</div>
              </div>
              <IconChevron className="size-5 text-zinc-400" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
