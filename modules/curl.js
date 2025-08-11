const { input } = require('@inquirer/prompts');
const http = require('http');
const https = require('https');
const chalk = require('chalk')
//正则匹配以 http:// 或 https:// 开头的元素
const urlRegex = /^https?:\/\//;

/**
 * 显示 curl 命令的帮助信息
 */
const showHelp = () => {
    console.log(`
${chalk.yellow('🔧 curl 命令帮助信息:')}`);
    console.log(`${chalk.yellow('============================')}`);
    console.log(`${chalk.cyan('参数说明:')}`);
    console.log(`  ${chalk.green('-p')}          : 使用 POST 请求（默认）`);
    console.log(`  ${chalk.green('-g')}          : 使用 GET 请求`);
    console.log(`  ${chalk.green('-h <header>')} : 设置请求头（通常为 Object 格式），如：-h {Authorization: Bearer xxx}`);
    console.log(`  ${chalk.green('-d <data>')}   : 设置请求体（通常为 Object 格式），如：-d {page_index:1}`);
    console.log(`  ${chalk.green('return')}      : 可退出 curl 模块`);
    console.log(`  ${chalk.green('help')}        : 可再次查看此帮助`);
    console.log();
    console.log(`${chalk.cyan('示例:')}`);
    console.log(`  ${chalk.green('http://localhost:3000/api/list -d {page_index:1} -h {Authorization:Bearer xxx}')}`);
    console.log(`  ${chalk.green('http://example.com/api -g -h {Token:123456}')}`);
    console.log();
    console.log(`${chalk.cyan('提示:')}`);
    console.log(`  ${chalk.blue('- 请求 URL 必须以 http:// 或 https:// 开头')}`);
    console.log(`${chalk.yellow('============================')}`);
};
const extract = (cmdList) => {

    // 1. 判断请求方法
    let method = 'POST'
    if (cmdList.includes('-g')) {
        method = 'GET'
    }
    // 2. 提取请求地址
    const urls = cmdList.filter(item => urlRegex.test(item))[0];

    // 3. 提取请求参数和请求头
    let body = {}
    let headers = {}
    for (let i = 0; i < cmdList.length; i++) {
        const item = cmdList[i]
        if (item === '-d') {
            const nextItem = cmdList[i + 1]
            if (nextItem && /^\{.*\}$/.test(nextItem)) {
                jsonStr = nextItem
                    .replace(/(\w+)\s*:/g, '"$1":')
                    .replace(/'([^']+)'/g, '"$1"');
                body = JSON.parse(jsonStr);
            }
        }
        if (item === '-h') {
            const nextItem = cmdList[i + 1]
            if (!nextItem) {
                console.log('⚠️  -h 参数格式错误')
                break
            }
            const parts = nextItem.split(':');
            const headerName = parts[0].trim();
            const headerValue = parts.slice(1).join(':').trim();
            headers[headerName] = headerValue
        }
    }
    return { urls, method, headers, body }
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
/**
 * curl 子模块
 * 功能：模拟一个简单的 curl 请求输入工具，接收用户输入的 URL 并“展示”请求信息
 */
const start = (runMainMenu) => {
    showHelp()
    // 使用 inquirer 的 input 提示用户输入 URL
    input({
        message: 'curl 请输入>:',
        validate: (input) => {
            if (!input || input.trim() === '') {
                return '❌ URL 不能为空，请重新输入';
            }
            if (input === 'return' || input === 'help') {
                return true
            }
            // 简单校验是否以 http 或 https 开头
            if (!input.includes('http://') && !input.includes('https://')) {
                return '⚠️  建议使用以 http:// 或 https:// 开头的完整 URL';
            }
            return true;
        },
    }).then(async (url) => {
        if (url === 'return') {
            console.log('👋 退出 curl 子模块，返回主菜单...');
            runMainMenu()
            return; // 👈 重要：直接返回，结束当前 then，控制权回到 index.js
        }
        if (url === 'help') {
            showHelp()
            start()
            return;
        }
        const request = url.split(' ')
        const { urls, method, headers, body } = extract(request)
        const response = await sendRequest(urls, method, headers, body);
        console.log('Status:', response.status);
        console.log('Headers:', JSON.stringify(response.headers, null, 2));
        let formattedBody;
        try {
            const parsedBody = JSON.parse(response.body);
            formattedBody = JSON.stringify(parsedBody, null, 2);
        } catch (e) {
            formattedBody = response.body;
        }
        console.log('Body:', formattedBody);

        start();
    }).catch((err) => {
        // 捕获用户按 Ctrl+C 或其他导致提示框退出的异常
        if (err.name === 'ExitPromptError') {
            console.log('\n👋 感谢使用 LineTools，再见！');
            // 可以什么都不做，或者调用 startApp() 重新显示主菜单
            // startApp(); // 如果希望重新显示菜单，可以递归调用（但有风险，见下文）
        } else {
            // 其它未知错误
            console.error('❌ 发生了一个错误:', err.message);
        }
    });
};

// 必须导出 start 函数，主程序会通过 require('./curl').start() 调用
module.exports = {
    start,
};