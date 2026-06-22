/**
 * 类型定义文件
 * 使用 JSDoc 定义后端 API 的数据结构和类型
 * 为 JavaScript 项目提供类型提示
 * 
 * @module types/index
 */

/**
 * 后端统一响应格式
 * @template T
 * @typedef {Object} ApiResponse
 * @property {number} code - 业务状态码（200成功，401未授权，500服务器错误等）
 * @property {string} message - 提示信息
 * @property {T} data - 返回的数据
 */

/**
 * 用户信息接口
 * @typedef {Object} UserInfo
 * @property {number} userId - 用户ID
 * @property {string} userAccount - 账号（8位数字）
 * @property {string} userName - 用户名（≤16字符）
 * @property {string} createDate - 创建日期（YYYY-MM-DD）
 * @property {boolean} isOnline - 是否在线
 * @property {boolean} isAvailable - 是否可用
 */

/**
 * 登录响应（包含 Token）
 * @typedef {UserInfo & {token: string}} UserLoginWithToken
 */

/**
 * 注册响应
 * @typedef {Object} UserRegisterResponse
 * @property {number} userId - 新创建的用户ID
 * @property {string} userAccount - 系统自动生成的8位数字账号
 * @property {string} userName - 用户名
 */

/**
 * 登录请求参数
 * @typedef {Object} LoginDTO
 * @property {string} userAccount - 用户账号（8位数字）
 * @property {string} password - 用户密码
 */

/**
 * 注册请求参数
 * @typedef {Object} RegisterDTO
 * @property {string} userName - 用户名（≤16字符）
 * @property {string} password - 用户密码（6-32字符）
 */

/**
 * 修改用户名请求参数
 * @typedef {Object} UpdateUserDTO
 * @property {string} userName - 新的用户名
 */

/**
 * 修改密码请求参数
 * @typedef {Object} PasswordChangeDTO
 * @property {string} oldPassword - 旧密码
 * @property {string} newPassword - 新密码
 */

/**
 * 分页响应格式
 * @template T
 * @typedef {Object} PaginatedResponse
 * @property {T[]} content - 数据列表
 * @property {Object} pageable - 分页信息
 * @property {number} pageable.pageNumber - 当前页码
 * @property {number} pageable.pageSize - 每页数量
 * @property {number} totalElements - 总元素数
 * @property {number} totalPages - 总页数
 * @property {boolean} last - 是否最后一页
 * @property {boolean} first - 是否第一页
 */

/**
 * 搜索用户响应
 * @typedef {PaginatedResponse<UserInfo>} SearchUserResponse
 */

/**
 * 好友申请记录
 * @typedef {Object} FriendRequest
 * @property {number} requestId - 申请ID
 * @property {number} senderId - 发送方用户ID
 * @property {string} senderName - 发送方用户名
 * @property {string} senderAccount - 发送方账号
 * @property {number} receiverId - 接收方用户ID
 * @property {string} receiverName - 接收方用户名
 * @property {string} receiverAccount - 接收方账号
 * @property {string} message - 申请留言
 * @property {number} status - 申请状态（0-待处理, 1-已同意, 2-已拒绝）
 * @property {string} statusDescription - 状态描述
 * @property {string} createTime - 创建时间
 * @property {string} updateTime - 更新时间
 */

/**
 * 好友申请列表响应
 * @typedef {PaginatedResponse<FriendRequest>} FriendRequestListResponse
 */

/**
 * 好友信息视图对象
 * @typedef {Object} FriendInfoVO
 * @property {number} userId - 好友用户ID
 * @property {string} userAccount - 好友账号（8位数字）
 * @property {string} userName - 好友用户名
 * @property {boolean} isOnline - 是否在线（Redis实时获取）
 * @property {boolean} isAvailable - 是否可用
 * @property {string} createDate - 好友创建日期 (YYYY-MM-DD)
 */

/**
 * 好友消息视图对象（未读消息接口返回）
 * @typedef {Object} FriendMessageVO
 * @property {number} recordId - 消息记录ID
 * @property {number} senderId - 发送者用户ID
 * @property {string} senderName - 发送者用户名
 * @property {number} receiverId - 接收者用户ID
 * @property {string} content - 消息内容
 * @property {string} sendTime - 发送时间 (YYYY-MM-DDTHH:mm:ss)
 * @property {boolean} readStatus - 是否已读
 * @property {number} friendRelationId - 好友关系ID
 */

/**
 * 聊天记录视图对象（聊天历史接口返回）
 * @typedef {Object} ChatRecordVO
 * @property {number} recordId - 消息记录ID
 * @property {number} senderId - 发送者用户ID
 * @property {string} senderName - 发送者用户名
 * @property {number} receiverId - 接收者用户ID
 * @property {string} receiverName - 接收者用户名
 * @property {string} content - 消息内容
 * @property {string} sendTime - 发送时间 (YYYY-MM-DDTHH:mm:ss)
 * @property {boolean} readStatus - 是否已读
 */

/**
 * WebSocket 私聊消息
 * @typedef {Object} WsPrivateMessage
 * @property {'PRIVATE_MESSAGE'} type - 消息类型
 * @property {number} senderId - 发送者ID
 * @property {string} senderName - 发送者用户名
 * @property {number} receiverId - 接收者ID
 * @property {string} content - 消息内容
 * @property {string} sendTime - 发送时间
 * @property {number} recordId - 消息记录ID
 */

/**
 * WebSocket 已读回执
 * @typedef {Object} WsReadReceipt
 * @property {'READ_RECEIPT'} type - 消息类型
 * @property {number} senderId - 已读者ID
 * @property {number} recordId - 已读消息记录ID
 */

/**
 * WebSocket 好友上下线通知
 * @typedef {Object} WsOnlineStatus
 * @property {'FRIEND_ONLINE'|'FRIEND_OFFLINE'} type - 消息类型
 * @property {number} senderId - 好友用户ID
 * @property {string} senderName - 好友用户名
 */

/**
 * WebSocket 错误通知
 * @typedef {Object} WsError
 * @property {'ERROR'} type - 消息类型
 * @property {string} error - 错误信息
 */

/**
 * WebSocket 好友申请通知
 * @typedef {Object} WsFriendRequestNotification
 * @property {'FRIEND_REQUEST'} type - 消息类型
 * @property {number} senderId - 发送方ID
 * @property {string} senderName - 发送方用户名
 * @property {number} requestId - 申请ID
 * @property {string} requestMessage - 申请留言
 * @property {string} sendTime - 发送时间
 */

/**
 * WebSocket 好友申请结果通知
 * @typedef {Object} WsFriendRequestResult
 * @property {'FRIEND_REQUEST_RESULT'} type - 消息类型
 * @property {number} senderId - 处理方ID
 * @property {string} senderName - 处理方用户名
 * @property {number} requestId - 申请ID
 * @property {'accepted'|'rejected'} content - 处理结果
 * @property {string} sendTime - 处理时间
 */

/**
 * WebSocket 群聊消息
 * @typedef {Object} WsGroupMessage
 * @property {'GROUP_MESSAGE'} type - 消息类型
 * @property {number} senderId - 发送者ID
 * @property {string} senderName - 发送者用户名
 * @property {number} groupId - 群组ID
 * @property {string} content - 消息内容
 * @property {string} sendTime - 发送时间
 * @property {number} recordId - 消息记录ID
 */

/**
 * WebSocket 群成员变动通知
 * @typedef {Object} WsGroupMemberChange
 * @property {'GROUP_MEMBER_JOIN'|'GROUP_MEMBER_LEAVE'} type - 消息类型
 * @property {number} groupId - 群组ID
 * @property {string} groupName - 群名称
 * @property {number} senderId - 变动人员ID
 * @property {string} senderName - 变动人员用户名
 */

/**
 * 群组信息视图对象
 * @typedef {Object} GroupInfoVO
 * @property {number} groupId - 群组ID
 * @property {string} account - 群账号（8位数字）
 * @property {string} groupName - 群名称
 * @property {string} ownerName - 群主用户名
 * @property {number} memberCount - 成员数
 * @property {string} createDate - 创建日期 (YYYY-MM-DD)
 * @property {boolean} isOwner - 当前用户是否为群主
 */

/**
 * 群聊消息视图对象
 * @typedef {Object} GroupMessageVO
 * @property {number} recordId - 消息记录ID
 * @property {number} senderId - 发送者用户ID
 * @property {string} senderName - 发送者用户名
 * @property {number} groupId - 群组ID
 * @property {string} content - 消息内容
 * @property {string} sendTime - 发送时间 (YYYY-MM-DDTHH:mm:ss)
 */

/**
 * 群成员视图对象
 * @typedef {Object} GroupMemberVO
 * @property {number} userId - 用户ID
 * @property {string} userName - 用户名
 * @property {string} userAccount - 用户账号
 * @property {boolean} isOwner - 是否为群主
 * @property {string} joinDate - 加入日期 (YYYY-MM-DD)
 */

/**
 * WebSocket 群聊解散通知
 * @typedef {Object} WsGroupDisbanded
 * @property {'GROUP_DISBANDED'} type - 消息类型
 * @property {number} groupId - 群组ID
 * @property {number} senderId - 群主ID
 * @property {string} senderName - 群主用户名
 * @property {string} content - 通知文本（如 "xxx 已被群主解散"）
 * @property {string} sendTime - 解散时间
 */

/**
 * WebSocket 群主转让通知
 * @typedef {Object} WsGroupOwnerTransferred
 * @property {'GROUP_OWNER_TRANSFERRED'} type - 消息类型
 * @property {number} groupId - 群组ID
 * @property {number} senderId - 旧群主ID
 * @property {string} senderName - 旧群主用户名
 * @property {number} targetUserId - 新群主ID
 * @property {string} content - 通知文本（如 "xxx 成为新群主"）
 * @property {string} sendTime - 转让时间
 */

// 导出空对象以支持 import
export {};
