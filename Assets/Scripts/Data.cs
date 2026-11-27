using System;
using UnityEngine;

namespace Pfahlstadt
{
    // Rohstoffe der Pfahlstadt
    public enum Res { Holz = 0, Muscheln = 1, Wasser = 2, Altmetall = 3 }

    // Reihenfolge muss zu Defs.All passen (gleich wie in der Web-Fassung)
    public enum BType
    {
        Gezeitenturm = 0, Treibholzsammler = 1, Muschelzucht = 2, Regenfaenger = 3, Wracktaucher = 4, Unterkunft = 5, Heilerhuette = 6, Raeucherei = 7, Kueche = 8, Kaserne = 9, Wachturm = 10, Lager = 11, Festungsmauer = 12, Abwehrturm = 13, Damm = 14, Harpunierhof = 15, Wachstube = 16, Enterhalle = 17, Schleuderplatz = 18, Wattlaeuferhuette = 19, Lazarett = 20, Akademie = 21, Werft = 22, Wahrzeichen = 23
    }

    public class BuildingDef
    {
        public BType Type;
        public string Name;
        public string Short;
        public string Desc;
        public float[] BaseCost;
        public int Produces = -1;
        public float BaseRate;          // pro Sekunde auf Stufe 1
        public int WorkersPerLevel;
        public int MaxLevel = 20;
        public float BaseBuildTime = 6f;

        public float[] CostFor(int lvl)
        {
            var c = new float[4];
            float f = Mathf.Pow(1.55f, Mathf.Min(lvl, 10) - 1) * Mathf.Pow(1.3f, Mathf.Max(0, lvl - 10));
            for (int i = 0; i < 4; i++) c[i] = Mathf.Round(BaseCost[i] * f);
            // ab Stufe 6 brauchen Gebäude auch Muscheln und Wasser (Proviant für die Bautrupps)
            if (lvl >= 6)
            {
                float w = BaseCost[0] * f * Mathf.Min(0.6f, 0.12f * (lvl - 5));
                c[1] += Mathf.Round(w * 0.6f);
                c[2] += Mathf.Round(w * 0.5f);
            }
            return c;
        }

        public float BuildTime(int lvl) => BaseBuildTime * (lvl <= 1 ? 1f : 2f * Mathf.Pow(lvl, 1.8f));
        public float RateAt(int level) => level <= 0 ? 0f : BaseRate * level * (1f + 0.1f * (level - 1));
    }

    public static class Defs
    {
        public static readonly string[] ResNames = { "Holz", "Muscheln", "Wasser", "Altmetall" };
        public static readonly string[] ResHex = { "#E2B477", "#F2A08C", "#7FD3F0", "#C7CCD6" };

        // Bauplätze: 0 Turm, 1–12 Kern, 13–24 zweiter Ring, 25–42 Warft, 43 Mauer, 44–51 Abwehrtürme, 52 Damm
        public const int Plots = 53, Inner = 13, Ring3 = 25, Wall = 43, Towers = 44, Dam = 52, OuterLevel = 3;
        public static readonly int[] Layout = { 0, 23, 1, 2, 3, 5, 15, 9, 16, 5, 4, 8, 5, 1, 2, 3, 5, 7, 17, 10, 18, 4, 11, 20, 6, 1, 2, 3, 4, 5, 11, 5, 10, 19, 10, 22, 4, 3, 2, 1, 5, 11, 21, 12, 13, 13, 13, 13, 13, 13, 13, 13, 14 };

        public static readonly BuildingDef[] All =
        {
            new BuildingDef { Type = BType.Gezeitenturm, Name = "Gezeitenturm", Short = "Herz der Stadt", Desc = "Leuchtturm und Pfahlwerk. Jede Stufe hebt alle Plattformen der Stadt höher über das Wasser.", BaseCost = new float[] { 220f, 0f, 0f, 60f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 0, BaseBuildTime = 15f },
            new BuildingDef { Type = BType.Treibholzsammler, Name = "Treibholzsammler", Short = "+Holz", Desc = "Fischt angeschwemmtes Holz aus dem Wasser.", BaseCost = new float[] { 40f, 0f, 0f, 0f }, Produces = 0, BaseRate = 1.2f, WorkersPerLevel = 2, BaseBuildTime = 6f },
            new BuildingDef { Type = BType.Muschelzucht, Name = "Muschelzucht", Short = "+Muscheln, stark bei Ebbe", Desc = "Muschelpfähle im Watt. Bei Ebbe wird viel geerntet, bei Flut wenig.", BaseCost = new float[] { 60f, 0f, 0f, 0f }, Produces = 1, BaseRate = 0.75f, WorkersPerLevel = 2, BaseBuildTime = 6f },
            new BuildingDef { Type = BType.Regenfaenger, Name = "Regenfänger", Short = "+Wasser, stark bei Sturm", Desc = "Segeltrichter und Fässer sammeln Regen. Bei Sturmflut fällt besonders viel.", BaseCost = new float[] { 70f, 0f, 0f, 5f }, Produces = 2, BaseRate = 0.6f, WorkersPerLevel = 1, BaseBuildTime = 6f },
            new BuildingDef { Type = BType.Wracktaucher, Name = "Wracktaucher", Short = "+Altmetall, stark bei Flut", Desc = "Taucher bergen Metall aus alten Wracks. Bei hohem Wasser kommen sie besser heran.", BaseCost = new float[] { 120f, 40f, 0f, 0f }, Produces = 3, BaseRate = 0.25f, WorkersPerLevel = 3, BaseBuildTime = 6f },
            new BuildingDef { Type = BType.Unterkunft, Name = "Unterkunft", Short = "+6 Plätze", Desc = "Pfahlhaus mit Kojen: Wohnraum für neue Siedler (6 pro Stufe).", BaseCost = new float[] { 70f, 0f, 0f, 0f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 0, BaseBuildTime = 6f },
            new BuildingDef { Type = BType.Heilerhuette, Name = "Heilerhütte", Short = "heilt Kranke", Desc = "Kräuter und trockene Decken. Kranke werden deutlich schneller gesund.", BaseCost = new float[] { 140f, 30f, 0f, 20f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 1, BaseBuildTime = 6f },
            new BuildingDef { Type = BType.Raeucherei, Name = "Räucherei", Short = "−Muschelverbrauch", Desc = "Räuchert Vorräte haltbar. Senkt den Muschelverbrauch um 8 % pro Stufe (max. 50 %).", BaseCost = new float[] { 100f, 0f, 0f, 10f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 1, BaseBuildTime = 6f },
            new BuildingDef { Type = BType.Kueche, Name = "Küche", Short = "+6 % Produktion je Stufe", Desc = "Warme Mahlzeiten aus dem großen Kessel: Alle Siedler arbeiten besser (+6 % Produktion pro Stufe, max. 60 %).", BaseCost = new float[] { 120f, 40f, 0f, 10f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 1, BaseBuildTime = 7f },
            new BuildingDef { Type = BType.Kaserne, Name = "Kaserne", Short = "Hauptquartier der Truppen", Desc = "Ohne Kaserne keine Ausbildung. Jede Stufe: +10 Plätze in der Ausbildungsschlange und schnellere Ausbildung. Die Krieger selbst lernen in ihren Ausbildungsstätten.", BaseCost = new float[] { 150f, 60f, 0f, 30f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 2, BaseBuildTime = 8f },
            new BuildingDef { Type = BType.Wachturm, Name = "Wachturm", Short = "+12 % Verteidigung je Stufe", Desc = "Späher und Signalhörner: Deine Stadt verteidigt sich besser gegen Überfälle (+12 % pro Stufe).", BaseCost = new float[] { 130f, 0f, 0f, 40f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 1, BaseBuildTime = 8f },
            new BuildingDef { Type = BType.Lager, Name = "Lager", Short = "+1500 Lagerplatz je Stufe", Desc = "Schuppen, Kisten und Fässer: mehr Platz für jeden Rohstoff (+1500 pro Stufe).", BaseCost = new float[] { 100f, 0f, 0f, 10f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 0, BaseBuildTime = 6f },
            new BuildingDef { Type = BType.Festungsmauer, Name = "Festungsmauer", Short = "Mauer mit Tor", Desc = "Umschließt dein ganzes Gelände. Stufe 1–6 Holzpalisade, 7–13 Steinwall, 14–20 Festungswall. +15 % Verteidigung pro Stufe.", BaseCost = new float[] { 200f, 0f, 0f, 40f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 0, BaseBuildTime = 12f },
            new BuildingDef { Type = BType.Abwehrturm, Name = "Abwehrturm", Short = "Turm auf der Mauer", Desc = "Steinturm mit Harpunen-Schleuder auf der Festungsmauer. +40 Verteidigung pro Stufe.", BaseCost = new float[] { 160f, 0f, 0f, 50f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 1, BaseBuildTime = 10f },
            new BuildingDef { Type = BType.Damm, Name = "Damm", Short = "hält Flut & Sturmflut ab", Desc = "Erddamm ganz außen um die Warft, mit Sieltor. Solange das Wasser nicht über den Damm steigt, bleibt deine Stadt trocken. Jede Stufe macht ihn 25 cm höher.", BaseCost = new float[] { 240f, 0f, 0f, 30f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 0, BaseBuildTime = 12f },
            new BuildingDef { Type = BType.Harpunierhof, Name = "Harpunierhof", Short = "bildet Harpuniere aus", Desc = "Schießstand mit Harpunen-Ständern. Schaltet Harpuniere frei; jede Stufe bildet sie 10 % schneller aus.", BaseCost = new float[] { 110f, 30f, 0f, 15f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 1, BaseBuildTime = 7f },
            new BuildingDef { Type = BType.Wachstube, Name = "Wachstube", Short = "bildet Schildwachen aus", Desc = "Steinhaus mit Schilden und Übungsplatz. Schaltet Schildwachen frei; jede Stufe bildet sie 10 % schneller aus.", BaseCost = new float[] { 100f, 20f, 0f, 25f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 1, BaseBuildTime = 7f },
            new BuildingDef { Type = BType.Enterhalle, Name = "Enterhalle", Short = "bildet Enterer aus", Desc = "Lange Halle mit Kletternetzen und Enterhaken. Schaltet Enterer frei; jede Stufe bildet sie 10 % schneller aus.", BaseCost = new float[] { 160f, 60f, 0f, 30f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 1, BaseBuildTime = 9f },
            new BuildingDef { Type = BType.Schleuderplatz, Name = "Schleuderplatz", Short = "bildet Schleuderer aus", Desc = "Offener Platz mit Wurfschleuder. Schaltet Schleuderer frei; jede Stufe bildet sie 10 % schneller aus.", BaseCost = new float[] { 180f, 40f, 0f, 50f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 1, BaseBuildTime = 9f },
            new BuildingDef { Type = BType.Wattlaeuferhuette, Name = "Wattläuferhütte", Short = "bildet Wattläufer aus", Desc = "Hütte mit Wattstiefeln und Laufstegen. Schaltet Wattläufer frei; jede Stufe bildet sie 10 % schneller aus.", BaseCost = new float[] { 120f, 50f, 20f, 0f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 1, BaseBuildTime = 8f },
            new BuildingDef { Type = BType.Lazarett, Name = "Lazarett", Short = "rettet verwundete Krieger", Desc = "Ein Teil der gefallenen Krieger kommt verwundet zurück statt zu sterben und wird hier wieder gesund (kostet etwas Muscheln und Wasser). Jede Stufe: mehr Betten, mehr Gerettete, schnellere Heilung.", BaseCost = new float[] { 140f, 60f, 80f, 10f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 2, BaseBuildTime = 8f },
            new BuildingDef { Type = BType.Akademie, Name = "Seefahrer-Akademie", Short = "Forschung mit Dauerboni", Desc = "Hier erforschen Gelehrte Verbesserungen: höhere Pfähle, schärfere Harpunen, schnelleres Bauen … Jede Akademie-Stufe forscht schneller und schaltet höhere Forschungsstufen frei.", BaseCost = new float[] { 300f, 120f, 80f, 60f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 2, BaseBuildTime = 12f },
            new BuildingDef { Type = BType.Werft, Name = "Werft", Short = "baut Kutter für die Flotte", Desc = "Baut Kutter. Passt ein Trupp komplett auf deine Flotte (25 Krieger je Kutter), segelt er 25 % schneller und bringt 25 % mehr Beute heim. Jede Stufe: 2 Kutter mehr.", BaseCost = new float[] { 350f, 40f, 0f, 90f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 2, BaseBuildTime = 12f },
            new BuildingDef { Type = BType.Wahrzeichen, Name = "Gezeitenuhr (Wahrzeichen)", Short = "Wahrzeichen mit Bonus", Desc = "Das riesige Wahrzeichen deiner Stadt. Jede Stufe: +2 % auf alle Produktion für dich – und online +1 % für jedes Mitglied deiner Allianz.", BaseCost = new float[] { 500f, 200f, 200f, 150f }, Produces = -1, BaseRate = 0f, WorkersPerLevel = 0, BaseBuildTime = 20f },
        };

        public static BuildingDef Get(int t) => All[t];
        public static BuildingDef Get(BType t) => All[(int)t];

        public static string Time(double seconds)
        {
            int t = (int)Math.Ceiling(seconds);
            if (t >= 86400) return $"{t / 86400} T {t % 86400 / 3600} Std";
            if (t >= 3600) return $"{t / 3600}h {t % 3600 / 60:00}m";
            if (t >= 60) return $"{t / 60}:{t % 60:00}";
            return t + "s";
        }
    }

    [Serializable]
    public class PlotData
    {
        public int type = -1;
        public int level;
        public float buildLeft;
        public float buildTotal;
    }

    [Serializable]
    public class SaveData
    {
        public int version = 2;
        public float[] res = new float[4];
        public int survivors = 6;
        public int sick;
        public bool beaconOn = true;
        public PlotData[] plots;
        public long lastSaveUtc;
        public float dayTime = 0.3f;
        public int days = 1;
        public float stormTimer = 360f;
        public float stormLeft;
        public float expeditionLeft;
        public bool expeditionSurprised;
        public float sickProg, deathProg, healProg, arriveProg;
    }
}
