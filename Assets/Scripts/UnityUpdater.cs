using System;
using System.Collections;
using System.IO;
using UnityEngine;
using UnityEngine.Networking;

/// Automatische Aktualisierung: schaut beim Start auf GitHub nach einer neueren Unity-Version
/// (Releases mit Tag "unity-N"), lädt sie mit Fortschrittsbalken herunter und startet die Installation.
public class UnityUpdater : MonoBehaviour
{
    const string Repo = "robertpahl1987-creator/pfahlstadt";
    const string TagPrefix = "unity-";

    static UnityUpdater inst;
    string status;          // null = nichts anzeigen
    float progress = -1f;   // < 0 = kein Balken
    bool needPermission, waitingForPermission;
    string apkPath;
    GUIStyle box, label, button;

    [Serializable] class Manifest { public string buildNumber; }
    [Serializable] class Asset { public string name; public string browser_download_url; public long size; }
    [Serializable] class Release { public string tag_name; public Asset[] assets; }
    [Serializable] class ReleaseList { public Release[] items; }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Boot()
    {
        if (Application.platform != RuntimePlatform.Android || inst != null) return;
        var go = new GameObject("Updater");
        DontDestroyOnLoad(go);
        inst = go.AddComponent<UnityUpdater>();
    }

    static int OwnBuild()
    {
        // Unity Build Automation legt diese Datei automatisch in jeden Build
        var ta = Resources.Load<TextAsset>("UnityCloudBuildManifest.json");
        if (ta == null) return -1;
        try
        {
            var m = JsonUtility.FromJson<Manifest>(ta.text);
            int n; return int.TryParse(m.buildNumber, out n) ? n : -1;
        }
        catch (Exception) { return -1; }
    }

    IEnumerator Start()
    {
        yield return new WaitForSeconds(2f);
        int own = OwnBuild();
        if (own < 0) yield break;

        var req = UnityWebRequest.Get("https://api.github.com/repos/" + Repo + "/releases?per_page=30");
        req.SetRequestHeader("User-Agent", "UnityUpdater");
        yield return req.SendWebRequest();
        if (req.result != UnityWebRequest.Result.Success) yield break;

        ReleaseList list;
        try { list = JsonUtility.FromJson<ReleaseList>("{\"items\":" + req.downloadHandler.text + "}"); }
        catch (Exception) { yield break; }
        if (list == null || list.items == null) yield break;

        int best = own; string url = null;
        foreach (var r in list.items)
        {
            if (r == null || r.tag_name == null || !r.tag_name.StartsWith(TagPrefix) || r.assets == null) continue;
            int n;
            if (!int.TryParse(r.tag_name.Substring(TagPrefix.Length), out n) || n <= best) continue;
            foreach (var a in r.assets)
                if (a != null && a.name != null && a.name.EndsWith(".apk") && a.size > 1000000) { best = n; url = a.browser_download_url; break; }
        }
        if (url == null) yield break;

        status = $"Neue Version {best} wird geladen …";
        progress = 0f;
        apkPath = Path.Combine(Application.temporaryCachePath, "update.apk");
        var dl = new UnityWebRequest(url) { downloadHandler = new DownloadHandlerFile(apkPath) { removeFileOnAbort = true } };
        dl.SetRequestHeader("User-Agent", "UnityUpdater");
        var op = dl.SendWebRequest();
        while (!op.isDone) { progress = dl.downloadProgress; yield return null; }
        if (dl.result != UnityWebRequest.Result.Success)
        {
            status = "Update konnte nicht geladen werden."; progress = -1f;
            yield return new WaitForSeconds(4f); status = null; yield break;
        }
        progress = 1f;
        status = $"Version {best} ist bereit.";
        TryInstall();
    }

    void TryInstall()
    {
        try
        {
            using (var up = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
            using (var act = up.GetStatic<AndroidJavaObject>("currentActivity"))
            using (var jc = new AndroidJavaClass("de.robert.updater.ApkInstaller"))
            {
                if (!jc.CallStatic<bool>("canInstall", act)) { needPermission = true; return; }
                needPermission = false;
                jc.CallStatic("install", act, apkPath);
                status = null; progress = -1f;
            }
        }
        catch (Exception e)
        {
            Debug.LogWarning("Updater: " + e.Message);
            status = "Installation konnte nicht gestartet werden.";
        }
    }

    void OnApplicationFocus(bool focus)
    {
        if (focus && waitingForPermission) { waitingForPermission = false; TryInstall(); }
    }

    void OnGUI()
    {
        if (status == null) return;
        float s = Mathf.Max(1f, Screen.width / 720f);
        if (box == null)
        {
            var tex = new Texture2D(1, 1); tex.SetPixel(0, 0, new Color(0.08f, 0.12f, 0.16f, 0.94f)); tex.Apply();
            box = new GUIStyle { normal = { background = tex } };
            label = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, wordWrap = true, normal = { textColor = Color.white } };
            button = new GUIStyle(GUI.skin.button);
        }
        label.fontSize = Mathf.RoundToInt(22 * s);
        button.fontSize = Mathf.RoundToInt(22 * s);
        float w = Screen.width * 0.86f, h = (needPermission ? 210f : 130f) * s;
        var r = new Rect((Screen.width - w) / 2f, Screen.height * 0.4f, w, h);
        GUI.Box(r, GUIContent.none, box);
        GUI.Label(new Rect(r.x + 16 * s, r.y + 12 * s, r.width - 32 * s, 44 * s), status, label);
        if (progress >= 0f)
        {
            var bar = new Rect(r.x + 24 * s, r.y + 66 * s, r.width - 48 * s, 26 * s);
            GUI.DrawTexture(bar, Texture2D.grayTexture);
            var fill = new Rect(bar.x, bar.y, bar.width * Mathf.Clamp01(progress), bar.height);
            var old = GUI.color; GUI.color = new Color(0.35f, 0.8f, 0.45f); GUI.DrawTexture(fill, Texture2D.whiteTexture); GUI.color = old;
            GUI.Label(bar, Mathf.RoundToInt(progress * 100f) + " %", label);
        }
        if (needPermission)
        {
            GUI.Label(new Rect(r.x + 16 * s, r.y + 98 * s, r.width - 32 * s, 40 * s), "Einmalig erlauben: Updates installieren", label);
            if (GUI.Button(new Rect(r.x + r.width / 2f - 150 * s, r.y + 144 * s, 300 * s, 54 * s), "Erlauben", button))
            {
                try
                {
                    using (var up = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
                    using (var act = up.GetStatic<AndroidJavaObject>("currentActivity"))
                    using (var jc = new AndroidJavaClass("de.robert.updater.ApkInstaller"))
                        jc.CallStatic("openInstallSettings", act);
                    waitingForPermission = true;
                }
                catch (Exception e) { Debug.LogWarning("Updater: " + e.Message); }
            }
        }
    }
}
