CREATE TABLE public.game_profiles (
  token_hash text PRIMARY KEY REFERENCES public.game_wallets(token_hash) ON DELETE CASCADE,
  id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  username text NOT NULL,
  username_key text NOT NULL UNIQUE,
  avatar text NOT NULL DEFAULT 'a1',
  last_seen timestamptz NOT NULL DEFAULT now(),
  party_leader uuid,
  total_seconds integer NOT NULL DEFAULT 0,
  matches integer NOT NULL DEFAULT 0,
  total_kills integer NOT NULL DEFAULT 0,
  best_length integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.game_friends (
  a uuid NOT NULL, b uuid NOT NULL, requester uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (a, b), CHECK (a < b), CHECK (status IN ('pending','accepted'))
);
CREATE INDEX game_friends_b_idx ON public.game_friends(b);
CREATE TABLE public.game_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid NOT NULL, to_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('pending','accepted','declined'))
);
CREATE INDEX game_invites_to_idx ON public.game_invites(to_id, status);
CREATE TABLE public.game_quest_progress (
  token_hash text NOT NULL REFERENCES public.game_wallets(token_hash) ON DELETE CASCADE,
  quest_id text NOT NULL, period text NOT NULL,
  value integer NOT NULL DEFAULT 0,
  claimed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (token_hash, quest_id, period)
);
GRANT ALL ON public.game_profiles, public.game_friends, public.game_invites, public.game_quest_progress TO service_role;
ALTER TABLE public.game_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_quest_progress ENABLE ROW LEVEL SECURITY;

-- Quest catalog lives in the database so rewards cannot be set by clients.
CREATE OR REPLACE FUNCTION public.game_quests()
RETURNS TABLE(quest_id text, kind text, metric text, goal integer, reward integer)
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  VALUES
  ('d_play10','daily','seconds',600,40),('d_matches3','daily','matches',3,30),('d_kills3','daily','kills',3,40),('d_len100','daily','length',100,30),
  ('w_play60','weekly','seconds',3600,200),('w_matches20','weekly','matches',20,150),('w_kills25','weekly','kills',25,250),('w_len300','weekly','length',300,200),
  ('o_first','once','matches',1,50),('o_play30','once','seconds',1800,150),('o_len500','once','length',500,300),('o_kills100','once','kills',100,400)
$$;
CREATE OR REPLACE FUNCTION public.game_quest_period(p_kind text)
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE p_kind WHEN 'daily' THEN to_char(now() AT TIME ZONE 'utc','YYYY-MM-DD')
                     WHEN 'weekly' THEN to_char(now() AT TIME ZONE 'utc','IYYY-"W"IW')
                     ELSE 'once' END
$$;

CREATE OR REPLACE FUNCTION public.game_finish_match(p_hash text, p_match uuid, p_kills integer, p_length integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.game_wallets; reward integer := 0; secs integer := 0; k integer; l integer; q record;
BEGIN
  SELECT * INTO w FROM public.game_wallets WHERE token_hash = p_hash FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF w.match_id = p_match AND w.match_started_at IS NOT NULL THEN
    secs := least(3600, greatest(0, floor(extract(epoch FROM (now() - w.match_started_at)))::integer));
    reward := least(120, (secs / 5) * 2);
    -- plausibility caps: values can only grow with real match time
    k := least(greatest(coalesce(p_kills,0),0), 40, secs / 3 + 1);
    l := least(greatest(coalesce(p_length,0),0), 60 + secs * 10, 5000);
    UPDATE public.game_wallets SET gold = gold + reward, match_id = NULL, match_started_at = NULL WHERE token_hash = p_hash RETURNING * INTO w;
    UPDATE public.game_profiles SET total_seconds = total_seconds + secs, matches = matches + 1, total_kills = total_kills + k, best_length = greatest(best_length, l) WHERE token_hash = p_hash;
    FOR q IN SELECT * FROM public.game_quests() LOOP
      INSERT INTO public.game_quest_progress(token_hash, quest_id, period, value)
      VALUES (p_hash, q.quest_id, public.game_quest_period(q.kind), CASE q.metric WHEN 'seconds' THEN secs WHEN 'matches' THEN 1 WHEN 'kills' THEN k ELSE l END)
      ON CONFLICT (token_hash, quest_id, period) DO UPDATE SET value = CASE WHEN q.metric = 'length' THEN greatest(game_quest_progress.value, EXCLUDED.value) ELSE game_quest_progress.value + EXCLUDED.value END;
    END LOOP;
  END IF;
  RETURN jsonb_build_object('gold', w.gold, 'owned', w.owned, 'equipped', w.equipped, 'reward', reward);
END $$;

CREATE OR REPLACE FUNCTION public.game_social_action(p_hash text, p_action text, p_args jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me public.game_profiles; other public.game_profiles; name text; lo uuid; hi uuid; inv public.game_invites; reward integer; q record; result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.game_wallets WHERE token_hash = p_hash) THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF p_action = 'set_name' THEN
    name := btrim(p_args->>'username');
    IF name !~ '^[A-Za-z0-9_]{3,14}$' THEN RAISE EXCEPTION 'Invalid username'; END IF;
    IF EXISTS (SELECT 1 FROM public.game_profiles WHERE username_key = lower(name) AND token_hash <> p_hash) THEN RAISE EXCEPTION 'Username taken'; END IF;
    INSERT INTO public.game_profiles(token_hash, username, username_key, avatar)
    VALUES (p_hash, name, lower(name), coalesce(nullif(p_args->>'avatar',''),'a1'))
    ON CONFLICT (token_hash) DO UPDATE SET username = EXCLUDED.username, username_key = EXCLUDED.username_key;
  END IF;
  SELECT * INTO me FROM public.game_profiles WHERE token_hash = p_hash;
  IF NOT FOUND THEN RETURN jsonb_build_object('profile', NULL); END IF;
  UPDATE public.game_profiles SET last_seen = now() WHERE token_hash = p_hash;

  IF p_action = 'set_avatar' THEN
    IF (p_args->>'avatar') !~ '^a[1-8]$' THEN RAISE EXCEPTION 'Invalid avatar'; END IF;
    UPDATE public.game_profiles SET avatar = p_args->>'avatar' WHERE token_hash = p_hash RETURNING * INTO me;
  ELSIF p_action = 'search' THEN
    RETURN jsonb_build_object('results', coalesce((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'avatar', p.avatar)) FROM (
      SELECT * FROM public.game_profiles WHERE username_key LIKE replace(replace(lower(left(coalesce(p_args->>'q',''),14)),'%',''),'_','\_') || '%' AND id <> me.id AND length(coalesce(p_args->>'q','')) >= 2 ORDER BY username_key LIMIT 10) p), '[]'::jsonb));
  ELSIF p_action IN ('add_friend','accept_friend','remove_friend','invite') THEN
    SELECT * INTO other FROM public.game_profiles WHERE id = (p_args->>'id')::uuid;
    IF NOT FOUND OR other.id = me.id THEN RAISE EXCEPTION 'Player not found'; END IF;
    lo := least(me.id, other.id); hi := greatest(me.id, other.id);
    IF p_action = 'add_friend' THEN
      INSERT INTO public.game_friends(a, b, requester) VALUES (lo, hi, me.id) ON CONFLICT DO NOTHING;
      -- both sides asked: become friends
      UPDATE public.game_friends SET status = 'accepted' WHERE a = lo AND b = hi AND requester <> me.id;
    ELSIF p_action = 'accept_friend' THEN
      UPDATE public.game_friends SET status = 'accepted' WHERE a = lo AND b = hi AND requester = other.id;
    ELSIF p_action = 'remove_friend' THEN
      DELETE FROM public.game_friends WHERE a = lo AND b = hi;
    ELSE
      IF NOT EXISTS (SELECT 1 FROM public.game_friends WHERE a = lo AND b = hi AND status = 'accepted') THEN RAISE EXCEPTION 'Not friends'; END IF;
      IF other.last_seen < now() - interval '60 seconds' THEN RAISE EXCEPTION 'Friend is offline'; END IF;
      UPDATE public.game_invites SET status = 'declined' WHERE from_id = me.id AND to_id = other.id AND status = 'pending';
      INSERT INTO public.game_invites(from_id, to_id) VALUES (me.id, other.id);
    END IF;
  ELSIF p_action = 'respond_invite' THEN
    SELECT * INTO inv FROM public.game_invites WHERE id = (p_args->>'invite')::uuid AND to_id = me.id AND status = 'pending' AND created_at > now() - interval '2 minutes';
    IF NOT FOUND THEN RAISE EXCEPTION 'Invite expired'; END IF;
    UPDATE public.game_invites SET status = CASE WHEN (p_args->>'accept')::boolean THEN 'accepted' ELSE 'declined' END WHERE id = inv.id;
    IF (p_args->>'accept')::boolean THEN
      -- join the inviter's party (or the party the inviter already belongs to)
      SELECT coalesce(party_leader, id) INTO lo FROM public.game_profiles WHERE id = inv.from_id;
      UPDATE public.game_profiles SET party_leader = lo WHERE id = inv.from_id AND party_leader IS NULL;
      UPDATE public.game_profiles SET party_leader = lo WHERE token_hash = p_hash RETURNING * INTO me;
      -- a party holds at most 4 players
      IF (SELECT count(*) FROM public.game_profiles WHERE party_leader = lo) > 4 THEN RAISE EXCEPTION 'Party is full'; END IF;
    END IF;
  ELSIF p_action = 'leave_party' THEN
    IF me.party_leader = me.id THEN UPDATE public.game_profiles SET party_leader = NULL WHERE party_leader = me.id;
    ELSE UPDATE public.game_profiles SET party_leader = NULL WHERE token_hash = p_hash; END IF;
  ELSIF p_action = 'claim_quest' THEN
    SELECT * INTO q FROM public.game_quests() g WHERE g.quest_id = p_args->>'quest';
    IF NOT FOUND THEN RAISE EXCEPTION 'Unknown quest'; END IF;
    UPDATE public.game_quest_progress SET claimed = true
      WHERE token_hash = p_hash AND quest_id = q.quest_id AND period = public.game_quest_period(q.kind) AND NOT claimed AND value >= q.goal;
    IF NOT FOUND THEN RAISE EXCEPTION 'Quest not complete'; END IF;
    UPDATE public.game_wallets SET gold = gold + q.reward WHERE token_hash = p_hash;
  ELSIF p_action <> 'state' AND p_action <> 'set_name' THEN RAISE EXCEPTION 'Unknown action';
  END IF;

  SELECT * INTO me FROM public.game_profiles WHERE token_hash = p_hash;
  RETURN jsonb_build_object(
    'profile', jsonb_build_object('id', me.id, 'username', me.username, 'avatar', me.avatar, 'party_leader', me.party_leader),
    'gold', (SELECT gold FROM public.game_wallets WHERE token_hash = p_hash),
    'friends', coalesce((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'avatar', p.avatar,
        'status', f.status, 'incoming', f.status = 'pending' AND f.requester <> me.id,
        'online', p.last_seen > now() - interval '60 seconds',
        'in_party', me.party_leader IS NOT NULL AND coalesce(p.party_leader, p.id) = me.party_leader AND (p.party_leader IS NOT NULL OR p.id = me.party_leader))
        ORDER BY (p.last_seen > now() - interval '60 seconds') DESC, p.username_key)
      FROM public.game_friends f JOIN public.game_profiles p ON p.id = CASE WHEN f.a = me.id THEN f.b ELSE f.a END
      WHERE f.a = me.id OR f.b = me.id), '[]'::jsonb),
    'party', coalesce((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'avatar', p.avatar, 'leader', p.id = me.party_leader))
      FROM public.game_profiles p WHERE me.party_leader IS NOT NULL AND (p.id = me.party_leader OR p.party_leader = me.party_leader)), '[]'::jsonb),
    'invites', coalesce((SELECT jsonb_agg(jsonb_build_object('id', i.id, 'from', p.username, 'avatar', p.avatar))
      FROM public.game_invites i JOIN public.game_profiles p ON p.id = i.from_id
      WHERE i.to_id = me.id AND i.status = 'pending' AND i.created_at > now() - interval '2 minutes'), '[]'::jsonb),
    'quests', (SELECT jsonb_agg(jsonb_build_object('id', g.quest_id, 'kind', g.kind, 'metric', g.metric, 'goal', g.goal, 'reward', g.reward,
        'value', coalesce(qp.value, 0), 'claimed', coalesce(qp.claimed, false)))
      FROM public.game_quests() g LEFT JOIN public.game_quest_progress qp
        ON qp.token_hash = p_hash AND qp.quest_id = g.quest_id AND qp.period = public.game_quest_period(g.kind))
  );
END $$;
REVOKE ALL ON FUNCTION public.game_finish_match(text, uuid, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.game_social_action(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.game_finish_match(text, uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.game_social_action(text, text, jsonb) TO service_role;