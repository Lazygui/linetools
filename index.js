// index.js

const { select, Separator } = require('@inquirer/prompts');
const fs = require('fs');
const path = require('path');

// 装饰横幅
const printDecoratedBanner = (text = 'WELCOME', style = 'stereo') => {
    const Alphabet = require('alphabetjs');
    const art = Alphabet(text.toUpperCase(), style);
    const lines = art.split('\n');
    const maxLen = Math.max(...lines.map(l => l.length));
    lines.forEach(line => {
        console.log(line.padEnd(maxLen));
    });
};

/**
 * 动态加载 modules 目录下的所有子模块
 * 只加载 .js 文件，排除 index.js
 */
const loadModules = () => {
    const modulesDir = path.join(__dirname, 'modules');
    let files;

    try {
        files = fs.readdirSync(modulesDir);
    } catch (err) {
        console.error(`🚨 无法读取模块目录 "${modulesDir}": ${err.message}`);
        return [];
    }

    const moduleChoices = [];

    files.forEach((file) => {
        if (file.endsWith('.js') && file !== 'index.js') {
            const moduleName = path.basename(file, '.js'); // 去掉 .js 后缀
            moduleChoices.push({
                name: moduleName,
                value: moduleName,
                description: `操作 ${moduleName} 相关功能`
            });
        }
    });

    return moduleChoices;
};

/**
 * 主应用入口：循环显示主菜单，支持选择子模块或退出
 */
const startApp = () => {
    /**
     * 内部递归函数：负责每次渲染主菜单并处理用户选择
     */
    const runMainMenu = () => {
        printDecoratedBanner('LINETOOLS');

        const moduleChoices = loadModules();

        const choices = [
            ...moduleChoices.map(mod => ({
                name: `${mod.name}`,
                value: mod.value,
                description: `操作 ${mod.name} 相关功能`
            })),
            new Separator(),
            {
                name: '退出程序',
                value: 'exit',
                description: '退出 LineTools CLI'
            }
        ];

        select({
            message: '请选择要使用的子模块:',
            choices: choices
        }).then((answer) => {
            if (answer === 'exit') {
                console.log('\n👋 感谢使用 LineTools，再见！');
                process.exit(0); // 真正退出程序
            }

            // 动态加载用户选择的子模块
            try {
                const modulePath = path.join(__dirname, 'modules', `${answer}.js`);
                const module = require(modulePath);

                if (typeof module.start === 'function') {
                    console.log(`\n🚀 正在启动 "${answer}" 模块...\n`);
                    module.start(runMainMenu); // 调用子模块的 start() 方法
                } else {
                    console.error(`❌ 模块 "${answer}" 没有提供 start() 方法`);
                }
            } catch (err) {
                console.error(`🚨 加载模块 "${answer}" 失败: ${err.message}`);
            }
        }).catch((err) => {
            if (err.name === 'ExitPromptError') {
                console.log('\n👋 感谢使用 LineTools，再见！');
                process.exit(0);
            } else {
                console.error('❌ 发生了一个错误:', err.message);
                // 出错后仍然回到主菜单
                runMainMenu();
            }
        });
    };

    // 启动主菜单循环
    runMainMenu();
};

// 全局处理 Ctrl+C 退出信号
process.on('SIGINT', () => {
    console.log('\n\n👋 感谢使用 LineTools，再见！');
    process.exit(0);
});

// 启动应用
startApp();

// 可选：打印终端宽度（调试用）
// console.log(`当前终端窗口一行可以显示 ${process.stdout.columns} 个字符`);