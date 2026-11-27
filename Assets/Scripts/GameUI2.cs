using System.Collections.Generic;
using UnityEngine;

namespace Pfahlstadt
{
    /// Große Fenster mit Reitern: Truppen, Seekarte, Belohnungen, Stadt – blättern durch Wischen
    public partial class GameUI
    {
        string panel, tab = "";
        float scrollY, contentH;
        bool dragMoved, touchInContent;
        Vector2 touchStart;
        Rect contentRect;
        float W = 680f;

        readonly int[] form = new int[5];
        int capSel = -1, trainN = 5, mapTerr = -1, mapBot = -1;
        string confirmKey;
        Replay replay; float replayT;
        Texture2D txDot, txGood, txBad, txSea, txSel;
        GUIStyle stMid, stTinyC;

        void EnsureExtraStyles()
        {
            if (stMid != null) return;
            stMid = new GUIStyle(stSmall) { alignment = TextAnchor.MiddleCenter, wordWrap = true };
            stTinyC = new GUIStyle(stTiny) { alignment = TextAnchor.MiddleCenter, wordWrap = false };
            txGood = Tex(new Color(0.12f, 0.32f, 0.2f, 0.95f));
            txBad = Tex(new Color(0.36f, 0.14f, 0.12f, 0.95f));
            txSea = Tex(new Color(0.08f, 0.32f, 0.45f, 1f));
            txSel = Tex(new Color(1f, 0.85f, 0.4f, 0.35f));
            const int S = 48;
            txDot = new Texture2D(S, S, TextureFormat.RGBA32, false) { hideFlags = HideFlags.DontSave };
            for (int y = 0; y < S; y++)
                for (int x = 0; x < S; x++)
                {
                    float d = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), new Vector2(S / 2f, S / 2f)) / (S / 2f);
                    txDot.SetPixel(x, y, new Color(1, 1, 1, Mathf.Clamp01((1f - d) * 6f)));
                }
            txDot.Apply();
        }

        // ---------- Wischen zum Blättern ----------
        void Update()
        {
            if (panel == null || sc <= 0) return;
            if (Input.touchCount == 1)
            {
                var t = Input.GetTouch(0);
                var gp = new Vector2(t.position.x / sc, (Screen.height - t.position.y) / sc);
                if (t.phase == TouchPhase.Began) { touchInContent = contentRect.Contains(gp); mapTouch = panel == "map" && mapRect.Contains(gp); dragMoved = false; touchStart = gp; }
                else if (t.phase == TouchPhase.Moved && mapTouch)
                {
                    if ((gp - touchStart).magnitude > 14f) dragMoved = true;
                    if (dragMoved) mapOff += new Vector2(t.deltaPosition.x, -t.deltaPosition.y) / sc;
                }
                else if (t.phase == TouchPhase.Moved && touchInContent)
                {
                    if ((gp - touchStart).magnitude > 14f) dragMoved = true;
                    if (dragMoved) scrollY += t.deltaPosition.y / sc;
                }
            }
            else if (Input.touchCount == 0 && Input.GetMouseButtonDown(0)) dragMoved = false;
            float wheel = Input.mouseScrollDelta.y;
            if (Mathf.Abs(wheel) > 0.01f) scrollY -= wheel * 60f;
            scrollY = Mathf.Clamp(scrollY, 0, Mathf.Max(0, contentH - contentRect.height));
        }

        void OpenPanel(string key)
        {
            panel = key; scrollY = 0; Selected = -1; menu = false; confirmKey = null;
            tab = key == "troops" ? "train" : key == "rewards" ? "daily" : key == "city" ? "tech" : key == "ally" ? "main" : key == "admin" ? "msg" : "";
            if (key == "map") { mapTerr = -1; mapBot = -1; mapSel = null; }
            OnTab();
            System.Array.Clear(form, 0, 5);
        }

        // ---------- Rahmen ----------
        void BigPanel(Colony c)
        {
            EnsureExtraStyles();
            float x = VW / 2f - 352f, w = 704f, y0 = top + 166f, y1 = VH - bottom - 128f;
            var r = Panel(new Rect(x, y0, w, y1 - y0));
            bool on = Online.I != null && Online.I.Active;
            string title = panel == "troops" ? "Truppen" : panel == "map" ? "Seekarte" : panel == "rewards" ? "Belohnungen" : panel == "ally" ? "Allianz" : panel == "admin" ? "Spielleiter" : panel == "acc" ? "Online & Konto" : "Stadt";
            if (Header(r, title)) { panel = null; return; }
            float ty = r.y + 70f;
            string[][] tabs = panel == "troops" ? (on ? new[] { new[] { "train", "Truppen" }, new[] { "form", "Aufst." }, new[] { "caps", "Kapitäne" }, new[] { "laz", "Lazarett" }, new[] { "arena", "Arena" }, new[] { "rep", "Berichte" } }
                    : new[] { new[] { "train", "Truppen" }, new[] { "form", "Aufstellung" }, new[] { "caps", "Kapitäne" }, new[] { "laz", "Lazarett" }, new[] { "rep", "Berichte" } })
                : panel == "ally" ? (on && Online.I.InAlliance ? new[] { new[] { "main", "Allianz" }, new[] { "help", "Hilfe" }, new[] { "garr", "Burg" }, new[] { "res", "Forschung" }, new[] { "war", "Krieg" }, new[] { "rally", "Sammeln" } } : new string[0][])
                : panel == "admin" ? new[] { new[] { "msg", "Nachricht" }, new[] { "codes", "Codes" }, new[] { "players", "Spieler" }, new[] { "av", "Bilder" } }
                : panel == "rewards" ? new[] { new[] { "daily", "Täglich" }, new[] { "quest", "Aufgaben" }, new[] { "pass", "Pass" }, new[] { "vip", "VIP" }, new[] { "items", "Lager" }, new[] { "ach", "Erfolge" } }
                : panel == "city" ? (on ? new[] { new[] { "tech", "Forschung" }, new[] { "yard", "Werft" }, new[] { "trade", "Händler" }, new[] { "queue", "Schlange" }, new[] { "rank", "Rang" }, new[] { "season", "Saison" } }
                    : new[] { new[] { "tech", "Forschung" }, new[] { "yard", "Werft" }, new[] { "trade", "Händler" }, new[] { "queue", "Schlange" }, new[] { "season", "Saison" } })
                : new string[0][];
            if (tabs.Length > 0)
            {
                float tw = (w - 24) / tabs.Length;
                for (int k = 0; k < tabs.Length; k++)
                {
                    bool sel = tab == tabs[k][0];
                    if (Btn(new Rect(x + 12 + k * tw, ty, tw - 6, 58), (sel ? "<color=#FFE08A><b>" : "<size=19>") + tabs[k][1] + (sel ? "</b></color>" : "</size>")))
                    { tab = tabs[k][0]; scrollY = 0; confirmKey = null; OnTab(); }
                }
                ty += 66f;
            }
            if (panel == "map")
            {
                var mr = new Rect(x + 12, ty, w - 24, Mathf.Min(560f, (y1 - ty) * 0.55f));
                if (on) SeaMapOnline(c, mr); else SeaMap(c, mr);
                ty = mr.yMax + 8f;
            }
            contentRect = new Rect(x + 12, ty, w - 24, y1 - ty - 10f);
            W = contentRect.width;
            GUI.BeginGroup(contentRect);
            float y = -scrollY;
            switch (panel)
            {
                case "troops":
                    if (tab == "train") y = TroopsTab(c, y); else if (tab == "form") y = FormTab(c, y); else if (tab == "caps") y = CaptainsTab(c, y);
                    else if (tab == "laz") y = LazTab(c, y); else if (tab == "arena") y = ArenaTab(c, y); else y = on ? OnlineReportsTab(c, y) : ReportsTab(c, y);
                    break;
                case "rewards":
                    if (tab == "daily") y = DailyTab(c, y); else if (tab == "quest") y = QuestTab(c, y); else if (tab == "pass") y = PassTab(c, y);
                    else if (tab == "vip") y = VipTab(c, y); else if (tab == "items") y = ItemsTab(c, y); else y = AchTab(c, y);
                    break;
                case "city":
                    if (tab == "tech") y = TechTab(c, y); else if (tab == "yard") y = YardTab(c, y); else if (tab == "trade") y = TradeTab(c, y);
                    else if (tab == "queue") y = QueueTab(c, y); else if (tab == "rank") y = RankTab(c, y); else y = SeasonTab(c, y);
                    break;
                case "map": y = on ? MapDetailsOnline(c, y) : MapDetails(c, y); break;
                case "ally": y = AllyContent(c, y); break;
                case "admin": y = AdminContent(c, y); break;
                case "acc": y = AccountContent(c, y); break;
            }
            contentH = y + scrollY + 20f;
            GUI.EndGroup();
            if (contentH > contentRect.height)
            {
                float vis = contentRect.height / contentH, pos = scrollY / Mathf.Max(1, contentH - contentRect.height);
                var sb = new Rect(contentRect.xMax + 2, contentRect.y + pos * contentRect.height * (1 - vis), 6, contentRect.height * vis);
                GUI.DrawTexture(sb, txBarBg);
            }
        }

        // ---------- kleine Bausteine (im Fenster) ----------
        float Txt(float y, string t, GUIStyle s, float indent = 0)
        {
            float h = s.CalcHeight(new GUIContent(t), W - indent);
            GUI.Label(new Rect(indent, y, W - indent, h), t, s);
            return y + h + 4f;
        }
        void Card(float y, float h, Texture2D tex = null) => GUI.DrawTexture(new Rect(0, y, W, h), tex != null ? tex : txCard);
        float Sub(float y, string t) { GUI.Label(new Rect(0, y + 6, W, 34), $"<b><color=#9FD8E0>{t}</color></b>", st); return y + 42f; }
        static string Res4(float[] r)
        {
            var parts = new List<string>();
            for (int i = 0; i < 4; i++) if (r[i] > 0) parts.Add($"<color={Defs.ResHex[i]}>{Defs.ResNames[i]} {Amount(r[i])}</color>");
            return parts.Count > 0 ? string.Join("  ", parts) : "";
        }
        static string ItemStr(int[] it)
        {
            var parts = new List<string>();
            for (int i = 0; i < 5; i++) if (it[i] > 0) parts.Add($"Beschl. {Items.Names[i]} ×{it[i]}");
            return string.Join(", ", parts);
        }
        static string Pct(float f) => (f >= 0 ? "+" : "−") + Mathf.RoundToInt(Mathf.Abs(f) * 100) + " %";

        /// Beschleuniger-Knöpfe (die drei kleinsten vorhandenen)
        void SpeedButtons(Colony c, Rect r, string kind, int target)
        {
            int shown = 0; float bw = (r.width - 12) / 3f;
            for (int i = 0; i < 5 && shown < 3; i++)
            {
                if (c.S2.items[i] <= 0) continue;
                if (Btn(new Rect(r.x + shown * (bw + 6), r.y, bw, r.height), $"<size=17>Beschl.\n{Items.Names[i]} ×{c.S2.items[i]}</size>"))
                { string e = c.UseSpeed(i, kind, target); if (e != null) c.Msg(e); }
                shown++;
            }
        }

        int RewardsReady(Colony c)
        {
            int n = 0;
            if (c.DailyCan) n++;
            foreach (var q in c.QuestsToday()) if (!q.done && q.have >= q.n) n++;
            int t = c.PassTier; for (int k = 1; k <= t; k++) if (!c.S2.passGot.Contains(k)) n++;
            if (c.VipChestCan) n++;
            return n;
        }

        // ---------- Truppen ----------
        float TroopsTab(Colony c, float y)
        {
            var s = c.S2;
            y = Txt(y, $"Zu Hause: <b>{Units.Text(s.troops)}</b>", st);
            y = Txt(y, $"Unterwegs: {Units.Text(c.TroopsAway)}   ·   Verteidigung <b>{c.Defense}</b>   ·   Unterhalt {c.Upkeep:0.#} Muscheln/min", stSmall);
            if (c.Levels(BType.Kaserne) <= 0) y = Txt(y, "<color=#FF8A8A>Ohne Kaserne keine Ausbildung. Bau zuerst die Kaserne.</color>", stSmall);
            else
            {
                y = Txt(y, $"Ausbildungsschlange: {c.Queued}/{c.TrainSlots}", stSmall);
                if (s.train.Count > 0)
                {
                    var q = s.train[0];
                    y = Txt(y, $"Gerade: {q.n}× {Units.All[q.u].Name} · nächster in {Defs.Time(q.left)}" + (s.train.Count > 1 ? $" · danach {s.train.Count - 1} weitere Gruppen" : ""), stSmall);
                    SpeedButtons(c, new Rect(0, y, W, 60), "train", 0); y += 68f;
                }
            }
            // Anzahl wählen
            GUI.Label(new Rect(0, y + 14, 200, 40), "Anzahl:", st);
            if (Btn(new Rect(150, y, 90, 60), "−10")) trainN = Mathf.Max(1, trainN - 10);
            if (Btn(new Rect(246, y, 70, 60), "−1")) trainN = Mathf.Max(1, trainN - 1);
            GUI.Label(new Rect(322, y, 90, 60), $"<b>{trainN}</b>", stMid);
            if (Btn(new Rect(418, y, 70, 60), "+1")) trainN = Mathf.Min(200, trainN + 1);
            if (Btn(new Rect(494, y, 90, 60), "+10")) trainN = Mathf.Min(200, trainN + 10);
            y += 70f;
            for (int u = 0; u < Units.N; u++)
            {
                var d = Units.All[u];
                float h = 150f;
                Card(y, h);
                GUI.Label(new Rect(12, y + 6, W - 200, 32), $"<b>{d.Name}</b>  <size=17>Angriff {d.Att} · Abwehr {d.Def} · Last {d.Carry}</size>", st);
                GUI.Label(new Rect(12, y + 38, W - 200, 48), d.Info, stTiny);
                GUI.Label(new Rect(12, y + 86, W - 200, 28), $"Vorhanden: <b>{s.troops[u]}</b>   Kosten {trainN}×: " + Res4(Units.CostOf(u, trainN)), stTiny);
                string blk = c.TrainBlocker(u, trainN);
                if (blk != null && blk != "Zu wenig Rohstoffe") GUI.Label(new Rect(12, y + 114, W - 200, 28), $"<color=#FF8A8A>{blk}</color>", stTiny);
                if (Btn(new Rect(W - 180, y + 12, 168, 64), "Ausbilden", blk == null)) c.StartTrain(u, trainN);
                string ck = "dis" + u;
                if (s.troops[u] > 0 && Btn(new Rect(W - 180, y + 82, 168, 56), confirmKey == ck ? "<color=#FFB0A0>Sicher?</color>" : $"<size=17>{Mathf.Min(trainN, s.troops[u])} entlassen</size>"))
                { if (confirmKey == ck) { c.Dismiss(u, trainN); confirmKey = null; } else confirmKey = ck; }
                y += h + 8f;
            }
            return y;
        }

        float FormTab(Colony c, float y)
        {
            var f = c.S2.formation; float m = Units.FormMul(f);
            y = Txt(y, "Lege fest, wo deine Verteidiger stehen, wenn Piraten oder andere Spieler angreifen.", stSmall);
            y = Txt(y, $"Aufstellungs-Bonus: <b><color={(m >= 1.1f ? "#8EF0A0" : m >= 1f ? "#FFD27A" : "#FF7A7A")}>{Pct(m - 1)}</color></b> auf die Kampfkraft deiner Verteidiger", st);
            for (int row = 2; row >= 0; row--)
            {
                var names = new List<string>();
                for (int u = 0; u < 5; u++) if (f[u] == row) names.Add($"{Units.All[u].Short} {c.S2.troops[u]}");
                Card(y, 46);
                GUI.Label(new Rect(12, y + 6, W - 24, 36), $"<b>{Units.Rows[row]}:</b>  " + (names.Count > 0 ? string.Join("   ", names) : "leer"), stSmall);
                y += 50f;
            }
            GUI.Label(new Rect(0, y, W, 30), "Stadttor", stTinyC); y += 36f;
            for (int u = 0; u < 5; u++)
            {
                GUI.Label(new Rect(0, y + 14, 230, 40), $"<b>{Units.All[u].Name}</b>", st);
                for (int row = 0; row < 3; row++)
                    if (Btn(new Rect(236 + row * 148, y, 140, 58), f[u] == row ? $"<color=#FFE08A><b>{Units.Rows[row]}</b></color>" : $"<size=18>{Units.Rows[row]}</size>")) c.SetRow(u, row);
                y += 64f;
            }
            y = Sub(y, "Schnellwahl");
            for (int k = 0; k < 3; k++) if (Btn(new Rect(k * (W / 3f), y, W / 3f - 8, 60), Units.FormNames[k])) c.SetFormation(k);
            y += 70f;
            y = Txt(y, "Schildwachen vorne fangen die Angreifer ab (+6 %). Harpuniere und Schleuderer hinten schießen geschützt (je +4 %, vorne −4 %). Enterer in der Mitte springen ein, wo es brennt (+3 %).", stTiny);
            return y;
        }

        float CaptainsTab(Colony c, float y)
        {
            var s = c.S2;
            y = Txt(y, $"Kapitänsabzeichen: <b>{s.medals}</b>   ·   Schmiedeeisen: <b>{s.ore}</b>", st);
            y = Txt(y, "Abzeichen gibt es für versenkte Piratenschiffe, die VIP-Truhe und den Pass. Ein Kapitän führt einen Trupp an und gibt ihm seinen Bonus.", stTiny);
            for (int k = 0; k < 5; k++)
            {
                var d = Prog.Captains[k]; int L = s.capLvl[k];
                Card(y, 110);
                GUI.Label(new Rect(12, y + 6, W - 200, 32), $"<b>{d.Name}</b>" + (L > 0 ? $"  Stufe {L}" : ""), st);
                GUI.Label(new Rect(12, y + 40, W - 200, 60), d.Text + (L > 0 && !c.CapFree(k) ? "  ·  <color=#FFD27A>unterwegs</color>" : ""), stSmall);
                if (L <= 0) { if (Btn(new Rect(W - 180, y + 20, 168, 70), $"<size=18>Anheuern\n{d.Cost} Abz.</size>", s.medals >= d.Cost)) { string e = c.HireCaptain(k); if (e != null) c.Msg(e); } }
                else if (L < 10 && Btn(new Rect(W - 180, y + 20, 168, 70), $"<size=18>Stufe {L + 1}\n{L * 2} Abz.</size>", s.medals >= L * 2)) { string e = c.UpCaptain(k); if (e != null) c.Msg(e); }
                y += 118f;
            }
            y = Sub(y, "Schmiede (Ausrüstung)");
            y = Txt(y, "Schmiedeeisen gibt es von Piratenschiffen, Schätzen im Watt, geräumten Wracks und Felsen.", stTiny);
            for (int k = 0; k < 5; k++)
            {
                if (s.capLvl[k] <= 0) continue;
                y = Txt(y, $"<b>{Prog.Captains[k].Name}</b>", st);
                for (int g = 0; g < 4; g++)
                {
                    int L = c.GearLv(k, g); string blk = c.GearBlocker(k, g);
                    Card(y, 84);
                    GUI.Label(new Rect(12, y + 4, W - 200, 30), $"{Prog.Gear[g].Name}  Stufe {L}/{Prog.GearMax}", st);
                    GUI.Label(new Rect(12, y + 36, W - 200, 44), L < Prog.GearMax ? $"{Prog.Gear[g].Text} · nächste: {Colony.GearOre(L + 1)} Eisen, {Colony.GearMetal(L + 1)} Altmetall" : Prog.Gear[g].Text, stTiny);
                    if (L < Prog.GearMax && Btn(new Rect(W - 180, y + 12, 168, 60), L > 0 ? "Verbessern" : "Schmieden", blk == null)) { string e = c.Forge(k, g); if (e != null) c.Msg(e); }
                    y += 90f;
                }
            }
            return y;
        }

        float LazTab(Colony c, float y)
        {
            int L = c.Levels(BType.Lazarett);
            if (L <= 0) return Txt(y, "Noch kein Lazarett. Mit Lazarett kommt ein Teil der gefallenen Krieger verwundet zurück und wird hier wieder gesund.", stSmall);
            int w = Units.Sum(c.S2.wounded);
            y = Txt(y, $"Verwundete: <b>{w}</b> / {Colony.LazBeds(L)} Betten   ·   rettet {Mathf.RoundToInt(Mathf.Min(0.8f, Colony.LazSave(L) + c.M.Save) * 100)} % der Gefallenen", st);
            y = Txt(y, Units.Text(c.S2.wounded), stSmall);
            y = Txt(y, $"Heilt etwa {L} Krieger je 8 Sekunden (kostet etwas Muscheln und Wasser).", stTiny);
            if (w > 0) { SpeedButtons(c, new Rect(0, y, W, 60), "heal", 0); y += 68f; }
            return y;
        }

        float ReportsTab(Colony c, float y)
        {
            var list = c.S2.reports;
            if (list.Count == 0) return Txt(y, "Noch keine Berichte.", stSmall);
            for (int k = 0; k < list.Count; k++)
            {
                var r = list[k];
                float h = Mathf.Max(64f, stSmall.CalcHeight(new GUIContent(r.text), W - (r.hasRp ? 150 : 24)) + 36f);
                Card(y, h, r.win > 0 ? txGood : r.win < 0 ? txBad : null);
                GUI.Label(new Rect(12, y + 4, W - 24, 24), $"Tag {r.day} · {Clock(r.time)}", stTiny);
                GUI.Label(new Rect(12, y + 28, W - (r.hasRp ? 150 : 24), h - 30), r.text, stSmall);
                if (r.hasRp && Btn(new Rect(W - 130, y + 10, 118, 54), "Ansehen")) { replay = r.rp; replayT = 0; }
                y += h + 6f;
            }
            return y;
        }

        // ---------- Belohnungen ----------
        float DailyTab(Colony c, float y)
        {
            int day = c.DailyDay; bool can = c.DailyCan;
            y = Txt(y, "Jeden Tag eine Belohnung – sieben Tage am Stück werden immer besser.", stSmall);
            for (int d = 0; d < 7; d++)
            {
                bool now = d == day, done = !can ? d <= day : d < day;
                Card(y, 66, now && can ? txGood : null);
                string u = Units.Sum(c.DailyUnitsFor(d)) > 0 ? " · " + Units.Text(c.DailyUnitsFor(d)) : "";
                GUI.Label(new Rect(12, y + 4, W - 24, 60), $"<b>Tag {d + 1}</b>{(done ? "  (abgeholt)" : "")}\n<size=17>{Res4(c.DailyResFor(d))}{u}</size>", stSmall);
                y += 72f;
            }
            if (Btn(new Rect(0, y, W, 70), can ? "<b>Heutige Belohnung abholen</b>" : "Heute schon abgeholt – morgen wieder!", can)) c.ClaimDaily();
            return y + 80f;
        }

        float QuestTab(Colony c, float y)
        {
            y = Txt(y, "Drei neue Aufgaben jeden Tag.", stSmall);
            var list = c.QuestsToday();
            for (int k = 0; k < list.Count; k++)
            {
                var q = list[k];
                Card(y, 110, q.done ? txGood : null);
                GUI.Label(new Rect(12, y + 6, W - 200, 32), c.QuestText(q), st);
                Bar(new Rect(12, y + 44, W - 220, 16), q.have / (float)q.n, new Color(0.4f, 0.85f, 1f));
                GUI.Label(new Rect(12, y + 64, W - 200, 40), $"{q.have}/{q.n}   {Res4(c.QuestReward(q))}", stTiny);
                if (!q.done && Btn(new Rect(W - 180, y + 20, 168, 70), "Abholen", q.have >= q.n)) c.ClaimQuest(k);
                if (q.done) GUI.Label(new Rect(W - 180, y + 20, 168, 70), "erledigt", stMid);
                y += 118f;
            }
            return y;
        }

        float PassTab(Colony c, float y)
        {
            int tier = c.PassTier; float into = c.S2.passXp - tier * Colony.PassXpPer;
            y = Txt(y, $"Saison-Pass (kostenlos, jeden Monat neu): <b>Stufe {tier}/{Colony.PassTiers}</b>", st);
            if (tier < Colony.PassTiers) { Bar(new Rect(0, y, W, 18), into / Colony.PassXpPer, new Color(1f, 0.8f, 0.3f)); y += 24f; y = Txt(y, $"{Mathf.FloorToInt(into)}/{Colony.PassXpPer} Punkte bis zur nächsten Stufe. Punkte gibt es fürs Bauen, Kämpfen, Sammeln, Handeln …", stTiny); }
            for (int t = 1; t <= Colony.PassTiers; t++)
            {
                c.PassReward(t, out var res, out var items, out var u);
                bool got = c.S2.passGot.Contains(t), ready = t <= tier && !got;
                string txt = string.Join("  ", new[] { Res4(res), ItemStr(items), Units.Sum(u) > 0 ? Units.Text(u) : "", t % 5 == 0 ? "2 Abzeichen" : "" }).Trim();
                Card(y, 64, ready ? txGood : null);
                GUI.Label(new Rect(12, y + 4, W - 200, 58), $"<b>Stufe {t}</b>{(got ? "  (abgeholt)" : "")}\n<size=16>{txt}</size>", stSmall);
                if (ready && Btn(new Rect(W - 170, y + 6, 158, 52), "Abholen")) c.ClaimPass(t);
                y += 70f;
            }
            return y;
        }

        float VipTab(Colony c, float y)
        {
            int L = c.VipLevel, pts = c.S2.vipPts;
            y = Txt(y, $"<b>VIP-Stufe {L}</b>   ·   {pts} Punkte" + (L < 10 ? $"   ·   nächste Stufe bei {Prog.VipPts[L + 1]}" : ""), st);
            if (L < 10) { Bar(new Rect(0, y, W, 16), (pts - Prog.VipPts[L]) / (float)(Prog.VipPts[L + 1] - Prog.VipPts[L]), new Color(1f, 0.8f, 0.3f)); y += 22f; }
            y = Txt(y, "VIP-Punkte gibt es für die Tagesbelohnung, Aufgaben, den Pass, Schätze, Hindernisse und versenkte Piratenschiffe.", stTiny);
            if (L >= 1)
            {
                c.VipChest(out var res, out var items, out var medals);
                y = Txt(y, $"Tägliche VIP-Truhe: {Res4(res)}  {ItemStr(items)}  {medals} Abzeichen", stSmall);
                if (Btn(new Rect(0, y, W, 64), c.VipChestCan ? "<b>VIP-Truhe öffnen</b>" : "Heute schon geöffnet", c.VipChestCan)) c.ClaimVipChest();
                y += 72f;
            }
            for (int k = 1; k <= 10; k++)
            {
                Card(y, 64, k <= L ? txGood : null);
                GUI.Label(new Rect(12, y + 4, W - 24, 58), $"<b>VIP {k}</b>  <size=16>ab {Prog.VipPts[k]} Punkten</size>\n<size=16>{Prog.VipPerks[k]}</size>", stSmall);
                y += 70f;
            }
            return y;
        }

        float ItemsTab(Colony c, float y)
        {
            var s = c.S2;
            y = Txt(y, $"Kapitänsabzeichen: <b>{s.medals}</b>   ·   Schmiedeeisen: <b>{s.ore}</b>", st);
            y = Sub(y, "Beschleuniger");
            y = Txt(y, "Einsetzen kannst du sie direkt beim Gebäude, bei der Ausbildung, im Lazarett, bei der Forschung, in der Werft und bei Märschen.", stTiny);
            for (int i = 0; i < 5; i++) { Card(y, 50); GUI.Label(new Rect(12, y + 8, W - 24, 36), $"Beschleuniger {Items.Names[i]}:  <b>{s.items[i]}</b>", st); y += 56f; }
            return y;
        }

        float AchTab(Colony c, float y)
        {
            y = Txt(y, $"{c.S2.ach.Count} von {Colony.Achievements.Length} Erfolgen", st);
            foreach (var a in Colony.Achievements)
            {
                bool ok = c.S2.ach.Contains(a.Id);
                Card(y, 60, ok ? txGood : null);
                GUI.Label(new Rect(12, y + 4, W - 24, 56), $"<b>{a.Name}</b>{(ok ? "  (geschafft)" : "")}\n<size=16>{a.Text}</size>", stSmall);
                y += 66f;
            }
            return y;
        }

        // ---------- Stadt ----------
        float TechTab(Colony c, float y)
        {
            int ak = c.Levels(BType.Akademie);
            if (ak <= 0) return Txt(y, "Für Forschung brauchst du die Seefahrer-Akademie (im dritten Ring).", stSmall);
            y = Txt(y, $"Akademie Stufe {ak}: forscht {Mathf.RoundToInt(10 * (ak - 1))} % schneller. Höhere Forschungsstufen brauchen eine höhere Akademie.", stSmall);
            if (c.S2.researchIdx >= 0)
            {
                y = Txt(y, $"Gerade: <b>{Prog.Tech[c.S2.researchIdx].Name}</b> · noch {Defs.Time(c.S2.researchLeft)}", st);
                Bar(new Rect(0, y, W, 16), 1 - c.S2.researchLeft / Mathf.Max(1, c.S2.researchTotal), new Color(0.4f, 0.85f, 1f)); y += 22f;
                SpeedButtons(c, new Rect(0, y, W, 60), "research", 0); y += 68f;
            }
            for (int k = 0; k < Prog.Tech.Length; k++)
            {
                var t = Prog.Tech[k]; int L = c.S2.tech[k]; string blk = c.TechBlocker(k);
                Card(y, 104);
                GUI.Label(new Rect(12, y + 4, W - 200, 32), $"<b>{t.Name}</b>  Stufe {L}/{Prog.TechMax}", st);
                GUI.Label(new Rect(12, y + 36, W - 200, 30), t.Text + " je Stufe", stSmall);
                if (L < Prog.TechMax) GUI.Label(new Rect(12, y + 66, W - 200, 34), Res4(Colony.TechCost(k, L + 1)) + $"  · {Defs.Time(c.TechTime(L + 1))}" + (blk != null && blk != "Zu wenig Rohstoffe" && blk != "Es wird schon geforscht" ? $"  <color=#FF8A8A>{blk}</color>" : ""), stTiny);
                if (L < Prog.TechMax && Btn(new Rect(W - 180, y + 18, 168, 66), "Forschen", blk == null)) c.StartTech(k);
                y += 110f;
            }
            return y;
        }

        float YardTab(Colony c, float y)
        {
            var s = c.S2;
            if (c.Levels(BType.Werft) <= 0) return Txt(y, "Für Kutter brauchst du die Werft (im dritten Ring).", stSmall);
            y = Txt(y, $"Kutter: <b>{s.boats}</b> / {c.MaxBoats}   ·   Platz für {s.boats * Prog.BoatCap} Krieger", st);
            y = Txt(y, $"Passt ein Trupp komplett auf deine Flotte ({Prog.BoatCap} Krieger je Kutter), segelt er 25 % schneller und bringt 25 % mehr Beute heim.", stSmall);
            if (s.boatLeft > 0)
            {
                y = Txt(y, $"Ein Kutter wird gebaut: noch {Defs.Time(s.boatLeft)}", st);
                Bar(new Rect(0, y, W, 16), 1 - s.boatLeft / Mathf.Max(1, s.boatTotal), new Color(0.4f, 0.85f, 1f)); y += 22f;
                SpeedButtons(c, new Rect(0, y, W, 60), "boat", 0); y += 68f;
            }
            string blk = c.BoatBlocker();
            y = Txt(y, "Kosten: " + Res4(Prog.BoatCost) + (blk != null && blk != "Zu wenig Rohstoffe" ? $"   <color=#FF8A8A>{blk}</color>" : ""), stSmall);
            if (Btn(new Rect(0, y, W, 66), "<b>Kutter bauen</b>", blk == null)) c.BuildBoat();
            return y + 74f;
        }

        float TradeTab(Colony c, float y)
        {
            var s = c.S2;
            if (!c.TraderHere) return Txt(y, $"Kein Händler am Steg. Das nächste Händlerschiff kommt in etwa {Defs.Time(Mathf.Max(0, s.traderNext))}.", stSmall);
            y = Txt(y, $"Das Händlerschiff legt in {Defs.Time(s.traderLeft)} wieder ab.", st);
            for (int k = 0; k < s.offers.Count; k++)
            {
                var o = s.offers[k];
                string get = o.unit >= 0 ? $"{o.rn}× {Units.All[o.unit].Name}" : $"{o.rn} {Defs.ResNames[o.get]}";
                Card(y, 76);
                GUI.Label(new Rect(12, y + 8, W - 200, 60), $"Gib <b>{o.gn} {Defs.ResNames[o.give]}</b>\nbekomme <b>{get}</b>", stSmall);
                if (o.used) GUI.Label(new Rect(W - 180, y + 8, 168, 60), "gehandelt", stMid);
                else if (Btn(new Rect(W - 180, y + 8, 168, 60), "Handeln", c.S.res[o.give] >= o.gn)) { string e = c.Trade(k); if (e != null) c.Msg(e); }
                y += 82f;
            }
            return y;
        }

        float QueueTab(Colony c, float y)
        {
            var s = c.S2;
            y = Txt(y, $"Bauwarteschlange: {s.bq.Count}/{c.M.Queue}. Ist ein Bautrupp frei und genug Rohstoff da, startet der nächste Auftrag von selbst.", stSmall);
            y = Txt(y, $"Bautrupps: {c.ActiveBuilds}/{c.MaxBuilds} beschäftigt", stSmall);
            for (int k = 0; k < s.bq.Count; k++)
            {
                var q = s.bq[k]; var p = c.S.plots[q.plot];
                string name = Defs.Get(q.type >= 0 ? q.type : p.type).Name;
                Card(y, 64);
                GUI.Label(new Rect(12, y + 14, W - 200, 40), $"{k + 1}. {name} {(q.type >= 0 ? "(neu)" : "→ Stufe " + (p.level + 1))}", st);
                if (Btn(new Rect(W - 160, y + 6, 148, 52), "Entfernen")) { s.bq.RemoveAt(k); break; }
                y += 70f;
            }
            return y;
        }

        float SeasonTab(Colony c, float y)
        {
            int si = Colony.SeasonIdx;
            y = Txt(y, $"<b>{Colony.SeasonNames[si]}</b> – noch {Defs.Time(Colony.SeasonLeftSec)}", st);
            y = Txt(y, Colony.SeasonTexts[si], stSmall);
            y = Sub(y, "Statistik");
            var s = c.S2;
            y = Txt(y, $"Macht: <b>{c.Power}</b>   ·   Verteidigung: {c.Defense}   ·   Gebäude: {c.CountBuilt()}", stSmall);
            y = Txt(y, $"Gewonnene Kämpfe: {s.stats[(int)Stat.Win]}   ·   Gesammelt: {s.stats[(int)Stat.Gather]}   ·   Gehandelt: {s.stats[(int)Stat.Trade]}", stSmall);
            y = Txt(y, $"Piratenschiff-Stufe: {s.botLevel}   ·   Hindernisse geräumt: {s.obstCleared}", stSmall);
            if (c.RaidIn >= 0) y = Txt(y, $"Nächster Piratenüberfall in etwa {Defs.Time(c.RaidIn)}", stSmall);
            return y;
        }

        // ---------- Schnellknöpfe, Warnung, Watt ----------
        void QuickButtons(Colony c)
        {
            float x = VW - 186f, y = VH - bottom - 130f - 3 * 96f;
            string beacon = c.S.beaconOn ? "<color=#FFD27A>an</color>" : "<color=#9AB8C8>aus</color>";
            if (Btn(new Rect(x, y, 174, 88), $"<b>Licht</b>\n<size=18>{beacon}</size>")) c.ToggleBeacon();
            string block = c.ExpeditionBlocker();
            string exp = c.S.expeditionLeft > 0f ? $"<b>Im Watt</b>\n<size=18>{Defs.Time(c.S.expeditionLeft)}</size>"
                : block == "Wartet auf Ebbe" ? "<b>Watt</b>\n<size=16>wartet auf Ebbe</size>" : $"<b>Watt</b>\n<size=17>{Colony.ExpeditionFood:0} Muscheln</size>";
            if (Btn(new Rect(x, y + 96, 174, 88), exp, block == null)) c.StartExpedition();
            float ri = c.RaidIn;
            string raid = ri >= 0 ? $"<b>Piraten</b>\n<size=18>{(ri < 30 ? "<color=#FF7A7A>" : "")}{Defs.Time(ri)}{(ri < 30 ? "</color>" : "")}</size>" : "<b>Piraten</b>\n<size=16>ab Tag 2</size>";
            if (Btn(new Rect(x, y + 192, 174, 88), raid)) { OpenPanel("troops"); tab = "form"; }
        }

        void WarnBox(Colony c)
        {
            var s = c.S;
            string text = null; BType t = BType.Muschelzucht;
            for (int k = 0; k < 3 && text == null; k++)
            {
                int i = k == 0 ? 1 : k == 1 ? 2 : 0;
                if (i == 0 && !s.beaconOn) continue;
                float r = c.RatePerMin[i];
                string name = Defs.ResNames[i];
                if (s.res[i] <= 1f) text = i == 0 ? "Kein Holz mehr – das Licht ist aus!" : $"{name} sind alle! Notration – Siedler werden krank.";
                else if (r < 0 && s.res[i] / -r < 8f) text = $"{name} reichen nur noch {Defs.Time(s.res[i] / -r * 60f)}.";
                if (text != null) t = i == 1 ? BType.Muschelzucht : i == 2 ? BType.Regenfaenger : BType.Treibholzsammler;
            }
            if (text == null && s.sick >= 3 && c.Levels(BType.Heilerhuette) <= 0) { text = $"{s.sick} Kranke arbeiten nicht. Eine Heilerhütte macht sie schneller gesund."; t = BType.Heilerhuette; }
            if (text == null) return;
            var r0 = Panel(new Rect(12, VH - bottom - 130f - 150f, VW - 220f, 140f), txBad);
            GUI.Label(new Rect(r0.x + 12, r0.y + 6, r0.width - 24, 70), "<b>Achtung:</b> " + text, stSmall);
            int target = -1;
            for (int i = 0; i < Colony.PlotCount; i++) if (s.plots[i].type == (int)t && s.plots[i].buildLeft <= 0) { target = i; break; }
            if (target < 0) for (int i = 1; i < Colony.PlotCount; i++) if (s.plots[i].type < 0 && Defs.Layout[i] == (int)t) { target = i; break; }
            if (target >= 0 && Btn(new Rect(r0.x + 12, r0.y + 78, 300, 54), target >= 0 && s.plots[target].type >= 0 ? $"<size=18>Zu: {Defs.Get(t).Name}</size>" : $"<size=18>{Defs.Get(t).Name} bauen</size>")) Select(target);
        }

        /// Auswahl im Watt: -1000-id Sammelstelle, -4000-id Hindernis
        void WattPanel(Colony c)
        {
            float w = 704f, x = VW / 2f - w / 2f, h = 330f, by = VH - bottom - 130f;
            var r = Panel(new Rect(x, by - h, w, h));
            if (Selected <= -4000)
            {
                int id = -4000 - Selected; var o = c.S2.obst.Find(q => q.id == id);
                if (o == null) { Select(-1); return; }
                if (Header(r, Colony.ObstNames[o.kind])) { Select(-1); return; }
                GUI.Label(new Rect(r.x + 18, r.y + 70, w - 36, 60), "Angespült vom letzten Hochwasser. Darunter steckt oft etwas Brauchbares: Rohstoffe, Schmiedeeisen, manchmal ein Beschleuniger.", stSmall);
                if (c.S2.clearId == id)
                {
                    GUI.Label(new Rect(r.x + 18, r.y + 140, w - 36, 30), $"Wird geräumt … noch {Defs.Time(c.S2.clearLeft)}", st);
                    Bar(new Rect(r.x + 18, r.y + 176, w - 36, 18), 1 - c.S2.clearLeft / Mathf.Max(1, c.S2.clearTotal), new Color(0.4f, 0.85f, 1f));
                    SpeedButtons(c, new Rect(r.x + 18, r.yMax - 84, w - 36, 66), "clear", 0);
                }
                else
                {
                    string blk = c.ObstBlocker(id);
                    GUI.Label(new Rect(r.x + 18, r.y + 140, w - 36, 30), $"Kosten: {CostStr(Colony.ObstCost[o.kind])} · {Defs.Time(Colony.ObstTime[o.kind])}" + (blk != null && blk != "Zu wenig Rohstoffe" ? $"   <color=#FF8A8A>{blk}</color>" : ""), stSmall);
                    if (Btn(new Rect(r.x + 18, r.yMax - 90, 330, 72), "<b>Wegräumen</b>", blk == null)) c.StartObst(id);
                }
                return;
            }
            int nid = -1000 - Selected; var n = c.NodeById(nid);
            if (n == null) { Select(-1); return; }
            if (Header(r, Colony.NodeNames[n.type])) { Select(-1); return; }
            int asg = c.Assigned(nid);
            GUI.Label(new Rect(r.x + 18, r.y + 70, w - 36, 30), $"Vorrat: <b>{Mathf.FloorToInt(n.amount)}</b> / {n.max:0} {Defs.ResNames[n.type]}" + (c.NodeFlooded(n) ? "   <color=#7FD3F0>(gerade überflutet)</color>" : ""), st);
            Bar(new Rect(r.x + 18, r.y + 104, w - 36, 16), n.amount / Mathf.Max(1, n.max), new Color(1f, 0.85f, 0.45f));
            GUI.Label(new Rect(r.x + 18, r.y + 128, w - 36, 60), $"Sammler hier: <b>{asg}</b>   ·   freie Bewohner: {c.FreeVillagers}   ·   jeder trägt {c.Carry:0} pro Gang. Sammler fehlen in den Betrieben.", stSmall);
            if (Btn(new Rect(r.x + 18, r.yMax - 90, 150, 72), "<b>−1</b>", asg > 0)) c.SetGatherers(nid, asg - 1);
            if (Btn(new Rect(r.x + 178, r.yMax - 90, 150, 72), "<b>+1</b>", c.FreeVillagers > 0)) c.SetGatherers(nid, asg + 1);
            if (Btn(new Rect(r.x + 338, r.yMax - 90, 170, 72), "<b>+5</b>", c.FreeVillagers > 0)) c.SetGatherers(nid, asg + 5);
            if (Btn(new Rect(r.x + 518, r.yMax - 90, 168, 72), "Alle zurück", asg > 0)) c.SetGatherers(nid, 0);
        }

        // ---------- Wiederholung eines Kampfes ----------
        void ReplayView()
        {
            EnsureExtraStyles();
            replayT += Time.unscaledDeltaTime;
            float w = 680f, h = 640f;
            var r = Panel(new Rect(VW / 2f - w / 2f, VH / 2f - h / 2f, w, h));
            string title = replay.arena ? "Arena" : replay.raid ? "Piratenüberfall" : "Angriff";
            if (Header(r, $"{title}: {replay.an} gegen {replay.dn}")) { replay = null; return; }
            float p = Mathf.Clamp01((replayT - 0.6f) / 4f);
            float colW = (w - 54) / 2f;
            for (int side = 0; side < 2; side++)
            {
                var u = side == 0 ? replay.au : replay.du; var l = side == 0 ? replay.al : replay.dl;
                float x = r.x + 18 + side * (colW + 18), y = r.y + 76;
                GUI.Label(new Rect(x, y, colW, 34), side == 0 ? $"<b>Angreifer</b>: {replay.an}" : $"<b>Verteidiger</b>: {replay.dn}", st);
                y += 40;
                int tot0 = Mathf.Max(1, Units.Sum(u));
                for (int i = 0; i < 5; i++)
                {
                    if (u[i] <= 0) continue;
                    int now = Mathf.Max(0, Mathf.RoundToInt(u[i] - l[i] * p));
                    string row = side == 1 && replay.df != null && replay.df.Length == 5 ? $" <size=15>({Units.Rows[replay.df[i]]})</size>" : "";
                    GUI.Label(new Rect(x, y, colW, 28), $"{Units.All[i].Name}{row}: <b>{now}</b>", stSmall);
                    Bar(new Rect(x, y + 30, colW, 12), now / (float)Mathf.Max(1, u[i]), side == 0 ? new Color(1f, 0.6f, 0.35f) : new Color(0.45f, 0.9f, 0.6f));
                    y += 50;
                }
                if (side == 1 && replay.def > 0) GUI.Label(new Rect(x, y, colW, 28), $"Stadtverteidigung {replay.def}", stTiny);
            }
            // Kampfgetümmel
            if (p > 0 && p < 1)
            {
                for (int k = 0; k < 6; k++)
                {
                    float a = replayT * 6f + k * 1.1f;
                    var col = GUI.color; GUI.color = new Color(1f, 0.75f + 0.2f * Mathf.Sin(a), 0.3f, 0.8f);
                    GUI.DrawTexture(new Rect(r.center.x - 10 + Mathf.Cos(a) * 40, r.y + 320 + Mathf.Sin(a * 1.3f) * 120, 20, 20), txDot);
                    GUI.color = col;
                }
            }
            if (replayT > 5f)
                GUI.Label(new Rect(r.x + 18, r.yMax - 170, w - 36, 50), replay.win ? $"<b><color=#FFB070>{replay.an} gewinnt</color></b>" : $"<b><color=#8EF0A0>{replay.dn} hält stand</color></b>", stBig);
            GUI.Label(new Rect(r.x + 18, r.yMax - 118, w - 36, 30), $"Aufstellung der Verteidiger: {Pct(Units.FormMul(replay.df) - 1)}" + (replay.tide != 0 ? "   ·   " + Units.TideName[replay.tide + 1] : ""), stTiny);
            if (Btn(new Rect(r.x + 18, r.yMax - 84, 300, 70), "Nochmal")) replayT = 0;
            if (Btn(new Rect(r.xMax - 318, r.yMax - 84, 300, 70), "Schließen")) replay = null;
        }
    }
}
