"""提案B（roBa＋数字行、53キー）を Auto-KDK の Import 用 JSON にする。

座標は ../layouts/build_layouts.py の提案B（roBa.dtsi 由来）をそのまま使う。
  - build_layouts 側: (x, y) はキー左上、回転は (rx, ry) 中心
  - Auto-KDK 側     : (x, y) はモジュールの中心、回転は中心まわり
    （Import して Placement Editor の目盛りとトラボの円の位置で確認済み）
行列（row, col）は片手 5行×6列。row 0=数字行, 1=上段, 2=中段, 3=下段, 4=親指行。
使い方: python3 build_autokdk.py [--encoder] [--switch choc2-19|mx-19|...] > proposal-b.autokdk.json
スイッチは Choc V2（19mm ピッチ）に決定済み。
"""
import argparse, json, math, pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "layouts"))
import build_layouts as BL  # noqa: E402

ROWS, COLS = 5, 6


def to_autokdk(key):
    """左上基準・(rx,ry) 回転のキーを、Auto-KDK の中心座標に直す。"""
    x, y, a = key["x"], key["y"], key.get("r", 0)
    rx, ry = key.get("rx", x), key.get("ry", y)
    t = math.radians(a)
    cx0, cy0 = x + .5 - rx, y + .5 - ry          # 回転中心から見たキー中心
    cx = rx + cx0 * math.cos(t) - cy0 * math.sin(t)
    cy = ry + cx0 * math.sin(t) + cy0 * math.cos(t)
    return round(cx, 4), round(cy, 4), a


# 提案Bの並び（build_layouts.b_keys の順）に (row, col) を割り当てる
LEFT_RC = ([(0, c) for c in range(5)] + [(1, c) for c in range(5)]
           + [(2, c) for c in range(6)] + [(3, c) for c in range(6)]
           + [(4, c) for c in range(6)])
RIGHT_RC = ([(0, c) for c in range(1, 6)] + [(1, c) for c in range(1, 6)]
            + [(2, c) for c in range(6)] + [(3, c) for c in range(6)]
            + [(4, 0), (4, 1), (4, 5)])
RIGHT_SHIFT = 6.0  # 右手は自分の座標系（左端が0付近）に移す


def side(keys, rcs, shift, controller, trackball=None, encoder=None, nudge=None, rc_override=None):
    mods = {}
    if rc_override:  # 親指3キー（並びの最後の3つ）の行列だけ差し替える
        rcs = list(rcs[:-3]) + list(rc_override)
    placed = {}
    for key, (r, c) in zip(keys, rcs):
        x, y, a = to_autokdk(key)
        dx, dy = (nudge or {}).get((r, c) if not rc_override else None, (0, 0))
        placed[(r, c)] = dict(x=round(x - shift + dx, 4), y=round(y + dy, 4), a=a)
    for r in range(ROWS):
        for c in range(COLS):
            p = placed.get((r, c), dict(x=c, y=r, a=0))
            mods[f"switch-{r:02d}-{c:02d}"] = dict(
                x=p["x"], y=p["y"], a=p["a"], width=1, height=1, row=r, col=c,
                enabled=(r, c) in placed, moduleType="switch", variant="")
    mods["controller"] = dict(controller, width=2, height=1, row=6, col=0, enabled=True,
                              moduleType="controller")
    mods["encoder"] = dict(x=0, y=0, a=0, width=1, height=1, row=6, col=1, enabled=False,
                           moduleType="encoder")
    if encoder:
        mods["encoder"].update(encoder, enabled=True)
    if trackball:
        mods["trackball"] = dict(trackball, width=2, height=2, row=6, col=2, enabled=True,
                                 moduleType="trackball", variant="thumb-34")
    assert sum(m["enabled"] for n, m in mods.items() if n.startswith("switch")) == len(keys)
    return {"schemeVersion": "1.1", "row": ROWS, "col": COLS, "modules": mods}


# ケースの既定値。Auto-KDK 2026-11-08 で Switch Type を切り替えて Export した値をそのまま使う
# （tools/autokdk_export.js）。Choc V2 はスイッチが低いので topHeight / plateHeight が小さい。
CASE_COMMON = {"connectorHeight": 2.5, "switchBoardHeight": 1.6, "controllerBoardHeight": 1.6,
               "batteryHeight": 6.2, "partsHeight": 2.5, "usbHeight": 3.5, "bottomMinThickness": 3,
               "tiltingAngle": 5.1, "tentingAngle": 0, "topRim": 3, "bottomRim": 3,
               "chamferHeight": 2, "chamferAngle": 30, "switchEmbankment": 0,
               "snapDirection": "horizontal", "mountType": "integrated"}
CASE_CHOC = dict(CASE_COMMON, topHeight=6.5, plateHeight=2.2, powerSwitchKnobHeight=4,
                 chamferType="C", lowerChamferHeight=2, cornerType="default")
CASE_MX = dict(CASE_COMMON, topHeight=11.5, plateHeight=5)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--encoder", action="store_true", help="左手に encoder モジュールを有効化（実験）")
    ap.add_argument("--switch", default="choc2-19", help="choc2-19（決定）/ mx-19 / choc2-18 など")
    ap.add_argument("--name", default="propB")
    ap.add_argument("--nudge", type=float, default=1.0, help="左親指の間隔調整の倍率（実験用）")
    ap.add_argument("--thumb-rc", default="", help="左親指 4,3/4,4/4,5 の行列を置き換える。例 '1,5;0,5;4,5'")
    ap.add_argument("--lpad", action="append", default=[],
                    help="左の基板を広げる padding(board) 'x,y,w,h'（中心座標・U）。複数可")
    ap.add_argument("--lvariant", default="side-1",
                    help="左コントローラの向き。side-1=コネクタが左(外側)。Choc V2 では side-2 だと ROW4 が自動配線できなかった")
    ap.add_argument("--lcol", type=int, default=3, help="左コントローラを合わせる数字行の列(0-4)")
    ap.add_argument("--rcol", type=int, default=4,
                    help="右コントローラを合わせる数字行の列(0-4, 0=内側の6)。Choc V2 では 4 で配線が通った")
    o = ap.parse_args()
    nl = 28
    thumb_rc = None
    if o.thumb_rc:
        thumb_rc = [tuple(int(v) for v in t.split(",")) for t in o.thumb_rc.split(";")]
    left_keys, right_keys = BL.b_keys[:nl], BL.b_keys[nl:]
    # コントローラは上段のスイッチと x をそろえる（Auto-KDK README 4.3 の干渉回避の目安）
    lx = to_autokdk(left_keys[o.lcol])[0]             # 左: 数字行の列（既定は "4"）
    rx = to_autokdk(right_keys[o.rcol])[0] - RIGHT_SHIFT  # 右: 数字行の列（既定は "7"）
    # トラボ（34mm, 2U角）中心。下段のキーと重ならないよう、図の概略位置より下げている
    tb_x, tb_y = 4.45, 5.6
    data = {
        "layout": {
            "isSplit": True, "switchType": o.switch, "keyboardName": o.name,
            "controllerType": "wireless",
            "leftData": side(left_keys, LEFT_RC, 0, dict(x=lx, y=0, a=0, variant=o.lvariant),
                             encoder=dict(x=5.65, y=1.3) if o.encoder else None,
                             # 親指 L1-Spc 間のキーキャップ隙間が 0.4mm で警告されたので少し離す
                             nudge={(4, 4): (.04 * o.nudge, 0), (4, 5): (.06 * o.nudge, 0)},
                             rc_override=thumb_rc),
            "rightData": side(right_keys, RIGHT_RC, RIGHT_SHIFT,
                              dict(x=rx, y=0, a=0, variant="side-1"),
                              trackball=dict(x=round(tb_x, 3), y=round(tb_y, 3), a=180)),
        },
        "case": CASE_CHOC if o.switch.startswith("choc2") else CASE_MX,
    }
    for i, spec in enumerate(o.lpad):
        x, y, w, h = (float(v) for v in spec.split(","))
        data["layout"]["leftData"]["modules"][f"padding-{i + 1:02d}"] = dict(
            x=x, y=y, a=0, width=w, height=h, row=i + 1, col=0, enabled=True,
            moduleType="padding", variant="board")
    json.dump(data, sys.stdout, indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
