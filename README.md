# Gym App

Schlanker Krafttraining-Tracker für Karls 3er-Split (Beine · Arme & Schulter · Brust & Rücken).
Mobile-first fürs iPhone, funktioniert offline, Cloud-Abgleich über Supabase.

Weitere Doku: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) (Entscheidungen & Regeln) · [CURRENT_STATE.md](CURRENT_STATE.md) (was funktioniert) · [TODO.md](TODO.md) (offene Aufgaben).

## Stack

React + TypeScript + Vite + Tailwind CSS · Supabase (Login + Cloud) · Hosting auf Vercel.
Laufzeit-Abhängigkeiten: nur `react`, `react-dom`, `react-router`, `@supabase/supabase-js`.

## Lokal starten

Voraussetzung: Node.js 22+.

```bash
npm install
npm run dev        # Entwicklungsserver, http://localhost:5173
npm test           # Tests (Sync, letzte Werte, Wochenserie, Datum …)
npm run build      # Typprüfung + Produktions-Build nach dist/
```

Ohne `.env` läuft die App automatisch im **Gastmodus** (nur lokal). Für Login/Cloud:
`.env.example` nach `.env` kopieren und die Supabase-Werte eintragen.

Am iPhone im selben WLAN testen: `npm run dev -- --host` und die angezeigte Netzwerk-Adresse öffnen.

## Supabase einrichten (einmalig)

1. supabase.com → **New project** (Name `gym-app`, Region Frankfurt). DB-Passwort im Passwortmanager speichern.
2. **SQL Editor** → Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen → **Run**.
3. **Project Settings → API**: `Project URL` und `anon public` Key kopieren (niemals den `service_role` Key!).
4. **Authentication → Sign In / Providers → Email**: aktiviert lassen. „Confirm email“ darf an bleiben.
5. **Authentication → URL Configuration → Site URL**: die Vercel-Adresse eintragen.

## Deployment (Vercel über GitHub)

1. Repo auf GitHub anlegen (privat, ohne README) und pushen.
2. vercel.com → **Add New → Project** → Repo importieren. Framework: Vite (automatisch).
3. **Environment Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → Deploy.
4. Jeder Push auf `main` wird automatisch veröffentlicht.

`vercel.json` sorgt dafür, dass Unterseiten (z. B. `/verlauf`) auch beim Neuladen funktionieren.

## Aufs iPhone

Vercel-Adresse in Safari öffnen → Teilen → **Zum Home-Bildschirm**. Wichtig: Nur so behält Safari die
lokalen Daten dauerhaft. Icons neu erzeugen: `npm run icons`.

## Ordnerstruktur

```
src/
  lib/         reine Logik (Datum, Zahlen, Training, Statistik) + Tests
  data/        eingebaute Übungsliste, Karls Startplan
  sync/        lokale Datenbank (IndexedDB), Abgleich, Backup, Supabase + Tests
  state/       App-Zustand (store.tsx)
  components/  wiederverwendbare Bausteine (Übungsauswahl, Trainings-Editor …)
  pages/       eine Datei pro Seite
supabase/schema.sql   Datenbank-Schema
public/               Manifest, Icons, Service Worker
```
