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
  → Composables (useChatMessages / useFriendList / useNotifications / useSidePanel / useProfile)
    → API layer (auth.js / user.js / friend.js / group.js via request.js Axios instance)
      → Backend (:8080)
```

**Chat.vue is the orchestrator** — it initializes all five composables, wires them together, and passes data down to five child components (ChatLeftPanel, ChatMessageArea, ChatNotificationPanel, ChatSidePanel, ChatProfileCard) via props/emits. The composables own all state (refs), API calls, and WebSocket event subscriptions; Chat.vue itself holds only logout logic, cross-composable wiring (e.g., selecting a friend triggers `resetChat()` + `loadChatHistory()`, profile-to-friend bridging via wrapper functions), profile panel navigation with a history stack (supports back-navigation from profile to previous panel view), and timer lifecycle (30s unread poll, 60s friend list refresh).

### Composable Dependency Injection

Composables receive their dependencies in two styles:
- **Individual params**: `useChatMessages(chatTarget, chatType, friends, messageAreaRef, userStore, toast)` and `useFriendList(toast)` — used when dependencies are plain refs/objects without circular references.
- **Options object**: `useNotifications({ loadFriends, activeView, chatTarget, mobileView, toast })`, `useSidePanel({ toast, sentRequests, loadGroups })`, `useProfile({ toast, friends, chatTarget, chatType, resetChat, closeSidePanel, loadFriends, sidePanelMode, groupSubMode, showSidePanel })` — uses callbacks to resolve circular dependencies (e.g., `useNotifications` needs to call `loadFriends` which is owned by `useFriendList`).

### Composable Responsibilities (5 composables)

| Composable | Owns | Key Dependencies |
|---|---|---|
| `useFriendList` | friends[], groups[], chatTarget, chatType, mobileView, activeView, expand/collapse state | toast (injected) |
| `useChatMessages` | messages[], loading/ pagination/ sending state | chatTarget, chatType, friends, messageAreaRef, userStore, toast |
| `useNotifications` | receivedRequests[], sentRequests[], pendingRequestCount, pagination, joinGroupRequests[] | loadFriends, loadGroups, groups (callbacks/refs), activeView, chatTarget, mobileView, toast |
| `useSidePanel` | showSidePanel, sidePanelMode, groupSubMode, panelSearchResults, panelSearching, groupSearchResults, groupSearching, sendingRequestIds, joiningGroupIds | toast, sentRequests, loadGroups, onJoinRequestSent (callback) |
| `useProfile` | profileUser, profileContext, profileLoading, panelHistory[] | toast, friends, groups, chatTarget, chatType, resetChat, closeSidePanel, loadFriends, loadGroups, sidePanelMode, groupSubMode, showSidePanel |

### PRIVATE_MESSAGE Dual-Handler Pattern

Both `useChatMessages` and `useFriendList` register handlers for `PRIVATE_MESSAGE` — this is deliberate, not a bug:
- **`useChatMessages`** handles message display: replaces optimistic temp messages on echo-back, appends incoming messages, auto-sends `READ_RECEIPT` for current-chat messages, scrolls to bottom. Also independently clears/increments unread counts on `friends[]` (same logic as useFriendList).
- **`useFriendList`** handles sidebar state: clears unread count when the message is from the currently-selected friend, increments unread count otherwise.

Both handlers run independently and **both manipulate unread counts** — this is intentional double-coverage to ensure unread state stays consistent regardless of handler execution order. When modifying either handler, ensure they apply the same unread logic (clear on current-chat, increment otherwise) to avoid divergence.

### GROUP_MESSAGE Dual-Handler Pattern

Same pattern as PRIVATE_MESSAGE — both `useChatMessages` and `useFriendList` register handlers for `GROUP_MESSAGE`:
- **`useChatMessages`** handles message display: replaces optimistic temp messages on echo-back, appends incoming messages, scrolls to bottom.
- **`useFriendList`** handles sidebar state: updates last message text (formatted as `senderName: content`), increments/clears unread count on the group.

GROUP_MEMBER_JOIN and GROUP_MEMBER_LEAVE are handled by `useFriendList` — they store the event to `groupNotifications[]` (max 100, for display in ChatNotificationPanel), show a toast notification, and refresh the group list via `loadGroups()`. Group notifications flow: WS event → useFriendList.groupNotifications[] → Chat.vue passes to ChatNotificationPanel → displayed as bubble stream.

JOIN_GROUP_REQUEST is handled by `useNotifications` — sent by backend to group owners when someone applies to join (backend v2.1). Handler stores to `joinGroupRequests[]` (max 50) and shows a toast with applicant name + group name. Group owners can approve/reject via `handleJoinRequestAction()`. Self-initiated join requests are added via `addSelfJoinRequest()` (called through Chat.vue's `onJoinRequestSent` callback → `useSidePanel`). Flow: WS event → useNotifications.joinGroupRequests[] → Chat.vue passes to ChatNotificationPanel → displayed as request bubbles with accept/reject buttons (group owner view).

**Note — `useFriendList` manages both friends and groups**: Despite its name, this composable owns both `friends[]` and `groups[]` reactive arrays, exposes both `loadFriends()` and `loadGroups()`, and registers WS handlers for both friend events (ONLINE/OFFLINE) and group events (GROUP_MESSAGE, GROUP_MEMBER_JOIN/LEAVE). The name is historical — when modifying, be aware it's the single composable that owns all sidebar list state.

### Pending Work (TODO)

There is a `.claude/TODO_群聊系统待实现.md` file tracking remaining items for the group chat system:

| 优先级 | 条目 | 状态 |
|--------|------|------|
| ✅ | 加入群聊 | 2025-06-18 已实现：搜索+API调用+资料卡双视图 |
| 🟡 | 群聊详情/成员列表UI | API (`getGroupInfo`, `getGroupMembers`) 已封装但未接入资料卡 |
| 🟡 | 群聊列表排序 | `loadGroups()` 未按最新消息时间排序 |
| 🟡 | 群聊未读持久化 | 仅存内存，刷新丢失 |
| 🟢 | @提及功能 | 后端未确认 |
| 🟢 | 群头像优化 | 当前为群名首字+渐变 |
| 🟢 | N+1批量查询优化 | 首次加载逐群请求最后消息 |

Check this file before starting any group-chat related work.

## Key Architectural Patterns

### WebSocket-First Messaging with HTTP Fallback

`useChatMessages.onSendMessage()` pushes an optimistic temp message (with `_id: Date.now()`), attempts `wsManager.send()` first. If the WS is not connected, falls back to REST API (`sendMessageApi()` for private, `sendGroupMessage()` for group). When the server echoes the message back via WebSocket, the temp message is replaced with the real `recordId`. On failure, the temp message is removed.

### Profile Panel Navigation (History Stack)

`useProfile` maintains a `panelHistory` ref (array) that enables back-navigation from profile view to the previous panel view. When opening a user/group profile from another panel mode (e.g., search results), the current `{ mode, groupSubMode }` is pushed onto the stack. When closing the profile (`handlePanelClose()`), if history is non-empty, the previous view is restored instead of closing the panel. This allows viewing profiles from search results or friend details without losing context.

### Chat.vue Cross-Composable Wiring

Chat.vue has wrapper functions that bridge composables when one composable's output must trigger another's action:
- **`onSelectFriend()`** — calls `_selectFriend()` (useFriendList) + `resetChat()` + `loadChatHistory()` (useChatMessages)
- **`onSelectGroup()`** — calls `_selectGroup()` (useFriendList) + `resetChat()` (useChatMessages)
- **`handleSendMessageTo()`** — calls `_sendMessageTo()` (useProfile) which closes the panel, then `onSelectFriend()` to switch chat target
- **`handleAddFriendFromProfile()`** — calls `_addFriendFromProfile()` (useProfile), then `handleAddFriend()` (useSidePanel) to open the add-friend dialog
- **`viewProfile()`** — dispatches to `onViewProfile()` or `onViewGroupProfile()` (useProfile) based on whether the target has a `groupId`
- **`handleSendMessageToGroup()`** — calls `_sendMessageToGroup()` (useSidePanel) which closes the panel, then `onSelectGroup()` to switch to the group chat
- **`addSelfJoinRequest()` → `useSidePanel.onJoinRequestSent`** — callback passed to `useSidePanel` so that when a user sends a join-group request, `useNotifications.addSelfJoinRequest()` is called to track it in `joinGroupRequests[]` for display in ChatNotificationPanel
- **`openFriendNotifications()`** — sets `notificationTab = 'friend'`, calls `openNotifications()` (loads friend request data)
- **`openGroupNotifications()`** — sets `notificationTab = 'group'`, sets `activeView = 'notifications-group'` (no friend data load needed)

### Notification Panel Dual-Entry Control

Chat.vue maintains a `notificationTab` ref (`'friend'` | `'group'`) passed to ChatNotificationPanel as `initialTab`. Two entry points in ChatLeftPanel:
- Click "好友通知" → `openFriendNotifications()` → panel shows friend requests
- Click "群聊通知" → `openGroupNotifications()` → panel shows group events

The `activeView` distinguishes: `'notifications'` (friend) vs `'notifications-group'` (group). `ChatNotificationPanel` watches `initialTab` to switch tabs even when already open.

### Group Profile Card Dual-View (isGroupMember)

`ChatProfileCard` renders different UI for groups based on `isGroupMember` prop (computed by `useProfile.isGroupMember()` which checks `groups[]`):
- **Joined members**: full info (name, account, owner, member count, create date) + "发消息" + "解散群聊"/"退出群聊"
- **Non-members**: basic info (name, account, member count only) + "加入群聊" button

### WebSocket Manager (Singleton)

`utils/websocket.js` — class-based singleton (`wsManager`). Handles connect/disconnect/reconnect (up to 10 retries, 3s delay), pub-sub event dispatch (`on/off/emit` by message type), and auto-protocol derivation (ws:// vs wss:// based on `window.location.protocol` when using relative WS URLs). Disconnect during logout sets `manuallyClosed = true` to suppress reconnect. Auth failure (close code 4001/1008) also sets `manuallyClosed = true` to prevent reconnect. Chat.vue additionally registers a handler for `ERROR` messages that triggers force-logout if the error text contains auth-related keywords (认证/Token/未授权/登录).

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

**Exception — `_cleanup` pattern**: Two composables do NOT use `onBeforeUnmount` for cleanup and instead export manual `_cleanupXxx()` functions called by Chat.vue in its own `onBeforeUnmount`:
- **`useNotifications._cleanupNotifications()`** — uses closure-wrapped handler references (`_wsFriendRequest`, `_wsFriendRequestResult`) to ensure the latest reactive closures are always called. Chat.vue must coordinate cleanup timing with its own lifecycle.
- **`useSidePanel._cleanupSidePanel()`** — clears the debounce instances (`_panelDebounce`, `_groupDebounce`). Chat.vue manages this because debounce timers must be cleared in the same lifecycle scope.

### Error Handling Pattern

Every async function that calls a backend API must follow this pattern:
- ✅ **try-catch** around the API call
- ✅ **toast.error** on failure (user must see what went wrong)
- ✅ **finally** block to reset loading/pending state
- ✅ Check response code against expected success codes (not just 200 — some APIs return 201 for created resources)

**Background polling**: Functions called on timers (e.g., `fetchUnreadMessages` every 30s, `loadFriends` every 60s) use a `{ silent: true }` option to suppress error toasts — don't spam the user every 30 seconds. Initial loads (called in `onMounted`) use the default `{ silent: false }`.

**Double-toast prevention**: When a follow-up refresh is called after a primary action that already showed a toast (e.g., `loadFriends()` after `handleDeleteFriend` which already toasted "已删除好友"), pass `{ silent: true }` to suppress duplicate error messages.

### API Layer

`api/request.js` — Axios instance with `baseURL` from env, 10s timeout. Request interceptor attaches `Bearer <token>`. Response interceptor: codes 200/201/202/204/206 pass through; 401 triggers `handleUnauthorized()` (full cleanup + redirect); other codes reject with `new Error(res.message)`. HTTP error handler: extracts `error.response.data.message` as the error text and rejects with it — callers always get the backend's actual error message, never Axios generic `"Request failed with status code xxx"`. All API modules export plain functions returning promises.

**Note**: `handleUnauthorized()` (in `api/request.js`) imports `heartbeatManager` and `wsManager` to perform full cleanup (clears localStorage, stops heartbeat, disconnects WebSocket, then redirects) — consistent with `useUserStore.clearUserState()`. This ensures 401-triggered redirects leave no stale state (timers running, WS reconnecting).

**`isHandlingUnauthorized` guard**: When multiple concurrent requests all receive 401 (e.g., heartbeat + unread poll + friend list refresh), the response interceptor uses a module-level boolean flag to prevent `handleUnauthorized()` from executing multiple times. The flag is reset after `router.push()` completes.

### Route Guards

`router/index.js` — `beforeEach` checks `meta.requiresAuth` against localStorage token. Unauthenticated → `/login?redirect=...`. Already-authenticated hitting `/login` → redirect to `/chat`. Three routes: `/` (redirect), `/login`, `/chat`.

### Global Dependency Injection

`App.vue` provides `loading` (show/hide via `GlobalLoading` ref) and `toast` (success/error/warning/info via `ElMessage`) via Vue's `provide`. Child components access via `inject('toast')`.

### Shared Utilities

Don't duplicate these — import from the canonical location:

- **`utils/time.js`** — `formatTime(t)` (ISO→HH:mm), `formatDividerLabel(timeStr)` (smart date label: 今天/昨天/周X/日期), `insertTimeDividers(items, timeKey)` (auto-insert 5-min gap dividers). Used by ChatMessageArea, ChatNotificationPanel, ChatLeftPanel.
- **`utils/debounce.js`** — `createDebounce(fn, delay=300)` returns `{ invoke, cancel }` for search-input debouncing. Used by useSidePanel.

### Extracted Composables

These were extracted from large components during architecture optimization:

- **`useDragMask(containerRef)`** — extracted from Login.vue (was ~160 lines inline). Manages mask ring drag position, spring animation, window resize, and touch/mouse event lifecycle. Returns `{ maskPosition, dragDirection, maskStyle, leftCurveStyle, startDrag, slideTo }`.
- **`useDropdown({ triggerRef, offsetY })`** — extracted from ChatLeftPanel group-action menu (was ~55 lines inline). Manages dropdown visibility, position tracking via MutationObserver, click-outside close. Returns `{ show, position, toggle, close }`.

## Key State Constants

Critical string enums used across composables and components — must match exactly for conditionals:

- **`activeView`**: `'chat'` | `'notifications'` (friend requests) | `'notifications-group'` (group events)
- **`chatType`**: `'friend'` | `'group'` — drives which API/WS endpoints are used for message send and history load
- **`sidePanelMode`**: `'friend'` (add friend search) | `'group'` (create/join group) | `'profile'` (user/group profile card)
- **`groupSubMode`**: `'create'` | `'join'` — sub-mode within sidePanelMode='group'
- **`notificationTab`**: `'friend'` | `'group'` — controls which tab ChatNotificationPanel shows
- **`profileContext`**: `'self'` | `'friend'` | `'stranger'` | `'group'` — drives ChatProfileCard rendering

## Design System

Global styles are split across two files:
- `src/style.css` — base element resets and CSS variables for the entire app
- `src/assets/shared.css` — shared design tokens, form controls, avatars, badges, animations

All shared design tokens in `assets/shared.css`:
- **Primary gradient**: `linear-gradient(135deg, #11998e 0%, #38ef7d 100%)`
- **Glassmorphism**: `background: rgba(255,255,255,0.25); backdrop-filter: blur(20px); border-radius: 16px`
- **Bounce animation**: `cubic-bezier(0.68, -0.55, 0.27, 1.55)` — used consistently for panel transitions, mask drag, collapse
- Global class conventions: `.form-input` for inputs, `.submit-button` for buttons, `.avatar`/`.avatar-sm` for avatars, `.unread-badge` for badges, `.online-indicator` for status dots
- All pages share a giant background "chat" text (768px, italic, `#62d2a2`)

## WebSocket Message Types

| Type | Direction | Handler(s) | Notes |
|------|-----------|---------|-------|
| `PRIVATE_MESSAGE` | send/receive | `useChatMessages` + `useFriendList` | Dual-handler: display + sidebar unread (see pattern doc above) |
| `READ_RECEIPT` | send/receive | `useChatMessages` | Marks message as read in the current chat |
| `FRIEND_ONLINE` / `FRIEND_OFFLINE` | receive | `useFriendList` | Toggles `friend.isOnline` |
| `FRIEND_REQUEST` | receive | `useNotifications` | Shows toast + preloads received list |
| `FRIEND_REQUEST_RESULT` | receive | `useNotifications` | Shows toast + refreshes friends if accepted |
| `GROUP_MESSAGE` | send/receive | `useChatMessages` + `useFriendList` | Dual-handler: display + sidebar unread/last-message |
| `GROUP_MEMBER_JOIN` | receive | `useFriendList` | Store to `groupNotifications[]` + toast + `loadGroups()` |
| `GROUP_MEMBER_LEAVE` | receive | `useFriendList` | Store to `groupNotifications[]` + toast + `loadGroups()` |
| `JOIN_GROUP_REQUEST` | receive | `useNotifications` | Store to `joinGroupRequests[]` + toast (sent to group owners for approval — backend v2.1) |
| `ERROR` | receive | `Chat.vue` + `wsManager` (default) | Chat.vue handles auth errors → force logout; wsManager provides fallback console.error |

Types are defined as JSDoc `@typedef` in `types/index.js`.

## Component Communication

Chat page uses strict parent-child props-down/events-up:
- **ChatLeftPanel** — displays friends/groups/notifications list; notification section has two items: "好友通知"(with pending badge) + "群聊通知"(with event count badge); emits `select-friend`, `select-group`, `logout`, `open-side-panel`, `open-notifications`, `open-group-notifications`, `open-profile`, `group-action`, toggle events
- **ChatMessageArea** — message flow + input; emits `send`, `scroll-top`, `back-to-list`, `view-profile`; exposes `messageListRef`, `inputText`, `scrollToBottom()`, `resetInput()` via `defineExpose`
- **ChatNotificationPanel** — thin tab-switching wrapper; delegates friend notifications to `ChatNotificationFriend` (bubble stream with accept/reject) and group notifications to `ChatNotificationGroup` (member events + join requests with approval buttons). Both sub-components share unscoped bubble styles defined in the parent. Emits `handle-request`, `handle-join-request`, `load-more`, `back-to-list`, `view-profile`
- **ChatSidePanel** — add friend / create group / join group modes; emits `close`, `search`, `add-friend`, `create-group`, `join-group`, `edit-username`, `change-password`, `send-message-to`, `add-friend-from-profile`, `delete-friend`, `dissolve-or-leave-group`, `view-profile`, `logout`
- **ChatProfileCard** — dispatches profile body to `ProfileSelf` / `ProfileFriend` / `ProfileStranger` / `ProfileGroup` based on `profileContext`; keeps shared avatar header + profile-card CSS in the parent. Embedded inside ChatSidePanel in profile mode
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
