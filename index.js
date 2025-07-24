const readline = require('readline');
const Alphabet = require('alphabetjs');
const curl = require('./modules/curl')
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
/**
 * 显示帮助信息，说明curl命令的使用方法和参数选项
 */
const showHelp = () => {
    console.log(" ");
    console.log('  curl: API Request Tool( curl --h or curl help )');
    console.log(" ");
}
const showHelpCurl = () => {
    console.log(" ");
    console.log("Usage: curl  http://example.com -d {page_index:1,page_size:10} -h Content-Type:application/json");
    console.log('  -p: POST request (default: POST)');
    console.log('  -g: GET request');
    console.log('  -d: Object body for POST requests');
    console.log('  -h: Custom headers (can be used multiple times)');
    console.log('  --h: Show this help');
    console.log(" ");
}
/**
 * 打印装饰性横幅文字
 * @param {string} customText - 要显示的自定义文本，默认为'WELCOME'
 * @param {string} style - 字体样式，默认为'stereo'
 */
const printDecoratedBanner = (customText = 'WELCOME', style = 'stereo') => {
    const alphabetArt = Alphabet(customText.toUpperCase(), style);
    const lines = alphabetArt.split('\n');
    const maxWidth = lines.reduce((max, line) => Math.max(max, line.length), 0);
    lines.forEach(line => {
        const paddedLine = line.padEnd(maxWidth);
        console.log(`${paddedLine}`);
    });
}

printDecoratedBanner();
const main = async () => {


    rl.question('tools > ', async (input) => {
        const args = input.split(' ').filter(part => part !== '');
        const shift = args.shift()
        if (shift) {
            if (shift === '--h' || shift === 'help') {
                showHelp()
                return main();
            }
            if (args.length === 0) {
                console.log('Invalid command. Type "--h / help" for help.');
                return main();
            }
        }
        try {
            switch (shift) {
                case '--h':
                case 'help':
                    showHelp();
                    break;
                case 'curl':
                    if (args.includes('--h') || args.includes('help')) {
                        showHelpCurl();
                        break;
                    }
                    await curl(args)
                    break;

                default:
                    console.log('Invalid command. Type "--h / help" for help.');
                    break;
            }
        } catch (error) {
            console.log("🚀 ~ main ~ error:", error)
        }
        return main();
    });
}

main();