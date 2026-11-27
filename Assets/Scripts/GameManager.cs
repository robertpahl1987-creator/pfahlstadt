using UnityEngine;

namespace Pfahlstadt
{
    /// Startet das Spiel automatisch in jeder (auch leeren) Szene.
    public static class GameBootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Init()
        {
            if (Object.FindFirstObjectByType<GameManager>() != null) return;
            new GameObject("Pfahlstadt").AddComponent<GameManager>();
        }
    }

    public class GameManager : MonoBehaviour
    {
        void Awake()
        {
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            Screen.orientation = ScreenOrientation.Portrait;
            Input.multiTouchEnabled = true;

            // Reihenfolge ist wichtig: Logik → Kamera → Grafik → Welt → Oberfläche
            gameObject.AddComponent<Colony>();
            gameObject.AddComponent<CameraRig>();
            gameObject.AddComponent<GraphicsQuality>();
            gameObject.AddComponent<WorldView>();
            gameObject.AddComponent<WattView>();
            gameObject.AddComponent<GameUI>();
        }
    }
}
