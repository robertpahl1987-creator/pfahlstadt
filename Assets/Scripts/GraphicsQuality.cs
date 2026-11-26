using System;
using UnityEngine;

namespace Pfahlstadt
{
    public enum QTier { Niedrig = 0, Mittel = 1, Hoch = 2, Ultra = 3 }

    /// Erkennt die Leistung des Geräts und stellt Auflösung (bis 8K), Kantenglättung,
    /// Schatten und Partikel passend ein. Fällt automatisch eine Stufe zurück, wenn es ruckelt.
    public class GraphicsQuality : MonoBehaviour
    {
        public static GraphicsQuality I { get; private set; }
        public const int MaxLongSide = 7680;   // 8K-Grenze

        public QTier Tier { get; private set; }
        public bool Auto { get; private set; } = true;
        public float Fps { get; private set; } = 60f;
        public int TargetFps { get; private set; } = 60;
        public Vector2Int RenderRes { get; private set; }
        public event Action OnChanged;

        public float ParticleMul => new[] { 0.35f, 0.65f, 1f, 1.5f }[(int)Tier];

        int nativeW, nativeH;
        float lowTime;

        void Awake()
        {
            I = this;
            nativeW = Mathf.Max(Screen.width, 1);
            nativeH = Mathf.Max(Screen.height, 1);
            Auto = PlayerPrefs.GetInt("gfx_auto", 1) == 1;
            Tier = Auto ? Detect() : (QTier)Mathf.Clamp(PlayerPrefs.GetInt("gfx_tier", (int)Detect()), 0, 3);
            Apply();
        }

        public static QTier Detect()
        {
            int ram = SystemInfo.systemMemorySize;
            int vram = SystemInfo.graphicsMemorySize;
            int cores = SystemInfo.processorCount;
            if (Application.isMobilePlatform)
            {
                if (ram >= 11000 && cores >= 8) return QTier.Ultra;
                if (ram >= 7000) return QTier.Hoch;
                if (ram >= 4500) return QTier.Mittel;
                return QTier.Niedrig;
            }
            if (vram >= 7000) return QTier.Ultra;
            if (vram >= 3500) return QTier.Hoch;
            if (vram >= 1500) return QTier.Mittel;
            return QTier.Niedrig;
        }

        /// Auto → Niedrig → Mittel → Hoch → Ultra → Auto
        public void Cycle()
        {
            if (Auto) { Auto = false; Tier = QTier.Niedrig; }
            else if (Tier == QTier.Ultra) { Auto = true; Tier = Detect(); }
            else Tier++;
            PlayerPrefs.SetInt("gfx_auto", Auto ? 1 : 0);
            PlayerPrefs.SetInt("gfx_tier", (int)Tier);
            Apply();
        }

        public void Apply()
        {
            int t = (int)Tier;
            bool mobile = Application.isMobilePlatform;

            QualitySettings.vSyncCount = 0;
            TargetFps = t >= 2 || !mobile ? 60 : 30;
            Application.targetFrameRate = TargetFps;

            QualitySettings.antiAliasing = new[] { 0, 2, 4, mobile ? 4 : 8 }[t];
            QualitySettings.shadows = t == 0 ? ShadowQuality.Disable : t == 1 ? ShadowQuality.HardOnly : ShadowQuality.All;
            QualitySettings.shadowResolution = new[] { ShadowResolution.Low, ShadowResolution.Medium, ShadowResolution.High, ShadowResolution.VeryHigh }[t];
            QualitySettings.shadowDistance = new[] { 30f, 55f, 85f, 130f }[t];
            QualitySettings.shadowCascades = t >= 3 ? 4 : t == 2 ? 2 : 1;
            QualitySettings.anisotropicFiltering = t >= 2 ? AnisotropicFiltering.ForceEnable : AnisotropicFiltering.Enable;
            QualitySettings.pixelLightCount = new[] { 1, 2, 4, 6 }[t];
            QualitySettings.softParticles = t >= 3;
            QualitySettings.globalTextureMipmapLimit = t == 0 ? 1 : 0;

            // Auflösung: Ultra = volle native Auflösung, begrenzt auf 8K (7680 px lange Seite)
            int w = nativeW, h = nativeH;
            float scale = new[] { 0.55f, 0.75f, 1f, 1f }[t];
            w = Mathf.RoundToInt(w * scale);
            h = Mathf.RoundToInt(h * scale);
            float cap = (float)MaxLongSide / Mathf.Max(w, h);
            if (cap < 1f) { w = Mathf.RoundToInt(w * cap); h = Mathf.RoundToInt(h * cap); }
            if (mobile) Screen.SetResolution(w, h, true);
            else { w = Screen.width; h = Screen.height; }
            RenderRes = new Vector2Int(w, h);

            var cam = Camera.main;
            if (cam != null) { cam.allowMSAA = t >= 1; cam.allowHDR = false; }

            OnChanged?.Invoke();
        }

        void Update()
        {
            float dt = Time.unscaledDeltaTime;
            Fps = Mathf.Lerp(Fps, 1f / Mathf.Max(0.0001f, dt), 0.05f);
            if (!Auto || Time.realtimeSinceStartup < 8f) return;

            if (Fps < TargetFps * 0.72f) lowTime += dt; else lowTime = 0f;
            if (lowTime > 5f && Tier > QTier.Niedrig)
            {
                Tier--;
                lowTime = 0f;
                Apply();
                if (Colony.I != null) Colony.I.Msg($"Grafik automatisch angepasst: {Tier}");
            }
        }
    }
}
