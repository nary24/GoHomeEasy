import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

// 初始化 DynamoDB 客户端 (AWS SDK v3 内置于 Lambda 运行时)
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// 配置项
const SECRET_KEY = process.env.SECRET_KEY || "your_secure_api_key";
const TABLE_NAME = process.env.TABLE_NAME || "Subscription";
const PRIMARY_KEY = "latest_clash_subscription"; // 用于模拟 KV 的固定 Key

export const handler = async (event) => {
    // 1. 解析请求信息 (处理 API Gateway 的 event 结构)
    const method = event.requestContext?.http?.method || event.httpMethod; // 兼容 HTTP API 和 REST API
    const headers = normalizeHeaders(event.headers);
    const queryParams = event.queryStringParameters || {};

    // 2. 定义通用响应格式
    const createResponse = (statusCode, body, contentType = "application/json") => ({
        statusCode,
        headers: { "Content-Type": contentType },
        body: typeof body === "string" ? body : JSON.stringify(body),
    });

    const unauthorizedResponse = createResponse(403, { error: "Unauthorized" });

    try {
        // ✅ 处理 Webhook（POST 请求，更新 Shadowsocks 订阅）
        if (method === "POST") {
            const authHeader = headers["authorization"];

            if (!authHeader || authHeader !== `Bearer ${SECRET_KEY}`) {
                return unauthorizedResponse;
            }

            // 解析 Body (Lambda 的 body 可能是字符串)
            let data;
            try {
                data = event.body ? JSON.parse(event.body) : {};
            } catch (e) {
                return createResponse(400, { error: "Invalid JSON" });
            }

            if (!data.ip || !data.port || !data.method || !data.password) {
                return createResponse(400, { error: "Invalid input" });
            }

            // 生成 Clash YAML 订阅格式
            const yamlConfig = `proxies:\n  - name: "GoHomeEasy"\n    type: ss\n    server: ${data.ip}\n    port: ${data.port}\n    cipher: ${data.method}\n    password: "${data.password}"\n    udp: true\n`;

            // 存储到 DynamoDB (替代 KV)
            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    id: PRIMARY_KEY,
                    config: yamlConfig
                }
            }));

            return createResponse(200, { message: "Clash config updated successfully" });
        }

        // ✅ 处理 Clash 订阅请求（GET 请求，返回 Clash YAML 配置）
        if (method === "GET") {
            const queryApiKey = queryParams["api_key"];

            if (!queryApiKey || queryApiKey !== SECRET_KEY) {
                return unauthorizedResponse;
            }

            // 从 DynamoDB 获取
            const result = await docClient.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { id: PRIMARY_KEY }
            }));

            if (!result.Item || !result.Item.config) {
                return createResponse(204, "", "text/plain"); // No content
            }

            return createResponse(200, result.Item.config, "text/plain");
        }

        return createResponse(405, "Invalid request", "text/plain");

    } catch (error) {
        console.error("Internal Error:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};

// 辅助函数：将 Header Key 统一转换为小写 (AWS Header 大小写不敏感处理)
function normalizeHeaders(headers) {
    if (!headers) return {};
    const normalized = {};
    for (const key in headers) {
        normalized[key.toLowerCase()] = headers[key];
    }
    return normalized;
}