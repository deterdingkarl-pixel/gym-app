# Aktueller Stand

Stand: 26.10.2026 – Version 1 komplett gebaut und online unter https://gym-app-rho-five-69.vercel.app.
Supabase-Projekt `gym-app` (Ref `khgebmmcriqcmqpnookn`, Region eu-west-2/London, Organisation „iron log“) ist
eingerichtet und mit Vercel verbunden. Karls Konto existiert; Login und Abgleich iPhone ↔ Computer
von Karl getestet. Die übrigen Funktionen sind am iPhone noch **nicht systematisch getestet** (siehe TODO.md).

## Geprüft und funktioniert

- `npm test`: alle Tests grün (Datum/UTC, Zahlen mit Komma, letzte Werte, Entwurf aus Plan, Dauer,
  Startplan ohne Duplikate, Wochenserie, Fortschritt/Bestleistungen, Sync-Regeln, Backup).
- `npm run build`: fehlerfrei.
- Im Browser (iPhone-Größe 375 px, lokal, Gastmodus) geprüft:
  - Startseite mit den drei Kategorien und freiem Training
  - Beine öffnen → Startwerte aus dem Plan vorbelegt (z. B. 90 × 4 / 86 × 5)
  - Wert ändern (Komma „92,5“) → automatisch gespeichert, nach Neuladen noch da, Training wird fortgesetzt, Dauer läuft
  - Übersicht, Verlauf, Fortschritt, Pläne, Plan bearbeiten, Übungen, Körpergewicht, Einstellungen laden ohne Fehler
  - Kein seitliches Überlaufen auf 375 px
- Vercel: Deployment läuft, direkter Aufruf von `/verlauf` funktioniert, Manifest/Icon/Service Worker werden ausgeliefert
- Supabase: Schema ausgeführt; ohne Anmeldung wird der Zugriff auf `records` abgewiesen (401 „permission denied“); Auth-Dienst erreichbar
- Von Karl getestet: Konto anlegen + E-Mail-Bestätigung, Login, Abgleich zwischen iPhone und Computer

## Gebaut, aber noch ungetestet

- Alles am echten iPhone (Tastatur, Safe-Area, Homescreen-Icon, Offline-Start)
- Abmelden, Gastmodus → Konto (Übernahme-Rückfrage), „Alles neu aus der Cloud holen“
- Übung tauschen/hinzufügen, Satz +/−, Übung entfernen im Training (per Klick)
- Plan bearbeiten (Reihenfolge, Zielwerte, Notizen), eigene Übungen anlegen/bearbeiten/löschen
- Körpergewicht eintragen/löschen und Diagramm
- Fortschritts-Diagramm mit echten Daten über mehrere Trainings
- Backup Export/Import, kg/lb-Umschaltung, Hell/Dunkel

## Bekannte Einschränkungen

- Bearbeiten desselben Trainings gleichzeitig auf zwei Geräten: die zuletzt gespeicherte Version gewinnt (ganzes Training).
- Einstellungen (kg/lb, Theme) werden nicht zwischen Geräten synchronisiert.
