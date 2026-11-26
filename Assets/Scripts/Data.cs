using System;
using UnityEngine;

namespace Pfahlstadt
{
    // Rohstoffe der Pfahlstadt
    public enum Res { Holz = 0, Muscheln = 1, Wasser = 2, Altmetall = 3 }

    // Reihenfolge muss zu Defs.All passen
    public enum BType
    {
        Gezeitenturm = 0, Treibholzsammler = 1, Muschelzucht = 2, Regenfaenger = 3,
        Wracktaucher = 4, Pfahlhaus = 5, Heilerhuette = 6, Raeucherei = 7
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
        public int MaxLevel = 10;
        public float BaseBuildTime = 6f;

        public float[] CostFor(int targetLevel)
        {
            var c = new float[4];
            float m = Mathf.Pow(1.65f, targetLevel - 1);
            for (int i = 0; i < 4; i++) c[i] = Mathf.Round(BaseCost[i] * m);
            return c;
        }

        public float BuildTime(int targetLevel) => BaseBuildTime * Mathf.Pow(targetLevel, 1.5f);
        public float RateAt(int level) => level <= 0 ? 0f : BaseRate * level * (1f + 0.1f * (level - 1));
    }

    public static class Defs
    {
        public static readonly string[] ResNames = { "Holz", "Muscheln", "Wasser", "Altmetall" };
        public static readonly string[] ResHex = { "#E2B477", "#F2A08C", "#7FD3F0", "#C7CCD6" };

        public static readonly BuildingDef[] All =
        {
            new BuildingDef { Type = BType.Gezeitenturm, Name = "Gezeitenturm", Short = "Herz der Stadt",
                Desc = "Leuchtturm und Pfahlwerk. Jede Stufe hebt alle Plattformen der Stadt höher über das Wasser.",
                BaseCost = new float[] { 220, 0, 0, 60 }, BaseBuildTime = 15f },
            new BuildingDef { Type = BType.Treibholzsammler, Name = "Treibholzsammler", Short = "+Holz",
                Desc = "Fischt angeschwemmtes Holz aus dem Wasser.",
                BaseCost = new float[] { 40, 0, 0, 0 }, Produces = (int)Res.Holz, BaseRate = 0.9f, WorkersPerLevel = 2 },
            new BuildingDef { Type = BType.Muschelzucht, Name = "Muschelzucht", Short = "+Muscheln (stark bei Ebbe)",
                Desc = "Muschelpfähle im Watt. Bei Ebbe wird viel geerntet, bei Flut wenig.",
                BaseCost = new float[] { 60, 0, 0, 0 }, Produces = (int)Res.Muscheln, BaseRate = 0.75f, WorkersPerLevel = 2 },
            new BuildingDef { Type = BType.Regenfaenger, Name = "Regenfänger", Short = "+Wasser (stark bei Sturm)",
                Desc = "Segeltrichter und Fässer sammeln Regen. Bei Sturmflut fällt besonders viel.",
                BaseCost = new float[] { 70, 0, 0, 5 }, Produces = (int)Res.Wasser, BaseRate = 0.6f, WorkersPerLevel = 1 },
            new BuildingDef { Type = BType.Wracktaucher, Name = "Wracktaucher", Short = "+Altmetall (stark bei Flut)",
                Desc = "Taucher bergen Metall aus alten Wracks. Bei hohem Wasser kommen sie besser heran.",
                BaseCost = new float[] { 120, 40, 0, 0 }, Produces = (int)Res.Altmetall, BaseRate = 0.25f, WorkersPerLevel = 3 },
            new BuildingDef { Type = BType.Pfahlhaus, Name = "Pfahlhaus", Short = "+6 Plätze",
                Desc = "Wohnraum für neue Siedler (6 pro Stufe).",
                BaseCost = new float[] { 70, 0, 0, 0 } },
            new BuildingDef { Type = BType.Heilerhuette, Name = "Heilerhütte", Short = "heilt Kranke",
                Desc = "Kräuter und trockene Decken. Kranke werden deutlich schneller gesund.",
                BaseCost = new float[] { 140, 30, 0, 20 }, WorkersPerLevel = 1 },
            new BuildingDef { Type = BType.Raeucherei, Name = "Räucherei", Short = "−Muschelverbrauch",
                Desc = "Räuchert Vorräte haltbar. Senkt den Muschelverbrauch um 8 % pro Stufe (max. 50 %).",
                BaseCost = new float[] { 100, 0, 0, 10 }, WorkersPerLevel = 1 },
        };

        public static BuildingDef Get(int t) => All[t];
        public static BuildingDef Get(BType t) => All[(int)t];

        public static string Time(double seconds)
        {
            int t = (int)Math.Ceiling(seconds);
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
        public int version = 1;
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
