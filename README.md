# DSH 语音 AI 女友插件（voice-ai-girlfriend）

DeepSeek Harness 的**浏览器语音插件**：麦克风语音输入、回复朗读（TTS）、AI 女友动画窗、QQ 双向对话。

> ⚠️ **本插件是完整方案的一部分**：语音识别/合成依赖配套的 **voice bridge**（Python 服务，whisper/FunASR + Qwen3-TTS），QQ 对话依赖 **NapCatQQ**。请配合完整仓库使用：**[beiyege-01/dsh-voice-ai-girlfriend](https://github.com/beiyege-01/dsh-voice-ai-girlfriend)**（含桥接代码、模型准备、一键启动脚本、安装文档）。

## 安装

```bash
dsh plugin --profile web add github:beiyege-01/dsh-voice-ai-girlfriend-plugin
```

> pnpm ≥10 对 git 依赖的构建脚本有 allowBuilds 限制：按安装时 pnpm 打印的提示，在 profile 的 `pnpm-workspace.yaml` 的 `allowBuilds` 里加一行允许 `esbuild` 后重跑。

## 功能

- 🎙️ **语音输入**：麦克风 → 桥接 FunASR 中文识别 → 注入对话（连续聆听、自动端点）
- 🔊 **语音回复**：回复按句子流式 TTS 朗读（Qwen3 声音克隆，音色由参考音频决定）
- ⚡ **插话/排队**：亮=说话打断回复；灭=回复读完句子排队接上
- 👧 **数字人窗口**：右侧动画窗（空闲/说话视频，素材自备）
- 💬 **QQ 双向**：QQ 消息注入对话 + 回复文本/语音/图片推送（NapCat）

## 使用前提

1. 克隆主仓库并按其 README 装好 voice bridge（`start-all.cmd` 一键）
2. 本插件的桥接地址默认 `http://127.0.0.1:8765`（localStorage `s2s.voice.bridge` 可改）

## 构建

```bash
npm install
node build.mjs   # 产物 lib/client.js（browser bundle）
```
