# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Real-time chat frontend — Vue 3 (Composition API, `<script setup>`) + Pinia + Element Plus + native WebSocket. Pure JavaScript with JSDoc type annotations (NOT TypeScript). Built with Vite 5.

## Development Rules

- **维护现有架构**：每次修改代码必须遵循项目的三层数据流架构（Views → Composables → API），不得破坏现有的分层设计、组件通信模式（props-down/events-up）和单例管理模式（wsManager、heartbeatManager）。
- **符合项目规范**：严格使用项目既定的技术栈和模式——Composition API + `<script setup>`、Pinia（Composition API 风格）、JSDoc 类型注释（禁止引入 TypeScript）、共享设计令牌（`shared.css` 中的 CSS 变量和全局 class）、环境变量分层（`.env.development` / `.env.production`）。
- **符合原代码风格**：匹配现有代码的命名规范（组件 PascalCase、composable `use` 前缀 camelCase、API/Utils kebab-case）、注释风格（文件头 `@module` + 函数 `@param`/`@returns` JSDoc）、中文注释语言、以及统一的视觉动画参数（弹性曲线 `cubic-bezier(0.68, -0.55, 0.27, 1.55)`、磨砂玻璃效果等）。
- **检查逻辑漏洞**：修改后必须审视——WebSocket 事件是否正确注册/注销（防止内存泄漏）、乐观更新失败时是否正确回滚、定时器是否在 `onBeforeUnmount` 中清除、错误路径是否都有用户提示（toast.error）、401 场景是否正确触发 `clearAuth()` 并跳转登录页。
- **同步前端文档**：每次完成任务后，检查 `frontend_document/` 目录下的相关文档是否需要更新——`ARCHITECTURE.md`（架构变更）、`COMPONENTS.md`（组件 Props/Events/Expose 变更）、`API_GUIDE.md`（API 调用方式变更）、`STATE_MANAGEMENT.md`（Store/Composable 状态变更）。如果改动涉及部署流程，同样检查 `NGINX_DEPLOYMENT.md`。

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Start dev server on localhost:5174
npm run build            # Production build to dist/
npm run preview          # Preview production build
```

Development requires Node.js >= 18 and the Spring Boot backend running on `localhost:8080`.

## Environment Config

- `.env` — shared defaults (relative paths for production/tunnel)
- `.env.development` — local dev: `VITE_API_BASE_URL=http://localhost:8080/api`, `VITE_WS_URL=ws://localhost:8080/ws/chat`
- `.env.production` — relative paths: `VITE_API_BASE_URL=/api`, `VITE_WS_URL=/ws/chat` (Nginx reverse-proxies to backend)

## Architecture: Three-Layer Data Flow

```
Vue Views (Chat.vue as container, Login.vue standalone)
  → Composables (useChatMessages / useFriendList / useNotifications)
    → API layer (auth.js / user.js / friend.js via request.js Axios instance)
      → Backend (:8080)
```

**Chat.vue is the orchestrator** — it initializes all three composables, wires them together, and passes data down to four child components via props/emits. The composables own all state (refs), API calls, and WebSocket event subscriptions; Chat.vue itself holds only logout logic, cross-composable wiring (e.g., selecting a friend triggers `resetChat()` + `loadChatHistory()`), profile panel navigation with a history stack (supports back-navigation from profile to previous panel view), and timer lifecycle (30s unread poll, 60s friend list refresh).

### Composable Dependency Injection

Composables receive their dependencies in two styles:
- **Individual params**: `useChatMessages(chatTarget, chatType, friends, messageAreaRef, userStore, toast)` and `useFriendList(toast)` — used when dependencies are plain refs/objects without circular references.
- **Options object**: `useNotifications({ loadFriends, activeView, chatTarget, mobileView, toast })` — receives `loadFriends` as a callback (not a ref) because notifications need to trigger friend-list refresh on accept, creating a circular dependency that the callback pattern resolves.

### PRIVATE_MESSAGE Dual-Handler Pattern

Both `useChatMessages` and `useFriendList` register handlers for `PRIVATE_MESSAGE` — this is deliberate, not a bug:
- **`useChatMessages`** handles message display: replaces optimistic temp messages on echo-back, appends incoming messages, auto-sends `READ_RECEIPT` for current-chat messages, scrolls to bottom.
- **`useFriendList`** handles sidebar state: clears unread count when the message is from the currently-selected friend, increments unread count otherwise.

Both handlers run independently; each handles the message from its own perspective. When modifying either handler, ensure they don't conflict (e.g., double-incrementing unread counts).

## Key Architectural Patterns

### WebSocket-First Messaging with HTTP Fallback

`useChatMessages.onSendMessage()` pushes an optimistic temp message (with `_id: Date.now()`), attempts `wsManager.send()` first. If the WS is not connected, falls back to `sendMessageApi()` (REST). When the server echoes the message back via WebSocket, the temp message is replaced with the real `recordId`. On failure, the temp message is removed.

### WebSocket Manager (Singleton)

`utils/websocket.js` — class-based singleton (`wsManager`). Handles connect/disconnect/reconnect (up to 10 retries, 3s delay), pub-sub event dispatch (`on/off/emit` by message type), and auto-protocol derivation (ws:// vs wss:// based on `window.location.protocol` when using relative WS URLs). Disconnect during logout sets `manuallyClosed = true` to suppress reconnect.

### Heartbeat Manager (Singleton)

`utils/heartbeat.js` — class-based singleton (`heartbeatManager`). Sends `POST /user/heartbeat` every 2 minutes. Started on login/init, stopped on logout. Silent failure (doesn't affect UX).

### Pinia Store (Composition API Style)

Only `useUserStore` — manages token, userInfo, login/register/logout actions. On login: saves token+userInfo to localStorage, starts heartbeat, connects WebSocket. On logout: calls backend, clears all local state regardless of success. `initUserState()` is called at app startup to restore session from localStorage.

### Composables Pattern

All business logic lives in composables under `src/composables/`. Each composable:
- Receives dependencies via parameters (toast, store, child refs, callback functions)
- Owns its reactive state as `ref()` values
- Registers WebSocket listeners in `onMounted`, removes them in `onBeforeUnmount`
- Exposes state + methods as a plain object

**Exception — `useNotifications` cleanup**: This composable does NOT use `onBeforeUnmount` for WS cleanup. Instead it exports `_cleanupNotifications()` which Chat.vue calls in its own `onBeforeUnmount`. This is because `useNotifications` wraps handler references (`_wsFriendRequest`, `_wsFriendRequestResult`) to ensure the latest reactive closures are always called, and Chat.vue needs to coordinate cleanup timing with its own lifecycle.

### API Layer

`api/request.js` — Axios instance with `baseURL` from env, 10s timeout. Request interceptor attaches `Bearer <token>`. Response interceptor: codes 200/201/202/204/206 pass through; 401 triggers `handleUnauthorized()` (full cleanup + redirect); other codes reject with `new Error(res.message)`. HTTP error handler: extracts `error.response.data.message` as the error text and rejects with it — callers always get the backend's actual error message, never Axios generic `"Request failed with status code xxx"`. All API modules export plain functions returning promises.

**Note**: `handleUnauthorized()` in the API layer performs full cleanup (clears localStorage, stops heartbeat, disconnects WebSocket, then redirects) — consistent with `useUserStore.clearUserState()`. This ensures 401-triggered redirects leave no stale state (timers running, WS reconnecting).

### Route Guards

`router/index.js` — `beforeEach` checks `meta.requiresAuth` against localStorage token. Unauthenticated → `/login?redirect=...`. Already-authenticated hitting `/login` → redirect to `/chat`. Three routes: `/` (redirect), `/login`, `/chat`.

### Global Dependency Injection

`App.vue` provides `loading` (show/hide via `GlobalLoading` ref) and `toast` (success/error/warning/info via `ElMessage`) via Vue's `provide`. Child components access via `inject('toast')`.

## Design System

All shared design tokens in `assets/shared.css`:
- **Primary gradient**: `linear-gradient(135deg, #11998e 0%, #38ef7d 100%)`
- **Glassmorphism**: `background: rgba(255,255,255,0.25); backdrop-filter: blur(20px); border-radius: 16px`
- **Bounce animation**: `cubic-bezier(0.68, -0.55, 0.27, 1.55)` — used consistently for panel transitions, mask drag, collapse
- Global class conventions: `.form-input` for inputs, `.submit-button` for buttons, `.avatar`/`.avatar-sm` for avatars, `.unread-badge` for badges, `.online-indicator` for status dots
- All pages share a giant background "chat" text (768px, italic, `#62d2a2`)

## WebSocket Message Types

| Type | Direction | Handler |
|------|-----------|---------|
| `PRIVATE_MESSAGE` | send/receive | `useChatMessages` + `useFriendList` |
| `READ_RECEIPT` | send/receive | `useChatMessages` |
| `FRIEND_ONLINE` / `FRIEND_OFFLINE` | receive | `useFriendList` |
| `FRIEND_REQUEST` | receive | `useNotifications` |
| `FRIEND_REQUEST_RESULT` | receive | `useNotifications` |
| `GROUP_MESSAGE` | send/receive | `useChatMessages` + `useFriendList` |
| `GROUP_MEMBER_JOIN` | receive | `useFriendList` |
| `GROUP_MEMBER_LEAVE` | receive | `useFriendList` |
| `ERROR` | receive | `wsManager` (default console.error) |

Types are defined as JSDoc `@typedef` in `types/index.js`.

## Component Communication

Chat page uses strict parent-child props-down/events-up:
- **ChatLeftPanel** — displays friends/groups/notifications list; emits `select-friend`, `select-group`, `logout`, `open-side-panel`, `open-notifications`, toggle events
- **ChatMessageArea** — message flow + input; emits `send`, `scroll-top`, `back-to-list`; exposes `messageListRef`, `inputText`, `scrollToBottom()`, `resetInput()` via `defineExpose`
- **ChatNotificationPanel** — merged bubble stream of sent+received friend requests; emits `handle-request`, `load-more`, `back-to-list`
- **ChatSidePanel** — add friend / create group / join group modes; emits `close`, `search`, `add-friend`, `create-group`, `join-group`
- **GlobalLoading** — full-screen overlay with spinner; counter-based show/hide

**Important — unscoped styles**: Chat.vue uses both `<style scoped>` (for page layout) and `<style>` (unscoped, for `.add-friend-dialog` classes). This is necessary because `ElMessageBox` renders its DOM outside the component tree (directly in `<body>`), so scoped styles (which add `data-v-xxx` attributes) won't match. Any styles targeting `ElMessageBox`, `ElMessage`, or `ElNotification` must be unscoped.

## Login Page Special Mechanics

`Login.vue` uses a draggable mask ring with 3D perspective ellipse curves — not a tab switch. `maskPosition` (0–1) controls which form is visible. On register success, mask auto-slides to position 0 (showing login form). The left ellipse curve follows mask position via computed `translateX` with matching spring animation.

## Deployment

Production deployment uses Nginx as reverse proxy (config in `nginx.conf`). Static files served from `dist/`, `/api/` proxied to backend, `/ws/` proxied with `Upgrade`/`Connection` headers for WebSocket. SPA fallback via `try_files $uri /index.html`. Supports natapp tunnel for development (domain whitelisted in `vite.config.js` `allowedHosts`).

## File Naming Conventions

- Views: PascalCase (`Login.vue`, `Chat.vue`)
- Components: PascalCase in subdirectories (`chat/ChatLeftPanel.vue`, `common/GlobalLoading.vue`)
- Composables: camelCase with `use` prefix (`useChatMessages.js`)
- API modules: kebab-case (`friend.js`, `auth.js`)
- Utils: kebab-case (`websocket.js`, `storage.js`)
- All files use JSDoc `@module` and `@param` annotations

## Stub Pages

已移除。Profile/Search 功能已完全由 `ChatSidePanel`（profile 模式）和 `useNotifications`（搜索 + 好友申请）实现，无需独立路由页面。

---

## 2025-06-17 文档增强记录

基于对全部源代码的通读，补充了以下**代码中才能发现的隐性架构模式**（未写入将导致后续开发者花费大量时间重新理解）：

| 模式 | 说明 |
|------|------|
| Composable 依赖注入两种风格 | 独立参数（useChatMessages/useFriendList）vs options对象+回调（useNotifications），后者用回调解决循环依赖 |
| PRIVATE_MESSAGE 双 handler | useChatMessages（消息展示）和 useFriendList（未读计数）同时注册，各司其职，修改任一方必须防止冲突（如未读计数重复累加） |
| useNotifications 清理例外 | 唯一不用 `onBeforeUnmount` 的 composable，导出手动 `_cleanupNotifications()` 由 Chat.vue 调用，因为闭包包装引用需要协调清理时机 |
| 401 双路径区别 | API层 `handleUnauthorized()` 仅清 localStorage + 跳转，**不停心跳/不断WS**；Store 的 `clearUserState()` 才是完整清理。排查状态泄漏时需注意 | ✅ 已修复（2025-06-17）：`handleUnauthorized()` 现与 `clearUserState()` 一致，执行完整清理 |
| 非 scoped 样式 | `ElMessageBox` 渲染在 `<body>` 下，scoped 的 `data-v-xxx` 无法命中，必须在非 scoped `<style>` 块中编写浮层组件样式 |

## 2025-06-17 后端文档同步修复记录

基于后端文档 v1.7，修复了以下 4 个前-后端不一致问题：

| 问题 | 状态 | 说明 |
|------|------|------|
| handleUnauthorized 不完整 | ✅ 已修复 | 原先仅清 localStorage + 跳转，未停心跳/断 WS；现与 `clearUserState()` 一致，执行完整清理 |
| WS 消息类型缺失 | ✅ 已更新 | CLAUDE.md 补充了 `GROUP_MESSAGE`/`GROUP_MEMBER_JOIN`/`GROUP_MEMBER_LEAVE`（后端已实现，前端待对接） |
| 搜索参数约束 | ✅ 已修复 | 搜索输入框添加 `maxlength="20"`，composable 添加 `slice(0,20)` 截断保护 |
| 删除好友功能 | ✅ 已实现 | API 路径修复（`/friends/remove/{id}`），好友资料卡添加删除按钮（需确认），删除后自动刷新列表+清空聊天区 |
| 架构优化 | ✅ 已完成 | ChatSidePanel 932→422行（提取 ChatProfileCard）；useNotifications 445→233行（提取 useSidePanel）；Chat.vue 597→472行（提取 useProfile）；移除 Profile/Search 占位页面和路由 |
| 群聊系统 | ✅ 已实现 | 7 REST + 3 WS 全部对接：列表加载+创建+消息收发+群资料+解散退出+实时通知。仅加入群聊待后端接口 |
