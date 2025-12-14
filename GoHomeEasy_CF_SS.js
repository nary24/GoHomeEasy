export default {
  async fetch(request, env) {
    return await handleRequest(request, env);
  }
};

// ⚠️ 你可以在 Cloudflare Workers 的 `Variables` 里配置 SECRET_KEY
const SECRET_KEY = "your_secure_api_key"; // 你的 API Key

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const authHeader = request.headers.get("Authorization");
  const queryApiKey = url.searchParams.get("api_key");

  // 认证失败时的错误响应
  const unauthorizedResponse = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });

  // ✅ 处理 POST 请求（Lucky Webhook 更新 Shadowsocks 订阅）
  if (request.method === "POST") {
    // 检查 `Authorization` 头是否正确
    if (!authHeader || authHeader !== `Bearer ${SECRET_KEY}`) {
      return unauthorizedResponse;
    }

    // 解析 Webhook 发送的 Shadowsocks 数据
    const data = await request.json();
    if (!data.ip || !data.port || !data.method || !data.password) {
      return new Response(JSON.stringify({ error: "Invalid input, missing fields" }), { status: 400 });
    }

    // 生成 Shadowsocks 订阅格式
    const ssNode = `ss://${btoa(`${data.method}:${data.password}@${data.ip}:${data.port}`)}#GoHomeEasy`;

    // 存储到 Cloudflare KV
    await env.KV_NAMESPACE.put("latest_subscription", ssNode);

    return new Response(JSON.stringify({ message: "Node updated successfully" }), { status: 200 });
  }

  // ✅ 处理 GET 请求（Shadowrocket 获取订阅）
  if (request.method === "GET") {
    // 检查 URL 参数 `api_key` 是否正确
    if (!queryApiKey || queryApiKey !== SECRET_KEY) {
      return unauthorizedResponse;
    }

    // 获取最新 Shadowsocks 订阅信息
    const subscription = await env.KV_NAMESPACE.get("latest_subscription");

    if (!subscription) {
      return new Response("", { status: 204 }); // No content
    }

    return new Response(btoa(subscription), {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("Invalid request", { status: 405 });
}
