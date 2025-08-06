# linetools

命令行工具箱

## 项目简介

linetools 是一个功能丰富的命令行工具集合，提供多种实用命令和模块化功能。项目包含以下模块：

- `curl.js`：支持HTTP请求的网络工具模块

## 项目结构

```
linetools/
├── .gitignore
├── index.js        # 入口文件
├── package.json    # 项目依赖配置
├── README.md       # 项目说明文档
└── modules/
    └── curl.js     # 网络请求工具模块
```

## 安装指南

1. 克隆仓库：

```bash
git clone https://github.com/yourusername/linetools.git
```

2. 安装依赖：

```bash
npm install
```

2. 快速开始：

```bash
npm run dev
```

查看可用命令列表：

```
--h / help

Available commands:
  curl             处理HTTP请求
```

## 使用示例

1. 发送GET请求：

```bash
curl -g https://api.example.com/data
```

2. 发送POST请求：

```bash
curl https://api.example.com/submit -d {key:value}
```

## 贡献指南

1. 提交issue前请先搜索现有issue
2. 提交pull request时请附带测试用例
3. 代码风格请遵循Prettier规范

## 许可证

本项目采用MIT许可证
