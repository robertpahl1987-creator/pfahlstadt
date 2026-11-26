-- Pfahlstadt – Mehrspieler-Server (Supabase / Postgres)
-- Alle Zugriffe laufen über Funktionen (RPC) mit Spieler-Token. Tabellen sind für Clients gesperrt.

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tabellen ----------
create table if not exists public.alliances (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text not null,
  leader uuid,
  created_at timestamptz not null default now()
);
create unique index if not exists alliances_name_uq on public.alliances (lower(name));
create unique index if not exists alliances_tag_uq on public.alliances (lower(tag));

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  name text not null,
  x real not null,
  y real not null,
  alliance_id uuid references public.alliances(id) on delete set null,
  power int not null default 0,
  defense int not null default 0,
  tower int not null default 1,
  troops_h int not null default 0,
  troops_w int not null default 0,
  res real[] not null default '{0,0,0,0}',
  pending jsonb not null default '{"res":[0,0,0,0],"h":0,"w":0}',
  shield_until timestamptz not null default now() + interval '3 hours',
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create unique index if not exists players_name_uq on public.players (lower(name));

create table if not exists public.territories (
  id serial primary key,
  name text not null,
  kind text not null,
  x real not null,
  y real not null,
  res int not null,
  pct int not null,
  base int not null,
  pirates real not null,
  pirates_at timestamptz not null default now(),
  owner uuid references public.players(id) on delete set null,
  gh int not null default 0,
  gw int not null default 0,
  next_counter timestamptz
);

create table if not exists public.marches (
  id bigserial primary key,
  player uuid not null references public.players(id) on delete cascade,
  kind text not null,              -- attack_terr | attack_player | reinforce | return
  target_terr int references public.territories(id) on delete cascade,
  target_player uuid references public.players(id) on delete cascade,
  h int not null, w int not null,
  loot real[] not null default '{0,0,0,0}',
  depart timestamptz not null default now(),
  arrive timestamptz not null
);
create index if not exists marches_arrive_idx on public.marches (arrive);

create table if not exists public.reports (
  id bigserial primary key,
  player uuid not null references public.players(id) on delete cascade,
  text text not null,
  win boolean,
  created_at timestamptz not null default now()
);
create index if not exists reports_player_idx on public.reports (player, created_at desc);

create table if not exists public.chat (
  id bigserial primary key,
  alliance_id uuid not null references public.alliances(id) on delete cascade,
  player uuid references public.players(id) on delete set null,
  name text not null,
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_alliance_idx on public.chat (alliance_id, created_at desc);

alter table public.alliances enable row level security;
alter table public.players enable row level security;
alter table public.territories enable row level security;
alter table public.marches enable row level security;
alter table public.reports enable row level security;
alter table public.chat enable row level security;
-- keine Policies: direkter Tabellenzugriff ist für anon/authenticated gesperrt

-- ---------- Hilfsfunktionen ----------
create or replace function public._me(p_token text) returns public.players
language plpgsql security definer set search_path = public, extensions as $$
declare r public.players;
begin
  select * into r from public.players where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if not found then raise exception 'Unbekannter Spieler'; end if;
  update public.players set last_seen = now() where id = r.id;
  return r;
end $$;

create or replace function public._dist_time(x1 real, y1 real, x2 real, y2 real) returns interval
language sql immutable as $$ select make_interval(secs => 15 + sqrt((x1-x2)^2 + (y1-y2)^2) * 18) $$;

create or replace function public._report(p uuid, t text, w boolean) returns void
language sql security definer set search_path = public as $$ insert into public.reports(player, text, win) values (p, t, w) $$;

create or replace function public._add_pending(p uuid, r real[], h int, w int) returns void
language plpgsql security definer set search_path = public as $$
declare cur jsonb; nr jsonb;
begin
  select pending into cur from public.players where id = p for update;
  nr := jsonb_build_array(
    coalesce((cur->'res'->>0)::real, 0) + coalesce(r[1], 0), coalesce((cur->'res'->>1)::real, 0) + coalesce(r[2], 0),
    coalesce((cur->'res'->>2)::real, 0) + coalesce(r[3], 0), coalesce((cur->'res'->>3)::real, 0) + coalesce(r[4], 0));
  update public.players set pending = jsonb_build_object('res', nr, 'h', coalesce((cur->>'h')::int, 0) + h, 'w', coalesce((cur->>'w')::int, 0) + w)
  where id = p;
end $$;

-- Piraten erholen sich mit der Zeit
create or replace function public._pirates_now(t public.territories) returns real
language sql stable as $$
  select case when t.owner is not null then 0
    else least(t.base::real, t.pirates + t.base * extract(epoch from (now() - t.pirates_at)) / 600.0) end $$;

-- ---------- Spielwelt erzeugen (einmalig) ----------
create or replace function public._seed_world() returns void
language plpgsql security definer set search_path = public as $$
declare
  names text[] := array['Möwenbank','Krabbensand','Seehundsplate','Bernsteinriff','Nebelhallig','Priel-Insel','Austernbank','Sturmwarft',
    'Robbeneck','Muschelplate','Tangfeld','Dünenhallig','Schlickwall','Wrackbucht','Leuchtsand','Graue Plate','Salzwiese','Kormoranriff',
    'Silberwatt','Krakentiefe','Seesternbank','Sturmvogelriff','Ankerplate','Gezeitenhallig','Brandungsinsel','Muschelkönig','Nordplate',
    'Südsand','Westriff','Ostwarft','Bojenbank','Treibholzbucht','Perlenriff','Strandhafer-Hallig','Walknochen','Schatzsand','Möwenhallig',
    'Flutbrecher','Eisvogelriff','Seegrasplate'];
  kinds text[] := array['Sandbank','Hallig','Riff'];
  i int; r real; a real; b int;
begin
  if exists (select 1 from public.territories) then return; end if;
  for i in 1..40 loop
    r := case when i = 20 then 0.4 else 1.5 + random() * 9 end;
    a := random() * 2 * pi();
    b := round((60 + 70 * power(r, 1.35)) * (0.8 + random() * 0.4));
    if i = 20 then b := 3000; end if;
    insert into public.territories(name, kind, x, y, res, pct, base, pirates)
    values (names[i], kinds[1 + floor(random() * 3)::int], cos(a) * r, sin(a) * r, floor(random() * 4)::int,
            case when i = 20 then 50 else (8 + round(r * 2.5))::int end, b, b);
  end loop;
end $$;

-- ---------- Kämpfe auswerten (wird bei jeder Anfrage nebenbei erledigt) ----------
create or replace function public._process() returns void
language plpgsql security definer set search_path = public as $$
declare
  m public.marches; t public.territories; d public.players; a public.players;
  att real; def real; loss real; lh int; lw int; pir real; carry real; loot real[]; i int;
begin
  for m in select * from public.marches where arrive <= now() order by arrive for update skip locked loop
    delete from public.marches where id = m.id;
    select * into a from public.players where id = m.player;
    if not found then continue; end if;

    if m.kind = 'return' then
      perform public._add_pending(m.player, m.loot, m.h, m.w);
      perform public._report(m.player, format('%s Soldaten sind heimgekehrt%s.', m.h + m.w,
        case when m.loot[1] + m.loot[2] + m.loot[3] + m.loot[4] > 0 then format(' mit Beute (%s Holz, %s Muscheln, %s Wasser, %s Altmetall)', round(m.loot[1]), round(m.loot[2]), round(m.loot[3]), round(m.loot[4])) else '' end), null);

    elsif m.kind = 'reinforce' then
      select * into t from public.territories where id = m.target_terr for update;
      if t.owner = m.player then
        update public.territories set gh = gh + m.h, gw = gw + m.w where id = t.id;
        perform public._report(m.player, format('Verstärkung in %s angekommen.', t.name), true);
      else
        insert into public.marches(player, kind, target_terr, h, w, arrive) values (m.player, 'return', t.id, m.h, m.w, now() + public._dist_time(a.x, a.y, t.x, t.y));
        perform public._report(m.player, format('%s gehört dir nicht mehr – die Verstärkung kehrt um.', t.name), false);
      end if;

    elsif m.kind = 'attack_terr' then
      select * into t from public.territories where id = m.target_terr for update;
      att := (m.h * 10 + m.w * 3) * (0.85 + random() * 0.3);
      if t.owner is null then def := public._pirates_now(t);
      elsif t.owner = m.player then def := 0;
      else def := (t.gh * 5 + t.gw * 12) * 1.1;
      end if;
      if t.owner = m.player then
        update public.territories set gh = gh + m.h, gw = gw + m.w where id = t.id;
      elsif att > def then
        loss := least(0.9, power(def / greatest(att, 1), 1.3) * 0.6);
        lh := round(m.h * loss); lw := round(m.w * loss);
        if t.owner is not null then
          perform public._report(t.owner, format('%s hat dir %s entrissen! Die Besatzung ist verloren.', a.name, t.name), false);
        end if;
        update public.territories set owner = m.player, gh = m.h - lh, gw = m.w - lw, pirates = 0, pirates_at = now(),
          next_counter = now() + make_interval(secs => 900 + random() * 900) where id = t.id;
        perform public._report(m.player, format('Sieg! %s erobert. Verluste: %s Harpuniere, %s Wachen.', t.name, lh, lw), true);
      else
        lh := round(m.h * 0.8); lw := round(m.w * 0.8);
        if t.owner is null then
          pir := public._pirates_now(t);
          update public.territories set pirates = greatest(t.base * 0.3, pir - att * 0.5), pirates_at = now() where id = t.id;
        else
          loss := least(0.9, power(att / greatest(def, 1), 1.3) * 0.5);
          update public.territories set gh = gh - round(gh * loss), gw = gw - round(gw * loss) where id = t.id;
          perform public._report(t.owner, format('%s hat %s angegriffen und wurde zurückgeschlagen!', a.name, t.name), true);
        end if;
        if m.h - lh + m.w - lw > 0 then
          insert into public.marches(player, kind, target_terr, h, w, arrive) values (m.player, 'return', t.id, m.h - lh, m.w - lw, now() + public._dist_time(a.x, a.y, t.x, t.y));
        end if;
        perform public._report(m.player, format('Niederlage bei %s. Verluste: %s Harpuniere, %s Wachen.', t.name, lh, lw), false);
      end if;

    elsif m.kind = 'attack_player' then
      select * into d from public.players where id = m.target_player for update;
      if not found then continue; end if;
      att := (m.h * 10 + m.w * 3) * (0.85 + random() * 0.3);
      def := greatest(d.defense, 0) * (0.85 + random() * 0.3);
      if att > def then
        loss := least(0.9, power(def / greatest(att, 1), 1.3) * 0.6);
        lh := round(m.h * loss); lw := round(m.w * loss);
        carry := (m.h - lh) * 30 + (m.w - lw) * 10;
        loot := array[0,0,0,0]::real[];
        for i in 1..4 loop loot[i] := least(d.res[i] * 0.15, carry / 4); end loop;
        -- Verteidiger verliert Beute und Truppen
        perform public._add_pending(d.id, array[-loot[1], -loot[2], -loot[3], -loot[4]],
          -round(d.troops_h * 0.4)::int, -round(d.troops_w * 0.4)::int);
        update public.players set res = array[res[1]-loot[1], res[2]-loot[2], res[3]-loot[3], res[4]-loot[4]],
          troops_h = troops_h - round(troops_h * 0.4), troops_w = troops_w - round(troops_w * 0.4) where id = d.id;
        perform public._report(d.id, format('%s hat deine Stadt überfallen! Verloren: %s Holz, %s Muscheln, %s Wasser, %s Altmetall.',
          a.name, round(loot[1]), round(loot[2]), round(loot[3]), round(loot[4])), false);
        perform public._report(m.player, format('Sieg gegen %s! Beute: %s Holz, %s Muscheln, %s Wasser, %s Altmetall. Verluste: %s/%s.',
          d.name, round(loot[1]), round(loot[2]), round(loot[3]), round(loot[4]), lh, lw), true);
      else
        lh := round(m.h * 0.8); lw := round(m.w * 0.8);
        loss := least(0.7, power(att / greatest(def, 1), 1.3) * 0.4);
        perform public._add_pending(d.id, array[0,0,0,0]::real[], -round(d.troops_h * loss)::int, -round(d.troops_w * loss)::int);
        perform public._report(d.id, format('Angriff von %s abgewehrt!', a.name), true);
        perform public._report(m.player, format('Niederlage gegen %s. Verluste: %s Harpuniere, %s Wachen.', d.name, lh, lw), false);
        loot := array[0,0,0,0]::real[];
      end if;
      if m.h - lh + m.w - lw > 0 then
        insert into public.marches(player, kind, target_player, h, w, loot, arrive)
        values (m.player, 'return', d.id, m.h - lh, m.w - lw, loot, now() + public._dist_time(a.x, a.y, d.x, d.y));
      end if;
    end if;
  end loop;

  -- Piraten-Gegenangriffe auf besetzte Gebiete
  for t in select * from public.territories where owner is not null and next_counter is not null and next_counter <= now() for update skip locked loop
    att := t.base * (0.5 + random() * 0.5);
    def := (t.gh * 5 + t.gw * 12) * (0.85 + random() * 0.3);
    if def > att then
      loss := least(0.9, power(att / greatest(def, 1), 1.3) * 0.5);
      update public.territories set gh = gh - round(gh * loss), gw = gw - round(gw * loss),
        next_counter = now() + make_interval(secs => 900 + random() * 900) where id = t.id;
      perform public._report(t.owner, format('Piraten griffen %s an und wurden zurückgeschlagen!', t.name), true);
    else
      perform public._report(t.owner, format('%s ist an die Piraten gefallen!', t.name), false);
      update public.territories set owner = null, gh = 0, gw = 0, pirates = base, pirates_at = now(), next_counter = null where id = t.id;
    end if;
  end loop;
end $$;

-- ---------- Öffentliche Funktionen (RPC) ----------
create or replace function public.pf_register(p_name text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare tok text; nm text := btrim(p_name); a real; r real; pid uuid;
begin
  if nm is null or length(nm) < 3 or length(nm) > 16 or nm !~ '^[A-Za-z0-9ÄÖÜäöüß _-]+$' then
    raise exception 'Name: 3–16 Zeichen (Buchstaben, Zahlen, Leerzeichen, - und _)';
  end if;
  if exists (select 1 from public.players where lower(name) = lower(nm)) then raise exception 'Name ist schon vergeben'; end if;
  perform public._seed_world();
  tok := encode(extensions.gen_random_bytes(24), 'hex');
  a := random() * 2 * pi(); r := 3 + random() * 7;
  insert into public.players(token_hash, name, x, y) values (encode(extensions.digest(tok, 'sha256'), 'hex'), nm, cos(a) * r, sin(a) * r)
  returning id into pid;
  return jsonb_build_object('token', tok, 'id', pid, 'name', nm);
end $$;

-- Stadtzustand hochladen, ausstehende Ereignisse abholen
create or replace function public.pf_sync(p_token text, p_state jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.players; pend jsonb; bonus jsonb;
begin
  perform public._process();
  me := public._me(p_token);
  select pending into pend from public.players where id = me.id for update;
  update public.players set
    res = array[(p_state->'res'->>0)::real, (p_state->'res'->>1)::real, (p_state->'res'->>2)::real, (p_state->'res'->>3)::real],
    troops_h = greatest(0, (p_state->>'h')::int + coalesce((pend->>'h')::int, 0)),
    troops_w = greatest(0, (p_state->>'w')::int + coalesce((pend->>'w')::int, 0)),
    defense = greatest(0, (p_state->>'defense')::int),
    power = greatest(0, (p_state->>'power')::int),
    tower = greatest(1, (p_state->>'tower')::int),
    pending = '{"res":[0,0,0,0],"h":0,"w":0}'
  where id = me.id;
  select coalesce(jsonb_agg(jsonb_build_object('res', res, 'pct', pct)), '[]') into bonus from public.territories where owner = me.id;
  return jsonb_build_object('pending', pend, 'bonus', bonus,
    'reports', (select coalesce(jsonb_agg(r order by r.created_at desc), '[]') from (select text, win, created_at from public.reports where player = me.id order by created_at desc limit 30) r));
end $$;

-- Weltkarte
create or replace function public.pf_world(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.players;
begin
  perform public._process();
  me := public._me(p_token);
  return jsonb_build_object(
    'me', jsonb_build_object('id', me.id, 'name', me.name, 'x', me.x, 'y', me.y, 'alliance', me.alliance_id, 'shield', me.shield_until > now()),
    'players', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'x', p.x, 'y', p.y, 'power', p.power, 'tower', p.tower,
        'alliance', p.alliance_id, 'tag', al.tag, 'shield', p.shield_until > now(), 'online', p.last_seen > now() - interval '5 minutes')), '[]')
      from public.players p left join public.alliances al on al.id = p.alliance_id),
    'territories', (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'kind', t.kind, 'x', t.x, 'y', t.y, 'res', t.res, 'pct', t.pct,
        'pirates', round(public._pirates_now(t)), 'owner', t.owner, 'ownerName', op.name, 'ownerAlliance', op.alliance_id,
        'gh', case when t.owner = me.id then t.gh else null end, 'gw', case when t.owner = me.id then t.gw else null end) order by t.id), '[]')
      from public.territories t left join public.players op on op.id = t.owner),
    'marches', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.kind, 'h', m.h, 'w', m.w, 'mine', m.player = me.id,
        'from', jsonb_build_array(pa.x, pa.y),
        'to', case when m.target_terr is not null then jsonb_build_array(tt.x, tt.y) else jsonb_build_array(tp.x, tp.y) end,
        'depart', m.depart, 'arrive', m.arrive, 'target', coalesce(tt.name, tp.name))), '[]')
      from public.marches m join public.players pa on pa.id = m.player
      left join public.territories tt on tt.id = m.target_terr left join public.players tp on tp.id = m.target_player
      where m.player = me.id or m.target_player = me.id or (me.alliance_id is not null and pa.alliance_id = me.alliance_id)),
    'now', now());
end $$;

-- Truppen losschicken: p_kind = attack_terr | reinforce | attack_player
create or replace function public.pf_send(p_token text, p_kind text, p_target text, p_h int, p_w int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.players; t public.territories; d public.players; tx real; ty real;
begin
  perform public._process();
  me := public._me(p_token);
  if p_h < 0 or p_w < 0 or p_h + p_w <= 0 then raise exception 'Keine Truppen ausgewählt'; end if;
  if p_h > me.troops_h or p_w > me.troops_w then raise exception 'So viele Truppen hast du nicht zu Hause'; end if;
  if p_kind in ('attack_terr', 'reinforce') then
    select * into t from public.territories where id = p_target::int;
    if not found then raise exception 'Unbekanntes Gebiet'; end if;
    if p_kind = 'reinforce' and t.owner is distinct from me.id then raise exception 'Das Gebiet gehört dir nicht'; end if;
    if p_kind = 'attack_terr' and t.owner is not null and t.owner <> me.id then
      if exists (select 1 from public.players o where o.id = t.owner and o.alliance_id is not null and o.alliance_id = me.alliance_id) then
        raise exception 'Das Gebiet gehört deiner Allianz'; end if;
    end if;
    tx := t.x; ty := t.y;
    insert into public.marches(player, kind, target_terr, h, w, arrive) values (me.id, p_kind, t.id, p_h, p_w, now() + public._dist_time(me.x, me.y, tx, ty));
  elsif p_kind = 'attack_player' then
    select * into d from public.players where id = p_target::uuid;
    if not found or d.id = me.id then raise exception 'Ungültiges Ziel'; end if;
    if d.alliance_id is not null and d.alliance_id = me.alliance_id then raise exception 'Das ist ein Allianzmitglied'; end if;
    if d.shield_until > now() then raise exception 'Dieser Spieler steht noch unter Anfängerschutz'; end if;
    insert into public.marches(player, kind, target_player, h, w, arrive) values (me.id, p_kind, d.id, p_h, p_w, now() + public._dist_time(me.x, me.y, d.x, d.y));
    perform public._report(d.id, format('Achtung: %s greift deine Stadt an!', me.name), null);
  else raise exception 'Unbekannte Aktion'; end if;
  -- Angreifen beendet den eigenen Anfängerschutz
  update public.players set troops_h = troops_h - p_h, troops_w = troops_w - p_w,
    shield_until = case when p_kind = 'attack_player' then least(shield_until, now()) else shield_until end where id = me.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.pf_withdraw(p_token text, p_terr int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.players; t public.territories;
begin
  me := public._me(p_token);
  select * into t from public.territories where id = p_terr and owner = me.id for update;
  if not found then raise exception 'Das Gebiet gehört dir nicht'; end if;
  if t.gh + t.gw = 0 then raise exception 'Keine Besatzung'; end if;
  insert into public.marches(player, kind, target_terr, h, w, arrive) values (me.id, 'return', t.id, t.gh, t.gw, now() + public._dist_time(me.x, me.y, t.x, t.y));
  update public.territories set gh = 0, gw = 0 where id = t.id;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Allianzen ----------
create or replace function public.pf_alliances(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.players;
begin
  me := public._me(p_token);
  return jsonb_build_object('mine', me.alliance_id, 'list', (select coalesce(jsonb_agg(x order by x.power desc), '[]') from (
    select a.id, a.name, a.tag, a.leader, count(p.id) as members, coalesce(sum(p.power), 0) as power,
      (select count(*) from public.territories t join public.players o on o.id = t.owner where o.alliance_id = a.id) as territories
    from public.alliances a left join public.players p on p.alliance_id = a.id group by a.id) x),
    'members', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'power', p.power, 'online', p.last_seen > now() - interval '5 minutes') order by p.power desc), '[]')
      from public.players p where me.alliance_id is not null and p.alliance_id = me.alliance_id));
end $$;

create or replace function public.pf_alliance_create(p_token text, p_name text, p_tag text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.players; aid uuid;
begin
  me := public._me(p_token);
  if me.alliance_id is not null then raise exception 'Du bist schon in einer Allianz'; end if;
  if length(btrim(p_name)) < 3 or length(btrim(p_name)) > 24 then raise exception 'Name: 3–24 Zeichen'; end if;
  if btrim(p_tag) !~ '^[A-Za-z0-9]{2,4}$' then raise exception 'Kürzel: 2–4 Buchstaben/Zahlen'; end if;
  insert into public.alliances(name, tag, leader) values (btrim(p_name), upper(btrim(p_tag)), me.id) returning id into aid;
  update public.players set alliance_id = aid where id = me.id;
  return jsonb_build_object('ok', true, 'id', aid);
exception when unique_violation then raise exception 'Name oder Kürzel ist schon vergeben';
end $$;

create or replace function public.pf_alliance_join(p_token text, p_alliance uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.players;
begin
  me := public._me(p_token);
  if me.alliance_id is not null then raise exception 'Verlasse zuerst deine Allianz'; end if;
  if not exists (select 1 from public.alliances where id = p_alliance) then raise exception 'Allianz nicht gefunden'; end if;
  if (select count(*) from public.players where alliance_id = p_alliance) >= 20 then raise exception 'Allianz ist voll (max. 20)'; end if;
  update public.players set alliance_id = p_alliance where id = me.id;
  insert into public.chat(alliance_id, player, name, text) values (p_alliance, null, 'System', me.name || ' ist der Allianz beigetreten.');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.pf_alliance_leave(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.players; nxt uuid;
begin
  me := public._me(p_token);
  if me.alliance_id is null then return jsonb_build_object('ok', true); end if;
  update public.players set alliance_id = null where id = me.id;
  insert into public.chat(alliance_id, player, name, text) values (me.alliance_id, null, 'System', me.name || ' hat die Allianz verlassen.');
  select id into nxt from public.players where alliance_id = me.alliance_id order by power desc limit 1;
  if nxt is null then delete from public.alliances where id = me.alliance_id;
  else update public.alliances set leader = nxt where id = me.alliance_id and leader = me.id; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.pf_chat(p_token text, p_text text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.players;
begin
  me := public._me(p_token);
  if me.alliance_id is null then raise exception 'Du bist in keiner Allianz'; end if;
  if p_text is not null and length(btrim(p_text)) > 0 then
    if length(p_text) > 300 then raise exception 'Nachricht zu lang (max. 300 Zeichen)'; end if;
    if exists (select 1 from public.chat where player = me.id and created_at > now() - interval '2 seconds') then raise exception 'Nicht so schnell'; end if;
    insert into public.chat(alliance_id, player, name, text) values (me.alliance_id, me.id, me.name, btrim(p_text));
  end if;
  return (select coalesce(jsonb_agg(c order by c.created_at), '[]') from (
    select name, text, created_at, player = me.id as mine from public.chat where alliance_id = me.alliance_id order by created_at desc limit 50) c);
end $$;

create or replace function public.pf_ranking(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.players;
begin
  me := public._me(p_token);
  return (select coalesce(jsonb_agg(x order by x.power desc), '[]') from (
    select p.name, p.power, al.tag, (select count(*) from public.territories t where t.owner = p.id) as territories, p.id = me.id as me
    from public.players p left join public.alliances al on al.id = p.alliance_id order by p.power desc limit 50) x);
end $$;

-- Rechte: Clients dürfen nur die pf_-Funktionen aufrufen
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.pf_register(text), public.pf_sync(text, jsonb), public.pf_world(text),
  public.pf_send(text, text, text, int, int), public.pf_withdraw(text, int), public.pf_alliances(text),
  public.pf_alliance_create(text, text, text), public.pf_alliance_join(text, uuid), public.pf_alliance_leave(text),
  public.pf_chat(text, text), public.pf_ranking(text) to anon, authenticated;

select public._seed_world();
