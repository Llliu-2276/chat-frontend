### 用户信息查询接口
- 接口路径： GET /api/user/info/{userId} 
- 功能描述： 根据用户ID获取指定用户详细信息 请求参数： 
- 路径参数 userId（Long类型） 
- 返回结果： BaseResponse<UserInfoVO>，包含用户基本信息 
- 认证要求： 需要JWT认证，但无需特殊权限（所有认证用户可访问） 
- 实现建议： 在UserInfoRepository中添加findById方法，在UserService中添加getUserById方法
- /-------------------------------------/
- 接口路径： GET /api/user/me 
- 功能描述： 获取当前登录用户的详细信息 
- 请求参数： 无（从JWT中提取用户ID） 
- 返回结果： BaseResponse<UserInfoVO>，包含当前用户完整信息 
- 认证要求： 必须JWT认证（所有登录用户可访问） 
- 实现建议： 在UserController中添加getCurrentUser方法，从request属性中获取userId


### 用户信息修改接口
- 接口路径： PUT /api/user/info 
- 功能描述： 更新当前用户的个人信息（用户名、头像等） 
- 请求参数： @RequestBody UserUpdateDTO，包含userName、avatarUrl等字段 
- 返回结果： BaseResponse<UserInfoVO>，更新后的用户信息 
- 认证要求： 必须JWT认证，只能修改自己的信息 
- 实现建议： 在UserService中添加updateUserInfo方法，使用@Transactional确保数据一致性
- /-------------------------------------/
- 接口路径： POST /api/user/password/change 
- 功能描述： 修改用户密码 
- 请求参数： @RequestBody PasswordChangeDTO，包含oldPassword、newPassword 
- 返回结果： BaseResponse<Void>，成功或失败消息
- 认证要求： 必须JWT认证，需要验证旧密码 
- 实现建议： 在UserService中添加changePassword方法，使用BCryptPasswordEncoder验证旧密码


### 用户状态管理接口
- 接口路径： PATCH /api/user/status/{userId}/enable 和 PATCH /api/user/status/{userId}/disable 
- 功能描述： 管理员启用/禁用用户账户 
- 请求参数： 路径参数 userId，需要管理员权限 
- 返回结果： BaseResponse<Void>，操作结果 
- 认证要求： 必须JWT认证 + 管理员权限（ROLE_ADMIN） 
- 实现建议： 在UserInfo实体中添加isAvailable字段，在UserService中添加enableUser/disableUser方法
- /-------------------------------------/
- 接口路径： POST /api/user/status/force-offline 
- 功能描述： 强制将用户标记为离线（用于异常情况处理） 
- 请求参数： @RequestBody ForceOfflineDTO，包含userId 
- 返回结果： BaseResponse<Void> 
- 认证要求： 必须JWT认证 + 管理员权限 
- 实现建议： 在UserHeartbeatService中添加forceOffline方法，清除Redis心跳并更新数据库状态


### 用户搜索接口
- 接口路径： GET /api/user/search 
- 功能描述： 根据用户名、账号等条件搜索用户 
- 请求参数： 查询参数 keyword（String），page（int），size（int） 
- 返回结果： BaseResponse<Page<UserInfoVO>>，分页用户列表 
- 认证要求： 必须JWT认证（所有登录用户可搜索） 
- 实现建议： 使用UserInfoRepository的findByUserNameContaining方法，添加分页支持
- /-------------------------------------/
- 接口路径： GET /api/user/list 
- 功能描述： 获取用户列表（支持分页和过滤） 
- 请求参数： page、size、status（online/available/all）、sort（byName/byDate） 
- 返回结果： BaseResponse<Page<UserInfoVO>> 
- 认证要求： 必须JWT认证，普通用户只能查看在线用户，管理员可查看所有用户 
- 实现建议： 在UserInfoRepository中添加自定义查询方法，在UserService中添加getUserList方法


### 用户权限管理接口（基础版本）
- 接口路径： GET /api/user/roles 
- 功能描述： 获取当前用户的角色和权限信息 请求参数： 无 
- 返回结果： BaseResponse<UserRolesVO>，包含角色列表和权限标识 
- 认证要求： 必须JWT认证 
- 实现建议： 扩展Spring Security的UserDetails实现，添加角色信息到JWT中


### 用户安全相关接口
- 接口路径： POST /api/user/email/bind 
- 功能描述： 绑定邮箱地址（需要邮箱验证码） 
- 请求参数： @RequestBody EmailBindDTO，包含email、verificationCode 
- 返回结果： BaseResponse<Void> 
- 认证要求： 必须JWT认证 
- 实现建议： 添加邮件服务集成，生成和验证邮箱验证码
- /-------------------------------------/
- 接口路径： POST /api/user/phone/bind 
- 功能描述： 绑定手机号码（需要短信验证码） 
- 请求参数： @RequestBody PhoneBindDTO，包含phone、verificationCode 
- 返回结果： BaseResponse<Void> 
- 认证要求： 必须JWT认证 
- 实现建议： 添加短信服务集成，生成和验证短信验证码


### 与好友模块和群组模块的关联接口
- 接口路径： GET /api/user/friends/{userId} 
- 功能描述： 获取指定用户的全部好友列表 
- 请求参数： 路径参数 userId 
- 返回结果： BaseResponse<List<FriendVO>> 
- 认证要求： 必须JWT认证，用户只能查看自己的好友（或公开的好友列表） 
- 实现建议： 在FriendService中添加getFriendsByUserId方法，关联UserInfo和FriendRelation
- /-------------------------------------/
- 接口路径： GET /api/user/groups/{userId} 
- 功能描述： 获取指定用户所在的全部群组列表 
- 请求参数： 路径参数 userId 
- 返回结果： BaseResponse<List<GroupVO>> 
- 认证要求： 必须JWT认证 
- 实现建议： 在GroupService中添加getGroupsByUserId方法，通过GroupUserRelation关联
- /-------------------------------------/
- 接口路径： GET /api/user/profile/{userId} 
- 功能描述： 获取用户完整档案（包含基本信息、好友数、群组数、最近活动等） 
- 请求参数： 路径参数 userId 
- 返回结果： BaseResponse<UserProfileVO> 
- 认证要求： 必须JWT认证，隐私设置控制可见性 
- 实现建议： 整合UserInfo、FriendRelation、GroupUserRelation等多表查询



#### 实现优先级建议
##### 高优先级（立即实现）：
- GET /api/user/me - 获取当前用户信息
- PUT /api/user/info - 更新用户信息
- GET /api/user/search - 用户搜索
- GET /api/user/friends/{userId} - 好友列表
##### 中优先级（后续迭代）：
- POST /api/user/password/change - 修改密码
- GET /api/user/list - 用户列表分页
- GET /api/user/profile/{userId} - 用户档案
##### 低优先级（长期规划）：
- 邮箱/手机绑定
- 管理员权限管理
- 多因素认证