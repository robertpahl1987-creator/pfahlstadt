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
        Renderer bodyR;
        Material coat, sickMat;
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
            vis = new GameObject("Figur").transform;
            vis.SetParent(transform, false);
            coat = MatLib.Lit(Coats[Random.Range(0, Coats.Length)], 0.3f);   // Ölzeug glänzt leicht
            sickMat = MatLib.Lit(new Color(0.45f, 0.58f, 0.42f), 0.1f);
            bodyR = Visuals.Prim(PrimitiveType.Capsule, vis, new Vector3(0, 0.55f, 0), new Vector3(0.55f, 0.55f, 0.55f), coat).GetComponent<Renderer>();
            Visuals.Prim(PrimitiveType.Sphere, vis, new Vector3(0, 1.25f, 0), Vector3.one * 0.38f, MatLib.Lit(new Color(0.9f, 0.72f, 0.6f)));
            // Südwester-Hut
            Visuals.Prim(PrimitiveType.Cylinder, vis, new Vector3(0, 1.42f, -0.04f), new Vector3(0.55f, 0.04f, 0.6f), MatLib.Lit(new Color(0.9f, 0.75f, 0.2f), 0.4f));
            Visuals.Prim(PrimitiveType.Sphere, vis, new Vector3(0, 1.48f, 0), new Vector3(0.36f, 0.2f, 0.36f), MatLib.Lit(new Color(0.9f, 0.75f, 0.2f), 0.4f));
            speed = Random.Range(1.5f, 2.1f);
            phase = Random.value * 10f;
            transform.position = HubPoint();
            wait = Random.Range(0f, 2f);
        }

        public void SetSick(bool s)
        {
            if (s == sick) return;
            sick = s;
            bodyR.sharedMaterial = s ? sickMat : coat;
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
                vis.localPosition = Vector3.zero;
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
            vis.localPosition = new Vector3(0, Mathf.Abs(Mathf.Sin((Time.time + phase) * 9f)) * 0.07f, 0);
        }
    }
}
