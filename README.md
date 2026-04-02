# 投注记录查询系统

简洁的后台工具，用于查询投注记录，支持栏位勾选、筛选条件、分页与导出 Excel。

## 技术栈

- **后端**：Node.js + Express（代理 API，解决 CORS）
- **前端**：纯 HTML / CSS / JS（无框架）
- **Excel 导出**：SheetJS CDN

## 文件结构

```
bet-dashboard/
  server.js          # Express 代理服务器
  public/
    index.html       # 主页面（含登入页 + 主页）
    style.css        # 样式（深色系）
    app.js           # 前端逻辑
  package.json
  README.md
```

## 快速启动

```bash
cd bet-dashboard

# 安装依赖
npm install

# 启动服务器（port 8088）
node server.js
```

打开浏览器访问：http://localhost:8088

## 使用说明

### 登入
1. 输入 API Base URL（例：`https://api.example.com`）
2. 输入账号、密码
3. 点击「登入」

### 查询投注记录
1. 左侧面板勾选要显示的栏位
2. 设定筛选条件（开始/结束时间、用户名、厂商、每页笔数）
3. 点击「查询」
4. 使用分页按钮翻页

### 导出 Excel
- 查询成功后点击「导出 Excel」
- 仅导出当前已勾选的栏位

## API 接口

| 接口 | 说明 |
|------|------|
| `POST /api/login` | 代理登入，转发到 `{baseUrl}/admin/login` |
| `POST /api/bet` | 代理查询，转发到 `{baseUrl}/admin/plat_users_bet/index` |

## localStorage

| Key | 说明 |
|-----|------|
| `bet_token` | 登入取得的 token |
| `bet_api_url` | API Base URL |

## 注意

- Token 失效（401）会自动跳回登入页
- 后端代理解决跨域问题，前端只与 localhost:8088 通信
