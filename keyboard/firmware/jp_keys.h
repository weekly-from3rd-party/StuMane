/*
 * JIS 配列（日本語キーボード設定）の PC / iPad で、ラベルどおりの文字を出すためのキーコード。
 *
 * ZMK のキーコードは「US 配列でそのキー位置が何か」で名前が付いている。OS が JIS 配列設定だと、
 * 例えば &kp AT は Shift+2 を送るので「"」が出てしまう。そこで JIS 配列での位置に合わせて定義し直す。
 * 使い方: keymap で  #include "jp_keys.h"  してから  &kp JP_AT  のように書く。
 *
 * 対象: Windows（日本語キーボード 106/109 設定。ユーザーの Dell ノートと同じ）、
 *       iPad / iPhone（ハードウェアキーボード設定を JIS にした場合。実機で要確認）
 *
 * 並びは「US での位置名 → JIS で出る文字（Shift なし / Shift あり）」。
 *   MINUS  : -  /  =        EQUAL : ^  /  ~        INT3 : ¥  /  |
 *   LBKT   : @  /  `        RBKT  : [  /  {        NUHS : ]  /  }   (JIS の「む」キー)
 *   SEMI   : ;  /  +        SQT   : :  /  *        INT1 : \  /  _   (JIS の「ろ」キー)
 *   N2 の Shift: "   N6 の Shift: &   N7 の Shift: '   N8 の Shift: (   N9 の Shift: )
 *   GRAVE  : 半角/全角
 */
#pragma once

#include <dt-bindings/zmk/keys.h>

/* Shift なしで出る記号 */
#define JP_MINUS   MINUS            /* - */
#define JP_CARET   EQUAL            /* ^ */
#define JP_YEN     INT3             /* ¥（Windows では \ と同じ扱い） */
#define JP_AT      LBKT             /* @ */
#define JP_LBKT    RBKT             /* [ */
#define JP_RBKT    NUHS             /* ] */
#define JP_SEMI    SEMI             /* ; */
#define JP_COLON   SQT              /* : */
#define JP_BSLS    INT1             /* \（iPad で \ になるかは要確認。¥ になる場合は Option+¥） */
#define JP_COMMA   COMMA            /* , */
#define JP_DOT     DOT              /* . */
#define JP_SLASH   SLASH            /* / */

/* Shift ありで出る記号 */
#define JP_EXLM    LS(N1)           /* ! */
#define JP_DQUO    LS(N2)           /* " */
#define JP_HASH    LS(N3)           /* # */
#define JP_DLR     LS(N4)           /* $ */
#define JP_PERC    LS(N5)           /* % */
#define JP_AMPR    LS(N6)           /* & */
#define JP_QUOT    LS(N7)           /* ' */
#define JP_LPRN    LS(N8)           /* ( */
#define JP_RPRN    LS(N9)           /* ) */
#define JP_EQL     LS(MINUS)        /* = */
#define JP_TILD    LS(EQUAL)        /* ~ */
#define JP_PIPE    LS(INT3)         /* | */
#define JP_GRV     LS(LBKT)         /* ` */
#define JP_LCBR    LS(RBKT)         /* { */
#define JP_RCBR    LS(NUHS)         /* } */
#define JP_PLUS    LS(SEMI)         /* + */
#define JP_ASTR    LS(SQT)          /* * */
#define JP_UNDS    LS(INT1)         /* _ */
#define JP_LT      LS(COMMA)        /* < */
#define JP_GT      LS(DOT)          /* > */
#define JP_QUES    LS(SLASH)        /* ? */

/* 日本語入力の切り替え（英数・かな キーで、OS ごとに効くものを両方送る） */
#define JP_ZKHK    GRAVE            /* 半角/全角（Windows） */
#define JP_MHEN    INT5             /* 無変換（Windows: IME 設定で「IME-オフ」に割り当てる） */
#define JP_HENK    INT4             /* 変換  （Windows: IME 設定で「IME-オン」に割り当てる） */
#define JP_EISU    LANG2            /* 英数  （Mac / iPad の日本語キーボード） */
#define JP_KANA    LANG1            /* かな  （Mac / iPad の日本語キーボード） */
