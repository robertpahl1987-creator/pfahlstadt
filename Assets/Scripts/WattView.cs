using System.Collections.Generic;
using UnityEngine;

namespace Pfahlstadt
{
    /// 3D-Darstellung im Watt: Sammelstellen, Sammler auf dem Weg, Schätze bei Ebbe, angespülte Hindernisse.
    /// Antippen wählt sie aus (Index: -1000-id Sammelstelle, -3000-id Schatz, -4000-id Hindernis).
    public class WattView : MonoBehaviour
    {
        Transform root;
        readonly Dictionary<int, GameObject> nodes = new Dictionary<int, GameObject>();
        readonly Dictionary<int, GameObject> treasures = new Dictionary<int, GameObject>();
        readonly Dictionary<int, GameObject> obst = new Dictionary<int, GameObject>();
        readonly List<Transform> walkers = new List<Transform>();
        Material wood, mussel, pond, scrap, chest, gold, glow, tang, rock, hull, coat, skin, basket;

        void Start()
        {
            root = new GameObject("Watt").transform;
            wood = MatLib.Lit(new Color(0.5f, 0.36f, 0.22f), 0.15f);
            mussel = MatLib.Lit(new Color(0.12f, 0.13f, 0.18f), 0.5f);
            pond = MatLib.Lit(new Color(0.3f, 0.6f, 0.8f), 0.8f);
            scrap = MatLib.Lit(new Color(0.48f, 0.5f, 0.52f), 0.4f);
            chest = MatLib.Lit(new Color(0.45f, 0.28f, 0.14f), 0.2f);
            gold = MatLib.Glow(new Color(1f, 0.8f, 0.3f), 1.5f);
            glow = MatLib.Glow(new Color(1f, 0.9f, 0.5f), 2f);
            tang = MatLib.Lit(new Color(0.22f, 0.4f, 0.18f), 0.3f);
            rock = MatLib.Lit(new Color(0.48f, 0.47f, 0.45f), 0.1f);
            hull = MatLib.Lit(new Color(0.3f, 0.22f, 0.16f), 0.15f);
            coat = MatLib.Lit(new Color(0.75f, 0.55f, 0.15f), 0.3f);
            skin = MatLib.Lit(new Color(0.9f, 0.72f, 0.6f));
            basket = MatLib.Lit(new Color(0.7f, 0.58f, 0.35f));
        }

        static float GroundAt(Colony c, float x, float z)
        {
            float r = Mathf.Sqrt(x * x + z * z), deck = c.DeckHeight, A = c.AreaRadius;
            if (r < 9.5f) return deck;
            if (r < A + 5) return deck - 0.9f;
            if (r < A + 16) return Mathf.Lerp(deck - 0.9f, 0f, (r - (A + 5)) / 11f);
            return 0f;
        }

        static void Pickable(GameObject go, int index, Vector3 size, Vector3 center)
        {
            var col = go.AddComponent<BoxCollider>();
            col.size = size; col.center = center;
            go.AddComponent<PlotMarker>().Index = index;
        }

        GameObject MakeNode(ResNode n)
        {
            var go = new GameObject("Sammelstelle " + n.id);
            go.transform.SetParent(root, false);
            var t = go.transform;
            switch (n.type)
            {
                case 0:
                    for (int k = 0; k < 6; k++) Visuals.Prim(PrimitiveType.Cylinder, t, new Vector3((k % 3 - 1) * 0.9f, 0.3f + (k / 3) * 0.5f, (k % 2) * 0.6f - 0.3f), new Vector3(0.45f, 1.6f, 0.45f), wood, new Vector3(0, k * 31, 90));
                    break;
                case 1:
                    for (int k = 0; k < 14; k++) { float a = k * 2.4f, d = 0.5f + (k % 4) * 0.45f; Visuals.Prim(PrimitiveType.Sphere, t, new Vector3(Mathf.Cos(a) * d, 0.12f, Mathf.Sin(a) * d), new Vector3(0.55f, 0.25f, 0.4f), mussel, new Vector3(0, k * 40, 0)); }
                    break;
                case 2:
                    Visuals.Prim(PrimitiveType.Cylinder, t, new Vector3(0, 0.05f, 0), new Vector3(3.6f, 0.05f, 2.8f), pond);
                    for (int k = 0; k < 5; k++) Visuals.Prim(PrimitiveType.Cylinder, t, new Vector3(Mathf.Cos(k) * 1.8f, 0.5f, Mathf.Sin(k) * 1.4f), new Vector3(0.1f, 0.5f, 0.1f), MatLib.Lit(Visuals.Reed));
                    break;
                default:
                    for (int k = 0; k < 5; k++) Visuals.Prim(PrimitiveType.Cube, t, new Vector3((k - 2) * 0.6f, 0.25f + (k % 2) * 0.25f, (k % 3 - 1) * 0.5f), new Vector3(0.9f, 0.4f, 0.6f), scrap, new Vector3(k * 13, k * 47, k * 9));
                    break;
            }
            Pickable(go, -1000 - n.id, new Vector3(5, 3, 5), new Vector3(0, 1, 0));
            return go;
        }

        GameObject MakeTreasure(Spot s)
        {
            var go = new GameObject("Schatz " + s.id);
            go.transform.SetParent(root, false);
            var t = go.transform;
            Visuals.Prim(PrimitiveType.Cube, t, new Vector3(0, 0.35f, 0), new Vector3(1.2f, 0.7f, 0.8f), chest);
            Visuals.Prim(PrimitiveType.Cube, t, new Vector3(0, 0.75f, 0), new Vector3(1.25f, 0.15f, 0.85f), gold);
            Visuals.Prim(PrimitiveType.Sphere, t, new Vector3(0, 1.4f, 0), Vector3.one * 0.45f, glow);
            Pickable(go, -3000 - s.id, new Vector3(5, 4, 5), new Vector3(0, 1, 0));
            return go;
        }

        GameObject MakeObst(Spot s)
        {
            var go = new GameObject("Hindernis " + s.id);
            go.transform.SetParent(root, false);
            var t = new GameObject("Form").transform; t.SetParent(go.transform, false);
            switch (s.kind)
            {
                case 0:
                    for (int k = 0; k < 5; k++) Visuals.Prim(PrimitiveType.Cylinder, t, new Vector3((k - 2) * 0.55f, 0.25f + (k % 2) * 0.35f, (k % 3 - 1) * 0.4f), new Vector3(0.28f, 1.3f - (k % 3) * 0.25f, 0.28f), wood, new Vector3(0, k * 37, 90));
                    break;
                case 1:
                    Visuals.Prim(PrimitiveType.Capsule, t, new Vector3(0, 0.4f, 0), new Vector3(2.2f, 3.2f, 1.6f), hull, new Vector3(90, 0, 25));
                    Visuals.Prim(PrimitiveType.Cylinder, t, new Vector3(0.3f, 1.8f, 0), new Vector3(0.15f, 1.6f, 0.15f), wood, new Vector3(0, 0, 30));
                    break;
                case 2:
                    for (int k = 0; k < 6; k++) Visuals.Prim(PrimitiveType.Sphere, t, new Vector3(Mathf.Cos(k) * 0.9f, 0.35f + (k % 3) * 0.25f, Mathf.Sin(k * 1.3f) * 0.8f), new Vector3(0.9f, 0.7f, 0.9f), tang);
                    break;
                default:
                    Visuals.Prim(PrimitiveType.Sphere, t, new Vector3(0, 0.6f, 0), new Vector3(2.2f, 1.5f, 1.8f), rock);
                    Visuals.Prim(PrimitiveType.Sphere, t, new Vector3(1.1f, 0.4f, 0.6f), new Vector3(1.2f, 0.9f, 1.1f), rock);
                    Visuals.Prim(PrimitiveType.Sphere, t, new Vector3(-0.9f, 0.3f, -0.5f), new Vector3(1f, 0.7f, 0.9f), rock);
                    break;
            }
            go.transform.rotation = Quaternion.Euler(0, s.rot, 0);
            Pickable(go, -4000 - s.id, new Vector3(5, 3, 5), new Vector3(0, 1, 0));
            return go;
        }

        Transform MakeWalker()
        {
            var t = new GameObject("Sammler").transform;
            t.SetParent(root, false);
            if (Creatures.MatMaker == null) Creatures.MatMaker = (col, g) => MatLib.Lit(col, g);
            var look = HumanLook.Random();
            look.shirt = Creatures.Hex(new[] { "#e6b422", "#c8642a", "#3f5f7a", "#5d6b45" }[Random.Range(0, 4)]);
            look.boots = true; look.hat = Random.value < 0.5f ? "suedwester" : ""; look.hatColor = Creatures.Hex("#e6b422");
            HumanFigure.Create(t, look, look.height * 0.95f);
            // Kiepe (Rückentrage) für die Ladung
            Visuals.Prim(PrimitiveType.Cylinder, t, new Vector3(0, 1.15f, -0.28f), new Vector3(0.38f, 0.22f, 0.3f), basket);
            return t;
        }

        void Sync<T>(Dictionary<int, GameObject> map, List<T> list, System.Func<T, int> id, System.Func<T, GameObject> make)
        {
            var seen = new HashSet<int>();
            foreach (var x in list)
            {
                int k = id(x); seen.Add(k);
                if (!map.ContainsKey(k)) map[k] = make(x);
            }
            var drop = new List<int>();
            foreach (var kv in map) if (!seen.Contains(kv.Key)) drop.Add(kv.Key);
            foreach (int k in drop) { Destroy(map[k]); map.Remove(k); }
        }

        void Update()
        {
            var c = Colony.I;
            if (c == null || c.S2 == null || root == null) return;
            var s = c.S2;
            Sync(nodes, s.nodes, n => n.id, MakeNode);
            foreach (var n in s.nodes)
            {
                var go = nodes[n.id];
                float f = 0.45f + 0.55f * Mathf.Clamp01(n.amount / Mathf.Max(1, n.max));
                go.transform.position = new Vector3(n.x, n.h, n.z);
                go.transform.localScale = Vector3.one * f;
            }
            Sync(treasures, s.treasures, x => x.id, MakeTreasure);
            foreach (var x in s.treasures)
            {
                var go = treasures[x.id];
                go.transform.position = new Vector3(x.x, 0.05f + Mathf.Sin(Time.time * 2f + x.id) * 0.08f, x.z);
                go.transform.rotation = Quaternion.Euler(0, Time.time * 20f, 0);
            }
            Sync(obst, s.obst, x => x.id, MakeObst);
            foreach (var x in s.obst)
            {
                var go = obst[x.id];
                float k = s.clearId == x.id ? 0.35f + 0.65f * Mathf.Clamp01(s.clearLeft / Mathf.Max(1, s.clearTotal)) : 1f;
                go.transform.position = new Vector3(x.x, GroundAt(c, x.x, x.z) + (s.clearId == x.id ? Mathf.Sin(Time.time * 20f) * 0.03f : 0f), x.z);
                go.transform.GetChild(0).localScale = Vector3.one * k;
            }

            // Sammler unterwegs
            int want = Mathf.Min(s.gath.Count, 40);
            while (walkers.Count < want) walkers.Add(MakeWalker());
            while (walkers.Count > want) { Destroy(walkers[walkers.Count - 1].gameObject); walkers.RemoveAt(walkers.Count - 1); }
            var paths = new Dictionary<int, List<Vector2>>();
            for (int i = 0; i < want; i++)
            {
                var g = s.gath[i]; var n = c.NodeById(g.node);
                var w = walkers[i];
                if (n == null || g.d <= 0f) { w.gameObject.SetActive(false); continue; }
                w.gameObject.SetActive(true);
                if (!paths.TryGetValue(n.id, out var pts)) { pts = c.GatherPath(n, out _); paths[n.id] = pts; }
                var p = Colony.PathPoint(pts, g.d);
                float yaw = p.z * Mathf.Rad2Deg + (g.phase == "back" ? 180f : 0f);
                float bob = g.phase == "work" ? Mathf.Abs(Mathf.Sin(Time.time * 6f + i)) * 0.08f : 0f;
                w.position = new Vector3(p.x, GroundAt(c, p.x, p.y) + bob, p.y);
                w.rotation = Quaternion.Euler(g.phase == "work" ? 25f : 0f, yaw, 0);
                w.GetChild(1).gameObject.SetActive(g.load > 0 || g.phase == "work");
            }
        }
    }
}
