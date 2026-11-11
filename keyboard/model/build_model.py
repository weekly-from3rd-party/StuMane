"""提案B（Choc V2 19mm、右手トラボ）の分解 3D モデルを作る。

出力:
  scene.js    … Three.js のシーン（グローバル THREE, OrbitControls, canvas, width, height を使う）
  index.html  … scene.js をブラウザで開くためのページ（three.js は CDN から読む）

座標の出典:
  キーの位置と角度   : ../autokdk/build_autokdk.py（Auto-KDK に渡しているものと同じ中心座標）
  コントローラ・トラボ: 同上（左コントローラ = 数字行 "4" の列、右 = "0" の列、トラボ中心 (4.45, 5.6)）
  ラベル             : ../layouts/keymap_proposal_b.py の BASE レイヤー
寸法は概略（mm）。ケースの外形はキーの外周の凸包で近似しているので、実際の Auto-KDK のケースとは違う。
"""
import json, math, pathlib, sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "layouts"))
sys.path.insert(0, str(HERE.parent / "autokdk"))
import build_layouts as BL          # noqa: E402
import build_autokdk as AK          # noqa: E402
import keymap_proposal_b as KM      # noqa: E402

U = 19.0          # Choc V2 19mm ピッチ
GAP = 1.5         # 左右の間に足す見た目上のすき間（U）
NL = 28           # 左手のキー数


def hull(points):
    pts = sorted(set(points))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def square(cx, cy, a, half):
    t = math.radians(a)
    out = []
    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        x, y = sx * half, sy * half
        out.append((round(cx + x * math.cos(t) - y * math.sin(t), 2),
                    round(cy + x * math.sin(t) + y * math.cos(t), 2)))
    return out


def outline(keys, extra, margin):
    pts = []
    for k in keys:
        pts += square(k["x"], k["y"], k["a"], U / 2 + margin)
    for kind, cx, cy, w, h in extra:
        if kind == "rect":
            pts += [(cx - w / 2 - margin, cy - h / 2 - margin), (cx + w / 2 + margin, cy - h / 2 - margin),
                    (cx + w / 2 + margin, cy + h / 2 + margin), (cx - w / 2 - margin, cy + h / 2 + margin)]
        else:  # circle, w = radius
            pts += [(cx + (w + margin) * math.cos(i * math.pi / 12), cy + (w + margin) * math.sin(i * math.pi / 12))
                    for i in range(24)]
    return [[round(x, 2), round(y, 2)] for x, y in hull(pts)]


def main():
    base = next(v for k, v in KM.LAYERS.items() if k.startswith("0 "))
    labels = [l["t"] if isinstance(l, dict) else l for l in base]
    keys = []
    for i, (k, label) in enumerate(zip(BL.b_keys, labels)):
        x, y, a = AK.to_autokdk(k)
        side = "L" if i < NL else "R"
        if side == "R":
            x += GAP
        keys.append(dict(side=side, x=round(x * U, 2), y=round(y * U, 2), a=a, label=label))

    left_ctrl_x = AK.to_autokdk(BL.b_keys[3])[0] * U                 # 数字行 "4"
    right_ctrl_x = (AK.to_autokdk(BL.b_keys[NL + 4])[0] + GAP) * U    # 数字行 "0"
    ball_x, ball_y, ball_r = (4.45 + AK.RIGHT_SHIFT + GAP) * U, 5.6 * U, 17.0   # 34mm ボール
    ctrl_y, ctrl_w, ctrl_h = 0.0, 2 * U, 18.0

    sides = {}
    for s, cx in (("L", left_ctrl_x), ("R", right_ctrl_x)):
        ks = [k for k in keys if k["side"] == s]
        extra = [("rect", cx, ctrl_y, ctrl_w, ctrl_h)]
        if s == "R":
            extra.append(("circle", ball_x, ball_y, ball_r + 3, 0))
        sides[s] = dict(
            pcb=outline(ks, extra, 0.5),
            case=outline(ks, extra, 4.0),
            controller=dict(x=round(cx, 2), y=ctrl_y, w=ctrl_w, h=ctrl_h),
            battery=dict(x=round(cx, 2), y=round(ctrl_y + 40, 2), w=31, h=52, t=6),
        )
    data = dict(unit=U, keys=keys, sides=sides,
                ball=dict(x=round(ball_x, 2), y=round(ball_y, 2), r=ball_r))
    allx = [p[0] for s in sides.values() for p in s["case"]]
    ally = [p[1] for s in sides.values() for p in s["case"]]
    data["center"] = [round((min(allx) + max(allx)) / 2, 2), round((min(ally) + max(ally)) / 2, 2)]

    scene = (HERE / "scene_template.js").read_text().replace("__DATA__", json.dumps(data, ensure_ascii=False))
    (HERE / "scene.js").write_text(scene)
    html = (HERE / "index_template.html").read_text()
    (HERE / "index.html").write_text(html)
    print("keys:", len(keys), "center:", data["center"])


if __name__ == "__main__":
    main()
