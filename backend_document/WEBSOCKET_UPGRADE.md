# WebSocket 实时通信升级说明

> **升级日期**: 2026-06-18
> **关联技术**: Spring Boot 4.0.2 + 原生 WebSocket + JWT

---

## 一、升级了什么

### 新增能力

| 能力 | 说明 |
|------|------|
| WebSocket 端点 | `ws://localhost:8080/ws/chat`，握手阶段 JWT 认证 + Token黑名单校验 + 心跳状态校验 |
| 私聊消息推送 | 消息持久化到 MySQL 后，通过 WebSocket 实时推送给接收者，同时回传给发送者 |
| 在线状态广播 | 用户连接/断开时，自动向所有好友推送上线/下线通知 |
| 消息已读回执 | 接收者阅读消息后，通过 `READ_RECEIPT`（私聊）或 `GROUP_READ_RECEIPT`（群聊）通知服务端 |
| 群聊消息广播 | 群成员发送消息后，广播 `GROUP_MESSAGE` 给所有群成员 |
| 群成员变动通知 | 成员加入推送 `GROUP_MEMBER_JOIN`，退出/解散推送 `GROUP_MEMBER_LEAVE` |
| WebSocket 心跳 | 连接层心跳，替代原有的 HTTP 心跳接口 |
| 好友申请通知 | 发起申请时实时推送 `FRIEND_REQUEST` 给被申请人 |
| 申请结果通知 | 处理申请后实时推送 `FRIEND_REQUEST_RESULT` 给申请人 |
| 消息撤回通知 | 用户撤回消息后推送 `MESSAGE_RECALL` 给接收者（私聊）或全体成员（群聊） |
| 群主转让通知 | 群主转让后广播 `GROUP_OWNER_TRANSFERRED` 给全体成员 |
| 群聊解散通知 | 群主解散群聊时广播 `GROUP_DISBANDED` 给全体成员 |
| 入群申请通知 | 用户申请加入群聊时推送 `JOIN_GROUP_REQUEST` 给群主 |

### 与现有 REST 接口的关系

| 功能 | 走 REST | 走 WebSocket |
|------|---------|-------------|
| 注册/登录/登出 | ✅ | — |
| 获取好友列表/聊天历史 | ✅ | — |
| 发送消息 | 仍可用 | 优先走 WebSocket |
| 好友申请 | `POST /api/friends/request/handle` 处理 | 发起申请时推送 `FRIEND_REQUEST`，处理结果推送 `FRIEND_REQUEST_RESULT` |
| 接收新消息 | 轮询 `/api/friends/messages/unread` | 服务端主动推送 |
| 在线状态 | `/api/user/search/count` | 服务端推送 `FRIEND_ONLINE`/`OFFLINE` |
| 心跳 | `POST /api/user/heartbeat` | WebSocket `HEARTBEAT` |

REST 接口全部保留兼容，WebSocket 是新增的实时通道，两者并存。

---

## 二、前端怎么对接

### 1. 建立连接

```
ws://localhost:8080/ws/chat?token={JWT_TOKEN}
```

Token 从登录接口获取，放在 URL 查询参数中。

> **安全说明**：握手时后端会校验：①JWT签名有效性 ②Token是否在黑名单中（已登出/密码已修改） ③用户心跳是否存活。任一校验失败将返回 401 拒绝握手。

### 2. 消息格式

所有消息为 JSON，通过 `type` 区分类型。前端需要处理的消息类型如下：

**客户端发送：**

```json
{ "type": "PRIVATE_MESSAGE", "receiverId": 2, "content": "消息内容" }
{ "type": "GROUP_MESSAGE", "groupId": 1, "content": "群聊消息内容" }
{ "type": "HEARTBEAT" }
{ "type": "READ_RECEIPT", "recordId": 105 }
{ "type": "GROUP_READ_RECEIPT", "groupId": 1, "recordId": 200 }
```

**服务端推送：**

```json
{ "type": "PRIVATE_MESSAGE", "senderId": 1, "senderName": "张三", "content": "消息内容", "sendTime": "2026-06-09T12:00:00", "recordId": 105 }
{ "type": "GROUP_MESSAGE", "senderId": 1, "senderName": "张三", "groupId": 1, "content": "群聊消息", "sendTime": "2026-06-09T12:00:00", "recordId": 200 }
{ "type": "FRIEND_ONLINE", "senderId": 5, "senderName": "李四" }
{ "type": "FRIEND_OFFLINE", "senderId": 5, "senderName": "李四" }
{ "type": "FRIEND_REQUEST", "senderId": 3, "senderName": "王五", "requestId": 1, "requestMessage": "你好，希望加你为好友", "sendTime": "2026-06-10T10:30:00" }
{ "type": "FRIEND_REQUEST_RESULT", "senderId": 2, "senderName": "李四", "requestId": 1, "content": "accepted", "sendTime": "2026-06-10T11:00:00" }
{ "type": "GROUP_MEMBER_JOIN", "groupId": 1, "senderId": 3, "senderName": "王五", "sendTime": "2026-06-10T12:00:00" }
{ "type": "GROUP_MEMBER_LEAVE", "groupId": 1, "senderId": 3, "senderName": "王五", "sendTime": "2026-06-10T12:30:00" }
{ "type": "READ_RECEIPT", "senderId": 2, "recordId": 105 }
{ "type": "MESSAGE_RECALL", "senderId": 1, "senderName": "张三", "recordId": 105, "receiverId": 2, "groupId": null, "content": "消息已被撤回", "sendTime": "2026-06-18T12:00:00" }
{ "type": "GROUP_OWNER_TRANSFERRED", "groupId": 1, "senderId": 5, "senderName": "旧群主", "targetUserId": 3, "content": "李四 成为新群主", "sendTime": "2026-06-18T12:00:00" }
{ "type": "JOIN_GROUP_REQUEST", "senderId": 3, "senderName": "王五", "groupId": 1, "content": "申请加入群聊 xxx", "requestId": 1, "sendTime": "2026-06-18T12:00:00" }
{ "type": "GROUP_DISBANDED", "groupId": 1, "senderId": 5, "senderName": "群主", "content": "技术交流群 已被群主解散", "sendTime": "2026-06-21T12:00:00" }
{ "type": "ERROR", "error": "错误信息" }
```

### 3. 对接要点

- 登录成功后，携带 Token 建立 WebSocket 连接
- 收到 `PRIVATE_MESSAGE` 时，将消息追加到聊天列表；发送者也会收到回传，用于确认发送成功
- 收到 `FRIEND_ONLINE` / `FRIEND_OFFLINE` 时，更新对应好友的在线状态显示
- 收到 `FRIEND_REQUEST` 时，弹出好友申请通知，刷新申请列表
- 收到 `FRIEND_REQUEST_RESULT` 时，更新申请状态（`content` 为 `accepted` 或 `rejected`）
- 收到 `READ_RECEIPT` 时，将对应私聊消息标记为已读
- 收到 `GROUP_MESSAGE` 时，将消息追加到对应群聊天列表
- 收到 `GROUP_MEMBER_JOIN` / `GROUP_MEMBER_LEAVE` 时，更新群成员列表
- 收到 `MESSAGE_RECALL` 时，将对应消息替换为"消息已被撤回"文本（私聊通过 receiverId+recordId 定位，群聊通过 groupId+recordId 定位）
- 收到 `GROUP_OWNER_TRANSFERRED` 时，更新群主信息（senderId=旧群主，targetUserId=新群主）
- 收到 `JOIN_GROUP_REQUEST` 时（群主端），弹出入群申请提示，刷新申请列表
- 进入群聊页面时，发送 `GROUP_READ_RECEIPT` 上报已读位置（也可调用 REST `POST /api/group/{groupId}/read/{recordId}`）
- 连接断开后，未送达的消息不会丢失，前端可通过原有 REST 接口补拉
- 页面关闭前主动断开连接

### 4. 后端新增文件

```
config/
  WebSocketConfig.java              — 端点注册
  WebSocketAuthInterceptor.java     — 握手认证拦截器
modules/websocket/
  model/ChatMessage.java            — 消息协议模型
  model/MessageType.java            — 消息类型枚举
  handler/ChatWebSocketHandler.java — 消息处理器
  service/UserSessionManager.java   — Session 管理器
```

### 5. 新增 Maven 依赖

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>
```
