using System;
using System.Collections.Generic;
using UnityEngine;
using Random = UnityEngine.Random;

namespace Pfahlstadt
{
    /// Truppen, Ausbildung, Lazarett, Überfälle, Berichte, Boni (Teil der Spiellogik)
    public partial class Colony
    {
        public const float UpkeepPerSec = 0.004f;     // Muscheln pro Sekunde und Krieger
        Mods mods;
        public Mods M { get { if (mods == null) RecalcMods(); return mods; } }

        // ---------- Grundgerüst ----------

        void EnsureExtra()
        {
            if (S2 == null) S2 = new SaveData2();
            var s = S2;
            if (s.troops == null || s.troops.Length != 5) s.troops = Units.Copy(s.troops);
            if (s.wounded == null || s.wounded.Length != 5) s.wounded = Units.Copy(s.wounded);
            if (s.formation == null || s.formation.Length != 5) s.formation = new int[5];
            if (s.train == null) s.train = new List<TrainJob>();
            if (s.reports == null) s.reports = new List<ReportEntry>();
            if (s.terr == null) s.terr = new List<Terr>();
            if (s.marches == null) s.marches = new List<March>();
            if (s.items == null || s.items.Length != 5) s.items = new int[5];
            if (s.tech == null || s.tech.Length != Prog.Tech.Length) s.tech = new int[Prog.Tech.Length];
            if (s.capLvl == null || s.capLvl.Length != 5) s.capLvl = new int[5];
            if (s.capBusy == null || s.capBusy.Length != 5) s.capBusy = new long[5];
            if (s.gear == null || s.gear.Length != 20) s.gear = new int[20];
            if (s.quests == null) s.quests = new List<Quest>();
            if (s.ach == null) s.ach = new List<string>();
            if (s.passGot == null) s.passGot = new List<int>();
            if (s.stats == null || s.stats.Length != 10) s.stats = new int[10];
            if (s.offers == null) s.offers = new List<Offer>();
            if (s.bq == null) s.bq = new List<QueueItem>();
            if (s.bots == null) s.bots = new List<Bot>();
            if (s.botMarches == null) s.botMarches = new List<BotMarch>();
            if (s.treasures == null) s.treasures = new List<Spot>();
            if (s.obst == null) s.obst = new List<Spot>();
            if (s.nodes == null) s.nodes = new List<ResNode>();
            if (s.gath == null) s.gath = new List<Gatherer>();
            if (s.botLevel < 1) s.botLevel = 1;
            if (s.playerName == null) s.playerName = "";
            if (s.terr.Count != 18) s.terr = MakeTerritories();
            if (s.bots.Count != 3) MakeBots();
            if (s.nodes.Count == 0 && s.gath.Count == 0) for (int k = 0; k < 4; k++) SpawnNodeAt(k);
            RecalcMods();
        }

        void TickExtra(float dt, bool offline)
        {
            RecalcMods();
            Military(dt, offline);
            HealTick(dt);
            ResearchTick(dt);
            BoatTick(dt);
            BotTick(dt);
            Gathering(dt, offline);
            if (offline) return;
            TraderTick(dt);
            TreasureTick(dt);
            ObstTick(dt);
            SummerTick(dt);
            QueueTick();
            achT -= dt;
            if (achT <= 0f) { achT = 2f; CheckAch(); }
        }
        float achT;

        public void AddRes(int i, float v)
        {
            S.res[i] = Mathf.Max(0f, Mathf.Min(Mathf.Max(Storage, S.res[i]), S.res[i] + v));
        }

        public void Report(string text, bool? win, Replay rp = null)
        {
            var e = new ReportEntry { text = text, win = win == null ? 0 : (win.Value ? 1 : -1), day = S.days, time = S.dayTime };
            if (rp != null) { e.hasRp = true; e.rp = rp; }
            S2.reports.Insert(0, e);
            if (S2.reports.Count > 25) S2.reports.RemoveRange(25, S2.reports.Count - 25);
            Msg(text);
        }

        // ---------- Boni ----------

        public int VipLevel { get { int L = 0; for (int i = 1; i <= 10; i++) if (S2.vipPts >= Prog.VipPts[i]) L = i; return L; } }
        public int TechLv(string id) { int k = Prog.TechIdx(id); return k >= 0 ? S2.tech[k] : 0; }

        /// Boni der Allianz (online); offline alles 0
        public static float AllyAtk, AllyDef, AllyGather, AllyBuild, AllyMarch, AllyStorage, AllyDike, AllyLandmark, AllyWorkshop;

        void RecalcMods()
        {
            if (S2 == null) { mods = new Mods(); return; }
            int v = VipLevel, L = Levels(BType.Wahrzeichen);
            float[] vp = { 0, 0.02f, 0.02f, 0.02f, 0.05f, 0.05f, 0.05f, 0.08f, 0.08f, 0.08f, 0.12f };
            float[] vb = { 0, 0, 0.05f, 0.05f, 0.05f, 0.1f, 0.1f, 0.1f, 0.15f, 0.15f, 0.15f };
            var m = mods ?? new Mods();
            m.Prod = (1 + vp[v]) * (1 + 0.05f * TechLv("prod")) * (1 + 0.02f * L) * (1 + AllyLandmark + AllyWorkshop);
            m.Build = 1f / (1 + vb[v]) * Mathf.Max(0.5f, 1 - 0.06f * TechLv("build")) * (1 - AllyBuild);
            m.Train = 1f / (1 + (v >= 9 ? 0.2f : v >= 5 ? 0.1f : 0f)) * Mathf.Max(0.5f, 1 - 0.08f * TechLv("drill"));
            m.Builds = 2 + (v >= 3 ? 1 : 0) + (v >= 7 ? 1 : 0);
            m.Queue = 3 + (v >= 5 ? 1 : 0);
            m.Gather = 1 + (v >= 4 ? 0.1f : 0f) + 0.1f * TechLv("gath") + AllyGather;
            m.Atk = (1 + (v >= 10 ? 0.1f : v >= 6 ? 0.05f : 0f)) * (1 + 0.05f * TechLv("atk")) * (1 + AllyAtk);
            m.Def = (1 + (v >= 10 ? 0.1f : v >= 6 ? 0.05f : 0f)) * (1 + 0.05f * TechLv("def")) * (1 + AllyDef);
            m.Save = (v >= 8 ? 0.1f : 0f) + 0.05f * TechLv("med");
            m.Travel = (v >= 9 ? 0.9f : 1f) * Mathf.Max(0.6f, 1 - 0.06f * TechLv("navi")) * (1 - AllyMarch);
            m.Store = (1 + 0.1f * TechLv("store")) * (1 + AllyStorage);
            m.Deck = 0.3f * TechLv("pile");
            m.Dam = AllyDike;
            mods = m;
        }

        // ---------- Jahreszeiten (jede echte Woche, für alle gleich) ----------
        public static readonly string[] SeasonNames = { "Frühling", "Sommer", "Herbst", "Winter" };
        public static readonly string[] SeasonTexts =
        {
            "Regenfänger +20 %, Verwundete heilen schneller",
            "Muscheln +15 %, Badegäste kaufen Muscheln gegen Altmetall",
            "Treibholz +25 %, häufiger Sturmfluten",
            "Eisgang: Muscheln −20 %, Wattwanderungen dauern länger und sind gefährlich",
        };
        static readonly DateTime SeasonEpoch = new DateTime(2026, 11, 23, 0, 0, 0, DateTimeKind.Utc);
        public static int SeasonIdx
        {
            get { long k = (long)Math.Floor((DateTime.UtcNow - SeasonEpoch).TotalDays / 7.0); return (int)(((k % 4) + 4) % 4); }
        }
        public static double SeasonLeftSec
        {
            get { double d = (DateTime.UtcNow - SeasonEpoch).TotalDays / 7.0; return (Math.Floor(d) + 1 - d) * 7 * 86400; }
        }
        float SeasonProdMul(int res)
        {
            int si = SeasonIdx;
            if (si == 0 && res == (int)Res.Wasser) return 1.2f;
            if (si == 1 && res == (int)Res.Muscheln) return 1.15f;
            if (si == 2 && res == (int)Res.Holz) return 1.25f;
            if (si == 3 && res == (int)Res.Muscheln) return 0.8f;
            return 1f;
        }

        void SummerTick(float dt)
        {
            if (SeasonIdx != 1 || S.res[(int)Res.Muscheln] < 60) return;
            S2.summerT -= dt;
            if (S2.summerT > 0) return;
            S2.summerT = 180f + Random.value * 120f;
            float mu = Mathf.Round(Mathf.Min(S.res[1] * 0.05f, 40 + 10 * TowerLevel)), me = Mathf.Round(mu * 0.6f);
            S.res[1] -= mu; AddRes(3, me);
            Msg($"Sommer: Badegäste kaufen {mu} Muscheln und zahlen {me} Altmetall.");
        }

        // ---------- Truppen ----------

        public int[] TroopsAway
        {
            get
            {
                var a = Units.Zero();
                foreach (var m in S2.botMarches) a = Units.Add(a, m.u);
                if (OnlineAway != null) return Units.Add(a, OnlineAway());
                foreach (var m in S2.marches) a = Units.Add(a, m.u);
                foreach (var t in S2.terr) a = Units.Add(a, t.gu);
                return a;
            }
        }
        /// Truppen, die online unterwegs sind (vom Online-Teil gesetzt)
        public static Func<int[]> OnlineAway;
        public static Func<int> OnlineGarrisonUnits;

        public int TroopTotal => Units.Sum(S2.troops) + Units.Sum(TroopsAway);
        /// Muscheln pro Minute für die Krieger: Besatzungen auf Inseln brauchen nur die Hälfte
        public float Upkeep
        {
            get
            {
                int gar = 0;
                if (OnlineGarrisonUnits != null) gar = OnlineGarrisonUnits();
                else foreach (var t in S2.terr) gar += Units.Sum(t.gu);
                return (TroopTotal - 0.5f * gar) * UpkeepPerSec * 60f;
            }
        }
        public int Defense
        {
            get
            {
                float b = Units.Str(S2.troops, null, false, 0) * M.Def + Healthy * 2 + 40 * Levels(BType.Abwehrturm);
                return Mathf.RoundToInt(b * (1 + 0.12f * Levels(BType.Wachturm) + 0.15f * Levels(BType.Festungsmauer)));
            }
        }
        public int Power
        {
            get { int b = 0; foreach (var p in S.plots) if (p.type >= 0) b += p.level * 10; return b + TroopTotal * 2 + Defense; }
        }
        public int TideNow => Units.TideState(TideSin);

        public int TrainSlots => 10 * Levels(BType.Kaserne);
        public int Queued { get { int n = 0; foreach (var q in S2.train) n += q.n; return n; } }
        public string TrainBlocker(int u, int n)
        {
            if (Levels(BType.Kaserne) <= 0) return "Erst eine Kaserne bauen";
            if (Levels(Units.All[u].Building) <= 0) return $"Erst {Defs.Get(Units.All[u].Building).Name} bauen";
            if (Queued + n > TrainSlots) return $"Schlange voll (max. {TrainSlots})";
            if (!CanAfford(Units.CostOf(u, n))) return "Zu wenig Rohstoffe";
            return null;
        }
        public bool StartTrain(int u, int n)
        {
            if (n <= 0 || TrainBlocker(u, n) != null) return false;
            Pay(Units.CostOf(u, n));
            float per = Units.All[u].Time / (1 + 0.25f * (Levels(BType.Kaserne) - 1)) / (1 + 0.1f * (Levels(Units.All[u].Building) - 1)) * M.Train;
            S2.train.Add(new TrainJob { u = u, n = n, per = per, left = per });
            Msg($"{n}× {Units.All[u].Name} in Ausbildung.");
            return true;
        }
        /// Krieger entlassen: 25 % der Kosten zurück
        public int Dismiss(int u, int n)
        {
            n = Mathf.Min(n, S2.troops[u]); if (n <= 0) return 0;
            S2.troops[u] -= n;
            var c = Units.CostOf(u, n);
            for (int i = 0; i < 4; i++) if (c[i] > 0) AddRes(i, Mathf.Floor(c[i] * 0.25f));
            Msg($"{n}× {Units.All[u].Name} entlassen (25 % der Kosten zurück).");
            return n;
        }

        // ---------- Lazarett ----------
        public static float LazSave(int L) => L > 0 ? Mathf.Min(0.6f, 0.25f + 0.02f * L) : 0f;
        public static int LazBeds(int L) => 25 * L;
        public void AddWounded(int[] u)
        {
            int L = Levels(BType.Lazarett); if (L <= 0 || u == null) return;
            float f = Mathf.Min(0.8f, LazSave(L) + M.Save);
            int cap = LazBeds(L), room = cap - Units.Sum(S2.wounded);
            if (room <= 0) return;
            var w = Units.Scale(u, f);
            if (Units.Sum(w) > room) w = Units.Scale(w, room / (float)Units.Sum(w));
            S2.wounded = Units.Add(S2.wounded, w);
            if (Units.Sum(w) > 0) Msg($"{Units.Sum(w)} Verwundete im Lazarett.");
        }
        void HealTick(float dt)
        {
            int L = Levels(BType.Lazarett);
            if (L <= 0 || Units.Sum(S2.wounded) <= 0) return;
            S2.healT += dt * L * (SeasonIdx == 0 ? 1.5f : 1f);
            while (S2.healT >= 8f)
            {
                int k = -1; for (int i = 0; i < 5; i++) if (S2.wounded[i] > 0) { k = i; break; }
                if (k < 0) break;
                float cm = Mathf.Ceil(Units.All[k].Cost[1] * 0.3f), cw = Mathf.Ceil(Units.All[k].Cost[0] * 0.2f);
                if (S.res[1] < cm || S.res[2] < cw) { S2.healT = 8f; break; }
                S.res[1] -= cm; S.res[2] -= cw;
                S2.wounded[k]--; S2.troops[k]++; S2.healT -= 8f;
                QuestEvent(Stat.Heal, 1);
            }
        }

        // ---------- Ausbildung, Märsche, Überfälle ----------
        void Military(float dt, bool offline)
        {
            var s = S2;
            if (s.train.Count > 0)
            {
                var q = s.train[0];
                q.left -= dt;
                while (q.left <= 0f && q.n > 0) { q.n--; s.troops[q.u]++; QuestEvent(Stat.Train, 1); q.left += q.per; }
                if (q.n <= 0) { s.train.RemoveAt(0); Msg($"Ausbildung fertig: {Units.All[q.u].Name}."); }
            }
            SeaTick(dt, offline);
            if (offline) return;

            // Überfälle auf die Stadt (ab Tag 2)
            if (S.days >= 2)
            {
                float before = s.raidTimer;
                s.raidTimer -= dt;
                if (before >= 30f && s.raidTimer < 30f) Msg("Späher melden: Piratenboote nähern sich der Stadt!");
                if (s.raidTimer <= 0f) Raid();
            }
        }

        public float RaidIn => S.days >= 2 ? S2.raidTimer : -1f;

        void Raid()
        {
            var s = S2;
            s.raidTimer = 420f + Random.value * 300f;
            float str = (25 + 18 * (S.days - 1) + 10 * TowerLevel) * (0.8f + Random.value * 0.4f);
            float fm = Units.FormMul(s.formation), troopPart = Units.Str(s.troops, null, false, 0) * M.Def;
            float def = (Defense + troopPart * (fm - 1f)) * (0.85f + Random.value * 0.3f);
            int n = Mathf.Max(4, Mathf.RoundToInt(str / 8f));
            int[] pu = { Mathf.RoundToInt(n * 0.3f), Mathf.RoundToInt(n * 0.1f), Mathf.RoundToInt(n * 0.35f), Mathf.RoundToInt(n * 0.1f), Mathf.RoundToInt(n * 0.15f) };
            var rp = new Replay { an = "Piraten", au = pu, dn = string.IsNullOrEmpty(s.playerName) ? "Pfahlstadt" : s.playerName, du = Units.Copy(s.troops), def = Defense, df = Units.Copy(s.formation), tide = TideNow, raid = true };
            if (def > str)
            {
                float loss = Mathf.Min(0.8f, Mathf.Pow(str / def, 1.3f) * 0.5f);
                var lost = Units.Scale(s.troops, loss);
                rp.win = false; rp.al = pu; rp.dl = lost;
                s.troops = Units.Sub(s.troops, lost); AddWounded(lost);
                Report($"Piratenüberfall abgewehrt! (Stärke {Mathf.RoundToInt(str)} gegen {Mathf.RoundToInt(def)}) Verluste: {Units.Text(lost)}.", true, rp);
            }
            else
            {
                var lostRes = new float[4];
                for (int i = 0; i < 4; i++) { lostRes[i] = Mathf.Round(S.res[i] * 0.2f); S.res[i] -= lostRes[i]; }
                var keep = Units.Scale(s.troops, 0.4f);
                var lost = Units.Sub(s.troops, keep);
                rp.win = true; rp.al = Units.Scale(pu, 0.3f); rp.dl = lost;
                AddWounded(lost);
                s.troops = keep;
                Report($"Piraten haben die Stadt geplündert! (Stärke {Mathf.RoundToInt(str)} gegen {Mathf.RoundToInt(def)}) Verloren: {lostRes[0]} Holz, {lostRes[1]} Muscheln, {lostRes[2]} Wasser, {lostRes[3]} Altmetall.", false, rp);
            }
        }

        public void SetRow(int unit, int row) { S2.formation[unit] = Mathf.Clamp(row, 0, 2); }
        public void SetFormation(int preset) { S2.formation = (int[])Units.FormPresets[preset].Clone(); Msg($"Aufstellung „{Units.FormNames[preset]}“ gewählt."); }
    }
}
