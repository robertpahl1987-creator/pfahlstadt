using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace Pfahlstadt.EditorTools
{
    /// Richtet das Projekt beim ersten Öffnen automatisch ein:
    /// Material-Vorlagen (damit die Shader im APK landen), Szene, Android-Einstellungen.
    [InitializeOnLoad]
    public static class PfahlstadtSetup
    {
        public const string ScenePath = "Assets/Scenes/Pfahlstadt.unity";
        const string MatDir = "Assets/Resources/Pfahlstadt";

        static PfahlstadtSetup()
        {
            if (Application.isBatchMode) return;
            EditorApplication.delayCall += () =>
            {
                if (!File.Exists(ScenePath) || !File.Exists(MatDir + "/Std.mat")) Run();
            };
        }

        [MenuItem("Pfahlstadt/Projekt einrichten")]
        public static void Run()
        {
            Directory.CreateDirectory(MatDir);
            Directory.CreateDirectory("Assets/Scenes");
            AssetDatabase.Refresh();

            CreateMat("Std", "Standard", null);
            CreateMat("StdEmis", "Standard", m =>
            {
                m.EnableKeyword("_EMISSION");
                m.SetColor("_EmissionColor", Color.white);
                m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.None;
            });
            CreateMat("Water", "Standard", m =>
            {
                // Standard-Shader im Modus "Transparent"
                m.SetFloat("_Mode", 3f);
                m.SetInt("_SrcBlend", (int)BlendMode.One);
                m.SetInt("_DstBlend", (int)BlendMode.OneMinusSrcAlpha);
                m.SetInt("_ZWrite", 0);
                m.DisableKeyword("_ALPHATEST_ON");
                m.DisableKeyword("_ALPHABLEND_ON");
                m.EnableKeyword("_ALPHAPREMULTIPLY_ON");
                m.renderQueue = (int)RenderQueue.Transparent;
                m.color = new Color(0.2f, 0.38f, 0.43f, 0.78f);
                m.SetFloat("_Glossiness", 0.93f);
            });
            CreateMat("PartAlpha", "Legacy Shaders/Particles/Alpha Blended", null);
            CreateMat("PartAdd", "Legacy Shaders/Particles/Additive", null);
            CreateMat("Sky", "Skybox/Procedural", null);

            if (!File.Exists(ScenePath))
            {
                var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                // Nebel in der Szene aktivieren, damit die Nebel-Shader-Varianten mitgebaut werden
                RenderSettings.fog = true;
                RenderSettings.fogMode = FogMode.ExponentialSquared;
                RenderSettings.fogDensity = 0.006f;
                RenderSettings.ambientMode = AmbientMode.Trilight;
                RenderSettings.skybox = AssetDatabase.LoadAssetAtPath<Material>(MatDir + "/Sky.mat");
                EditorSceneManager.SaveScene(scene, ScenePath);
            }
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };

            ConfigurePlayer();
            AssetDatabase.SaveAssets();
            Debug.Log("Pfahlstadt: Projekt eingerichtet. Szene 'Assets/Scenes/Pfahlstadt' öffnen und Play drücken.");
        }

        static void CreateMat(string name, string shader, System.Action<Material> setup)
        {
            string path = MatDir + "/" + name + ".mat";
            if (AssetDatabase.LoadAssetAtPath<Material>(path) != null) return;
            var sh = Shader.Find(shader);
            if (sh == null) { Debug.LogWarning("Pfahlstadt: Shader fehlt: " + shader); return; }
            var m = new Material(sh) { enableInstancing = true };
            setup?.Invoke(m);
            AssetDatabase.CreateAsset(m, path);
        }

        static void ConfigurePlayer()
        {
            PlayerSettings.companyName = "Robert Baasner";
            PlayerSettings.productName = "Pfahlstadt";
            PlayerSettings.bundleVersion = "0.1.0";
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "de.robertbaasner.pfahlstadt");
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.Android.bundleVersionCode = 1;
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
            PlayerSettings.colorSpace = ColorSpace.Linear;
        }
    }

    public static class PfahlstadtBuild
    {
        /// Wird auch von GitHub Actions aufgerufen (buildMethod).
        [MenuItem("Pfahlstadt/Android-APK bauen")]
        public static void BuildAndroid()
        {
            PfahlstadtSetup.Run();
            Directory.CreateDirectory("Build/Android");
            EditorUserBuildSettings.buildAppBundle = false;
            var opts = new BuildPlayerOptions
            {
                scenes = new[] { PfahlstadtSetup.ScenePath },
                locationPathName = "Build/Android/Pfahlstadt.apk",
                target = BuildTarget.Android,
                targetGroup = BuildTargetGroup.Android,
                options = BuildOptions.None,
            };
            var report = BuildPipeline.BuildPlayer(opts);
            Debug.Log($"Pfahlstadt-Build: {report.summary.result}, {report.summary.totalSize / (1024 * 1024)} MB");
            if (Application.isBatchMode) EditorApplication.Exit(report.summary.result == BuildResult.Succeeded ? 0 : 1);
            else if (report.summary.result == BuildResult.Succeeded) EditorUtility.RevealInFinder("Build/Android/Pfahlstadt.apk");
        }
    }
}
