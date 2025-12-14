# 🚀 GoHomeEasy

## [English](README.md) | 中文

**GoHomeEasy** 是一个基于 Serverless (AWS Lambda / Cloudflare Workers) 的 Shadowsocks/Clash 订阅管理工具，专为 **没有公网 IP 的家庭宽带用户** 设计。

它利用 **Lucky 提供的内网穿透**，结合 Serverless 自动更新订阅，让你可以在 **任何地方（公司、以及手机移动网络）直连访问家庭局域网**，无需手动频繁更换动态 IP 和端口。

-----

## 🌟 **为什么选择 GoHomeEasy？**

✅ **家庭宽带神器**：适合无公网 IP 环境，远程访问 NAS、软路由、PC。

✅ **自动化**：配合 Lucky Webhook，家中 IP 变动后自动更新订阅。

✅ **安全**：支持 API Key 认证，防止恶意扫描。

✅ **无需服务器**：基于 Serverless 架构，免费额度通常足够个人使用。

### 🇨🇳 **中国大陆用户特别推荐**

| 特性 | **AWS Lambda (推荐)** 🏆 | **Cloudflare Workers** |
| :--- | :--- | :--- |
| **国内访问** | **✅ 直连 (速度快/稳)** | ❌ `workers.dev` 被墙 (需自备域名优选IP) |
| **部署难度** | ⭐⭐⭐ (稍繁琐) | ⭐ (极简) |
| **成本** | **免费** (每月100万次请求) | **免费** (每日10万次请求) |

-----

## ⚙️ **部署前置条件**

1.  **家庭服务器/软路由**：安装 OpenWrt 或 Linux。
2.  **Shadowsocks 服务端**：推荐 OpenWrt 的 **PassWall2** 或 **Shadowsocks-Libev**。
3.  **Lucky 内网穿透**：已安装并配置好 STUN 穿透（[Lucky官网](https://lucky666.cn)），能够显示穿透成功。
4.  **云账号**：
      * **AWS 账号** (推荐)：用于部署 Lambda。
      * *或* Cloudflare 账号：用于部署 Workers。
5.  **客户端**：iOS/MacOS Shadowrocket (小火箭) 或其他支持 SS/Clash 订阅的客户端。

-----

## 💻 **第一步：配置家庭 Shadowsocks 服务器**

*以 OpenWrt Passwall2 为例：*

1.  **添加节点**：在“服务器端”点击“添加”。
2.  **配置参数**：
      * **类型**：Shadowsocks (推荐 Sing-Box 核心)。
      * **监听端口**：`8000` (或其他)。
      * **加密方式**：推荐 `chacha20-ietf-poly1305`。
      * **密码**：设置一个强密码。
      * **局域网访问**：**务必勾选** (允许远程访问家庭内网设备)。
3.  **保存并启用**。

-----

## ☁️ **第二步：部署云端订阅服务 (二选一)**

### 🏆 **方案 A：AWS Lambda (国内直连推荐)**

此方案利用 AWS API Gateway + Lambda + DynamoDB，国内网络可直接访问 API，稳定性极佳。

#### **1. 创建 DynamoDB 表 (存储数据)**

1.  登录 [AWS Console](https://console.aws.amazon.com/)，选择一个区域（**推荐新加坡**），搜索并进入 **DynamoDB**。
2.  点击 **Create table（创建表）**。
3.  **Table name（表名）**: 输入 `Subscription`。
4.  **Partition key（分区键）**: 输入 `id` (类型选择 String)。
5.  其他保持默认，点击 **Create table（创建表）**。

#### **2. 创建 Lambda 函数**

1.  搜索并进入 **Lambda** 服务，请确保此时AWS与刚刚设置数据库时位于同一区域（如新加坡）。
2.  点击 **Create function（创建函数）** -\> **Author from scratch**。
3.  **Function name（函数名）**: `GoHomeEasy`。
4.  **Runtime（运行时）**: 选择 `Node.js 24.x`（或更新的版本）。
5.  点击 **Create function（创建函数）**。

#### **3. 编写代码 & 安装依赖**

由于 Lambda 需要 AWS SDK，我们直接使用控制台编辑：

1.  在代码源文件列表，将 `index.mjs` 的内容替换为以下代码：

- 如需Shadowsocks格式的订阅——`GoHomeEasy_AWS_SS.js`
- 如需Clash格式的订阅——`GoHomeEasy_AWS_Clash.js`

2.  点击 **Deploy（部署）** 保存。

#### **4. 配置权限与环境变量**

1.  **环境变量**：
      * 点击 **Configuration（配置）** -\> **Environment variables（环境变量）** -\> **Edit（编辑）**。
      * 添加 `SECRET_KEY`: 设置你的 API 密钥（如 `my_secret_123`）。
      * 添加 `TABLE_NAME`: `Subscription`。
2.  **IAM 权限**：
      * 点击 **Configuration（配置）** -\> **Permissions（权限）** -\> 点击 Role 名称。
      * 在 IAM 控制台，点击 **Add permissions（添加权限）** -\> **Create inline policy（创建内联策略）**。
      * 选择 Service: **DynamoDB**。
      * Actions: 勾选 `PutItem` 和 `GetItem`。
      * Resources: 指定你的表 ARN。
      * 保存策略。

#### **5. 创建 API 网关 (获取 URL)**

1.  回到 Lambda 页面，点击 **Add trigger**。
2.  选择 **API Gateway**。
3.  **Create a new API** -\> **HTTP API**。
4.  Security: **Open** (我们在代码里验证 Key)。
5.  创建后，复制 **API Endpoint**，例如：`https://xyz.execute-api.ap-northeast-1.amazonaws.com/default/GoHomeEasy`。

-----

### **方案 B：Cloudflare Workers (海外用户/已有域名)**

适合中国大陆以外用户，或拥有托管在 Cloudflare 的域名并懂得如何设置路由的中国大陆用户。

1.  登录 **[Cloudflare Dashboard](https://dash.cloudflare.com/)**。
2.  **创建 KV**：在 `Workers & Pages` -\> `KV` 中创建命名空间 `GoHomeEasy_KV`。
3.  **创建 Worker**：
      * 新建 Worker，命名为 `GoHomeEasy`。
      * 将项目中的 `GoHomeEasy_SS.js` 代码复制进去。
      * 修改代码中的 `SECRET_KEY`。
4.  **绑定 KV**：
      * 在 Worker 设置 -\> **绑定** 中，添加 KV 命名空间。
      * 变量名: `KV_NAMESPACE`，对应的 KV: `GoHomeEasy_KV`。
5.  **部署**。

-----

## 🔗 **第三步：配置 Lucky Webhook**

在 Lucky 后台的 STUN 穿透规则中，开启 **Webhook** 功能。

### **1. Webhook URL (POST)**

根据你的部署方案填写 URL：

  * 🏆 **AWS Lambda 用户**:
    ```text
    https://你的API-ID.execute-api.区域.amazonaws.com/default/GoHomeEasy
    ```
  * ☁️ **Cloudflare 用户**:
    ```text
    https://你的worker名.你的子域.workers.dev/
    ```

### **2. Request Headers (请求头)**

```text
Content-Type: application/json
Authorization: Bearer 你的SECRET_KEY
```

### **3. Request Body (请求体)**

Lucky 会自动替换 `#{ip}` 和 `#{port}` 变量。

```json
{
  "ip": "#{ip}",
  "port": "#{port}",
  "method": "chacha20-ietf-poly1305",
  "password": "你的Shadowsocks密码"
}
```

> **注意**：`method` 和 `password` 必须与你在 Passwall 中设置的一致。

-----

## 📥 **第四步：客户端订阅 (Shadowrocket)**

以 iOS 小火箭为例，添加订阅链接，实现自动同步家中 IP。

### **1. 添加订阅**

点击右上角 `+`，类型选择 **Subscribe (订阅)**，URL 填入：

  * 🏆 **AWS Lambda 用户**:
    ```text
    https://你的API-ID...amazonaws.com/default/GoHomeEasy?api_key=你的SECRET_KEY
    ```
  * ☁️ **Cloudflare 用户**:
    ```text
    https://你的worker...workers.dev/?api_key=你的SECRET_KEY
    ```

### **2. 设置分流规则 (关键)**

为了只在访问家庭内网时使用此节点，避免影响日常上网：

1.  进入 **配置** -\> **规则**。
2.  添加一条新规则（放在最顶部）：
      * **类型**: `IP-CIDR`
      * **值**: `192.168.1.0/24` (请根据你家路由器的实际网段修改，如 192.168.31.0/24)
      * **策略**: 选择 `GoHomeEasy` (刚刚添加的订阅节点组)
3.  **保存**。

### **3. 解决同网段冲突 (可选)**

如果你在外部的网络也是 `192.168.1.x`，可能会无法连接回家。建议：

  * **方法一 (推荐)**：修改家中路由器的网段为不常用的，如 `192.168.50.x`。
  * **方法二**：在 Shadowrocket 设置 -\> **按需连接** -\> 开启 **包括本地网络**。

-----

## 🛡 **常见问题**

**Q: AWS 会产生费用吗？**
A: AWS Lambda 每月有 40万GB-秒的计算额度和 100万次请求免费额度；DynamoDB 也有 25GB 的免费存储。对于个人自用（仅更新和获取订阅），基本**永久免费**。

**Q: 为什么 Lucky 显示 Webhook 成功，但订阅没更新？**
A: 请检查 Lambda/Worker 的日志。常见原因是 `SECRET_KEY` 不匹配，或者 AWS IAM 权限没配置好（导致无法写入 DynamoDB）。

**Q: 在外面无法连接回家？**
A: 请确保家里的 Lucky STUN 穿透类型是 TCP，并且获取到了正确的公网 IP。如果外部司网络屏蔽了非标准端口（如 STUN 的高位端口），可能需要尝试 Lucky 的端口映射功能或更换端口。