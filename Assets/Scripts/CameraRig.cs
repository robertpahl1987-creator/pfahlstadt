using UnityEngine;

namespace Pfahlstadt
{
    /// Kamera: ein Finger verschiebt, zwei Finger zoomen (spreizen), drehen (Finger umeinander drehen)
    /// und neigen (beide Finger hoch/runter). Tippen wählt einen Bauplatz.
    /// Am PC: linke Maustaste ziehen, Mausrad zoomen, Klick wählt.
    public class CameraRig : MonoBehaviour
    {
        public static CameraRig I { get; private set; }
        public Camera Cam { get; private set; }
        public Vector3 Target = new Vector3(0, 3f, -3f);
        public float Dist = 52f;

        const float MinDist = 16f, MaxDist = 90f, MaxPan = 55f;
        float yaw;
        Vector2 start, lastMouse;
        bool dragging, startOverUI;
        float lastPinch, lastAngle, tilt;
        Vector2 lastMid;

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
                var a = Input.GetTouch(0);
                var b = Input.GetTouch(1);
                float d = Vector2.Distance(a.position, b.position);
                Vector2 dir = b.position - a.position;
                float ang = Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg;
                Vector2 mid = (a.position + b.position) * 0.5f;
                if (a.phase == TouchPhase.Began || b.phase == TouchPhase.Began || lastPinch <= 0f)
                {
                    lastPinch = d; lastAngle = ang; lastMid = mid;
                }
                else
                {
                    // Zoomen
                    Dist *= lastPinch / Mathf.Max(1f, d);
                    // Drehen um die Hochachse
                    yaw -= Mathf.DeltaAngle(lastAngle, ang);
                    // Neigen: beide Finger gemeinsam hoch/runter
                    float dy = mid.y - lastMid.y;
                    tilt = Mathf.Clamp(tilt - dy / Mathf.Max(1, Screen.height) * 120f, -25f, 30f);
                    lastPinch = d; lastAngle = ang; lastMid = mid;
                }
                dragging = true;
                return;
            }
            lastPinch = 0f;
            if (Input.touchCount != 1) return;

            var t = Input.GetTouch(0);
            switch (t.phase)
            {
                case TouchPhase.Began:
                    start = t.position;
                    dragging = false;
                    startOverUI = GameUI.IsOverUI(t.position);
                    break;
                case TouchPhase.Moved:
                    if (startOverUI) break;
                    if (!dragging && (t.position - start).magnitude > TapThreshold) dragging = true;
                    if (dragging) Pan(t.deltaPosition);
                    break;
                case TouchPhase.Ended:
                    if (!dragging && !startOverUI) Tap(t.position);
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
