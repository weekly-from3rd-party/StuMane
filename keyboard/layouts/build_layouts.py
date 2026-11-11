"""roBa / ZaruBall の物理配列と、両者を参考にした提案Bを図(SVG)にする。

座標・キーの並びの出典（キー順は dtsi の keys の並び順と同じ）:
  roBa     : kumamuk-git/zmk-config-roBa  boards/shields/roBa/roBa.dtsi, config/roBa.keymap
  ZaruBall : ImSota/zmk-config-ZaruBall   boards/shields/ZaruBall/ZaruBall.dtsi
  dtsi は 1キー=100、回転は 1/100 度なので、ここではキー単位・度に直している。
トラックボールの円は dtsi に座標が無いため、写真から見た「概略位置」。

使い方:
  pip install keymap-drawer
  python3 build_layouts.py      # roba / zaruball / proposal-b の .json .yaml .svg を出力
"""
import json, pathlib, re, subprocess

HERE = pathlib.Path(__file__).parent


def k(x, y, r=0, rx=None, ry=None, w=1):
    d = {"x": x, "y": y, "w": w}
    if r:
        d.update(r=r, rx=rx, ry=ry)
    return d


# ---- roBa（43キー：左23 / 右20）-------------------------------------------
# 左: 5列(Q..T) + 内側1列(G の右) / 右: 内側1列(H の左) + 5列。外側の列は無い。
TOP = [.37, .12, 0, .12, .24]          # 上段 Q W E R T の列スタッガー
MID = TOP + [.37]                      # 中・下段は内側に1キー


def roba_left(dy=0):
    keys = [k(c, dy + TOP[c]) for c in range(5)]
    for row in (1, 2):
        keys += [k(c, dy + row + MID[c]) for c in range(6)]
    keys += [k(0, dy + 3.37), k(1, dy + 3.12), k(2, dy + 3), k(3.25, dy + 3.37),
             k(4.37, dy + 3.5, 10, 4.37, dy + 3.5), k(5.5, dy + 3.87, 20, 5.5, dy + 3.87)]
    return keys


def roba_right(dy=0):
    keys = [k(8 + c, dy + TOP[::-1][c]) for c in range(5)]
    for row in (1, 2):
        keys += [k(7 + c, dy + row + MID[::-1][c]) for c in range(6)]
    keys += [k(6.5, dy + 3.87, -20, 6.5, dy + 3.87), k(7.63, dy + 3.5, -10, 7.63, dy + 3.5),
             k(12, dy + 3.37)]
    return keys


roba_keys = roba_left() + roba_right()
roba_labels = ["Q", "W", "E", "R", "T",
               "A", "S", "D", "F", "G", "Win+Sft+S",
               "Z", "X", "C", "V", "B", ":",
               "Ctl", "Win", "Alt", "変換", "Spc", "無変換",
               "Y", "U", "I", "O", "P",
               "-", "H", "J", "K", "L", "'",
               ";", "N", "M", ",", ".", "/",
               "BS", "Ent", "Del"]

# ---- 提案B：roBa の形 + ZaruBall のような数字行（53キー：左28 / 右25）--------
NUM = [y - 1 for y in TOP]  # 数字行は上段と同じスタッガーで1段上
b_keys = ([k(c, 1 + NUM[c]) for c in range(5)] + roba_left(dy=1)
          + [k(8 + c, 1 + NUM[::-1][c]) for c in range(5)] + roba_right(dy=1))
b_labels = (["1", "2", "3", "4", "5"] + roba_labels[:23]
            + ["6", "7", "8", "9", "0"] + roba_labels[23:])

# ---- ZaruBall v3（公称：左31キー+エンコーダー / 右29キー）---------------------
# dtsi 上は 61 位置（左32 / 右29）。左のうち1位置はエンコーダー押下と思われる（未確認）。
ZY = [.5, .5, .25, 0, .25, .5]
zb_keys = []
for row in range(4):
    zb_keys += [k(c, row + ZY[c]) for c in range(6)]
    if row >= 2:
        zb_keys.append(k(6, row + .5))
zb_keys += [k(0, 4.5, w=1.5), k(1.75, 4.5), k(3, 4.5), k(4, 4.5),
            k(5.22, 4.55, 15, 5.22, 4.55), k(6.38, 4.9, 30, 6.38, 4.9)]
for row in range(4):
    if row >= 2:
        zb_keys.append(k(9, row + .5))
    zb_keys += [k(10 + c, row + ZY[::-1][c]) for c in range(6)]
zb_keys += [k(8.75, 5.4, -30, 8.75, 5.4), k(9.82, 4.8, -15, 9.82, 4.8), k(14.5, 4.5, w=1.5)]
zb_labels = (["Esc", "1", "2", "3", "4", "5", "Tab", "Q", "W", "E", "R", "T",
              "Ctl", "A", "S", "D", "F", "G", "内", "Sft", "Z", "X", "C", "V", "B", "内",
              "", "", "", "親", "親", "親"]
             + ["6", "7", "8", "9", "0", "BS", "Y", "U", "I", "O", "P", "-",
                "内", "H", "J", "K", "L", ";", "'", "内", "N", "M", ",", ".", "/", "Sft",
                "親", "親", ""])

# name: (図のタイトル, キー, ラベル, トラボ中心x, 中心y, 半径)  ※トラボはキー単位・概略
LAYOUTS = {
    "roba": ("roBa  43キー（左23 / 右20）", roba_keys, roba_labels, 10.3, 4.0, .9),
    "proposal-b": ("提案B  roBa＋数字行  53キー（左28 / 右25）", b_keys, b_labels, 10.3, 5.0, .9),
    "zaruball": ("ZaruBall v3  公称60キー＋エンコーダー（左31 / 右29）", zb_keys, zb_labels, 12.6, 5.3, .95),
}

CONFIG = HERE / "keymap-drawer-config.yaml"
CONFIG.write_text("draw_config:\n  append_colon_to_layer_header: false\n")

# keymap-drawer の既定値: 1キー = 56px、余白は x 30px / y 56px（レイヤー見出しの分）
UNIT, OX, OY = 56, 30, 56


def main():
    for name, (title, keys, labels, tx, ty, tr) in LAYOUTS.items():
        assert len(keys) == len(labels), (name, len(keys), len(labels))
        jp, yp = HERE / f"{name}.json", HERE / f"{name}.yaml"
        jp.write_text(json.dumps({"layouts": {"LAYOUT": {"layout": keys}}}, indent=1))
        yp.write_text(f"layers:\n  {json.dumps(title, ensure_ascii=False)}:\n"
                      + "".join(f"    - {json.dumps(l, ensure_ascii=False)}\n" for l in labels))
        svg = subprocess.run(["keymap", "-c", str(CONFIG), "draw", "-j", str(jp), str(yp)],
                             capture_output=True, text=True, check=True).stdout
        cx, cy, r = OX + UNIT * tx, OY + UNIT * ty, UNIT * tr
        ball = (f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r:.0f}" fill="#f4c7a6" fill-opacity="0.85" '
                f'stroke="#c46a2e" stroke-width="2"/><text x="{cx:.0f}" y="{cy:.0f}" '
                f'text-anchor="middle" dominant-baseline="middle" font-size="12">トラボ（概略）</text>')
        svg = re.sub(r"</svg>\s*$", ball + "</svg>\n", svg)
        (HERE / f"{name}.svg").write_text(svg)
        print(f"{name}: {len(keys)} keys")


if __name__ == "__main__":
    main()
