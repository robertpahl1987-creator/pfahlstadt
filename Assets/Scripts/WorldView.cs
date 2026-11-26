using System.Collections.Generic;
using UnityEngine;

namespace Pfahlstadt
{
    /// Baut und animiert die 3D-Welt: Watt, Wasser, Pfahlplattformen, Gebäude, Wetter, Licht.
    public class WorldView : MonoBehaviour
    {
        public static WorldView I { get; private set; }
        public const float RingRadius = 20f;
        const int MaxVillagers = 30;

        readonly Transform[] plotRoots = new Transform[Colony.PlotCount];
        readonly GameObject[] visuals = new GameObject[Colony.PlotCount];
        readonly GameObject[] scaffolds = new GameObject[Colony.PlotCount];
        readonly Transform[] ghosts = new Transform[Colony.PlotCount];
        readonly int[] shownType = new int[Colony.PlotCount];
        readonly int[] shownLevel = new int[Colony.PlotCount];
        readonly bool[] shownBuilding = new bool[Colony.PlotCount];
        readonly List<Villager> villagers = new List<Villager>();
        readonly List<Transform> buoys = new List<Transform>();

        Transform envRoot, infraRoot, villagerRoot, selRoot, water, waterMark;
        Light sun, lamp;
        Transform beam;
        Material lampMat, sky, selMat;
        ParticleSystem rain;
        float shownDeck = -1f, stormBlend;

        public static Vector3 PlotPos(int i)
        {
            if (i == 0) return Vector3.zero;
            float a = (i - 1) * Mathf.PI * 2f / 12f;
            return new Vector3(Mathf.Sin(a), 0, Mathf.Cos(a)) * RingRadius;
        }

        public static Vector3 LabelPos(int i)
        {
            float deck = Colony.I != null ? Colony.I.DeckHeight : 3f;
            return PlotPos(i) + Vector3.up * (deck + (i == 0 ? 16f : 6.5f));
        }

        void Awake() { I = this; }

        void Start()
        {
            for (int i = 0; i < Colony.PlotCount; i++) shownType[i] = -99;
            BuildEnvironment();
            BuildPlotRoots();
            GraphicsQuality.I.OnChanged += ApplyQuality;
            ApplyQuality();
        }

        void OnDestroy()
        {
            if (GraphicsQuality.I != null) GraphicsQuality.I.OnChanged -= ApplyQuality;
        }

        // ---------------- Aufbau ----------------

        void BuildEnvironment()
        {
            var rng = new System.Random(4711);
            float R(float a, float b) => a + (float)rng.NextDouble() * (b - a);

            envRoot = new GameObject("Umgebung").transform;

            // Licht
            var sg = new GameObject("Sonne");
            sun = sg.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.shadows = LightShadows.Soft;
            sun.shadowStrength = 0.75f;
            RenderSettings.sun = sun;

            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogDensity = 0.006f;
            sky = MatLib.Sky();
            if (sky != null)
            {
                if (sky.HasProperty("_SunSize")) sky.SetFloat("_SunSize", 0.035f);
                if (sky.HasProperty("_AtmosphereThickness")) sky.SetFloat("_AtmosphereThickness", 1.1f);
                if (sky.HasProperty("_SkyTint")) sky.SetColor("_SkyTint", new Color(0.55f, 0.62f, 0.7f));
                if (sky.HasProperty("_GroundColor")) sky.SetColor("_GroundColor", new Color(0.35f, 0.4f, 0.42f));
                RenderSettings.skybox = sky;
            }

            // Wattboden
            Visuals.Prim(PrimitiveType.Plane, envRoot, Vector3.zero, new Vector3(70, 1, 70), MatLib.Lit(Visuals.WetSand, 0.55f));

            // Sandbänke (tauchen bei Ebbe auf)
            var sand = MatLib.Lit(Visuals.Sand, 0.25f);
            for (int i = 0; i < 34; i++)
            {
                float a = R(0, Mathf.PI * 2f), d = R(36f, 210f);
                Visuals.Prim(PrimitiveType.Sphere, envRoot, new Vector3(Mathf.Sin(a) * d, -0.35f, Mathf.Cos(a) * d),
                    new Vector3(R(18, 55), R(1.6f, 2.8f), R(12, 36)), sand, new Vector3(0, R(0, 180), 0));
            }

            // Dünen-Inseln am Horizont mit Strandhafer
            var grass = MatLib.Lit(new Color(0.55f, 0.58f, 0.32f), 0.05f);
            for (int i = 0; i < 7; i++)
            {
                float a = i / 7f * Mathf.PI * 2f + R(-0.2f, 0.2f), d = R(230f, 300f);
                var c = new Vector3(Mathf.Sin(a) * d, 0, Mathf.Cos(a) * d);
                Visuals.Prim(PrimitiveType.Sphere, envRoot, c, new Vector3(R(70, 120), R(16, 26), R(35, 60)), sand, new Vector3(0, a * Mathf.Rad2Deg, 0));
                for (int k = 0; k < 10; k++)
                    Visuals.MeshObj(Visuals.Cone, envRoot, c + new Vector3(R(-25, 25), R(6, 9), R(-12, 12)), new Vector3(R(5, 9), R(3, 6), R(5, 9)), grass);
            }

            // Pricken: Birkenstangen markieren eine Fahrrinne
            var prick = MatLib.Lit(new Color(0.35f, 0.3f, 0.25f));
            for (int side = -1; side <= 1; side += 2)
                for (int i = 0; i < 16; i++)
                {
                    var p = new Vector3(side * (6f + i * 0.6f) + 40f, 0, -40f - i * 11f);
                    Visuals.Prim(PrimitiveType.Cylinder, envRoot, p + Vector3.up * 2f, new Vector3(0.12f, 2f, 0.12f), prick);
                    Visuals.Prim(PrimitiveType.Sphere, envRoot, p + Vector3.up * 4.1f, new Vector3(0.6f, 0.8f, 0.6f), prick);
                }

            // altes Wrack
            var hull = MatLib.Lit(new Color(0.22f, 0.17f, 0.13f), 0.15f);
            var wreck = new GameObject("Wrack").transform;
            wreck.SetParent(envRoot, false);
            wreck.localPosition = new Vector3(-70f, 0, -55f);
            wreck.localRotation = Quaternion.Euler(0, 35, 12);
            Visuals.Prim(PrimitiveType.Cube, wreck, new Vector3(0, 0.6f, 0), new Vector3(5f, 1.4f, 18f), hull);
            for (int i = 0; i < 7; i++)
            {
                float z = -7f + i * 2.3f;
                Visuals.Prim(PrimitiveType.Cube, wreck, new Vector3(-2.6f, 2.2f, z), new Vector3(0.35f, 3.2f, 0.35f), hull, new Vector3(0, 0, -12));
                Visuals.Prim(PrimitiveType.Cube, wreck, new Vector3(2.6f, 2.0f, z), new Vector3(0.35f, 2.6f + (i % 3) * 0.6f, 0.35f), hull, new Vector3(0, 0, 12));
            }
            Visuals.Prim(PrimitiveType.Cylinder, wreck, new Vector3(0, 4.5f, 2f), new Vector3(0.5f, 4.5f, 0.5f), hull, new Vector3(18, 0, 0));

            StaticBatchingUtility.Combine(envRoot.gameObject);

            // Bojen (bewegen sich mit dem Wasser, deshalb nicht statisch)
            var buoyRoot = new GameObject("Bojen").transform;
            for (int i = 0; i < 8; i++)
            {
                float a = R(0, Mathf.PI * 2f), d = R(32f, 70f);
                var b = new GameObject("Boje").transform;
                b.SetParent(buoyRoot, false);
                b.position = new Vector3(Mathf.Sin(a) * d, 0, Mathf.Cos(a) * d);
                var col = i % 2 == 0 ? new Color(0.8f, 0.15f, 0.12f) : new Color(0.15f, 0.55f, 0.25f);
                Visuals.Prim(PrimitiveType.Cylinder, b, new Vector3(0, 0.3f, 0), new Vector3(0.9f, 0.5f, 0.9f), MatLib.Lit(col, 0.4f));
                Visuals.MeshObj(Visuals.Cone, b, new Vector3(0, 0.8f, 0), new Vector3(0.8f, 1.1f, 0.8f), MatLib.Lit(col, 0.4f));
                Visuals.Prim(PrimitiveType.Sphere, b, new Vector3(0, 2f, 0), Vector3.one * 0.25f, MatLib.Glow(new Color(1f, 0.9f, 0.6f), 2f));
                buoys.Add(b);
            }

            // Wasser
            water = Visuals.Prim(PrimitiveType.Plane, null, Vector3.zero, new Vector3(70, 1, 70), MatLib.Water(new Color(0.2f, 0.38f, 0.43f, 0.78f))).transform;
            water.name = "Wasser";
            water.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;

            // Regen
            rain = Visuals.NewPS("Regen", null, Vector3.zero, MatLib.Particle(false));
            rain.transform.rotation = Quaternion.Euler(90, 0, 0);   // Box emittiert nach unten
            var m = rain.main;
            m.startLifetime = 1.6f;
            m.startSpeed = 18f;
            m.startSize = new ParticleSystem.MinMaxCurve(0.05f, 0.09f);
            m.startColor = new Color(0.75f, 0.82f, 0.9f, 0.55f);
            m.maxParticles = 5000;
            var sh = rain.shape; sh.shapeType = ParticleSystemShapeType.Box; sh.scale = new Vector3(90f, 90f, 1f);
            var vol = rain.velocityOverLifetime; vol.enabled = true; vol.space = ParticleSystemSimulationSpace.World;
            vol.x = new ParticleSystem.MinMaxCurve(0f); vol.y = new ParticleSystem.MinMaxCurve(0f); vol.z = new ParticleSystem.MinMaxCurve(0f);
            var rr = rain.GetComponent<ParticleSystemRenderer>();
            rr.renderMode = ParticleSystemRenderMode.Stretch;
            rr.velocityScale = 0.06f;
            rr.lengthScale = 1f;
            rain.Play();

            // Möwen
            var gulls = new GameObject("Möwen").transform;
            for (int i = 0; i < 7; i++) Gull.Create(gulls);

            villagerRoot = new GameObject("Siedler").transform;

            // Auswahlrahmen
            selRoot = new GameObject("Auswahl").transform;
            selMat = new Material(MatLib.Glow(new Color(0.3f, 0.85f, 1f), 2f));
            for (int i = 0; i < 4; i++)
            {
                var bar = Visuals.Prim(PrimitiveType.Cube, selRoot, Vector3.zero, Vector3.one, selMat);
                bar.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }
        }

        void BuildPlotRoots()
        {
            for (int i = 0; i < Colony.PlotCount; i++)
            {
                var go = new GameObject(i == 0 ? "Platz 0 (Turm)" : $"Platz {i}");
                var p = PlotPos(i);
                go.transform.position = p;
                if (i > 0) go.transform.rotation = Quaternion.LookRotation(-p.normalized);   // Front (+z) zur Mitte
                var col = go.AddComponent<BoxCollider>();
                col.size = i == 0 ? new Vector3(10f, 16f, 10f) : new Vector3(8f, 6f, 8f);
                col.center = new Vector3(0, i == 0 ? 7f : 2.5f, 0);
                go.AddComponent<PlotMarker>().Index = i;
                plotRoots[i] = go.transform;
            }
        }

        /// Plattformen, Pfähle, Stege und Pegel – wird neu gebaut, wenn der Turm die Stadt anhebt.
        void BuildInfra(float deck)
        {
            if (infraRoot != null) Destroy(infraRoot.gameObject);
            infraRoot = new GameObject("Pfahlwerk").transform;
            var plank = MatLib.Lit(Visuals.Plank, 0.2f);
            var post = MatLib.Lit(Visuals.Tar, 0.35f);
            var algae = MatLib.Lit(new Color(0.18f, 0.28f, 0.2f), 0.6f);
            float postLen = deck + 1f;
            float postY = (deck - 1f) / 2f;

            // Mittelplattform auf Steinsockel
            Visuals.Prim(PrimitiveType.Cylinder, infraRoot, new Vector3(0, deck - 0.15f, 0), new Vector3(19f, 0.15f, 19f), plank);
            Visuals.Prim(PrimitiveType.Cylinder, infraRoot, new Vector3(0, (deck - 1.05f) / 2f, 0), new Vector3(7f, (deck + 0.95f) / 2f, 7f), MatLib.Lit(new Color(0.38f, 0.38f, 0.4f), 0.2f));
            for (int i = 0; i < 18; i++)
            {
                float a = i * Mathf.PI * 2f / 18f;
                var p = new Vector3(Mathf.Sin(a), 0, Mathf.Cos(a)) * 8.8f;
                Visuals.Prim(PrimitiveType.Cylinder, infraRoot, p + Vector3.up * postY, new Vector3(0.5f, postLen / 2f, 0.5f), post);
                Visuals.Prim(PrimitiveType.Cylinder, infraRoot, p + Vector3.up * 0.4f, new Vector3(0.56f, 0.6f, 0.56f), algae);
                // Geländer-Pfosten
                if (i % 3 != 0) Visuals.Prim(PrimitiveType.Cube, infraRoot, p * 1.05f + Vector3.up * (deck + 0.5f), new Vector3(0.12f, 1f, 0.12f), post);
            }

            // Bauplätze mit Stegen
            for (int i = 1; i < Colony.PlotCount; i++)
            {
                var root = new GameObject("Plattform").transform;
                root.SetParent(infraRoot, false);
                root.position = PlotPos(i);
                root.rotation = plotRoots[i].rotation;
                Visuals.Prim(PrimitiveType.Cube, root, new Vector3(0, deck - 0.15f, 0), new Vector3(8f, 0.3f, 8f), plank);
                for (int k = 0; k < 9; k++)
                {
                    var lp = new Vector3((k % 3 - 1) * 3.6f, 0, (k / 3 - 1) * 3.6f);
                    Visuals.Prim(PrimitiveType.Cylinder, root, lp + Vector3.up * postY, new Vector3(0.42f, postLen / 2f, 0.42f), post);
                    Visuals.Prim(PrimitiveType.Cylinder, root, lp + Vector3.up * 0.4f, new Vector3(0.48f, 0.6f, 0.48f), algae);
                }
                // Steg vom Bauplatz zur Mitte (lokal +z)
                Visuals.Prim(PrimitiveType.Cube, root, new Vector3(0, deck - 0.1f, 7.5f), new Vector3(2.2f, 0.2f, 7.2f), plank);
                for (int k = 0; k < 2; k++)
                {
                    float z = 6f + k * 3f;
                    Visuals.Prim(PrimitiveType.Cylinder, root, new Vector3(-1f, postY, z), new Vector3(0.3f, postLen / 2f, 0.3f), post);
                    Visuals.Prim(PrimitiveType.Cylinder, root, new Vector3(1f, postY, z), new Vector3(0.3f, postLen / 2f, 0.3f), post);
                }
                Visuals.Prim(PrimitiveType.Cube, root, new Vector3(-1.1f, deck + 0.55f, 7.5f), new Vector3(0.08f, 0.08f, 7.2f), post);
                Visuals.Prim(PrimitiveType.Cube, root, new Vector3(1.1f, deck + 0.55f, 7.5f), new Vector3(0.08f, 0.08f, 7.2f), post);
            }

            // Pegel-Latte mit Markierung der Deckhöhe
            float pa = 15f * Mathf.Deg2Rad;
            var pegel = new Vector3(Mathf.Sin(pa), 0, Mathf.Cos(pa)) * 9.8f;
            for (int k = 0; k < 10; k++)
                Visuals.Prim(PrimitiveType.Cube, infraRoot, pegel + Vector3.up * (k + 0.5f), new Vector3(0.35f, 1f, 0.12f),
                    MatLib.Lit(k % 2 == 0 ? new Color(0.95f, 0.95f, 0.92f) : new Color(0.1f, 0.1f, 0.12f), 0.3f));
            Visuals.Prim(PrimitiveType.Cube, infraRoot, pegel + Vector3.up * deck, new Vector3(0.6f, 0.08f, 0.2f), MatLib.Glow(new Color(1f, 0.25f, 0.2f), 2f));

            StaticBatchingUtility.Combine(infraRoot.gameObject);

            for (int i = 0; i < Colony.PlotCount; i++)
            {
                var p = PlotPos(i); p.y = deck;
                plotRoots[i].position = p;
            }
            shownDeck = deck;
        }

        // ---------------- Aktualisierung ----------------

        void Update()
        {
            var c = Colony.I;
            if (c == null || c.S == null) return;

            if (!Mathf.Approximately(c.DeckHeight, shownDeck)) BuildInfra(c.DeckHeight);

            for (int i = 0; i < Colony.PlotCount; i++)
            {
                var p = c.S.plots[i];
                bool building = p.buildLeft > 0f;
                if (p.type != shownType[i] || p.level != shownLevel[i] || building != shownBuilding[i]) RefreshPlot(i);
                if (building && ghosts[i] != null)
                {
                    float prog = 1f - p.buildLeft / Mathf.Max(0.01f, p.buildTotal);
                    var s = ghosts[i].localScale;
                    s.y = Mathf.Max(0.05f, prog * 2.6f);
                    ghosts[i].localScale = s;
                    ghosts[i].localPosition = new Vector3(0, s.y / 2f, 0);
                }
            }

            stormBlend = Mathf.MoveTowards(stormBlend, c.Storm ? 1f : 0f, Time.deltaTime * 0.25f);
            UpdateWater(c);
            UpdateLighting(c);
            UpdateBeacon(c);
            UpdateRain(c);
            UpdateSelection();
            SyncVillagers(c);
        }

        void RefreshPlot(int i)
        {
            var p = Colony.I.S.plots[i];
            shownType[i] = p.type;
            shownLevel[i] = p.level;
            shownBuilding[i] = p.buildLeft > 0f;
            if (visuals[i] != null) Destroy(visuals[i]);
            if (scaffolds[i] != null) Destroy(scaffolds[i]);
            ghosts[i] = null;
            var root = plotRoots[i];

            if (i == 0)
                visuals[0] = Visuals.Tower(Mathf.Max(1, p.level), root, out lamp, out beam, out lampMat);
            else if (p.type >= 0 && p.level > 0)
                visuals[i] = Visuals.Building((BType)p.type, p.level, root);

            if (shownBuilding[i])
                scaffolds[i] = Visuals.Scaffold(root, i == 0 ? 4.5f : 3f, p.level == 0, out ghosts[i]);
        }

        void UpdateWater(Colony c)
        {
            float wave = Mathf.Sin(Time.time * 0.9f) * 0.05f + Mathf.Sin(Time.time * 2.3f) * 0.03f * (1f + 4f * stormBlend);
            float y = c.WaterLevel + wave;
            water.position = new Vector3(0, y, 0);
            for (int i = 0; i < buoys.Count; i++)
            {
                var b = buoys[i];
                var p = b.position;
                p.y = Mathf.Max(0f, y) - 0.2f + Mathf.Sin(Time.time * 1.5f + i) * 0.1f;
                b.position = p;
                b.rotation = Quaternion.Euler(Mathf.Sin(Time.time * 1.2f + i) * (6f + 14f * stormBlend), 0, Mathf.Cos(Time.time + i) * (6f + 14f * stormBlend));
            }
        }

        void UpdateLighting(Colony c)
        {
            float t = c.S.dayTime;
            float day = Mathf.Clamp01(Mathf.Sin((t - 0.25f) * Mathf.PI * 2f) * 1.4f + 0.15f);
            float gloom = 1f - 0.55f * stormBlend;

            sun.transform.rotation = Quaternion.Euler(Mathf.Lerp(22f, 55f, day), -40f + t * 90f, 0);
            sun.intensity = Mathf.Lerp(0.22f, 1.15f, day) * gloom;
            sun.color = Color.Lerp(new Color(0.55f, 0.65f, 1f), new Color(1f, 0.95f, 0.86f), day);

            RenderSettings.ambientSkyColor = Color.Lerp(new Color(0.08f, 0.1f, 0.2f), new Color(0.62f, 0.7f, 0.8f), day) * gloom;
            RenderSettings.ambientEquatorColor = Color.Lerp(new Color(0.07f, 0.08f, 0.14f), new Color(0.55f, 0.58f, 0.6f), day) * gloom;
            RenderSettings.ambientGroundColor = Color.Lerp(new Color(0.04f, 0.04f, 0.07f), new Color(0.38f, 0.36f, 0.32f), day) * gloom;

            var fog = Color.Lerp(new Color(0.07f, 0.09f, 0.15f), new Color(0.7f, 0.76f, 0.82f), day);
            fog = Color.Lerp(fog, new Color(0.45f, 0.5f, 0.55f) * Mathf.Lerp(0.3f, 1f, day), stormBlend);
            RenderSettings.fogColor = fog;
            RenderSettings.fogDensity = Mathf.Lerp(0.006f, 0.028f, stormBlend);
            if (sky != null && sky.HasProperty("_Exposure")) sky.SetFloat("_Exposure", Mathf.Lerp(0.12f, 1.2f, day) * gloom);
            var cam = CameraRig.I != null ? CameraRig.I.Cam : null;
            if (cam != null) cam.backgroundColor = fog;
        }

        void UpdateBeacon(Colony c)
        {
            bool burn = c.BeaconBurning;
            float flick = Mathf.PerlinNoise(Time.time * 2.5f, 0.7f);
            if (lamp != null) lamp.intensity = Mathf.Lerp(lamp.intensity, burn ? 1.8f + flick : 0f, Time.deltaTime * 4f);
            if (lampMat != null && lampMat.HasProperty("_EmissionColor"))
                lampMat.SetColor("_EmissionColor", new Color(1f, 0.82f, 0.45f) * (burn ? 2.5f + flick : 0.05f));
            if (beam != null)
            {
                float t = c.S.dayTime;
                bool dark = t < 0.27f || t > 0.73f || stormBlend > 0.3f;
                beam.gameObject.SetActive(burn && dark);
                beam.Rotate(0f, 35f * Time.deltaTime, 0f, Space.Self);
            }
        }

        void UpdateRain(Colony c)
        {
            if (rain == null) return;
            var target = CameraRig.I != null ? CameraRig.I.Target : Vector3.zero;
            rain.transform.position = target + Vector3.up * 24f;
            float night = c.S.dayTime < 0.25f || c.S.dayTime > 0.75f ? 0.15f : 0f;   // nachts Nieselregen
            float amount = Mathf.Max(night, stormBlend);
            var em = rain.emission;
            em.rateOverTime = 1800f * amount * GraphicsQuality.I.ParticleMul;
            var vol = rain.velocityOverLifetime;
            vol.x = new ParticleSystem.MinMaxCurve(Mathf.Lerp(1f, 12f, stormBlend));
        }

        void UpdateSelection()
        {
            int s = GameUI.I != null ? GameUI.I.Selected : -1;
            selRoot.gameObject.SetActive(s >= 0);
            if (s < 0) return;
            float half = s == 0 ? 9.7f : 4.15f;
            selRoot.position = plotRoots[s].position + Vector3.up * 0.06f;
            selRoot.rotation = plotRoots[s].rotation;
            for (int i = 0; i < 4; i++)
            {
                var bar = selRoot.GetChild(i);
                bool alongX = i < 2;
                float sign = i % 2 == 0 ? -1f : 1f;
                bar.localPosition = alongX ? new Vector3(0, 0, sign * half) : new Vector3(sign * half, 0, 0);
                bar.localScale = alongX ? new Vector3(half * 2f + 0.25f, 0.1f, 0.25f) : new Vector3(0.25f, 0.1f, half * 2f + 0.25f);
            }
            if (selMat.HasProperty("_EmissionColor"))
                selMat.SetColor("_EmissionColor", new Color(0.3f, 0.85f, 1f) * (1.2f + 0.8f * Mathf.Sin(Time.time * 4f)));
        }

        void SyncVillagers(Colony c)
        {
            int want = Mathf.Min(c.S.survivors, MaxVillagers);
            while (villagers.Count < want) villagers.Add(Villager.Create(villagerRoot));
            while (villagers.Count > want)
            {
                var v = villagers[villagers.Count - 1];
                villagers.RemoveAt(villagers.Count - 1);
                Destroy(v.gameObject);
            }
            for (int i = 0; i < villagers.Count; i++) villagers[i].SetSick(i < c.S.sick);
        }

        void ApplyQuality()
        {
            int t = (int)GraphicsQuality.I.Tier;
            if (sun != null) sun.shadows = t == 0 ? LightShadows.None : t == 1 ? LightShadows.Hard : LightShadows.Soft;
            if (rain != null) { var m = rain.main; m.maxParticles = Mathf.RoundToInt(5000 * GraphicsQuality.I.ParticleMul); }
        }
    }
}
