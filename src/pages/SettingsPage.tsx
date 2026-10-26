import { useRef, useState } from 'react'
import { PageHeader } from '../components/ui'
import { localDate } from '../lib/date'
import { useStore, type Theme } from '../state/store'

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="grid rounded-xl bg-zinc-200 p-1 dark:bg-zinc-800" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(([v, label]) => (
        <button
          key={v}
          className={`min-h-10 rounded-lg text-sm font-medium ${value === v ? 'bg-white shadow-sm dark:bg-zinc-600' : 'text-zinc-600 dark:text-zinc-400'}`}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function SettingsPage() {
  const { settings, setSettings, mode, email, sync, syncNow, exportBackup, importBackupText, signOut, cloudAvailable } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  const doExport = async () => {
    const text = await exportBackup()
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gym-app-backup-${localDate()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const doImport = async (file: File) => {
    try {
      const n = await importBackupText(await file.text())
      setMessage(n === 0 ? 'Nichts Neues im Backup – alles war schon aktuell.' : `${n} Einträge aus dem Backup übernommen.`)
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title="Einstellungen" back />

      <section className="card flex flex-col gap-2">
        <h2 className="font-semibold">Gewichtseinheit</h2>
        <Segmented value={settings.unit} options={[['kg', 'kg'], ['lb', 'lb']]} onChange={(unit) => void setSettings({ unit })} />
        <p className="text-sm text-zinc-500">Gespeichert wird intern immer in kg, lb ist nur die Anzeige.</p>
      </section>

      <section className="card flex flex-col gap-2">
        <h2 className="font-semibold">Darstellung</h2>
        <Segmented<Theme>
          value={settings.theme}
          options={[
            ['light', 'Hell'],
            ['dark', 'Dunkel'],
            ['system', 'Wie iPhone'],
          ]}
          onChange={(theme) => void setSettings({ theme })}
        />
      </section>

      <section className="card flex flex-col gap-2">
        <h2 className="font-semibold">Konto & Abgleich</h2>
        {mode === 'user' ? (
          <>
            <p className="text-sm">
              Angemeldet als <strong>{email}</strong>
            </p>
            <p className="text-sm text-zinc-500">
              {sync.lastSyncAt ? `Zuletzt abgeglichen: ${new Date(sync.lastSyncAt).toLocaleTimeString('de-DE')}` : 'Noch nicht abgeglichen'}
              {sync.pending > 0 && ` · ${sync.pending} Änderung(en) ausstehend`}
            </p>
            {sync.error && <p className="text-sm text-red-600 dark:text-red-400">Fehler: {sync.error}</p>}
            <button className="btn btn-secondary" disabled={sync.status === 'syncing'} onClick={() => void syncNow()}>
              Jetzt abgleichen
            </button>
            <button className="btn btn-secondary" disabled={sync.status === 'syncing'} onClick={() => void syncNow(true)}>
              Alles neu aus der Cloud holen
            </button>
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            Gastmodus: Deine Daten liegen nur auf diesem Gerät.
            {cloudAvailable ? ' Melde dich ab und wieder an, um ein Konto zu nutzen.' : ' Cloud ist noch nicht eingerichtet.'} Exportiere regelmäßig ein Backup.
          </p>
        )}
        <button className="btn btn-danger" onClick={() => void signOut()}>
          {mode === 'user' ? 'Abmelden' : 'Gastmodus beenden'}
        </button>
      </section>

      <section className="card flex flex-col gap-2">
        <h2 className="font-semibold">Backup</h2>
        <p className="text-sm text-zinc-500">
          Export speichert alle Daten als JSON-Datei. Import ergänzt nur: Neuere Daten auf dem Gerät werden nie überschrieben.
        </p>
        <button className="btn btn-secondary" onClick={() => void doExport()}>
          Backup exportieren
        </button>
        <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
          Backup importieren
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void doImport(f)
            e.target.value = ''
          }}
        />
        {message && <p className="text-sm">{message}</p>}
      </section>

      <p className="text-center text-xs text-zinc-400">Gym App · Version 1.0</p>
    </div>
  )
}
