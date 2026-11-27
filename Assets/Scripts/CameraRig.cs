using UnityEngine;

namespace Pfahlstadt
{
    /// Kamera: ein Finger ziehen verschiebt, ein Finger kurz halten und dann ziehen dreht (links/rechts)
    /// und neigt (hoch/runter), zwei Finger zoomen. Tippen wählt einen Bauplatz.
    /// Am PC: linke Maustaste ziehen, Mausrad zoomen, Klick wählt.
    public class CameraRig : MonoBehaviour
    {
        public static CameraRig I { get; private set; }
        public Camera Cam { get; private set; }
        public Vector3 Target = new Vector3(0, 3f, -3f);
        public float Dist = 52f;

        const float MinDist = 16f, MaxDist = 140f, MaxPan = 75f;
        float yaw;
        Vector2 start, lastMouse;
        bool dragging, startOverUI;
        float lastPinch, tilt, downTime;
        bool rotating, multi;
        Vector2 fingerPos;
        GUIStyle hintStyle;
        Texture2D hintTex;
        const float HoldTime = 0.38f;

        void Awake()
        {
            I = this;
            var go = new GameObject("Main Camera");
            go.tag = "MainCamera";
            Cam = go.AddComponent<Camera>();
            Cam.fieldOfView = 40f;
            Cam.nearClipPlane = 0.5f;
            Cam.farClipPlane = 600f;
            Cam.clearFlags = CameraClearFlags.Skybox;
            Cam.renderingPath = RenderingPath.Forward;
            go.AddComponent<AudioListener>();
            Place();
        }

        void LateUpdate()
        {
            HandleTouch();
            HandleMouse();
            Dist = Mathf.Clamp(Dist, MinDist, MaxDist);
            var flat = new Vector2(Target.x, Target.z);
            if (flat.magnitude > MaxPan) { flat = flat.normalized * MaxPan; Target.x = flat.x; Target.z = flat.y; }
            if (Colony.I != null) Target.y = Colony.I.DeckHeight;
            Place();
        }

        void Place()
        {
            float pitch = Mathf.Clamp(Mathf.Lerp(38f, 60f, (Dist - MinDist) / (MaxDist - MinDist)) + tilt, 15f, 85f);
            var rot = Quaternion.Euler(pitch, yaw, 0f);
            Cam.transform.SetPositionAndRotation(Target - rot * Vector3.forward * Dist, rot);
        }

        void Pan(Vector2 delta)
        {
            float k = Dist / Mathf.Max(1, Screen.height) * 1.9f;
            var rot = Quaternion.Euler(0f, yaw, 0f);
            Target -= (rot * Vector3.right * delta.x + rot * Vector3.forward * delta.y) * k;
        }

        float TapThreshold => Mathf.Max(12f, Screen.height * 0.012f);

        void HandleTouch()
        {
            if (Input.touchCount >= 2)
            {
                // Zwei Finger: nur zoomen
                var a = Input.GetTouch(0);
                var b = Input.GetTouch(1);
                float d = Vector2.Distance(a.position, b.position);
                if (a.phase == TouchPhase.Began || b.phase == TouchPhase.Began || lastPinch <= 0f) lastPinch = d;
                else
                {
                    Dist *= lastPinch / Mathf.Max(1f, d);
                    lastPinch = d;
                }
                dragging = true; multi = true; rotating = false;
                return;
            }
            lastPinch = 0f;
            if (Input.touchCount != 1) { rotating = false; if (Input.touchCount == 0) multi = false; return; }

            var t = Input.GetTouch(0);
            fingerPos = t.position;
            switch (t.phase)
            {
                case TouchPhase.Began:
                    start = t.position;
                    dragging = false; rotating = false;
                    downTime = Time.unscaledTime;
                    startOverUI = GameUI.IsOverUI(t.position);
                    break;
                case TouchPhase.Stationary:
                case TouchPhase.Moved:
                    if (startOverUI || multi) break;
                    // Finger ruhig gehalten → Dreh-Modus
                    if (!dragging && !rotating && Time.unscaledTime - downTime >= HoldTime && (t.position - start).magnitude < TapThreshold * 0.7f)
                    {
                        rotating = true;
#if UNITY_ANDROID && !UNITY_EDITOR
                        Handheld.Vibrate();
#endif
                    }
                    if (t.phase != TouchPhase.Moved) break;
                    if (rotating)
                    {
                        float px = 1f / Mathf.Max(1, Screen.height);
                        yaw += t.deltaPosition.x * px * 200f;
                        tilt = Mathf.Clamp(tilt - t.deltaPosition.y * px * 70f, -25f, 30f);
                        break;
                    }
                    if (!dragging && (t.position - start).magnitude > TapThreshold) dragging = true;
                    if (dragging) Pan(t.deltaPosition);
                    break;
                case TouchPhase.Ended:
                case TouchPhase.Canceled:
                    if (t.phase == TouchPhase.Ended && !dragging && !rotating && !startOverUI && !multi) Tap(t.position);
                    rotating = false;
                    if (Input.touchCount <= 1) multi = false;
                    break;
            }
        }

        // kleiner Hinweis über dem Finger, solange gedreht wird
        void OnGUI()
        {
            if (!rotating) return;
            if (hintStyle == null)
            {
                hintTex = new Texture2D(1, 1) { hideFlags = HideFlags.DontSave };
                hintTex.SetPixel(0, 0, new Color(0.04f, 0.16f, 0.2f, 0.88f)); hintTex.Apply();
                hintStyle = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold };
                hintStyle.normal.textColor = new Color(0.85f, 1f, 0.97f);
                hintStyle.normal.background = hintTex;
            }
            hintStyle.fontSize = Mathf.RoundToInt(Screen.height * 0.018f);
            float w = Screen.height * 0.2f, h = Screen.height * 0.035f;
            var r = new Rect(fingerPos.x - w * 0.5f, Screen.height - fingerPos.y - h - Screen.height * 0.07f, w, h);
            GUI.Label(r, "Drehen & Neigen", hintStyle);
        }

        void HandleMouse()
        {
            if (Input.touchCount > 0 || (Input.touchSupported && !Application.isEditor)) return;

            Vector2 mp = Input.mousePosition;
            if (Input.GetMouseButtonDown(0))
            {
                start = lastMouse = mp;
                dragging = false;
                startOverUI = GameUI.IsOverUI(mp);
            }
            else if (Input.GetMouseButton(0) && !startOverUI)
            {
                if (!dragging && (mp - start).magnitude > 8f) dragging = true;
                if (dragging) Pan(mp - lastMouse);
                lastMouse = mp;
            }
            if (Input.GetMouseButtonUp(0) && !dragging && !startOverUI) Tap(mp);

            if (Input.GetMouseButton(1))
            {
                Vector2 dm = (Vector2)Input.mousePosition - lastMouse;
                yaw += dm.x * 0.3f;
                tilt = Mathf.Clamp(tilt - dm.y * 0.2f, -25f, 30f);
            }
            if (!Input.GetMouseButton(0)) lastMouse = mp;

            float wheel = Input.mouseScrollDelta.y;
            if (Mathf.Abs(wheel) > 0.01f && !GameUI.IsOverUI(mp)) Dist *= 1f - wheel * 0.1f;
        }

        void Tap(Vector2 screenPos)
        {
            if (GameUI.I == null) return;
            var ray = Cam.ScreenPointToRay(screenPos);
            if (Physics.Raycast(ray, out var hit, 800f))
            {
                var pm = hit.collider.GetComponentInParent<PlotMarker>();
                GameUI.I.Select(pm != null ? pm.Index : -1);
            }
            else GameUI.I.Select(-1);
        }
    }
}
