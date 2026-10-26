import type { Category, Plan, TargetSet } from '../lib/types'

// Karls Startplan. Wird nur angelegt, wenn ein Plan mit dieser festen ID noch nicht existiert.
// updatedAt = 0: Jede echte (auch spätere) Version aus der Cloud ist automatisch neuer und gewinnt.
// So entsteht nie ein Duplikat und ein frisch angelegter Startplan überschreibt nie bearbeitete Pläne.
type Row = [exerciseId: string, sets: [reps: number, weight: number][]]

const PLANS: { id: string; category: Category; name: string; rows: Row[] }[] = [
  {
    id: 'plan-beine',
    category: 'beine',
    name: 'Beine',
    rows: [
      ['beinbeuger-liegend', [[4, 90], [5, 86]]],
      ['beinpresse', [[10, 240], [6, 240]]],
      ['adduktoren', [[3, 99], [3, 95]]],
      ['abduktoren', [[5, 81], [6, 77]]],
      ['waden', [[6, 100], [7, 95]]],
      ['beinstrecker-einbeinig', [[8, 59], [8, 59]]],
    ],
  },
  {
    id: 'plan-arme',
    category: 'arme',
    name: 'Arme & Schulter',
    rows: [
      ['preacher-curl', [[7, 47.5], [7, 45]]],
      ['trizeps-pushdown', [[6, 23], [5, 23]]],
      ['trizeps-ueber-kopf', [[5, 36], [8, 32]]],
      ['hammer-curl-sitzend', [[6, 17.5], [9, 16]]],
      ['seitheben', [[7, 30], [4, 30]]],
      ['schulterdruecken-multipresse', [[4, 55], [3, 55]]],
      ['hintere-schulter', [[6, 55], [6, 50]]],
    ],
  },
  {
    id: 'plan-brust',
    category: 'brust',
    name: 'Brust & Rücken',
    rows: [
      ['butterfly', [[7, 70], [4, 70]]],
      ['schraegbankdruecken-multipresse', [[7, 27.5], [8, 25]]],
      ['t-bar-rudern', [[6, 70], [4, 70]]],
      ['latzug', [[6, 86], [6, 79]]],
      ['enges-rudern', [[5, 100]]],
      ['enges-latziehen', [[8, 86]]],
      ['cable-crunches', [[7, 77], [8, 73]]],
    ],
  },
]

export const SEED_PLANS: Plan[] = PLANS.map((p) => ({
  id: p.id,
  category: p.category,
  name: p.name,
  updatedAt: 0,
  deleted: false,
  exercises: p.rows.map(([exerciseId, sets], i) => ({
    uid: `${p.id}-${i}`,
    exerciseId,
    note: '',
    sets: sets.map(([reps, weight]): TargetSet => ({ reps, weight })),
  })),
}))

/** Liefert die Startpläne, die lokal noch fehlen (auch gelöschte zählen als vorhanden). */
export function missingSeedPlans(existingIds: Set<string>): Plan[] {
  return SEED_PLANS.filter((p) => !existingIds.has(p.id))
}
