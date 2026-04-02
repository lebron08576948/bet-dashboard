const express = require('express');
const axios   = require('axios');
const crypto  = require('crypto');
const path    = require('path');
const FormData = require('form-data');

const app  = express();
const PORT = process.env.PORT || 8088;

const TOTP_SECRET = 'S7KWDITDN2NIGIA4';
const DEVICE_ID   = '251dab8f-5f5f-49fd-a68b-552be2c22084';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// TOTP 生成
function generateTOTP(secret) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, val = 0, out = [];
  for (const c of secret.toUpperCase().replace(/=+$/, '')) {
    val = (val << 5) | chars.indexOf(c);
    bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  const key     = Buffer.from(out);
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buf     = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac   = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[19] & 0xf;
  const code   = ((hmac[offset] & 0x7f) << 24 | hmac[offset+1] << 16 | hmac[offset+2] << 8 | hmac[offset+3]) % 1000000;
  return String(code).padStart(6, '0');
}

// POST /api/login → 帐号密码自动 MD5 + TOTP 登入
app.post('/api/login', async (req, res) => {
  const { baseUrl, username, password } = req.body;
  if (!baseUrl || !username || !password) {
    return res.status(400).json({ error: '缺少 baseUrl / username / password' });
  }

  try {
    const passwordMd5 = crypto.createHash('md5').update(password).digest('hex');
    const googleCode  = generateTOTP(TOTP_SECRET);

    const form = new FormData();
    form.append('username',     username);
    form.append('password',     passwordMd5);
    form.append('google_code',  googleCode);
    form.append('device',       DEVICE_ID);
    form.append('lang',         'zh_CN');
    form.append('timezone',     '+8');
    form.append('custom_host',  baseUrl + '/');

    const response = await axios.post(
      `${baseUrl}/admin/admin_user/login`,
      form,
      { headers: form.getHeaders(), timeout: 15000 }
    );
    res.json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data || { error: 'Login failed' });
    } else {
      res.status(500).json({ error: '无法连接到 API 服务器', detail: error.message });
    }
  }
});

// POST /api/bet → 转发投注记录查询
app.post('/api/bet', async (req, res) => {
  const { baseUrl, token, pageCount, pageSize } = req.body;
  if (!baseUrl || !token) {
    return res.status(400).json({ error: '缺少 baseUrl / token' });
  }

  try {
    const form = new FormData();
    form.append('plat_id',              '30035');
    form.append('token',                token);
    form.append('page_count',           String(pageCount || 1));
    form.append('page_size',            String(pageSize  || 20));
    form.append('device',               DEVICE_ID);
    form.append('lang',                 'zh_CN');
    form.append('timezone',             '+8');
    form.append('custom_host',          baseUrl + '/');
    form.append('login_admin_user_id',  '1551');

    const reserved = ['baseUrl','token','pageCount','pageSize'];
    Object.entries(req.body).forEach(([k, v]) => {
      if (!reserved.includes(k) && v !== undefined && v !== '') {
        form.append(k, String(v));
      }
    });

    const response = await axios.post(
      `${baseUrl}/admin/plat_users_bet/index`,
      form,
      { headers: form.getHeaders(), timeout: 30000 }
    );
    res.json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data || {});
    } else {
      res.status(500).json({ error: '无法连接到 API 服务器', detail: error.message });
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 服务已启动：http://localhost:${PORT}`);
});
