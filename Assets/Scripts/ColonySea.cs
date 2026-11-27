using System;
using System.Collections.Generic;
using UnityEngine;
using Random = UnityEngine.Random;

namespace Pfahlstadt
{
    /// Seekarte offline: Pirateninseln erobern, Märsche, Späher, Gegenangriffe – und Piratenschiffe (Bots)
    public partial class Colony
    {
        static readonly string[] TerrNames = { "Möwenbank", "Krabbensand", "Seehundsplate", "Bernsteinriff", "Nebelhallig", "Priel-Insel", "Austernbank", "Sturmwarft",
            "Robbeneck", "Muschelplate", "Tangfeld", "Dünenhallig", "Schlickwall", "Wrackbucht", "Leuchtsand", "Graue Plate", "Salzwiese", "Kormoranriff" };
        static readonly string[] TerrKinds = { "Sandbank", "Hallig", "Riff" };

        static List<Terr> MakeTerritories()
        {
            uint seed = 1234567;
            Func<float> R = () => { seed = seed * 1664525u + 1013904223u; return seed / 4294967296f; };
            var list = new List<Terr>();
            int[] baseStr = { 0, 60, 220, 700 }, pct = { 0, 10, 18, 30 };
            for (int ring = 1; ring <= 3; ring++)
                for (int k = 0; k < 6; k++)
                {
                    float a = k / 6f * Mathf.PI * 2 + ring * 0.5f + (R() - 0.5f) * 0.4f;
                    float d = ring * 1.15f + (R() - 0.5f) * 0.35f;
                    float b = baseStr[ring] * (0.8f + R() * 0.5f);
                    var t = new Terr
                    {
                        id = list.Count, name = TerrNames[list.Count], ring = ring, kind = TerrKinds[Mathf.Min(2, (int)(R() * 3))],
                        x = Mathf.Cos(a) * d, y = Mathf.Sin(a) * d, res = Mathf.Min(3, (int)(R() * 4)), pct = pct[ring],
                        bas = Mathf.Round(b), owner = 0, gu = new int[5], seed = (int)(R() * 1e6f),
                    };
                    t.pirates = t.bas;
                    list.Add(t);
                }
            return list;
        }
        public static float TravelTime(Terr t) => 20f + Mathf.Sqrt(t.x * t.x + t.y * t.y) * 22f;

        float TerrBonus(int res)
        {
            if (S2 == null) return 1f;
            if (OnlineTerrBonus != null) return 1f + OnlineTerrBonus(res);
            float b = 1f;
            foreach (var t in S2.terr) if (t.owner == 1 && t.res == res) b += t.pct / 100f;
            return b;
        }
        /// online: Bonus der eigenen Gebiete (vom Online-Teil gesetzt)
        public static Func<int, float> OnlineTerrBonus;

        public string ScoutBlocker()
        {
            if (Levels(BType.Wachturm) <= 0) return "Späher brauchen einen Wachturm";
            if (S.res[1] < 40 || S.res[3] < 20) return "Späher kosten 40 Muscheln und 20 Altmetall";
            return null;
        }
        public void PayScout() { S.res[1] -= 40; S.res[3] -= 20; }
        public bool SendScout(int id)
        {
            if (ScoutBlocker() != null) return false;
            var t = S2.terr[id]; float tt = TravelTime(t) * 0.5f;
            PayScout();
            S2.marches.Add(new March { target = id, u = Units.Zero(), left = tt, total = tt, phase = "out", kind = "scout" });
            Msg($"Späher nach {t.name} unterwegs.");
            return true;
        }

        public string AttackBlocker(int id, int[] u)
        {
            if (id < 0 || id >= S2.terr.Count) return "Unbekanntes Ziel";
            if (Units.Sum(u) <= 0) return "Keine Truppen ausgewählt";
            for (int i = 0; i < 5; i++) if (u[i] > S2.troops[i]) return "So viele Truppen hast du nicht zu Hause";
            foreach (var m in S2.marches) if (m.target == id && m.phase == "out" && m.kind != "scout") return "Dorthin ist schon ein Trupp unterwegs";
            return null;
        }
        public float MarchTime(float baseTime, int[] u, int cap) => baseTime * Units.SpeedFactor(u) * M.Travel * FleetSpeed(u) * CapSpeed(cap);
        public bool SendTroops(int id, int[] u, int cap)
        {
            if (AttackBlocker(id, u) != null) return false;
            var t = S2.terr[id];
            float tt = MarchTime(TravelTime(t), u, cap);
            if (cap >= 0) CapSend(cap, tt);
            S2.troops = Units.Sub(S2.troops, u);
            S2.marches.Add(new March { target = id, u = Units.Copy(u), left = tt, total = tt, phase = "out", kind = t.owner == 1 ? "reinforce" : "attack", cap = cap });
            Msg(t.owner == 1 ? $"Verstärkung nach {t.name} unterwegs." : $"Angriff auf {t.name} gestartet!");
            return true;
        }
        public bool Withdraw(int id)
        {
            var t = S2.terr[id];
            if (t.owner != 1 || Units.Sum(t.gu) == 0) return false;
            float tt = TravelTime(t) * Units.SpeedFactor(t.gu);
            S2.marches.Add(new March { target = id, u = Units.Copy(t.gu), left = tt, total = tt, phase = "back", kind = "return" });
            t.gu = Units.Zero();
            Msg($"Besatzung von {t.name} kehrt heim.");
            return true;
        }

        void Battle(March m, Terr t)
        {
            int tide = TideNow;
            float att = Units.Str(m.u, null, true, tide) * M.Atk * CapAtk(m.cap, tide) * (0.85f + Random.value * 0.3f);
            if (att > t.pirates)
            {
                float loss = Mathf.Min(0.9f, Mathf.Pow(t.pirates / att, 1.3f) * 0.6f);
                var lost = Units.Scale(m.u, loss);
                t.owner = 1; t.pirates = 0;
                t.gu = Units.Add(t.gu, Units.Sub(m.u, lost));
                AddWounded(lost);
                QuestEvent(Stat.Win, 1);
                Report($"Sieg! {t.name} erobert. Verluste: {Units.Text(lost)}. Bonus: +{t.pct} % {Defs.ResNames[t.res]}.{(tide != 0 ? " (" + Units.TideName[tide + 1] + ")" : "")}", true);
            }
            else
            {
                var lost = Units.Scale(m.u, 0.8f); var rest = Units.Sub(m.u, lost);
                AddWounded(lost);
                t.pirates = Mathf.Max(Mathf.Round(t.bas * 0.3f), Mathf.Round(t.pirates - att * 0.5f));
                if (Units.Sum(rest) > 0) { float tt = TravelTime(t) * Units.SpeedFactor(rest); S2.marches.Add(new March { target = t.id, u = rest, left = tt, total = tt, phase = "back", kind = "return" }); }
                Report($"Niederlage bei {t.name}. Verluste: {Units.Text(lost)}. Die Piraten sind geschwächt.", false);
            }
        }

        void SeaTick(float dt, bool offline)
        {
            var s = S2;
            for (int i = s.marches.Count - 1; i >= 0; i--)
            {
                var m = s.marches[i];
                m.left -= dt;
                if (m.left > 0) continue;
                s.marches.RemoveAt(i);
                var t = s.terr[Mathf.Clamp(m.target, 0, s.terr.Count - 1)];
                if (m.kind == "scout") { Report($"Späherbericht {t.name}: {(t.owner == 1 ? "deine Besatzung " + Units.Text(t.gu) : "Piraten mit Stärke " + Mathf.RoundToInt(t.pirates))}. Gezeiten jetzt: {Units.TideName[TideNow + 1]}.", true); continue; }
                if (m.phase == "back") { s.troops = Units.Add(s.troops, m.u); Msg($"{Units.Sum(m.u)} Krieger sind heimgekehrt."); }
                else if (t.owner == 1) { t.gu = Units.Add(t.gu, m.u); Msg($"Verstärkung in {t.name} angekommen."); }
                else Battle(m, t);
            }
            foreach (var t in s.terr) if (t.owner == 0 && t.pirates < t.bas) t.pirates = Mathf.Min(t.bas, t.pirates + t.bas * dt / 600f);
            if (offline) return;

            // Piraten-Gegenangriffe auf eroberte Inseln
            var owned = s.terr.FindAll(t => t.owner == 1);
            if (owned.Count == 0) return;
            s.counterTimer -= dt;
            if (s.counterTimer > 0) return;
            s.counterTimer = 360 + Random.value * 300;
            var tt2 = owned[Random.Range(0, owned.Count)];
            float str = tt2.bas * (0.5f + Random.value * 0.5f);
            float def = Units.Str(tt2.gu, null, false, 0) * (0.85f + Random.value * 0.3f);
            if (def > str)
            {
                var lost = Units.Scale(tt2.gu, Mathf.Min(0.9f, Mathf.Pow(str / def, 1.3f) * 0.5f));
                tt2.gu = Units.Sub(tt2.gu, lost); AddWounded(lost);
                Report($"Piraten griffen {tt2.name} an und wurden zurückgeschlagen! Verluste: {Units.Text(lost)}.", true);
            }
            else
            {
                tt2.owner = 0; tt2.gu = Units.Zero(); tt2.pirates = tt2.bas;
                Report($"{tt2.name} ist an die Piraten gefallen! Die Besatzung ist verloren.", false);
            }
        }

        // ================= Piratenschiffe (Bots) =================
        static readonly string[] ShipNames = { "Schwarze Möwe", "Rostiger Anker", "Seeteufel", "Krakenfaust", "Nebelhai", "Sturmkrähe", "Blutige Auster", "Wattwolf", "Grauer Hering", "Knochenkiel" };
        public const int StamMax = 10;
        public const float StamSec = 1200f;

        public static int[] BotArmy(int L)
        {
            int n = Mathf.RoundToInt(5 * Mathf.Pow(1.14f, L - 1) + L), fav = (L - 1) % 5;
            int[] w = { 1, 1, 1, 1, 1 }; w[fav] = 3; if (L >= 6) w[(fav + 2) % 5] = 2;
            int sw = 0; foreach (int x in w) sw += x;
            var u = new int[5];
            for (int i = 0; i < 5; i++) u[i] = n * w[i] / sw;
            u[fav] += n - Units.Sum(u);
            return u;
        }
        public static void BotReward(int L, out int[] items, out float[] res, out int[] u, out bool big)
        {
            items = new int[5];
            if (L <= 4) items[0] += 2;
            else if (L <= 9) { items[0] += 1; items[1] += 1; }
            else if (L <= 19) { items[1] += 2; if (L % 2 == 1) items[2] += 1; }
            else { items[2] += 2; if (L % 3 == 0) items[3] += 1; }
            big = L % 5 == 0;
            if (big) { items[L >= 10 ? 3 : 2] += 1; if (L >= 25) items[4] += 1; }
            res = new float[4];
            res[L % 4] = Mathf.Round(150 * Mathf.Pow(1.15f, L - 1));
            res[(L + 1) % 4] = Mathf.Round(80 * Mathf.Pow(1.15f, L - 1));
            u = Units.Zero(); if (big) u[(L - 1) % 5] = 3 + L / 2;
        }
        public static string ItemText(int[] it)
        {
            var parts = new List<string>();
            for (int i = 0; i < 5; i++) if (it[i] > 0) parts.Add($"Beschl. {Items.Names[i]} ×{it[i]}");
            return string.Join(", ", parts);
        }

        /// Stellen für Bots (online setzt der Online-Teil zusätzliche besetzte Punkte)
        public static Func<List<Vector2>> OnlineBusyPoints;
        void MakeBots()
        {
            var s = S2; int L = s.botLevel;
            var pts = new List<Vector2>();
            if (OnlineBusyPoints != null) pts.AddRange(OnlineBusyPoints());
            else foreach (var t in s.terr) pts.Add(new Vector2(t.x, t.y));
            pts.Add(Vector2.zero);
            s.bots = new List<Bot>();
            for (int k = 0; k < 3; k++)
            {
                int lv = L + k;
                Vector2 best = Vector2.zero; float bd = -1;
                for (int tries = 0; tries < 40; tries++)
                {
                    s.botSeed = (int)(((uint)s.botSeed * 1103515245u + 12345u) & 0x7fffffff);
                    float a = (s.botSeed % 10000) / 10000f * Mathf.PI * 2;
                    s.botSeed = (int)(((uint)s.botSeed * 1103515245u + 12345u) & 0x7fffffff);
                    float d = 0.75f + k * 0.45f + (s.botSeed % 1000) / 1000f * 0.3f;
                    var p = new Vector2(Mathf.Cos(a) * d, Mathf.Sin(a) * d);
                    float m = float.MaxValue; foreach (var q in pts) m = Mathf.Min(m, Vector2.Distance(p, q));
                    if (m > bd) { bd = m; best = p; }
                    if (m > 0.6f) break;
                }
                pts.Add(best);
                s.bots.Add(new Bot { id = lv, level = lv, name = ShipNames[(lv * 7) % ShipNames.Length], dx = best.x, dy = best.y, u = BotArmy(lv) });
            }
        }
        public float BotTravel(Bot b, int[] u, int cap) => (18 + Mathf.Sqrt(b.dx * b.dx + b.dy * b.dy) * 22) * Units.SpeedFactor(u) * M.Travel * FleetSpeed(u) * CapSpeed(cap);

        /// Ausdauer für Piratenschiff-Angriffe: 10 Punkte, alle 20 Minuten einer zurück
        public int Stamina(out float nextSec)
        {
            long now = DateTime.UtcNow.Ticks, step = (long)(StamSec * TimeSpan.TicksPerSecond);
            if (S2.stamT == 0) S2.stamT = now;
            if (S2.stamN >= StamMax) S2.stamT = now;
            else { long k = (now - S2.stamT) / step; if (k > 0) { S2.stamN = (int)Math.Min(StamMax, S2.stamN + k); S2.stamT += k * step; } }
            nextSec = S2.stamN >= StamMax ? 0 : (S2.stamT + step - now) / (float)TimeSpan.TicksPerSecond;
            return S2.stamN;
        }
        public string BotBlocker(int id, int[] u)
        {
            float _;
            if (Stamina(out _) <= 0) return "Keine Ausdauer – alle 20 Minuten kommt ein Punkt zurück";
            var b = S2.bots.Find(x => x.id == id);
            if (b == null) return "Schiff ist weg";
            if (Units.Sum(u) <= 0) return "Keine Truppen ausgewählt";
            for (int i = 0; i < 5; i++) if (u[i] > S2.troops[i]) return "So viele Truppen hast du nicht zu Hause";
            foreach (var m in S2.botMarches) if (m.bot.id == id && m.phase == "out") return "Dorthin ist schon ein Trupp unterwegs";
            return null;
        }
        public bool SendToBot(int id, int[] u, int cap)
        {
            if (BotBlocker(id, u) != null) return false;
            var b = S2.bots.Find(x => x.id == id);
            float tt = BotTravel(b, u, cap);
            if (cap >= 0) CapSend(cap, tt);
            S2.troops = Units.Sub(S2.troops, u);
            S2.stamN--;
            var copy = new Bot { id = b.id, level = b.level, name = b.name, dx = b.dx, dy = b.dy, u = Units.Copy(b.u) };
            S2.botMarches.Add(new BotMarch { bot = copy, u = Units.Copy(u), left = tt, total = tt, phase = "out", cap = cap, loot = CapLoot(cap) * FleetLoot(u) });
            Msg($"Angriff auf das Piratenschiff „{b.name}“ (Stufe {b.level})!");
            return true;
        }
        void BotTick(float dt)
        {
            var s = S2;
            for (int i = s.botMarches.Count - 1; i >= 0; i--)
            {
                var m = s.botMarches[i];
                m.left -= dt;
                if (m.left > 0) continue;
                if (m.phase == "back") { s.troops = Units.Add(s.troops, m.u); s.botMarches.RemoveAt(i); Msg($"{Units.Sum(m.u)} Krieger sind vom Piratenschiff zurück."); continue; }
                BotFight(m);
                if (Units.Sum(m.u) <= 0) s.botMarches.Remove(m);
            }
        }
        void BotFight(BotMarch m)
        {
            var s = S2; var b = m.bot; int tide = TideNow;
            float att = Units.Str(m.u, b.u, true, tide) * M.Atk * CapAtk(m.cap, tide) * (0.85f + Random.value * 0.3f);
            float def = Mathf.Max(1, Units.Str(b.u, m.u, false, tide));
            int[] lost;
            if (att > def)
            {
                lost = Units.Scale(m.u, Mathf.Min(0.85f, Mathf.Pow(def / att, 1.3f) * 0.5f));
                BotReward(b.level, out var items, out var res, out var u, out var big);
                for (int i = 0; i < 5; i++) s.items[i] += items[i];
                for (int i = 0; i < 4; i++) { res[i] = Mathf.Round(res[i] * m.loot); if (res[i] > 0) AddRes(i, res[i]); }
                s.troops = Units.Add(s.troops, u);
                s.medals += big ? 3 : 1;
                int ore = 1 + b.level / 4 + (big ? 2 : 0); s.ore += ore;
                AddVip(2 * b.level);
                if (b.level >= s.botLevel) s.botLevel = b.level + 1;
                s.bots.RemoveAll(x => x.id == b.id);
                if (s.bots.Count < 3 || b.level >= s.botLevel - 1) MakeBots();
                QuestEvent(Stat.Bot, 1);
                QuestEvent(Stat.Win, 1);
                var rs = new List<string>(); for (int i = 0; i < 4; i++) if (res[i] > 0) rs.Add($"{res[i]} {Defs.ResNames[i]}");
                Report($"„{b.name}“ (Stufe {b.level}) versenkt! Beute: {ItemText(items)} · {(big ? 3 : 1)} Abzeichen · {ore} Schmiedeeisen{(rs.Count > 0 ? " · " + string.Join(", ", rs) : "")}{(Units.Sum(u) > 0 ? " · Überläufer: " + Units.Text(u) : "")}. Verluste: {Units.Text(lost)}.", true);
            }
            else
            {
                lost = Units.Scale(m.u, 0.55f);
                Report($"Angriff auf „{b.name}“ (Stufe {b.level}) gescheitert. Verluste: {Units.Text(lost)}. Tipp: Krieger wählen, die gegen die Mannschaft stark sind.", false);
            }
            AddWounded(lost);
            m.u = Units.Sub(m.u, lost);
            m.phase = "back"; m.left = m.total;
        }
    }
}
