using System.Collections.Generic;
using UnityEngine;

namespace Pfahlstadt
{
    /// Möwen kreisen über der Stadt und schlagen mit den Flügeln.
    public class Gull : MonoBehaviour
    {
        GullBody bird;
        float flapK, nextSwitch; bool flapping;
        float radius, height, speed, angle, flap;

        public static void Create(Transform parent)
        {
            var go = new GameObject("Möwe");
            go.transform.SetParent(parent, false);
            go.AddComponent<Gull>().Build();
        }

        void Build()
        {
            if (Creatures.MatMaker == null) Creatures.MatMaker = (col, g) => MatLib.Lit(col, g);
            var model = new GameObject("Möwenkörper").transform;
            model.SetParent(transform, false);
            model.localScale = Vector3.one * 1.6f;     // von weit oben noch gut zu sehen
            bird = GullBody.Build(model);
            radius = Random.Range(14f, 45f);
            height = Random.Range(14f, 26f);
            speed = Random.Range(0.15f, 0.3f) * (Random.value < 0.5f ? 1f : -1f);
            angle = Random.value * Mathf.PI * 2f;
            flap = Random.value * 10f;
            nextSwitch = Random.Range(1f, 4f);
        }

        void Update()
        {
            float stormBoost = Colony.I != null && Colony.I.Storm ? 1.8f : 1f;
            angle += speed * stormBoost * Time.deltaTime;
            var p = new Vector3(Mathf.Cos(angle) * radius, height + Mathf.Sin(angle * 3f) * 1.5f, Mathf.Sin(angle) * radius);
            var tangent = new Vector3(-Mathf.Sin(angle), 0, Mathf.Cos(angle)) * Mathf.Sign(speed);
            transform.position = p;
            transform.rotation = Quaternion.LookRotation(tangent) * Quaternion.Euler(0, 0, -20f * Mathf.Sign(speed));
            // Möwen wechseln zwischen kräftigen Flügelschlägen und langem Segeln
            nextSwitch -= Time.deltaTime;
            if (nextSwitch <= 0f) { flapping = !flapping; nextSwitch = flapping ? Random.Range(1f, 2.5f) : Random.Range(2f, 6f) / stormBoost; }
            flapK = Mathf.MoveTowards(flapK, flapping ? 1f : 0f, Time.deltaTime * 3f);
            bird.Animate(Time.time + flap, flapK);
        }
    }
}
