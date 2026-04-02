/**
 * server.js - 投注记录查询后台 代理服务器
 * 解决前端直接请求 API 的 CORS 问题
 * 监听 port 8088
 */

const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 8088;

// 解析 JSON 请求体
app.use(express.json());

// 静态文件服务：提供 public/ 目录下的前端文件
app.use(express.static(path.join(__dirname, 'public')));

/**
 * GET / → 返回 index.html（由 express.static 处理）
 * 所有未匹配路由也回退到 index.html（SPA 支持）
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * POST /api/login → 转发登入请求到真实 API
 * Body: { baseUrl, username, password }
 */
app.post('/api/login', async (req, res) => {
  const { baseUrl, username, password } = req.body;

  if (!baseUrl || !username || !password) {
    return res.status(400).json({ error: '缺少必要参数：baseUrl、username、password' });
  }

  try {
    // 转发到真实 API
    const response = await axios.post(
      `${baseUrl}/admin/login`,
      { username, password },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );
    res.json(response.data);
  } catch (error) {
    // 转发 API 返回的错误状态码
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: '无法连接到 API 服务器', detail: error.message });
    }
  }
});

/**
 * POST /api/bet → 转发投注记录查询请求到真实 API
 * Body: { baseUrl, token, ...queryParams }
 * 带上 Authorization header
 */
app.post('/api/bet', async (req, res) => {
  const { baseUrl, token, ...queryParams } = req.body;

  if (!baseUrl || !token) {
    return res.status(400).json({ error: '缺少必要参数：baseUrl、token' });
  }

  try {
    // 转发到真实 API，携带 token
    const response = await axios.post(
      `${baseUrl}/admin/plat_users_bet/index`,
      queryParams,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000
      }
    );
    res.json(response.data);
  } catch (error) {
    if (error.response) {
      // 401 表示 token 失效，原样返回给前端处理
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: '无法连接到 API 服务器', detail: error.message });
    }
  }
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 投注记录查询后台已启动：http://localhost:${PORT}`);
  console.log(`✅ 内网访问：http://192.168.120.4:${PORT}`);
});
