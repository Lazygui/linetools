
const http = require('http');
const https = require('https');
const bodyValues = (values, method) => {
    const index = values.findIndex(item => item === '-d')
    let obj = null
    if (index > -1) {
        const value = values[index + 1]
        if (!/^\{.*\}$/.test(value)) {
            throw new Error("Invalid format: String must be enclosed in curly braces {}");
        }

        if (method === 'POST') {
            const jsonStr = value
                .replace(/(\w+)\s*:/g, '"$1":')  // 替换 key: 为 "key":
                .replace(/'([^']+)'/g, '"$1"');  // 替换单引号为双引号(如果有的话)

            // 尝试解析为JSON对象
            obj = JSON.parse(jsonStr);
        } else if (method === 'GET') {

            const content = value.slice(1, -1).trim();
            if (!content) {
                throw new Error("Invalid format: No key-value pairs found inside {}");
            }

            // 3. 检查是否存在至少一个合法的 key: value 对（禁止嵌套）
            if (!/\w+\s*:\s*(?:\S+|\d+)(?!\s*:)/.test(content)) {
                throw new Error("Invalid format: No valid key-value pairs found (expected 'key: value' without nested structures)");
            }

            // 4. 检查是否包含非法嵌套（如 {key: {key2: 2}}）
            if (/{\s*\w+\s*:\s*\{/.test(content)) {
                throw new Error("Invalid format: Nested structures (e.g., 'key: {key2: 2}') are not allowed");
            }

            // 5. 解析键值对
            const result = {};
            content
                .split(/\s*,\s*/)
                .forEach(pair => {
                    let [key, value] = pair.split(/\s*:\s*/);
                    if (!key || !value) {
                        throw new Error(`Invalid key-value pair: "${pair}" (expected 'key: value')`);
                    }
                    // 检查 value 是否是合法值（非 {}）
                    if (value.trim().startsWith("{")) {
                        throw new Error(`Invalid value: Nested structures (e.g., '{key2: 2}') are not allowed in '${pair}'`);
                    }
                    result[key] = value;
                });

            // 转换为 key=value&key2=value2 格式
            const param = Object.entries(result)
                .map(([key, value]) => `${key}=${value}`)
                .join("&");
            obj = `?${param}`
        }
    }
    return obj
}
const headerValues = (arr) => {
    let headers = {};
    let isCollectingHeaders = false;
    let hasHFlag = false;

    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];

        if (item === '-h') {
            hasHFlag = true;
            isCollectingHeaders = true;
            continue; // 跳过 -h 本身
        }

        if (isCollectingHeaders) {
            if (item.startsWith('-')) {
                // 遇到下一个 - 参数，停止收集
                break;
            } else {
                // 解析 Header 格式（如 "Authorization:dsada"）
                const [key, value] = item.split(':');
                if (!key || !value) {
                    throw new Error(`Invalid Header format: "${item}". Expected "Key:Value"`);
                }
                headers[key] = value;
            }
        }
    }

    // 检查 -h 是否存在且后面有内容
    if (hasHFlag) {
        if (Object.keys(headers).length === 0) {
            throw new Error('-h flag must be followed by at least one Header (e.g., "Authorization:dsada")');
        }
    }

    return headers;
}

/**
 * 发送HTTP请求
 * @param {string} url - 请求的URL
 * @param {string} method - 请求方法，'GET'或'POST'
 * @param {Object} headers - 请求头部对象
 * @param {Object|null} body - 请求体数据，POST请求时使用
 * @returns {Promise<Object>} - 返回包含状态码、头部和响应体的Promise对象
 * @throws {Error} - 如果URL格式无效则抛出错误
 */
const sendRequest = (url, method, headers, body) => {
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.hostname === 'localhost') {
            parsedUrl.hostname = '127.0.0.1'; // 强制使用 IPv4
        }


        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        let pathWithQuery = parsedUrl.pathname;
        if (method === 'GET' && Object.keys(body || {}).length > 0) {
            pathWithQuery += `?${new URLSearchParams(body).toString()}`;
        }

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: pathWithQuery || parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: {
                'Content-Type': method === 'POST' ? 'application/json' : 'text/plain',
                ...headers
            },
            rejectUnauthorized: false
        };

        return new Promise((resolve, reject) => {
            const req = protocol.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
            });

            req.on('error', (error) => reject(error));
            if (method === 'POST' && body) {
                const postData = JSON.stringify(body);
                options.headers['Content-Length'] = postData.length;
                req.write(postData);
            }
            req.end();
        });
    } catch (error) {
        throw new Error('Invalid URL format');
    }
}
module.exports = async (args) => {
    const responseobj = {}
    responseobj.url = (() => {
        const url = args.join(' ').match(/https?:\/\/[^\s]+/)[0]
        if (url.endsWith('/')) {
            url = url.slice(0, -1);
        }
        return url
    })();
    responseobj.method = args.includes('-g') ? 'GET' : 'POST'
    if (args.includes('-d')) {
        responseobj.body = bodyValues(args, responseobj.method)
    }
    if (args.includes('-h')) {
        responseobj.header = headerValues(args)
    }


    try {
        const { url, method, header, body } = responseobj
        const headers = { 'Content-Type': 'application/json', ...header || {} }
        const response = await sendRequest(url, method, headers, body);
        console.log('Status:', response.status);
        console.log('Headers:', JSON.stringify(response.headers, null, 2));
        console.log('Body:', response.body);
    } catch (error) {
        console.error('Request failed:', error);
    }
};