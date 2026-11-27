using System;
using System.Collections.Generic;
using UnityEngine;

namespace Pfahlstadt
{
    /// Online-Oberfläche: Anmeldung (ab 10 Jahren), Seekarte online, Allianz, Arena, Berichte, Rangliste, Konto, Spielleiter
    public partial class GameUI
    {
        object mapSel; string mapSelType = ""; string pendingPlayer;
        Vector2 mapOff; float mapZoom = 1f; Rect mapRect; bool mapTouch;
        string inName = "", inCode = "", inChat = "", inAllyName = "", inAllyTag = "", inRedeem = "", inAdm = "", inNewCode = "";
        string loginErr = "", redeemMsg = "";
        bool ageTick, restoreMode;
        readonly float[] amt = new float[4];
        string donKind, donTo = "", donToName = ""; int donFree; bool helpMode;
        int rallyWait = 5; long rallyJoinId = -1; bool rallyMode;
        int codeDays = 7, codeMax = 0, codeVip = 0;
        GUIStyle stField;
        readonly Dictionary<string, Texture2D> avTex = new Dictionary<string, Texture2D>();

        Online O => Online.I;
        bool On => Online.I != null && Online.I.Active;

        void OnTab()
        {
            var o = O; if (o == null || !o.Active) return;
            o.WantWorld = panel == "map";
            o.WantChat = panel == "ally";
            donKind = null; donTo = ""; helpMode = false; rallyMode = false; rallyJoinId = -1;
            if (panel == "map") o.LoadWorld();
            if (panel == "ally")
            {
                o.LoadAlliances(); o.LoadChat();
                if (tab == "help") o.HelpList(); if (tab == "garr") o.GarrisonInfo(); if (tab == "res") o.AllyProjects();
                if (tab == "war") o.WarInfo(); if (tab == "rally") o.LoadRallies();
            }
            if (panel == "troops" && tab == "arena") o.ArenaList();
            if (panel == "city" && tab == "rank") o.LoadRanking();
            if (panel == "admin") { o.LoadCodes(); o.AdminPlayers(); o.AdminAvatars(); }
        }

        GUIStyle Field()
        {
            if (stField == null) { stField = new GUIStyle(GUI.skin.textField) { fontSize = 26, alignment = TextAnchor.MiddleLeft }; stField.padding = new RectOffset(12, 12, 8, 8); }
            return stField;
        }

        // ---------- Anmeldung ----------
        public static bool NeedLogin => Online.I != null && !Online.I.Active && PlayerPrefs.GetInt("pf_offline", 0) == 0;
        bool AgeConfirmed => PlayerPrefs.GetInt("pf_age10", 0) == 1;
        bool AgeCheck()
        {
            if (AgeConfirmed) return true;
            if (ageTick) { PlayerPrefs.SetInt("pf_age10", 1); PlayerPrefs.Save(); return true; }
            loginErr = "Bitte bestätige zuerst mit dem Häkchen, dass du mindestens 10 Jahre alt bist.";
            return false;
        }

        void LoginOverlay(Colony c)
        {
            Panel(new Rect(0, 0, VW, VH));
            float w = 640f, x = VW / 2f - w / 2f, y = top + 90f;
            GUI.Label(new Rect(x, y, w, 60), "<size=44><b>Pfahlstadt</b></size>", stMid); y += 64;
            GUI.Label(new Rect(x, y, w, 34), "Ebbe & Flut – Mehrspieler", stMid); y += 56;
            if (!AgeConfirmed)
            {
                GUI.DrawTexture(new Rect(x, y, w, 330), txCard);
                GUI.Label(new Rect(x + 16, y + 10, w - 32, 34), "Spielen erst ab <b>10 Jahren</b>", st);
                if (Btn(new Rect(x + 16, y + 50, w - 32, 70), ageTick ? "<b>[ X ]</b>  Ich bin 10 Jahre oder älter." : "<b>[    ]</b>  Ich bestätige, dass ich 10 Jahre oder älter bin.")) ageTick = !ageTick;
                GUI.Label(new Rect(x + 16, y + 128, w - 32, 200),
                    "<size=15>Warum ab 10? Pfahlstadt ist ein Online-Spiel: Du triffst dort auch fremde Spieler, und im Allianz-Chat kann jeder frei schreiben – das können wir nicht vollständig überwachen. Spieler greifen sich gegenseitig an und plündern Vorräte; Niederlagen können frustrieren. Dein Spielername und dein Profilbild sind für alle sichtbar. Gib deshalb nie deinen echten Namen, deine Adresse, Telefonnummer oder Fotos von dir preis und triff dich nicht mit Leuten aus dem Spiel. Unter 16 Jahren spiele bitte nur mit Einverständnis deiner Eltern. Wenn dich jemand belästigt, sag es deinen Eltern und dem Spielleiter.</size>", stTiny);
                y += 346;
            }
            if (!restoreMode)
            {
                GUI.Label(new Rect(x, y, w, 60), "Wähle deinen Spielernamen. Damit sehen dich deine Freunde auf der Seekarte.", stMid); y += 66;
                inName = GUI.TextField(new Rect(x + 40, y, w - 80, 66), inName, 16, Field()); y += 78;
                if (Btn(new Rect(x + 140, y, w - 280, 72), "<b>Los geht's</b>", !O.Busy)) { loginErr = ""; if (AgeCheck()) O.Register(inName, m => loginErr = m); }
                y += 86;
                if (Btn(new Rect(x + 40, y, w - 80, 60), "<size=19>Ich habe schon ein Konto (Umzugscode)</size>")) { restoreMode = true; loginErr = ""; }
                y += 72;
            }
            else
            {
                GUI.Label(new Rect(x, y, w, 60), "Gib den Umzugscode deines alten Handys ein (steht dort unter Menü → Konto).", stMid); y += 66;
                inCode = GUI.TextField(new Rect(x + 20, y, w - 40, 66), inCode, 80, Field()); y += 78;
                if (Btn(new Rect(x + 140, y, w - 280, 72), "<b>Konto übernehmen</b>", !O.Busy && inCode.Trim().Length >= 20)) { loginErr = ""; if (AgeCheck()) O.Restore(inCode, m => loginErr = m); }
                y += 86;
                if (Btn(new Rect(x + 40, y, w - 80, 60), "Zurück")) { restoreMode = false; loginErr = ""; }
                y += 72;
            }
            if (Btn(new Rect(x + 40, y, w - 80, 60), "<size=19>Erst mal offline spielen</size>")) { if (AgeCheck()) { PlayerPrefs.SetInt("pf_offline", 1); PlayerPrefs.Save(); } }
            y += 72;
            if (loginErr != "") GUI.Label(new Rect(x, y, w, 80), $"<color=#FF8A8A>{loginErr}</color>", stMid);
            if (O.Busy) GUI.Label(new Rect(x, y + 80, w, 40), "Verbinde …", stMid);
        }

        // ---------- Konto ----------
        float AccountContent(Colony c, float y)
        {
            var o = O;
            if (!o.Active)
            {
                y = Txt(y, "Du spielst gerade offline. Online kannst du mit anderen spielen: Allianzen, Angriffe, Arena, Allianz-Krieg und mehr.", stSmall);
                if (Btn(new Rect(0, y, W, 70), "<b>Online gehen</b>")) { PlayerPrefs.SetInt("pf_offline", 0); PlayerPrefs.Save(); panel = null; }
                return y + 80f;
            }
            y = Txt(y, $"Angemeldet als <b>{o.PlayerName}</b>" + (!string.IsNullOrEmpty(o.Title) ? $"  ·  Titel: {o.Title}" : "") + $"   ·   Verbindung: {(o.Status == "online" ? "<color=#8EF0A0>online</color>" : $"<color=#FFD27A>{o.Status}</color>")}", st);
            if (o.Error != "") y = Txt(y, $"<color=#FF8A8A>{o.Error}</color>", stSmall);
            y = Sub(y, "Umzugscode");
            y = Txt(y, "Mit diesem Code holst du dein Konto auf ein neues Handy. Gib ihn niemandem!", stTiny);
            if (Btn(new Rect(0, y, W, 60), confirmKey == "showcode" ? $"<size=15>{o.Token}</size>" : "Code anzeigen")) { if (confirmKey == "showcode") { GUIUtility.systemCopyBuffer = o.Token; c.Msg("Umzugscode kopiert."); } else confirmKey = "showcode"; }
            y += 66f;
            if (confirmKey == "showcode") y = Txt(y, "Antippen kopiert den Code.", stTiny);
            y = Sub(y, "Geschenk-Code einlösen");
            inRedeem = GUI.TextField(new Rect(0, y, W - 190, 62), inRedeem, 16, Field());
            if (Btn(new Rect(W - 180, y, 180, 62), "Einlösen", !o.Busy && inRedeem.Trim().Length >= 4)) o.Redeem(inRedeem.Trim().ToUpperInvariant(), m => { redeemMsg = m; inRedeem = ""; });
            y += 70f;
            if (redeemMsg != "") y = Txt(y, redeemMsg, stSmall);
            if (o.IsAdmin) { if (Btn(new Rect(0, y, W, 64), "<b>Spielleiter-Bereich</b>")) OpenPanel("admin"); y += 72f; }
            y = Sub(y, "Abmelden");
            if (Btn(new Rect(0, y, W, 60), confirmKey == "logout" ? "<color=#FFB0A0>Wirklich abmelden? Ohne Umzugscode ist das Konto weg!</color>" : "Abmelden"))
            { if (confirmKey == "logout") { o.Logout(); PlayerPrefs.SetInt("pf_offline", 1); confirmKey = null; panel = null; } else confirmKey = "logout"; }
            return y + 70f;
        }

        // ---------- Seekarte online ----------
        Vector2 MapPosO(float x, float y)
        {
            var me = O.Me; float mx = J.F(me, "x"), my = J.F(me, "y");
            float k = Mathf.Min(mapRect.width, mapRect.height) / 2f / (6.5f / mapZoom);
            return new Vector2(mapRect.center.x + mapOff.x + (x - mx) * k, mapRect.center.y + mapOff.y - (y - my) * k);
        }
        void MapPick(string type, object o) { mapSelType = type; mapSel = o; scrollY = 0; System.Array.Clear(form, 0, 5); helpMode = false; rallyMode = false; }

        void SeaMapOnline(Colony c, Rect mr)
        {
            mapRect = mr;
            var o = O;
            GUI.DrawTexture(mr, txSea);
            if (o.World == null || o.Me == null) { GUI.Label(mr, "Lade Weltkarte …", stMid); return; }
            GUI.BeginGroup(mr);
            var off = new Vector2(-mr.x, -mr.y);
            string me = o.MyId, ally = o.AllyId;
            // Rohstofffelder
            foreach (var f in J.L(o.World, "fields"))
            {
                var p = MapPosO(J.F(f, "x"), J.F(f, "y")) + off; int kind = J.I(f, "kind");
                if (!new Rect(-40, -40, mr.width + 80, mr.height + 80).Contains(p)) continue;
                Color[] cols = { new Color(0.72f, 0.54f, 0.32f), new Color(0.91f, 0.84f, 0.72f), new Color(0.44f, 0.76f, 0.94f), new Color(0.6f, 0.64f, 0.68f) };
                bool mine = J.B(f, "mine"), occ = J.S(f, "occ") != "";
                bool sel = mapSelType == "field" && J.I(mapSel, "id") == J.I(f, "id");
                if (sel) Dot(p, 50, new Color(1f, 0.9f, 0.4f, 0.6f));
                if (mine || occ) Dot(p, 34, mine ? new Color(0.35f, 0.9f, 0.55f) : new Color(1f, 0.6f, 0.35f));
                Dot(p, 24 + 2 * J.I(f, "level"), cols[Mathf.Clamp(kind - 1, 0, 3)]);
                GUI.Label(new Rect(p.x - 20, p.y - 11, 40, 22), J.I(f, "level").ToString(), stTinyC);
                if (HitButton(p, 40)) MapPick("field", f);
            }
            // Inseln
            foreach (var t in J.L(o.World, "territories"))
            {
                var p = MapPosO(J.F(t, "x"), J.F(t, "y")) + off;
                if (!new Rect(-40, -40, mr.width + 80, mr.height + 80).Contains(p)) continue;
                string own = J.S(t, "owner"), oa = J.S(t, "owner_alliance");
                bool lh = J.S(t, "kind") == "Leuchtturm";
                Color col = own == "" ? new Color(0.85f, 0.75f, 0.5f) : own == me ? new Color(0.35f, 0.85f, 0.5f) : (ally != "" && oa == ally) ? new Color(0.45f, 0.7f, 1f) : new Color(0.95f, 0.4f, 0.35f);
                float size = lh ? 50 : 34;
                bool sel = mapSelType == "terr" && J.I(mapSel, "id") == J.I(t, "id");
                if (sel) Dot(p, size + 22, new Color(1f, 0.9f, 0.4f, 0.6f));
                Dot(p, size, col);
                if (lh) Dot(p, 18, new Color(1f, 0.95f, 0.6f));
                if (mapZoom >= 1f || sel) GUI.Label(new Rect(p.x - 70, p.y + size / 2 - 2, 140, 22), J.S(t, "name"), stTinyC);
                if (HitButton(p, size + 14)) MapPick("terr", t);
            }
            // Städte
            foreach (var pl in J.L(o.World, "players"))
            {
                var p = MapPosO(J.F(pl, "x"), J.F(pl, "y")) + off;
                if (!new Rect(-40, -40, mr.width + 80, mr.height + 80).Contains(p)) continue;
                string id = J.S(pl, "id"), pa = J.S(pl, "alliance_id");
                bool isMe = id == me, isAlly = !isMe && ally != "" && pa == ally;
                bool sel = mapSelType == "player" && J.S(mapSel, "id") == id;
                if (pendingPlayer != null && pendingPlayer == id) { MapPick("player", pl); pendingPlayer = null; }
                if (sel) Dot(p, 64, new Color(1f, 0.9f, 0.4f, 0.6f));
                if (J.B(pl, "shield")) Dot(p, 52, new Color(0.8f, 0.95f, 1f, 0.7f));
                Dot(p, 42, isMe ? new Color(1f, 0.82f, 0.35f) : isAlly ? new Color(0.45f, 0.7f, 1f) : new Color(0.9f, 0.35f, 0.3f));
                string tag = J.S(pl, "tag");
                GUI.Label(new Rect(p.x - 90, p.y + 20, 180, 22), (tag != "" ? $"[{tag}] " : "") + J.S(pl, "name"), stTinyC);
                if (HitButton(p, 50)) MapPick("player", pl);
            }
            // Riesenkrake
            if (o.Boss != null)
            {
                var p = MapPosO(3.5f, -3.5f) + off;
                if (mapSelType == "boss") Dot(p, 80, new Color(1f, 0.4f, 0.4f, 0.4f));
                Dot(p, 60, new Color(0.4f, 0.15f, 0.45f));
                GUI.Label(new Rect(p.x - 70, p.y + 28, 140, 22), "<b>Riesenkrake</b>", stTinyC);
                if (HitButton(p, 64)) { MapPick("boss", o.Boss); o.BossInfo(); }
            }
            // Piratenschiffe (gehören zu dir, liegen um deine Stadt)
            float mx = J.F(o.Me, "x"), my = J.F(o.Me, "y");
            foreach (var b in c.S2.bots)
            {
                var p = MapPosO(mx + b.dx, my + b.dy) + off;
                bool sel = mapSelType == "bot" && mapBot == b.id;
                if (sel) Dot(p, 50, new Color(1f, 0.9f, 0.4f, 0.6f));
                Dot(p, 32, new Color(0.12f, 0.12f, 0.14f));
                GUI.Label(new Rect(p.x - 30, p.y - 11, 60, 22), $"<b>{b.level}</b>", stTinyC);
                if (HitButton(p, 44)) { MapPick("bot", null); mapBot = b.id; }
            }
            // eigene Trupps
            double now = o.ServerNowMs;
            foreach (var m in o.Marches)
            {
                Vector2 target;
                if (!MarchTarget(m, out target)) continue;
                var home = MapPosO(mx, my); var tp = MapPosO(target.x, target.y);
                string st = J.S(m, "status"); float f;
                if (st == "gather") f = 1f;
                else if (st == "back") { double a = J.Ms(m, "arrive"), b = J.Ms(m, "back_at"); f = 1f - Mathf.Clamp01((float)((now - a) / Math.Max(1, b - a))); }
                else { double a = J.Ms(m, "depart"), b = J.Ms(m, "arrive"); f = Mathf.Clamp01((float)((now - a) / Math.Max(1, b - a))); }
                Dot(Vector2.Lerp(home, tp, f) + off, 16, st == "gather" ? new Color(0.55f, 0.95f, 0.6f) : new Color(1f, 0.85f, 0.3f));
            }
            GUI.EndGroup();
            if (Btn(new Rect(mr.xMax - 70, mr.y + 6, 62, 56), "+")) mapZoom = Mathf.Min(3f, mapZoom * 1.3f);
            if (Btn(new Rect(mr.xMax - 70, mr.y + 66, 62, 56), "−")) mapZoom = Mathf.Max(0.35f, mapZoom / 1.3f);
            if (Btn(new Rect(mr.xMax - 70, mr.y + 126, 62, 56), "<size=15>Mitte</size>")) mapOff = Vector2.zero;
            if (o.Incoming > 0) GUI.Label(new Rect(mr.x + 8, mr.y + 6, mr.width - 90, 30), "<color=#FF7A7A><b>Achtung: Ein Feind greift deine Stadt an!</b></color>", stSmall);
        }

        bool MarchTarget(object m, out Vector2 pos)
        {
            pos = Vector2.zero; var w = O.World;
            if (J.Has(m, "field_id")) { foreach (var f in J.L(w, "fields")) if (J.I(f, "id") == J.I(m, "field_id")) { pos = new Vector2(J.F(f, "x"), J.F(f, "y")); return true; } return false; }
            if (J.Has(m, "target_player")) { foreach (var p in J.L(w, "players")) if (J.S(p, "id") == J.S(m, "target_player")) { pos = new Vector2(J.F(p, "x"), J.F(p, "y")); return true; } return false; }
            if (J.Has(m, "target_terr")) { foreach (var t in J.L(w, "territories")) if (J.I(t, "id") == J.I(m, "target_terr")) { pos = new Vector2(J.F(t, "x"), J.F(t, "y")); return true; } }
            return false;
        }

        float Boost(Colony c) => c.M.Atk * c.CapAtk(CapPick(c), c.TideNow);
        float SpeedMul(Colony c) => c.M.Travel * c.FleetSpeed(form) * c.CapSpeed(CapPick(c));
        float TravelTo(Colony c, float x, float y)
        {
            float d = Mathf.Sqrt(Mathf.Pow(x - J.F(O.Me, "x"), 2) + Mathf.Pow(y - J.F(O.Me, "y"), 2));
            return (20 + d * 22) * Units.SpeedFactor(form) * Mathf.Clamp(SpeedMul(c), 0.5f, 1f);
        }
        void Sent(Colony c, float travel) { int cap = CapPick(c); if (cap >= 0) c.CapSend(cap, travel); System.Array.Clear(form, 0, 5); capSel = -1; }

        float MapDetailsOnline(Colony c, float y)
        {
            var o = O;
            if (o.World == null || o.Me == null) return Txt(y, "Lade …", stSmall);
            switch (mapSelType)
            {
                case "player": return PlayerDetails(c, y);
                case "terr": return TerrDetails(c, y);
                case "field": return FieldDetails(c, y);
                case "boss": return BossDetails(c, y);
                case "bot":
                    {
                        var b = c.S2.bots.Find(x => x.id == mapBot);
                        if (b != null) return BotDetails(c, y, b);
                        mapSelType = ""; break;
                    }
            }
            y = Txt(y, "Tippe eine Stadt, Insel, ein Rohstofffeld, die Riesenkrake oder ein Piratenschiff an. Wischen verschiebt die Karte.", stSmall);
            var lh = o.Lh;
            if (lh != null) y = Txt(y, $"Großer Leuchtturm: {(J.B(lh, "open") ? "<color=#FF9A5A>Kampf läuft (Wochenende)!</color>" : "Kampf nur am Wochenende")}" + (J.S(lh, "holder") != "" ? $" · gehalten von {J.S(lh, "holder")}" : "") + (J.B(lh, "bonus") ? " · <color=#8EF0A0>+20 % Produktion für dich</color>" : ""), stSmall);
            if (o.Marches.Count + c.S2.botMarches.Count == 0) return Txt(y, "Keine Trupps unterwegs.", stSmall);
            y = Sub(y, "Unterwegs");
            double now = o.ServerNowMs;
            foreach (var m in o.Marches)
            {
                string st = J.S(m, "status");
                double end = st == "out" ? J.Ms(m, "arrive") : st == "gather" ? J.Ms(m, "gather_end") : J.Ms(m, "back_at");
                string what = J.S(m, "kind") == "scout" ? "Späher" : st == "gather" ? "Sammelt" : st == "back" ? "Heimweg" : J.Has(m, "field_id") ? "Zum Feld" : "Angriff";
                Card(y, 64);
                GUI.Label(new Rect(12, y + 6, W - 200, 54), $"{what}: {Units.Text(J.U(m, "u"))}\n<size=16>{Defs.Time(Math.Max(0, (end - now) / 1000))}</size>", stSmall);
                if (st == "gather" && Btn(new Rect(W - 180, y + 6, 168, 52), "<size=17>Zurückrufen</size>")) o.GatherRecall((long)J.N(m, "id"));
                y += 70f;
            }
            for (int k = 0; k < c.S2.botMarches.Count; k++)
            {
                var m = c.S2.botMarches[k];
                Card(y, 76);
                GUI.Label(new Rect(12, y + 6, W - 330, 64), $"{(m.phase == "back" ? "Heimweg von" : "Angriff auf")} „{m.bot.name}“\n<size=16>{Units.Text(m.u)} · {Defs.Time(m.left)}</size>", stSmall);
                SpeedButtons(c, new Rect(W - 320, y + 8, 308, 60), "bot", k);
                y += 82f;
            }
            return y;
        }

        float BotDetails(Colony c, float y, Bot b)
        {
            y = Txt(y, $"<b>Piratenschiff „{b.name}“</b> · Stufe {b.level}", st);
            y = Txt(y, $"Mannschaft: {Units.Text(b.u)}", stSmall);
            Colony.BotReward(b.level, out var items, out var res, out var u, out var big);
            y = Txt(y, $"Beute: {ItemStr(items)}  {Res4(res)}  {(big ? 3 : 1)} Abzeichen", stTiny);
            int stam = c.Stamina(out float next);
            y = Txt(y, $"Ausdauer: <b>{stam}/{Colony.StamMax}</b>" + (stam < Colony.StamMax ? $" · nächster Punkt in {Defs.Time(next)}" : ""), stSmall);
            string blk = c.BotBlocker(b.id, form);
            y = TroopForm(c, y, $"Fahrt etwa {Defs.Time(c.BotTravel(b, form, CapPick(c)))}");
            if (Btn(new Rect(0, y, W, 70), "<b>Angreifen!</b>", blk == null)) { if (c.SendToBot(b.id, form, CapPick(c))) { System.Array.Clear(form, 0, 5); capSel = -1; mapSelType = ""; } }
            if (blk != null && blk != "Keine Truppen ausgewählt") GUI.Label(new Rect(0, y + 74, W, 30), $"<color=#FF8A8A>{blk}</color>", stTiny);
            return y + 110f;
        }

        float AttackBlock(Colony c, float y, string kind, object target, float tx, float ty, bool canRally)
        {
            var o = O; float tt = TravelTo(c, tx, ty);
            if (rallyMode)
            {
                y = Sub(y, "Sammelangriff ausrufen");
                y = Txt(y, "Deine Allianz kann sich anschließen. Alle Truppen starten gemeinsam.", stTiny);
                int[] waits = { 2, 5, 10, 30 };
                for (int k = 0; k < 4; k++) if (Btn(new Rect(k * (W / 4f), y, W / 4f - 6, 54), rallyWait == waits[k] ? $"<color=#FFE08A><b>{waits[k]} Min.</b></color>" : $"{waits[k]} Min.")) rallyWait = waits[k];
                y += 62f;
                y = TroopForm(c, y, "");
                if (Btn(new Rect(0, y, W / 2 - 6, 66), "<b>Ausrufen</b>", Units.Sum(form) > 0 && !o.Busy)) { o.RallyCreate(kind, target, (int[])form.Clone(), rallyWait); Sent(c, tt); rallyMode = false; }
                if (Btn(new Rect(W / 2 + 6, y, W / 2 - 6, 66), "Zurück")) rallyMode = false;
                return y + 76f;
            }
            if (Btn(new Rect(0, y, canRally ? W / 2 - 6 : W, 58), "<size=18>Späher schicken</size>", !o.Busy)) o.Scout(kind, target);
            if (canRally && Btn(new Rect(W / 2 + 6, y, W / 2 - 6, 58), "<size=18>Sammelangriff</size>")) { rallyMode = true; System.Array.Clear(form, 0, 5); }
            y += 66f;
            y = TroopForm(c, y, $"Fahrt etwa {Defs.Time(tt)} · Angriffskraft {Mathf.RoundToInt(Units.Str(form, null, true, c.TideNow) * Boost(c))}");
            if (Btn(new Rect(0, y, W, 70), "<b>Angreifen!</b>", Units.Sum(form) > 0 && !o.Busy)) { o.SendMarch(kind, target, (int[])form.Clone(), Boost(c), SpeedMul(c), null); Sent(c, tt); }
            return y + 80f;
        }

        float PlayerDetails(Colony c, float y)
        {
            var o = O; var p = mapSel; string id = J.S(p, "id");
            string tag = J.S(p, "tag");
            y = Txt(y, $"<b>{(tag != "" ? "[" + tag + "] " : "")}{J.S(p, "name")}</b>" + (J.B(p, "online") ? "  <color=#8EF0A0>online</color>" : ""), st);
            y = Txt(y, $"Macht {J.I(p, "power")} · Gezeitenturm {J.I(p, "tower")}" + (J.B(p, "shield") ? " · <color=#BFE8FF>unter Schutz</color>" : ""), stSmall);
            if (id == o.MyId) return Txt(y, "Das ist deine Stadt.", stSmall);
            bool ally = o.InAlliance && J.S(p, "alliance_id") == o.AllyId;
            if (ally)
            {
                y = Sub(y, "Rohstoffe schicken (höchstens 20.000 pro Stunde)");
                return ResPicker(c, y, "Schicken", () => o.SendHelp(id, (float[])amt.Clone()));
            }
            if (J.B(p, "shield")) return Txt(y, "Städte unter Schutz kann man nicht angreifen.", stSmall);
            return AttackBlock(c, y, "player", id, J.F(p, "x"), J.F(p, "y"), o.InAlliance);
        }

        float TerrDetails(Colony c, float y)
        {
            var o = O; var t = mapSel; int id = J.I(t, "id");
            // aktuelle Daten aus der Welt holen
            foreach (var x in J.L(o.World, "territories")) if (J.I(x, "id") == id) { t = x; mapSel = x; }
            string own = J.S(t, "owner"), kind = J.S(t, "kind");
            y = Txt(y, $"<b>{J.S(t, "name")}</b> · {kind}", st);
            y = Txt(y, $"Bonus für den Besitzer: <b>+{J.I(t, "pct")} % {Defs.ResNames[Mathf.Clamp(J.I(t, "res"), 0, 3)]}</b>", stSmall);
            if (kind == "Leuchtturm") y = Txt(y, "Großer Leuchtturm: Angriffe nur Samstag bis Sonntag 20 Uhr. Wer ihn dann hält, bekommt mit seiner Allianz eine Woche +20 % Produktion.", stTiny);
            if (own == "") y = Txt(y, $"Piraten mit Stärke <b>{J.I(t, "strength")}</b>", st);
            else if (own == o.MyId)
            {
                y = Txt(y, $"<color=#8EF0A0>Deine Insel.</color> Besatzung: {Units.Text(J.U(t, "gu"))}", stSmall);
                if (Units.Sum(J.U(t, "gu")) > 0 && Btn(new Rect(0, y, W, 60), "Besatzung heimholen", !o.Busy)) o.Withdraw(id);
                if (Units.Sum(J.U(t, "gu")) > 0) y += 68f;
                y = Sub(y, "Verstärkung schicken");
                y = TroopForm(c, y, "");
                if (Btn(new Rect(0, y, W, 66), "<b>Verstärken</b>", Units.Sum(form) > 0 && !o.Busy)) { float tt = TravelTo(c, J.F(t, "x"), J.F(t, "y")); o.SendMarch("terr", id, (int[])form.Clone(), Boost(c), SpeedMul(c), null); Sent(c, tt); }
                return y + 76f;
            }
            else
            {
                bool ally = o.InAlliance && J.S(t, "owner_alliance") == o.AllyId;
                y = Txt(y, $"Besetzt von <b>{J.S(t, "owner_name")}</b>" + (ally ? " (Verbündeter)" : ""), stSmall);
                if (ally) return y;
            }
            bool closed = kind == "Leuchtturm" && o.Lh != null && !J.B(o.Lh, "open");
            if (closed) return Txt(y, "<color=#FFD27A>Gerade kein Kampf um den Leuchtturm.</color>", stSmall);
            return AttackBlock(c, y, "terr", id, J.F(t, "x"), J.F(t, "y"), o.InAlliance);
        }

        float FieldDetails(Colony c, float y)
        {
            var o = O; var f = mapSel; int id = J.I(f, "id");
            foreach (var x in J.L(o.World, "fields")) if (J.I(x, "id") == id) { f = x; mapSel = x; }
            int kind = Mathf.Clamp(J.I(f, "kind") - 1, 0, 3);
            string[] nm = { "Treibholz-Feld", "Muschelbank", "Süßwasserquelle", "Schrottberg" };
            y = Txt(y, $"<b>{nm[kind]}</b> · Stufe {J.I(f, "level")}", st);
            y = Txt(y, $"Vorrat: <b>{J.I(f, "amount")}</b> / {J.I(f, "total")} {Defs.ResNames[kind]}. Je höher die Stufe, desto schneller wird gesammelt. Feinde können deinen Trupp angreifen und vertreiben!", stSmall);
            Bar(new Rect(0, y, W, 14), J.F(f, "amount") / Mathf.Max(1, J.F(f, "total")), new Color(1f, 0.85f, 0.45f)); y += 22f;
            foreach (var m in o.Marches)
                if (J.I(m, "field_id") == id && J.Has(m, "field_id"))
                {
                    if (J.S(m, "status") == "gather")
                    {
                        y = Txt(y, $"Dein Trupp sammelt ({Units.Text(J.U(m, "u"))}) · fertig in {Defs.Time(Math.Max(0, (J.Ms(m, "gather_end") - o.ServerNowMs) / 1000))}", stSmall);
                        if (Btn(new Rect(0, y, W, 62), "Zurückrufen (bringt das Gesammelte mit)", !o.Busy)) o.GatherRecall((long)J.N(m, "id"));
                        return y + 70f;
                    }
                    return Txt(y, "Dein Trupp ist unterwegs.", stSmall);
                }
            string occ = J.S(f, "occ"); bool ally = occ != "" && o.InAlliance && J.S(f, "occ_ally") == o.AllyId;
            if (occ != "") y = Txt(y, $"Hier sammelt gerade <b>{occ}</b>" + (ally ? " (Verbündeter)" : " – greif an, um das Feld zu übernehmen!"), stSmall);
            if (ally) return y;
            float carry = Units.CarryOf(form), rate = Mathf.Max(1, carry) / 1800f * (1 + 0.15f * J.I(f, "level"));
            float tt = TravelTo(c, J.F(f, "x"), J.F(f, "y"));
            y = TroopForm(c, y, Units.Sum(form) > 0 ? $"Fahrt etwa {Defs.Time(tt)} · Traglast {carry:0} → etwa {Defs.Time(Mathf.Min(carry, J.F(f, "amount")) / rate)} Sammelzeit" : "Tipp: Wattläufer tragen am meisten.");
            if (Btn(new Rect(0, y, W, 70), occ != "" ? "<b>Angreifen & sammeln!</b>" : "<b>Sammeln!</b>", Units.Sum(form) > 0 && !o.Busy)) { o.SendMarch("gather", id, (int[])form.Clone(), Boost(c), SpeedMul(c), null); Sent(c, tt); }
            return y + 80f;
        }

        float BossDetails(Colony c, float y)
        {
            var o = O; var b = o.BossI;
            y = Txt(y, "<b>Riesenkrake</b> – alle Spieler kämpfen gemeinsam. Je mehr Schaden, desto größer die Belohnung. Pro Angriff gehen 12 % der Krieger verloren, alle 5 Minuten einmal.", stSmall);
            if (b == null) return Txt(y, "Lade …", stSmall);
            if (!J.B(b, "active")) return Txt(y, "Gerade ist keine Riesenkrake da.", stSmall);
            y = Txt(y, $"Stufe {J.I(b, "level")} · Lebenskraft {J.I(b, "hp")} / {J.I(b, "maxhp")}", st);
            Bar(new Rect(0, y, W, 16), J.F(b, "hp") / Mathf.Max(1, J.F(b, "maxhp")), new Color(0.9f, 0.3f, 0.35f)); y += 24f;
            y = Txt(y, $"Dein Schaden: {J.I(b, "mine")}", stSmall);
            foreach (var p in J.L(b, "players")) y = Txt(y, $"{J.S(p, "name")}: {J.I(p, "dmg")}", stTiny);
            float cd = J.F(b, "cooldown");
            if (cd > 0) return Txt(y, $"Nächster Angriff in {Defs.Time(cd)}", stSmall);
            y = TroopForm(c, y, $"Schaden etwa {Mathf.RoundToInt(Units.Str(form, null, true, 0) * Boost(c))}");
            if (Btn(new Rect(0, y, W, 70), "<b>Angreifen!</b>", Units.Sum(form) > 0 && !o.Busy)) { o.BossAttack((int[])form.Clone(), Mathf.Clamp(Boost(c), 1f, 1.8f)); System.Array.Clear(form, 0, 5); }
            return y + 80f;
        }

        /// Rohstoffe auswählen (Hilfe, Spenden)
        float ResPicker(Colony c, float y, string label, Action send)
        {
            for (int i = 0; i < 4; i++)
            {
                GUI.Label(new Rect(0, y + 12, 200, 36), $"<color={Defs.ResHex[i]}>{Defs.ResNames[i]}</color> <size=15>({Mathf.FloorToInt(c.S.res[i])})</size>", stSmall);
                if (Btn(new Rect(200, y, 86, 54), "−1000")) amt[i] = Mathf.Max(0, amt[i] - 1000);
                if (Btn(new Rect(290, y, 76, 54), "−100")) amt[i] = Mathf.Max(0, amt[i] - 100);
                GUI.Label(new Rect(368, y, 100, 54), $"<b>{amt[i]:0}</b>", stMid);
                if (Btn(new Rect(470, y, 76, 54), "+100")) amt[i] = Mathf.Min(Mathf.Floor(c.S.res[i]), amt[i] + 100);
                if (Btn(new Rect(550, y, W - 550, 54), "+1000")) amt[i] = Mathf.Min(Mathf.Floor(c.S.res[i]), amt[i] + 1000);
                y += 60f;
            }
            if (label == null) return y;
            float tot = amt[0] + amt[1] + amt[2] + amt[3];
            if (Btn(new Rect(0, y, W, 66), $"<b>{label}</b> ({tot:0})", tot > 0 && !O.Busy)) { send(); for (int i = 0; i < 4; i++) amt[i] = 0; }
            return y + 74f;
        }

        // ---------- Allianz ----------
        float AllyContent(Colony c, float y)
        {
            var o = O;
            if (!On) { y = Txt(y, "Allianzen gibt es im Online-Spiel. Gemeinsam helft ihr euch beim Bauen, verteidigt euch gegenseitig, forscht zusammen und führt Kriege.", stSmall); if (Btn(new Rect(0, y, W, 66), "Online gehen")) { PlayerPrefs.SetInt("pf_offline", 0); panel = null; } return y + 76f; }
            var A = o.Alliances;
            if (A == null) return Txt(y, "Lade …", stSmall);
            if (!o.InAlliance)
            {
                y = Txt(y, "Du bist in keiner Allianz. Tritt einer bei oder gründe deine eigene.", stSmall);
                foreach (var a in J.L(A, "list"))
                {
                    Card(y, 66);
                    GUI.Label(new Rect(12, y + 6, W - 200, 56), $"<b>[{J.S(a, "tag")}] {J.S(a, "name")}</b>\n<size=16>{J.I(a, "members")} Mitglieder · Macht {J.I(a, "power")}</size>", stSmall);
                    if (Btn(new Rect(W - 170, y + 6, 158, 54), "Beitreten", !o.Busy)) o.JoinAlliance(J.S(a, "id"));
                    y += 72f;
                }
                y = Sub(y, "Eigene Allianz gründen");
                inAllyName = GUI.TextField(new Rect(0, y, W, 62), inAllyName, 24, Field()); y += 68f;
                GUI.Label(new Rect(0, y + 12, 200, 40), "Kürzel (2–4):", stSmall);
                inAllyTag = GUI.TextField(new Rect(200, y, 200, 62), inAllyTag, 4, Field());
                if (Btn(new Rect(420, y, W - 420, 62), "Gründen", !o.Busy && inAllyName.Trim().Length >= 3 && inAllyTag.Trim().Length >= 2)) o.CreateAlliance(inAllyName.Trim(), inAllyTag.Trim().ToUpperInvariant());
                return y + 72f;
            }
            switch (tab)
            {
                case "help": return AllyHelp(c, y);
                case "garr": return AllyGarr(c, y);
                case "res": return AllyRes(c, y);
                case "war": return AllyWar(c, y);
                case "rally": return AllyRally(c, y);
            }
            object mine = null; foreach (var a in J.L(A, "list")) if (J.S(a, "id") == o.AllyId) mine = a;
            bool leader = mine != null && J.S(mine, "leader") == o.MyId;
            if (mine != null) y = Txt(y, $"<b>[{J.S(mine, "tag")}] {J.S(mine, "name")}</b> · {J.I(mine, "members")} Mitglieder · Macht {J.I(mine, "power")}", st);
            if (helpMode)
            {
                y = Sub(y, $"Rohstoffe an {donToName}");
                y = ResPicker(c, y, "Schicken", () => { o.SendHelp(donTo, (float[])amt.Clone()); helpMode = false; });
                if (Btn(new Rect(0, y, W, 56), "Zurück")) helpMode = false;
                return y + 64f;
            }
            y = Sub(y, "Mitglieder");
            foreach (var m in J.L(A, "members"))
            {
                string id = J.S(m, "id");
                Card(y, 60);
                GUI.Label(new Rect(12, y + 12, W - 330, 40), (J.B(m, "online") ? "<color=#8EF0A0>●</color> " : "  ") + $"<b>{J.S(m, "name")}</b> <size=16>Macht {J.I(m, "power")}</size>", stSmall);
                if (id != o.MyId)
                {
                    if (Btn(new Rect(W - 320, y + 4, 150, 52), "<size=17>Rohstoffe</size>")) { helpMode = true; donTo = id; donToName = J.S(m, "name"); }
                    string ck = "kick" + id;
                    if (leader && Btn(new Rect(W - 162, y + 4, 150, 52), confirmKey == ck ? "<color=#FFB0A0>Sicher?</color>" : "<size=17>Entfernen</size>"))
                    { if (confirmKey == ck) { o.Kick(id); confirmKey = null; } else confirmKey = ck; }
                }
                y += 66f;
            }
            y = Sub(y, "Allianz-Chat");
            int from = Mathf.Max(0, o.Chat.Count - 30);
            for (int k = from; k < o.Chat.Count; k++)
            {
                var m = o.Chat[k];
                y = Txt(y, $"<b>{(J.B(m, "me") ? "<color=#FFE08A>" : "")}{J.S(m, "name")}{(J.B(m, "me") ? "</color>" : "")}:</b> {J.Clean(J.S(m, "text"))}", stSmall);
            }
            inChat = GUI.TextField(new Rect(0, y, W - 170, 62), inChat, 200, Field());
            if (Btn(new Rect(W - 160, y, 160, 62), "Senden", inChat.Trim().Length > 0 && !o.Busy)) { o.SendChat(inChat.Trim()); inChat = ""; }
            y += 76f;
            if (Btn(new Rect(0, y, W, 56), confirmKey == "leave" ? "<color=#FFB0A0>Wirklich austreten?</color>" : "Allianz verlassen")) { if (confirmKey == "leave") { o.LeaveAlliance(); confirmKey = null; } else confirmKey = "leave"; }
            return y + 64f;
        }

        float AllyHelp(Colony c, float y)
        {
            var o = O;
            y = Txt(y, "Jeder Bau und jede Forschung bittet deine Allianz automatisch um Hilfe. Jeder Tipp eines Verbündeten verkürzt die Restzeit (mind. 30 Sek., bei langen Aufträgen 1,5 %). Fürs Helfen gibt es 15 Altmetall und 1 VIP-Punkt (bis 30× am Tag).", stSmall);
            if (o.Helps == null) return Txt(y, "Lade …", stSmall);
            if (Btn(new Rect(0, y, W, 66), $"<b>Allen helfen ({o.Helps.Count})</b>", o.Helps.Count > 0 && !o.Busy)) o.HelpGive(null);
            y += 74f;
            foreach (var h in o.Helps)
            {
                Card(y, 76);
                GUI.Label(new Rect(12, y + 6, W - 200, 40), $"<b>{J.S(h, "name")}</b> <size=16>{J.Clean(J.S(h, "label"))}</size>", stSmall);
                Bar(new Rect(12, y + 48, W - 220, 14), J.F(h, "got") / Mathf.Max(1, J.F(h, "max")), new Color(0.45f, 0.9f, 0.6f));
                if (Btn(new Rect(W - 170, y + 10, 158, 56), "Helfen", !o.Busy)) o.HelpGive((long)J.N(h, "id"));
                y += 82f;
            }
            if (o.Helps.Count == 0) y = Txt(y, "Gerade braucht niemand Hilfe.", stSmall);
            return y;
        }

        float AllyGarr(Colony c, float y)
        {
            var o = O; var G = o.Garr; int cap = 15 + 10 * c.TowerLevel;
            if (donTo != "")
            {
                y = Sub(y, $"Krieger zu {donToName} ({donFree} Plätze frei)");
                y = Txt(y, "Deine Krieger verteidigen seine Stadt mit, bis er sie zurückschickt oder du sie zurückholst. Pro 5 Krieger gibt es 1 VIP-Punkt.", stTiny);
                y = TroopForm(c, y, "");
                if (Btn(new Rect(0, y, W / 2 - 6, 66), "<b>Schicken</b>", Units.Sum(form) > 0 && Units.Sum(form) <= donFree && !o.Busy)) { o.TroopDonate(donTo, (int[])form.Clone()); donTo = ""; System.Array.Clear(form, 0, 5); }
                if (Btn(new Rect(W / 2 + 6, y, W / 2 - 6, 66), "Zurück")) donTo = "";
                return y + 76f;
            }
            y = Txt(y, "In deiner Allianzburg können Verbündete Krieger stationieren, die deine Stadt gegen Spieler-Angriffe mitverteidigen. Platz: 15 + 10 je Gezeitenturm-Stufe.", stSmall);
            if (G == null) return Txt(y, "Lade …", stSmall);
            y = Txt(y, $"Deine Burg: <b>{J.I(G, "total")}/{cap}</b> Krieger · {Units.Text(J.U(G, "u"))}", st);
            if (Btn(new Rect(0, y, W, 60), "Um Verstärkung bitten", J.I(G, "total") < cap && !o.Busy)) o.TroopRequest();
            y += 68f;
            foreach (var r in J.L(G, "rows"))
            {
                Card(y, 64);
                GUI.Label(new Rect(12, y + 6, W - 200, 56), $"<b>{J.S(r, "name")}</b>\n<size=16>{Units.Text(J.U(r, "u"))}</size>", stSmall);
                if (Btn(new Rect(W - 190, y + 6, 178, 52), "<size=17>Zurückschicken</size>", !o.Busy)) o.GarrisonBack(J.S(r, "donor"));
                y += 70f;
            }
            y = Sub(y, "Verbündete bitten um Verstärkung");
            var req = J.L(G, "req");
            foreach (var r in req)
            {
                Card(y, 64);
                GUI.Label(new Rect(12, y + 14, W - 220, 40), $"<b>{J.S(r, "name")}</b> <size=16>{J.I(r, "free")} Plätze frei</size>", stSmall);
                if (Btn(new Rect(W - 210, y + 6, 198, 52), "<size=17>Krieger schicken</size>")) { donTo = J.S(r, "id"); donToName = J.S(r, "name"); donFree = J.I(r, "free"); System.Array.Clear(form, 0, 5); }
                y += 70f;
            }
            if (req.Count == 0) y = Txt(y, "Gerade keine Anfragen.", stSmall);
            var mineL = J.L(G, "mine");
            if (mineL.Count > 0)
            {
                y = Sub(y, "Deine Krieger bei anderen");
                foreach (var r in mineL)
                {
                    Card(y, 64);
                    GUI.Label(new Rect(12, y + 6, W - 200, 56), $"<b>{J.S(r, "name")}</b>\n<size=16>{Units.Text(J.U(r, "u"))}</size>", stSmall);
                    if (Btn(new Rect(W - 190, y + 6, 178, 52), "<size=17>Zurückholen</size>", !o.Busy)) o.GarrisonBack(J.S(r, "host"));
                    y += 70f;
                }
            }
            return y;
        }

        static readonly Dictionary<string, string[]> AllyKinds = new Dictionary<string, string[]>
        {
            { "deich", new[] { "Allianz-Deich", "Damm aller Mitglieder +0,5 m je Stufe" } },
            { "speicher", new[] { "Gemeinschaftsspeicher", "+10 % Lagerplatz je Stufe" } },
            { "werkstatt", new[] { "Werkstatt", "+4 % Produktion je Stufe" } },
            { "f_atk", new[] { "Kriegskunst", "+2 % Angriff je Stufe" } },
            { "f_def", new[] { "Bollwerk", "+2 % Verteidigung je Stufe" } },
            { "f_gather", new[] { "Sammlergilde", "+5 % Sammeln je Stufe" } },
            { "f_build", new[] { "Bauhütte", "−3 % Bauzeit je Stufe" } },
            { "f_march", new[] { "Seewege", "−3 % Fahrzeit je Stufe" } },
        };

        float AllyRes(Colony c, float y)
        {
            var o = O;
            if (donKind != null)
            {
                y = Sub(y, "Spenden für " + AllyKinds[donKind][0]);
                y = ResPicker(c, y, "Spenden", () => { o.AllyDonate(donKind, (float[])amt.Clone()); donKind = null; });
                if (Btn(new Rect(0, y, W, 56), "Zurück")) donKind = null;
                return y + 64f;
            }
            y = Txt(y, "Alle spenden Rohstoffe, jede Stufe wirkt für jedes Mitglied. Pro 500 gespendete Rohstoffe gibt es 1 VIP-Punkt.", stSmall);
            if (o.Projects == null) return Txt(y, "Lade …", stSmall);
            foreach (var p in o.Projects)
            {
                string k = J.S(p, "kind"); if (!AllyKinds.ContainsKey(k)) continue;
                if (k == "f_atk") y = Sub(y, "Allianz-Forschung");
                int L = J.I(p, "level");
                Card(y, 96);
                GUI.Label(new Rect(12, y + 4, W - 200, 34), $"<b>{AllyKinds[k][0]}</b>  Stufe {L}/10", st);
                GUI.Label(new Rect(12, y + 38, W - 200, 26), AllyKinds[k][1], stTiny);
                if (L < 10) { Bar(new Rect(12, y + 68, W - 220, 14), J.F(p, "progress") / Mathf.Max(1, J.F(p, "goal")), new Color(1f, 0.8f, 0.3f)); if (Btn(new Rect(W - 170, y + 18, 158, 60), "Spenden")) { donKind = k; for (int i = 0; i < 4; i++) amt[i] = 0; } }
                y += 102f;
            }
            return y;
        }

        float AllyWar(Colony c, float y)
        {
            var o = O; var WI = o.WarI;
            y = Txt(y, "Allianz-Krieg: 48 Stunden, jedes Mitglied hat 2 Kriegsangriffe. Ein Sieg bringt 1–3 Sterne (je klarer, desto mehr), eine eroberte Insel 3 Sterne. Gezählt werden die besten Sterne je Gegner. Die Sieger bekommen Abzeichen, Rohstoffe, Schmiedeeisen und einen 1-Std.-Beschleuniger.", stSmall);
            if (WI == null) return Txt(y, "Lade …", stSmall);
            var w = J.D(WI, "war");
            if (w == null)
            {
                if (!J.B(WI, "leader")) return Txt(y, "Gerade herrscht Frieden. Nur euer Anführer kann einen Krieg erklären.", stSmall);
                y = Sub(y, "Gegner wählen");
                foreach (var t in J.L(WI, "targets"))
                {
                    string id = J.S(t, "id"), ck = "war" + id;
                    Card(y, 66);
                    GUI.Label(new Rect(12, y + 6, W - 220, 56), $"<b>[{J.S(t, "tag")}] {J.S(t, "name")}</b>\n<size=16>{J.I(t, "n")} Mitglieder · Macht {J.I(t, "power")}</size>", stSmall);
                    if (Btn(new Rect(W - 200, y + 6, 188, 54), confirmKey == ck ? "<color=#FFB0A0><b>Wirklich?</b></color>" : "<size=17>Krieg erklären</size>", !o.Busy))
                    { if (confirmKey == ck) { o.WarDeclare(id); confirmKey = null; } else confirmKey = ck; }
                    y += 72f;
                }
                return y;
            }
            bool done = J.S(w, "status") != "active";
            var us = J.D(w, "us"); var them = J.D(w, "them");
            string mid = done ? (J.S(w, "winner") == "us" ? "<color=#8EF0A0>Sieg!</color>" : J.S(w, "winner") == "them" ? "Niederlage" : "Unentschieden") : Defs.Time(Math.Max(0, (J.Ms(w, "ends") - o.ServerNowMs) / 1000));
            Card(y, 90);
            GUI.Label(new Rect(0, y + 6, W / 3, 80), $"<b>[{J.S(us, "tag")}]</b>\n<size=30><b>{J.I(us, "score")}</b></size>", stMid);
            GUI.Label(new Rect(W / 3, y + 6, W / 3, 80), mid, stMid);
            GUI.Label(new Rect(2 * W / 3, y + 6, W / 3, 80), $"<b>[{J.S(them, "tag")}]</b>\n<size=30><b>{J.I(them, "score")}</b></size>", stMid);
            y += 98f;
            if (!done) y = Txt(y, $"Deine Kriegsangriffe übrig: <b>{J.I(w, "hits_left")}/2</b>", st);
            y = Sub(y, "Gegner");
            foreach (var e in J.L(w, "enemies"))
            {
                int stars = Mathf.Clamp(J.I(e, "stars"), 0, 3);
                Card(y, 70);
                GUI.Label(new Rect(12, y + 6, W - 200, 60), $"<b>{J.S(e, "name")}</b> <size=16>Macht {J.I(e, "power")}{(J.B(e, "shield") ? " · Schutz" : "")}</size>\n<size=17>Sterne: {new string('*', stars)}{new string('-', 3 - stars)}</size>", stSmall);
                if (!done && Btn(new Rect(W - 170, y + 8, 158, 54), "Angreifen", !J.B(e, "shield") && J.I(w, "hits_left") > 0)) { pendingPlayer = J.S(e, "id"); OpenPanel("map"); }
                y += 76f;
            }
            y = Sub(y, "Unsere Seite");
            foreach (var e in J.L(w, "ours")) y = Txt(y, $"{J.S(e, "name")} · Angriffe {J.I(e, "used")}/2 · verlorene Sterne {J.I(e, "stars")}", stSmall);
            return y;
        }

        float AllyRally(Colony c, float y)
        {
            var o = O;
            if (rallyJoinId >= 0)
            {
                y = Sub(y, "Beim Sammelangriff mitmachen");
                y = TroopForm(c, y, "");
                if (Btn(new Rect(0, y, W / 2 - 6, 66), "<b>Mitmachen</b>", Units.Sum(form) > 0 && !o.Busy)) { o.RallyJoin(rallyJoinId, (int[])form.Clone()); rallyJoinId = -1; System.Array.Clear(form, 0, 5); }
                if (Btn(new Rect(W / 2 + 6, y, W / 2 - 6, 66), "Zurück")) rallyJoinId = -1;
                return y + 76f;
            }
            y = Txt(y, "Sammelangriffe: Ein Mitglied ruft auf der Seekarte zum gemeinsamen Angriff, alle anderen können Krieger dazugeben. Ausrufen geht bei einer Stadt oder Insel auf der Karte.", stSmall);
            if (o.Rallies == null) return Txt(y, "Lade …", stSmall);
            if (o.Rallies.Count == 0) return Txt(y, "Gerade keine Sammelangriffe.", stSmall);
            foreach (var r in o.Rallies)
            {
                string status = J.S(r, "status");
                double launch = J.Ms(r, "launch_at"), now = o.ServerNowMs;
                var parts = J.L(r, "parts"); int total = 0; bool meIn = false;
                foreach (var p in parts) { total += Units.Sum(J.U(p, "u")); if (J.B(p, "me")) meIn = true; }
                Card(y, 96);
                GUI.Label(new Rect(12, y + 6, W - 200, 86), $"<b>{J.S(r, "leader")}</b> gegen <b>{J.S(r, "target")}</b>\n<size=16>{(status == "open" ? "Start in " + Defs.Time(Math.Max(0, (launch - now) / 1000)) : "unterwegs")} · {parts.Count} Teilnehmer · {total} Krieger</size>", stSmall);
                if (status == "open" && !meIn && Btn(new Rect(W - 170, y + 18, 158, 58), "Mitmachen")) { rallyJoinId = (long)J.N(r, "id"); System.Array.Clear(form, 0, 5); }
                y += 102f;
            }
            return y;
        }

        // ---------- Arena ----------
        static readonly string[] Leagues = { "Bronze", "Silber", "Gold", "Kristall", "Meister", "Champion" };
        static readonly int[] LeagueAt = { 0, 400, 800, 1200, 1800, 2600 };

        static Replay ReplayFrom(object d)
        {
            if (d == null) return null;
            var a = J.D(d, "a"); var de = J.D(d, "d");
            if (a == null || de == null) return null;
            return new Replay { an = J.S(a, "n"), au = J.U(a, "u"), al = J.U(a, "l"), dn = J.S(de, "n"), du = J.U(de, "u"), dl = J.U(de, "l"), def = J.I(de, "def"), df = J.U(de, "f"), win = J.B(d, "win"), tide = J.I(d, "tide"), arena = J.B(d, "arena"), raid = J.B(d, "raid") };
        }

        float ArenaTab(Colony c, float y)
        {
            var o = O; var A = o.Arena;
            if (!On) return Txt(y, "Die Arena gibt es im Online-Spiel.", stSmall);
            if (A == null) return Txt(y, "Lade …", stSmall);
            int lg = Mathf.Clamp(J.I(A, "league"), 0, 5), tr = J.I(A, "tr");
            y = Txt(y, $"<b>{Leagues[lg]}-Liga</b> · {tr} Pokale" + (lg < 5 ? $" · {Leagues[lg + 1]} ab {LeagueAt[lg + 1]}" : ""), st);
            y = Txt(y, "Trainingskämpfe: Deine Krieger zu Hause kämpfen gegen die Verteidiger anderer – niemand verliert dabei Krieger. Sieg bringt Pokale, Niederlage kostet welche.", stSmall);
            int att = Mathf.RoundToInt(Units.Str(c.S2.troops, null, true, 0) * c.M.Atk);
            y = Txt(y, $"Kämpfe heute: <b>{J.I(A, "left")}/{J.I(A, "max")}</b> · Deine Angriffskraft: <b>{att}</b>", stSmall);
            bool claim = J.B(A, "claim");
            if (Btn(new Rect(0, y, W, 62), claim ? $"<b>Liga-Belohnung ({Leagues[lg]})</b>" : "Belohnung heute abgeholt", claim && !o.Busy)) o.ArenaClaim();
            y += 70f;
            y = Sub(y, "Gegner");
            foreach (var p in J.L(A, "opps"))
            {
                bool bot = J.Has(p, "bot");
                Card(y, 66);
                GUI.Label(new Rect(12, y + 6, W - 200, 56), $"<b>{J.S(p, "name")}</b>{(bot ? " <size=15>(Geisterkapitän)</size>" : "")}\n<size=16>{J.I(p, "tr")} Pokale · Macht {J.I(p, "power")}</size>", stSmall);
                if (Btn(new Rect(W - 170, y + 6, 158, 54), "Kämpfen", J.I(A, "left") > 0 && Units.Sum(c.S2.troops) > 0 && !o.Busy))
                    o.ArenaFight(bot ? "" : J.S(p, "id"), bot ? J.I(p, "bot") : 0, Mathf.Clamp(c.M.Atk, 1f, 1.8f), d => { c.Msg(J.B(d, "win") ? $"Arena-Sieg! +{J.I(d, "dt")} Pokale" : $"Arena: Niederlage. {J.I(d, "dt")} Pokale"); replay = ReplayFrom(J.V(d, "replay")); replayT = 0; });
                y += 72f;
            }
            var log = J.L(A, "log");
            if (log.Count > 0)
            {
                y = Sub(y, "Letzte Kämpfe");
                foreach (var l in log)
                {
                    bool win = J.B(l, "win");
                    Card(y, 56, win ? txGood : txBad);
                    GUI.Label(new Rect(12, y + 10, W - 170, 40), $"{(J.B(l, "att") ? "gegen" : "von")} <b>{J.S(l, "name")}</b> · {(win ? "Sieg" : "Niederlage")} {(J.I(l, "dt") > 0 ? "+" : "")}{J.I(l, "dt")}", stSmall);
                    var rp = J.V(l, "replay");
                    if (rp != null && Btn(new Rect(W - 140, y + 4, 128, 48), "<size=17>Ansehen</size>")) { replay = ReplayFrom(rp); replayT = 0; }
                    y += 62f;
                }
            }
            return y;
        }

        float OnlineReportsTab(Colony c, float y)
        {
            var o = O;
            if (o.Reports.Count == 0) return Txt(y, "Noch keine Berichte.", stSmall);
            foreach (var r in o.Reports)
            {
                string text = J.Clean(J.S(r, "text")); bool hasRp = J.B(r, "rp");
                var wv = J.V(r, "win"); var tex = wv is bool b ? (b ? txGood : txBad) : null;
                float h = Mathf.Max(64f, stSmall.CalcHeight(new GUIContent(text), W - (hasRp ? 150 : 24)) + 36f);
                Card(y, h, tex);
                double ms = J.Ms(r, "at");
                string when = ms > 0 ? DateTimeOffset.FromUnixTimeMilliseconds((long)ms).ToLocalTime().ToString("dd.MM. HH:mm") : "";
                GUI.Label(new Rect(12, y + 4, W - 24, 24), when, stTiny);
                GUI.Label(new Rect(12, y + 28, W - (hasRp ? 150 : 24), h - 30), text, stSmall);
                if (hasRp && Btn(new Rect(W - 130, y + 10, 118, 54), "Ansehen", !o.Busy)) o.Replay((long)J.N(r, "id"), d => { replay = ReplayFrom(d); replayT = 0; });
                y += h + 6f;
            }
            return y;
        }

        float RankTab(Colony c, float y)
        {
            var o = O;
            if (o.Ranking == null) return Txt(y, "Lade …", stSmall);
            y = Txt(y, "Die Besten nach Macht. Am Monatsende bekommen die Top 10 einen Titel.", stSmall);
            int k = 0;
            foreach (var r in o.Ranking)
            {
                k++;
                bool me = J.B(r, "me"); string tag = J.S(r, "tag"), title = J.S(r, "title");
                Card(y, 56, me ? txGood : null);
                GUI.Label(new Rect(12, y + 10, W - 24, 40), $"<b>{k}.</b> {(tag != "" ? "[" + tag + "] " : "")}<b>{J.S(r, "name")}</b>{(title != "" ? " · " + title : "")} <size=16>· Macht {J.I(r, "power")} · Inseln {J.I(r, "terr")} · VIP {J.I(r, "vip")}</size>", stSmall);
                y += 62f;
            }
            return y;
        }

        // ---------- Spielleiter ----------
        float AdminContent(Colony c, float y)
        {
            var o = O;
            if (!o.IsAdmin) return Txt(y, "Nur für den Spielleiter.", stSmall);
            if (tab == "msg")
            {
                y = Sub(y, "Nachricht an alle");
                inAdm = GUI.TextField(new Rect(0, y, W - 170, 62), inAdm, 300, Field());
                if (Btn(new Rect(W - 160, y, 160, 62), "Senden", inAdm.Trim().Length > 0 && !o.Busy)) { o.AdminBroadcast(inAdm.Trim()); inAdm = ""; }
                y += 72f;
                y = Sub(y, "Ereignisse");
                if (Btn(new Rect(0, y, W / 2 - 6, 60), "<size=18>Sturmflut 30 Min.</size>", !o.Busy)) o.AdminEvent("sturmflut", 30);
                if (Btn(new Rect(W / 2 + 6, y, W / 2 - 6, 60), "<size=18>Sammel-Fest 60 Min.</size>", !o.Busy)) o.AdminEvent("doppelt", 60);
                y += 68f;
                if (Btn(new Rect(0, y, W / 2 - 6, 60), "<size=18>Ereignisse stoppen</size>", !o.Busy)) o.AdminEvent("stop", 1);
                if (Btn(new Rect(W / 2 + 6, y, W / 2 - 6, 60), "<size=18>Riesenkrake rufen</size>", !o.Busy)) o.AdminBoss();
                return y + 70f;
            }
            if (tab == "codes")
            {
                y = Sub(y, "Neuer Code");
                inNewCode = GUI.TextField(new Rect(0, y, W - 200, 62), inNewCode, 16, Field());
                if (Btn(new Rect(W - 190, y, 190, 62), "Zufällig"))
                {
                    const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; var sb = new System.Text.StringBuilder();
                    for (int i = 0; i < 8; i++) sb.Append(chars[UnityEngine.Random.Range(0, chars.Length)]);
                    inNewCode = sb.ToString();
                }
                y += 70f;
                y = ResPicker(c, y, null, null);
                GUI.Label(new Rect(0, y + 12, 220, 40), $"Gültig {codeDays} Tage", stSmall);
                if (Btn(new Rect(230, y, 80, 54), "−")) codeDays = Mathf.Max(1, codeDays - 1);
                if (Btn(new Rect(316, y, 80, 54), "+")) codeDays = Mathf.Min(365, codeDays + 1);
                y += 60f;
                GUI.Label(new Rect(0, y + 12, 220, 40), codeMax > 0 ? $"Max. {codeMax}×" : "Unbegrenzt oft", stSmall);
                if (Btn(new Rect(230, y, 80, 54), "−")) codeMax = Mathf.Max(0, codeMax - 10);
                if (Btn(new Rect(316, y, 80, 54), "+")) codeMax += 10;
                y += 60f;
                GUI.Label(new Rect(0, y + 12, 220, 40), $"VIP-Punkte {codeVip}", stSmall);
                if (Btn(new Rect(230, y, 80, 54), "−")) codeVip = Mathf.Max(0, codeVip - 50);
                if (Btn(new Rect(316, y, 80, 54), "+")) codeVip += 50;
                y += 62f;
                string code = inNewCode.Trim().ToUpperInvariant();
                if (Btn(new Rect(0, y, W, 66), "<b>Code speichern</b>", code.Length >= 4 && !o.Busy)) { o.SaveCode(code, (float[])amt.Clone(), Units.Zero(), codeDays, codeMax, codeVip); inNewCode = ""; }
                y += 74f;
                y = Sub(y, "Codes");
                if (o.Codes != null)
                    foreach (var k in o.Codes)
                    {
                        Card(y, 66, J.B(k, "active") ? null : txBad);
                        GUI.Label(new Rect(12, y + 6, W - 200, 56), $"<b>{J.S(k, "code")}</b> · {J.I(k, "uses")}{(J.Has(k, "max") ? "/" + J.I(k, "max") : "")}×\n<size=15>{J.Clean(J.S(k, "text"))}</size>", stSmall);
                        if (Btn(new Rect(W - 160, y + 6, 148, 54), "<size=17>Löschen</size>", !o.Busy)) o.DeleteCode(J.S(k, "code"));
                        y += 72f;
                    }
                return y;
            }
            if (tab == "players")
            {
                if (o.Players == null) return Txt(y, "Lade …", stSmall);
                foreach (var p in o.Players)
                {
                    bool banned = J.B(p, "banned");
                    Card(y, 60, banned ? txBad : null);
                    GUI.Label(new Rect(12, y + 12, W - 200, 40), $"<b>{J.S(p, "name")}</b>{(J.B(p, "admin") ? " (Spielleiter)" : "")} <size=16>Macht {J.I(p, "power")}</size>", stSmall);
                    if (!J.B(p, "admin") && Btn(new Rect(W - 170, y + 4, 158, 52), banned ? "<size=17>Entsperren</size>" : "<size=17>Sperren</size>", !o.Busy)) o.AdminBan(J.S(p, "id"), !banned);
                    y += 66f;
                }
                return y;
            }
            // Profilbilder prüfen
            y = Txt(y, "Neue Profilbilder prüfen: nur freigeben, was in Ordnung ist (keine echten Kinderfotos, nichts Anstößiges, keine fremden Rechte).", stSmall);
            if (o.AvQueue == null) return Txt(y, "Lade …", stSmall);
            if (o.AvQueue.Count == 0) return Txt(y, "Keine Bilder zu prüfen.", stSmall);
            foreach (var a in o.AvQueue)
            {
                string id = J.S(a, "player");
                var tex = AvatarTex(id, J.S(a, "data"));
                Card(y, 150);
                if (tex != null) GUI.DrawTexture(new Rect(12, y + 11, 128, 128), tex);
                GUI.Label(new Rect(156, y + 12, W - 170, 34), $"<b>{J.S(a, "name")}</b>", st);
                if (Btn(new Rect(156, y + 70, 200, 60), "Freigeben", !o.Busy)) o.AdminAvatarSet(id, true);
                if (Btn(new Rect(370, y + 70, 200, 60), "Ablehnen", !o.Busy)) o.AdminAvatarSet(id, false);
                y += 158f;
            }
            return y;
        }

        Texture2D AvatarTex(string id, string data)
        {
            if (avTex.TryGetValue(id, out var t)) return t;
            Texture2D tex = null;
            try
            {
                int k = data.IndexOf(','); string b64 = k >= 0 ? data.Substring(k + 1) : data;
                tex = new Texture2D(2, 2); tex.LoadImage(Convert.FromBase64String(b64));
            }
            catch (Exception) { tex = null; }
            avTex[id] = tex;
            return tex;
        }
    }
}
