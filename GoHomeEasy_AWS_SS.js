import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

// 初始化 AWS SDK
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// 环境变量配置 (在 Lambda 配置页设置)
const SECRET_KEY = process.env.SECRET_KEY || "your_secure_api_key";
const TABLE_NAME = process.env.TABLE_NAME || "Subscription";
const PRIMARY_KEY = "latest_subscription"; // 固定 Key，模拟 KV

export const handler = async (event) => {
    // 1. 解析请求基础信息
    const method = event.requestContext?.http?.method || event.httpMethod;
    const headers = normalizeHeaders(event.headers);
    const queryParams = event.queryStringParameters || {};

    // 2. 辅助函数：构造响应
    const createResponse = (statusCode, body, contentType = "application/json") => ({
        statusCode,
        headers: {
            "Content-Type": contentType,
            "Access-Control-Allow-Origin": "*" // 允许跨域，可选
        },
        body: typeof body === "string" ? body : JSON.stringify(body),
    });

    const unauthorizedResponse = createResponse(403, { error: "Unauthorized" });

    try {
        // ✅ 处理 POST 请求（Lucky Webhook 更新 Shadowsocks 订阅）
        if (method === "POST") {
            const authHeader = headers["authorization"];

            // 检查 Authorization 头
            if (!authHeader || authHeader !== `Bearer ${SECRET_KEY}`) {
                return unauthorizedResponse;
            }

            // 解析 JSON Body
            let data;
            try {
                data = event.body ? JSON.parse(event.body) : {};
            } catch (e) {
                return createResponse(400, { error: "Invalid JSON" });
            }

            // 验证字段
            if (!data.ip || !data.port || !data.method || !data.password) {
                return createResponse(400, { error: "Invalid input, missing fields" });
            }

            // 1. 生成 Shadowsocks 节点信息 (用户信息部分需要 Base64)
            const userInfo = `${data.method}:${data.password}@${data.ip}:${data.port}`;
            const base64UserInfo = Buffer.from(userInfo).toString('base64');
            const ssNode = `ss://${base64UserInfo}#GoHomeEasy`;

            // 2. 存储到 DynamoDB (替代 KV)
            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    id: PRIMARY_KEY,
                    data: ssNode // 存储原始 ss:// 链接
                }
            }));

            return createResponse(200, { message: "Node updated successfully" });
        }

        // ✅ 处理 GET 请求（Shadowrocket 获取订阅）
        if (method === "GET") {
            const queryApiKey = queryParams["api_key"];

            // 检查 URL 参数
            if (!queryApiKey || queryApiKey !== SECRET_KEY) {
                return unauthorizedResponse;
            }

            // 从 DynamoDB 获取
            const result = await docClient.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: { id: PRIMARY_KEY }
            }));

            const subscription = result.Item?.data;

            if (!subscription) {
                return createResponse(204, "", "text/plain"); // No content
            }

            // Shadowrocket/Clash 等订阅通常要求对返回的内容再次进行 Base64 编码
            const base64Subscription = Buffer.from(subscription).toString('base64');

            return createResponse(200, base64Subscription, "text/plain");
        }

        return createResponse(405, "Invalid request", "text/plain");

    } catch (error) {
        console.error("Internal Error:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};

// 辅助函数：统一 Header Key 为小写 (AWS Header 大小写不敏感)
function normalizeHeaders(headers) {
    if (!headers) return {};
    const normalized = {};
    for (const key in headers) {
        normalized[key.toLowerCase()] = headers[key];
    }
    return normalized;
}