import { useState, type FormEvent } from 'react'
import { useStore } from '../state/store'

export function WelcomePage() {
  const { signIn, signUp, startGuest, cloudAvailable } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setMessage(null)
    try {
      await fn()
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onLogin = (e: FormEvent) => {
    e.preventDefault()
    void run(() => signIn(email.trim(), password))
  }

  return (
    <div className="pt-safe mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Gym App</h1>
        <p className="mt-1 text-zinc-500">Dein Krafttraining-Tracker</p>
      </div>
      {cloudAvailable && (
        <form className="card flex flex-col gap-3" onSubmit={onLogin}>
          <input className="field" type="email" autoComplete="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            placeholder="Passwort (mind. 6 Zeichen)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <button className="btn btn-primary" type="submit" disabled={busy}>
            Anmelden
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={busy || !email || password.length < 6}
            onClick={() =>
              void run(async () => {
                const res = await signUp(email.trim(), password)
                if (res === 'confirm-email') setMessage('Fast fertig: Bitte bestätige die E-Mail, die dir geschickt wurde, und melde dich dann an.')
              })
            }
          >
            Neues Konto erstellen
          </button>
          {message && <p className="text-sm">{message}</p>}
        </form>
      )}
      <button className="btn btn-secondary" onClick={() => void startGuest()} disabled={busy}>
        Ohne Konto nutzen (nur auf diesem Gerät)
      </button>
    </div>
  )
}
