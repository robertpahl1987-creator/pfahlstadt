using System.Collections.Generic;
using System.Text;
using UnityEngine;

namespace Pfahlstadt
{
    /// Benutzeroberfläche (skaliert auf jede Bildschirmgröße, Hochformat).
    public partial class GameUI : MonoBehaviour
    {
        public static GameUI I { get; private set; }
        public int Selected { get; private set; } = -1;

        static readonly List<Rect> rects = new List<Rect>();
        float sc = 1f, VW = 720f, VH = 1280f, top, bottom;
        bool menu, confirmNew, confirmDemolish;

        GUIStyle st, stSmall, stTiny, stTitle, stBig, stBtn, stWorld, stWorldSmall, stToast;
        Texture2D txPanel, txCard, txBtn, txBtnHover, txBarBg, txLabel, txToast;

        void Awake() { I = this; }

        public void Select(int i)
        {
            if (i <= -3000 && i > -4000) { if (Colony.I != null) Colony.I.CollectTreasure(-3000 - i); Selected = -1; return; }
            if (i != -1) panel = null;
            Selected = i;
            confirmDemolish = false;
            if (i >= 0) menu = false;
        }

        public static bool IsOverUI(Vector2 screenPos)
        {
            if (I == null) return false;
            var p = new Vector2(screenPos.x / I.sc, (Screen.height - screenPos.y) / I.sc);
            for (int i = 0; i < rects.Count; i++) if (rects[i].Contains(p)) return true;
            return false;
        }

        static Texture2D Tex(Color c)
        {
            var t = new Texture2D(1, 1) { hideFlags = HideFlags.DontSave };
            t.SetPixel(0, 0, c);
            t.Apply();
            return t;
        }

        void InitStyles()
        {
            txPanel = Tex(new Color(0.05f, 0.1f, 0.13f, 0.9f));
            txCard = Tex(new Color(0.12f, 0.2f, 0.24f, 0.95f));
            txBtn = Tex(new Color(0.12f, 0.45f, 0.5f, 1f));
            txBtnHover = Tex(new Color(0.18f, 0.58f, 0.62f, 1f));
            txBarBg = Tex(new Color(0f, 0f, 0f, 0.5f));
            txLabel = Tex(new Color(0f, 0.05f, 0.08f, 0.6f));
            txToast = Tex(new Color(0.05f, 0.18f, 0.22f, 0.92f));

            st = new GUIStyle(GUI.skin.label) { fontSize = 22, richText = true, wordWrap = true };
            st.normal.textColor = new Color(0.93f, 0.96f, 0.97f);
            stSmall = new GUIStyle(st) { fontSize = 19 };
            stSmall.normal.textColor = new Color(0.78f, 0.86f, 0.88f);
            stTiny = new GUIStyle(st) { fontSize = 16 };
            stTiny.normal.textColor = new Color(0.72f, 0.8f, 0.83f);
            stTitle = new GUIStyle(st) { fontSize = 30, fontStyle = FontStyle.Bold };
            stBig = new GUIStyle(st) { fontSize = 27, fontStyle = FontStyle.Bold };
            stBtn = new GUIStyle(GUI.skin.button) { fontSize = 22, richText = true, wordWrap = true, alignment = TextAnchor.MiddleCenter };
            stBtn.normal.background = txBtn; stBtn.hover.background = txBtnHover; stBtn.active.background = txBtnHover;
            stBtn.normal.textColor = stBtn.hover.textColor = stBtn.active.textColor = Color.white;
            stBtn.border = new RectOffset(0, 0, 0, 0);
            stWorld = new GUIStyle(st) { fontSize = 19, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter, wordWrap = false };
            stWorldSmall = new GUIStyle(stWorld) { fontSize = 16, fontStyle = FontStyle.Normal };
            stToast = new GUIStyle(st) { fontSize = 19, alignment = TextAnchor.MiddleCenter };
        }

        // ---------- Helfer ----------

        Rect Panel(Rect r, Texture2D bg = null)
        {
            rects.Add(r);
            GUI.DrawTexture(r, bg != null ? bg : txPanel);
            return r;
        }

        bool Btn(Rect r, string text, bool enabled = true)
        {
            bool old = GUI.enabled;
            GUI.enabled = enabled;
            bool b = GUI.Button(r, text, stBtn);
            GUI.enabled = old;
            return b && !dragMoved;
        }

        void Bar(Rect r, float v, Color c)
        {
            GUI.DrawTexture(r, txBarBg);
            var old = GUI.color;
            GUI.color = c;
            GUI.DrawTexture(new Rect(r.x, r.y, r.width * Mathf.Clamp01(v), r.height), Texture2D.whiteTexture);
            GUI.color = old;
        }

        bool Header(Rect r, string title)
        {
            GUI.Label(new Rect(r.x + 18, r.y + 12, r.width - 100, 44), title, stTitle);
            return Btn(new Rect(r.xMax - 66, r.y + 10, 54, 50), "<b>X</b>");
        }

        static string Amount(float v)
        {
            if (v >= 1e6f) return (v / 1e6f).ToString("0.0") + "M";
            if (v >= 1e4f) return (v / 1e3f).ToString("0.0") + "k";
            return Mathf.FloorToInt(v).ToString();
        }

        static string Rate(float v)
        {
            float a = Mathf.Abs(v);
            string s = a >= 1e4f ? (a / 1e3f).ToString("0.0") + "k" : a >= 100f ? Mathf.RoundToInt(a).ToString() : a.ToString("0.#");
            return (v < 0 ? "-" : "+") + s;
        }

        string CostStr(float[] cost)
        {
            var sb = new StringBuilder();
            var S = Colony.I.S;
            for (int i = 0; i < 4; i++)
            {
                if (cost[i] <= 0) continue;
                if (sb.Length > 0) sb.Append("   ");
                bool ok = S.res[i] >= cost[i];
                sb.Append($"<color={(ok ? Defs.ResHex[i] : "#FF6A6A")}>{Defs.ResNames[i]} {Amount(cost[i])}</color>");
            }
            return sb.Length == 0 ? "kostenlos" : sb.ToString();
        }

        static string Clock(float dayTime)
        {
            int min = Mathf.FloorToInt(dayTime * 24f * 60f);
            return $"{min / 60:00}:{min % 60:00}";
        }

        // ---------- Zeichnen ----------

        void OnGUI()
        {
            var c = Colony.I;
            if (c == null || c.S == null) return;
            if (st == null) InitStyles();
            EnsureExtraStyles();
            if (Event.current.type == EventType.Layout) rects.Clear();

            sc = Mathf.Max(0.3f, Mathf.Min(Screen.width / 720f, Screen.height / 1280f));
            VW = Screen.width / sc;
            VH = Screen.height / sc;
            var sa = Screen.safeArea;
            top = (Screen.height - sa.yMax) / sc;
            bottom = sa.yMin / sc;
            GUI.matrix = Matrix4x4.Scale(new Vector3(sc, sc, 1f));

            WorldLabels(c);
            TopBar(c);
            Toasts(c);
            BottomBar(c);
            if (panel != null) BigPanel(c);
            else if (menu) MenuPanel(c);
            else if (Selected >= 0) PlotPanel(c);
            else if (Selected <= -1000) WattPanel(c);
            else { QuickButtons(c); WarnBox(c); }
            if (replay != null) ReplayView();
        }

        void WorldLabels(Colony c)
        {
            var cam = CameraRig.I != null ? CameraRig.I.Cam : null;
            if (cam == null) return;
            for (int i = 0; i < Colony.PlotCount; i++)
            {
                var p = c.S.plots[i];
                if (p.type < 0)
                {
                    // freie, schon freigeschaltete Plätze klein anzeigen
                    if (i == 0 || !WorldView.PlotVisible(c, i)) continue;
                    string blk = c.BuildBlocker(i, (BType)Defs.Layout[i]);
                    if (blk != null && (blk.StartsWith("Äußerer") || blk.StartsWith("Gelände") || blk.StartsWith("Erst die"))) continue;
                    var fp = cam.WorldToScreenPoint(WorldView.LabelPos(i) - Vector3.up * 4f);
                    if (fp.z < 0) continue;
                    string ft = "+ " + Defs.Get(Defs.Layout[i]).Name;
                    var fs = stWorld.CalcSize(new GUIContent(ft));
                    var fr = new Rect(fp.x / sc - fs.x / 2f - 10, (Screen.height - fp.y) / sc - 16, fs.x + 20, 32);
                    var old = GUI.color; GUI.color = new Color(1, 1, 1, 0.6f);
                    GUI.DrawTexture(fr, txLabel); GUI.Label(fr, ft, stWorld);
                    GUI.color = old;
                    continue;
                }
                var sp = cam.WorldToScreenPoint(WorldView.LabelPos(i));
                if (sp.z < 0) continue;
                float gx = sp.x / sc, gy = (Screen.height - sp.y) / sc;
                var d = Defs.Get(p.type);
                string txt = p.level > 0 ? $"{d.Name}  {p.level}" : d.Name;
                var size = stWorld.CalcSize(new GUIContent(txt));
                var r = new Rect(gx - size.x / 2f - 10, gy - 16, size.x + 20, 32);
                GUI.DrawTexture(r, txLabel);
                GUI.Label(r, txt, stWorld);
                if (p.buildLeft > 0f)
                {
                    Bar(new Rect(gx - 80, gy + 19, 160, 10), 1f - p.buildLeft / Mathf.Max(0.01f, p.buildTotal), new Color(0.4f, 0.85f, 1f));
                    GUI.Label(new Rect(gx - 80, gy + 30, 160, 22), Defs.Time(p.buildLeft), stWorldSmall);
                }
            }
        }

        void TopBar(Colony c)
        {
            var S = c.S;
            Panel(new Rect(0, 0, VW, top + 158));
            float x0 = VW / 2f - 352f, y = top + 8f;
            for (int i = 0; i < 4; i++)
            {
                var r = new Rect(x0 + i * 176f, y, 168f, 76f);
                GUI.DrawTexture(r, txCard);
                GUI.Label(new Rect(r.x + 10, r.y + 1, r.width - 12, 24), $"<color={Defs.ResHex[i]}><b>{Defs.ResNames[i]}</b></color>", stTiny);
                GUI.Label(new Rect(r.x + 10, r.y + 20, r.width - 12, 32), Amount(S.res[i]), stBig);
                float rate = c.RatePerMin[i];
                GUI.Label(new Rect(r.x + 10, r.y + 50, r.width - 12, 24), $"<color={(rate >= 0 ? "#8EF0A0" : "#FF7A7A")}>{Rate(rate)}/min</color>", stTiny);
            }
            y += 84f;

            float fb = c.Freeboard;
            string fbCol = fb >= 0.5f ? "#8EF0A0" : fb >= 0f ? "#FFD27A" : "#FF6A6A";
            string tide = c.WaterLevel < Colony.EbbLimit ? "Ebbe" : c.TideRising ? "Flut steigt" : "Wasser fällt";
            GUI.Label(new Rect(x0, y, 704, 30),
                $"Wasser <b>{c.WaterLevel:0.0} m</b> ({tide})   Deck {c.DeckHeight:0.0} m   Abstand <b><color={fbCol}>{(fb >= 0 ? "+" : "")}{fb:0.0} m</color></b>", stSmall);
            string line2 = $"Siedler <b>{S.survivors}/{c.Capacity}</b>   Krank <b>{S.sick}</b>   Arbeit {Mathf.RoundToInt(c.Efficiency * 100)}%   Tag {S.days} · {Clock(S.dayTime)}";
            if (c.Storm) line2 += "   <color=#FF6060><b>STURMFLUT!</b></color>";
            else if (c.StormWarning) line2 += $"   <color=#FFC060>Sturm in {Mathf.CeilToInt(S.stormTimer)}s</color>";
            GUI.Label(new Rect(x0, y + 30, 704, 30), line2, stSmall);
        }

        void Toasts(Colony c)
        {
            float y = top + 166f;
            int shown = 0;
            for (int i = c.Log.Count - 1; i >= 0 && shown < 3; i--)
            {
                var e = c.Log[i];
                float age = Time.time - e.Time;
                if (age > 5f) break;
                var old = GUI.color;
                GUI.color = new Color(1, 1, 1, Mathf.Clamp01(5f - age));
                var r = new Rect(VW / 2f - 330f, y + shown * 52f, 660f, 46f);
                GUI.DrawTexture(r, txToast);
                GUI.Label(new Rect(r.x + 10, r.y, r.width - 20, r.height), e.Text, stToast);
                GUI.color = old;
                shown++;
            }
        }

        void BottomBar(Colony c)
        {
            float h = 120f, y = VH - bottom - h;
            Panel(new Rect(0, y, VW, h + bottom));
            float x0 = VW / 2f - 352f, bw = 134f, step = 142.5f;
            string[] names = { "Truppen", "Karte", "Belohnung", "Stadt", "Menü" };
            string[] keys = { "troops", "map", "rewards", "city", "menu" };
            for (int k = 0; k < 5; k++)
            {
                string sub = "";
                if (k == 0) sub = $"{Units.Sum(c.S2.troops)} da";
                if (k == 1) sub = c.S2.marches.Count + c.S2.botMarches.Count > 0 ? $"{c.S2.marches.Count + c.S2.botMarches.Count} unterwegs" : "";
                if (k == 2) sub = RewardsReady(c) > 0 ? $"<color=#8EF0A0>{RewardsReady(c)} bereit</color>" : "";
                if (k == 3) sub = c.TraderHere ? "<color=#FFD27A>Händler!</color>" : c.S2.researchIdx >= 0 ? "forscht" : "";
                bool on = k == 4 ? menu : panel == keys[k];
                string label = (on ? "<color=#FFE08A>" : "") + $"<b>{names[k]}</b>" + (on ? "</color>" : "") + (sub != "" ? $"\n<size=16>{sub}</size>" : "");
                if (Btn(new Rect(x0 + step * k, y + 14, bw, 92), label))
                {
                    if (k == 4) { menu = !menu; confirmNew = false; panel = null; if (menu) Selected = -1; }
                    else OpenPanel(on ? null : keys[k]);
                }
            }
        }

        void PlotPanel(Colony c)
        {
            var p = c.S.plots[Selected];
            float w = 704f, x = VW / 2f - w / 2f, bottomY = VH - bottom - 130f;

            if (p.type < 0)
            {
                // Jeder Bauplatz hat sein festes Gebäude (wie in der Web-Fassung)
                float h = 80f + 86f + 60f;
                var r = Panel(new Rect(x, bottomY - h, w, h));
                if (Header(r, "Freier Bauplatz")) { Select(-1); return; }
                {
                    int t = Defs.Layout[Selected];
                    var d = Defs.All[t];
                    GUI.Label(new Rect(r.x + 18, r.y + 160, w - 36, 54), d.Desc, stTiny);
                    var row = new Rect(r.x + 12, r.y + 72, w - 24, 80);
                    GUI.DrawTexture(row, txCard);
                    GUI.Label(new Rect(row.x + 12, row.y + 4, row.width - 170, 28), $"<b>{d.Name}</b>  <size=16><color=#9FD8E0>{d.Short}</color></size>", st);
                    GUI.Label(new Rect(row.x + 12, row.y + 32, row.width - 170, 24), CostStr(d.CostFor(1)) + $"   ·  {Defs.Time(d.BuildTime(1))}", stTiny);
                    string blk = c.BuildBlocker(Selected, (BType)t);
                    if (blk != null && blk != "Zu wenig Rohstoffe")
                        GUI.Label(new Rect(row.x + 12, row.y + 54, row.width - 170, 22), $"<color=#FF8A8A>{blk}</color>", stTiny);
                    if (blk == "Alle Bautrupps beschäftigt" || blk == "Zu wenig Rohstoffe")
                    {
                        if (Btn(new Rect(row.xMax - 150, row.y + 12, 138, 56), "<size=18>Warte-\nschlange</size>")) { string e = c.QueueAdd(Selected, t); if (e != null) c.Msg(e); }
                    }
                    else if (Btn(new Rect(row.xMax - 150, row.y + 12, 138, 56), "Bauen", blk == null)) c.StartBuild(Selected, (BType)t);
                }
                return;
            }

            var def = Defs.Get(p.type);
            float hh = 440f;
            var pr = Panel(new Rect(x, bottomY - hh, w, hh));
            if (Header(pr, p.level > 0 ? $"{def.Name} · Stufe {p.level}" : $"{def.Name} (im Bau)")) { Select(-1); return; }
            float y = pr.y + 66f;
            GUI.Label(new Rect(pr.x + 18, y, w - 36, 54), def.Desc, stSmall);
            y += 58f;

            if (p.level > 0)
                foreach (var line in InfoLines(c, def, p.level))
                {
                    GUI.Label(new Rect(pr.x + 18, y, w - 36, 30), line, st);
                    y += 30f;
                }

            if (p.buildLeft > 0f)
            {
                GUI.Label(new Rect(pr.x + 18, y + 4, w - 36, 30), $"Bauarbeiten: noch {Defs.Time(p.buildLeft)}", st);
                Bar(new Rect(pr.x + 18, y + 38, w - 36, 22), 1f - p.buildLeft / Mathf.Max(0.01f, p.buildTotal), new Color(0.4f, 0.85f, 1f));
                SpeedButtons(c, new Rect(pr.x + 18, pr.yMax - 86, 400, 70), "plot", Selected);
            }
            else if (p.level < def.MaxLevel)
            {
                string blk = c.UpgradeBlocker(Selected);
                GUI.Label(new Rect(pr.x + 18, y + 6, w - 36, 28), $"Ausbau auf Stufe {p.level + 1}:  {CostStr(def.CostFor(p.level + 1))}   ·  {Defs.Time(def.BuildTime(p.level + 1))}", stSmall);
                if (blk != null && blk != "Zu wenig Rohstoffe")
                    GUI.Label(new Rect(pr.x + 18, y + 34, w - 36, 26), $"<color=#FF8A8A>{blk}</color>", stSmall);
                if (blk == "Alle Bautrupps beschäftigt" || blk == "Zu wenig Rohstoffe")
                {
                    if (Btn(new Rect(pr.x + 18, pr.yMax - 86, 330, 70), "<b>In Warteschlange</b>")) { string e = c.QueueAdd(Selected, -1); if (e != null) c.Msg(e); }
                }
                else if (Btn(new Rect(pr.x + 18, pr.yMax - 86, 330, 70), $"<b>Ausbauen → {p.level + 1}</b>", blk == null)) c.StartUpgrade(Selected);
            }
            else GUI.Label(new Rect(pr.x + 18, y + 6, w - 36, 28), "Maximale Stufe erreicht.", stSmall);

            if (Selected != 0)
            {
                var dr = new Rect(pr.xMax - 300, pr.yMax - 86, 282, 70);
                if (!confirmDemolish) { if (Btn(dr, "Abreißen")) confirmDemolish = true; }
                else if (Btn(dr, "<color=#FFB0A0><b>Wirklich abreißen?</b></color>"))
                {
                    c.Demolish(Selected);
                    Select(-1);
                }
            }
        }

        static IEnumerable<string> InfoLines(Colony c, BuildingDef d, int L)
        {
            switch (d.Type)
            {
                case BType.Gezeitenturm:
                    yield return $"Deckhöhe der Stadt: <b>{Colony.DeckFor(L):0.00} m</b>  (nächste Stufe {Colony.DeckFor(L + 1):0.00} m)";
                    yield return $"Leuchtfeuer verbraucht {Colony.BeaconWoodPerSec(L) * 60f:0} Holz/min";
                    yield return $"Andere Gebäude bis Stufe {L}";
                    break;
                case BType.Unterkunft:
                    yield return $"Platz für <b>{6 * L}</b> Siedler";
                    break;
                case BType.Kueche:
                    yield return $"Alle Produktion +{Mathf.Min(60, 6 * L)} %";
                    break;
                case BType.Lager:
                    yield return $"Lagerplatz je Rohstoff: <b>{c.Storage}</b>";
                    break;
                case BType.Damm:
                    yield return $"Dammkrone: <b>{3.0f + 0.25f * L:0.00} m</b>" + (c.DamHolds ? "  ·  hält gerade die Flut ab" : "");
                    break;
                case BType.Wahrzeichen:
                    yield return $"Alle Produktion +{2 * L} %";
                    break;
                case BType.Heilerhuette:
                    yield return $"Heilung etwa {1 + 5 * L}× so schnell";
                    break;
                case BType.Raeucherei:
                    yield return $"Muschelverbrauch −{Mathf.Min(50, 8 * L)} %";
                    break;
                default:
                    if (d.Produces >= 0)
                    {
                        yield return $"Produktion: <b>{d.RateAt(L) * 60f * c.Efficiency:0}</b>/min {Defs.ResNames[d.Produces]} (Arbeit {Mathf.RoundToInt(c.Efficiency * 100)} %)";
                        yield return $"Arbeiter: {d.WorkersPerLevel * L}   ·   Stufe {L + 1}: {d.RateAt(L + 1) * 60f:0}/min";
                    }
                    break;
            }
            if (d.WorkersPerLevel > 0 && d.Produces < 0) yield return $"Arbeiter: {d.WorkersPerLevel * L}";
        }

        void MenuPanel(Colony c)
        {
            float w = 704f, h = 600f;
            var r = Panel(new Rect(VW / 2f - w / 2f, VH / 2f - h / 2f, w, h));
            if (Header(r, "Pfahlstadt – Menü")) { menu = false; return; }
            var g = GraphicsQuality.I;
            float y = r.y + 72f;
            string[] lines =
            {
                $"Grafikstufe: <b>{(g.Auto ? "Automatisch → " : "")}{g.Tier}</b>",
                $"Auflösung: <b>{g.RenderRes.x} × {g.RenderRes.y}</b> (Ultra: volle Auflösung, max. 8K)",
                $"Bildrate: <b>{g.Fps:0} FPS</b> (Ziel {g.TargetFps})",
                $"Gerät: {SystemInfo.systemMemorySize} MB RAM · {SystemInfo.graphicsDeviceName}",
            };
            foreach (var l in lines) { GUI.Label(new Rect(r.x + 18, y, w - 36, 30), l, stSmall); y += 32f; }

            y += 8f;
            if (Btn(new Rect(r.x + 18, y, (w - 46) / 2, 70), $"Grafik: {(g.Auto ? "Auto · " : "")}{g.Tier}")) g.Cycle();
            if (Btn(new Rect(r.x + 28 + (w - 46) / 2, y, (w - 46) / 2, 70), "Spiel speichern")) { c.Save(); c.Msg("Spielstand gespeichert."); }
            y += 84f;
            if (!confirmNew) { if (Btn(new Rect(r.x + 18, y, w - 36, 70), "Neues Spiel")) confirmNew = true; }
            else if (Btn(new Rect(r.x + 18, y, w - 36, 70), "<color=#FFB0A0><b>Wirklich neu anfangen? Alles geht verloren</b></color>"))
            {
                c.NewGame();
                confirmNew = false;
                menu = false;
            }
            y += 84f;
            GUI.Label(new Rect(r.x + 18, y, w - 36, 80),
                "Tipp: Wattwandern geht nur bei Ebbe. Muscheln wachsen bei Ebbe, Taucher arbeiten bei Flut, Regenfänger lieben Stürme.", stTiny);
        }
    }
}
