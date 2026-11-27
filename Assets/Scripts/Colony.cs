using System;
using System.Collections.Generic;
using UnityEngine;
using Random = UnityEngine.Random;

namespace Pfahlstadt
{
    /// Spiellogik: Gezeiten, Rohstoffe, Bauen, Bevölkerung, Speichern.
    public partial class Colony : MonoBehaviour
    {
        public static Colony I { get; private set; }

        public const int PlotCount = Defs.Plots;     // 0 Turm, 1–42 Gebäude, 43 Mauer, 44–51 Abwehrtürme, 52 Damm
        public const int MaxParallelBuilds = 2;
        public const float DayLength = 240f;        // Sekunden pro Spieltag (2 Fluten pro Tag)
        public const float StormDuration = 90f;
        public const float ExpeditionTime = 40f;
        public const float ExpeditionFood = 30f;
        public const float EbbLimit = 1.0f;         // Wattwanderung nur unter diesem Wasserstand
        const string SaveKey = "pfahlstadt_save_v1";
        const string SaveKey2 = "pfahlstadt_save2_v1";

        public SaveData S;
        public SaveData2 S2;
        public float GameTime { get; private set; }

        public float WaterLevel { get; private set; }
        public float TideSin { get; private set; }  // -1 Niedrigwasser, +1 Hochwasser
        public bool TideRising { get; private set; }
        public float DeckHeight => DeckFor(TowerLevel) + M.Deck;
        public float DamTop { get { int L = Levels(BType.Damm); return L > 0 ? 3.0f + 0.25f * L + M.Dam : -99f; } }
        /// Hält der Damm, bleibt die Stadt trocken, auch wenn draußen das Wasser höher steht
        public bool DamHolds => WaterLevel > DeckHeight && WaterLevel <= DamTop;
        public float InWater => DamHolds ? DeckHeight - 0.35f : WaterLevel;
        public float Freeboard => DeckHeight - InWater;   // < 0 = Plattformen überspült
        public int Levels(BType t) { int n = 0; foreach (var p in S.plots) if (p.type == (int)t) n += p.level; return n; }
        public int Storage => Mathf.RoundToInt((1500 + 2500 * Levels(BType.Lager)) * M.Store);
        /// Gebäude auf dem Gelände (ohne Turm, Mauer, Abwehrtürme)
        public int BuiltCount { get { int n = 0; for (int i = 1; i < Defs.Wall; i++) if (S.plots[i].type >= 0 && S.plots[i].level > 0) n++; return n; } }
        public float AreaRadius => Mathf.Min(66f, 40f + 1.4f * BuiltCount);
        public static int Ring3Needed(int i) => 8 + (i - Defs.Ring3);
        public bool[] Ration = new bool[2];
        public bool Storm => S.stormLeft > 0f;
        public bool StormWarning => !Storm && S.stormTimer < 30f;
        public float Efficiency { get; private set; } = 1f;
        public int Capacity { get; private set; } = 4;
        public int WorkersNeeded { get; private set; }
        public int Healthy => Mathf.Max(0, S.survivors - S.sick);
        public int TowerLevel => S.plots[0].level;
        public bool BeaconBurning => S.beaconOn && S.res[(int)Res.Holz] > 0.01f;
        public bool Starving => S.survivors > 0 && (S.res[(int)Res.Muscheln] <= 0.01f || S.res[(int)Res.Wasser] <= 0.01f);
        public readonly float[] RatePerMin = new float[4];

        public struct LogEntry { public string Text; public float Time; }
        public readonly List<LogEntry> Log = new List<LogEntry>();

        float autosave;
        bool wasBurning = true;

        public static float DeckFor(int lvl) => 2.65f + 0.55f * Mathf.Clamp(lvl, 1, 10) + 0.2f * Mathf.Max(0, lvl - 10);
        public static float BeaconWoodPerSec(int level) => 0.04f + 0.04f * level;

        void Awake()
        {
            I = this;
            Load();
        }

        void Update()
        {
            float dt = Mathf.Min(Time.deltaTime, 0.5f);
            GameTime += dt;
            Tick(dt);
            autosave += Time.unscaledDeltaTime;
            if (autosave > 30f) { autosave = 0f; Save(); }
        }

        void OnApplicationPause(bool paused)
        {
            if (paused) Save(); else CatchUpOffline();
        }

        void OnApplicationQuit() => Save();

        public void Msg(string text)
        {
            Log.Add(new LogEntry { Text = text, Time = Time.time });
            if (Log.Count > 30) Log.RemoveAt(0);
        }

        // ---------------- Simulation ----------------

        void Tick(float dt)
        {
            S.dayTime += dt / DayLength;
            if (S.dayTime >= 1f) { S.dayTime -= 1f; S.days++; Msg($"Tag {S.days} beginnt."); }

            if (S.stormLeft > 0f)
            {
                S.stormLeft -= dt;
                if (S.stormLeft <= 0f)
                {
                    S.stormLeft = 0f;
                    S.stormTimer = Random.Range(300f, 480f);
                    Msg("Die Sturmflut zieht ab.");
                }
            }
            else
            {
                float before = S.stormTimer;
                S.stormTimer -= dt;
                if (before >= 30f && S.stormTimer < 30f) Msg("Warnung: Eine Sturmflut zieht auf!");
                if (S.stormTimer <= 0f) { S.stormLeft = StormDuration; Msg("STURMFLUT! Das Wasser steigt!"); }
            }

            UpdateWater();
            if (wasBurning && !BeaconBurning && S.beaconOn) Msg("Kein Holz mehr – das Leuchtfeuer erlischt!");
            wasBurning = BeaconBurning;

            ApplyRates(ComputeRates(false), dt);
            AdvanceConstruction(dt);
            UpdatePopulation(dt);
            UpdateExpedition(dt);
            TickExtra(dt, false);
        }

        void UpdateWater()
        {
            // online laufen die Gezeiten für alle gleich (Serverzeit)
            float phase = OnlinePhase != null ? OnlinePhase() : S.dayTime * 2f * Mathf.PI * 2f;   // zwei Tiden pro Tag
            TideSin = Mathf.Sin(phase);
            TideRising = Mathf.Cos(phase) > 0f;
            float surge = 0f;
            if (S.stormLeft > 0f)
            {
                float ramp = Mathf.Clamp01(Mathf.Min((StormDuration - S.stormLeft) / 12f, S.stormLeft / 12f));
                surge = ramp * (2.6f + 0.3f * Mathf.Sin(Time.time * 1.7f));
            }
            float ev = OnlineStorm != null ? OnlineStorm() : 0f;
            if (ev > 0f) surge = Mathf.Max(surge, Mathf.Min(1f, ev / 15f) * (3.2f + 0.4f * Mathf.Sin(Time.time * 1.3f)));
            WaterLevel = 1.4f + 1.6f * TideSin + surge;
        }
        /// vom Online-Teil gesetzt: Gezeitenphase nach Serverzeit, Sekunden Rest eines Sturmflut-Ereignisses
        public static Func<float> OnlinePhase, OnlineStorm;

        float[] ComputeRates(bool offline)
        {
            var rate = new float[4];
            int workers = 0, cap = 4, smokehouse = 0;
            foreach (var p in S.plots)
            {
                if (p.type < 0 || p.level <= 0) continue;
                var d = Defs.Get(p.type);
                workers += d.WorkersPerLevel * p.level;
                if (d.Type == BType.Unterkunft) cap += 6 * p.level;
                if (d.Type == BType.Raeucherei) smokehouse += p.level;
            }
            WorkersNeeded = workers;
            Capacity = cap;
            Efficiency = workers == 0 ? 1f : Mathf.Clamp01((float)Mathf.Max(0, Healthy - Gatherers) / workers);

            float flood = offline ? 0.5f : (Freeboard < 0f ? Mathf.Clamp(1f + Freeboard / 2f, 0.25f, 1f) : 1f);
            float tide = offline ? 0f : TideSin;

            // Arbeiter zuerst für Essen und Wasser, dann Holz, dann der Rest
            var prod = new List<PlotData>();
            foreach (var p in S.plots) if (p.type >= 0 && p.level > 0 && Defs.Get(p.type).Produces >= 0) prod.Add(p);
            prod.Sort((a, b) => Prio(a.type).CompareTo(Prio(b.type)));
            float avail = Mathf.Max(0, Healthy - Gatherers);
            foreach (var p in prod)
            {
                var d = Defs.Get(p.type);
                float need = d.WorkersPerLevel * p.level;
                float eff = need > 0 ? Mathf.Min(1f, avail / need) : 1f;
                avail -= Mathf.Min(avail, need);
                float f = 1f;
                if (d.Type == BType.Muschelzucht) f = 1f - 0.5f * tide;          // Ebbe gut
                if (d.Type == BType.Wracktaucher) f = 1f + 0.5f * tide;          // Flut gut
                if (d.Type == BType.Regenfaenger && Storm && !offline) f = 2.5f;  // Sturm = viel Regen
                rate[d.Produces] += d.RateAt(p.level) * eff * flood * f;
            }
            float kitchen = 1f + Mathf.Min(0.6f, 0.06f * Levels(BType.Kueche));
            float landmark = 1f + 0.02f * Levels(BType.Wahrzeichen);
            float pm = M.Prod / (1f + 0.02f * Levels(BType.Wahrzeichen)); // Wahrzeichen steckt schon in landmark
            for (int i = 0; i < 4; i++) if (rate[i] > 0f) rate[i] *= kitchen * landmark * pm * SeasonProdMul(i) * TerrBonus(i);
            rate[(int)Res.Muscheln] -= Upkeep / 60f;

            // Notvorrat des Gezeitenturms: niemand verhungert ganz
            rate[(int)Res.Muscheln] += 0.25f;
            rate[(int)Res.Wasser] += 0.25f;
            // Notration: ist ein Vorrat leer, essen bzw. trinken alle nur noch 60 %
            Ration[0] = S.res[(int)Res.Muscheln] <= 1f;
            Ration[1] = S.res[(int)Res.Wasser] <= 1f;
            float foodPer = 0.035f * (1f - Mathf.Min(0.5f, 0.08f * smokehouse));
            rate[(int)Res.Muscheln] -= S.survivors * foodPer * (Ration[0] ? 0.6f : 1f);
            rate[(int)Res.Wasser] -= S.survivors * 0.03f * (Ration[1] ? 0.6f : 1f);
            if (S.beaconOn) rate[(int)Res.Holz] -= BeaconWoodPerSec(TowerLevel);

            for (int i = 0; i < 4; i++) RatePerMin[i] = rate[i] * 60f;
            return rate;
        }

        static int Prio(int t)
        {
            int pr = Defs.Get(t).Produces;
            return pr == (int)Res.Muscheln || pr == (int)Res.Wasser ? 0 : pr == (int)Res.Holz ? 1 : 2;
        }

        void ApplyRates(float[] rate, float dt)
        {
            float cap = Storage;
            for (int i = 0; i < 4; i++)
            {
                float v = S.res[i] + rate[i] * dt;
                S.res[i] = Mathf.Max(0f, rate[i] > 0f ? Mathf.Min(v, Mathf.Max(cap, S.res[i])) : v);
            }
        }

        void AdvanceConstruction(float dt)
        {
            for (int i = 0; i < S.plots.Length; i++)
            {
                var p = S.plots[i];
                if (p.buildLeft <= 0f) continue;
                p.buildLeft -= dt;
                if (p.buildLeft <= 0f)
                {
                    p.buildLeft = 0f;
                    p.level++;
                    if (i == 0) Msg($"Gezeitenturm Stufe {p.level}: Die Stadt steht jetzt auf {DeckFor(p.level):0.00} m!");
                    else Msg($"{Defs.Get(p.type).Name} Stufe {p.level} fertig!");
                }
            }
        }

        void UpdatePopulation(float dt)
        {
            bool wet = Freeboard < 0f;
            bool starving = Starving;

            if (wet || starving)
            {
                float sev = (wet ? -Freeboard * 0.6f : 0f) + (starving ? 0.25f : 0f);
                S.sickProg += dt * sev * Healthy / 120f;
                while (S.sickProg >= 1f && S.sick < S.survivors)
                {
                    S.sickProg -= 1f;
                    S.sick++;
                    Msg(starving ? "Hunger und Durst: Jemand ist erkrankt!" : "Nasse Füße, kalter Wind: Jemand ist erkrankt!");
                }
            }
            else S.sickProg = Mathf.Max(0f, S.sickProg - dt * 0.01f);

            if (S.sick > 0 && S.survivors > 1 && (Freeboard < -1.2f || starving))
            {
                S.deathProg += dt * Mathf.Min(S.sick, 10) / 900f;
                if (S.deathProg >= 1f)
                {
                    S.deathProg = 0f;
                    S.sick--;
                    S.survivors--;
                    Msg("Ein Siedler hat es nicht geschafft …");
                }
            }

            if (S.sick > 0 && !wet)
            {
                int healers = 0;
                foreach (var p in S.plots) if (p.type == (int)BType.Heilerhuette) healers += p.level;
                // Jeder Kranke erholt sich auch von selbst, Heiler beschleunigen das
                float speed = (Mathf.Max(0.004f, 0.0015f * Mathf.Min(S.sick, 60)) + 0.02f * healers) * (BeaconBurning ? 1.5f : 1f);
                S.healProg += dt * speed;
                while (S.healProg >= 1f && S.sick > 0) { S.healProg -= 1f; S.sick--; Msg("Ein Kranker ist wieder gesund."); }
            }

            // Neue Siedler finden die Stadt nur, wenn das Leuchtfeuer brennt
            if (S.survivors < Capacity && !wet && !starving && BeaconBurning && RatePerMin[(int)Res.Muscheln] > 4f && RatePerMin[(int)Res.Wasser] > 3.5f)
            {
                S.arriveProg += dt / 25f;
                if (S.arriveProg >= 1f) { S.arriveProg = 0f; S.survivors++; Msg("Ein Boot legt an: Ein neuer Siedler!"); }
            }
        }

        void UpdateExpedition(float dt)
        {
            if (S.expeditionLeft <= 0f) return;
            S.expeditionLeft -= dt;
            if (!S.expeditionSurprised && WaterLevel > 2.0f)
            {
                S.expeditionSurprised = true;
                Msg("Die Flut kommt! Die Wattwanderer müssen umkehren …");
            }
            if (S.expeditionLeft <= 0f) { S.expeditionLeft = 0f; FinishExpedition(); }
        }

        // ---------------- Aktionen ----------------

        public int ActiveBuilds
        {
            get { int n = 0; foreach (var p in S.plots) if (p.buildLeft > 0f) n++; return n; }
        }

        public int MaxBuilds => M.Builds;

        public bool CanAfford(float[] c)
        {
            for (int i = 0; i < 4; i++) if (S.res[i] < c[i]) return false;
            return true;
        }

        public void Pay(float[] c)
        {
            for (int i = 0; i < 4; i++) S.res[i] -= c[i];
        }

        public string BuildBlocker(int plot, BType t)
        {
            if (plot == 0 || t == BType.Gezeitenturm) return "Nicht möglich";
            if (S.plots[plot].type >= 0) return "Platz belegt";
            if (Defs.Layout[plot] != (int)t) return "Dieser Platz ist für: " + Defs.Get(Defs.Layout[plot]).Name;
            if (plot >= Defs.Towers && plot < Defs.Dam && Levels(BType.Festungsmauer) <= 0) return "Erst die Festungsmauer bauen";
            if (plot >= Defs.Inner && plot < Defs.Ring3 && TowerLevel < Defs.OuterLevel) return $"Äußerer Ring ab Gezeitenturm Stufe {Defs.OuterLevel}";
            if (plot >= Defs.Ring3 && plot < Defs.Wall && BuiltCount < Ring3Needed(plot)) return $"Gelände zu klein: noch {Ring3Needed(plot) - BuiltCount} Gebäude bauen";
            if (ActiveBuilds >= MaxBuilds) return "Alle Bautrupps beschäftigt";
            if (!CanAfford(Defs.Get(t).CostFor(1))) return "Zu wenig Rohstoffe";
            return null;
        }

        public bool StartBuild(int plot, BType t)
        {
            if (BuildBlocker(plot, t) != null) return false;
            var d = Defs.Get(t);
            Pay(d.CostFor(1));
            var p = S.plots[plot];
            p.type = (int)t;
            p.level = 0;
            p.buildTotal = p.buildLeft = d.BuildTime(1) * M.Build;
            Msg($"Bau von {d.Name} begonnen.");
            QuestEvent(Stat.Build, 1);
            return true;
        }

        public string UpgradeBlocker(int plot)
        {
            var p = S.plots[plot];
            if (p.type < 0) return "Kein Gebäude";
            var d = Defs.Get(p.type);
            if (p.buildLeft > 0f) return "Wird gerade gebaut";
            if (p.level >= d.MaxLevel) return "Maximale Stufe";
            if (plot != 0 && p.level + 1 > TowerLevel) return $"Erst Gezeitenturm auf Stufe {p.level + 1}";
            if (ActiveBuilds >= MaxBuilds) return "Alle Bautrupps beschäftigt";
            if (!CanAfford(d.CostFor(p.level + 1))) return "Zu wenig Rohstoffe";
            return null;
        }

        public bool StartUpgrade(int plot)
        {
            if (UpgradeBlocker(plot) != null) return false;
            var p = S.plots[plot];
            var d = Defs.Get(p.type);
            Pay(d.CostFor(p.level + 1));
            p.buildTotal = p.buildLeft = d.BuildTime(p.level + 1) * M.Build;
            Msg($"Ausbau: {d.Name} → Stufe {p.level + 1}");
            QuestEvent(Stat.Build, 1);
            return true;
        }

        public void Demolish(int plot)
        {
            if (plot == 0) return;
            var p = S.plots[plot];
            string n = p.type >= 0 ? Defs.Get(p.type).Name : "Gebäude";
            S.plots[plot] = new PlotData();
            Msg($"{n} abgerissen.");
        }

        public void ToggleBeacon()
        {
            S.beaconOn = !S.beaconOn;
            Msg(S.beaconOn ? "Leuchtfeuer entzündet." : "Leuchtfeuer gelöscht – Holz wird gespart, aber keine Boote finden her.");
            wasBurning = BeaconBurning;
        }

        public string ExpeditionBlocker()
        {
            if (S.expeditionLeft > 0f) return "Unterwegs";
            if (WaterLevel > EbbLimit) return "Wartet auf Ebbe";
            if (Healthy < 2) return "Zu wenig Gesunde";
            if (S.res[(int)Res.Muscheln] < ExpeditionFood) return "Zu wenig Muscheln";
            return null;
        }

        public bool StartExpedition()
        {
            if (ExpeditionBlocker() != null) return false;
            S.res[(int)Res.Muscheln] -= ExpeditionFood;
            S.expeditionLeft = ExpeditionTime * (SeasonIdx == 3 ? 1.5f : 1f);
            S.expeditionSurprised = false;
            Msg("Eine Gruppe wandert ins Watt hinaus.");
            return true;
        }

        void FinishExpedition()
        {
            float m = (0.8f + 0.4f * TowerLevel) * (S.expeditionSurprised ? 0.4f : 1f);
            float holz = Mathf.Round(Random.Range(40f, 90f) * m);
            float musch = Mathf.Round(Random.Range(30f, 70f) * m);
            float metall = Mathf.Round(Random.Range(6f, 22f) * m);
            AddRes(0, holz); AddRes(1, musch); AddRes(3, metall);
            QuestEvent(Stat.Exp, 1);
            Msg($"Wattwanderung zurück: +{holz} Holz, +{musch} Muscheln, +{metall} Altmetall");
            if (!S.expeditionSurprised && Random.value < 0.3f && S.survivors < Capacity)
            {
                S.survivors++;
                Msg("Auf einer Sandbank wurde ein Gestrandeter gefunden!");
            }
        }

        // ---------------- Speichern ----------------

        void Load()
        {
            string json = PlayerPrefs.GetString(SaveKey, "");
            S = null;
            if (!string.IsNullOrEmpty(json))
            {
                try { S = JsonUtility.FromJson<SaveData>(json); }
                catch (Exception) { S = null; }
            }
            S2 = null;
            string json2 = PlayerPrefs.GetString(SaveKey2, "");
            if (!string.IsNullOrEmpty(json2))
            {
                try { S2 = JsonUtility.FromJson<SaveData2>(json2); }
                catch (Exception) { S2 = null; }
            }
            if (S == null || S.plots == null || S.plots.Length != PlotCount || S.version < 2 || S.res == null || S.res.Length != 4)
                NewGame();
            else
            {
                EnsureExtra();
                Msg("Willkommen zurück in der Pfahlstadt!");
                CatchUpOffline();
            }
            UpdateWater();
            ComputeRates(false);
        }

        public void Save()
        {
            if (S == null) return;
            S.lastSaveUtc = DateTime.UtcNow.Ticks;
            PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(S));
            if (S2 != null) PlayerPrefs.SetString(SaveKey2, JsonUtility.ToJson(S2));
            PlayerPrefs.Save();
        }

        public void NewGame()
        {
            S = new SaveData
            {
                res = new float[] { 250, 160, 120, 30 },
                survivors = 6,
                plots = new PlotData[PlotCount],
                dayTime = 0.3f,
                stormTimer = 360f,
            };
            for (int i = 0; i < PlotCount; i++) S.plots[i] = new PlotData();
            S.plots[0] = new PlotData { type = (int)BType.Gezeitenturm, level = 1 };
            S.plots[2] = new PlotData { type = (int)BType.Treibholzsammler, level = 1 };
            S.plots[3] = new PlotData { type = (int)BType.Muschelzucht, level = 1 };
            S.plots[4] = new PlotData { type = (int)BType.Regenfaenger, level = 1 };
            S.plots[5] = new PlotData { type = (int)BType.Unterkunft, level = 1 };
            string keepName = S2 != null ? S2.playerName : "";
            S2 = new SaveData2();
            S2.playerName = keepName;
            EnsureExtra();
            Log.Clear();
            Msg("Willkommen in der Pfahlstadt! Bau den Gezeitenturm aus, bevor die große Flut kommt.");
            Save();
        }

        void CatchUpOffline()
        {
            if (S == null) return;
            long now = DateTime.UtcNow.Ticks;
            double sec = S.lastSaveUtc > 0 ? (now - S.lastSaveUtc) / (double)TimeSpan.TicksPerSecond : 0;
            S.lastSaveUtc = now;
            if (sec < 10) return;
            sec = Math.Min(sec, 8 * 3600);

            var before = (float[])S.res.Clone();
            int steps = Mathf.Clamp((int)(sec / 10), 1, 3000);
            float dt = (float)(sec / steps);
            for (int i = 0; i < steps; i++)
            {
                ApplyRates(ComputeRates(true), dt);
                AdvanceConstruction(dt);
                if (S.expeditionLeft > 0f)
                {
                    S.expeditionLeft -= dt;
                    if (S.expeditionLeft <= 0f) { S.expeditionLeft = 0f; FinishExpedition(); }
                }
                TickExtra(dt, true);
            }

            string gains = "";
            for (int i = 0; i < 4; i++)
            {
                float g = S.res[i] - before[i];
                if (Mathf.Abs(g) >= 1f) gains += $"{(g > 0 ? "+" : "")}{Mathf.RoundToInt(g)} {Defs.ResNames[i]}  ";
            }
            Msg($"Während du weg warst ({Defs.Time(sec)}): {gains}");
        }
    }
}
