import type { Exercise, Muscle } from '../lib/types'

// Eingebaute Übungsbibliothek (fest in der App, offline verfügbar, nicht synchronisiert).
// Die IDs sind dauerhaft – niemals ändern, sonst verlieren Trainings ihre Zuordnung.
// Eigene Übungen werden als Einträge in der Tabelle "exercises" gespeichert.
const LIST: [id: string, name: string, muscle: Muscle][] = [
  // Beine
  ['beinbeuger-liegend', 'Beinbeuger liegend', 'Beine'],
  ['beinbeuger-sitzend', 'Beinbeuger sitzend', 'Beine'],
  ['beinpresse', 'Beinpresse', 'Beine'],
  ['adduktoren', 'Adduktoren', 'Beine'],
  ['abduktoren', 'Abduktoren', 'Gesäß'],
  ['beinstrecker', 'Beinstrecker', 'Beine'],
  ['beinstrecker-einbeinig', 'Beinstrecker einbeinig', 'Beine'],
  ['kniebeuge', 'Kniebeuge (Langhantel)', 'Beine'],
  ['frontkniebeuge', 'Frontkniebeuge', 'Beine'],
  ['kniebeuge-multipresse', 'Kniebeuge Multipresse', 'Beine'],
  ['hackenschmidt', 'Hackenschmidt-Kniebeuge', 'Beine'],
  ['goblet-squat', 'Goblet Squat', 'Beine'],
  ['bulgarian-split-squat', 'Bulgarian Split Squat', 'Beine'],
  ['ausfallschritte', 'Ausfallschritte', 'Beine'],
  ['rumaenisches-kreuzheben', 'Rumänisches Kreuzheben', 'Beine'],
  ['hip-thrust', 'Hip Thrust', 'Gesäß'],
  ['glute-kickback-kabel', 'Glute Kickback am Kabel', 'Gesäß'],
  ['waden', 'Waden', 'Waden'],
  ['wadenheben-stehend', 'Wadenheben stehend', 'Waden'],
  ['wadenheben-sitzend', 'Wadenheben sitzend', 'Waden'],
  ['wadenheben-beinpresse', 'Wadenheben an der Beinpresse', 'Waden'],
  // Brust
  ['bankdruecken', 'Bankdrücken (Langhantel)', 'Brust'],
  ['bankdruecken-kurzhantel', 'Bankdrücken Kurzhantel', 'Brust'],
  ['bankdruecken-multipresse', 'Bankdrücken Multipresse', 'Brust'],
  ['schraegbankdruecken', 'Schrägbankdrücken (Langhantel)', 'Brust'],
  ['schraegbankdruecken-kurzhantel', 'Schrägbankdrücken Kurzhantel', 'Brust'],
  ['schraegbankdruecken-multipresse', 'Schrägbankdrücken Multipresse', 'Brust'],
  ['brustpresse', 'Brustpresse Maschine', 'Brust'],
  ['butterfly', 'Butterfly', 'Brust'],
  ['kabelzug-crossover', 'Kabelzug Crossover', 'Brust'],
  ['fliegende-kurzhantel', 'Fliegende Kurzhantel', 'Brust'],
  ['dips', 'Dips', 'Brust'],
  ['liegestuetze', 'Liegestütze', 'Brust'],
  // Rücken
  ['latzug', 'Latzug', 'Rücken'],
  ['enges-latziehen', 'Enges Latziehen', 'Rücken'],
  ['latzug-untergriff', 'Latzug Untergriff', 'Rücken'],
  ['klimmzuege', 'Klimmzüge', 'Rücken'],
  ['klimmzuege-assistiert', 'Klimmzüge assistiert', 'Rücken'],
  ['t-bar-rudern', 'T-Bar Rudern', 'Rücken'],
  ['enges-rudern', 'Enges Rudern', 'Rücken'],
  ['rudern-kabel-sitzend', 'Rudern am Kabel sitzend', 'Rücken'],
  ['rudern-maschine', 'Rudern Maschine', 'Rücken'],
  ['langhantelrudern', 'Langhantelrudern', 'Rücken'],
  ['kurzhantelrudern', 'Kurzhantelrudern einarmig', 'Rücken'],
  ['kreuzheben', 'Kreuzheben', 'Rücken'],
  ['ueberzuege-kabel', 'Überzüge am Kabel', 'Rücken'],
  ['rueckenstrecker', 'Rückenstrecker', 'Rücken'],
  ['shrugs', 'Shrugs', 'Rücken'],
  // Schultern
  ['schulterdruecken-multipresse', 'Schulterdrücken Multipresse', 'Schultern'],
  ['schulterdruecken-kurzhantel', 'Schulterdrücken Kurzhantel', 'Schultern'],
  ['schulterdruecken-maschine', 'Schulterdrücken Maschine', 'Schultern'],
  ['military-press', 'Military Press (Langhantel)', 'Schultern'],
  ['seitheben', 'Seitheben', 'Schultern'],
  ['seitheben-kabel', 'Seitheben am Kabel', 'Schultern'],
  ['seitheben-maschine', 'Seitheben Maschine', 'Schultern'],
  ['frontheben', 'Frontheben', 'Schultern'],
  ['hintere-schulter', 'Hintere Schulter', 'Schultern'],
  ['face-pulls', 'Face Pulls', 'Schultern'],
  ['reverse-butterfly', 'Reverse Butterfly', 'Schultern'],
  ['aufrechtes-rudern', 'Aufrechtes Rudern', 'Schultern'],
  // Bizeps
  ['preacher-curl', 'Preacher Curl', 'Bizeps'],
  ['langhantel-curl', 'Langhantel-Curl', 'Bizeps'],
  ['sz-curl', 'SZ-Curl', 'Bizeps'],
  ['kurzhantel-curl', 'Kurzhantel-Curl', 'Bizeps'],
  ['hammer-curl', 'Hammer Curl', 'Bizeps'],
  ['hammer-curl-sitzend', 'Hammer Curl sitzend', 'Bizeps'],
  ['kabel-curl', 'Bizeps-Curl am Kabel', 'Bizeps'],
  ['konzentrations-curl', 'Konzentrations-Curl', 'Bizeps'],
  ['schraegbank-curl', 'Schrägbank-Curl', 'Bizeps'],
  ['bizeps-maschine', 'Bizeps-Maschine', 'Bizeps'],
  // Trizeps
  ['trizeps-pushdown', 'Trizeps Pushdown', 'Trizeps'],
  ['trizeps-pushdown-seil', 'Trizeps Pushdown Seil', 'Trizeps'],
  ['trizeps-ueber-kopf', 'Trizeps über Kopf', 'Trizeps'],
  ['french-press', 'French Press (SZ)', 'Trizeps'],
  ['enges-bankdruecken', 'Enges Bankdrücken', 'Trizeps'],
  ['trizeps-dips-maschine', 'Dips Maschine', 'Trizeps'],
  ['kickbacks', 'Trizeps Kickbacks', 'Trizeps'],
  // Unterarme
  ['handgelenk-curl', 'Handgelenk-Curl', 'Unterarme'],
  ['reverse-curl', 'Reverse Curl', 'Unterarme'],
  ['farmers-walk', 'Farmer’s Walk', 'Unterarme'],
  // Bauch
  ['cable-crunches', 'Cable Crunches', 'Bauch'],
  ['crunches', 'Crunches', 'Bauch'],
  ['bauchmaschine', 'Bauchmaschine', 'Bauch'],
  ['beinheben-haengend', 'Beinheben hängend', 'Bauch'],
  ['plank', 'Plank', 'Bauch'],
  ['russian-twist', 'Russian Twist', 'Bauch'],
  ['ab-roller', 'Ab-Roller', 'Bauch'],
  // Ganzkörper / Ausdauer
  ['laufband', 'Laufband', 'Ganzkörper'],
  ['crosstrainer', 'Crosstrainer', 'Ganzkörper'],
  ['ergometer', 'Fahrradergometer', 'Ganzkörper'],
  ['rudergeraet', 'Rudergerät', 'Ganzkörper'],
  ['stairmaster', 'Stairmaster', 'Ganzkörper'],
  ['kettlebell-swing', 'Kettlebell Swing', 'Ganzkörper'],
]

export const BUILTIN_EXERCISES: Exercise[] = LIST.map(([id, name, muscle]) => ({
  id,
  name,
  muscle,
  updatedAt: 0,
  deleted: false,
}))

export const BUILTIN_IDS = new Set(BUILTIN_EXERCISES.map((e) => e.id))

export function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase('de-DE').replace(/\s+/g, ' ')
}
