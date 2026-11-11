#!/usr/bin/env bash
# クラウドの新しいコンテナで、キーボード作業用のツールを入れ直す。
#   keymap-drawer : 配列・キーマップの図(SVG)を描く  (layouts/build_layouts.py が使う)
#   markitdown    : PDF やデータシートを Markdown に変換する
#   openpyxl      : 部品・予算表(xlsx)を作る
# Playwright と Chromium はコンテナに最初から入っている。
set -euo pipefail
pip install -q --ignore-installed pyparsing keymap-drawer markitdown openpyxl
keymap --help >/dev/null && echo "keymap-drawer OK"
markitdown --help >/dev/null 2>&1 && echo "markitdown OK"
python3 -c "import openpyxl" && echo "openpyxl OK"
node -e "require('playwright')" && echo "playwright OK"
