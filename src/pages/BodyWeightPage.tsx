import { useState } from 'react'
import { IconTrash } from '../components/Icons'
import { LineChart } from '../components/LineChart'
import { Empty, NumberField, PageHeader } from '../components/ui'
import { formatDate, isValidLocalDate, localDate } from '../lib/date'
import { formatNumber, fromDisplayWeight, toDisplayWeight } from '../lib/numbers'
import { newId } from '../lib/types'
import { useStore } from '../state/store'

export function BodyWeightPage() {
  const { data, save, remove, settings } = useStore()
  const unit = settings.unit
  const [date, setDate] = useState(localDate())
  const [value, setValue] = useState<number | null>(null)
  const entries = data.bodyweights
    .filter((b) => !b.deleted)
    .sort((a, b) => (a.date === b.date ? b.updatedAt - a.updatedAt : a.date < b.date ? 1 : -1))

  const add = async () => {
    const kg = fromDisplayWeight(value, unit)
    if (kg === null || kg <= 0 || !isValidLocalDate(date)) return
    await save('bodyweights', { id: newId(), date, weight: kg, updatedAt: 0, deleted: false })
    setValue(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title="Körpergewicht" back />
      <div className="card flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Datum" />
          <NumberField label={`Gewicht in ${unit}`} value={value} onChange={setValue} />
        </div>
        <button className="btn btn-primary" disabled={value === null} onClick={() => void add()}>
          Eintragen ({unit})
        </button>
      </div>

      {entries.length > 1 && (
        <div className="card">
          <LineChart
            unit={unit}
            series={[
              {
                name: 'Körpergewicht',
                colorClass: 'text-zinc-800 dark:text-zinc-200',
                points: entries.map((e) => ({ date: e.date, value: toDisplayWeight(e.weight, unit)! })),
              },
            ]}
          />
        </div>
      )}

      {entries.length === 0 ? (
        <Empty>Noch keine Einträge.</Empty>
      ) : (
        <ul className="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
          {entries.map((e) => (
            <li key={e.id} className="flex min-h-12 items-center gap-3 pl-4">
              <span className="flex-1">{formatDate(e.date)}</span>
              <span className="font-medium tabular-nums">
                {formatNumber(toDisplayWeight(e.weight, unit), 1)} {unit}
              </span>
              <button
                className="flex size-12 items-center justify-center text-zinc-400"
                aria-label="Eintrag löschen"
                onClick={() => window.confirm('Eintrag löschen?') && void remove('bodyweights', e.id)}
              >
                <IconTrash className="size-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
