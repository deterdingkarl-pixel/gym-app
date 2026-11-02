# TODO

Nur abhaken, was wirklich getestet funktioniert (am besten am iPhone).

## Einrichtung (Karl)

- [x] GitHub-Repo `gym-app` anlegen und Code pushen
- [x] Vercel-Projekt aus dem Repo anlegen, erste Version online (https://gym-app-rho-five-69.vercel.app)
- [x] Supabase-Projekt anlegen, `supabase/schema.sql` ausführen, Env-Variablen in Vercel + `.env`
- [x] Supabase: Site URL auf die Vercel-Adresse setzen
- [x] Eigenes Konto in der App anlegen (Karl) und E-Mail bestätigen

## Garmin

- [ ] Karl: Schlüssel in Garmin Connect erstellen, `GARMIN_API_KEY` und `GARMIN_ALLOWED_EMAIL` in Vercel eintragen
- [ ] Mit echten Daten prüfen: Welche Werte kommen an, welche zeigen „–“? Feldnamen in `src/lib/garmin.ts` anpassen
- [ ] Fremdes Konto bekommt online keine Daten, ohne Anmeldung ebenfalls nicht

## Test am iPhone (Version 1)

- [ ] App zum Home-Bildschirm hinzufügen, Icon und Name „Gym App“ prüfen
- [ ] Beine/Arme/Brust öffnen: Startwerte stimmen mit dem Plan überein
- [x] Werte ändern, ✓ tippen, App schließen und neu öffnen → alles noch da
- [x] Nächstes Training derselben Kategorie zeigt die Werte vom letzten Mal grau, Tippen überschreibt sie
- [ ] Übung tauschen, hinzufügen, entfernen; Satz hinzufügen/entfernen
- [ ] Datum ändern (Nachtragen)
- [ ] Training kurz nach Mitternacht landet am richtigen Tag
- [ ] Freies Training
- [ ] Verlauf: Training öffnen, bearbeiten, löschen
- [ ] Pläne: Reihenfolge, Zielwerte, Notiz, Übung hinzufügen (Liste, Suche, eigene Übung)
- [ ] Übungsbibliothek: Suche, Filter, eigene Übung anlegen/bearbeiten/löschen
- [x] Fortschritt: Reiter je Plan, Übung öffnen
- [ ] Fortschritt: Diagramm und Bestleistungen über mehrere echte Trainings
- [ ] Übersicht: Wochenserie, Kalender, letzte Einheit
- [ ] Körpergewicht: eintragen, Verlauf, löschen
- [ ] Einstellungen: kg/lb, Hell/Dunkel, Backup exportieren und importieren
- [x] Login und Abgleich iPhone ↔ Computer
- [ ] Abmelden (inkl. Warnung bei nicht hochgeladenen Änderungen)
- [ ] Offline im Gym: App startet, Einträge werden später hochgeladen

## Später (nicht Version 1)

- [ ] Körpermaße
- [ ] Passwort zurücksetzen
- [ ] Undo / Papierkorb für gelöschte Trainings (Lösch-Markierungen sind schon vorhanden)
- [ ] Drag-and-Drop in Plänen
