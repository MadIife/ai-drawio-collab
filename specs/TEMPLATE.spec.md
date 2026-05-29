# [模块/组件名称] Spec

## 1. Context (上下文)
- **目标**: 简述这个模块要实现什么功能。
- **所属层级**: (例如：UI 组件 / Nuxt Server Route / Composable)
- **关联依赖**: (例如：Yjs, @ai-sdk/vue, draw.io iframe)

## 2. Interface & Props (接口与契约)
- **输入 (Props/Params)**:
  - `propName`: type - 描述
- **输出 (Events/Returns)**:
  - `eventName`: payload_type - 描述
- **暴露的方法 (Expose)**: (针对 Vue 组件的 defineExpose)
  - `methodName(args): returnType`

## 3. Constraints (约束条件 - 极其重要)
- [ ] 必须使用 `<script setup lang="ts">`
- [ ] 禁止使用 `any` 类型
- [ ] (特定业务约束，例如：必须在 onUnmounted 中清理 iframe message 监听)
- [ ] (特定 UI 约束，例如：必须使用 Naive UI 的 NButton)

## 4. Data Flow / State (数据流与状态)
- 描述内部状态 (ref/reactive) 是如何流转的。
- 如果是协作模块，描述 Yjs 数据结构 (如 Y.Map, Y.Text)。

## 5. Edge Cases & Error Handling (边界情况与错误处理)
- 如果 AI 返回非法 XML，UI 应该如何降级显示？
- 如果 WebSocket 断开，如何提示用户？

## 6. Examples (伪代码/使用示例)
```vue
<!-- 父组件如何调用这个模块 -->
<MyComponent @update="handleUpdate" />