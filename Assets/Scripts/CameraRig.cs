using UnityEngine;

namespace Pfahlstadt
{
    /// Kamera wie bei Whiteout Survival: fester Blickwinkel, ein Finger schiebt die Karte
    /// (vor, zurück, links, rechts – der Boden klebt am Finger und gleitet beim Loslassen aus),
    /// zwei Finger zoomen zum Punkt zwischen den Fingern. Tippen wählt einen Bauplatz.
    /// Am PC: linke Maustaste ziehen, Mausrad zoomen, Klick wählt.
    public class CameraRig : MonoBehaviour
    {
        public static CameraRig I { get; private set; }
        public Camera Cam { get; private set; }
        public Vector3 Target = new Vector3(0, 3f, -3f);
        public float Dist = 52f;

        const float MinDist = 16f, MaxDist = 140f, MaxPan = 75f, Yaw = 0f;
        Vector2 start, lastMouse;
        bool dragging, startOverUI, multi;
        Vector3 glide;

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
            if (Colony.I != null) Target.y = Colony.I.DeckHeight;
            Place();
            HandleTouch();
            HandleMouse();
            if (Input.touchCount == 0 && !Input.GetMouseButton(0) && glide.sqrMagnitude > 0.01f)
            {
                Target += glide * Time.unscaledDeltaTime;
                glide *= Mathf.Exp(-5f * Time.unscaledDeltaTime);
            }
            Clamp();
            Place();
        }

        void Clamp()
        {
            Dist = Mathf.Clamp(Dist, MinDist, MaxDist);
            var flat = new Vector2(Target.x, Target.z);
            if (flat.magnitude > MaxPan) { flat = flat.normalized * MaxPan; Target.x = flat.x; Target.z = flat.y; glide = Vector3.zero; }
        }

        void Place()
        {
            // weiter weg = steiler von oben, nah dran = flacher (wie in Aufbauspielen üblich)
            float pitch = Mathf.Lerp(40f, 58f, (Mathf.Clamp(Dist, MinDist, MaxDist) - MinDist) / (MaxDist - MinDist));
            var rot = Quaternion.Euler(pitch, Yaw, 0f);
            Cam.transform.SetPositionAndRotation(Target - rot * Vector3.forward * Dist, rot);
        }

        /// Punkt auf der Deck-Ebene unter einer Bildschirmposition
        bool Ground(Vector2 sp, out Vector3 p)
        {
            var ray = Cam.ScreenPointToRay(sp);
            p = Vector3.zero;
            if (ray.direction.y > -0.02f) return false;
            float t = (Target.y - ray.origin.y) / ray.direction.y;
            p = ray.origin + ray.direction * t;
            return true;
        }

        /// Karte so verschieben, dass der Boden unter "from" danach unter "to" liegt
        Vector3 Drag(Vector2 from, Vector2 to)
        {
            if (Ground(from, out var a) && Ground(to, out var b))
            {
                var step = a - b; step.y = 0f;
                Target += step; Place();
                return step;
            }
            return Vector3.zero;
        }

        float TapThreshold => Mathf.Max(12f, Screen.height * 0.012f);

        void HandleTouch()
        {
            if (Input.touchCount >= 2)
            {
                // Zwei Finger: zoomen zum Punkt zwischen den Fingern
                var a = Input.GetTouch(0);
                var b = Input.GetTouch(1);
                dragging = true; multi = true; glide = Vector3.zero;
                if (a.phase == TouchPhase.Began || b.phase == TouchPhase.Began) return;
                Vector2 pa = a.position - a.deltaPosition, pb = b.position - b.deltaPosition;
                Vector2 m0 = (pa + pb) * 0.5f, m1 = (a.position + b.position) * 0.5f;
                float d0 = (pa - pb).magnitude, d1 = (a.position - b.position).magnitude;
                bool ok = Ground(m0, out var g0);
                if (d0 > 1f && d1 > 1f) { Dist = Mathf.Clamp(Dist * d0 / d1, MinDist, MaxDist); Place(); }
                if (ok && Ground(m1, out var g1)) { var step = g0 - g1; step.y = 0f; Target += step; Place(); }
                return;
            }
            if (Input.touchCount != 1) { if (Input.touchCount == 0) multi = false; return; }

            var t = Input.GetTouch(0);
            switch (t.phase)
            {
                case TouchPhase.Began:
                    start = t.position;
                    dragging = false; glide = Vector3.zero;
                    startOverUI = GameUI.IsOverUI(t.position);
                    break;
                case TouchPhase.Moved:
                    if (startOverUI || multi) break;
                    if (!dragging && (t.position - start).magnitude > TapThreshold) dragging = true;
                    if (dragging)
                    {
                        var step = Drag(t.position - t.deltaPosition, t.position);
                        glide = Vector3.Lerp(glide, step / Mathf.Max(0.001f, Time.unscaledDeltaTime), 0.5f);
                    }
                    break;
                case TouchPhase.Stationary:
                    glide = Vector3.Lerp(glide, Vector3.zero, 0.5f);
                    break;
                case TouchPhase.Ended:
                case TouchPhase.Canceled:
                    if (t.phase == TouchPhase.Ended && !dragging && !startOverUI && !multi) Tap(t.position);
                    if (multi) glide = Vector3.zero;
                    if (Input.touchCount <= 1) multi = false;
                    break;
            }
        }

        void HandleMouse()
        {
            if (Input.touchCount > 0 || (Input.touchSupported && !Application.isEditor)) return;

            Vector2 mp = Input.mousePosition;
            if (Input.GetMouseButtonDown(0))
            {
                start = lastMouse = mp;
                dragging = false; glide = Vector3.zero;
                startOverUI = GameUI.IsOverUI(mp);
            }
            else if (Input.GetMouseButton(0) && !startOverUI)
            {
                if (!dragging && (mp - start).magnitude > 8f) dragging = true;
                if (dragging)
                {
                    var step = Drag(lastMouse, mp);
                    glide = Vector3.Lerp(glide, step / Mathf.Max(0.001f, Time.unscaledDeltaTime), 0.5f);
                }
            }
            if (Input.GetMouseButtonUp(0) && !dragging && !startOverUI) Tap(mp);
            lastMouse = mp;

            float wheel = Input.mouseScrollDelta.y;
            if (Mathf.Abs(wheel) > 0.01f && !GameUI.IsOverUI(mp))
            {
                bool ok = Ground(mp, out var g0);
                Dist = Mathf.Clamp(Dist * (1f - wheel * 0.1f), MinDist, MaxDist); Place();
                if (ok && Ground(mp, out var g1)) { var step = g0 - g1; step.y = 0f; Target += step; }
            }
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
