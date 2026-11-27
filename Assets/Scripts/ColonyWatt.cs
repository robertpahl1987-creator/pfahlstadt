using System;
using System.Collections.Generic;
using UnityEngine;
using Random = UnityEngine.Random;

namespace Pfahlstadt
{
    /// Rund um die Stadt im Watt: Sammelstellen mit Bewohnern, Schätze bei Ebbe, angespülte Hindernisse
    public partial class Colony
    {
        // ---------- Sammeln mit Bewohnern ----------
        public int Gatherers => S2 != null ? S2.gath.Count : 0;
        public int FreeVillagers => Mathf.Max(0, Healthy - Gatherers);
        public static bool DoubleGatherEvent;
        public float Carry => (18 + 3 * TowerLevel) * (DoubleGatherEvent ? 2 : 1) * M.Gather;
        public ResNode NodeById(int id) => S2.nodes.Find(n => n.id == id);
        public bool NodeFlooded(ResNode n) => WaterLevel > n.h + 0.25f;
        public int Assigned(int id) { int k = 0; foreach (var g in S2.gath) if (g.node == id && !g.stop) k++; return k; }
        public static readonly string[] NodeNames = { "Treibholz", "Muschelbank", "Süßwassertümpel", "Wrackteile" };

        /// Weg von der Stadtmitte durchs Tor (Süden) hinaus und am Watt entlang zur Sammelstelle
        public List<Vector2> GatherPath(ResNode n, out float length)
        {
            float R = AreaRadius + 3;
            var pts = new List<Vector2> { new Vector2(0, -4), new Vector2(0, -(R - 3)), new Vector2(0, -(R + 5)) };
            float a = Mathf.Atan2(n.x, n.z), from = Mathf.PI, to = a < 0 ? a + Mathf.PI * 2 : a;
            int steps = Mathf.CeilToInt(Mathf.Abs(to - from) / 0.2f);
            for (int k = 1; k <= steps; k++) { float t = from + (to - from) * k / steps; pts.Add(new Vector2(Mathf.Sin(t) * (R + 5), Mathf.Cos(t) * (R + 5))); }
            pts.Add(new Vector2(n.x, n.z));
            length = 0; for (int k = 1; k < pts.Count; k++) length += Vector2.Distance(pts[k], pts[k - 1]);
            return pts;
        }
        /// Punkt auf dem Weg nach d Metern (x, z) und Blickrichtung (Bogenmaß)
        public static Vector3 PathPoint(List<Vector2> pts, float d)
        {
            d = Mathf.Max(0, d);
            for (int k = 1; k < pts.Count; k++)
            {
                float seg = Vector2.Distance(pts[k], pts[k - 1]);
                if (d <= seg || k == pts.Count - 1)
                {
                    float t = seg > 0.001f ? Mathf.Clamp01(d / seg) : 1f;
                    var p = Vector2.Lerp(pts[k - 1], pts[k], t);
                    return new Vector3(p.x, p.y, Mathf.Atan2(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
                }
                d -= seg;
            }
            var e = pts[pts.Count - 1]; return new Vector3(e.x, e.y, 0);
        }

        void SpawnNode()
        {
            float R = AreaRadius + 3; int type = Random.Range(0, 4);
            float a = Mathf.PI + (Random.value - 0.5f) * 2.2f, r = R + 12 + Random.value * 26;
            float bas = new float[] { 140, 110, 100, 45 }[type] * (1 + 0.15f * (S.days - 1));
            S2.nodes.Add(new ResNode { id = S2.nodeSeq++, type = type, x = Mathf.Sin(a) * r, z = Mathf.Cos(a) * r, h = type >= 2 ? 0.6f : 0.05f, amount = Mathf.Round(bas), max = Mathf.Round(bas) });
        }
        void SpawnNodeAt(int type)
        {
            float R = 40 + 1.4f * 4 + 3, a = Mathf.PI + (type - 1.5f) * 0.45f, r = R + 14 + type * 3;
            float amt = new float[] { 160, 120, 110, 50 }[type];
            S2.nodes.Add(new ResNode { id = S2.nodeSeq++, type = type, x = Mathf.Sin(a) * r, z = Mathf.Cos(a) * r, h = type >= 2 ? 0.6f : 0.05f, amount = amt, max = amt });
        }
        public void SetGatherers(int id, int n)
        {
            var node = NodeById(id); if (node == null) return;
            int cur = Assigned(id);
            if (n > cur)
            {
                int add = Mathf.Min(n - cur, FreeVillagers);
                for (int k = 0; k < add; k++) S2.gath.Add(new Gatherer { node = id, phase = "out", d = -k * 2.5f });
            }
            else if (n < cur)
            {
                int rm = cur - n;
                foreach (var g in S2.gath) if (rm > 0 && g.node == id && !g.stop && g.phase != "back") { g.phase = "back"; g.stop = true; rm--; }
                foreach (var g in S2.gath) if (rm > 0 && g.node == id && !g.stop) { g.stop = true; rm--; }
            }
        }
        readonly Dictionary<int, float> pathLen = new Dictionary<int, float>();
        void Gathering(float dt, bool offline)
        {
            var s = S2;
            s.nodeTimer -= dt;
            if (s.nodeTimer <= 0) { s.nodeTimer = 35 + Random.value * 30; if (s.nodes.Count < 7) SpawnNode(); }
            float speed = 2.3f * (Storm && !offline ? 0.7f : 1f);
            pathLen.Clear();
            for (int i = s.gath.Count - 1; i >= 0; i--)
            {
                var g = s.gath[i]; var n = NodeById(g.node);
                if (n == null && g.phase != "back") { g.phase = "back"; g.stop = true; }
                float L = 0;
                if (n != null) { if (!pathLen.TryGetValue(n.id, out L)) { GatherPath(n, out L); pathLen[n.id] = L; } }
                if (n != null && g.d > L) g.d = L;
                if (g.phase == "out")
                {
                    if (n != null && NodeFlooded(n) && !offline) { if (g.d <= 0.1f) { g.d = Mathf.Min(g.d, 0); continue; } g.phase = "back"; continue; }
                    g.d += speed * dt;
                    if (g.d >= L) { g.d = L; g.phase = "work"; g.t = 5; }
                }
                else if (g.phase == "work")
                {
                    if (n != null && NodeFlooded(n) && !offline) { g.phase = "back"; continue; }
                    g.t -= dt;
                    if (g.t <= 0)
                    {
                        float take = Mathf.Min(Carry, n != null ? n.amount : 0);
                        g.load = take; g.res = n != null ? n.type : 0;
                        if (n != null) n.amount -= take;
                        g.phase = "back";
                        if (n != null && n.amount <= 0) { s.nodes.Remove(n); Msg($"{NodeNames[n.type]} ist leer gesammelt."); }
                    }
                }
                else
                {
                    g.d -= speed * dt;
                    if (g.d <= 0)
                    {
                        if (g.load > 0) { AddRes(g.res >= 0 ? g.res : 0, g.load); QuestEvent(Stat.Gather, Mathf.RoundToInt(g.load)); }
                        g.load = 0; g.d = 0;
                        if (g.stop || NodeById(g.node) == null) { s.gath.RemoveAt(i); continue; }
                        g.phase = "out";
                    }
                }
            }
        }

        // ---------- Schätze im Watt (nur bei Ebbe) ----------
        void TreasureTick(float dt)
        {
            var s = S2;
            if (TideSin > 0.15f) { if (s.treasures.Count > 0) s.treasures.Clear(); return; }
            if (TideSin > -0.4f) return;
            s.treasureT -= dt;
            if (s.treasureT > 0 || s.treasures.Count >= 1) return;
            s.treasureT = 90 + Random.value * 150;
            float a = (Random.value < 0.5f ? 1 : -1) * (0.4f + Random.value * 2.4f), r = AreaRadius + 18 + Random.value * 14;
            s.treasureSeq++;
            s.treasures.Add(new Spot { id = s.treasureSeq, x = Mathf.Sin(a) * r, z = Mathf.Cos(a) * r });
        }
        public void CollectTreasure(int id)
        {
            var s = S2; int k = s.treasures.FindIndex(t => t.id == id);
            if (k < 0) return;
            s.treasures.RemoveAt(k);
            float roll = Random.value, f = LevelF(0.25f);
            string txt;
            if (roll < 0.35f) { s.items[0]++; txt = "Beschleuniger 1 Min."; }
            else if (roll < 0.5f) { s.items[1]++; txt = "Beschleuniger 5 Min."; }
            else if (roll < 0.53f) { s.items[2]++; txt = "Beschleuniger 15 Min.!"; }
            else { float v = Mathf.Round((40 + Random.value * 120) * f); AddRes(3, v); txt = $"{v} Altmetall"; }
            if (Random.value < 0.3f) { s.ore++; txt += " · 1 Schmiedeeisen"; }
            Msg("Schatz im Watt gefunden: " + txt);
            QuestEvent(Stat.Treasure, 1);
            AddVip(3);
        }

        // ---------- Angespülte Hindernisse ----------
        public static readonly string[] ObstNames = { "Treibgut-Haufen", "Schiffswrack", "Tangberg", "Felsbrocken" };
        public static readonly float[][] ObstCost = { new float[] { 0, 0, 0, 0 }, new float[] { 60, 0, 0, 0 }, new float[] { 0, 40, 0, 0 }, new float[] { 100, 0, 0, 20 } };
        public static readonly float[] ObstTime = { 20, 60, 40, 90 };
        public const int ObstMax = 5;
        void ObstTick(float dt)
        {
            var s = S2;
            s.obstT -= dt;
            if (s.obstT <= 0)
            {
                s.obstT = 240 + Random.value * 240;
                if (s.obst.Count < ObstMax)
                {
                    float x = 0, z = 0;
                    for (int k = 0; k < 12; k++)
                    {
                        float a = Random.value * Mathf.PI * 2, r = AreaRadius + 8 + Random.value * 8;
                        x = Mathf.Sin(a) * r; z = Mathf.Cos(a) * r;
                        if (z > -(AreaRadius + 2) || Mathf.Abs(x) > 14)
                        {
                            bool free = true; foreach (var o in s.obst) if (Mathf.Abs(o.x - x) + Mathf.Abs(o.z - z) < 6) free = false;
                            if (free) break;
                        }
                    }
                    s.obstSeq++;
                    float rr = Random.value; int kind = rr < 0.4f ? 0 : rr < 0.65f ? 2 : rr < 0.85f ? 1 : 3;
                    s.obst.Add(new Spot { id = s.obstSeq, kind = kind, x = x, z = z, rot = Random.value * 360 });
                }
            }
            if (s.clearId >= 0)
            {
                s.clearLeft -= dt;
                if (s.clearLeft <= 0) { int id = s.clearId; s.clearId = -1; FinishObst(id); }
            }
        }
        public string ObstBlocker(int id)
        {
            var o = S2.obst.Find(x => x.id == id);
            if (o == null) return "Schon weggeräumt";
            if (S2.clearId >= 0) return S2.clearId == id ? "Wird gerade geräumt" : "Es wird schon ein Hindernis geräumt";
            if (!CanAfford(ObstCost[o.kind])) return "Zu wenig Rohstoffe";
            return null;
        }
        public bool StartObst(int id)
        {
            if (ObstBlocker(id) != null) return false;
            var o = S2.obst.Find(x => x.id == id);
            Pay(ObstCost[o.kind]);
            S2.clearId = id; S2.clearLeft = S2.clearTotal = ObstTime[o.kind];
            Msg($"{ObstNames[o.kind]} wird weggeräumt ({Defs.Time(ObstTime[o.kind])}).");
            return true;
        }
        void FinishObst(int id)
        {
            var s = S2; int k = s.obst.FindIndex(x => x.id == id);
            if (k < 0) return;
            var o = s.obst[k]; s.obst.RemoveAt(k);
            float f = LevelF(0.3f);
            var got = new List<string>();
            Action<int, float, float> res = (i, a, b) => { float v = Mathf.Round((a + Random.value * (b - a)) * f); AddRes(i, v); got.Add($"{v} {Defs.ResNames[i]}"); };
            if (o.kind == 0) res(0, 80, 200);
            else if (o.kind == 1) { res(3, 40, 120); s.ore += 1 + Random.Range(0, 2); got.Add("Schmiedeeisen"); }
            else if (o.kind == 2) { res(1, 60, 160); res(2, 40, 100); }
            else { s.ore += 2 + Random.Range(0, 2); got.Add("Schmiedeeisen"); res(3, 30, 80); }
            if (Random.value < 0.25f) { s.items[1]++; got.Add("Beschleuniger 5 Min."); }
            AddVip(2);
            s.obstCleared++;
            Msg($"{ObstNames[o.kind]} geräumt: {string.Join(" · ", got)}");
        }
    }
}
