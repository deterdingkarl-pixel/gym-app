# Projekt-Kontext – dauerhafte Entscheidungen und Regeln

Diese Datei ist für jeden, der weiterarbeitet (auch andere Claude-Chats). Vor Änderungen lesen.

## Nutzer & Zweck

- Karl, nutzt die App im Gym fast nur am iPhone. Oberfläche komplett **Deutsch**.
- Fester 3er-Split: **Beine**, **Arme & Schulter**, **Brust & Rücken**. Ziel: 4 Trainingstage/Woche.
- Meist 2 Sätze pro Übung, jeder Satz mit eigenem Gewicht und eigenen Wiederholungen.
- Leitlinie: lieber weniger Features, dafür zuverlässig. Möglichst wenig Tippen im Training.

## Harte Regeln

1. **Keine Beispieldaten. Nie.** Einziger Seed: Karls Startplan (`src/data/seedPlans.ts`), feste IDs
   `plan-beine`, `plan-arme`, `plan-brust`, `updatedAt = 0`. Wird nur angelegt, wenn die ID lokal fehlt.
2. **Kein Datenverlust durch Sync.** Pro Eintrag gewinnt die neuere Version (`updatedAt`), ältere Cloud-Daten
   überschreiben nie neuere lokale. Ein Ladefehler ändert lokal nichts. Siehe „Sync“ unten.
3. **Datum = lokaler Kalendertag `YYYY-MM-DD`** (`src/lib/date.ts`). Nie `toISOString()` für Tage.
4. **Der Plan wird beim Training nie verändert.** „Letzte Werte“ werden immer frisch aus der Historie berechnet.
5. Gewichte werden **intern immer in kg** gespeichert; lb ist nur Anzeige.
6. Doku nur in README.md, PROJECT_CONTEXT.md, CURRENT_STATE.md, TODO.md. Keine losen Notiz-Dateien.
7. Supabase-Zugangsdaten nur über Env-Variablen. Nie den `service_role`-Key im Frontend.
8. Keine unnötigen Abhängigkeiten (Diagramme, Icons, IndexedDB-Zugriff sind selbst geschrieben).
9. `npm test` und `npm run build` müssen grün sein, bevor etwas als fertig gilt.

## Fachliche Entscheidungen (mit Karl abgestimmt bzw. als Standard gesetzt)

- **Vorbelegung:** Beim Öffnen einer Kategorie stehen die Werte vom letzten Training dieser Übung da
  (grau). Gibt es keine Historie: Zielwerte aus dem Plan. Die Satzanzahl kommt ebenfalls vom letzten Mal.
- **Erledigt:** Ein Satz zählt erst, wenn ✓ getippt oder ein Wert geändert wird. Nur erledigte Sätze zählen
  für Historie, Fortschritt, Wochenserie und „letzte Werte“.
- **Speichern:** Ein neues Training wird erst bei der ersten Eingabe gespeichert; danach jede Änderung sofort.
- **Gleiche Kategorie am selben Tag** → das bestehende Training wird fortgesetzt.
- **Dauer:** vom ersten Eintrag bis jetzt, solange das Training läuft (letzter Eintrag < 3 h her und nicht
  „Fertig“ getippt). Sonst bis zum letzten Eintrag bzw. „Fertig“. Nachgetragene Trainings haben keine Dauer.
- **Wochenserie:** Wochen Mo–So mit ≥ 4 verschiedenen Trainingstagen hintereinander. Die laufende Woche
  zählt, sobald 4 Tage erreicht sind, und unterbricht die Serie nicht, solange sie läuft.
- **1RM:** Epley-Formel `Gewicht × (1 + Wdh./30)`.
- **Übungsbibliothek:** eingebaute, kuratierte deutsche Liste (`src/data/exercises.ts`, ~95 Übungen, offline,
  feste IDs – nie ändern). Eigene Übungen als synchronisierte Einträge (ID `c-…`). Namen sind eindeutig
  (Groß-/Kleinschreibung egal) → keine Duplikate. „Enges Rudern“ und „Enges Latziehen“ sind zwei Übungen.
- **Login:** E-Mail + Passwort (kein Magic Link – öffnet am iPhone Safari statt der Homescreen-App).
- **Gastmodus → Login:** Rückfrage, ob die Gastdaten ins Konto übernommen werden.
- **Abmelden** löscht die lokalen Daten (nach Warnung, falls noch nicht alles hochgeladen ist).
- **Einstellungen** (kg/lb, Hell/Dunkel) sind nur lokal pro Gerät, nicht synchronisiert.

## Datenmodell (`src/lib/types.ts`)

Vier Tabellen, jeder Eintrag hat `id`, `updatedAt` (ms), `deleted` (Lösch-Markierung), lokal `dirty`:

- `exercises` – nur eigene Übungen (eingebaute stehen im Code)
- `plans` – genau drei, je Kategorie; Übungen mit Zielsätzen und Notiz
- `workouts` – Datum, Art (`beine|arme|brust|frei`), Start/letzter Eintrag/Fertig, Übungen mit Sätzen
- `bodyweights` – Datum + Gewicht (kg)

Lokal: IndexedDB (`src/sync/idb.ts`), eine Object-Store pro Tabelle + `meta` (Einstellungen, Sync-Stand, Modus).
Cloud: eine Supabase-Tabelle `records` (`user_id, kind, id, data, updated_at, deleted, server_updated_at`).

## Sync (`src/sync/engine.ts`, Tests in `src/sync/sync.test.ts`)

- Lokal ist die Hauptquelle; die App funktioniert komplett offline.
- Jede Änderung: `updatedAt = jetzt` (streng steigend), `dirty = true`, sofort in IndexedDB.
- Abgleich (1,5 s nach Änderung, beim Öffnen/Zurückkehren, bei Netz-Rückkehr, jede Minute):
  1. **Holen:** Zeilen mit `server_updated_at` > letzter Stand (−60 s Überlappung). Jede Zeile einzeln über
     `resolveIncoming`: nur **strikt neuere** Versionen ersetzen den lokalen Eintrag.
  2. **Hochladen:** alle `dirty`-Einträge (Upsert). `dirty` wird nur entfernt, wenn sich der Eintrag
     während des Uploads nicht weiter geändert hat.
- Server-Trigger `records_guard` verwirft Updates mit älterem `updated_at` (doppelte Absicherung).
- Löschen = `deleted: true` (Tombstone), nie echtes Löschen → Gelöschtes taucht nicht wieder auf.
- Startplan mit `updatedAt = 0` verliert immer gegen jede echte Cloud-Version → keine Duplikate, kein Überschreiben.
- Backup-Import nutzt dieselbe Regel und markiert übernommene Einträge als `dirty`.

## Technik

- PWA: `public/manifest.webmanifest`, Icons per `npm run icons`, kleiner Service Worker `public/sw.js`
  (App startet auch ohne Netz). `navigator.storage.persist()` wird angefragt.
- Safari löscht Webseiten-Daten nach ~7 Tagen ohne Nutzung, **außer** die App liegt auf dem Homescreen.
- Routing: `react-router`, Rewrite in `vercel.json`.
