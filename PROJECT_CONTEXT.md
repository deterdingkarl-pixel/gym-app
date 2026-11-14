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

- **Vorbelegung:** Beim Öffnen einer Kategorie stehen die Werte vom letzten Training dieser Übung grau im Feld
  (als Platzhalter, nicht als Text). Gibt es keine Historie: Zielwerte aus dem Plan. Sätze: wie beim letzten Mal,
  mindestens aber so viele wie im Plan (fehlende kommen aus dem Plan).
- **Überschreiben:** Tippen ersetzt den grauen Wert sofort, nichts muss gelöscht oder markiert werden. Das gilt für
  alle Zahlenfelder (`NumberField`). Feld wieder leeren = bisheriger Wert bleibt.
- **Erledigt:** Ein Satz zählt erst, wenn ✓ getippt oder ein Wert geändert wird. Nur erledigte Sätze zählen
  für Historie, Fortschritt, Wochenserie und „letzte Werte“.
- **Fortschritt:** Reiter je Plan (Freies Training nur bei Übungen außerhalb der Pläne). Liste zeigt alle Plan-Übungen,
  auch untrainierte, plus zusätzlich in der Kategorie trainierte. Antippen öffnet den Verlauf der Übung (`/fortschritt/:id`).
- **Speichern:** Ein neues Training wird erst bei der ersten Eingabe gespeichert; danach jede Änderung sofort.
- **Gleiche Kategorie am selben Tag** → das bestehende Training wird fortgesetzt.
- **Live-Tracking:** Die Zeit läuft nur nach „Training starten“ und bis „Stopp“ (`liveTracked`), auch bei geschlossener App,
  weil sie immer aus Startzeit und Uhr berechnet wird. Nur ein Training läuft gleichzeitig. Eine Leiste zeigt es auf jeder Seite.
  Beim Stoppen lässt sich die Dauer anpassen; „Fortsetzen“ zählt die Pause nicht mit; Dauer kann von Hand gesetzt werden.
- **Stoppen vergessen:** Kein Eintrag seit 45 min oder insgesamt über 2,5 h → gelber Hinweis in der Leiste mit
  „Bis zum letzten Eintrag beenden“, „Anders beenden“, „Läuft noch“ (30 min Ruhe, nur auf diesem Gerät). `looksForgotten` in `training.ts`.
- **Pausen-Timer:** Startet beim Abhaken eines Satzes, nur bei laufendem Training. Länge in den Einstellungen (Standard 2 min,
  Einstellung nur pro Gerät), ±15 s in der Leiste. Gespeichert wird nur das Ende (`localStorage`, nicht abgeglichen), läuft also
  nach dem Schließen weiter. Kein Ton (Karl will keine Töne); am Ende wird die Anzeige grün.
  Kein Steigerungsvorschlag – Karl will das nicht (trainiert in 4–8 Wdh. und entscheidet selbst).
  Ältere Trainings ohne `liveTracked` enden am letzten Eintrag.
- **Ruhetage:** eigene Einträge (`restdays`, ID `rest-<Datum>`). Tag mit Training oder Ruhetag = grün, sonst ab dem ersten
  Eintrag „ausgelassen“ = rot; heute erst, wenn der Tag vorbei ist (`src/lib/activity.ts`).
- **Statistik** (Fortschritt → Statistik): Wochenbalken für Dauer, Volumen, Wiederholungen; Vergleich mit dem Zeitraum davor;
  Spinnennetz mit erledigten Sätzen je Muskelgruppe.
- **Studio:** Gesammelte Stunden = Dauer aller abgeschlossenen Trainings. Ausgegeben wird nicht gespeichert, sondern aus Geräten
  und Ausbaustufe berechnet (`src/lib/studio.ts`); Entfernen gibt die Stunden zurück. Katalog mit festen IDs in
  `src/data/equipment.ts`, Geräte sind selbst gezeichnet (Quader, `src/lib/iso.ts`). Fläche 4×4, je Erweiterung +2 (bis 12×12).
- **Navigation:** Training, Übersicht, Fortschritt, Studio, Garmin, Mehr. Der Verlauf liegt unter „Mehr“ und in der Übersicht.
- **Neue Datentypen:** zuerst `supabase/schema.sql` in Supabase ausführen, dann die App veröffentlichen (sonst scheitert das Hochladen).
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

## Garmin (`api/`, `src/lib/garmin.ts`, `src/pages/GarminPage.tsx`)

- Offizielle Garmin Personal API mit persönlichem Schlüssel (nur eigene Daten, nur lesen, nur Abholen). Kein Passwort-Login, keine inoffiziellen Bibliotheken.
- **Der Schlüssel bleibt auf dem Server** (`GARMIN_API_KEY`, nie mit `VITE_`). Die App ruft nur `/api/garmin` auf.
- **Nur `GARMIN_ALLOWED_EMAIL` darf abrufen.** Registrierung in der App ist offen, „angemeldet“ allein reicht also nicht. Fehlt die Variable, bleibt alles gesperrt.
- „Live“ heißt: so frisch wie die letzte Uhr-Synchronisierung. Abruf beim Öffnen, beim Zurückkehren in die App, alle 5 Minuten bei offenem Reiter, per Knopf. Der Server fragt Garmin höchstens einmal pro Minute.
- Der letzte Stand liegt lokal in IndexedDB (`meta`), wird nicht in die Cloud synchronisiert und beim Abmelden gelöscht.
- Garmin-Daten werden nicht mit den Trainings der App verknüpft. Die Feldnamen in `src/lib/garmin.ts` stammen aus echten Antworten; fehlt etwas, zeigt die App „–“.

## Technik

- PWA: `public/manifest.webmanifest`, Icons per `npm run icons`, kleiner Service Worker `public/sw.js`
  (App startet auch ohne Netz). `navigator.storage.persist()` wird angefragt.
- Safari löscht Webseiten-Daten nach ~7 Tagen ohne Nutzung, **außer** die App liegt auf dem Homescreen.
- Routing: `react-router`, Rewrite in `vercel.json`.
