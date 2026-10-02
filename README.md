# 霓虹記憶 NEON RECALL

> 賽博朋克 3D 記憶配對 · cyberpunk 3D memory match · Three.js · 手機優先

**試玩 Play:** https://fung2222.github.io/neon-recall/ · **自動示範 Demo:** https://fung2222.github.io/neon-recall/?demo=1

![NEON RECALL](docs/shots/desktop-play.png)

## 玩法 How to play
- 每關開始會**預覽**所有卡牌幾秒，記住佢哋。
- 點卡牌翻開，兩張一樣就**配對成功**；連續配對有**連擊**加分（最高 ×5）。
- 冇時間限制、冇得輸。失誤越少，星星越多（最多 ★★★）。
- 關卡由 4×2 逐步變大到 6×4；第 7 關起，失誤後可能出現**數據錯亂**：兩張蓋住嘅卡會互換位置！
- **透視 PEEK**：短暫睇晒所有卡。每 3 關送 1 次；用完可補充（網頁版免費；App 版用自願觀看嘅獎勵廣告）。
- **無盡模式**：關卡永遠唔會完。第 5 關之後係程式生成嘅無盡關卡：預覽時間縮到 0.7 秒為止、數據錯亂機會逐關 +1%（上限 60%），第 12 關起每 3 關係 6×5「超頻」大棋盤（15 對，上限）。每 10 關係**里程碑**：額外分數 + 2 次透視。最遠關卡會記錄為無盡紀錄。

## 語言 Language
遊戲支援**繁體中文（香港）**同 **English**，喺主畫面或暫停畫面撳「EN／中」切換，會記住你嘅選擇（`localStorage cyber.lang`，所有 CYBER 遊戲共用）。網址加 `?lang=en` / `?lang=zh` 亦可。

## English
**NEON RECALL** is a calm cyberpunk 3D memory-match game. Each level previews every neon card for a moment — memorise them, then flip pairs to match. No timer and no losing; fewer misses earn more stars, combos multiply points. From level 7, a miss can trigger a **glitch swap** that shuffles two hidden cards. **Endless mode:** levels never end — beyond the authored grids the game keeps generating levels with a capped curve (preview ≥ 0.7 s, glitch chance ≤ 60 %, 6×5 overclock grids every 3rd level from 12), milestone rewards every 10 levels (bonus score + 2 peeks) and a saved best level. Bilingual (Traditional Chinese / English) with an in-game toggle.

## 操作 Controls
| 動作 | 手機 | 鍵盤 / 滑鼠 |
|---|---|---|
| 翻卡 Flip | 點擊 Tap | 點擊 / 方向鍵揀卡 + Enter |
| 透視 Peek | 透視掣 | Z |
| 重玩此關 Restart | ⟳ | R |
| 暫停 Pause | ⏸ | P / Esc |
| 靜音 Mute | 🔊 | M |

## 網址參數 URL flags
`?demo=1` AI 自動玩 · `?lang=en|zh` · `?level=5` 由第 5 關開始 · `?seed=1` · `?fps=1` · `?quality=low` · `?adsim=1` · `?reset=1`

## 技術 Tech
Three.js r169 + [cyber-kit](https://github.com/fung2222/cyber-kit) v0.2.1（`vendor/cyber-kit/`），純 ES modules，冇 build step，可離線運行。16 個原創霓虹圖示全部用 canvas 程式繪製。

## 開發 Development
```bash
cd .. && python3 -m http.server 18940     # 開 http://127.0.0.1:18940/neon-recall/
node neon-recall/tests/logic.test.mjs
python neon-recall/tests/smoke.py
```
文件：[docs/HANDOFF.md](docs/HANDOFF.md) · [privacy.html](privacy.html) · 屬於 [CYBER ARCADE](https://github.com/fung2222/cyber-arcade) 系列。
