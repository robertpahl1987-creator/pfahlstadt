using System.Collections.Generic;
using UnityEngine;

namespace Pfahlstadt
{
    /// Erzeugt Materialien zur Laufzeit. Vorlagen liegen in Resources/Pfahlstadt
    /// (werden vom Editor-Skript angelegt), damit die Shader im APK enthalten sind.
    public static class MatLib
    {
        static readonly Dictionary<string, Material> cache = new Dictionary<string, Material>();
        static Material tStd, tEmis, tAlpha, tAdd, tWater;
        static Texture2D dot;

        static Material Template(string name, string shaderName)
        {
            var t = Resources.Load<Material>("Pfahlstadt/" + name);
            if (t != null) return t;
            var sh = Shader.Find(shaderName);
            if (sh == null) sh = Shader.Find("Standard");
            if (sh == null) sh = Shader.Find("Unlit/Color");
            return new Material(sh);
        }

        public static Material Lit(Color c, float smooth = 0.15f, float metal = 0f)
        {
            string k = "L" + c + smooth + metal;
            if (cache.TryGetValue(k, out var m)) return m;
            if (tStd == null) tStd = Template("Std", "Standard");
            m = new Material(tStd) { color = c, enableInstancing = true };
            if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", smooth);
            if (m.HasProperty("_Metallic")) m.SetFloat("_Metallic", metal);
            m.DisableKeyword("_EMISSION");
            cache[k] = m;
            return m;
        }

        public static Material Glow(Color c, float intensity)
        {
            string k = "G" + c + intensity;
            if (cache.TryGetValue(k, out var m)) return m;
            if (tEmis == null) tEmis = Template("StdEmis", "Standard");
            m = new Material(tEmis) { color = c * 0.5f, enableInstancing = true };
            m.EnableKeyword("_EMISSION");
            if (m.HasProperty("_EmissionColor")) m.SetColor("_EmissionColor", c * intensity);
            m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.None;
            cache[k] = m;
            return m;
        }

        /// Halbtransparentes Wasser (fällt auf undurchsichtig zurück, falls Vorlage fehlt)
        public static Material Water(Color c)
        {
            if (tWater == null) tWater = Resources.Load<Material>("Pfahlstadt/Water");
            var m = tWater != null ? new Material(tWater) : new Material(Template("Std", "Standard"));
            m.color = c;
            if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", 0.93f);
            if (m.HasProperty("_Metallic")) m.SetFloat("_Metallic", 0.05f);
            return m;
        }

        public static Material Particle(bool additive)
        {
            string k = additive ? "PAdd" : "PAlpha";
            if (cache.TryGetValue(k, out var m)) return m;
            var t = additive
                ? (tAdd != null ? tAdd : tAdd = Template("PartAdd", "Legacy Shaders/Particles/Additive"))
                : (tAlpha != null ? tAlpha : tAlpha = Template("PartAlpha", "Legacy Shaders/Particles/Alpha Blended"));
            m = new Material(t) { mainTexture = Dot() };
            if (m.HasProperty("_TintColor")) m.SetColor("_TintColor", new Color(0.5f, 0.5f, 0.5f, 0.5f));
            cache[k] = m;
            return m;
        }

        /// Additiver Lichtkegel für den Leuchtturm (ohne Textur-Verlauf)
        public static Material Beam()
        {
            var t = tAdd != null ? tAdd : tAdd = Template("PartAdd", "Legacy Shaders/Particles/Additive");
            var m = new Material(t) { mainTexture = Texture2D.whiteTexture };
            if (m.HasProperty("_TintColor")) m.SetColor("_TintColor", new Color(0.35f, 0.3f, 0.18f, 0.25f));
            return m;
        }

        public static Material Sky()
        {
            var t = Resources.Load<Material>("Pfahlstadt/Sky");
            if (t != null) return new Material(t);
            var sh = Shader.Find("Skybox/Procedural");
            return sh != null ? new Material(sh) : null;
        }

        public static Texture2D Dot()
        {
            if (dot != null) return dot;
            const int n = 64;
            dot = new Texture2D(n, n, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp };
            for (int y = 0; y < n; y++)
                for (int x = 0; x < n; x++)
                {
                    float d = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), new Vector2(n / 2f, n / 2f)) / (n / 2f);
                    float a = Mathf.Clamp01(1f - d);
                    dot.SetPixel(x, y, new Color(1f, 1f, 1f, a * a));
                }
            dot.Apply();
            return dot;
        }
    }
}
