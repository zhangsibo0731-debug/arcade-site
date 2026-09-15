# 项目音乐生成器

这里保存开发期使用的曲谱与离线 WAV 合成器。各游戏只加载渲染后的音频，不把曲谱和合成代码发送给玩家。

## 渲染曲目

```bash
node tools/music/render.js puyo-theme
```

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
