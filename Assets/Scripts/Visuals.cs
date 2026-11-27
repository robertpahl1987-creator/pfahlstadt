using System.Collections.Generic;
using UnityEngine;

namespace Pfahlstadt
{
    /// Baut alle 3D-Modelle prozedural aus Grundformen – keine externen Assets nötig.
    public static class Visuals
    {
        public static readonly Color Sand = new Color(0.62f, 0.57f, 0.47f);
        public static readonly Color WetSand = new Color(0.42f, 0.39f, 0.33f);
        public static readonly Color Plank = new Color(0.52f, 0.4f, 0.27f);
        public static readonly Color Drift = new Color(0.62f, 0.56f, 0.48f);
        public static readonly Color Tar = new Color(0.16f, 0.13f, 0.11f);
        public static readonly Color Wall = new Color(0.36f, 0.42f, 0.44f);
        public static readonly Color WallBlue = new Color(0.25f, 0.38f, 0.5f);
        public static readonly Color Reed = new Color(0.72f, 0.62f, 0.38f);
        public static readonly Color Rust = new Color(0.5f, 0.28f, 0.18f);
        public static readonly Color Window = new Color(1f, 0.72f, 0.38f);

        static Mesh cone, prism;
        public static Mesh Cone { get { if (cone == null) cone = BuildCone(14); return cone; } }
        public static Mesh Prism { get { if (prism == null) prism = BuildPrism(); return prism; } }

        // ---------- Meshes ----------

        static void Tri(List<Vector3> v, List<int> t, Vector3 a, Vector3 b, Vector3 c)
        {
            int i = v.Count;
            v.Add(a); v.Add(b); v.Add(c);
            t.Add(i); t.Add(i + 1); t.Add(i + 2);
        }

        /// Kegel: Radius 0.5, Höhe 1, Boden bei y=0
        static Mesh BuildCone(int seg)
        {
            var v = new List<Vector3>(); var t = new List<int>();
            var top = new Vector3(0, 1, 0);
            for (int i = 0; i < seg; i++)
            {
                float a0 = i * Mathf.PI * 2f / seg, a1 = (i + 1) * Mathf.PI * 2f / seg;
                var p0 = new Vector3(Mathf.Cos(a0) * 0.5f, 0, Mathf.Sin(a0) * 0.5f);
                var p1 = new Vector3(Mathf.Cos(a1) * 0.5f, 0, Mathf.Sin(a1) * 0.5f);
                Tri(v, t, p0, top, p1);
                Tri(v, t, p1, Vector3.zero, p0);
            }
            var m = new Mesh { name = "Kegel" };
            m.SetVertices(v); m.SetTriangles(t, 0);
            m.RecalculateNormals(); m.RecalculateBounds();
            return m;
        }

        /// Dachprisma: Breite x=1, Höhe y=1, Tiefe z=1, First entlang z
        static Mesh BuildPrism()
        {
            var v = new List<Vector3>(); var t = new List<int>();
            var A = new Vector3(-.5f, 0, -.5f); var B = new Vector3(.5f, 0, -.5f); var C = new Vector3(0, 1, -.5f);
            var A2 = new Vector3(-.5f, 0, .5f); var B2 = new Vector3(.5f, 0, .5f); var C2 = new Vector3(0, 1, .5f);
            Tri(v, t, A, C, B);
            Tri(v, t, B2, C2, A2);
            Tri(v, t, A2, C2, C); Tri(v, t, A2, C, A);
            Tri(v, t, B, C, C2); Tri(v, t, B, C2, B2);
            var m = new Mesh { name = "Prisma" };
            m.SetVertices(v); m.SetTriangles(t, 0);
            m.RecalculateNormals(); m.RecalculateBounds();
            return m;
        }

        // ---------- Helfer ----------

        public static GameObject Prim(PrimitiveType type, Transform parent, Vector3 pos, Vector3 scale, Material mat)
        {
            var go = GameObject.CreatePrimitive(type);
            var col = go.GetComponent<Collider>();
            if (col) Object.Destroy(col);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.transform.localScale = scale;
            go.GetComponent<Renderer>().sharedMaterial = mat;
            return go;
        }

        public static GameObject Prim(PrimitiveType type, Transform parent, Vector3 pos, Vector3 scale, Material mat, Vector3 euler)
        {
            var g = Prim(type, parent, pos, scale, mat);
            g.transform.localEulerAngles = euler;
            return g;
        }

        public static GameObject MeshObj(Mesh mesh, Transform parent, Vector3 pos, Vector3 scale, Material mat)
        {
            var go = new GameObject(mesh.name);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.transform.localScale = scale;
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            go.AddComponent<MeshRenderer>().sharedMaterial = mat;
            return go;
        }

        static Transform Root(string name, Transform parent)
        {
            var r = new GameObject(name).transform;
            r.SetParent(parent, false);
            return r;
        }

        /// Pfahlhaus-Grundform mit Satteldach (Reet), Tür vorn (+z) und warmen Fenstern
        static void Hut(Transform r, Vector3 p, float w, float h, float d, Color wall, Color roof, int windows, bool door = true)
        {
            Prim(PrimitiveType.Cube, r, p + new Vector3(0, h * 0.5f, 0), new Vector3(w, h, d), MatLib.Lit(wall, 0.12f));
            // Eckbalken
            var beam = MatLib.Lit(Tar, 0.2f);
            for (int i = 0; i < 4; i++)
            {
                float sx = (i & 1) == 0 ? -w / 2f : w / 2f, sz = (i & 2) == 0 ? -d / 2f : d / 2f;
                Prim(PrimitiveType.Cube, r, p + new Vector3(sx, h / 2f, sz), new Vector3(0.18f, h, 0.18f), beam);
            }
            MeshObj(Prism, r, p + new Vector3(0, h, 0), new Vector3(w * 1.22f, h * 0.8f, d * 1.15f), MatLib.Lit(roof, 0.05f));
            float fz = p.z + d * 0.5f + 0.04f;
            var glow = MatLib.Glow(Window, 1.6f);
            if (door) Prim(PrimitiveType.Cube, r, new Vector3(p.x, p.y + 0.6f, fz), new Vector3(0.75f, 1.2f, 0.08f), MatLib.Lit(Tar));
            for (int i = 0; i < windows; i++)
            {
                float t = windows == 1 ? 0.5f : i / (float)(windows - 1);
                float x = Mathf.Lerp(-w * 0.32f, w * 0.32f, t);
                if (door && Mathf.Abs(x) < 0.65f) x += x >= 0 ? 0.75f : -0.75f;
                // runde Bullaugen-Fenster
                Prim(PrimitiveType.Cylinder, r, new Vector3(p.x + x, p.y + h * 0.6f, fz), new Vector3(0.5f, 0.04f, 0.5f), glow, new Vector3(90, 0, 0));
            }
        }

        static void Barrel(Transform r, Vector3 p)
        {
            Prim(PrimitiveType.Cylinder, r, p + new Vector3(0, 0.45f, 0), new Vector3(0.6f, 0.45f, 0.6f), MatLib.Lit(Plank, 0.2f));
            Prim(PrimitiveType.Cylinder, r, p + new Vector3(0, 0.7f, 0), new Vector3(0.63f, 0.03f, 0.63f), MatLib.Lit(Tar, 0.4f, 0.5f));
        }

        // ---------- Gebäude ----------

        /// Vorläufige Form für die neuen Gebäude (bekommen später eigene Modelle)
        static void Generic(Transform r, BType t)
        {
            Color wall = new Color(0.55f, 0.48f, 0.38f), roof = Reed;
            switch (t)
            {
                case BType.Kueche: wall = new Color(0.7f, 0.62f, 0.5f); roof = new Color(0.55f, 0.25f, 0.2f); break;
                case BType.Kaserne: case BType.Wachstube: wall = new Color(0.5f, 0.5f, 0.52f); roof = new Color(0.3f, 0.32f, 0.38f); break;
                case BType.Lager: wall = new Color(0.5f, 0.38f, 0.26f); roof = new Color(0.35f, 0.3f, 0.25f); break;
                case BType.Lazarett: wall = new Color(0.85f, 0.85f, 0.8f); roof = new Color(0.6f, 0.2f, 0.2f); break;
                case BType.Akademie: wall = new Color(0.75f, 0.72f, 0.62f); roof = new Color(0.2f, 0.32f, 0.5f); break;
                case BType.Werft: wall = new Color(0.45f, 0.34f, 0.24f); roof = new Color(0.3f, 0.26f, 0.2f); break;
            }
            switch (t)
            {
                case BType.Wachturm:
                    for (int i = 0; i < 4; i++)
                        Prim(PrimitiveType.Cube, r, new Vector3((i & 1) * 2.4f - 1.2f, 3f, (i >> 1) * 2.4f - 1.2f), new Vector3(0.3f, 6f, 0.3f), MatLib.Lit(Tar));
                    Prim(PrimitiveType.Cube, r, new Vector3(0, 6.1f, 0), new Vector3(3.2f, 0.3f, 3.2f), MatLib.Lit(Plank, 0.2f));
                    MeshObj(Cone, r, new Vector3(0, 6.3f, 0), new Vector3(3.6f, 1.6f, 3.6f), MatLib.Lit(roof, 0.05f));
                    break;
                case BType.Wahrzeichen:
                    Prim(PrimitiveType.Cylinder, r, new Vector3(0, 3.5f, 0), new Vector3(2.6f, 3.5f, 2.6f), MatLib.Lit(new Color(0.6f, 0.58f, 0.55f), 0.2f));
                    Prim(PrimitiveType.Cylinder, r, new Vector3(0, 5.2f, 1.32f), new Vector3(1.9f, 0.05f, 1.9f), MatLib.Lit(new Color(0.95f, 0.93f, 0.85f), 0.4f), new Vector3(90, 0, 0));
                    MeshObj(Cone, r, new Vector3(0, 7f, 0), new Vector3(3.2f, 2.4f, 3.2f), MatLib.Lit(new Color(0.2f, 0.45f, 0.42f), 0.5f, 0.4f));
                    break;
                case BType.Schleuderplatz:
                    Prim(PrimitiveType.Cube, r, new Vector3(0, 0.4f, 0), new Vector3(3f, 0.8f, 2f), MatLib.Lit(Plank, 0.2f));
                    Prim(PrimitiveType.Cube, r, new Vector3(0, 2f, 0), new Vector3(0.3f, 3f, 0.3f), MatLib.Lit(Tar), new Vector3(0, 0, 25));
                    Barrel(r, new Vector3(2.2f, 0, 1.2f)); Barrel(r, new Vector3(-2.2f, 0, -1.2f));
                    break;
                default:
                    Hut(r, Vector3.zero, 4.2f, 2.6f, 3.6f, wall, roof, 2);
                    Barrel(r, new Vector3(2.6f, 0, 1.8f));
                    break;
            }
        }

        public static GameObject Building(BType t, int level, Transform parent)
        {
            var r = Root(t.ToString(), parent);
            switch (t)
            {
                case BType.Treibholzsammler:
                    Hut(r, new Vector3(0.9f, 0, -0.6f), 3f, 2.1f, 2.6f, Wall, Reed, 2);
                    for (int i = 0; i < 7; i++)
                    {
                        int row = i < 4 ? 0 : 1;
                        float z = -1.5f + (i % 4) * 0.5f + row * 0.25f;
                        var log = Prim(PrimitiveType.Cylinder, r, new Vector3(-2.3f, 0.25f + row * 0.42f, z),
                            new Vector3(0.45f, 1.0f + (i % 3) * 0.15f, 0.45f), MatLib.Lit(Drift, 0.1f));
                        log.transform.localRotation = Quaternion.Euler(0, 8f * (i % 3), 90);
                    }
                    // Kran mit Netz über dem Wasser
                    Prim(PrimitiveType.Cube, r, new Vector3(-3.2f, 2.2f, -2.6f), new Vector3(0.25f, 4.4f, 0.25f), MatLib.Lit(Tar));
                    Prim(PrimitiveType.Cube, r, new Vector3(-3.2f, 4.3f, -3.8f), new Vector3(0.2f, 0.2f, 2.6f), MatLib.Lit(Tar));
                    Prim(PrimitiveType.Sphere, r, new Vector3(-3.2f, 3.2f, -4.9f), new Vector3(0.9f, 1.2f, 0.9f), MatLib.Lit(new Color(0.3f, 0.35f, 0.28f), 0.05f));
                    break;

                case BType.Muschelzucht:
                    Hut(r, new Vector3(-0.8f, 0, -1f), 2.6f, 1.9f, 2.4f, WallBlue, Reed, 1);
                    // Muschelpfähle mit Seilen, die außen ins Wasser reichen
                    var pole = MatLib.Lit(Tar, 0.3f);
                    var rope = MatLib.Lit(new Color(0.65f, 0.58f, 0.42f));
                    var mussel = MatLib.Lit(new Color(0.12f, 0.13f, 0.2f), 0.7f);
                    for (int i = 0; i < 4; i++)
                    {
                        float x = -1.2f + (i % 2) * 2.4f, z = -4.8f - (i / 2) * 1.4f;
                        Prim(PrimitiveType.Cylinder, r, new Vector3(x, -1f, z), new Vector3(0.18f, 3f, 0.18f), pole);
                        Prim(PrimitiveType.Cylinder, r, new Vector3(x, -0.9f, z), new Vector3(0.34f, 1f, 0.34f), mussel);
                    }
                    Prim(PrimitiveType.Cube, r, new Vector3(0f, 1.6f, -4.8f), new Vector3(2.6f, 0.06f, 0.06f), rope);
                    for (int i = 0; i < 3; i++)
                        Prim(PrimitiveType.Cylinder, r, new Vector3(-2.6f + i * 0.9f, 0.3f, 1.9f), new Vector3(0.7f, 0.3f, 0.7f), MatLib.Lit(Reed));
                    break;

                case BType.Regenfaenger:
                    // großer Segeltrichter (umgedrehter Kegel)
                    var sail = MatLib.Lit(new Color(0.86f, 0.83f, 0.74f), 0.1f);
                    var funnel = MeshObj(Cone, r, new Vector3(0, 4.6f, 0), new Vector3(4.2f, 2.2f, 4.2f), sail);
                    funnel.transform.localRotation = Quaternion.Euler(180, 0, 0);
                    for (int i = 0; i < 3; i++)
                    {
                        float a = i * 120f * Mathf.Deg2Rad;
                        Prim(PrimitiveType.Cube, r, new Vector3(Mathf.Cos(a) * 1.7f, 2.2f, Mathf.Sin(a) * 1.7f), new Vector3(0.2f, 4.6f, 0.2f), MatLib.Lit(Tar));
                    }
                    Prim(PrimitiveType.Cylinder, r, new Vector3(0, 1.1f, 0), new Vector3(1.8f, 1.1f, 1.8f), MatLib.Lit(Plank, 0.25f));
                    Prim(PrimitiveType.Cylinder, r, new Vector3(0, 2.25f, 0), new Vector3(0.25f, 0.2f, 0.25f), MatLib.Lit(Rust, 0.3f, 0.6f));
                    Barrel(r, new Vector3(2.4f, 0, 1.6f)); Barrel(r, new Vector3(2.4f, 0, 0.7f)); Barrel(r, new Vector3(-2.4f, 0, 1.6f));
                    break;

                case BType.Wracktaucher:
                    Hut(r, new Vector3(1.2f, 0, -0.6f), 2.6f, 2f, 2.4f, Wall, new Color(0.3f, 0.3f, 0.32f), 1);
                    // Taucherglocke am Ausleger
                    Prim(PrimitiveType.Cube, r, new Vector3(-2.2f, 2.6f, 0f), new Vector3(0.3f, 5.2f, 0.3f), MatLib.Lit(Tar));
                    Prim(PrimitiveType.Cube, r, new Vector3(-2.2f, 5.1f, -1.6f), new Vector3(0.25f, 0.25f, 3.4f), MatLib.Lit(Tar));
                    Prim(PrimitiveType.Cube, r, new Vector3(-2.2f, 4.0f, -3.2f), new Vector3(0.05f, 2.2f, 0.05f), MatLib.Lit(Tar));
                    Prim(PrimitiveType.Sphere, r, new Vector3(-2.2f, 2.5f, -3.2f), new Vector3(1.3f, 1.4f, 1.3f), MatLib.Lit(new Color(0.55f, 0.45f, 0.25f), 0.7f, 0.9f));
                    Prim(PrimitiveType.Cylinder, r, new Vector3(-2.2f, 2.5f, -3.85f), new Vector3(0.45f, 0.03f, 0.45f), MatLib.Glow(new Color(0.5f, 0.8f, 1f), 1.2f), new Vector3(90, 0, 0));
                    // Altmetall-Haufen
                    for (int i = 0; i < 5; i++)
                        Prim(PrimitiveType.Cube, r, new Vector3(0.6f + i * 0.35f, 0.25f, 1.8f - (i % 2) * 0.4f), new Vector3(0.6f, 0.4f, 0.5f), MatLib.Lit(Rust, 0.3f, 0.5f), new Vector3(0, i * 23f, i * 9f));
                    // Anker
                    Prim(PrimitiveType.Cube, r, new Vector3(2.9f, 0.9f, 1.6f), new Vector3(0.15f, 1.6f, 0.15f), MatLib.Lit(Tar, 0.4f, 0.7f));
                    Prim(PrimitiveType.Cube, r, new Vector3(2.9f, 0.25f, 1.6f), new Vector3(0.9f, 0.15f, 0.15f), MatLib.Lit(Tar, 0.4f, 0.7f));
                    break;

                case BType.Unterkunft:
                    Hut(r, new Vector3(0, 0, -0.3f), 5f, 2.4f, 3.2f, WallBlue, Reed, 4);
                    Prim(PrimitiveType.Cube, r, new Vector3(1.6f, 3.4f, -0.8f), new Vector3(0.5f, 1.6f, 0.5f), MatLib.Lit(new Color(0.5f, 0.3f, 0.25f)));
                    MakeSmoke(r, new Vector3(1.6f, 4.3f, -0.8f), 0.6f);
                    // Wäscheleine
                    Prim(PrimitiveType.Cube, r, new Vector3(-2.9f, 1.1f, 2.2f), new Vector3(0.12f, 2.2f, 0.12f), MatLib.Lit(Tar));
                    Prim(PrimitiveType.Cube, r, new Vector3(2.9f, 1.1f, 2.2f), new Vector3(0.12f, 2.2f, 0.12f), MatLib.Lit(Tar));
                    Prim(PrimitiveType.Cube, r, new Vector3(0f, 2.1f, 2.2f), new Vector3(5.8f, 0.04f, 0.04f), MatLib.Lit(Reed));
                    Prim(PrimitiveType.Cube, r, new Vector3(-1f, 1.7f, 2.2f), new Vector3(0.7f, 0.8f, 0.03f), MatLib.Lit(new Color(0.8f, 0.3f, 0.25f)));
                    Prim(PrimitiveType.Cube, r, new Vector3(0.6f, 1.75f, 2.2f), new Vector3(0.6f, 0.7f, 0.03f), MatLib.Lit(new Color(0.9f, 0.85f, 0.6f)));
                    break;

                case BType.Heilerhuette:
                    Hut(r, new Vector3(0, 0, -0.3f), 3.6f, 2.4f, 3f, new Color(0.82f, 0.84f, 0.8f), Reed, 2);
                    // grünes Kräuterblatt-Zeichen
                    var leaf = MatLib.Glow(new Color(0.3f, 0.95f, 0.45f), 1.4f);
                    Prim(PrimitiveType.Sphere, r, new Vector3(0, 2.0f, 1.25f), new Vector3(0.55f, 0.8f, 0.06f), leaf, new Vector3(0, 0, 35));
                    // Kräuterkästen
                    for (int i = 0; i < 3; i++)
                    {
                        Prim(PrimitiveType.Cube, r, new Vector3(-1.4f + i * 1.4f, 0.25f, 2.2f), new Vector3(1.1f, 0.5f, 0.6f), MatLib.Lit(Plank));
                        Prim(PrimitiveType.Sphere, r, new Vector3(-1.4f + i * 1.4f, 0.6f, 2.2f), new Vector3(1f, 0.5f, 0.5f), MatLib.Lit(new Color(0.25f, 0.5f, 0.25f)));
                    }
                    break;

                case BType.Raeucherei:
                    Hut(r, new Vector3(0.4f, 0, -0.4f), 3.2f, 2.2f, 2.8f, new Color(0.3f, 0.26f, 0.22f), Reed, 1);
                    Prim(PrimitiveType.Cube, r, new Vector3(-0.6f, 3.1f, -0.9f), new Vector3(0.7f, 1.8f, 0.7f), MatLib.Lit(new Color(0.45f, 0.3f, 0.24f)));
                    MakeSmoke(r, new Vector3(-0.6f, 4.1f, -0.9f), 1f);
                    // Trockengestell mit Fisch
                    Prim(PrimitiveType.Cube, r, new Vector3(-2.4f, 1f, 1.2f), new Vector3(0.15f, 2f, 0.15f), MatLib.Lit(Tar));
                    Prim(PrimitiveType.Cube, r, new Vector3(-2.4f, 1f, -0.4f), new Vector3(0.15f, 2f, 0.15f), MatLib.Lit(Tar));
                    Prim(PrimitiveType.Cube, r, new Vector3(-2.4f, 1.95f, 0.4f), new Vector3(0.1f, 0.1f, 1.8f), MatLib.Lit(Tar));
                    for (int i = 0; i < 4; i++)
                        Prim(PrimitiveType.Sphere, r, new Vector3(-2.4f, 1.5f, -0.2f + i * 0.4f), new Vector3(0.12f, 0.7f, 0.25f), MatLib.Lit(new Color(0.75f, 0.55f, 0.3f), 0.5f));
                    Barrel(r, new Vector3(2.4f, 0, 1.5f));
                    break;

                default:
                    Generic(r, t);
                    break;
            }
            r.localScale = Vector3.one * (1f + 0.07f * (level - 1));
            return r.gameObject;
        }

        /// Leuchtturm. Wird auf das Deck der Mittelplattform gesetzt.
        public static GameObject Tower(int level, Transform parent, out Light lamp, out Transform beamPivot, out Material lampMat)
        {
            var r = Root("Gezeitenturm", parent);
            var red = MatLib.Lit(new Color(0.7f, 0.16f, 0.13f), 0.35f);
            var white = MatLib.Lit(new Color(0.92f, 0.92f, 0.88f), 0.35f);
            var dark = MatLib.Lit(new Color(0.12f, 0.13f, 0.15f), 0.5f, 0.6f);

            float height = 9f + 0.5f * level;
            int bands = 6;
            for (int i = 0; i < bands; i++)
            {
                float t0 = i / (float)bands;
                float rad = Mathf.Lerp(3.4f, 2.3f, t0);
                float segH = height / bands;
                Prim(PrimitiveType.Cylinder, r, new Vector3(0, segH * (i + 0.5f), 0), new Vector3(rad, segH / 2f, rad), i % 2 == 0 ? red : white);
            }
            // Tür und kleine Fenster
            Prim(PrimitiveType.Cube, r, new Vector3(0, 0.9f, 1.68f), new Vector3(1f, 1.8f, 0.12f), MatLib.Lit(Tar));
            var glow = MatLib.Glow(Window, 1.4f);
            for (int i = 1; i < 4; i++)
            {
                float y = height * i / 4.5f;
                float rad = Mathf.Lerp(3.4f, 2.3f, y / height) * 0.5f + 0.02f;
                Prim(PrimitiveType.Cube, r, new Vector3(0, y, rad), new Vector3(0.4f, 0.6f, 0.06f), glow);
            }
            // Galerie mit Geländer
            Prim(PrimitiveType.Cylinder, r, new Vector3(0, height + 0.1f, 0), new Vector3(3.4f, 0.12f, 3.4f), dark);
            for (int i = 0; i < 16; i++)
            {
                float a = i * Mathf.PI * 2f / 16f;
                Prim(PrimitiveType.Cube, r, new Vector3(Mathf.Cos(a) * 1.6f, height + 0.55f, Mathf.Sin(a) * 1.6f), new Vector3(0.07f, 0.8f, 0.07f), dark);
            }
            // Laternenraum
            lampMat = new Material(MatLib.Glow(new Color(1f, 0.85f, 0.45f), 3f));
            Prim(PrimitiveType.Cylinder, r, new Vector3(0, height + 1.2f, 0), new Vector3(1.9f, 1f, 1.9f), lampMat);
            MeshObj(Cone, r, new Vector3(0, height + 2.2f, 0), new Vector3(2.6f, 1.5f, 2.6f), red);
            Prim(PrimitiveType.Sphere, r, new Vector3(0, height + 3.8f, 0), new Vector3(0.35f, 0.35f, 0.35f), dark);

            var lg = new GameObject("Lampe");
            lg.transform.SetParent(r, false);
            lg.transform.localPosition = new Vector3(0, height + 1.2f, 0);
            lamp = lg.AddComponent<Light>();
            lamp.type = LightType.Point;
            lamp.color = new Color(1f, 0.8f, 0.5f);
            lamp.range = 35f;
            lamp.intensity = 2f;
            lamp.shadows = LightShadows.None;

            // rotierender Lichtkegel (zwei Strahlen)
            beamPivot = Root("Strahl", r);
            beamPivot.localPosition = new Vector3(0, height + 1.2f, 0);
            var beamMat = MatLib.Beam();
            for (int k = 0; k < 2; k++)
            {
                var side = Root("Seite", beamPivot);
                side.localRotation = Quaternion.Euler(0, k * 180f, 0);
                var b = MeshObj(Cone, side, new Vector3(0, 0, 60f), new Vector3(9f, 60f, 4f), beamMat);
                b.transform.localRotation = Quaternion.Euler(-90, 0, 0);
                b.GetComponent<MeshRenderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }
            return r.gameObject;
        }

        public static GameObject Scaffold(Transform parent, float half, bool newBuild, out Transform ghost)
        {
            var r = Root("Gerüst", parent);
            var wood = MatLib.Lit(new Color(0.65f, 0.5f, 0.3f));
            float h = half * 1.1f + 1.5f;
            for (int i = 0; i < 4; i++)
            {
                float sx = (i & 1) == 0 ? -half : half, sz = (i & 2) == 0 ? -half : half;
                Prim(PrimitiveType.Cube, r, new Vector3(sx, h / 2f, sz), new Vector3(0.18f, h, 0.18f), wood);
            }
            for (int k = 1; k <= 2; k++)
            {
                float y = h * 0.45f * k;
                Prim(PrimitiveType.Cube, r, new Vector3(0, y, -half), new Vector3(half * 2f, 0.12f, 0.12f), wood);
                Prim(PrimitiveType.Cube, r, new Vector3(0, y, half), new Vector3(half * 2f, 0.12f, 0.12f), wood);
                Prim(PrimitiveType.Cube, r, new Vector3(-half, y, 0), new Vector3(0.12f, 0.12f, half * 2f), wood);
                Prim(PrimitiveType.Cube, r, new Vector3(half, y, 0), new Vector3(0.12f, 0.12f, half * 2f), wood);
            }
            ghost = null;
            if (newBuild)
            {
                ghost = Prim(PrimitiveType.Cube, r, new Vector3(0, 0.05f, 0), new Vector3(half * 1.3f, 0.1f, half * 1.3f), MatLib.Lit(new Color(0.6f, 0.5f, 0.38f))).transform;
                Prim(PrimitiveType.Cube, r, new Vector3(half + 0.6f, 0.3f, half - 0.6f), new Vector3(0.9f, 0.6f, 1.4f), MatLib.Lit(Drift));
            }
            return r.gameObject;
        }

        // ---------- Partikel ----------

        public static ParticleSystem NewPS(string name, Transform parent, Vector3 pos, Material mat)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.transform.localRotation = Quaternion.Euler(-90, 0, 0);   // Kegel zeigt nach oben
            var ps = go.AddComponent<ParticleSystem>();
            ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            var main = ps.main;
            main.loop = true;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            go.GetComponent<ParticleSystemRenderer>().sharedMaterial = mat;
            return ps;
        }

        static Gradient Grad(Color a, Color b, float a0, float aMid, float a1)
        {
            var g = new Gradient();
            g.SetKeys(new[] { new GradientColorKey(a, 0f), new GradientColorKey(b, 1f) },
                      new[] { new GradientAlphaKey(a0, 0f), new GradientAlphaKey(aMid, 0.2f), new GradientAlphaKey(a1, 1f) });
            return g;
        }

        public static ParticleSystem MakeSmoke(Transform parent, Vector3 pos, float size)
        {
            var ps = NewPS("Rauch", parent, pos, MatLib.Particle(false));
            var m = ps.main;
            m.startLifetime = new ParticleSystem.MinMaxCurve(3.5f, 5.5f);
            m.startSpeed = new ParticleSystem.MinMaxCurve(0.8f * size, 1.6f * size);
            m.startSize = new ParticleSystem.MinMaxCurve(0.8f * size, 1.4f * size);
            m.startColor = new Color(0.75f, 0.75f, 0.78f, 0.6f);
            m.maxParticles = 60;
            var em = ps.emission; em.rateOverTime = 6f;
            var sh = ps.shape; sh.shapeType = ParticleSystemShapeType.Cone; sh.angle = 10f; sh.radius = 0.2f * size;
            var col = ps.colorOverLifetime; col.enabled = true;
            col.color = new ParticleSystem.MinMaxGradient(Grad(new Color(0.8f, 0.8f, 0.82f), new Color(0.6f, 0.62f, 0.66f), 0f, 0.55f, 0f));
            var sol = ps.sizeOverLifetime; sol.enabled = true;
            sol.size = new ParticleSystem.MinMaxCurve(1f, AnimationCurve.Linear(0f, 0.6f, 1f, 2.4f));
            var noise = ps.noise; noise.enabled = true; noise.strength = 0.4f; noise.frequency = 0.3f; noise.quality = ParticleSystemNoiseQuality.Low;
            ps.Play();
            return ps;
        }
    }
}
