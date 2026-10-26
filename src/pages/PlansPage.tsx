import { Link } from 'react-router'
import { IconChevron } from '../components/Icons'
import { PageHeader } from '../components/ui'
import { CATEGORIES } from '../lib/types'
import { useStore } from '../state/store'

export function PlansPage() {
  const { data, exerciseById } = useStore()
  const plans = CATEGORIES.map((c) => data.plans.find((p) => p.category === c.id && !p.deleted)).filter((p) => p !== undefined)

  return (
    <div>
      <PageHeader title="Trainingspläne" back />
      <ul className="flex flex-col gap-3">
        {plans.map((p) => (
          <li key={p.id}>
            <Link to={`/plaene/${p.id}`} className="card flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold">{p.name}</div>
                <div className="truncate text-sm text-zinc-500">
                  {p.exercises.length} Übungen · {p.exercises.map((e) => exerciseById.get(e.exerciseId)?.name).join(', ')}
                </div>
              </div>
              <IconChevron className="size-5 shrink-0 text-zinc-400" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
