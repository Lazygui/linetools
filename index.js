const readline = require('readline');
const Alphabet = require('alphabetjs');
const curl = require('./modules/curl');
const sqlite = require('./modules/sqlite');

// 创建 readline 接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// 装饰横幅
const printDecoratedBanner = (text = 'WELCOME', style = 'stereo') => {
    const art = Alphabet(text.toUpperCase(), style);
    const lines = art.split('\n');
    const maxLen = Math.max(...lines.map(l => l.length));
    lines.forEach(line => {
        console.log(line.padEnd(maxLen));
    });
};

// 显示主帮助信息
const showMainHelp = () => {
    console.log('\n🛠️  LineTools CLI - 命令行多功能工具');
    console.log('💡 可用命令:\n');
    console.log('  curl <url> [options]       - 发送 HTTP 请求 (支持 POST/GET)');
    console.log('  sqlite <db_path> [options] - 操作 SQLite 数据库');
    console.log('  help, --h                  - 显示此帮助信息\n');
};

// 显示 curl 子命令帮助
const showCurlHelp = () => {
    console.log('\n🔌 curl 命令使用帮助:');
    console.log('Usage:  curl <URL> -d "{key:value}" -h "Header:Value" [--options]');
    console.log('Options:');
    console.log('  -p, --post    : 使用 POST 请求 (默认)');
    console.log('  -g, --get     : 使用 GET 请求');
    console.log('  -d, --data    : POST 请求的 JSON 数据体 (用引号包裹)');
    console.log('  -h, --header  : 自定义请求头 (可多次使用)');
    console.log('  --h, --help   : 显示此帮助\n');
};

// 显示 sqlite 子命令帮助
const showSqliteHelp = () => {
    console.log('\n🗃️  sqlite 命令使用帮助:');
    console.log('Usage:  sqlite <database_path> [options]');
    console.log('Options:');
    console.log('  -show        : 显示数据库表数据（默认行为，需配合模块逻辑）');
    console.log('  -r, --refresh: 刷新或重新选择表');
    console.log('  -x, --exit   : 关闭当前数据库连接');
    console.log('  --h, --help  : 显示此帮助\n');
};

// 主交互逻辑
const promptNext = () => {
    rl.question('tools > ', async (input) => {
        try {
            const args = input.trim().split(/\s+/).filter(Boolean);
            const cmd = args.shift(); // 获取命令，如 curl, sqlite, help

            if (!cmd) {
                return promptNext(); // 空输入，重新提示
            }

            // 帮助相关
            if (cmd === 'help' || cmd === '--h') {
                showMainHelp();
                return promptNext();
            }

            // 子命令分发
            switch (cmd.toLowerCase()) {
                case 'curl':
                    if (args.includes('--h') || args.includes('help') || args.includes('-h')) {
                        showCurlHelp();
                    } else {
                        await curl(args); // 传递剩余参数
                    }
                    break;

                case 'sqlite':
                    if (args.includes('--h') || args.includes('help') || args.includes('-h')) {
                        showSqliteHelp();
                    } else {
                        await sqlite(args); // 传递剩余参数
                    }
                    break;

                default:
                    console.log(`❌ ❓ 未知命令: "${cmd}". 输入 "help" 查看可用命令。`);
            }

        } catch (err) {
            console.error(`🚨 执行出错: ${err.message || err}`);
        }

        // 继续下一轮输入
        promptNext();
    });
};

// 启动程序
const startApp = () => {
    printDecoratedBanner('LINETOOLS');
    showMainHelp(); // 启动后显示主帮助
    promptNext();   // 开始接收用户输入
};

// 入口
startApp();

// 可选：优雅退出（比如监听 Ctrl+C）
process.on('SIGINT', () => {
    console.log('\n👋 感谢使用 LineTools，再见！');
    rl.close();
    process.exit(0);
});