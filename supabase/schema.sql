-- Gym App – Datenbank-Schema für Supabase.
-- Einmalig im Supabase-Dashboard unter "SQL Editor" einfügen und "Run" klicken.
-- Mehrfaches Ausführen ist unschädlich.

-- Eine Tabelle für alle Einträge (Trainings, Pläne, eigene Übungen, Körpergewicht).
-- Jeder Eintrag ist eine eigene Zeile → es gibt kein „großes JSON, das alles überschreibt“.
create table if not exists public.records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('exercises', 'plans', 'workouts', 'bodyweights')),
  id text not null,
  data jsonb not null,
  updated_at bigint not null,              -- Änderungszeit vom Gerät (ms), entscheidet „neuer gewinnt“
  deleted boolean not null default false,  -- Löschungen bleiben als Markierung erhalten
  server_updated_at timestamptz not null default clock_timestamp(), -- wann der Server die Zeile zuletzt gespeichert hat
  primary key (user_id, kind, id)
);

create index if not exists records_user_server_updated_idx on public.records (user_id, server_updated_at);

-- Schutzregel auf dem Server: eine ältere Version überschreibt nie eine neuere.
create or replace function public.records_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null; -- Änderung verwerfen, neuere Version bleibt
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists records_guard on public.records;
create trigger records_guard before insert or update on public.records
  for each row execute function public.records_guard();

-- Zugriff: jede/r sieht und ändert nur die eigenen Zeilen. Endgültiges Löschen ist nicht erlaubt.
alter table public.records enable row level security;

drop policy if exists "records_select_own" on public.records;
create policy "records_select_own" on public.records for select using (auth.uid() = user_id);

drop policy if exists "records_insert_own" on public.records;
create policy "records_insert_own" on public.records for insert with check (auth.uid() = user_id);

drop policy if exists "records_update_own" on public.records;
create policy "records_update_own" on public.records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
