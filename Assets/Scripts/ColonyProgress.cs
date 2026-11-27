using System;
using System.Collections.Generic;
using UnityEngine;
using Random = UnityEngine.Random;

namespace Pfahlstadt
{
    /// VIP, Forschung, Kapitäne, Schmiede, Werft, Beschleuniger, Belohnungen, Aufgaben, Erfolge, Pass, Händler
    public partial class Colony
    {
        static string Today => DateTime.Now.ToString("yyyy-M-d");
        static string Yesterday => DateTime.Now.AddDays(-1).ToString("yyyy-M-d");
        static string MonthKey => DateTime.Now.ToString("yyyy-M");
        float LevelF(float k) => 1f + k * (TowerLevel - 1);

        // ---------- VIP ----------
        public void AddVip(int n)
        {
            int before = VipLevel;
            S2.vipPts += n;
            int after = VipLevel;
            if (after > before) Msg($"VIP-Stufe {after} erreicht! {Prog.VipPerks[after]}");
        }
        public bool VipChestCan => VipLevel >= 1 && S2.vipDay != Today;
        public void VipChest(out float[] res, out int[] items, out int medals)
        {
            int L = VipLevel; float f = LevelF(0.3f);
            res = new float[] { Mathf.Round(300 * L * f), Mathf.Round(300 * L * f), Mathf.Round(300 * L * f), Mathf.Round(300 * L * 0.3f * f) };
            items = new int[5]; items[1] = L; if (L >= 4) items[2] = L - 3; if (L >= 8) items[3] = L - 7;
            medals = Mathf.CeilToInt(L / 3f);
        }
        public bool ClaimVipChest()
        {
            if (!VipChestCan) return false;
            VipChest(out var res, out var items, out var medals);
            for (int i = 0; i < 4; i++) if (res[i] > 0) AddRes(i, res[i]);
            for (int i = 0; i < 5; i++) S2.items[i] += items[i];
            S2.medals += medals;
            S2.vipDay = Today;
            Msg("VIP-Truhe geöffnet!");
            return true;
        }

        // ---------- Forschung ----------
        public static float[] TechCost(int k, int lv) { var c = new float[4]; for (int i = 0; i < 4; i++) c[i] = Mathf.Round(Prog.Tech[k].Cost[i] * Mathf.Pow(1.8f, lv - 1)); return c; }
        public float TechTime(int lv) => 60f * Mathf.Pow(2, lv - 1) / (1 + 0.1f * Mathf.Max(0, Levels(BType.Akademie) - 1));
        public string TechBlocker(int k)
        {
            int lv = S2.tech[k] + 1, ak = Levels(BType.Akademie);
            if (ak <= 0) return "Erst die Akademie bauen";
            if (lv > Prog.TechMax) return "Fertig erforscht";
            if (S2.researchIdx >= 0) return "Es wird schon geforscht";
            if (ak < 2 * lv - 1) return $"Braucht Akademie Stufe {2 * lv - 1}";
            if (!CanAfford(TechCost(k, lv))) return "Zu wenig Rohstoffe";
            return null;
        }
        public bool StartTech(int k)
        {
            if (TechBlocker(k) != null) return false;
            int lv = S2.tech[k] + 1; float tt = TechTime(lv);
            Pay(TechCost(k, lv));
            S2.researchIdx = k; S2.researchLeft = S2.researchTotal = tt;
            Msg($"Forschung gestartet: {Prog.Tech[k].Name} {lv}");
            return true;
        }
        void ResearchTick(float dt)
        {
            if (S2.researchIdx < 0 || Levels(BType.Akademie) <= 0) return;
            S2.researchLeft -= dt;
            if (S2.researchLeft <= 0f)
            {
                int k = S2.researchIdx; S2.tech[k]++; S2.researchIdx = -1;
                Msg($"Erforscht: {Prog.Tech[k].Name} Stufe {S2.tech[k]} ({Prog.Tech[k].Text})");
            }
        }

        // ---------- Kapitäne ----------
        public bool CapHired(int k) => k >= 0 && k < 5 && S2.capLvl[k] > 0;
        public bool CapFree(int k) => CapHired(k) && S2.capBusy[k] <= DateTime.UtcNow.Ticks;
        static float CapMul(int lvl) => 1 + 0.1f * (lvl - 1);
        public string HireCaptain(int k)
        {
            if (CapHired(k)) return "Schon angeheuert";
            if (S2.medals < Prog.Captains[k].Cost) return $"Braucht {Prog.Captains[k].Cost} Kapitänsabzeichen";
            S2.medals -= Prog.Captains[k].Cost; S2.capLvl[k] = 1;
            Msg($"{Prog.Captains[k].Name} ist an Bord!");
            return null;
        }
        public string UpCaptain(int k)
        {
            if (!CapHired(k)) return "Nicht angeheuert";
            if (S2.capLvl[k] >= 10) return "Höchste Stufe";
            int need = S2.capLvl[k] * 2;
            if (S2.medals < need) return $"Braucht {need} Abzeichen";
            S2.medals -= need; S2.capLvl[k]++;
            Msg($"{Prog.Captains[k].Name} ist jetzt Stufe {S2.capLvl[k]}.");
            return null;
        }
        public int GearLv(int cap, int slot) => S2.gear[cap * 4 + slot];
        public static int GearOre(int lv) => 2 + 2 * lv;
        public static int GearMetal(int lv) => 50 * lv;
        public string GearBlocker(int cap, int slot)
        {
            if (!CapHired(cap)) return "Kapitän erst anheuern";
            int k = GearLv(cap, slot) + 1;
            if (k > Prog.GearMax) return "Höchste Stufe";
            if (k > S2.capLvl[cap] + 2) return $"Braucht Kapitän Stufe {k - 2}";
            if (S2.ore < GearOre(k)) return $"Braucht {GearOre(k)} Schmiedeeisen";
            if (S.res[3] < GearMetal(k)) return "Zu wenig Altmetall";
            return null;
        }
        public string Forge(int cap, int slot)
        {
            string e = GearBlocker(cap, slot); if (e != null) return e;
            int k = GearLv(cap, slot) + 1;
            S2.ore -= GearOre(k); S.res[3] -= GearMetal(k);
            S2.gear[cap * 4 + slot] = k;
            Msg($"{Prog.Gear[slot].Name} für {Prog.Captains[cap].Name.Split(' ')[0]} ist jetzt Stufe {k}.");
            return null;
        }
        float GearAtk(int k) => 1 + 0.015f * (GearLv(k, 0) + GearLv(k, 1));
        /// Kampf-Faktor eines Kapitäns (bei Ebbe/Flut/immer) inkl. Ausrüstung
        public float CapAtk(int k, int tide)
        {
            if (!CapHired(k)) return 1f;
            float m = CapMul(S2.capLvl[k]), g = GearAtk(k);
            if (k == 0) return (tide == -1 ? 1 + 0.2f * m : 1f) * g;
            if (k == 1) return (tide == 1 ? 1 + 0.2f * m : 1f) * g;
            if (k == 2) return (1 + 0.12f * m) * g;
            return g;
        }
        public float CapLoot(int k) => CapHired(k) ? (k == 3 ? 1 + 0.3f * CapMul(S2.capLvl[k]) : 1f) * (1 + 0.02f * GearLv(k, 2)) : 1f;
        public float CapSpeed(int k) => CapHired(k) ? (k == 4 ? Mathf.Max(0.5f, 1 - 0.25f * CapMul(S2.capLvl[k]) * 0.8f) : 1f) * (1 - 0.01f * GearLv(k, 3)) : 1f;
        public void CapSend(int k, float travel) { if (CapHired(k)) S2.capBusy[k] = DateTime.UtcNow.AddSeconds(travel * 2 + 5).Ticks; }

        // ---------- Werft ----------
        public int MaxBoats => 2 * Levels(BType.Werft);
        public string BoatBlocker()
        {
            if (Levels(BType.Werft) <= 0) return "Erst die Werft bauen";
            if (S2.boats + (S2.boatLeft > 0 ? 1 : 0) >= MaxBoats) return $"Höchstens {MaxBoats} Kutter (Werft ausbauen)";
            if (S2.boatLeft > 0) return "Es wird schon ein Kutter gebaut";
            if (!CanAfford(Prog.BoatCost)) return "Zu wenig Rohstoffe";
            return null;
        }
        public bool BuildBoat()
        {
            if (BoatBlocker() != null) return false;
            Pay(Prog.BoatCost);
            S2.boatLeft = S2.boatTotal = Prog.BoatTime / (1 + 0.1f * (Levels(BType.Werft) - 1));
            Msg("Ein Kutter wird gebaut.");
            return true;
        }
        void BoatTick(float dt)
        {
            if (S2.boatLeft <= 0) return;
            S2.boatLeft -= dt;
            if (S2.boatLeft <= 0) { S2.boatLeft = 0; S2.boats++; Msg("Neuer Kutter vom Stapel gelaufen!"); }
        }
        public bool FleetFits(int[] u) => S2.boats * Prog.BoatCap >= Units.Sum(u) && Units.Sum(u) > 0;
        public float FleetSpeed(int[] u) => FleetFits(u) ? 0.75f : 1f;
        public float FleetLoot(int[] u) => FleetFits(u) ? 1.25f : 1f;

        // ---------- Beschleuniger ----------
        public int SpeedCount { get { int n = 0; for (int i = 0; i < 5; i++) n += S2.items[i]; return n; } }
        /// kind: plot, train, heal, exp, research, bot, boat, clear
        public string UseSpeed(int item, string kind, int target)
        {
            if (S2.items[item] <= 0) return "Keinen solchen Beschleuniger";
            float sec = Items.Sec[item];
            switch (kind)
            {
                case "plot":
                    {
                        var p = S.plots[target]; if (p.buildLeft <= 0) return "Hier wird nicht gebaut";
                        p.buildLeft = Mathf.Max(0.01f, p.buildLeft - sec); break;
                    }
                case "train":
                    if (S2.train.Count == 0) return "Keine Ausbildung läuft";
                    while (sec > 0 && S2.train.Count > 0)
                    {
                        var q = S2.train[0];
                        if (q.left <= sec) { sec -= q.left; q.n--; S2.troops[q.u]++; QuestEvent(Stat.Train, 1); q.left = q.per; if (q.n <= 0) S2.train.RemoveAt(0); }
                        else { q.left -= sec; sec = 0; }
                    }
                    break;
                case "heal":
                    if (Levels(BType.Lazarett) <= 0 || Units.Sum(S2.wounded) <= 0) return "Niemand im Lazarett";
                    S2.healT += sec * Levels(BType.Lazarett); break;
                case "exp":
                    if (S.expeditionLeft <= 0) return "Keine Wattwanderung unterwegs";
                    S.expeditionLeft = Mathf.Max(0.01f, S.expeditionLeft - sec); break;
                case "research":
                    if (S2.researchIdx < 0) return "Keine Forschung läuft";
                    S2.researchLeft = Mathf.Max(0.01f, S2.researchLeft - sec); break;
                case "boat":
                    if (S2.boatLeft <= 0) return "Kein Kutter im Bau";
                    S2.boatLeft = Mathf.Max(0.01f, S2.boatLeft - sec); break;
                case "bot":
                    if (target < 0 || target >= S2.botMarches.Count) return "Kein Trupp";
                    S2.botMarches[target].left = Mathf.Max(0.01f, S2.botMarches[target].left - sec); break;
                case "clear":
                    if (S2.clearId < 0) return "Es wird nichts geräumt";
                    S2.clearLeft = Mathf.Max(0.01f, S2.clearLeft - sec); break;
                default: return "Geht hier nicht";
            }
            S2.items[item]--;
            Msg($"Beschleuniger {Items.Names[item]} eingesetzt.");
            return null;
        }

        // ---------- Tägliche Belohnung (7-Tage-Kalender) ----------
        static readonly float[][] DailyRes =
        {
            new float[] { 200, 120, 80, 0 }, new float[] { 300, 200, 150, 20 }, new float[] { 0, 0, 0, 60 }, new float[] { 500, 300, 200, 40 },
            new float[] { 0, 400, 300, 80 }, new float[] { 800, 500, 400, 120 }, new float[] { 1000, 800, 600, 200 },
        };
        static readonly int[][] DailyU = { null, null, new[] { 3, 3, 0, 0, 0 }, null, null, null, new[] { 0, 0, 5, 2, 5 } };
        public float[] DailyResFor(int day) { var r = new float[4]; float f = LevelF(0.35f); for (int i = 0; i < 4; i++) r[i] = Mathf.Round(DailyRes[day][i] * f); return r; }
        public int[] DailyUnitsFor(int day) => DailyU[day] != null ? DailyU[day] : Units.Zero();
        public bool DailyCan => S2.dailyLast != Today;
        public int DailyDay => DailyCan ? (S2.dailyLast == Yesterday ? S2.dailyStreak % 7 : 0) : Mathf.Max(0, (S2.dailyStreak - 1) % 7);
        public bool ClaimDaily()
        {
            if (!DailyCan) return false;
            int day = DailyDay;
            var r = DailyResFor(day); var u = DailyUnitsFor(day);
            for (int i = 0; i < 4; i++) if (r[i] > 0) AddRes(i, r[i]);
            S2.troops = Units.Add(S2.troops, u);
            S2.dailyLast = Today; S2.dailyStreak = day + 1;
            QuestEvent(Stat.Daily, 1);
            AddVip(50 + 10 * Mathf.Min(7, S2.dailyStreak));
            Msg($"Tagesbelohnung Tag {day + 1} abgeholt!");
            return true;
        }

        // ---------- Tagesaufgaben ----------
        class QuestDef { public string Id; public Stat St; public string Text; public int[] N; public float[] Rw; }
        static readonly QuestDef[] QuestDefs =
        {
            new QuestDef { Id = "build", St = Stat.Build, Text = "Starte {0} Bau- oder Ausbauarbeiten", N = new[] { 2, 3, 4 }, Rw = new float[] { 0, 0, 0, 40 } },
            new QuestDef { Id = "gather", St = Stat.Gather, Text = "Sammler bringen {0} Rohstoffe heim", N = new[] { 150, 300, 500 }, Rw = new float[] { 200, 150, 0, 0 } },
            new QuestDef { Id = "train", St = Stat.Train, Text = "Bilde {0} Krieger aus", N = new[] { 5, 10, 20 }, Rw = new float[] { 0, 250, 150, 0 } },
            new QuestDef { Id = "win", St = Stat.Win, Text = "Gewinne {0} Kämpfe", N = new[] { 1, 2 }, Rw = new float[] { 300, 0, 0, 80 } },
            new QuestDef { Id = "exp", St = Stat.Exp, Text = "Mach {0} Wattwanderungen", N = new[] { 1, 2, 3 }, Rw = new float[] { 150, 150, 150, 0 } },
            new QuestDef { Id = "trade", St = Stat.Trade, Text = "Handle {0}× mit dem Händlerschiff", N = new[] { 1 }, Rw = new float[] { 0, 0, 200, 50 } },
            new QuestDef { Id = "heal", St = Stat.Heal, Text = "Heile {0} verwundete Krieger", N = new[] { 3, 6 }, Rw = new float[] { 0, 200, 200, 0 } },
            new QuestDef { Id = "bot", St = Stat.Bot, Text = "Versenke {0} Piratenschiffe", N = new[] { 1, 2, 3 }, Rw = new float[] { 250, 150, 0, 60 } },
        };
        static QuestDef QDef(string id) { foreach (var q in QuestDefs) if (q.Id == id) return q; return QuestDefs[0]; }
        public List<Quest> QuestsToday()
        {
            if (S2.questDay != Today || S2.quests.Count != 3)
            {
                uint seed = 7; foreach (char ch in Today) seed = seed * 31 + ch;
                Func<float> R = () => { seed = seed * 1664525u + 1013904223u; return seed / 4294967296f; };
                var pool = new List<QuestDef>(QuestDefs);
                S2.quests = new List<Quest>();
                while (S2.quests.Count < 3)
                {
                    int i = Mathf.Min(pool.Count - 1, (int)(R() * pool.Count));
                    var q = pool[i]; pool.RemoveAt(i);
                    S2.quests.Add(new Quest { id = q.Id, n = q.N[Mathf.Min(q.N.Length - 1, (int)(R() * q.N.Length))] });
                }
                S2.questDay = Today;
            }
            return S2.quests;
        }
        public string QuestText(Quest q) => string.Format(QDef(q.id).Text, q.n);
        public float[] QuestReward(Quest q) { var r = new float[4]; float f = LevelF(0.35f); for (int i = 0; i < 4; i++) r[i] = Mathf.Round(QDef(q.id).Rw[i] * f); return r; }
        public void QuestEvent(Stat st, int n)
        {
            if (S2 == null) return;
            foreach (var q in QuestsToday())
                if (QDef(q.id).St == st && !q.done && q.have < q.n)
                {
                    q.have = Mathf.Min(q.n, q.have + n);
                    if (q.have >= q.n) Msg("Tagesaufgabe erfüllt – Belohnung unter Belohnungen abholen!");
                }
            S2.stats[(int)st] += n;
            AddXp(st, n);
        }
        public bool ClaimQuest(int k)
        {
            var list = QuestsToday(); if (k < 0 || k >= list.Count) return false;
            var q = list[k]; if (q.done || q.have < q.n) return false;
            var r = QuestReward(q);
            for (int i = 0; i < 4; i++) if (r[i] > 0) AddRes(i, r[i]);
            q.done = true;
            AddVip(15);
            return true;
        }

        // ---------- Erfolge ----------
        public class AchDef { public string Id, Name, Text; public Func<Colony, bool> Ok; }
        public static readonly AchDef[] Achievements =
        {
            new AchDef { Id = "b5", Name = "Baumeister", Text = "5 Gebäude errichtet", Ok = c => c.CountBuilt() >= 5 },
            new AchDef { Id = "b20", Name = "Pfahlstadt", Text = "20 Gebäude errichtet", Ok = c => c.CountBuilt() >= 20 },
            new AchDef { Id = "t5", Name = "Leuchtfeuer", Text = "Gezeitenturm Stufe 5", Ok = c => c.TowerLevel >= 5 },
            new AchDef { Id = "t10", Name = "Turmherr", Text = "Gezeitenturm Stufe 10", Ok = c => c.TowerLevel >= 10 },
            new AchDef { Id = "t20", Name = "Herr der Gezeiten", Text = "Gezeitenturm Stufe 20", Ok = c => c.TowerLevel >= 20 },
            new AchDef { Id = "d1", Name = "Deichbauer", Text = "Damm gebaut", Ok = c => c.Levels(BType.Damm) >= 1 },
            new AchDef { Id = "d10", Name = "Deichgraf", Text = "Damm Stufe 10", Ok = c => c.Levels(BType.Damm) >= 10 },
            new AchDef { Id = "w1", Name = "Festung", Text = "Festungsmauer gebaut", Ok = c => c.Levels(BType.Festungsmauer) >= 1 },
            new AchDef { Id = "a50", Name = "Heerführer", Text = "50 Krieger gleichzeitig", Ok = c => c.TroopTotal >= 50 },
            new AchDef { Id = "a200", Name = "Feldherr", Text = "200 Krieger gleichzeitig", Ok = c => c.TroopTotal >= 200 },
            new AchDef { Id = "v1", Name = "Erster Sieg", Text = "Einen Kampf gewonnen", Ok = c => c.S2.stats[(int)Stat.Win] >= 1 },
            new AchDef { Id = "v10", Name = "Eroberer", Text = "10 Kämpfe gewonnen", Ok = c => c.S2.stats[(int)Stat.Win] >= 10 },
            new AchDef { Id = "g1k", Name = "Sammler", Text = "1000 Rohstoffe gesammelt", Ok = c => c.S2.stats[(int)Stat.Gather] >= 1000 },
            new AchDef { Id = "tr5", Name = "Kaufmann", Text = "5 Mal gehandelt", Ok = c => c.S2.stats[(int)Stat.Trade] >= 5 },
            new AchDef { Id = "dl7", Name = "Treue Seele", Text = "7 Tage am Stück dabei", Ok = c => c.S2.dailyStreak >= 7 },
            new AchDef { Id = "p100", Name = "Großstadt", Text = "100 Bewohner", Ok = c => c.S.survivors >= 100 },
            new AchDef { Id = "bot5", Name = "Piratenjäger", Text = "Piratenschiff Stufe 5 versenkt", Ok = c => c.S2.botLevel > 5 },
            new AchDef { Id = "bot15", Name = "Schrecken der Meere", Text = "Piratenschiff Stufe 15 versenkt", Ok = c => c.S2.botLevel > 15 },
            new AchDef { Id = "bot30", Name = "Admiral", Text = "Piratenschiff Stufe 30 versenkt", Ok = c => c.S2.botLevel > 30 },
            new AchDef { Id = "all5", Name = "Alle Waffengattungen", Text = "Alle 5 Kriegerarten ausgebildet", Ok = c => c.S2.troops[0] > 0 && c.S2.troops[1] > 0 && c.S2.troops[2] > 0 && c.S2.troops[3] > 0 && c.S2.troops[4] > 0 },
        };
        public int CountBuilt() { int n = 0; foreach (var p in S.plots) if (p.type >= 0 && p.level > 0) n++; return n; }
        void CheckAch()
        {
            foreach (var a in Achievements)
                if (!S2.ach.Contains(a.Id) && a.Ok(this)) { S2.ach.Add(a.Id); Msg($"Erfolg freigeschaltet: {a.Name}!"); }
        }

        // ---------- Saison-Pass (jeden Monat neu, 30 Stufen) ----------
        public const int PassXpPer = 800, PassTiers = 30;
        static float XpFor(Stat s)
        {
            switch (s)
            {
                case Stat.Build: return 6; case Stat.Train: return 0.5f; case Stat.Gather: return 0.01f; case Stat.Win: return 25;
                case Stat.Bot: return 30; case Stat.Exp: return 10; case Stat.Trade: return 15; case Stat.Heal: return 2;
                case Stat.Daily: return 50; case Stat.Treasure: return 8;
            }
            return 0;
        }
        void PassEnsure() { if (S2.passMonth != MonthKey) { S2.passMonth = MonthKey; S2.passXp = 0; S2.passGot = new List<int>(); } }
        public int PassTier { get { PassEnsure(); return Mathf.Min(PassTiers, Mathf.FloorToInt(S2.passXp / PassXpPer)); } }
        void AddXp(Stat st, int n)
        {
            int before = PassTier;
            S2.passXp += XpFor(st) * n;
            int after = PassTier;
            if (after > before) Msg($"Saison-Pass Stufe {after} erreicht – Belohnung abholen!");
        }
        public void PassReward(int t, out float[] res, out int[] items, out int[] u)
        {
            float f = LevelF(0.3f);
            res = new float[4]; items = new int[5]; u = Units.Zero();
            if (t == PassTiers) { items[3] = 2; items[4] = 1; float[] r = { 3000, 2000, 2000, 600 }; for (int i = 0; i < 4; i++) res[i] = Mathf.Round(r[i] * f); u = new[] { 10, 10, 10, 5, 10 }; }
            else if (t % 5 == 0) { items[t >= 15 ? 3 : 2] = 1; u[(t / 5) % 5] = 5 + t; }
            else if (t % 3 == 0) items[t >= 12 ? 2 : 1] = 2;
            else res[t % 4] = Mathf.Round((200 + t * 40) * f);
        }
        public bool ClaimPass(int t)
        {
            if (t > PassTier || S2.passGot.Contains(t)) return false;
            PassReward(t, out var res, out var items, out var u);
            for (int i = 0; i < 4; i++) if (res[i] > 0) AddRes(i, res[i]);
            for (int i = 0; i < 5; i++) S2.items[i] += items[i];
            S2.troops = Units.Add(S2.troops, u);
            S2.passGot.Add(t);
            AddVip(20);
            if (t % 5 == 0) S2.medals += 2;
            return true;
        }

        // ---------- Händlerschiff ----------
        public bool TraderHere => S2.traderLeft > 0;
        void TraderTick(float dt)
        {
            if (S2.traderLeft > 0)
            {
                S2.traderLeft -= dt;
                if (S2.traderLeft <= 0) { S2.traderLeft = 0; S2.traderNext = 420 + Random.value * 300; Msg("Das Händlerschiff legt wieder ab."); }
            }
            else
            {
                S2.traderNext -= dt;
                if (S2.traderNext <= 0) { S2.traderLeft = 150; MakeOffers(); Msg("Ein Händlerschiff hat am Steg angelegt!"); }
            }
        }
        void MakeOffers()
        {
            float f = LevelF(0.4f);
            S2.offers = new List<Offer>();
            for (int k = 0; k < 3; k++)
            {
                int give = Random.Range(0, 4), get = Random.Range(0, 3); if (get >= give) get++;
                int g = Mathf.RoundToInt((80 + Random.value * 120) * f);
                int r = Mathf.RoundToInt(g * (0.9f + Random.value * 0.5f) * (get == 3 ? 0.35f : 1f) * (give == 3 ? 2.5f : 1f));
                S2.offers.Add(new Offer { give = give, gn = g, get = get, rn = r });
            }
            S2.offers.Add(new Offer { give = 3, gn = Mathf.RoundToInt(60 * f), unit = Random.Range(0, 5), rn = Mathf.Max(1, Mathf.RoundToInt(3 * f)) });
        }
        public string Trade(int k)
        {
            if (!TraderHere) return "Kein Händler da";
            if (k < 0 || k >= S2.offers.Count || S2.offers[k].used) return "Schon gehandelt";
            var o = S2.offers[k];
            if (S.res[o.give] < o.gn) return "Zu wenig " + Defs.ResNames[o.give];
            S.res[o.give] -= o.gn;
            if (o.unit >= 0) S2.troops[o.unit] += o.rn; else AddRes(o.get, o.rn);
            o.used = true;
            QuestEvent(Stat.Trade, 1);
            return null;
        }

        // ---------- Bauwarteschlange ----------
        public string QueueAdd(int plot, int type)
        {
            if (S2.bq.Count >= M.Queue) return $"Warteschlange voll (max. {M.Queue})";
            foreach (var q in S2.bq) if (q.plot == plot) return "Steht schon in der Warteschlange";
            S2.bq.Add(new QueueItem { plot = plot, type = type });
            Msg($"In Warteschlange: {Defs.Get(type >= 0 ? type : S.plots[plot].type).Name}");
            return null;
        }
        void QueueTick()
        {
            if (S2.bq.Count == 0) return;
            var q = S2.bq[0]; var p = S.plots[q.plot];
            if (q.type >= 0 && p.type < 0)
            {
                string blk = BuildBlocker(q.plot, (BType)q.type);
                if (blk == null) { StartBuild(q.plot, (BType)q.type); S2.bq.RemoveAt(0); }
                else if (blk != "Alle Bautrupps beschäftigt" && blk != "Zu wenig Rohstoffe") { S2.bq.RemoveAt(0); Msg("Warteschlange: " + blk); }
            }
            else
            {
                string blk = UpgradeBlocker(q.plot);
                if (blk == null) { StartUpgrade(q.plot); S2.bq.RemoveAt(0); }
                else if (blk != "Alle Bautrupps beschäftigt" && blk != "Zu wenig Rohstoffe" && blk != "Wird gerade gebaut") { S2.bq.RemoveAt(0); Msg("Warteschlange: " + blk); }
            }
        }
    }
}
