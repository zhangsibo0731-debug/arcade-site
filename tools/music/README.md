# 项目音乐生成器

这里保存开发期使用的曲谱与离线 WAV 合成器。各游戏只加载渲染后的音频，不把曲谱和合成代码发送给玩家。

## 渲染曲目

```bash
node tools/music/render.js puyo-theme
```

噗呦高压状态变奏的试听文件可以这样生成：

```bash
node tools/music/render.js puyo-theme-pressure
```

“月夜玩具工坊”第二主题旋律小样：

```bash
node tools/music/render.js puyo-moonlit-toyshop-demo
```

重新作曲、节奏更稳定且乐句更完整的 V2：

```bash
node tools/music/render.js puyo-moonlit-toyshop-demo-v2
```

速度与律动重新设计的原创日系益智街机 V3：

```bash
node tools/music/render.js puyo-toy-arcade-demo-v3
```

只比较主题旋律的三段短样：

```bash
node tools/music/render.js puyo-theme-audition-a
node tools/music/render.js puyo-theme-audition-b
node tools/music/render.js puyo-theme-audition-c
```

采用“口号短句 + 歌唱回答”的混合主题 V4：

```bash
node tools/music/render.js puyo-theme-hybrid-v4
```

修正和声、延长主旋律发音并降低伴奏的 V4.1：

```bash
node tools/music/render.js puyo-theme-hybrid-v4-1
```

修正约 3.3 秒第二短句入口突降感的 V4.2：

```bash
node tools/music/render.js puyo-theme-hybrid-v4-2
```

将所有明显下坠回答统一改为上行的 V4.3：

```bash
node tools/music/render.js puyo-theme-hybrid-v4-3
```

从零创作、采用“欢乐与微紧张交替”的原创益智街机 V5：

```bash
node tools/music/render.js puyo-quirky-arcade-demo-v5
```

保留 V5 风格、将旋律收束为五音两小节主题的 V6：

```bash
node tools/music/render.js puyo-quirky-arcade-demo-v6
```

将 WAV 母带压缩成网页格式（需要本机安装 ffmpeg）：

```bash
node tools/music/encode.js puyo/assets/puyo-theme-full-v2.wav puyo/assets/puyo-theme-pressure.wav
```

播放器在支持时优先使用 OGG Vorbis，旧版 Safari 等不支持 OGG 时自动回退 MP3；WAV 仅作为母带和极端兼容兜底。音乐不参与 Service Worker 安装期预缓存：进入对应游戏后才加载设备选中的格式，并由运行时缓存供再次进入和离线回退使用。

也可以临时指定输出位置：

```bash
node tools/music/render.js puyo-theme /tmp/puyo-preview.wav
```

## 给其他游戏增加音乐

1. 在 `tracks/` 新建一个 CommonJS 曲目文件，导出 `id`、`output`、`bpm`、`beat`、`bar`、`chords`、`bass`、`melody`、`loopSeconds`。
2. 可选提供 `seed` 和 `arrangement`，其中区段使用 `[起始小节, 结束小节)`。
3. 在 `render.js` 的 `tracks` 注册表加入曲目。
4. 执行渲染命令，把成品 WAV 放进对应游戏的 `assets/`。

当前合成器适合明快的街机电子乐。以后若某款游戏需要不同乐器或编曲，可新增 renderer，而不必把工具重新塞回游戏目录。
