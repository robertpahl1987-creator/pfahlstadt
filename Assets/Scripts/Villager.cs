using System.Collections.Generic;
using UnityEngine;

namespace Pfahlstadt
{
    /// Siedler laufen über Stege: Bauplatz → Mittelplattform → anderer Bauplatz.
    public class Villager : MonoBehaviour
    {
        static readonly Color[] Coats =
        {
            new Color(0.75f, 0.55f, 0.15f), new Color(0.2f, 0.32f, 0.5f), new Color(0.55f, 0.2f, 0.18f),
            new Color(0.3f, 0.42f, 0.3f), new Color(0.5f, 0.45f, 0.38f), new Color(0.85f, 0.75f, 0.3f),
        };

        Transform vis;
        HumanFigure figure;
        readonly Queue<Vector3> path = new Queue<Vector3>();
        int spoke = -1;          // -1 = Mittelplattform
        float wait, speed, phase;
        bool sick;

        public static Villager Create(Transform parent)
        {
            var go = new GameObject("Siedler");
            go.transform.SetParent(parent, false);
            var v = go.AddComponent<Villager>();
            v.Build();
            return v;
        }

        void Build()
        {
            if (Creatures.MatMaker == null) Creatures.MatMaker = (col, g) => MatLib.Lit(col, g);
            vis = new GameObject("Figur").transform;
            vis.SetParent(transform, false);
            // Fischer und Siedlerinnen in Ölzeug, Strickpulli oder Arbeitsjacke
            var look = HumanLook.Random();
            look.shirt = Random.value < 0.55f ? Coats[Random.Range(0, Coats.Length)] : Creatures.Hex(new[] { "#3d4a5c", "#6b5d4f", "#2f4a3a", "#7a2e2a", "#c8c2b4" }[Random.Range(0, 5)]);
            look.pants = Creatures.Hex(new[] { "#2b3140", "#3a3328", "#4a4f57", "#2d3b2f" }[Random.Range(0, 4)]);
            look.shoes = Creatures.Hex(new[] { "#1f1a16", "#2b2a28", "#3a2a1c" }[Random.Range(0, 3)]);
            look.boots = Random.value < 0.7f;
            float h = Random.value;
            if (h < 0.4f) { look.hat = "suedwester"; look.hatColor = Creatures.Hex("#e6b422"); }
            else if (h < 0.6f) { look.hat = "cap"; look.hatColor = Creatures.Hex(new[] { "#2a3550", "#5a3a2a", "#3d3d3d" }[Random.Range(0, 3)]); }
            else if (h < 0.7f && look.female) { look.hat = "scarf"; look.hatColor = Creatures.Hex(new[] { "#8a2f3c", "#3f5f7a", "#c9a227" }[Random.Range(0, 3)]); }
            figure = HumanFigure.Create(vis, look, look.height * 0.95f);
            speed = Random.Range(1.1f, 1.5f);
            phase = Random.value * 10f;
            transform.position = HubPoint();
            wait = Random.Range(0f, 2f);
        }

        public void SetSick(bool s)
        {
            if (s == sick) return;
            sick = s;
            figure.SetSick(s);
        }

        static Vector3 Polar(float angle, float radius) => new Vector3(Mathf.Sin(angle), 0, Mathf.Cos(angle)) * radius;
        static float SpokeAngle(int plot) => (plot - 1) * Mathf.PI * 2f / 12f;

        static Vector3 HubPoint() => Polar(Random.value * Mathf.PI * 2f, Random.Range(3f, 7.5f));

        void PlanRoute()
        {
            path.Clear();
            var c = Colony.I;
            if (spoke >= 0) path.Enqueue(Polar(SpokeAngle(spoke), 8f));

            int target = -1;
            if (c.Freeboard >= 0f && Random.value < 0.6f)
            {
                var built = new List<int>();
                for (int i = 1; i < Defs.Wall; i++) if (c.S.plots[i].type >= 0) built.Add(i);
                if (built.Count > 0) target = built[Random.Range(0, built.Count)];
            }

            if (target > 0)
            {
                float a = SpokeAngle(target);
                path.Enqueue(Polar(a, 8f));
                path.Enqueue(Polar(a, Random.Range(10f, 15.5f)) + Polar(a + Mathf.PI / 2f, Random.Range(-0.6f, 0.6f)));
                spoke = target;
            }
            else
            {
                path.Enqueue(HubPoint());
                spoke = -1;
            }
        }

        void Update()
        {
            float dt = Time.deltaTime;
            float deck = Colony.I.DeckHeight;
            var pos = transform.position;
            pos.y = deck;

            if (path.Count == 0)
            {
                wait -= dt;
                if (wait <= 0f) PlanRoute();
                transform.position = pos;
                return;
            }

            var target = path.Peek(); target.y = deck;
            var to = target - pos;
            float sp = speed * (sick ? 0.45f : 1f) * (Colony.I.Storm ? 0.7f : 1f);
            if (to.magnitude < 0.25f)
            {
                path.Dequeue();
                if (path.Count == 0) wait = Random.Range(1.5f, 5f);
                transform.position = pos;
                return;
            }
            var dir = to.normalized;
            pos += dir * sp * dt;
            // nicht durch den Leuchtturm laufen
            var flat = new Vector2(pos.x, pos.z);
            if (spoke < 0 && flat.magnitude < 2.3f && flat.sqrMagnitude > 0.0001f)
            {
                flat = flat.normalized * 2.3f;
                pos.x = flat.x; pos.z = flat.y;
            }
            transform.position = pos;
            transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(dir), dt * 8f);
        }
    }
}
