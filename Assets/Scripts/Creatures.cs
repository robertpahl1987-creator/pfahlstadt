using System;
using System.Collections.Generic;
using UnityEngine;

/// Menschen und Tiere mit echten Proportionen und Gelenken (Hüfte, Knie, Knöchel, Schulter, Ellbogen, Hals …).
/// Die Bewegungen werden jedes Bild aus einem Gangzyklus berechnet: Schritte passen zur Laufstrecke,
/// Arme schwingen gegengleich, Kopf und Körper federn mit. Dazu Atmen, Blinzeln, Umschauen,
/// bei Tieren Grasen und Kauen, Picken und Scharren, Schwanzwedeln und Flügelschlag.
/// Gemeinsame Datei für Pfahlstadt und Sonnenhof.
public static class Creatures
{
    /// Vom Spiel gesetzt: liefert ein Material in der Farbe (Glanz 0..1), passend zum Shader des Spiels.
    public static Func<Color, float, Material> MatMaker;

    static readonly Dictionary<string, Material> cache = new Dictionary<string, Material>();
    static readonly Dictionary<PrimitiveType, Mesh> meshes = new Dictionary<PrimitiveType, Mesh>();

    public static Material Mat(Color c, float gloss = 0.15f)
    {
        string k = ColorUtility.ToHtmlStringRGBA(c) + gloss.ToString("0.00");
        if (cache.TryGetValue(k, out var m) && m != null) return m;
        if (MatMaker != null) m = MatMaker(c, gloss);
        else { m = new Material(Shader.Find("Standard")) { color = c }; }
        m.enableInstancing = true;
        cache[k] = m;
        return m;
    }

    static Mesh MeshOf(PrimitiveType t)
    {
        if (meshes.TryGetValue(t, out var m) && m != null) return m;
        var go = GameObject.CreatePrimitive(t);
        m = go.GetComponent<MeshFilter>().sharedMesh;
        UnityEngine.Object.Destroy(go);
        meshes[t] = m;
        return m;
    }

    /// Sichtbares Teil ohne Kollider
    public static Transform Part(Transform parent, PrimitiveType t, Vector3 pos, Vector3 size, Material mat, Vector3 euler = default, bool shadow = true)
    {
        var go = new GameObject(t.ToString());
        go.transform.SetParent(parent, false);
        go.transform.localPosition = pos;
        go.transform.localEulerAngles = euler;
        go.transform.localScale = size;
        go.AddComponent<MeshFilter>().sharedMesh = MeshOf(t);
        var r = go.AddComponent<MeshRenderer>();
        r.sharedMaterial = mat;
        r.shadowCastingMode = shadow ? UnityEngine.Rendering.ShadowCastingMode.On : UnityEngine.Rendering.ShadowCastingMode.Off;
        r.receiveShadows = shadow;
        return go.transform;
    }

    /// Kugelform mit Halbachsen (rx, ry, rz)
    public static Transform Ell(Transform p, Vector3 pos, float rx, float ry, float rz, Material m, Vector3 euler = default, bool shadow = true)
        => Part(p, PrimitiveType.Sphere, pos, new Vector3(rx * 2, ry * 2, rz * 2), m, euler, shadow);

    /// Stab (Kapsel) von der Länge len mit Radius r, hängt vom Gelenk aus nach unten
    public static Transform Limb(Transform joint, float len, float r, Material m, bool shadow = true)
        => Part(joint, PrimitiveType.Capsule, new Vector3(0, -len / 2f, 0), new Vector3(r * 2, len / 2f, r * 2), m, default, shadow);

    public static Transform Joint(Transform parent, string name, Vector3 pos)
    {
        var t = new GameObject(name).transform;
        t.SetParent(parent, false);
        t.localPosition = pos;
        return t;
    }

    public static Color Hex(string h) { ColorUtility.TryParseHtmlString(h, out var c); return c; }
    public static float Rnd(float a, float b) => UnityEngine.Random.Range(a, b);

    // Hauttöne und Haarfarben aus der echten Welt
    public static readonly Color[] SkinTones =
    {
        Hex("#f3d2bd"), Hex("#eac0a2"), Hex("#e0ac88"), Hex("#c98e68"), Hex("#a8704a"), Hex("#8a5636"), Hex("#6b3f26"), Hex("#4d2c1b"),
    };
    public static readonly Color[] HairColors =
    {
        Hex("#1d1612"), Hex("#2e2119"), Hex("#4a3324"), Hex("#6e4c32"), Hex("#9a7048"), Hex("#c9a066"), Hex("#e3c891"), Hex("#8c3b1f"), Hex("#b8b2aa"), Hex("#e8e4de"),
    };
    public static readonly Color[] EyeColors = { Hex("#3b2414"), Hex("#5a3a1e"), Hex("#4a6b8a"), Hex("#5d7a4a"), Hex("#2a1a10") };
}

/// Aussehen eines Menschen
public class HumanLook
{
    public Color skin = Creatures.SkinTones[2], hair = Creatures.HairColors[2], eyes = Creatures.EyeColors[0];
    public Color shirt = Color.gray, pants = new Color(0.25f, 0.28f, 0.35f), shoes = new Color(0.18f, 0.13f, 0.1f);
    public Color hatColor = Color.white, apronColor = Color.white;
    public bool female, beard, longSleeves = true, skirt, apron, boots;
    public int hairStyle;          // 0 kurz, 1 lang, 2 Dutt, 3 Glatze/Haarkranz, 4 Pferdeschwanz
    public string hat = "";        // "", suedwester, cap, chef, scarf
    public float height = 1.75f;   // Körpergröße in Metern (vor dem Maßstab)
    public float build = 1f;       // Statur: 0.85 schlank … 1.2 kräftig

    public static HumanLook Random(bool? female = null)
    {
        var l = new HumanLook();
        l.female = female ?? UnityEngine.Random.value < 0.5f;
        l.skin = Creatures.SkinTones[UnityEngine.Random.Range(0, Creatures.SkinTones.Length)];
        l.hair = Creatures.HairColors[UnityEngine.Random.Range(0, Creatures.HairColors.Length)];
        l.eyes = Creatures.EyeColors[UnityEngine.Random.Range(0, Creatures.EyeColors.Length)];
        l.height = l.female ? Creatures.Rnd(1.58f, 1.76f) : Creatures.Rnd(1.68f, 1.92f);
        l.build = Creatures.Rnd(0.88f, 1.15f);
        l.hairStyle = l.female ? new[] { 1, 2, 4, 0 }[UnityEngine.Random.Range(0, 4)] : (UnityEngine.Random.value < 0.15f ? 3 : 0);
        l.beard = !l.female && UnityEngine.Random.value < 0.35f;
        return l;
    }
}

/// Mensch mit Gelenken und Gangzyklus. Bewegt der Besitzer das Objekt, laufen die Beine passend zur Strecke.
public class HumanFigure : MonoBehaviour
{
    HumanLook look;
    Transform model, hips, spine, chest, chestPart, neck, head, shL, shR, elL, elR, thL, thR, knL, knR, ftL, ftR, lidL, lidR;
    readonly List<Renderer> skinParts = new List<Renderer>();
    Material skinMat, paleMat;
    Vector3 last; bool hasLast;
    float phase, spd, hipBase, t0;
    float lookYaw, lookPitch, lookYawT, lookPitchT, nextLook, nextBlink, blinkEnd;
    public bool Sick;
    float sickK;

    /// height: Größe in Spieleinheiten (Welt), look: Aussehen
    public static HumanFigure Create(Transform parent, HumanLook look, float worldHeight)
    {
        var go = new GameObject("Mensch");
        go.transform.SetParent(parent, false);
        var h = go.AddComponent<HumanFigure>();
        h.Build(look, worldHeight);
        return h;
    }

    void Build(HumanLook L, float worldHeight)
    {
        look = L;
        model = Creatures.Joint(transform, "Körper", Vector3.zero);
        float k = L.height / 1.75f;                 // alle Maße unten gelten für 1,75 m
        model.localScale = Vector3.one * (worldHeight / 1.75f);
        float b = L.build, fw = L.female ? 0.92f : 1f;

        skinMat = Creatures.Mat(L.skin, 0.25f);
        paleMat = Creatures.Mat(Color.Lerp(L.skin, new Color(0.78f, 0.86f, 0.74f), 0.45f), 0.2f);
        var shirt = Creatures.Mat(L.shirt, 0.18f);
        var pants = Creatures.Mat(L.pants, 0.12f);
        var shoes = Creatures.Mat(L.shoes, 0.45f);
        var hair = Creatures.Mat(L.hair, 0.3f);
        var lips = Creatures.Mat(Color.Lerp(L.skin, new Color(0.7f, 0.3f, 0.3f), 0.35f), 0.4f);
        var white = Creatures.Mat(new Color(0.96f, 0.95f, 0.93f), 0.6f);
        var iris = Creatures.Mat(L.eyes, 0.7f);

        // ---- Becken und Beine ----
        hipBase = 0.95f * k;
        hips = Creatures.Joint(model, "Hüfte", new Vector3(0, hipBase, 0));
        Creatures.Ell(hips, new Vector3(0, 0.02f, 0), 0.17f * b * (L.female ? 1.08f : 1f), 0.11f, 0.11f * b, pants);
        float thigh = 0.44f * k, shin = 0.43f * k;
        thL = Leg(+1, thigh, shin, pants, shoes, skinMat, out knL, out ftL);
        thR = Leg(-1, thigh, shin, pants, shoes, skinMat, out knR, out ftR);
        if (L.skirt) Creatures.Ell(hips, new Vector3(0, -0.2f * k, 0), 0.22f * b, 0.27f * k, 0.18f * b, pants);
        if (L.apron) Creatures.Part(hips, PrimitiveType.Cube, new Vector3(0, -0.12f * k, 0.12f * b), new Vector3(0.3f * b, 0.5f * k, 0.015f), Creatures.Mat(L.apronColor, 0.1f));

        // ---- Rumpf ----
        spine = Creatures.Joint(hips, "Rücken", new Vector3(0, 0.06f * k, 0));
        Creatures.Ell(spine, new Vector3(0, 0.1f * k, 0), 0.15f * b * fw, 0.16f * k, 0.105f * b, shirt);
        chest = Creatures.Joint(spine, "Brust", new Vector3(0, 0.2f * k, 0));
        chestPart = Creatures.Ell(chest, new Vector3(0, 0.13f * k, 0), 0.19f * b * fw, 0.18f * k, 0.12f * b, shirt);
        if (L.apron) Creatures.Part(chest, PrimitiveType.Cube, new Vector3(0, 0.08f * k, 0.118f * b), new Vector3(0.22f * b, 0.25f * k, 0.012f), Creatures.Mat(L.apronColor, 0.1f));

        // ---- Hals und Kopf ----
        neck = Creatures.Joint(chest, "Hals", new Vector3(0, 0.27f * k, 0));
        Skin(Creatures.Part(neck, PrimitiveType.Cylinder, new Vector3(0, 0.04f * k, 0), new Vector3(0.1f, 0.05f * k, 0.105f), skinMat));
        head = Creatures.Joint(neck, "Kopf", new Vector3(0, 0.08f * k, 0.005f));
        var hc = new Vector3(0, 0.1f, 0.01f);                       // Kopfmitte
        Skin(Creatures.Ell(head, hc, 0.082f, 0.112f, 0.1f, skinMat));                  // Schädel
        Skin(Creatures.Ell(head, hc + new Vector3(0, -0.06f, 0.03f), 0.068f, 0.06f, 0.07f, skinMat));   // Kiefer und Kinn
        Skin(Creatures.Ell(head, hc + new Vector3(0, -0.005f, 0.098f), 0.016f, 0.026f, 0.022f, skinMat, new Vector3(-12, 0, 0), false)); // Nase
        Skin(Creatures.Ell(head, hc + new Vector3(0.083f, 0, -0.005f), 0.012f, 0.028f, 0.02f, skinMat, default, false));  // Ohren
        Skin(Creatures.Ell(head, hc + new Vector3(-0.083f, 0, -0.005f), 0.012f, 0.028f, 0.02f, skinMat, default, false));
        for (int s = -1; s <= 1; s += 2)
        {
            var e = hc + new Vector3(0.033f * s, 0.022f, 0.083f);
            Creatures.Ell(head, e, 0.016f, 0.011f, 0.01f, white, default, false);
            Creatures.Ell(head, e + new Vector3(0, 0, 0.006f), 0.0085f, 0.0085f, 0.006f, iris, default, false);
            var lid = Creatures.Joint(head, "Lid", e + new Vector3(0, 0.004f, 0.002f));
            Skin(Creatures.Ell(lid, Vector3.zero, 0.018f, 0.013f, 0.012f, skinMat, default, false));
            lid.localScale = new Vector3(1, 0.05f, 1);
            if (s < 0) lidL = lid; else lidR = lid;
            Creatures.Part(head, PrimitiveType.Cube, e + new Vector3(0, 0.022f, 0.004f), new Vector3(0.034f, 0.006f, 0.008f), hair, new Vector3(0, 0, -6f * s), false);  // Augenbrauen
        }
        Creatures.Ell(head, hc + new Vector3(0, -0.052f, 0.085f), 0.022f, 0.0065f, 0.008f, lips, default, false);   // Mund

        // Haare
        switch (L.hairStyle)
        {
            case 3: Creatures.Ell(head, hc + new Vector3(0, -0.005f, -0.03f), 0.086f, 0.065f, 0.08f, hair); break;
            default:
                Creatures.Ell(head, hc + new Vector3(0, 0.03f, -0.012f), 0.088f, 0.095f, 0.1f, hair);
                Creatures.Ell(head, hc + new Vector3(0, 0.06f, 0.035f), 0.08f, 0.05f, 0.07f, hair);   // Stirnansatz
                break;
        }
        if (L.hairStyle == 1) Creatures.Ell(head, hc + new Vector3(0, -0.09f, -0.06f), 0.085f, 0.13f, 0.05f, hair);
        if (L.hairStyle == 2) Creatures.Ell(head, hc + new Vector3(0, 0.07f, -0.09f), 0.042f, 0.042f, 0.042f, hair);
        if (L.hairStyle == 4) Creatures.Ell(head, hc + new Vector3(0, -0.04f, -0.115f), 0.028f, 0.08f, 0.028f, hair, new Vector3(-15, 0, 0));
        if (L.beard) Creatures.Ell(head, hc + new Vector3(0, -0.07f, 0.045f), 0.07f, 0.055f, 0.06f, hair);

        // Kopfbedeckung
        var hatM = Creatures.Mat(L.hatColor, 0.35f);
        switch (L.hat)
        {
            case "suedwester":
                Creatures.Part(head, PrimitiveType.Cylinder, hc + new Vector3(0, 0.07f, -0.015f), new Vector3(0.3f, 0.006f, 0.33f), hatM);
                Creatures.Ell(head, hc + new Vector3(0, 0.075f, -0.005f), 0.095f, 0.075f, 0.105f, hatM);
                break;
            case "cap":
                Creatures.Ell(head, hc + new Vector3(0, 0.065f, 0), 0.092f, 0.06f, 0.104f, hatM);
                Creatures.Part(head, PrimitiveType.Cube, hc + new Vector3(0, 0.05f, 0.12f), new Vector3(0.13f, 0.01f, 0.09f), hatM, new Vector3(-8, 0, 0));
                break;
            case "chef":
                Creatures.Part(head, PrimitiveType.Cylinder, hc + new Vector3(0, 0.12f, 0), new Vector3(0.19f, 0.06f, 0.2f), hatM);
                Creatures.Ell(head, hc + new Vector3(0, 0.2f, 0), 0.12f, 0.07f, 0.12f, hatM);
                break;
            case "scarf":
                Creatures.Ell(head, hc + new Vector3(0, 0.03f, -0.015f), 0.094f, 0.1f, 0.106f, hatM);
                Creatures.Ell(head, hc + new Vector3(0, -0.1f, -0.03f), 0.06f, 0.03f, 0.05f, hatM);
                break;
        }

        // ---- Arme ----
        float upper = 0.29f * k, fore = 0.26f * k;
        shL = Arm(+1, upper, fore, shirt, b * fw, out elL);
        shR = Arm(-1, upper, fore, shirt, b * fw, out elR);

        transform.localRotation = Quaternion.identity;
        phase = Creatures.Rnd(0f, 6.28f);
        t0 = Creatures.Rnd(0f, 100f);
        nextBlink = Time.time + Creatures.Rnd(1f, 4f);
        nextLook = Time.time + Creatures.Rnd(1f, 4f);
    }

    void Skin(Transform t) { var r = t.GetComponent<Renderer>(); if (r != null) skinParts.Add(r); }

    Transform Leg(int side, float thigh, float shin, Material pants, Material shoes, Material skin, out Transform knee, out Transform foot)
    {
        float w = look.build;
        var th = Creatures.Joint(hips, side > 0 ? "OberschenkelL" : "OberschenkelR", new Vector3(-0.095f * side * w, -0.03f, 0));
        Creatures.Limb(th, thigh, 0.072f * w, look.skirt ? skin : pants);
        knee = Creatures.Joint(th, "Knie", new Vector3(0, -thigh, 0));
        Creatures.Limb(knee, shin, 0.055f * w, look.skirt ? skin : pants);
        if (look.boots) Creatures.Part(knee, PrimitiveType.Cylinder, new Vector3(0, -shin * 0.72f, 0), new Vector3(0.125f * w, shin * 0.28f, 0.13f * w), shoes);
        foot = Creatures.Joint(knee, "Fuß", new Vector3(0, -shin, 0));
        Creatures.Ell(foot, new Vector3(0, -0.035f, 0.055f), 0.048f, 0.035f, 0.125f, shoes);
        return th;
    }

    Transform Arm(int side, float upper, float fore, Material shirt, float w, out Transform elbow)
    {
        var sh = Creatures.Joint(chest, side > 0 ? "SchulterL" : "SchulterR", new Vector3(-0.185f * side * w, 0.245f * (look.height / 1.75f), 0));
        Creatures.Ell(sh, new Vector3(0, -0.01f, 0), 0.062f * w, 0.06f, 0.06f * w, shirt);           // Schulterkappe
        Creatures.Limb(sh, upper, 0.047f * w, shirt);
        elbow = Creatures.Joint(sh, "Ellbogen", new Vector3(0, -upper, 0));
        var fm = look.longSleeves ? shirt : skinMat;
        var f = Creatures.Limb(elbow, fore, 0.04f * w, fm);
        if (!look.longSleeves) Skin(f);
        var wrist = Creatures.Joint(elbow, "Hand", new Vector3(0, -fore, 0));
        Skin(Creatures.Ell(wrist, new Vector3(0, -0.045f, 0.005f), 0.026f, 0.05f, 0.016f, skinMat, new Vector3(0, 0, 0)));
        Skin(Creatures.Ell(wrist, new Vector3(0.018f * side, -0.03f, 0.022f), 0.011f, 0.026f, 0.011f, skinMat, new Vector3(25, 0, 0), false));  // Daumen
        return sh;
    }

    public void SetSick(bool s)
    {
        if (s == Sick) return;
        Sick = s;
        foreach (var r in skinParts) if (r != null) r.sharedMaterial = s ? paleMat : skinMat;
    }

    void LateUpdate()
    {
        float dt = Mathf.Max(0.0001f, Time.deltaTime);
        var p = transform.position;
        float dist = 0f;
        if (hasLast) dist = new Vector2(p.x - last.x, p.z - last.z).magnitude;
        last = p; hasLast = true;
        if (dist > 2f) dist = 0f;                          // teleportiert, nicht gelaufen
        float scale = Mathf.Max(0.001f, model.lossyScale.y);   // Welteinheiten pro echtem Meter
        float v = dist / dt / scale;                       // Geschwindigkeit in "Metern" des Körpers
        spd = Mathf.Lerp(spd, v, 1f - Mathf.Exp(-8f * dt));
        float w = Mathf.Clamp01(spd / 0.5f);               // 0 = steht, 1 = geht
        float run = Mathf.Clamp01((spd - 2.2f) / 1.5f);    // ab ca. 2,5 m/s rennt er
        sickK = Mathf.MoveTowards(sickK, Sick ? 1f : 0f, dt);

        // Schrittlänge ~0,7 m, ein Zyklus = zwei Schritte
        phase += dist / scale / (1.45f + 0.6f * run) * Mathf.PI * 2f;
        float sn = Mathf.Sin(phase), cs = Mathf.Cos(phase);
        float amp = (28f + 14f * run) * (1f - 0.35f * sickK);

        // Beine
        float aL = -amp * sn * w, aR = amp * sn * w;
        float kL = w * (6f + (50f + 30f * run) * Mathf.Max(0f, cs)) + (1 - w) * 4f;
        float kR = w * (6f + (50f + 30f * run) * Mathf.Max(0f, -cs)) + (1 - w) * 4f;
        thL.localRotation = Quaternion.Euler(aL, 0, 2f);
        thR.localRotation = Quaternion.Euler(aR, 0, -2f);
        knL.localRotation = Quaternion.Euler(kL, 0, 0);
        knR.localRotation = Quaternion.Euler(kR, 0, 0);
        ftL.localRotation = Quaternion.Euler(-(aL + kL) * 0.9f + w * 12f * Mathf.Max(0, -sn), 0, 0);
        ftR.localRotation = Quaternion.Euler(-(aR + kR) * 0.9f + w * 12f * Mathf.Max(0, sn), 0, 0);

        // Becken: tiefer bei gespreizten Beinen, Gewicht verlagern im Stand
        float t = Time.time + t0;
        float bob = -w * (0.035f + 0.05f * run) * Mathf.Abs(sn) * hipBase / 0.95f;
        float shift = (1f - w) * 0.012f * Mathf.Sin(t * 0.45f);
        hips.localPosition = new Vector3(shift, hipBase + bob - 0.04f * sickK, 0);
        hips.localRotation = Quaternion.Euler(0, 7f * sn * w, 3f * cs * w + (1 - w) * 2f * Mathf.Sin(t * 0.45f));

        // Rumpf dreht gegen das Becken, lehnt sich beim Laufen leicht vor, gebückt wenn krank
        float lean = 3f * w + 10f * run + 22f * sickK;
        spine.localRotation = Quaternion.Euler(lean * 0.5f, -12f * sn * w, -2f * cs * w);
        chest.localRotation = Quaternion.Euler(lean * 0.5f, -4f * sn * w, 0);
        float breath = Mathf.Sin(t * (1.6f + 1.4f * w)) * (0.012f + 0.01f * run);
        chestPart.localScale = new Vector3(chestPart.localScale.x, chestPart.localScale.y, 0.24f * look.build * (1f + breath));

        // Arme schwingen gegengleich zu den Beinen
        float arm = (22f + 40f * run) * w * (1f - 0.7f * sickK);
        float idleSway = (1 - w) * 2f * Mathf.Sin(t * 0.8f);
        shL.localRotation = Quaternion.Euler(arm * sn + idleSway - 25f * sickK, 0, -7f - 3f * w);
        shR.localRotation = Quaternion.Euler(-arm * sn + idleSway - 25f * sickK, 0, 7f + 3f * w);
        elL.localRotation = Quaternion.Euler(-(10f + 25f * w * Mathf.Max(0, -sn) + 60f * run + 55f * sickK), 0, 0);
        elR.localRotation = Quaternion.Euler(-(10f + 25f * w * Mathf.Max(0, sn) + 60f * run + 55f * sickK), 0, 0);

        // Kopf: hält die Blickrichtung ruhig, schaut sich im Stehen um, blinzelt
        if (Time.time > nextLook)
        {
            nextLook = Time.time + Creatures.Rnd(1.5f, 5f);
            lookYawT = w > 0.5f ? Creatures.Rnd(-12f, 12f) : Creatures.Rnd(-50f, 50f);
            lookPitchT = Creatures.Rnd(-6f, 12f);
        }
        lookYaw = Mathf.Lerp(lookYaw, lookYawT, 1f - Mathf.Exp(-4f * dt));
        lookPitch = Mathf.Lerp(lookPitch, lookPitchT, 1f - Mathf.Exp(-4f * dt));
        neck.localRotation = Quaternion.Euler(lookPitch * 0.4f - lean * 0.5f, lookYaw * 0.4f + 8f * sn * w, 0);
        head.localRotation = Quaternion.Euler(lookPitch * 0.6f + 10f * sickK, lookYaw * 0.6f + 8f * sn * w, 0);

        if (Time.time > nextBlink) { blinkEnd = Time.time + 0.13f; nextBlink = Time.time + Creatures.Rnd(2f, 6f); }
        float lid = Time.time < blinkEnd ? 1f : (sickK * 0.45f + 0.05f);
        lidL.localScale = lidR.localScale = new Vector3(1, lid, 1);
    }
}

/// Kuh (Holstein), läuft gemächlich im Kreuzgang, grast, kaut, wedelt mit Schwanz und Ohren.
public class CowFigure : MonoBehaviour
{
    Transform model, body, neck, head, jaw, tail, tail2, earL, earR;
    readonly Transform[] up = new Transform[4], low = new Transform[4], hoof = new Transform[4];
    static readonly float[] Offs = { 0f, 0.5f, 0.75f, 0.25f };   // LV, RV, LH, RH: Kreuzgang
    Vector3 home, target; float radius, scale, phase, state, stateT, grazeK, earT, swishT;
    bool walking;

    public static CowFigure Create(Transform parent, Vector3 localPos, float length, float wanderRadius, int seed)
    {
        var go = new GameObject("Kuh");
        go.transform.SetParent(parent, false);
        go.transform.localPosition = localPos;
        go.transform.localRotation = Quaternion.Euler(0, Creatures.Rnd(0, 360), 0);
        var c = go.AddComponent<CowFigure>();
        c.home = localPos; c.radius = wanderRadius; c.scale = length / 2.4f;
        c.Build(seed);
        return c;
    }

    void Build(int seed)
    {
        var rnd = new System.Random(seed);
        model = Creatures.Joint(transform, "Körper", Vector3.zero);
        model.localScale = Vector3.one * scale;
        var white = Creatures.Mat(Creatures.Hex("#f4f1ea"), 0.25f);
        var black = Creatures.Mat(Creatures.Hex("#1e1b1a"), 0.3f);
        var pink = Creatures.Mat(Creatures.Hex("#e9a6a6"), 0.35f);
        var hornM = Creatures.Mat(Creatures.Hex("#e6dcc4"), 0.4f);
        var hoofM = Creatures.Mat(Creatures.Hex("#2b2421"), 0.5f);
        bool brown = rnd.NextDouble() < 0.3;
        var spot = brown ? Creatures.Mat(Creatures.Hex("#6b3c22"), 0.3f) : black;

        body = Creatures.Joint(model, "Rumpf", new Vector3(0, 1.05f, 0));
        Creatures.Ell(body, Vector3.zero, 0.38f, 0.4f, 0.95f, white);                         // Bauch und Rücken
        Creatures.Ell(body, new Vector3(0, 0.12f, 0.62f), 0.36f, 0.38f, 0.34f, white);        // Schultern
        Creatures.Ell(body, new Vector3(0, 0.14f, -0.7f), 0.36f, 0.3f, 0.32f, white);         // Becken
        Creatures.Ell(body, new Vector3(0, -0.12f, 0.05f), 0.36f, 0.32f, 0.68f, white);       // Bauch
        // Flecken auf beiden Seiten und dem Rücken
        for (int i = 0; i < 7; i++)
        {
            float z = (float)(rnd.NextDouble() * 1.6 - 0.8), y = (float)(rnd.NextDouble() * 0.4 - 0.1);
            float s = 0.15f + (float)rnd.NextDouble() * 0.17f;
            int side = rnd.NextDouble() < 0.5 ? 1 : -1;
            float x = side * Mathf.Sqrt(Mathf.Max(0.01f, 1f - (y * y) / (0.4f * 0.4f) - (z * z) / (0.95f * 0.95f))) * 0.38f;
            Creatures.Ell(body, new Vector3(x * 0.99f, y, z), 0.02f, s, s * 1.3f, spot, default, false);
        }
        Creatures.Ell(body, new Vector3(0, 0.4f, -0.2f), 0.22f, 0.02f, 0.3f, spot, default, false);
        // Euter
        Creatures.Ell(body, new Vector3(0, -0.43f, -0.55f), 0.16f, 0.12f, 0.16f, pink);
        for (int i = 0; i < 4; i++) Creatures.Part(body, PrimitiveType.Cylinder, new Vector3(i % 2 == 0 ? 0.06f : -0.06f, -0.56f, -0.55f + (i < 2 ? 0.06f : -0.06f)), new Vector3(0.03f, 0.04f, 0.03f), pink, default, false);

        // Hals und Kopf
        neck = Creatures.Joint(body, "Hals", new Vector3(0, 0.15f, 0.85f));
        Creatures.Ell(neck, new Vector3(0, 0.02f, 0.18f), 0.2f, 0.25f, 0.33f, white, new Vector3(-25, 0, 0));
        Creatures.Ell(neck, new Vector3(0, -0.2f, 0.15f), 0.08f, 0.2f, 0.25f, white);         // Wamme
        head = Creatures.Joint(neck, "Kopf", new Vector3(0, 0.12f, 0.45f));
        Creatures.Ell(head, new Vector3(0, 0.05f, 0.02f), 0.18f, 0.2f, 0.2f, brown ? spot : black);    // Stirn
        Creatures.Part(head, PrimitiveType.Capsule, new Vector3(0, -0.13f, 0.22f), new Vector3(0.26f, 0.18f, 0.24f), white, new Vector3(55, 0, 0));
        Creatures.Ell(head, new Vector3(0, -0.29f, 0.36f), 0.13f, 0.1f, 0.12f, pink);         // Maul
        jaw = Creatures.Joint(head, "Kiefer", new Vector3(0, -0.33f, 0.3f));
        Creatures.Ell(jaw, new Vector3(0, -0.02f, 0.03f), 0.1f, 0.05f, 0.1f, pink);
        Creatures.Ell(head, new Vector3(0.06f, -0.28f, 0.47f), 0.025f, 0.02f, 0.01f, black, default, false);   // Nüstern
        Creatures.Ell(head, new Vector3(-0.06f, -0.28f, 0.47f), 0.025f, 0.02f, 0.01f, black, default, false);
        for (int s = -1; s <= 1; s += 2)
        {
            Creatures.Ell(head, new Vector3(0.155f * s, 0.03f, 0.13f), 0.035f, 0.035f, 0.035f, black, default, false);   // Augen
            Creatures.Ell(head, new Vector3(0.165f * s, 0.035f, 0.15f), 0.012f, 0.012f, 0.008f, Creatures.Mat(Color.white, 0.9f), default, false);
            var ear = Creatures.Joint(head, "Ohr", new Vector3(0.17f * s, 0.12f, -0.02f));
            Creatures.Ell(ear, new Vector3(0.1f * s, 0, 0), 0.12f, 0.03f, 0.065f, brown ? spot : black);
            Creatures.Ell(ear, new Vector3(0.1f * s, -0.01f, 0.003f), 0.1f, 0.02f, 0.05f, pink, default, false);
            if (s < 0) earL = ear; else earR = ear;
            Creatures.Part(head, PrimitiveType.Capsule, new Vector3(0.13f * s, 0.24f, -0.02f), new Vector3(0.05f, 0.07f, 0.05f), hornM, new Vector3(0, 0, -55f * s), false);
        }

        // Beine: vorne links/rechts, hinten links/rechts
        Vector3[] at = { new Vector3(0.2f, 0.8f, 0.72f), new Vector3(-0.2f, 0.8f, 0.72f), new Vector3(0.2f, 0.84f, -0.72f), new Vector3(-0.2f, 0.84f, -0.72f) };
        for (int i = 0; i < 4; i++)
        {
            bool hind = i >= 2;
            up[i] = Creatures.Joint(model, "Bein", at[i]);
            Creatures.Ell(up[i], new Vector3(0, -0.08f, hind ? -0.04f : 0), 0.13f, hind ? 0.26f : 0.2f, hind ? 0.18f : 0.13f, white);
            Creatures.Limb(up[i], 0.4f, 0.075f, white);
            low[i] = Creatures.Joint(up[i], "Unterbein", new Vector3(0, -0.4f, 0));
            Creatures.Limb(low[i], 0.36f, 0.055f, white);
            hoof[i] = Creatures.Joint(low[i], "Huf", new Vector3(0, hind ? -0.38f : -0.36f, 0));
            Creatures.Part(hoof[i], PrimitiveType.Cube, new Vector3(0, -0.02f, 0.02f), new Vector3(0.12f, 0.08f, 0.15f), hoofM);
        }

        // Schwanz
        tail = Creatures.Joint(body, "Schwanz", new Vector3(0, 0.28f, -0.98f));
        Creatures.Part(tail, PrimitiveType.Cylinder, new Vector3(0, -0.3f, -0.02f), new Vector3(0.045f, 0.3f, 0.045f), white);
        tail2 = Creatures.Joint(tail, "Quaste", new Vector3(0, -0.6f, -0.02f));
        Creatures.Part(tail2, PrimitiveType.Cylinder, new Vector3(0, -0.06f, 0), new Vector3(0.035f, 0.06f, 0.035f), white);
        Creatures.Ell(tail2, new Vector3(0, -0.18f, 0), 0.05f, 0.1f, 0.05f, spot);

        phase = Creatures.Rnd(0, 1);
        stateT = Creatures.Rnd(2f, 6f);
        swishT = Creatures.Rnd(0, 10);
    }

    void Update()
    {
        float dt = Time.deltaTime;
        stateT -= dt;
        if (stateT <= 0)
        {
            walking = !walking && UnityEngine.Random.value < 0.45f;
            if (walking)
            {
                var r = UnityEngine.Random.insideUnitCircle * radius;
                target = home + new Vector3(r.x, 0, r.y);
                stateT = 12f;
            }
            else { stateT = Creatures.Rnd(5f, 14f); state = UnityEngine.Random.value < 0.7f ? 1 : 0; }   // 1 = grasen
        }

        float worldSpeed = 0.9f * scale;    // gemächliche 0,9 m/s
        float moved = 0f;
        if (walking)
        {
            var pos = transform.localPosition; var to = target - pos; to.y = 0;
            if (to.magnitude < 0.05f) { walking = false; stateT = Creatures.Rnd(4f, 10f); state = 1; }
            else
            {
                var dir = to.normalized;
                var want = Quaternion.LookRotation(dir);
                transform.localRotation = Quaternion.RotateTowards(transform.localRotation, want, 50f * dt);
                if (Quaternion.Angle(transform.localRotation, want) < 35f)
                {
                    moved = worldSpeed * dt;
                    transform.localPosition = pos + transform.localRotation * Vector3.forward * moved;
                }
            }
        }
        float w = walking ? 1f : 0f;
        phase += moved / scale / 1.8f;      // ein Gangzyklus ≈ 1,8 m

        for (int i = 0; i < 4; i++)
        {
            float a = (phase + Offs[i]) * Mathf.PI * 2f;
            float swing = 20f * Mathf.Sin(a) * w;
            float lift = Mathf.Max(0f, Mathf.Cos(a)) * w;
            bool hind = i >= 2;
            up[i].localRotation = Quaternion.Euler(-swing, 0, 0);
            float bend = hind ? 30f * lift : 45f * lift;
            low[i].localRotation = Quaternion.Euler(bend, 0, 0);
            hoof[i].localRotation = Quaternion.Euler(swing - bend * 0.7f, 0, 0);
        }
        float t = Time.time;
        body.localPosition = new Vector3(0, 1.05f + 0.02f * Mathf.Sin(phase * Mathf.PI * 4f) * w, 0);
        body.localRotation = Quaternion.Euler(0, 0, 2f * Mathf.Sin(phase * Mathf.PI * 2f) * w);

        grazeK = Mathf.MoveTowards(grazeK, !walking && state == 1 ? 1f : 0f, dt * 0.7f);
        float nod = 6f * Mathf.Sin(phase * Mathf.PI * 4f) * w;
        neck.localRotation = Quaternion.Euler(-5f + 55f * grazeK + nod, 8f * Mathf.Sin(t * 0.3f) * (1 - w), 0);
        head.localRotation = Quaternion.Euler(10f + 25f * grazeK, 0, 0);
        // Kauen (seitlich mahlend)
        float chew = (1 - w) * Mathf.Max(0f, Mathf.Sin(t * 5f));
        jaw.localRotation = Quaternion.Euler(8f * chew, 6f * Mathf.Sin(t * 2.5f) * (1 - w), 0);
        // Ohren zucken ab und zu
        earT -= dt;
        float flick = 0f;
        if (earT < 0) { earT = Creatures.Rnd(2f, 6f); }
        if (earT < 0.25f) flick = Mathf.Sin(earT / 0.25f * Mathf.PI) * 35f;
        earL.localRotation = Quaternion.Euler(0, 0, -15f + flick);
        earR.localRotation = Quaternion.Euler(0, 0, 15f);
        // Schwanz pendelt, schlägt ab und zu nach Fliegen
        swishT += dt;
        float swish = Mathf.Sin(swishT * 1.1f) * 8f + (Mathf.Sin(swishT * 0.37f) > 0.85f ? Mathf.Sin(swishT * 9f) * 35f : 0f);
        tail.localRotation = Quaternion.Euler(-12f - 4f * w, 0, swish);
        tail2.localRotation = Quaternion.Euler(0, 0, swish * 0.6f);
    }
}

/// Huhn: läuft mit dem typischen Kopfnicken, pickt, scharrt, schaut ruckartig umher und schlägt mal mit den Flügeln.
public class ChickenFigure : MonoBehaviour
{
    Transform model, body, neck, head, wingL, wingR, tail, legL, legR, footL, footR;
    Vector3 home, target; float radius, scale, phase, actT, peckT, flapT, headYaw, nextYaw;
    int act;   // 0 stehen, 1 laufen, 2 picken, 3 scharren
    int pecks;

    public static ChickenFigure Create(Transform parent, Vector3 localPos, float height, float wanderRadius, Color feather)
    {
        var go = new GameObject("Huhn");
        go.transform.SetParent(parent, false);
        go.transform.localPosition = localPos;
        go.transform.localRotation = Quaternion.Euler(0, Creatures.Rnd(0, 360), 0);
        var c = go.AddComponent<ChickenFigure>();
        c.home = localPos; c.radius = wanderRadius; c.scale = height / 0.45f;
        c.Build(feather);
        return c;
    }

    void Build(Color feather)
    {
        model = Creatures.Joint(transform, "Körper", Vector3.zero);
        model.localScale = Vector3.one * scale;
        var f = Creatures.Mat(feather, 0.3f);
        var fDark = Creatures.Mat(Color.Lerp(feather, Color.black, 0.25f), 0.35f);
        var red = Creatures.Mat(Creatures.Hex("#d3221d"), 0.4f);
        var yellow = Creatures.Mat(Creatures.Hex("#e7a92c"), 0.45f);
        var black = Creatures.Mat(Creatures.Hex("#111111"), 0.8f);

        legL = Leg(+1, yellow, f, out footL);
        legR = Leg(-1, yellow, f, out footR);
        body = Creatures.Joint(model, "Rumpf", new Vector3(0, 0.22f, 0));
        Creatures.Ell(body, Vector3.zero, 0.1f, 0.095f, 0.145f, f, new Vector3(-12, 0, 0));
        Creatures.Ell(body, new Vector3(0, 0.0f, 0.07f), 0.085f, 0.09f, 0.08f, f);              // Brust
        Creatures.Ell(body, new Vector3(0, -0.04f, -0.06f), 0.09f, 0.07f, 0.09f, f);             // Flaum hinten
        tail = Creatures.Joint(body, "Schwanz", new Vector3(0, 0.04f, -0.12f));
        for (int i = -2; i <= 2; i++)
            Creatures.Ell(tail, new Vector3(i * 0.012f, 0.06f, -0.02f), 0.012f, 0.075f, 0.04f, i == 0 ? fDark : f, new Vector3(-30, 0, i * 14f));
        wingL = Creatures.Joint(body, "FlügelL", new Vector3(0.088f, 0.02f, 0.02f));
        wingR = Creatures.Joint(body, "FlügelR", new Vector3(-0.088f, 0.02f, 0.02f));
        Creatures.Ell(wingL, new Vector3(0.008f, -0.01f, -0.04f), 0.022f, 0.06f, 0.1f, fDark, new Vector3(-10, 0, 0));
        Creatures.Ell(wingR, new Vector3(-0.008f, -0.01f, -0.04f), 0.022f, 0.06f, 0.1f, fDark, new Vector3(-10, 0, 0));

        neck = Creatures.Joint(body, "Hals", new Vector3(0, 0.06f, 0.1f));
        Creatures.Ell(neck, new Vector3(0, 0.045f, 0.01f), 0.045f, 0.065f, 0.045f, f, new Vector3(-15, 0, 0));
        head = Creatures.Joint(neck, "Kopf", new Vector3(0, 0.1f, 0.02f));
        Creatures.Ell(head, Vector3.zero, 0.038f, 0.04f, 0.045f, f);
        for (int i = 0; i < 4; i++) Creatures.Ell(head, new Vector3(0, 0.04f + (i == 1 || i == 2 ? 0.012f : 0f), 0.025f - i * 0.017f), 0.007f, 0.02f, 0.012f, red, default, false);   // Kamm
        Creatures.Ell(head, new Vector3(0, -0.045f, 0.035f), 0.01f, 0.018f, 0.01f, red, default, false);        // Kehllappen
        Creatures.Part(head, PrimitiveType.Capsule, new Vector3(0, -0.005f, 0.05f), new Vector3(0.016f, 0.017f, 0.016f), yellow, new Vector3(100, 0, 0), false);   // Schnabel
        for (int s = -1; s <= 1; s += 2)
        {
            Creatures.Ell(head, new Vector3(0.03f * s, -0.002f, 0.018f), 0.012f, 0.016f, 0.014f, red, default, false);  // rote Wange
            Creatures.Ell(head, new Vector3(0.033f * s, 0.008f, 0.02f), 0.007f, 0.007f, 0.006f, black, default, false);
        }
        phase = Creatures.Rnd(0, 6);
        actT = Creatures.Rnd(0.5f, 2f);
    }

    Transform Leg(int side, Material yellow, Material feather, out Transform foot)
    {
        var leg = Creatures.Joint(model, "Bein", new Vector3(0.04f * side, 0.17f, 0));
        Creatures.Ell(leg, new Vector3(0, 0.01f, 0), 0.035f, 0.045f, 0.04f, feather);            // Schenkel
        Creatures.Part(leg, PrimitiveType.Cylinder, new Vector3(0, -0.075f, 0), new Vector3(0.016f, 0.075f, 0.016f), yellow);
        foot = Creatures.Joint(leg, "Fuß", new Vector3(0, -0.165f, 0));
        for (int i = -1; i <= 1; i++) Creatures.Part(foot, PrimitiveType.Cube, new Vector3(i * 0.012f, 0.004f, 0.028f), new Vector3(0.009f, 0.008f, 0.06f), yellow, new Vector3(0, i * 28f, 0), false);
        Creatures.Part(foot, PrimitiveType.Cube, new Vector3(0, 0.004f, -0.015f), new Vector3(0.008f, 0.008f, 0.03f), yellow, default, false);
        return leg;
    }

    void Update()
    {
        float dt = Time.deltaTime, t = Time.time;
        actT -= dt;
        if (actT <= 0)
        {
            float r = UnityEngine.Random.value;
            if (r < 0.4f) { act = 1; var c = UnityEngine.Random.insideUnitCircle * radius; target = home + new Vector3(c.x, 0, c.y); actT = 6f; }
            else if (r < 0.75f) { act = 2; pecks = UnityEngine.Random.Range(2, 6); peckT = 0; actT = pecks * 0.45f + 0.3f; }
            else if (r < 0.88f) { act = 3; actT = 1.6f; }
            else { act = 0; actT = Creatures.Rnd(0.8f, 2.5f); }
            if (UnityEngine.Random.value < 0.06f) flapT = 0.7f;
        }

        float moved = 0f;
        if (act == 1)
        {
            var pos = transform.localPosition; var to = target - pos; to.y = 0;
            if (to.magnitude < 0.02f) { act = 0; actT = Creatures.Rnd(0.5f, 1.5f); }
            else
            {
                var want = Quaternion.LookRotation(to.normalized);
                transform.localRotation = Quaternion.RotateTowards(transform.localRotation, want, 300f * dt);
                moved = Mathf.Min(to.magnitude, 0.45f * scale * dt);
                transform.localPosition = pos + transform.localRotation * Vector3.forward * moved;
            }
        }
        float w = act == 1 ? 1f : 0f;
        phase += moved / scale / 0.16f * Mathf.PI;          // kurze, schnelle Schritte
        float sn = Mathf.Sin(phase);
        legL.localRotation = Quaternion.Euler(-30f * sn * w, 0, 0);
        legR.localRotation = Quaternion.Euler(30f * sn * w, 0, 0);
        footL.localRotation = Quaternion.Euler(30f * sn * w + 25f * Mathf.Max(0, -sn) * w, 0, 0);
        footR.localRotation = Quaternion.Euler(-30f * sn * w + 25f * Mathf.Max(0, sn) * w, 0, 0);
        // Scharren: ein Bein kratzt nach hinten
        if (act == 3)
        {
            float k = Mathf.Sin(t * 14f);
            (Mathf.Sin(t * 1.9f) > 0 ? legL : legR).localRotation = Quaternion.Euler(20f + 35f * Mathf.Max(0, k), 0, 0);
        }
        body.localPosition = new Vector3(0, 0.22f + 0.012f * Mathf.Abs(sn) * w, 0);
        body.localRotation = Quaternion.Euler(act == 3 ? 15f : 0f, 0, 4f * sn * w);

        // Kopf: beim Laufen bleibt er stehen und schnellt dann vor (Kopfnicken), beim Picken geht er zum Boden
        float bob = w * (((phase / Mathf.PI) % 1f) - 0.5f) * -0.045f;
        float peck = 0f;
        if (act == 2)
        {
            peckT += dt;
            float c = peckT % 0.45f;
            peck = c < 0.12f ? c / 0.12f : c < 0.2f ? 1f : Mathf.Max(0f, 1f - (c - 0.2f) / 0.15f);
        }
        if (t > nextYaw && w < 0.5f && act != 2) { headYaw = Creatures.Rnd(-60f, 60f); nextYaw = t + Creatures.Rnd(0.3f, 1.2f); }   // ruckartig
        if (w > 0.5f) headYaw = 0;
        neck.localPosition = new Vector3(0, 0.06f, 0.1f + bob);
        neck.localRotation = Quaternion.Euler(-10f + 95f * peck, headYaw * 0.4f, 0);
        head.localRotation = Quaternion.Euler(-10f * peck, headYaw * 0.6f, Mathf.Abs(headYaw) > 30 ? 12f : 0f);

        // Flügel: angelegt, gelegentlich kräftiges Schlagen
        float flap = 0f;
        if (flapT > 0) { flapT -= dt; flap = Mathf.Abs(Mathf.Sin(flapT * 28f)) * 70f; }
        wingL.localRotation = Quaternion.Euler(0, 0, flap);
        wingR.localRotation = Quaternion.Euler(0, 0, -flap);
        tail.localRotation = Quaternion.Euler(5f * Mathf.Sin(t * 2f) - 6f * w, 0, 0);
    }
}

/// Vogel-Körper einer Silbermöwe mit zweigliedrigen Flügeln (Arm- und Handschwingen) und schwarzen Spitzen.
public class GullBody
{
    public Transform innerL, innerR, outerL, outerR, tail;

    public static GullBody Build(Transform root)
    {
        var g = new GullBody();
        var white = Creatures.Mat(new Color(0.97f, 0.97f, 0.96f), 0.25f);
        var grey = Creatures.Mat(Creatures.Hex("#9aa4ae"), 0.25f);
        var black = Creatures.Mat(Creatures.Hex("#16181a"), 0.3f);
        var yellow = Creatures.Mat(Creatures.Hex("#f0c537"), 0.5f);
        var red = Creatures.Mat(Creatures.Hex("#d63a2c"), 0.5f);
        var pinkLeg = Creatures.Mat(Creatures.Hex("#e2b2a0"), 0.3f);
        Creatures.Ell(root, Vector3.zero, 0.1f, 0.095f, 0.24f, white);                          // Rumpf
        Creatures.Ell(root, new Vector3(0, 0.07f, 0.2f), 0.068f, 0.068f, 0.08f, white);          // Kopf
        Creatures.Part(root, PrimitiveType.Capsule, new Vector3(0, 0.06f, 0.3f), new Vector3(0.025f, 0.05f, 0.03f), yellow, new Vector3(95, 0, 0), false);
        Creatures.Ell(root, new Vector3(0, 0.045f, 0.33f), 0.012f, 0.012f, 0.012f, red, default, false);   // roter Fleck
        Creatures.Ell(root, new Vector3(0.05f, 0.09f, 0.24f), 0.01f, 0.01f, 0.01f, black, default, false);
        Creatures.Ell(root, new Vector3(-0.05f, 0.09f, 0.24f), 0.01f, 0.01f, 0.01f, black, default, false);
        g.tail = Creatures.Joint(root, "Schwanz", new Vector3(0, 0.01f, -0.2f));
        Creatures.Ell(g.tail, new Vector3(0, 0, -0.08f), 0.07f, 0.012f, 0.09f, white);
        Creatures.Ell(root, new Vector3(0.03f, -0.08f, -0.08f), 0.012f, 0.012f, 0.05f, pinkLeg, default, false);   // angelegte Beine
        Creatures.Ell(root, new Vector3(-0.03f, -0.08f, -0.08f), 0.012f, 0.012f, 0.05f, pinkLeg, default, false);
        for (int s = -1; s <= 1; s += 2)
        {
            var inner = Creatures.Joint(root, "Arm", new Vector3(0.07f * s, 0.04f, 0.04f));
            Creatures.Ell(inner, new Vector3(0.17f * s, 0, -0.03f), 0.18f, 0.016f, 0.1f, grey);
            var outer = Creatures.Joint(inner, "Hand", new Vector3(0.34f * s, 0, 0));
            Creatures.Ell(outer, new Vector3(0.16f * s, 0, -0.05f), 0.17f, 0.012f, 0.075f, grey, new Vector3(0, 12f * s, 0));
            Creatures.Ell(outer, new Vector3(0.3f * s, 0, -0.09f), 0.07f, 0.01f, 0.045f, black, new Vector3(0, 20f * s, 0));
            if (s < 0) { g.innerR = inner; g.outerR = outer; } else { g.innerL = inner; g.outerL = outer; }
        }
        return g;
    }

    /// flap: 0 = gleiten, 1 = kräftig schlagen; t: Zeit
    public void Animate(float t, float flap)
    {
        float a = Mathf.Sin(t * 7.5f);
        float inner = 8f + flap * 32f * a;                       // Armflügel
        float outer = 4f + flap * 28f * Mathf.Sin(t * 7.5f - 0.7f);  // Handflügel folgen verzögert
        innerL.localRotation = Quaternion.Euler(0, 0, inner);
        innerR.localRotation = Quaternion.Euler(0, 0, -inner);
        outerL.localRotation = Quaternion.Euler(0, 0, outer);
        outerR.localRotation = Quaternion.Euler(0, 0, -outer);
        tail.localRotation = Quaternion.Euler(2f * Mathf.Sin(t * 1.3f), 0, 0);
    }
}
