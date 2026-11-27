using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace Pfahlstadt
{
    /// Mehrspieler über den Supabase-Server (gleicher Server wie die bisherige App-Fassung).
    /// Alle Regeln laufen auf dem Server, die App ruft nur RPC-Funktionen mit dem Spieler-Token auf.
    public class Online : MonoBehaviour
    {
        public static Online I { get; private set; }
        const string Server = "https://qoatkmjobrlnqadsfmhs.supabase.co";
        const string Key = "sb_publishable_J84AUIbZnb_CZuak5SiKRg_f5nLkn1w";

        static readonly Dictionary<string, string> Err = new Dictionary<string, string>
        {
            { "NAME_VERGEBEN", "Dieser Name ist schon vergeben." }, { "NAME_LAENGE", "Der Name braucht 3 bis 16 Zeichen." },
            { "TAG_LAENGE", "Das Kürzel braucht 2 bis 4 Zeichen." }, { "NICHT_ANGEMELDET", "Anmeldung ungültig. Bitte neu anmelden oder Umzugscode prüfen." },
            { "KEINE_TRUPPEN", "Keine Truppen ausgewählt." }, { "ZU_WENIG_TRUPPEN", "So viele Truppen hast du nicht zu Hause." },
            { "ZU_VIELE_MAERSCHE", "Höchstens 5 Trupps gleichzeitig unterwegs." }, { "VERBUENDET", "Verbündete kann man nicht angreifen." },
            { "GESCHUETZT", "Diese Stadt steht gerade unter Schutz." }, { "UNBEKANNT", "Ziel nicht gefunden." },
            { "SCHON_IN_ALLIANZ", "Du bist schon in einer Allianz." }, { "ALLIANZ_VERGEBEN", "Name oder Kürzel ist schon vergeben." },
            { "ALLIANZ_VOLL", "Diese Allianz ist voll (max. 20)." }, { "KEINE_ALLIANZ", "Du bist in keiner Allianz." },
            { "NICHT_ANFUEHRER", "Nur der Anführer darf das." }, { "NICHT_MOEGLICH", "Das geht gerade nicht." },
            { "TEXT_LAENGE", "Nachricht: 1 bis 200 Zeichen." }, { "ZU_SCHNELL", "Bitte kurz warten." },
            { "KEIN_ADMIN", "Nur der Spielleiter darf das." }, { "CODE_FORMAT", "Code: 4 bis 16 Buchstaben oder Zahlen, ohne Leerzeichen." },
            { "LEER", "Bitte etwas eintragen." }, { "UNGUELTIG", "Ungültige Eingabe." }, { "KEINE_KRAKE", "Gerade ist keine Riesenkrake da." },
            { "VIP4", "Eigene Fotos gibt es ab VIP 4." }, { "BILD", "Das Bild ist ungültig oder zu groß." },
            { "GESPERRT", "Dieses Konto wurde vom Spielleiter gesperrt." }, { "HILFE_LIMIT", "Höchstens 20.000 Rohstoffe Hilfe pro Stunde." },
            { "ZU_WENIG", "So viel hast du nicht." }, { "KEINE_KAEMPFE", "Für heute sind alle Arena-Kämpfe verbraucht." },
            { "SCHON_ABGEHOLT", "Heute schon abgeholt." }, { "NUR_ANFUEHRER", "Nur der Anführer kann einen Krieg erklären." },
            { "SCHON_IM_KRIEG", "Eine der beiden Allianzen ist schon im Krieg." }, { "PAUSE", "Nach einem Krieg ist 12 Stunden Pause." },
            { "BURG_VOLL", "Die Allianzburg ist voll." }, { "NICHT_VERBUENDET", "Nur an Mitglieder deiner Allianz." },
            { "ZU_FRUEH", "Du hast gerade erst um Verstärkung gebeten (alle 10 Minuten möglich)." },
            { "SCHON_UNTERWEGS", "Zu diesem Feld ist schon ein Trupp von dir unterwegs." },
            { "NUR_WOCHENENDE", "Um den Großen Leuchtturm wird nur am Wochenende gekämpft." },
        };

        public string Token, PlayerName, Status = "aus", Error = "";
        public bool Active => !string.IsNullOrEmpty(Token);
        public bool Busy => busy > 0;
        int busy;
        public double OffsetMs;   // lokale Zeit minus Serverzeit
        public double ServerNowMs => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - OffsetMs;

        // Daten vom Server
        public Dictionary<string, object> Me, World, AllyB, Lh, Boss, War, NewsPending, Alliances, Garr, Arena, WarI, BossI;
        public List<object> Marches = new List<object>(), Owned = new List<object>(), Reports = new List<object>(), Events = new List<object>();
        public List<object> Chat = new List<object>(), Projects, Helps, Rallies, Ranking, Players, Codes, AvQueue;
        public int Incoming, OpenRallies, HelpOpen, Garrison, GCap, TroopReq, Trophies;
        public string Title;
        public bool IsAdmin => Me != null && J.B(Me, "is_admin");
        public bool IsLeader => Me != null && J.B(Me, "leader");
        public string MyId => Me != null ? J.S(Me, "id") : "";
        public string AllyId => Me != null ? J.S(Me, "alliance_id") : "";
        public bool InAlliance => AllyId != "";
        public bool WantWorld, WantChat;
        long lastReport, chatAfter;
        float tSync = 99, tWorld = 99, tChat = 99, tAll = 99;

        class Req { public string Fn; public Func<Dictionary<string, object>> Args; public Action<object> Ok; public Action<string, string> Fail; public bool User; }
        readonly Queue<Req> queue = new Queue<Req>();
        bool running;

        void Awake()
        {
            I = this;
            Token = PlayerPrefs.GetString("pf_token", "");
            PlayerName = PlayerPrefs.GetString("pf_name", "");
            long.TryParse(PlayerPrefs.GetString("pf_lastrep", "0"), out lastReport);
            if (Active) Status = "verbinde";
            Hook(Active);
        }

        void Update()
        {
            if (!Active) return;
            float dt = Time.unscaledDeltaTime;
            tSync += dt; tWorld += dt; tChat += dt; tAll += dt;
            if (tSync > 15f) { tSync = 0; Sync(); }
            if (WantWorld && tWorld > 10f) { tWorld = 0; LoadWorld(); }
            if (WantChat && tChat > 4f) { tChat = 0; LoadChat(); }
            if (WantChat && tAll > 15f) { tAll = 0; LoadAlliances(); }
        }

        void OnApplicationPause(bool p) { if (!p && Active) tSync = 99; }

        // ---------- Aufrufe ----------
        public static string Arr(int[] u) => "[" + string.Join(",", u) + "]";

        public void Call(string fn, Dictionary<string, object> args, Action<object> ok = null, Action<string, string> fail = null, bool user = false)
            => CallF(fn, () => args, ok, fail, user);

        /// args als Funktion: wird erst beim Senden ausgewertet (z. B. aktueller Spielstand)
        public void CallF(string fn, Func<Dictionary<string, object>> args, Action<object> ok, Action<string, string> fail, bool user)
        {
            if (user) busy++;
            queue.Enqueue(new Req { Fn = fn, Args = args, Ok = ok, Fail = fail, User = user });
            if (!running) StartCoroutine(Pump());
        }

        IEnumerator Pump()
        {
            running = true;
            while (queue.Count > 0)
            {
                var r = queue.Dequeue();
                string body = Json.Write(r.Args != null ? r.Args() : new Dictionary<string, object>());
                using (var w = new UnityWebRequest(Server + "/rest/v1/rpc/" + r.Fn, "POST"))
                {
                    w.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                    w.downloadHandler = new DownloadHandlerBuffer();
                    w.SetRequestHeader("Content-Type", "application/json");
                    w.SetRequestHeader("apikey", Key);
                    w.timeout = 20;
                    yield return w.SendWebRequest();
                    if (r.User) busy = Mathf.Max(0, busy - 1);
                    string txt = w.downloadHandler != null ? w.downloadHandler.text : "";
                    object data = null;
                    try { data = Json.Parse(txt); } catch (Exception) { data = null; }
                    bool netErr = w.result == UnityWebRequest.Result.ConnectionError;
                    if (netErr || w.responseCode >= 400 || w.responseCode == 0)
                    {
                        string code = netErr || w.responseCode == 0 ? "NETZ" : J.S(data, "message");
                        if (string.IsNullOrEmpty(code)) code = "FEHLER";
                        string msg = code == "NETZ" ? "Keine Verbindung zum Server." : Err.ContainsKey(code) ? Err[code] : "Serverfehler: " + code;
                        try { r.Fail?.Invoke(code, msg); } catch (Exception e) { Debug.LogException(e); }
                        if (r.Fail == null && r.User && Colony.I != null) Colony.I.Msg(msg);
                    }
                    else { try { r.Ok?.Invoke(data); } catch (Exception e) { Debug.LogException(e); } }
                }
            }
            running = false;
        }

        // ---------- Anmeldung ----------
        static string NewToken()
        {
            var b = new byte[24];
            using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create()) rng.GetBytes(b);
            var sb = new StringBuilder(); foreach (var x in b) sb.Append(x.ToString("x2"));
            return sb.ToString();
        }
        void SaveLogin()
        {
            PlayerPrefs.SetString("pf_token", Token ?? ""); PlayerPrefs.SetString("pf_name", PlayerName ?? ""); PlayerPrefs.Save();
        }

        public void Register(string name, Action<string> fail)
        {
            string tok = NewToken();
            Call("register", new Dictionary<string, object> { { "p_name", name.Trim() }, { "p_token", tok } }, d =>
            {
                Token = tok; PlayerName = J.S(d, "name"); SaveLogin(); Hook(true);
                Colony.I.S2.playerName = PlayerName;
                Colony.I.Msg($"Willkommen, {PlayerName}! Du bist jetzt online.");
                Sync(); LoadWorld();
            }, (c, m) => fail?.Invoke(m), true);
        }

        public void Restore(string code, Action<string> fail)
        {
            string old = Token;
            Token = code.Trim();
            DoSync(true, () => { PlayerName = J.S(Me, "name"); SaveLogin(); Hook(true); Colony.I.S2.playerName = PlayerName; Colony.I.Msg($"Konto {PlayerName} übernommen."); },
                m => { Token = old; fail?.Invoke(m); });
        }

        public void Logout()
        {
            Token = ""; PlayerName = ""; Me = null; World = null; Status = "aus"; SaveLogin(); Hook(false);
        }

        /// verbindet die Spiellogik mit den Online-Daten
        void Hook(bool on)
        {
            if (!on)
            {
                Colony.OnlineAway = null; Colony.OnlineGarrisonUnits = null; Colony.OnlineTerrBonus = null; Colony.OnlineBusyPoints = null;
                Colony.OnlinePhase = null; Colony.OnlineStorm = null; Colony.DoubleGatherEvent = false;
                Colony.AllyAtk = Colony.AllyDef = Colony.AllyGather = Colony.AllyBuild = Colony.AllyMarch = Colony.AllyStorage = Colony.AllyDike = Colony.AllyLandmark = Colony.AllyWorkshop = 0;
                return;
            }
            Colony.OnlineAway = TroopsAway;
            Colony.OnlineGarrisonUnits = () =>
            {
                int n = 0; if (World == null || Me == null) return 0;
                foreach (var t in J.L(World, "territories")) if (J.S(t, "owner") == MyId) n += Units.Sum(J.U(t, "gu"));
                return n;
            };
            Colony.OnlineTerrBonus = res => { float b = 0; foreach (var t in Owned) if (J.I(t, "res") == res) b += J.F(t, "pct") / 100f; return b; };
            Colony.OnlineBusyPoints = () =>
            {
                var pts = new List<Vector2>(); if (World == null || Me == null) return pts;
                float mx = J.F(Me, "x"), my = J.F(Me, "y");
                foreach (var t in J.L(World, "territories")) pts.Add(new Vector2(J.F(t, "x") - mx, J.F(t, "y") - my));
                foreach (var p in J.L(World, "players")) pts.Add(new Vector2(J.F(p, "x") - mx, J.F(p, "y") - my));
                foreach (var f in J.L(World, "fields")) pts.Add(new Vector2(J.F(f, "x") - mx, J.F(f, "y") - my));
                return pts;
            };
            Colony.OnlinePhase = () => Status == "online" ? (float)(2 * Math.PI * ((ServerNowMs / 1000.0) % 120.0) / 120.0) : Colony.I.S.dayTime * Mathf.PI * 4f;
            Colony.OnlineStorm = () => EventLeft("sturmflut");
        }

        public int[] TroopsAway()
        {
            var a = Units.Zero();
            foreach (var m in Marches) a = Units.Add(a, J.U(m, "u"));
            if (World != null && Me != null) foreach (var t in J.L(World, "territories")) if (J.S(t, "owner") == MyId) a = Units.Add(a, J.U(t, "gu"));
            return a;
        }

        public float EventLeft(string kind)
        {
            if (!Active) return 0;
            double now = ServerNowMs;
            foreach (var e in Events) if (J.S(e, "kind") == kind) { double l = (J.Ms(e, "until") - now) / 1000.0; if (l > 0) return (float)l; }
            return 0;
        }

        // ---------- Abgleich ----------
        Dictionary<string, object> Snapshot()
        {
            var c = Colony.I; var s = c.S2;
            return new Dictionary<string, object>
            {
                { "form", new List<object> { s.formation[0], s.formation[1], s.formation[2], s.formation[3], s.formation[4] } },
                { "gcap", 15 + 10 * c.TowerLevel }, { "power", c.Power }, { "tower", c.TowerLevel },
                { "u", new List<object> { s.troops[0], s.troops[1], s.troops[2], s.troops[3], s.troops[4] } },
                { "laz", c.Levels(BType.Lazarett) }, { "vip", c.VipLevel }, { "lm", c.Levels(BType.Wahrzeichen) }, { "ach", s.ach.Count },
                { "h", s.troops[0] }, { "w", s.troops[1] }, { "def", c.Defense },
                { "res", new List<object> { Mathf.Floor(c.S.res[0]), Mathf.Floor(c.S.res[1]), Mathf.Floor(c.S.res[2]), Mathf.Floor(c.S.res[3]) } },
            };
        }

        public void Sync() => DoSync(false, null, null);

        void DoSync(bool strict, Action ok, Action<string> fail)
        {
            if (!Active) return;
            CallF("sync", () => new Dictionary<string, object> { { "p_token", Token }, { "p_snap", Snapshot() } }, r => { Apply(r); ok?.Invoke(); }, (code, m) =>
            {
                Status = code == "NETZ" ? "offline" : "fehler"; Error = m;
                if (strict) fail?.Invoke(m);
            }, strict);
        }

        void Apply(object r)
        {
            var c = Colony.I; var s = c.S2;
            OffsetMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - J.Ms(r, "now");
            Me = J.D(r, "me");
            PlayerName = J.S(Me, "name");
            Marches = J.L(r, "marches"); Owned = J.L(r, "owned"); Incoming = J.I(r, "incoming");
            var d = J.D(r, "delta");
            if (d != null)
            {
                var res = J.R4(d, "res"); for (int i = 0; i < 4; i++) if (res[i] != 0) c.AddRes(i, res[i]);
                var du = J.U(d, "u");
                s.troops = Units.Max0(Units.Add(s.troops, du));
                var wd = J.U(d, "wounded");
                if (Units.Sum(wd) > 0)
                {
                    int cap = Colony.LazBeds(c.Levels(BType.Lazarett)), room = Mathf.Max(0, cap - Units.Sum(s.wounded));
                    if (Units.Sum(wd) > room) wd = Units.Scale(wd, room / (float)Units.Sum(wd));
                    s.wounded = Units.Add(s.wounded, wd);
                    if (Units.Sum(wd) > 0) c.Msg($"{Units.Sum(wd)} Verwundete sind im Lazarett angekommen.");
                }
                int vip = J.I(d, "vip"); if (vip > 0) c.AddVip(vip);
                var items = J.D(d, "items");
                if (items != null)
                    foreach (var kv in items)
                    {
                        int n = (int)Math.Round(kv.Value is double dv ? dv : 0); if (n <= 0) continue;
                        if (kv.Key == "medals") s.medals += n;
                        else if (kv.Key == "ore") s.ore += n;
                        else { int k = Items.Index(kv.Key); if (k >= 0) s.items[k] += n; }
                    }
                int back = 0; foreach (int v in du) back += Mathf.Max(0, v);
                if (back > 0) c.Msg($"{back} Krieger sind eingetroffen{(res[0] + res[1] + res[2] + res[3] > 0 ? " – mit Beute!" : ".")}");
            }
            Lh = J.D(r, "lh"); OpenRallies = J.I(r, "rallies"); AllyB = J.D(r, "ally"); Boss = J.D(r, "boss");
            Colony.AllyAtk = J.F(AllyB, "atk"); Colony.AllyDef = J.F(AllyB, "def"); Colony.AllyGather = J.F(AllyB, "gather"); Colony.AllyBuild = J.F(AllyB, "build");
            Colony.AllyMarch = J.F(AllyB, "march"); Colony.AllyStorage = J.F(AllyB, "storage"); Colony.AllyDike = J.F(AllyB, "dike");
            Colony.AllyLandmark = J.F(AllyB, "landmark"); Colony.AllyWorkshop = J.F(AllyB, "workshop");
            Events = J.L(r, "events"); Title = J.S(r, "title");
            Colony.DoubleGatherEvent = EventLeft("doppelt") > 0;
            HelpOpen = J.I(r, "help_open"); Garrison = J.I(r, "garrison"); GCap = J.I(r, "gcap"); TroopReq = J.I(r, "troop_req");
            War = J.D(r, "war"); Trophies = J.I(r, "trophies");
            var news = J.D(r, "news");
            if (news != null && J.I(news, "id") > PlayerPrefs.GetInt("pf_news", 0)) { NewsPending = news; PlayerPrefs.SetInt("pf_news", J.I(news, "id")); }
            ApplyHelps(J.L(r, "helps"));
            AskHelps();
            Reports = J.L(r, "reports");
            for (int k = Reports.Count - 1; k >= 0; k--)
            {
                var rep = Reports[k]; long id = (long)J.N(rep, "id");
                if (id <= lastReport) continue;
                string text = J.Clean(J.S(rep, "text"));
                c.Msg(text);
                if (lastReport > 0 && J.V(rep, "win") is bool w && w && text.StartsWith("Sieg")) c.QuestEvent(Stat.Win, 1);
                lastReport = id;
            }
            PlayerPrefs.SetString("pf_lastrep", lastReport.ToString());
            Status = "online"; Error = "";
        }

        // ---------- Allianz-Hilfe ----------
        public static List<KeyValuePair<string, string>> HelpTargets(Colony c)
        {
            var o = new List<KeyValuePair<string, string>>();
            for (int i = 0; i < c.S.plots.Length; i++) { var p = c.S.plots[i]; if (p.type >= 0 && p.buildLeft > 1) o.Add(new KeyValuePair<string, string>($"b:{i}:{p.level + 1}", $"Bau Stufe {p.level + 1}")); }
            if (c.S2.researchIdx >= 0 && c.S2.researchLeft > 1) o.Add(new KeyValuePair<string, string>($"r:{Prog.Tech[c.S2.researchIdx].Id}:{c.S2.tech[c.S2.researchIdx] + 1}", "Forschung"));
            return o;
        }
        static float HelpStep(float total) => Mathf.Max(30f, total * 0.015f);
        static float ApplyHelp(Colony c, string key, int n)
        {
            var parts = key.Split(':'); if (parts.Length < 3) return 0;
            int lv; int.TryParse(parts[2], out lv);
            if (parts[0] == "b")
            {
                int i; int.TryParse(parts[1], out i);
                if (i < 0 || i >= c.S.plots.Length) return 0;
                var p = c.S.plots[i];
                if (p.buildLeft <= 0 || p.level + 1 != lv) return 0;
                float red = Mathf.Min(p.buildLeft - 0.5f, HelpStep(p.buildTotal) * n);
                if (red <= 0) return 0; p.buildLeft -= red; return red;
            }
            if (parts[0] == "r")
            {
                int k = Prog.TechIdx(parts[1]);
                if (k < 0 || c.S2.researchIdx != k || c.S2.tech[k] + 1 != lv) return 0;
                float red = Mathf.Min(c.S2.researchLeft - 0.5f, HelpStep(c.S2.researchTotal) * n);
                if (red <= 0) return 0; c.S2.researchLeft -= red; return red;
            }
            return 0;
        }
        void ApplyHelps(List<object> list)
        {
            var c = Colony.I; var s = c.S2;
            var keys = new List<string>(); var ns = new List<int>();
            int total = 0; float sec = 0;
            foreach (var h in list)
            {
                string key = J.S(h, "key"); int got = J.I(h, "got");
                int k = s.helpKeys.IndexOf(key), prev = k >= 0 ? s.helpN[k] : 0;
                if (got > prev) { sec += ApplyHelp(c, key, got - prev); total += got - prev; }
                keys.Add(key); ns.Add(Mathf.Max(got, prev));
            }
            s.helpKeys = keys; s.helpN = ns;
            if (total > 0 && sec > 0) c.Msg($"{total}× Allianz-Hilfe: −{Defs.Time(sec)}");
        }
        void AskHelps()
        {
            if (!InAlliance) return;
            var c = Colony.I; var now = new List<string>();
            foreach (var t in HelpTargets(c))
            {
                now.Add(t.Key);
                if (!c.S2.helpReq.Contains(t.Key))
                {
                    string key = t.Key;
                    Call("help_ask", new Dictionary<string, object> { { "p_token", Token }, { "p_key", key }, { "p_label", t.Value } }, null, (code, m) => c.S2.helpReq.Remove(key));
                }
            }
            c.S2.helpReq = now;
        }

        // ---------- Laden ----------
        Dictionary<string, object> T() => new Dictionary<string, object> { { "p_token", Token } };
        Dictionary<string, object> T(string k, object v) { var d = T(); d[k] = v; return d; }
        Dictionary<string, object> T(string k, object v, string k2, object v2) { var d = T(k, v); d[k2] = v2; return d; }

        public void LoadWorld(Action done = null) { if (Active) Call("world", T(), d => { World = J.D(d); done?.Invoke(); }); }
        public void LoadAlliances() { if (Active) Call("alliances_list", T(), d => Alliances = J.D(d)); }
        public void LoadChat()
        {
            if (!Active || !InAlliance) return;
            Call("chat_get", T("p_after", chatAfter), d =>
            {
                var msgs = d as List<object>;
                if (msgs != null && msgs.Count > 0) { Chat.AddRange(msgs); if (Chat.Count > 80) Chat.RemoveRange(0, Chat.Count - 80); chatAfter = (long)J.N(msgs[msgs.Count - 1], "id"); }
            });
        }
        public void ResetChat() { Chat.Clear(); chatAfter = 0; }
        public void LoadRanking() { if (Active) Call("ranking", T(), d => Ranking = d as List<object>); }
        public void LoadRallies() { if (Active) Call("rally_list", T(), d => Rallies = d as List<object>); }
        public void AllyProjects() { if (Active) Call("ally_projects", T(), d => Projects = d as List<object>); }
        public void HelpList() { if (Active) Call("help_list", T(), d => Helps = d as List<object>); }
        public void GarrisonInfo() { if (Active) Call("garrison_info", T(), d => Garr = J.D(d)); }
        public void ArenaList() { if (Active) Call("arena_list", T(), d => Arena = J.D(d)); }
        public void WarInfo() { if (Active) Call("war_info", T(), d => WarI = J.D(d)); }
        public void BossInfo() { if (Active) Call("boss_info", T(), d => BossI = J.D(d)); }

        // ---------- Aktionen (mit Rückmeldung) ----------
        void Act(string fn, Dictionary<string, object> args, Action<object> ok) => Call(fn, args, ok, null, true);

        public void SendMarch(string kind, object target, int[] u, float boost, float speed, Action ok)
        {
            var a = T(); a["p_kind"] = kind;
            a["p_target"] = kind == "terr" || kind == "gather" ? target : null;
            a["p_target_player"] = kind == "player" ? target : null;
            a["p_u"] = new List<object> { u[0], u[1], u[2], u[3], u[4] }; a["p_boost"] = boost; a["p_speed"] = speed;
            Act("send_march", a, d => { var s = Colony.I.S2; s.troops = Units.Max0(Units.Sub(s.troops, u)); Sync(); LoadWorld(); ok?.Invoke(); });
        }
        public void Scout(string kind, object target)
        {
            var a = T(); a["p_kind"] = kind; a["p_target"] = kind == "terr" ? target : null; a["p_target_player"] = kind == "player" ? target : null;
            Act("scout", a, d => { Colony.I.Msg("Späher ist unterwegs."); Sync(); });
        }
        public void Withdraw(int terr) => Act("withdraw", T("p_terr", terr), d => { Sync(); LoadWorld(); });
        public void RallyCreate(string kind, object target, int[] u, int wait)
        {
            var a = T(); a["p_kind"] = kind; a["p_target"] = kind == "terr" ? target : null; a["p_target_player"] = kind == "player" ? target : null;
            a["p_u"] = new List<object> { u[0], u[1], u[2], u[3], u[4] }; a["p_wait"] = wait;
            Act("rally_create", a, d => { var s = Colony.I.S2; s.troops = Units.Max0(Units.Sub(s.troops, u)); Colony.I.Msg("Sammelangriff ausgerufen!"); Sync(); LoadRallies(); });
        }
        public void RallyJoin(long id, int[] u)
            => Act("rally_join", T("p_rally", id, "p_u", new List<object> { u[0], u[1], u[2], u[3], u[4] }), d => { var s = Colony.I.S2; s.troops = Units.Max0(Units.Sub(s.troops, u)); Colony.I.Msg("Du machst beim Sammelangriff mit."); Sync(); LoadRallies(); });
        public void SendHelp(string to, float[] res)
            => Act("send_help", T("p_to", to, "p_res", new List<object> { res[0], res[1], res[2], res[3] }), d => { var c = Colony.I; for (int i = 0; i < 4; i++) c.S.res[i] = Mathf.Max(0, c.S.res[i] - res[i]); c.Msg("Hilfe ist unterwegs."); Sync(); });
        public void BossAttack(int[] u, float boost)
            => Act("boss_attack", T("p_u", new List<object> { u[0], u[1], u[2], u[3], u[4] }, "p_boost", boost), d =>
            {
                var s = Colony.I.S2; s.troops = Units.Max0(Units.Sub(s.troops, J.U(d, "lost")));
                Colony.I.Msg(J.B(d, "killed") ? "Die Riesenkrake ist besiegt!" : $"Treffer! {J.I(d, "dmg")} Schaden.");
                Sync(); BossInfo();
            });
        public void Redeem(string code, Action<string> done) => Act("redeem_code", T("p_code", code), d => { if (J.B(d, "ok")) { Sync(); done?.Invoke("Eingelöst: " + J.Clean(J.S(d, "text"))); } else done?.Invoke(J.S(d, "err")); });
        public void CreateAlliance(string name, string tag) => Act("alliance_create", T("p_name", name, "p_tag", tag), d => { ResetChat(); Sync(); LoadAlliances(); });
        public void JoinAlliance(string id) => Act("alliance_join", T("p_alliance", id), d => { ResetChat(); Sync(); LoadAlliances(); });
        public void LeaveAlliance() => Act("alliance_leave", T(), d => { ResetChat(); Sync(); LoadAlliances(); });
        public void Kick(string id) => Act("alliance_kick", T("p_player", id), d => LoadAlliances());
        public void SendChat(string text) => Act("chat_send", T("p_text", text), d => LoadChat());
        public void AllyDonate(string kind, float[] res)
            => Act("ally_donate", T("p_kind", kind, "p_res", new List<object> { res[0], res[1], res[2], res[3] }), d => { var c = Colony.I; for (int i = 0; i < 4; i++) c.S.res[i] = Mathf.Max(0, c.S.res[i] - res[i]); c.Msg("Danke für die Spende!"); AllyProjects(); Sync(); });
        public void HelpGive(object id) => Act("help_give", T("p_id", id), d => { int n = J.I(d, "n"); HelpOpen = Mathf.Max(0, HelpOpen - n); Colony.I.Msg(n > 0 ? $"{n}× geholfen" + (J.I(d, "reward") > 0 ? $" · +{J.I(d, "reward") * 15} Altmetall" : "") : "Gerade gibt es nichts zu helfen."); HelpList(); Sync(); });
        public void TroopRequest() => Act("troop_request", T(), d => { Colony.I.Msg("Deine Allianz wurde um Verstärkung gebeten."); LoadChat(); });
        public void TroopDonate(string to, int[] u)
            => Act("troop_donate", T("p_to", to, "p_u", new List<object> { u[0], u[1], u[2], u[3], u[4] }), d => { var s = Colony.I.S2; s.troops = Units.Max0(Units.Sub(s.troops, u)); Colony.I.Msg($"{Units.Sum(u)} Krieger verschickt."); Sync(); GarrisonInfo(); });
        public void GarrisonBack(string other) => Act("garrison_back", T("p_other", other), d => { Sync(); GarrisonInfo(); });
        public void ArenaFight(string target, int bot, float boost, Action<object> done)
            => Act("arena_fight", T("p_target", string.IsNullOrEmpty(target) ? null : target, "p_bot", bot > 0 ? (object)bot : null).With("p_boost", boost), d => { ArenaList(); done?.Invoke(d); });
        public void ArenaClaim() => Act("arena_claim", T(), d => { Colony.I.Msg($"Liga-Belohnung: {J.I(d, "medals")} Abzeichen, {J.I(d, "ore")} Schmiedeeisen, je {J.I(d, "res")} Rohstoffe"); Sync(); ArenaList(); });
        public void WarDeclare(string id) => Act("war_declare", T("p_alliance", id), d => { Colony.I.Msg("Der Krieg ist erklärt!"); Sync(); WarInfo(); });
        public void GatherRecall(long id) => Act("gather_recall", T("p_march", id), d => { Colony.I.Msg("Trupp kehrt mit der Ladung heim."); Sync(); LoadWorld(); });
        public void Replay(long id, Action<object> done) => Act("report_replay", T("p_id", id), done);

        // ---------- Spielleiter ----------
        public void AdminBroadcast(string text) => Act("admin_broadcast", T("p_text", text), d => { Colony.I.Msg("Nachricht verschickt."); Sync(); });
        public void AdminEvent(string kind, int minutes) => Act("admin_event", T("p_kind", kind, "p_minutes", minutes), d => { Colony.I.Msg("Ereignis gestartet."); Sync(); });
        public void AdminBoss() => Act("admin_boss", T(), d => { Colony.I.Msg("Riesenkrake gerufen."); Sync(); });
        public void AdminPlayers() => Call("admin_players", T(), d => Players = d as List<object>);
        public void AdminBan(string id, bool ban) => Act("admin_ban", T("p_player", id, "p_ban", ban), d => AdminPlayers());
        public void LoadCodes() { if (IsAdmin) Call("admin_codes", T(), d => Codes = d as List<object>); }
        public void SaveCode(string code, float[] res, int[] u, int days, int max, int vip)
        {
            var a = T("p_code", code, "p_res", new List<object> { res[0], res[1], res[2], res[3] });
            a["p_u"] = new List<object> { u[0], u[1], u[2], u[3], u[4] }; a["p_days"] = days; a["p_max"] = max; a["p_vip"] = vip;
            Act("admin_code_save", a, d => { Colony.I.Msg($"Code {code} gespeichert."); LoadCodes(); });
        }
        public void DeleteCode(string code) => Act("admin_code_delete", T("p_code", code), d => LoadCodes());
        public void AdminAvatars() => Call("admin_avatars", T(), d => AvQueue = d as List<object>);
        public void AdminAvatarSet(string id, bool ok) => Act("admin_avatar_set", T("p_player", id, "p_ok", ok), d => AdminAvatars());
    }

    static class DictExt
    {
        public static Dictionary<string, object> With(this Dictionary<string, object> d, string k, object v) { d[k] = v; return d; }
    }
}
