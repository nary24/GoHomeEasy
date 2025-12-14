export default {
  async fetch(request, env) {
    return await handleRequest(request, env);
  }
};

const SECRET_KEY = "your_secure_api_key"; // 你的 API Key

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const authHeader = request.headers.get("Authorization");
  const queryApiKey = url.searchParams.get("api_key");

  const unauthorizedResponse = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });

  // ✅ 处理 Webhook（POST 请求，更新 Shadowsocks 订阅）
  if (request.method === "POST") {
    if (!authHeader || authHeader !== `Bearer ${SECRET_KEY}`) {
      return unauthorizedResponse;
    }

    const data = await request.json();
    if (!data.ip || !data.port || !data.method || !data.password) {
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400 });
    }

    // 生成 Clash YAML 订阅格式
    const yamlConfig = `proxies:\n  - name: "GoHomeEasy"\n    type: ss\n    server: ${data.ip}\n    port: ${data.port}\n    cipher: ${data.method}\n    password: "${data.password}"\n    udp: true\n`;

    // 存储到 Cloudflare KV
    await env.KV_NAMESPACE.put("latest_clash_subscription", yamlConfig);

    return new Response(JSON.stringify({ message: "Clash config updated successfully" }), { status: 200 });
  }

  // ✅ 处理 Clash 订阅请求（GET 请求，返回 Clash YAML 配置）
  if (request.method === "GET") {
    if (!queryApiKey || queryApiKey !== SECRET_KEY) {
      return unauthorizedResponse;
    }

    const subscription = await env.KV_NAMESPACE.get("latest_clash_subscription");

    if (!subscription) {
      return new Response("", { status: 204 }); // No content
    }

    return new Response(subscription, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("Invalid request", { status: 405 });
}
