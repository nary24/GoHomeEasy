# 🚀 GoHomeEasy

## English | [中文](README_CN.md)

**GoHomeEasy** is a Serverless-based (Cloudflare Workers / AWS Lambda) Shadowsocks/Clash subscription management tool, designed for **home broadband users without a public IP**.

It leverages **Lucky's NAT traversal** capabilities combined with Serverless automated subscription updates, allowing you to **directly access your home LAN from anywhere (office, mobile network)** without manually updating dynamic IPs and ports.

---

## 🌟 **Why GoHomeEasy?**

✅ **Home Broadband Savior**: Access NAS, soft routers, and PCs remotely without a public IP.

✅ **Automated**: Automatically updates subscriptions via Lucky Webhook when your home IP changes.

✅ **Secure**: Supports API Key authentication to prevent unauthorized scanning.

✅ **Serverless**: No server required. Cloudflare Workers offers a generous free tier that is usually sufficient for personal use.

### Platform Comparison

| Feature | **Cloudflare Workers (Recommended)** 🏆 | **AWS Lambda** |
| :--- | :--- | :--- |
| **Ease of Use** | ⭐⭐⭐⭐⭐ (Very Simple) | ⭐⭐⭐ (Slightly Complex) |
| **Cost** | **Free** (100k requests/day) | **Free** (1M requests/month) |
| **Network** | 🌍 Global access except Chinese Mainland | 🇨🇳 Not blocked by Mainland China |

---

## ⚙️ **Prerequisites**

1.  **Home Server/Router**: Running OpenWrt or Linux.
2.  **Shadowsocks Server**: Recommended **PassWall2** or **Shadowsocks-Libev** on OpenWrt.
3.  **Lucky NAT Traversal**: Installed and configured for STUN traversal ([Lucky Official Site](https://lucky666.cn)), ensuring successful traversal visibility.
4.  **Cloud Account**:
      * **Cloudflare Account** (Recommended): For deploying Workers.
      * *Or* AWS Account: For deploying Lambda.
5.  **Client**: iOS/MacOS Shadowrocket or other clients supporting SS/Clash subscriptions.

---

## 💻 **Step 1: Configure Home Shadowsocks Server**

*Example using OpenWrt Passwall2:*

1.  **Add Node**: Click "Add" in the "Server" tab.
2.  **Configure Parameters**:
      * **Type**: Shadowsocks (Sing-Box core recommended).
      * **Listening Port**: `8000` (or others).
      * **Encryption**: `chacha20-ietf-poly1305` recommended.
      * **Password**: Set a strong password.
      * **LAN Access**: **Must Check** (allows remote access to home LAN devices).
3.  **Save and Apply**.

---

## ☁️ **Step 2: Deploy Cloud Subscription Service**

### 🏆 **Plan A: Cloudflare Workers (Recommended)**

This is the easiest method. No servers to manage, and it's free.

#### **1. Create KV Namespace**

1.  Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2.  Go to `Workers & Pages` -> `KV`.
3.  Create a namespace named `GoHomeEasy_KV`.

#### **2. Create Worker**

1.  Go to `Workers & Pages` -> `Overview` -> `Create application` -> `Create Worker`.
2.  Name it `GoHomeEasy`.
3.  Click `Deploy`.

#### **3. Edit Code**

1.  Click `Edit code`.
2.  Copy the content of `GoHomeEasy_CF_SS.js` (for Shadowsocks) or `GoHomeEasy_CF_Clash.js` (for Clash) from this repository.
    *   *Note: Choose the file based on the subscription format you need.*
3.  Replace the code in the editor.
4.  Modify `const SECRET_KEY = "your_secret_key";` with your own secure key.

#### **4. Bind KV Namespace**

1.  Go back to the Worker's `Settings` -> `Variables` (or `Bindings`).
2.  Under `KV Namespace Bindings`, click `Add binding`.
3.  **Variable name**: `KV_NAMESPACE`.
4.  **KV Namespace**: Select `GoHomeEasy_KV`.
5.  **Deploy**.

---

### **Plan B: AWS Lambda (For Mainland China)**

If you prefer AWS or need a specific region.

#### **1. Create DynamoDB Table**

1.  Log in to [AWS Console](https://console.aws.amazon.com/), select a region (e.g., Singapore).
2.  Go to **DynamoDB** -> **Create table**.
3.  **Table name**: `Subscription`.
4.  **Partition key**: `id` (String).
5.  **Create table**.

#### **2. Create Lambda Function**

1.  Go to **Lambda** -> **Create function**.
2.  **Function name**: `GoHomeEasy`.
3.  **Runtime**: `Node.js 24.x` (or newer).
4.  **Create function**.

#### **3. Write Code**

1.  Replace `index.mjs` content with contents in `GoHomeEasy_AWS_SS.js` or `GoHomeEasy_AWS_Clash.js`.
2.  **Deploy**.

#### **4. Permission & Environment Variables**

1.  **Environment Variables**:
      * `SECRET_KEY`: Your API key.
      * `TABLE_NAME`: `Subscription`.
2.  **Permissions**:
      * Add `DynamoDB` permissions (`PutItem`, `GetItem`) to the Lambda's execution role.

#### **5. Create API Gateway**

1.  **Add trigger** -> **API Gateway**.
2.  **Create a new API** -> **HTTP API** -> **Security: Open**.
3.  Get the **API Endpoint**.

---

## 🔗 **Step 3: Configure Lucky Webhook**

Enable **Webhook** in Lucky STUN rules.

### **1. Webhook URL (POST)**

*   🏆 **Cloudflare Users**:
    ```text
    https://your-worker-name.your-subdomain.workers.dev/
    ```
*   ☁️ **AWS Users**:
    ```text
    https://your-api-id.execute-api.region.amazonaws.com/default/GoHomeEasy
    ```

### **2. Request Headers**

```text
Content-Type: application/json
Authorization: Bearer YOUR_SECRET_KEY
```

### **3. Request Body**

Lucky automatically replaces `#{ip}` and `#{port}`.

```json
{
  "ip": "#{ip}",
  "port": "#{port}",
  "method": "chacha20-ietf-poly1305",
  "password": "YOUR_SHADOWSOCKS_PASSWORD"
}
```

> **Note**: `method` and `password` must match your server settings.

---

## 📥 **Step 4: Client Subscription (Shadowrocket)**

### **1. Add Subscription**

*   🏆 **Cloudflare Users**:
    ```text
    https://your-worker...workers.dev/?api_key=YOUR_SECRET_KEY
    ```
*   ☁️ **AWS Users**:
    ```text
    https://your-api...amazonaws.com/default/GoHomeEasy?api_key=YOUR_SECRET_KEY
    ```

### **2. Routing Rules (Crucial)**

To ensure only home traffic goes through this proxy:

1.  **Config** -> **Rules** -> **Add Rule**.
2.  **Type**: `IP-CIDR`.
3.  **Value**: `192.168.1.0/24` (Match your home subnet).
4.  **Policy**: Select `GoHomeEasy` (the subscription group).
5.  **Save**.

### **3. Subnet Conflict (Optional)**

If your current network is also `192.168.1.x`:
*   **Recommended**: Change your home router subnet to something distinct like `192.168.50.x`.
*   **Alternative**: In Shadowrocket Settings -> **On Demand**, enable **Route Includes Local Network**.

---

## 🛡 **FAQ**

**Q: Is Cloudflare Workers free?**
A: Yes, the free tier allows 100,000 requests per day, which is more than enough for personal use.

**Q: Why isn't the subscription updating?**
A: Check the logs (Cloudflare Worker logs or AWS CloudWatch). Common issues include mismatched `SECRET_KEY` or incorrect permissions (DynamoDB/KV).

**Q: Cannot connect at home?**
A: Ensure Lucky STUN is working (TCP) and getting a public IP. Some corporate networks block non-standard ports; try using Lucky's port mapping to standard ports if possible.
