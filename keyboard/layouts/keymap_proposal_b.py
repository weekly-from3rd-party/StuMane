"""提案B（53キー）のレイヤー設計案を keymap-drawer で図にする。

キーの並び（1レイヤー53個、build_layouts.b_labels と同じ順）:
  左: 数字行5 / 上段5 / 中段6（最後が内側）/ 下段6（最後が内側）/ 親指行6（Ctl Win Alt 親1 親2 親3）
  右: 数字行5 / 上段5 / 中段6（最初が内側）/ 下段6（最初が内側）/ 親指行3（親1 親2 Del）
表記: {t: Spc, h: SYM} は「タップで Spc、長押しで SYM レイヤー」。"▽" は下のレイヤーと同じ（透過）。
略語: Undo/Cut/Copy/Paste/Redo=Ctrl+Z/X/C/V/Y, BTclr=今のBT接続先を消去, Boot=書き込みモード,
      LClk/RClk/MClk=左/右/中クリック, C-←=Ctrl+←, NumLk=NumLock（Windows でテンキーを数字にする）
使い方: python3 keymap_proposal_b.py   → keymap-proposal-b.yaml / .svg を出力
"""
import json, pathlib, subprocess

HERE = pathlib.Path(__file__).parent
T = "▽"  # 透過


def ht(tap, hold):
    return {"t": tap, "h": hold}


def side(num, top, home, bottom, thumbs):
    assert (len(num), len(top), len(home), len(bottom)) == (5, 5, 6, 6)
    return num + top + home + bottom + thumbs


def layer(left, right):
    keys = left + right
    assert len(left) == 28 and len(right) == 25, (len(left), len(right))
    return keys


TR5, TR6 = [T] * 5, [T] * 6

LAYERS = {
    # 0: 通常入力。roBa と同じく Z と / は長押しで Shift。
    "0 BASE（通常）": layer(
        side(["1", "2", "3", "4", "5"],
             ["Q", "W", "E", "R", "T"],
             ["A", "S", "D", "F", "G", "Esc"],
             [ht("Z", "Shift"), "X", "C", "V", "B", "Tab"],
             ["Ctrl", "Win", "Alt", ht("英数", "NUM"), ht("Spc", "SYM"), ht("かな", "NAV")]),
        side(["6", "7", "8", "9", "0"],
             ["Y", "U", "I", "O", "P"],
             ["-", "H", "J", "K", "L", ";"],
             ["=", "N", "M", ",", ".", ht("/", "Shift")],
             [ht("BS", "NAV"), ht("Ent", "SYM"), "Del"])),
    # 1: テンキー。右手にテンキー、左手に移動・編集。左の内側(Esc の位置)で固定/解除。
    "1 NUM（テンキー）": layer(
        side(TR5,
             ["Esc", "Home", "↑", "End", "PgUp"],
             ["Tab", "←", "↓", "→", "PgDn", "固定"],
             ["Undo", "Cut", "Copy", "Paste", "Redo", T],
             [T, T, T, T, T, T]),
        side(["(", ")", "%", "NumLk", "BS"],
             ["/", "7", "8", "9", "-"],
             ["=", "*", "4", "5", "6", "+"],
             [",", "Tab", "1", "2", "3", "Ent"],
             ["0", ".", T])),
    # 2: 記号。左右どちらの親指でも入れる。
    "2 SYM（記号）": layer(
        side(["F1", "F2", "F3", "F4", "F5"],
             ["!", "@", "#", "$", "%"],
             ["`", "~", "[", "]", "\\", "|"],
             ["_", "+", "{", "}", "=", "-"],
             [T, T, T, T, T, T]),
        side(["F6", "F7", "F8", "F9", "F10"],
             ["^", "&", "*", "(", ")"],
             ["_", "'", "\"", ":", "<", ">"],
             ["+", "?", "{", "}", "F11", "F12"],
             [T, T, T])),
    # 3: 移動・機能。矢印は右手ホーム(HJKL)、Bluetooth 切替と音量は左手。
    "3 NAV（移動・機能）": layer(
        side(["BT1", "BT2", "BT3", "BT4", "BT5"],
             ["BTclr", "USB/BT", "Vol-", "Vol+", "Mute"],
             ["Ctrl", "Shift", "Alt", "Win", T, T],
             ["Boot", T, T, T, T, T],
             [T, T, T, T, T, T]),
        side(["Ins", "PrtSc", T, T, T],
             ["Home", "PgDn", "PgUp", "End", T],
             [T, "←", "↓", "↑", "→", T],
             [T, "C-←", "C-↓", "C-↑", "C-→", T],
             [T, T, T])),
    # 4: マウス。トラボを動かすと自動で入り、しばらく触らないと抜ける（ZMK の auto mouse）。
    "4 MOUSE（トラボで自動）": layer(
        side(TR5, TR5,
             [T, T, T, ht("Scroll", "押す間"), T, T],
             TR6,
             [T, T, T, T, T, T]),
        side(TR5, TR5,
             [T, "Back", "LClk", "RClk", "MClk", ht("Scroll", "押す間")],
             [T, "Fwd", T, T, T, T],
             [T, T, T])),
}


def main():
    jp = HERE / "proposal-b.json"
    if not jp.exists():
        subprocess.run(["python3", str(HERE / "build_layouts.py")], check=True)
    yp = HERE / "keymap-proposal-b.yaml"
    lines = ["layers:"]
    for name, keys in LAYERS.items():
        lines.append(f"  {json.dumps(name, ensure_ascii=False)}:")
        for kk in keys:
            if kk == T:
                kk = {"t": T, "type": "trans"}
            lines.append(f"    - {json.dumps(kk, ensure_ascii=False)}")
    yp.write_text("\n".join(lines) + "\n")
    svg = subprocess.run(["keymap", "-c", str(HERE / "keymap-drawer-config.yaml"), "draw",
                          "-j", str(jp), str(yp)], capture_output=True, text=True, check=True).stdout
    (HERE / "keymap-proposal-b.svg").write_text(svg)
    print("layers:", len(LAYERS))


if __name__ == "__main__":
    main()
