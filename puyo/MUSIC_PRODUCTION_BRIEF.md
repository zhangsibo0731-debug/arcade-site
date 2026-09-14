# 噗呦噗呦 · 原创背景音乐制作规格

更新日期：2026-09-14  
状态：等待生成或作曲候选  
用途：可直接交给音乐生成工具或作曲人；先制作主题候选，不直接进入游戏。

## 核心描述

为一款可爱但不幼稚的果冻连锁消除游戏创作原创循环音乐。音乐需要俏皮、弹跳、有鲜明且容易记住的旋律钩子，适合持续游玩 15～30 分钟。整体可以带一点古怪、聪明和实验室气质，但不能紧张阴暗。

参考的是抽象音乐语言：

- 经典益智游戏音乐中的切分、停顿、问答乐句和轻微半音趣味。
- 明亮平台游戏音乐中的轻盈跳跃、木质打击乐和花园般的舒展感。
- 不复用任何参考曲的旋律、和弦进行、低音线、节奏型或音色组合。

## 第一轮交付

生成或创作 3 首候选，每首 60～90 秒：

1. 主旋律必须在前 8 秒内出现。
2. 至少包含 A / B 两个段落，不能只是 8 小节无限重复。
3. 结尾可以无缝回到开头。
4. 不加入人声、歌词、拟声词或角色语音。
5. 输出无母带过载的 WAV，建议 44.1kHz 或 48kHz。
6. 同时提供去鼓版或分轨条件，以便后续制作挑战模式动态层。

## 音乐参数

- BPM：112～124。
- 拍号：4/4，可使用轻微 swing 或切分。
- 情绪：明亮、机灵、弹性、略带古怪。
- 主音色：木琴/马林巴感合成器、短促圆润的电子键盘或柔和芯片音色。
- 配器：弹性贝斯、轻电子鼓、小型打击乐、少量温暖和弦铺底。
- 旋律密度：中等；每两小节至少留出一次呼吸，给消除音效让位。
- 避免：史诗化、Lo-fi 慵懒、梦幻氛围铺满、重低音 EDM、儿童儿歌、尖锐 8-bit 高频。

## 推荐生成提示词

### 中文版

> 原创的轻快益智消除游戏背景音乐，俏皮、弹跳、聪明、有鲜明且容易记忆的主旋律。112～124 BPM，切分节奏与问答乐句，偶尔使用轻微半音制造幽默感，但整体保持明亮可爱、不幼稚。木琴感合成器、圆润电子键盘、弹性贝斯、轻电子鼓和小型打击乐。前 8 秒出现主题，包含清晰的 A 段和 B 段，60～90 秒，可无缝循环。为游戏音效保留空间。不要人声，不要歌词，不要模仿或引用任何现有游戏旋律。

### English version

> Original upbeat puzzle-game background music with a playful, bouncy and clever personality. A strong memorable melodic hook within the first 8 seconds, syncopated rhythms, call-and-response phrasing, and occasional subtle chromatic humor while remaining bright and charming rather than childish. 112–124 BPM. Rounded mallet synth, warm electronic keys, elastic bass, light electronic drums and small percussion. Clear A and B sections, 60–90 seconds, seamless loop ending, enough space for game sound effects. Instrumental only. Do not imitate, quote or closely resemble any existing video-game melody, chord progression, bass line or signature rhythm.

## 筛选标准

候选必须依次通过：

1. 关闭伴奏或换成单一钢琴后，主题旋律仍然成立。
2. 听完一次后能哼出至少一个 4～8 音动机。
3. 连续循环 5 次没有明显疲劳或突兀接缝。
4. 与落地、消除和 Chain 音效同时播放时，旋律不会占满中高频。
5. 与参考曲不存在可辨认的连续旋律、和弦或节奏复用。
6. 获得清晰的商业使用权和再编辑权，并保存授权凭证。

## 选定主题后的改编

主题确认后再制作三层：

- 经典：基础编配，轻松耐听。
- 挑战：同一 BPM 和主题，增加切分鼓点与低音推动。
- 特殊 Stage：保持主题与和声身份，改编为更强的街机版本。

正式接入前还需要制作：OGG/MP3 兼容文件、无缝循环点、响度统一、音乐/音效混音、暂停滤波、切后台恢复和独立音乐音量设置。
