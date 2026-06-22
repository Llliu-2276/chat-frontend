# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Real-time chat frontend — Vue 3 (Composition API, `<script setup>`) + Pinia + Element Plus + native WebSocket. Pure JavaScript with JSDoc type annotations (NOT TypeScript). Built with Vite 5.4.

## Development Rules

- **维护现有架构**：每次修改代码必须遵循项目的三层数据流架构（Views → Composables → API），不得破坏现有的分层设计、组件通信模式（props-down/events-up）和单例管理模式（wsManager、heartbeatManager）。
- **符合项目规范**：严格使用项目既定的技术栈和模式——Composition API + `<script setup>`、Pinia（Composition API 风格）、JSDoc 类型注释（禁止引入 TypeScript）、共享设计令牌（`shared.css` 中的 CSS 变量和全局 class）、环境变量分层（`.env.development` / `.env.production`）。
- **符合原代码风格**：匹配现有代码的命名规范（组件 PascalCase、composable `use` 前缀 camelCase、API/Utils kebab-case）、注释风格（文件头 `@module` + 函数 `@param`/`@returns` JSDoc）、中文注释语言、以及统一的视觉动画参数（弹性曲线 `cubic-bezier(0.68, -0.55, 0.27, 1.55)`、磨砂玻璃效果等）。
- **检查逻辑漏洞**：修改后必须审视——WebSocket 事件是否正确注册/注销（防止内存泄漏）、乐观更新失败时是否正确回滚、定时器是否在 `onBeforeUnmount` 中清除、错误路径是否都有用户提示（toast.error）、401 场景是否正确触发完整清理（清 Pinia Store + localStorage + 停心跳 + 断 WS + 跳转登录页）。
- **同步前端文档**：每次完成任务后，检查 `frontend_document/` 目录下的相关文档是否需要更新——`ARCHITECTURE.md`（架构变更）、`COMPONENTS.md`（组件 Props/Events/Expose 变更）、`API_GUIDE.md`（API 调用方式变更）、`STATE_MANAGEMENT.md`（Store/Composable 状态变更）、`CODE_STANDARDS.md`（编码规范变更）。如果改动涉及部署流程，同样检查 `NGINX_DEPLOYMENT.md`。

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Start dev server on localhost:5174
npm run build            # Production build to dist/
npm run preview          # Preview production build
```

Development requires Node.js >= 18 and the Spring Boot backend running on `localhost:8080`.

## Environment Config

- `.env` — shared defaults (relative paths for production/tunnel): `VITE_API_BASE_URL=/api`, `VITE_WS_URL=/ws/chat`
- `.env.development` — local dev: `VITE_API_BASE_URL=http://localhost:8080/api`, `VITE_WS_URL=ws://localhost:8080/ws/chat`
- `.env.production` — relative paths: `VITE_API_BASE_URL=/api`, `VITE_WS_URL=/ws/chat` (Nginx reverse-proxies to backend)

The `VITE_WS_URL` value can be absolute (`ws://`/`wss://`) or relative (`/ws/chat`). When relative, `wsManager` auto-derives protocol from `window.location.protocol` (ws: for http, wss: for https).

## Architecture: Three-Layer Data Flow

```
Vue Views (Chat.vue as container, Login.vue standalone)
  → Composables (useChatMessages / useFriendList / useNotifications / useSidePanel / useProfile)
    → API layer (auth.js / user.js / friend.js / group.js via request.js Axios instance)
      → Backend (:8080)
```

**Chat.vue is the orchestrator** — it initializes all five composables, wires them together, and passes data down to child components (ChatLeftPanel, ChatMessageArea, ChatNotificationPanel, ChatSidePanel, ChatProfileCard via ChatSidePanel) via props/emits. The composables own all state (refs), API calls, and WebSocket event subscriptions; Chat.vue itself holds only:
- Logout logic
- Cross-composable wiring wrapper functions (select friend triggers `resetChat()` + `loadChatHistory()`, profile-to-friend bridging)
- Notification tab switching (`notificationTab` ref for friend vs group notification dual-entry)
- Timer lifecycle: 30s unread poll, 60s friend list refresh, 60s group list refresh
- WS `ERROR` handler for auth failures → force logout

### Composable Dependency Injection

Composables receive their dependencies in two styles:
- **Individual params**: `useChatMessages(chatTarget, chatType, friends, messageAreaRef, userStore, toast)` and `useFriendList(toast)` — used when dependencies are plain refs/objects without circular references.
- **Options object**: `useNotifications({ loadFriends, loadGroups, groups, activeView, chatTarget, mobileView, toast })`, `useSidePanel({ toast, sentRequests, loadGroups, onJoinRequestSent })`, `useProfile({ toast, friends, groups, chatTarget, chatType, resetChat, closeSidePanel, loadFriends, loadGroups, sidePanelMode, groupSubMode, showSidePanel })` — uses callbacks to resolve circular dependencies (e.g., `useNotifications` needs to call `loadFriends` which is owned by `useFriendList`, and receives `groups` ref to resolve group names in WS join requests).

### Composable Responsibilities (5 composables)

| Composable | Owns | Key Dependencies |
|---|---|---|
| `useFriendList` | friends[], groups[], chatTarget, chatType, mobileView, activeView, expand/collapse state, groupNotifications[] | toast (injected) |
| `useChatMessages` | messages[], loading/pagination/sending state | chatTarget, chatType, friends, messageAreaRef, userStore, toast |
| `useNotifications` | receivedRequests[], sentRequests[], pendingRequestCount, pagination, joinGroupRequests[] | loadFriends, loadGroups, groups, activeView, chatTarget, mobileView, toast |
| `useSidePanel` | showSidePanel, sidePanelMode, groupSubMode, panelSearchResults, panelSearching, groupSearchResults, groupSearching, sendingRequestIds, joiningGroupIds | toast, sentRequests, loadGroups, onJoinRequestSent (callback) |
| `useProfile` | profileUser, profileContext, profileLoading, panelHistory[] | toast, friends, groups, chatTarget, chatType, resetChat, closeSidePanel, loadFriends, loadGroups, sidePanelMode, groupSubMode, showSidePanel |

### PRIVATE_MESSAGE Dual-Handler Pattern

Both `useChatMessages` and `useFriendList` register handlers for `PRIVATE_MESSAGE` — this is deliberate, not a bug:
- **`useChatMessages`** handles message display: replaces optimistic temp messages on echo-back, appends incoming messages, auto-sends `READ_RECEIPT` for current-chat messages, scrolls to bottom. Also independently clears/increments unread counts on `friends[]`.
- **`useFriendList`** handles sidebar state: clears unread count when the message is from the currently-selected friend, increments unread count otherwise.

Both handlers run independently and **both manipulate unread counts** — this is intentional double-coverage to ensure unread state stays consistent regardless of handler execution order. When modifying either handler, ensure they apply the same unread logic (clear on current-chat, increment otherwise) to avoid divergence.

### GROUP_MESSAGE Dual-Handler Pattern

Same pattern as PRIVATE_MESSAGE — both `useChatMessages` and `useFriendList` register handlers for `GROUP_MESSAGE`:
- **`useChatMessages`** handles message display: replaces optimistic temp messages on echo-back, appends incoming messages, scrolls to bottom.
- **`useFriendList`** handles sidebar state: updates last message text (formatted as `senderName: content`), increments/clears unread count on the group, and persists unread counts to localStorage via `saveGroupUnreadCache()`.

**Group unread persistence**: `useFriendList` maintains a `chat_group_unread` localStorage key (`{ [groupId]: unreadCount }`). On every WS group message, the cache is saved. On `loadGroups()`, cached values are merged with backend data (backend value takes priority, cache is fallback). When switching to a group chat, its unread count is cleared both in memory and localStorage.

### GROUP_MEMBER_JOIN / GROUP_MEMBER_LEAVE

Handled by `useFriendList` — stored to `groupNotifications[]` (max 100), a toast notification is shown, and group list is refreshed via `loadGroups({ silent: true })`. Group notifications flow: WS event → useFriendList.groupNotifications[] → Chat.vue passes to ChatNotificationPanel → ChatNotificationGroup renders as system message bubbles.

### JOIN_GROUP_REQUEST

Handled by `useNotifications` — sent by backend to group owners when someone applies to join (backend v2.1). Handler stores to `joinGroupRequests[]` (max 50) and shows a toast with applicant name + group name. Group name is resolved from the `groups` ref (injected dependency) with fallback to the WS message's `content` field. Group owners can approve/reject via `handleJoinRequestAction()`, which uses `splice(idx, 1, updated)` to replace array elements (necessary for Vue computed reactivity on `allGroupItems`).

Self-initiated join requests are added via `addSelfJoinRequest()` (called through Chat.vue's `onJoinRequestSent` callback → `useSidePanel`). Already-processed requests (status ≠ 0) are filtered out in `ChatNotificationGroup.allGroupItems` computed.

### Note — useFriendList manages both friends and groups

Despite its name, this composable owns both `friends[]` and `groups[]` reactive arrays, exposes both `loadFriends()` and `loadGroups()`, and registers WS handlers for both friend events (ONLINE/OFFLINE) and group events (GROUP_MESSAGE, GROUP_MEMBER_JOIN/LEAVE). The name is historical — when modifying, be aware it's the single composable that owns all sidebar list state.

### Pending Work (TODO)

Check `.claude/TODO_群聊系统待实现.md` before starting any group-chat related work. The document tracks backend APIs and WebSocket message types that are implemented on the server but not yet wired into the frontend. Key gaps as of 2026-06-22:

| Priority | Category | Items |
|----------|----------|-------|
| 🔴 P0 | 核心功能 | 消息撤回（私聊+群聊）、群聊已读回执 |
| 🟡 P1 | 群管理 | 群主转让、踢人、邀请入群、群解散通知 |
| 🟢 P2 | 增强功能 | 消息搜索、编辑群信息、通知历史、入群申请列表、用户拉黑系统 |
| 🟢 P3 | 降级兜底 | 群聊最后消息缺失兜底优化 |

## Key Architectural Patterns

### WebSocket-First Messaging with HTTP Fallback

`useChatMessages.onSendMessage()` pushes an optimistic temp message (with `_id: Date.now()`), attempts `wsManager.send()` first. If the WS is not connected, falls back to REST API (`sendMessageApi()` for private, `sendGroupMessage()` for group). When the server echoes the message back via WebSocket, the temp message is replaced with the real `recordId`. On failure, the temp message is removed from the list. The input is always cleared on success, preserved on failure.

### Profile Panel Navigation (History Stack)

`useProfile` maintains a `panelHistory` ref (array of `{ mode, groupSubMode }`) that enables back-navigation from profile view to the previous panel view. When opening a user/group profile from another panel mode (e.g., search results), the current mode is pushed onto the stack. When closing the profile (`handlePanelClose()`), if history is non-empty, the previous view is restored instead of closing the panel. Both `ChatSidePanel` and `useSidePanel` avoid resetting search state when switching to/from profile mode.

### Chat.vue Cross-Composable Wiring

Chat.vue has wrapper functions that bridge composables when one composable's output must trigger another's action:
- **`onSelectFriend()`** — calls `_selectFriend()` (useFriendList) + `resetChat()` + `loadChatHistory()` (useChatMessages)
- **`onSelectGroup()`** — calls `_selectGroup()` (useFriendList) + `resetChat()` + `loadChatHistory()` (useChatMessages)
- **`handleSendMessageTo()`** — calls `_sendMessageTo()` (useProfile) which closes the panel, then `onSelectFriend()` to switch chat target
- **`handleAddFriendFromProfile()`** — calls `_addFriendFromProfile()` (useProfile), then `handleAddFriend()` (useSidePanel) to open the add-friend dialog
- **`viewProfile()`** — dispatches to `onViewProfile()` or `onViewGroupProfile()` (useProfile) based on whether the target has a `groupId`
- **`handleSendMessageToGroup()`** — calls `_sendMessageToGroup()` (useSidePanel) which closes the panel, then `onSelectGroup()` to switch to the group chat
- **`addSelfJoinRequest()` → `useSidePanel.onJoinRequestSent`** — callback passed to `useSidePanel` so that when a user sends a join-group request, `useNotifications.addSelfJoinRequest()` is called to track it in `joinGroupRequests[]` for display in ChatNotificationPanel
- **`openFriendNotifications()`** — sets `notificationTab = 'friend'`, calls `openNotifications()` (loads friend request data, switches `activeView = 'notifications'`)
- **`openGroupNotifications()`** — sets `notificationTab = 'group'`, sets `activeView = 'notifications-group'` directly (no friend data load needed)

### Notification Panel Dual-Entry Control

Chat.vue maintains a `notificationTab` ref (`'friend'` | `'group'`) passed to ChatNotificationPanel as `initialTab`. Two entry points in ChatLeftPanel:
- Click "好友通知" → `openFriendNotifications()` → panel shows friend requests (ChatNotificationFriend component)
- Click "群聊通知" → `openGroupNotifications()` → panel shows group events (ChatNotificationGroup component)

The `activeView` distinguishes: `'notifications'` (friend) vs `'notifications-group'` (group). ChatNotificationPanel is a thin shell that dispatches to the correct child component based on `initialTab`.

### Group Profile Card Dual-View (isGroupMember)

`ChatProfileCard` dispatches to `ProfileGroup` which renders different UI based on `isGroupMember` prop (computed by `useProfile.isGroupMember()` which checks `groups[]`):
- **Joined members**: full info (name, account, owner, member count, create date) + member list (loaded from `getGroupInfo` with `getGroupMembers` fallback) + "发消息" + "解散群聊"/"退出群聊"
- **Non-members**: basic info (name, account, member count only) + "加入群聊" button

### ProfileGroup Member Loading with Fallback

`ProfileGroup.vue` loads member data on mount via a two-tier strategy:
1. Primary: `getGroupInfo(groupId)` — returns group details with embedded `members` field. Only used if `members` is a non-empty array.
2. Fallback: `getGroupMembers(groupId)` — separate members-only endpoint, used when `getGroupInfo` fails or returns empty/incompatible member data.

Members are sorted: group owner first, then by `joinDate` ascending. Owner avatar uses gold-gradient (`#f5af19 → #f12711`) with "群主" tag.

### WebSocket Manager (Singleton)

`utils/websocket.js` — class-based singleton (`wsManager`). Handles connect/disconnect/reconnect (up to 10 retries, 3s delay), pub-sub event dispatch (`on/off/emit` by message type), and auto-protocol derivation (ws:// vs wss:// based on `window.location.protocol` when using relative WS URLs). Disconnect during logout sets `manuallyClosed = true` to suppress reconnect. Auth failure (close code 4001/1008) also sets `manuallyClosed = true` to prevent reconnect. Chat.vue additionally registers a handler for `ERROR` messages that triggers force-logout if the error text contains auth-related keywords (认证/Token/未授权/登录). All listeners are cleared on `disconnect()`.

### Heartbeat Manager (Singleton)

`utils/heartbeat.js` — class-based singleton (`heartbeatManager`). Sends `POST /user/heartbeat` every 2 minutes. Started on login/init, stopped on logout. Silent failure (doesn't affect UX). `start()` first calls `stop()` to prevent duplicate timers, sends one immediate heartbeat, then starts interval.

### Pinia Store (Composition API Style)

Only `useUserStore` — manages token, userInfo, login/register/logout actions. On login: saves token+userInfo to localStorage, starts heartbeat, connects WebSocket. On logout: calls backend, clears all local state regardless of success (in `finally` block). `initUserState()` is called at app startup to restore session from localStorage — reads `chat_token` directly (not via `getToken()`) for the initial check.

### Composables Pattern

All business logic lives in composables under `src/composables/`. Each composable:
- Receives dependencies via parameters (toast, store, child refs, callback functions)
- Owns its reactive state as `ref()` values
- Registers WebSocket listeners in `onMounted`, removes them in `onBeforeUnmount`
- Exposes state + methods as a plain object

**Exception — `_cleanup` pattern**: Two composables do NOT use `onBeforeUnmount` for cleanup and instead export manual `_cleanupXxx()` functions called by Chat.vue in its own `onBeforeUnmount`:
- **`useNotifications._cleanupNotifications()`** — uses closure-wrapped handler references (`_wsFriendRequest`, `_wsFriendRequestResult`, `_wsJoinGroupRequest`) to ensure the latest reactive closures are always called. Chat.vue must coordinate cleanup timing with its own lifecycle.
- **`useSidePanel._cleanupSidePanel()`** — clears the debounce instances (`_panelDebounce`, `_groupDebounce`). Chat.vue manages this because debounce timers must be cleared in the same lifecycle scope.

### Error Handling Pattern

Every async function that calls a backend API must follow this pattern:
- **try-catch** around the API call
- **toast.error** on failure (user must see what went wrong)
- **finally** block to reset loading/pending state
- Check response code against expected success codes (not just 200 — some APIs return 201 for created resources, e.g., `sendFriendRequest`, `createGroup`, `sendGroupMessage`, `joinGroup` return 201)

**Background polling**: Functions called on timers (e.g., `fetchUnreadMessages` every 30s, `loadFriends`/`loadGroups` every 60s) use a `{ silent: true }` option to suppress error toasts — don't spam the user every 30 seconds. Initial loads (called in `onMounted`) use the default `{ silent: false }`.

**Double-toast prevention**: When a follow-up refresh is called after a primary action that already showed a toast (e.g., `loadFriends()` after `handleDeleteFriend` which already toasted "已删除好友"), pass `{ silent: true }` to suppress duplicate error messages.

### API Layer

`api/request.js` — Axios instance with `baseURL` from env, 10s timeout. Request interceptor attaches `Bearer <token>`. Response interceptor: codes 200/201/202/204/206 pass through; 401 triggers `handleUnauthorized()` (full cleanup + redirect); other codes reject with `new Error(res.message)`. HTTP error handler: extracts `error.response.data.message` as the error text and rejects with it — callers always get the backend's actual error message, never Axios generic `"Request failed with status code xxx"`. All API modules export plain functions returning promises.

- `api/auth.js` — login/register/logout
- `api/user.js` — profile CRUD, search users, online count
- `api/friend.js` — friend list, messages (send/history/unread), friend requests (send/handle/received/sent), delete friend
- `api/group.js` — create/list/info, members, messages (send/history), search groups, join/dissolve/leave, handle join requests (v2.1)
- `api/heartbeat.js` — POST heartbeat

**`handleUnauthorized()`**: Performs full cleanup — clears Pinia Store (`userStore.token = ''`, `userStore.userInfo = null`), removes localStorage (`removeToken()` + `removeUserInfo()`), stops heartbeat, disconnects WebSocket, shows `ElMessage.error('登录已过期，请重新登录')`, redirects to `/login?redirect=...`. The cleanup is consistent with `useUserStore.clearUserState()`.

**`isHandlingUnauthorized` guard**: When multiple concurrent requests all receive 401 (e.g., heartbeat + unread poll + friend list refresh), the response interceptor uses a module-level boolean flag to prevent `handleUnauthorized()` from executing multiple times. The flag is reset after `router.push()` completes.

### Route Guards

`router/index.js` — `beforeEach` checks `meta.requiresAuth` against localStorage token. Unauthenticated → `/login?redirect=...`. Already-authenticated hitting `/login` → redirect to `/chat`. Three routes only: `/` (redirect to `/login`), `/login`, `/chat`. Profile and search features are handled by ChatSidePanel/ChatProfileCard within the chat page — there are no standalone profile/search routes.

### Global Dependency Injection

`App.vue` provides `loading` (show/hide via `GlobalLoading` ref, counter-based) and `toast` (success/error/warning/info via `ElMessage`) via Vue's `provide`. Child components access via `inject('toast')`.

### Shared Utilities

Don't duplicate these — import from the canonical location:

- **`utils/time.js`** — `formatTime(t)` (ISO→HH:mm), `formatDividerLabel(timeStr)` (smart date label: 今天/昨天/周X/日期), `insertTimeDividers(items, timeKey, options?)` (auto-insert 5-min gap dividers, returns mixed array with `{ _divider: true, key, label }` objects). Used by ChatMessageArea, ChatNotificationFriend, ChatNotificationGroup, ChatLeftPanel.
- **`utils/debounce.js`** — `createDebounce(fn, delay=300)` returns `{ invoke, cancel }` for search-input debouncing. Used by useSidePanel for both user and group search.
- **`utils/storage.js`** — `setToken/getToken/removeToken`, `setUserInfo/getUserInfo/removeUserInfo`, `clearAuth()`. Keys: `chat_token`, `chat_user_info`.

### Extracted Composables

These were extracted from large components during architecture optimization:

- **`useDragMask(containerRef)`** — extracted from Login.vue (was ~160 lines inline). Manages mask ring drag position (0 to 1), spring animation, window resize, and touch/mouse event lifecycle with global document listeners. Returns `{ maskPosition, dragDirection, maskStyle, leftCurveStyle, startDrag, slideTo }`. On drag end, snaps to nearest edge based on threshold.
- **`useDropdown({ triggerRef, offsetY })`** — extracted from ChatLeftPanel group-action menu (was ~55 lines inline). Manages dropdown visibility, position tracking via MutationObserver on document.body, click-outside close. Returns `{ show, position, toggle, close }`. Used by ChatLeftPanel for the group create/join dropdown menu.

## Key State Constants

Critical string enums used across composables and components — must match exactly for conditionals:

- **`activeView`**: `'chat'` | `'notifications'` (friend requests) | `'notifications-group'` (group events)
- **`chatType`**: `'friend'` | `'group'` — drives which API/WS endpoints are used for message send and history load
- **`sidePanelMode`**: `'friend'` (add friend search) | `'group'` (create/join group) | `'profile'` (user/group profile card)
- **`groupSubMode`**: `'create'` | `'join'` — sub-mode within sidePanelMode='group'
- **`notificationTab`**: `'friend'` | `'group'` — controls which child component ChatNotificationPanel renders
- **`profileContext`**: `'self'` | `'friend'` | `'stranger'` | `'group'` — drives ChatProfileCard child dispatch
- **`mobileView`**: `'list'` | `'chat'` — controls which panel is visible on mobile

## Design System

Global styles are split across two files:
- `src/style.css` — base element resets and CSS variables for the entire app
- `src/assets/shared.css` — shared design tokens, form controls, avatars, badges, animations

All shared design tokens in `assets/shared.css`:
- **Primary gradient**: `linear-gradient(135deg, #11998e 0%, #38ef7d 100%)`
- **Glassmorphism**: `background: rgba(255,255,255,0.25); backdrop-filter: blur(20px); border-radius: 16px` (plus `-webkit-backdrop-filter` for Safari)
- **Bounce animation**: `cubic-bezier(0.68, -0.55, 0.27, 1.55)` — used consistently for panel transitions, mask drag, collapse animations
- Global class conventions: `.form-input` for inputs, `.submit-button` for buttons, `.avatar`/`.avatar-sm`/`.avatar-lg` for avatars, `.unread-badge` for badges, `.online-indicator` for status dots, `.glass-card` for cards, `.btn-accept` (green) and `.btn-danger` (red) for action buttons
- All pages share a giant background "chat" text (768px, italic, `#62d2a2`)
- Custom scrollbar: 4px wide with primary gradient thumb

## WebSocket Message Types

| Type | Direction | Handler(s) | Notes |
|------|-----------|---------|-------|
| `PRIVATE_MESSAGE` | send/receive | `useChatMessages` + `useFriendList` | Dual-handler: display + sidebar unread (see pattern doc above) |
| `READ_RECEIPT` | send/receive | `useChatMessages` | Marks message as read in the current chat |
| `FRIEND_ONLINE` / `FRIEND_OFFLINE` | receive | `useFriendList` | Toggles `friend.isOnline` |
| `FRIEND_REQUEST` | receive | `useNotifications` | Shows toast + preloads received list (dedup by senderId+status) |
| `FRIEND_REQUEST_RESULT` | receive | `useNotifications` | Shows toast + refreshes friends if accepted |
| `GROUP_MESSAGE` | send/receive | `useChatMessages` + `useFriendList` | Dual-handler: display + sidebar unread/last-message + unread persistence |
| `GROUP_MEMBER_JOIN` | receive | `useFriendList` | Store to `groupNotifications[]` (max 100) + toast + `loadGroups({ silent: true })` |
| `GROUP_MEMBER_LEAVE` | receive | `useFriendList` | Same handler as JOIN (dedup by `groupId+senderId+type`) |
| `JOIN_GROUP_REQUEST` | receive | `useNotifications` | Store to `joinGroupRequests[]` (max 50) + toast (sent to group owners — backend v2.1). Resolves group name from `groups` ref with WS content field fallback. |
| `ERROR` | receive | `Chat.vue` + `wsManager` (fallback) | Chat.vue handles auth errors → force logout; wsManager provides default `console.error` for any unhandled types |

Types are defined as JSDoc `@typedef` in `types/index.js`. All WS message types the client sends (`PRIVATE_MESSAGE`, `GROUP_MESSAGE`, `READ_RECEIPT`) are sent as `{ type, ...data }` objects via `wsManager.send()`.

## Component Communication

Chat page uses strict parent-child props-down/events-up:

- **ChatLeftPanel** — displays friends/groups/notifications list with three collapsible sections. Notification section has two items: "好友通知"(with pending badge) + "群聊通知"(with event count badge). Uses `useDropdown` for the group create/join dropdown menu. Friend list sorted by last message time (desc), then online status. Emits `select-friend`, `select-group`, `logout`, `open-side-panel`, `open-notifications`, `open-group-notifications`, `open-profile`, `group-action`, and toggle events.
- **ChatMessageArea** — message flow with time dividers + input area. Supports Enter to send, Ctrl+Enter for newline. Chat header avatars are clickable to view profiles (friend → user profile, group → group profile). Emits `send`, `scroll-top`, `back-to-list`, `view-profile`. Exposes `messageListRef`, `inputText`, `scrollToBottom()`, `resetInput()` via `defineExpose`.
- **ChatNotificationPanel** — shell component that dispatches to `ChatNotificationFriend` or `ChatNotificationGroup` based on `initialTab` prop. Shares unscoped bubble styles (`.bubble-flow`, `.bubble`, `.message-row`, etc.) that both child components use. Emits `handle-request`, `handle-join-request`, `load-more`, `back-to-list`, `view-profile`.
- **ChatNotificationFriend** — merges received and sent friend requests into a unified bubble stream sorted by time. Received requests (left side) have accept/reject buttons when pending. Sent requests (right side) show status tags. Both sides allow clicking avatars to view user profiles. Uses `insertTimeDividers` for time separation.
- **ChatNotificationGroup** — merges group member change events (member-change type) and join group requests (join-request type) into a unified bubble stream. Member changes shown as left-side system message bubbles. Join requests: others' requests (left, with approve/reject for pending), own requests (right, with status tags). Already-processed join requests (status ≠ 0) are filtered out.
- **ChatSidePanel** — shell that displays one of three modes: `friend` (search users → add friend), `group` with `groupSubMode='create'` (create group form) or `groupSubMode='join'` (search groups → join), `profile` (embeds ChatProfileCard). Uses `Transition` for slide-in animation and mode switching. Emits all profile and search actions up to Chat.vue.
- **ChatProfileCard** — dispatches profile body to `ProfileSelf` / `ProfileFriend` / `ProfileStranger` / `ProfileGroup` based on `profileContext`. Keeps shared avatar header + profile-card CSS in the parent (unscoped), so all four child components share the same `.profile-info-card`, `.profile-action-btn`, etc. classes. Embedded inside ChatSidePanel in profile mode.
- **ProfileSelf** — inline username editing (pencil → input → confirm/cancel buttons), expandable password change section with grid animation, logout button.
- **ProfileGroup** — `isGroupMember=true` shows full info + member list + send message + dissolve/leave; `isGroupMember=false` shows basic info + join button. Member list loads via `getGroupInfo` → `getGroupMembers` fallback chain. Members sorted owner-first then by join date. Owner gets gold gradient avatar + "群主" tag.
- **GlobalLoading** — full-screen overlay with spinner; counter-based show/hide (supports nested calls)

**Important — unscoped styles**: Three files use `<style>` (unscoped) for styles that need to penetrate the component tree:
1. **Chat.vue** — `.add-friend-dialog` / `.confirm-dialog` classes for `ElMessageBox` (rendered in `<body>`)
2. **ChatNotificationPanel.vue** — `.bubble-flow` / `.bubble` / `.message-row` / `.other-bubble` / `.self-bubble` used by ChatNotificationFriend and ChatNotificationGroup
3. **ChatProfileCard.vue** — `.profile-card` / `.profile-info-card` / `.profile-inline-*` used by ProfileSelf / ProfileFriend / ProfileStranger / ProfileGroup

Any styles targeting `ElMessageBox`, `ElMessage`, or `ElNotification` must be unscoped.

## Login Page Special Mechanics

`Login.vue` uses a draggable mask ring with 3D perspective ellipse curves — not a tab switch. `maskPosition` (0–1) controls which form is visible. On register success, mask auto-slides to position 0 (showing login form) via `slideTo(0)` after 500ms delay. The left ellipse curve (`ring-left-curve-down`) follows mask position via computed `translateX` matching the mask's spring animation. Drag uses global document listeners (mousemove/mouseup/touchmove/touchend) registered on drag start and cleaned up on `onBeforeUnmount`. Resize handler recalculates container/mask widths for responsive behavior.

## Deployment

Production deployment uses Nginx as reverse proxy (config in `nginx.conf`). Static files served from `dist/`, `/api/` proxied to backend, `/ws/` proxied with `Upgrade`/`Connection` headers for WebSocket. SPA fallback via `try_files $uri /index.html`. Supports natapp tunnel for development (domain whitelisted in `vite.config.js` `allowedHosts`).

## File Naming Conventions

- Views: PascalCase (`Login.vue`, `Chat.vue`)
- Components: PascalCase in subdirectories (`chat/ChatLeftPanel.vue`, `common/GlobalLoading.vue`)
- Composables: camelCase with `use` prefix (`useChatMessages.js`)
- API modules: kebab-case (`friend.js`, `auth.js`)
- Utils: kebab-case (`websocket.js`, `storage.js`)
- All files use JSDoc `@module` and `@param`/`@returns` annotations
- Component names explicitly set via `defineOptions({ name: '...' })` for Vue DevTools
