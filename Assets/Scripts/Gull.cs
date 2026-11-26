using System.Collections.Generic;
using UnityEngine;

namespace Pfahlstadt
{
    /// Möwen kreisen über der Stadt und schlagen mit den Flügeln.
    public class Gull : MonoBehaviour
    {
        Transform wingL, wingR;
        float radius, height, speed, angle, flap;

        public static void Create(Transform parent)
        {
            var go = new GameObject("Möwe");
            go.transform.SetParent(parent, false);
            go.AddComponent<Gull>().Build();
        }

        void Build()
        {
            var white = MatLib.Lit(new Color(0.95f, 0.95f, 0.95f), 0.2f);
            var grey = MatLib.Lit(new Color(0.55f, 0.58f, 0.62f), 0.2f);
            Visuals.Prim(PrimitiveType.Capsule, transform, Vector3.zero, new Vector3(0.25f, 0.4f, 0.25f), white, new Vector3(90, 0, 0));
            Visuals.Prim(PrimitiveType.Cube, transform, new Vector3(0, 0.05f, 0.45f), new Vector3(0.08f, 0.06f, 0.2f), MatLib.Lit(new Color(0.95f, 0.75f, 0.2f)));
            wingL = new GameObject("FlügelL").transform; wingL.SetParent(transform, false);
            wingR = new GameObject("FlügelR").transform; wingR.SetParent(transform, false);
            Visuals.Prim(PrimitiveType.Cube, wingL, new Vector3(-0.55f, 0, 0), new Vector3(1.1f, 0.04f, 0.35f), grey);
            Visuals.Prim(PrimitiveType.Cube, wingR, new Vector3(0.55f, 0, 0), new Vector3(1.1f, 0.04f, 0.35f), grey);
            radius = Random.Range(14f, 45f);
            height = Random.Range(14f, 26f);
            speed = Random.Range(0.15f, 0.3f) * (Random.value < 0.5f ? 1f : -1f);
            angle = Random.value * Mathf.PI * 2f;
            flap = Random.value * 10f;
        }

        void Update()
        {
            float stormBoost = Colony.I != null && Colony.I.Storm ? 1.8f : 1f;
            angle += speed * stormBoost * Time.deltaTime;
            var p = new Vector3(Mathf.Cos(angle) * radius, height + Mathf.Sin(angle * 3f) * 1.5f, Mathf.Sin(angle) * radius);
            var tangent = new Vector3(-Mathf.Sin(angle), 0, Mathf.Cos(angle)) * Mathf.Sign(speed);
            transform.position = p;
            transform.rotation = Quaternion.LookRotation(tangent) * Quaternion.Euler(0, 0, -20f * Mathf.Sign(speed));
            float w = Mathf.Sin((Time.time + flap) * 7f) * 28f;
            wingL.localRotation = Quaternion.Euler(0, 0, w);
            wingR.localRotation = Quaternion.Euler(0, 0, -w);
        }
    }
}
