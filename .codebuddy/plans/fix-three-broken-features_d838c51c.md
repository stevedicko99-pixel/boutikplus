---
name: fix-three-broken-features
overview: "Diagnostiquer et corriger 3 fonctionnalités cassées : (1) Photo Studio - bouton \"Terminer\" inactif, (2) Assistant IA - photo téléchargée non affichée, (3) Personnalisation boutique - upload logo/cover sans effet."
todos:
  - id: fix-pick-image-config
    content: 修复 src/lib/storage.ts 中 pickAndCompressImage 的 selectionLimit 配置并添加 Web 平台 URI 转换工具函数
    status: completed
  - id: fix-photo-studio-done
    content: 修复 src/screens/seller/PhotoStudioScreen.tsx 中 handleDone 的 Web 兼容性和错误处理
    status: completed
    dependencies:
      - fix-pick-image-config
  - id: fix-addedit-focus-deps
    content: 修复 src/screens/seller/AddEditProductScreen.tsx 中 useFocusEffect 的依赖数组 [images] → []
    status: completed
    dependencies:
      - fix-photo-studio-done
  - id: fix-ai-assistant-photo
    content: "修复 src/screens/ai/AIProductAssistantScreen.tsx 中图片预览在各步骤的 Web blob: URI 兼容性"
    status: completed
    dependencies:
      - fix-pick-image-config
  - id: fix-shop-upload-feedback
    content: 修复 src/screens/seller/CreateShopScreen.tsx 中 handlePickLogo/handlePickCover 的用户反馈和错误处理
    status: completed
    dependencies:
      - fix-pick-image-config
  - id: verify-lint
    content: 对所有修改文件运行 lint 检查并修复错误，确保 0 lint 错误
    status: completed
    dependencies:
      - fix-shop-upload-feedback
---

## 需求概述

修复 Boutikplus 应用中三个图片/上传功能的关键缺陷，确保它们在 Web（Expo Web）和移动端上都能正常工作。

## 核心修复功能

### 1. 修复摄影室"完成"按钮无响应

- `applyEdits` 在 Web 上生成的 `blob:` URI 可能不稳定，导致导航返回后无法正确消费结果
- 添加平台感知的 URI 处理（Web 使用 `blob:`, 移动端使用 `file://`）
- 修复 `useFocusEffect` 中的 `[images]` 依赖循环问题
- 确保错误提示同时适用于 Web（`alert()` 作为 `Alert.alert` 的补充）

### 2. 修复 AI 助手上传照片不显示

- `pickAndCompressImage` 中的 `selectionLimit: 0` 在某些平台/版本上可能被解释为"不允许选择"
- 在 Web 平台上，`expo-image-manipulator` 压缩后的 `blob:` URI 无法被 `expo-image` 的 `<Image>` 组件渲染
- 添加 Web 平台 `blob:` 到 DataURI 的转换，确保图片在所有平台上可显示
- 在"上传中"和"结果"步骤中都添加 Web 兼容的图片预览

### 3. 修复店铺自定义 Logo/封面无响应

- `handlePickLogo` / `handlePickCover` 在图片选择失败时静默返回，用户无任何反馈
- 区分"用户取消"和"权限拒绝"两种情况，分别提供适当的反馈
- 修复图片选择器配置以确保正常打开
- 添加 loading/feedback 状态指示选择过程正在进行

## 技术栈

- React Native 0.76.5 + Expo SDK 51
- expo-image-picker ~15.0.0, expo-image-manipulator ~13.0.0
- expo-image ~2.0.0 (用于图片显示)
- TypeScript 5.x
- Supabase (demo mode by default)

## 实现方案

### 策略概述

三个 bug 有共同的根因：图片 URI 在 Web 和 Mobile 上的处理不一致。核心修复策略为：

1. **统一图片选择入口**：修复 `pickAndCompressImage` 的配置问题
2. **平台感知的 URI 处理**：Web 上自动将 `blob:` 转换为 DataURI 以支持 `expo-image`
3. **完善的错误反馈**：在所有图片选择失败路径上添加用户可见的错误提示
4. **消除依赖循环**：修复 `useFocusEffect` 的依赖数组

### 修复 1: `storage.ts` — `pickAndCompressImage` 配置与 Web 兼容

- 将 `selectionLimit: 0` 移除或改为 `selectionLimit: 1`（默认值已是 1）
- 添加 `blob:` URI 检测与 DataURI 转换工具函数
- 在权限拒绝时返回更具描述性的结果，而非静默 `null`

### 修复 2: `PhotoStudioScreen.tsx` — "完成"按钮流

- 在 `handleDone` 中，Web 平台添加 `blob:` → DataURI 转换
- 将错误提示从 `Alert.alert`（Web nop）改为同时使用 `console.error` + dialog
- 添加 navigation 返回前的 URI 验证

### 修复 3: `AddEditProductScreen.tsx` — 照片消费

- 将 `useFocusEffect` 的依赖从 `[images]` 改为 `[]`（空数组），因为 `consumePhotoResult` 和 `consumeAIResult` 是 one-shot 操作，不需要 `images` 作为依赖
- 在消费结果时添加 URI 平台兼容处理

### 修复 4: `AIProductAssistantScreen.tsx` — 图片显示

- 添加 `ensureDisplayableUri` 工具函数处理 Web 上的 `blob:` URI
- 在 `runPipeline` 开始前将 `photoUri` 转换为可显示的格式
- 在 uploading/generating/result 各步骤都确保使用转换后的 URI

### 修复 5: `CreateShopScreen.tsx` — Logo/Cover 上传反馈

- `handlePickLogo` 和 `handlePickCover` 中添加错误用户提示
- 区分取消、权限拒绝、未知错误三种情况
- 添加 loading 状态指示选择器正在打开
- 所有错误路径都给出可见的 Alert 反馈

### 性能考量

- DataURI 转换仅在 Web + blob: 条件下执行，移动端零开销
- 转换是同步的（FileReader），不会阻塞 UI
- `useFocusEffect` 依赖优化后减少不必要的 effect 重执行

## 实现注意事项

### Web 兼容性

- `Alert.alert` 在 Web 上是 no-op，使用 `window.alert()` 或自定义 dialog 作为替代
- `expo-image` 的 `<Image>` 组件在 Web 上使用 `<img>` 标签，不直接支持 `blob:` URL。需要先转换为 DataURI
- `ImageManipulator.manipulateAsync` 在 Web 上返回 `blob:` URI

### 日志

- 所有图片处理步骤添加 `console.log` 记录 URI 类型和平台信息
- 使用 logger 记录上传失败等关键事件

### 兼容性

- 所有修改保持向后兼容，不影响现有移动端功能
- `selectionLimit` 的修改使用默认值（不传），兼容所有 expo-image-picker 版本