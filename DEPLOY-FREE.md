# 免费小规模部署：Render + Supabase

状态：代码适配和本地验证已完成；尚未创建云资源、配置真实数据库或提供新的公网链接。适用于分享给少量朋友试用。免费额度与访问速度受平台和网络影响，不能保证所有地区、手机和网络都可访问。

## 资源与费用边界

- Render Web Service 选择 **Free**，提供 HTTPS 的 `onrender.com` 地址，不必购买域名。仓库中的 `render.yaml` 仅声明一个免费 Web Service，不创建付费磁盘或 Render 数据库。
- Supabase 选择 **Free** 组织及免费项目。用 PostgreSQL 保存账号、会话、作品参数和房间回答；音频在浏览器生成，不存储大音频文件。
- 不升级套餐、不启用付费附加项。Render 无支付方式时，超出部分免费额度会暂停服务或构建；已绑定支付方式的账户存在额外带宽或构建费用，部署前需核对账户账单设置。遇到要求付费的步骤，停止开通。
- Render 免费服务闲置 15 分钟休眠，下次访问启动约一分钟；重启会清除本地文件。因此线上禁止退回 SQLite。
- Supabase Free 当前含 500 MB 数据库、5 GB 出站流量，闲置一周可能暂停，需要在控制台恢复。免费套餐不包含自动备份，作品请定期导出 JSON。不要通过外部定时请求绕过休眠规则。

核对依据（2026-11-21）：[Render 免费限制](https://render.com/docs/free)、[Supabase 价格与额度](https://supabase.com/pricing)。额度和政策可能调整，以实际控制台为准。

## 1. 准备代码仓库

把项目放入自己的 GitHub 或 GitLab 仓库供 Render 拉取。包含 `dist/`、`backend/`、`server.mjs`、`package.json`、`package-lock.json` 和 `render.yaml`。不要上传 `.env`、`.data/`、测试账号数据库、`node_modules/` 或日志。旧域名上的浏览器访客收藏不会自动迁移，需先导出作品 JSON，再在新网站导入。

## 2. 免费数据库

在 Supabase 创建 Free 项目，选择与网站接近的区域。数据库密码保存在密码管理器中。打开 **Connect → Session pooler**，复制真实连接信息，通常端口为 5432；不要根据区域猜测主机名，也不要选择付费 IPv4 附加项。

连接字符串只填写到 Render 服务的私密环境变量 `DATABASE_URL`。密码中的特殊字符需要 URL 编码，不要把连接串发到聊天、网页代码或代码仓库。

应用使用独立的 `recall_app` schema 并撤销 PUBLIC 访问权限，不依赖浏览器端 Supabase Data API。不要把它添加到 Data API 的 exposed schemas。应用仍使用自己的账号密码登录，并非 Supabase Auth；无需邮件服务或付费短信。

数据库连接启用 TLS 并验证证书。若平台连接需要自己的根证书，在 Supabase 数据库设置中获取证书，把完整 PEM 文本放到 Render 的 `DATABASE_CA` 环境变量。不要关闭证书验证来跳过连接错误。当前配置需要 Session pooler，不能随意改用 transaction pooler。

参考：[Supabase 连接指南](https://supabase.com/docs/guides/database/connecting-to-postgres)。

## 3. 免费网站

在 Render 从仓库创建 Blueprint，核对唯一服务为 **Free**，填写 `DATABASE_URL`。`render.yaml` 配置如下：Node.js 24.14、`npm ci --omit=dev` 构建、`node server.mjs` 启动、健康检查 `/api/health`。

服务自动使用 Render 分配的 HTTPS 网址验证请求来源、设置安全 Cookie。`REQUIRE_POSTGRES=true` 保证未配置外部数据库时启动失败，不会误把用户数据写入临时磁盘。若自行绑定域名，额外设置 `PUBLIC_URL=https://你的域名`。

部署后观察日志，只检查连接状态与错误代码，避免公开连接字符串。首次启动自动创建应用表；不会导入本机测试账号和作品。

## 4. 上线验收

1. `/api/health` 返回正常，HTTPS 首页可在电脑打开。
2. 手机分别使用 Wi-Fi、移动网络和系统浏览器打开新链接；微信内置浏览器单独测试。若某网络无法访问，仍需换托管地区或服务，不能宣称问题已解决。
3. 两个不同账号在不同设备注册、登录；各自保存的作品互不可见，同一账号重新登录可读取自己的作品。
4. A 创建双人房间并复制邀请链接；B 在另一台设备登录后加入，双方同意共享后分别提交回答。第三个账号不能加入已满房间或修改回答。
5. 听取共同旋律，拆分同一乐器的多个片段，检查间隔静音及 WAV 导出。
6. 重启网站后复查账号、房间和作品仍在；闲置后确认休眠提示和唤醒流程。

本地 `npm test` 覆盖音乐、权限、房间、持久化及数据库适配；适配器单元测试不等于真实 PostgreSQL 联调。完成真实云连接和手机验收后，才可交付新的公开链接。
