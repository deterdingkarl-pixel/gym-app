# Aktueller Stand

Stand: 26.10.2026 – Version 1 komplett gebaut, noch **nicht am iPhone getestet**, noch **nicht deployed**.

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

## Gebaut, aber noch ungetestet

- Alles am echten iPhone (Tastatur, Safe-Area, Homescreen-Icon, Offline-Start)
- Login/Registrierung und Cloud-Abgleich mit echtem Supabase-Projekt (Logik ist per Tests abgesichert,
  die Anbindung an Supabase selbst noch nicht)
- Übung tauschen/hinzufügen, Satz +/−, Übung entfernen im Training (per Klick)
- Plan bearbeiten (Reihenfolge, Zielwerte, Notizen), eigene Übungen anlegen/bearbeiten/löschen
- Körpergewicht eintragen/löschen und Diagramm
- Fortschritts-Diagramm mit echten Daten über mehrere Trainings
- Backup Export/Import, kg/lb-Umschaltung, Hell/Dunkel
- Vercel-Deployment und Neuladen von Unterseiten dort

## Bekannte Einschränkungen

- Bearbeiten desselben Trainings gleichzeitig auf zwei Geräten: die zuletzt gespeicherte Version gewinnt (ganzes Training).
- Einstellungen (kg/lb, Theme) werden nicht zwischen Geräten synchronisiert.
