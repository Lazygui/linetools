// modules/sqlite.js

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { select, input, confirm, Separator } = require('@inquirer/prompts');

const formatJSON = (obj) => JSON.stringify(obj, null, 2);

const normalizeDraggedPath = (input) => {
    if (!input) return null;
    let pathStr = input.trim();
    pathStr = pathStr.replace(/^['"]+/, '').replace(/['"]+$/, '');
    return pathStr;
};

const isValidSQLiteFile = (filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return false;
    const ext = path.extname(filePath).toLowerCase();
    return ['.sqlite', '.db', '.sqlite3', '.db3'].includes(ext);
};

const getTableNames = (db) => {
    return new Promise((resolve, reject) => {
        db.all(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.name));
            }
        );
    });
};

const getTableData = (db, tableName, offset = 0, limit = 5) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as total FROM "${tableName}";`, (err, countRow) => {
            if (err) return reject(err);
            const total = countRow.total;

            db.all(
                `SELECT * FROM "${tableName}" LIMIT ${limit} OFFSET ${offset};`,
                (err, rows) => {
                    if (err) return reject(err);
                    resolve({ data: rows, total, offset, limit });
                }
            );
        });
    });
};

const formatPageInfo = (data, tableName, currentPage, totalPages) => {
    console.log('\n' + '='.repeat(60));
    console.log(`📄 表名: ${tableName}`);
    console.log(`📊 总条数: ${data.total} | 当前页: ${currentPage} / ${totalPages}`);
    console.log('='.repeat(60));
    console.log(formatJSON(data.data));
    console.log('='.repeat(60) + '\n');
};

module.exports = {
    start: async (runMainMenu) => {
        console.log('\n🔌 SQLite 数据库查看器\n');

        let dbPath = null;
        const db = new sqlite3.Database('', sqlite3.OPEN_READONLY, () => { }); // 占位，后面重赋值

        const closeDbAndExit = () => {
            if (db) {
                db.close((err) => {
                    if (err) console.error('⚠️ 数据库关闭出错:', err.message);
                    else console.log('🔒 数据库已关闭');
                });
            }
            if (typeof runMainMenu === 'function') goBack();
        };

        while (true) {
            // ---- 第一步：选择并验证 SQLite 文件路径 ----
            while (!dbPath) {
                const inputPath = await input({
                    message: '📁 请拖拽 SQLite 文件到本窗口，或输入数据库文件完整路径:',
                    validate: (input) => {
                        if (!input?.trim()) return '❌ 路径不能为空';
                        const normalized = normalizeDraggedPath(input);
                        if (!isValidSQLiteFile(normalized)) {
                            return '❌ 文件不存在或不是支持的 SQLite 文件（如 .db / .sqlite / .sqlite3）';
                        }
                        return true;
                    }
                });

                dbPath = normalizeDraggedPath(inputPath);

                if (!dbPath || !isValidSQLiteFile(dbPath)) {
                    console.log('❌ 无效的 SQLite 文件路径');
                    dbPath = null;
                    continue;
                }
            }

            // ---- 第二步：连接数据库 ----
            let connectedDb;
            try {
                connectedDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
                    if (err) throw err;
                });

                connectedDb.get("SELECT sqlite_version() as version;", (err, row) => {
                    if (err) throw err;
                    else console.log(`🔗 数据库连接成功！SQLite 版本: ${row.version}`);
                });

            } catch (err) {
                console.error('❌ 数据库连接失败:', err.message);
                const retry = await confirm({ message: '是否重新选择数据库文件？' });
                if (!retry) {
                    closeDbAndExit();
                    return;
                } else {
                    dbPath = null;
                    continue;
                }
            }

            // 确保异常时关闭
            const safeClose = () => {
                if (connectedDb) {
                    connectedDb.close((err) => {
                        if (err) console.error('⚠️ 关闭数据库出错:', err.message);
                        else console.log('🔒 数据库已关闭');
                    });
                }
            };

            try {
                // ---- 第三步：获取表名列表 ----
                const tables = await getTableNames(connectedDb);
                if (!tables || tables.length === 0) {
                    console.log('⚠️ 该数据库中没有找到任何表（已排除系统表）');
                    safeClose();
                    dbPath = null;
                    continue;
                }

                let selectedTable = null;

                while (true) {
                    // ---- 第四步：选择表 ----
                    const tableChoices = tables.map(t => ({ name: t, value: t }));
                    selectedTable = await select({
                        message: '请选择要查看的表:',
                        choices: tableChoices
                    });

                    if (!selectedTable) {
                        console.log('❌ 未选择表');
                        continue;
                    }

                    console.log(`\n🎯 已选择表: ${selectedTable}`);

                    // ---- 第五步：分页展示该表数据 ----
                    let offset = 0;
                    const limit = 5;

                    while (true) {
                        try {
                            const result = await getTableData(connectedDb, selectedTable, offset, limit);
                            const { data, total } = result;
                            const currentPage = Math.floor(offset / limit) + 1;
                            const totalPages = Math.ceil(total / limit);

                            formatPageInfo(result, selectedTable, currentPage, totalPages);

                            const actions = [];

                            if (currentPage > 1) {
                                actions.push({ name: '⬅️ 上一页', value: 'prev' });
                            }
                            if (currentPage < totalPages) {
                                actions.push({ name: '➡️ 下一页', value: 'next' });
                            }

                            actions.push(
                                new Separator(),
                                { name: '🔄 重新选择表', value: 'change_table' },
                                { name: '❌ 返回主菜单', value: 'back' }
                            );

                            const action = await select({
                                message: '请选择操作:',
                                choices: actions
                            });

                            if (action === 'prev') {
                                offset -= limit;
                                if (offset < 0) offset = 0;
                            } else if (action === 'next') {
                                offset += limit;
                            } else if (action === 'change_table') {
                                break; // 跳出当前表循环，重新选表
                            } else if (action === 'back') {
                                safeClose();
                                runMainMenu()
                                return; // 返回主模块菜单
                            }

                        } catch (err) {
                            console.error('❌ 读取数据失败:', err.message);
                            const retry = await confirm({ message: '是否重试当前表？' });
                            if (!retry) {
                                break; // 跳出当前表，重新选表
                            }
                        }
                    } // end of 分页展示循环

                } // end of 选择表循环

            } catch (err) {
                console.error('❌ 操作失败:', err.message);
            } finally {
                dbPath = null; // 重置，让用户重新选文件
            }
        } // end of 外层 while(true) —— 可以反复操作
    }
};