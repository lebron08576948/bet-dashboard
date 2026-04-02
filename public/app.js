/**
 * app.js - 投注记录查询系统
 * 统一勾选：勾选 = 显示筛选输入框 + 显示结果栏位
 */

// 厂商ID对照表
const VENDOR_ID_MAP = {
  155: 'DB Lottery', 158: 'VIVO Gaming', 159: 'Evolution_A', 199: 'FC',
  208: 'Spribe_A', 210: 'OneTouch', 225: 'Evolution_R', 243: 'JILI-INR',
  267: 'Funtide', 268: 'Evoplay_A', 283: 'Easybet-96com', 284: 'Turbo Games',
  287: 'Nolimit City_A', 288: 'Nolimit City_R', 289: 'Top Spin', 294: 'Exchange-96',
  295: 'BigTimeGaming_A', 296: 'BigTimeGaming_R', 298: 'Netent_A', 299: 'Netent_R',
  301: 'Red Tiger_A', 302: 'Red Tiger_R', 303: 'Hacksaw', 308: 'SmartSoft Gaming',
  314: 'SA Gaming', 316: "Play'n Go", 336: 'KY GAMING', 344: 'Bgaming',
  356: 'Amusnet', 357: '7777 Gaming', 358: 'Winfinity', 359: 'Aviatrix',
  369: 'DELFINO_PG Soft', 401: '96-Tequity', 403: 'KingMidas', 404: 'Galaxsys',
  405: 'Shady Lady', 406: 'Playtech', 418: 'BGaming_R', 421: 'DELFINO_PragmaticPlay',
  423: 'Slotmill', 425: 'DELFINO_FatPanda',
};

// 游戏类型对照表
const VENDOR_TYPE_MAP = {
  2: '棋牌', 4: '彩票', 8: '捕鱼', 16: '电子',
  32: '真人', 64: '体育电竞', 128: '链游',
};

// =============================================
// 统一字段定义（筛选 + 栏位合并）
// =============================================
const ALL_ITEMS = [
  // 时间
  { key: 'bet_time',         label: '投注时间',   group: '📅 时间',  colKey: 'bet_at',            filterType: 'timerange', paramStart: 'bet_at-{>=}', paramEnd: 'bet_at-{<=}',    defaultOn: true },
  { key: 'settle_time',      label: '结算时间',   group: '📅 时间',  colKey: 'settlement_at',     filterType: 'timerange', paramStart: 'settlement_at-{>=}', paramEnd: 'settlement_at-{<=}', defaultOn: false },
  // 用户
  { key: 'user_id',          label: '用户ID',     group: '👤 用户',  colKey: 'user_id',           filterType: 'text', param: 'user_id',             defaultOn: true },
  { key: 'nickname',         label: '用户昵称',   group: '👤 用户',  colKey: 'nick_name',         filterType: 'text', param: 'nick_name',           defaultOn: false },
  // 游戏
  { key: 'vendor_id',        label: '游戏厂商',   group: '🎮 游戏',  colKey: 'vendor_id',         filterType: 'select', param: 'vendor_id', options: VENDOR_ID_MAP, defaultOn: true },
  { key: 'vendor_type',      label: '游戏类型',   group: '🎮 游戏',  colKey: 'vendor_type',       filterType: 'select', param: 'vendor_type', options: VENDOR_TYPE_MAP, defaultOn: true },
  { key: 'game_name',        label: '游戏名称',   group: '🎮 游戏',  colKey: 'vendor_product_name', filterType: 'text', param: 'vendor_product_name', defaultOn: false },
  // 订单
  { key: 'order_no',         label: '下注订单号', group: '📋 订单',  colKey: 'order_no',          filterType: 'text', param: 'order_no',            defaultOn: false },
  { key: 'vendor_order',     label: '厂商订单号', group: '📋 订单',  colKey: 'vendor_order_no',   filterType: 'text', param: 'vendor_order_no',     defaultOn: false },
  // 金额
  { key: 'bet_gold',         label: '投注金额',   group: '💰 金额',  colKey: 'bet_gold',          filterType: null,                                  defaultOn: true },
  { key: 'win_gold',         label: '输赢金额',   group: '💰 金额',  colKey: 'win_gold',          filterType: null,                                  defaultOn: true },
  { key: 'water',            label: '用户流水',   group: '💰 金额',  colKey: 'water',             filterType: null,                                  defaultOn: true },
  // 其他
  { key: 'status',           label: '投注状态',   group: '📌 其他',  colKey: 'settlement_status', filterType: 'text', param: 'settlement_status',   defaultOn: true },
  { key: 'resettle',         label: '重结状态',   group: '📌 其他',  colKey: 'resettlement_status', filterType: 'text', param: 'resettlement_status', defaultOn: false },
  { key: 'account_currency', label: '帐户币种',   group: '📌 其他',  colKey: 'coin_name_unique',  filterType: 'text', param: 'coin_name_unique',    defaultOn: false },
  { key: 'vendor_currency',  label: '厂商币种',   group: '📌 其他',  colKey: 'vendor_coin_name_unique', filterType: 'text', param: 'vendor_coin_name_unique', defaultOn: false },
];

const TOKEN_KEY   = 'bet_token';
const API_URL_KEY = 'bet_api_url';

let currentPage = 1;
let totalPages  = 1;
let totalCount  = 0;
let currentData = [];
let checkedItems = new Set(ALL_ITEMS.filter(i => i.defaultOn).map(i => i.key));

// =============================================
// DOM
// =============================================
const loginPage     = document.getElementById('login-page');
const mainPage      = document.getElementById('main-page');
const loginBtn      = document.getElementById('login-btn');
const logoutBtn     = document.getElementById('logout-btn');
const loginError    = document.getElementById('login-error');
const navApiUrl     = document.getElementById('nav-api-url');
const columnList    = document.getElementById('column-list');
const checkAllBtn   = document.getElementById('check-all-btn');
const uncheckAllBtn = document.getElementById('uncheck-all-btn');
const filterInputs  = document.getElementById('filter-inputs');
const searchBtn     = document.getElementById('search-btn');
const exportBtn     = document.getElementById('export-btn');
const statusBar     = document.getElementById('status-bar');
const tableInfo     = document.getElementById('table-info');
const emptyState    = document.getElementById('empty-state');
const dataTable     = document.getElementById('data-table');
const tableHead     = document.getElementById('table-head');
const tableBody     = document.getElementById('table-body');
const pagination    = document.getElementById('pagination');
const prevBtn       = document.getElementById('prev-btn');
const nextBtn       = document.getElementById('next-btn');
const pageInfo      = document.getElementById('page-info');
const totalCountEl  = document.getElementById('total-count');
const currentPageEl = document.getElementById('current-page');
const totalPagesEl  = document.getElementById('total-pages');

// =============================================
// 渲染左侧统一勾选列表
// =============================================
function renderItemList() {
  columnList.innerHTML = '';
  const groups = {};
  ALL_ITEMS.forEach(item => {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  });

  Object.entries(groups).forEach(([groupName, items]) => {
    const header = document.createElement('div');
    header.className = 'col-group-header';
    header.textContent = groupName;
    columnList.appendChild(header);

    items.forEach(item => {
      const label = document.createElement('label');
      label.className = 'col-item';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = item.key;
      cb.checked = checkedItems.has(item.key);
      cb.addEventListener('change', () => {
        if (cb.checked) checkedItems.add(item.key);
        else checkedItems.delete(item.key);
        renderFilterInputs();
        if (currentData.length > 0) renderTable(currentData);
      });

      const span = document.createElement('span');
      span.textContent = item.label;

      label.appendChild(cb);
      label.appendChild(span);
      columnList.appendChild(label);
    });
  });
}

// =============================================
// 渲染筛选输入区（只渲染有 filterType 且已勾选的）
// =============================================
function renderFilterInputs() {
  filterInputs.innerHTML = '';
  ALL_ITEMS.filter(i => checkedItems.has(i.key) && i.filterType).forEach(item => {
    const div = document.createElement('div');
    if (item.filterType === 'timerange') {
      div.className = 'form-group form-group-wide';
      div.innerHTML = `
        <label>${item.label}</label>
        <input type="text" id="filter-${item.key}-range" placeholder="选择日期区间" readonly style="cursor:pointer;" />
        <input type="hidden" id="filter-${item.key}-start" />
        <input type="hidden" id="filter-${item.key}-end" />`;
      setTimeout(() => {
        const el = document.getElementById(`filter-${item.key}-range`);
        if (el && window.flatpickr) {
          flatpickr(el, {
            mode: 'range', enableTime: true, time_24hr: true,
            dateFormat: 'Y-m-d H:i', locale: 'zh',
            onChange: (dates) => {
              const s = document.getElementById(`filter-${item.key}-start`);
              const e = document.getElementById(`filter-${item.key}-end`);
              if (dates[0]) s.value = flatpickr.formatDate(dates[0], 'Y-m-d H:i:S');
              if (dates[1]) e.value = flatpickr.formatDate(dates[1], 'Y-m-d H:i:S');
            }
          });
        }
      }, 50);
    } else if (item.filterType === 'select') {
      div.className = 'form-group';
      const opts = Object.entries(item.options).map(([v, l]) =>
        `<option value="${v}">${l}</option>`
      ).join('');
      div.innerHTML = `
        <label>${item.label}</label>
        <select id="filter-${item.key}">
          <option value="">全部</option>
          ${opts}
        </select>`;
    } else {
      div.className = 'form-group';
      div.innerHTML = `
        <label>${item.label}</label>
        <input type="text" id="filter-${item.key}" placeholder="可空" />`;
    }
    filterInputs.appendChild(div);
  });
}

// 全选 / 全不选
checkAllBtn.addEventListener('click', () => {
  checkedItems = new Set(ALL_ITEMS.map(i => i.key));
  renderItemList();
  renderFilterInputs();
  if (currentData.length > 0) renderTable(currentData);
});

uncheckAllBtn.addEventListener('click', () => {
  checkedItems.clear();
  renderItemList();
  renderFilterInputs();
  if (currentData.length > 0) renderTable(currentData);
});

// =============================================
// 初始化
// =============================================
function init() {
  const token  = localStorage.getItem(TOKEN_KEY);
  const apiUrl = localStorage.getItem(API_URL_KEY);
  if (token && apiUrl) showMainPage();
  else showLoginPage();
}

function showLoginPage() {
  loginPage.classList.remove('hidden');
  mainPage.classList.add('hidden');
  const savedUrl = localStorage.getItem(API_URL_KEY);
  if (savedUrl) document.getElementById('api-url').value = savedUrl;
}

function showMainPage() {
  loginPage.classList.add('hidden');
  mainPage.classList.remove('hidden');
  navApiUrl.textContent = localStorage.getItem(API_URL_KEY) || '';
  renderItemList();
  renderFilterInputs();
}

// =============================================
// 登入 / 登出
// =============================================
loginBtn.addEventListener('click', () => {
  const baseUrl = document.getElementById('api-url').value.trim();
  const token   = document.getElementById('login-token').value.trim();
  loginError.textContent = '';
  if (!baseUrl) { loginError.textContent = '请输入 API Base URL'; return; }
  if (!token)   { loginError.textContent = '请输入 Token'; return; }
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(API_URL_KEY, baseUrl);
  showMainPage();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !loginPage.classList.contains('hidden')) loginBtn.click();
});

logoutBtn.addEventListener('click', () => {
  if (!confirm('确认要登出吗？')) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(API_URL_KEY);
  showLoginPage();
});

// =============================================
// 查询
// =============================================
searchBtn.addEventListener('click', () => { currentPage = 1; doSearch(); });

async function doSearch() {
  const token  = localStorage.getItem(TOKEN_KEY);
  const apiUrl = localStorage.getItem(API_URL_KEY);
  if (!token || !apiUrl) { showLoginPage(); return; }

  const params = {
    baseUrl: apiUrl, token,
    pageCount: currentPage,
    pageSize: parseInt(document.getElementById('filter-page-size').value, 10),
  };

  ALL_ITEMS.filter(i => checkedItems.has(i.key) && i.filterType).forEach(item => {
    if (item.filterType === 'timerange') {
      const s = document.getElementById(`filter-${item.key}-start`);
      const e = document.getElementById(`filter-${item.key}-end`);
      if (s?.value) params[item.paramStart] = s.value;
      if (e?.value) params[item.paramEnd]   = e.value;
    } else {
      const el = document.getElementById(`filter-${item.key}`);
      if (el?.value.trim()) params[item.param] = el.value.trim();
    }
  });

  setStatus('loading', '<span class="spinner"></span> 查询中...');
  searchBtn.disabled = true;
  exportBtn.disabled = true;

  // 构建 multipart/form-data 直接打 API（纯前端，不经代理）
  const form = new FormData();
  form.append('plat_id', '30035');
  form.append('token', token);
  form.append('page_count', String(params.pageCount || 1));
  form.append('page_size', String(params.pageSize || 20));
  form.append('device', 'bd0e7b1c-86b4-422b-beeb-0e3f161e5470');
  form.append('lang', 'zh_CN');
  form.append('timezone', '+8');
  form.append('custom_host', apiUrl + '/');
  form.append('login_admin_user_id', '1551');
  // 附加筛选参数
  const reserved = ['baseUrl','token','pageCount','pageSize'];
  Object.entries(params).forEach(([k,v]) => {
    if (!reserved.includes(k) && v !== undefined && v !== '') form.append(k, String(v));
  });

  try {
    const res = await fetch(`${apiUrl}/admin/plat_users_bet/index`, {
      method: 'POST',
      body: form
    });

    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      alert('登入已过期，请重新登入');
      showLoginPage();
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      setStatus('error', `查询失败：${data?.msg || data?.message || data?.error || res.status}`);
      return;
    }

    // 处理 API 错误码
    if (data?.status && data.status !== 0) {
      setStatus('error', `查询失败：[${data.status}] ${data?.msg || '未知错误'}`);
      return;
    }

    const rows      = data?.data?.list || data?.data?.data || data?.data || data?.list || [];
    const pageInfo_ = data?.data?.pageInfo || {};
    totalCount  = pageInfo_.pageTotal  || data?.data?.total || data?.total || rows.length;
    totalPages  = pageInfo_.pageCount  || data?.data?.total_pages || Math.ceil(totalCount / params.pageSize) || 1;
    currentPage = pageInfo_.pageCurrent || data?.data?.page || currentPage;

    currentData = rows;
    renderTable(rows);
    updatePagination();

    if (rows.length === 0) setStatus('', '查询完成，没有符合条件的记录');
    else { setStatus('success', `查询成功，共 ${totalCount} 笔记录`); exportBtn.disabled = false; }

  } catch (err) {
    setStatus('error', `请求失败：${err.message}`);
  } finally {
    searchBtn.disabled = false;
  }
}

// =============================================
// 渲染表格
// =============================================
function renderTable(rows) {
  const visibleCols = ALL_ITEMS.filter(i => checkedItems.has(i.key));

  if (visibleCols.length === 0) {
    emptyState.textContent = '请至少勾选一个栏位';
    emptyState.classList.remove('hidden');
    dataTable.classList.add('hidden');
    tableInfo.classList.add('hidden');
    return;
  }

  tableHead.innerHTML = '';
  const headerRow = document.createElement('tr');
  visibleCols.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.label;
    headerRow.appendChild(th);
  });
  tableHead.appendChild(headerRow);

  tableBody.innerHTML = '';
  if (rows.length === 0) {
    emptyState.innerHTML = '<p>没有符合条件的记录</p>';
    emptyState.classList.remove('hidden');
    dataTable.classList.add('hidden');
    tableInfo.classList.add('hidden');
    pagination.classList.add('hidden');
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    visibleCols.forEach(col => {
      const td = document.createElement('td');
      let val = row[col.colKey];
      if (col.key === 'vendor_id' && val !== null && val !== undefined) val = VENDOR_ID_MAP[val] || val;
      if (col.key === 'vendor_type' && val !== null && val !== undefined) val = VENDOR_TYPE_MAP[val] || val;
      td.textContent = (val === null || val === undefined || val === '') ? '-' : val;
      td.title = td.textContent;
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });

  emptyState.classList.add('hidden');
  dataTable.classList.remove('hidden');
  tableInfo.classList.remove('hidden');
  totalCountEl.textContent  = totalCount;
  currentPageEl.textContent = currentPage;
  totalPagesEl.textContent  = totalPages;
}

// =============================================
// 分页
// =============================================
function updatePagination() {
  if (totalPages <= 1 && currentData.length === 0) { pagination.classList.add('hidden'); return; }
  pagination.classList.remove('hidden');
  pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; doSearch(); } });
nextBtn.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; doSearch(); } });

// =============================================
// 导出 Excel
// =============================================
exportBtn.addEventListener('click', () => {
  if (currentData.length === 0) { alert('没有可导出的数据'); return; }
  const visibleCols = ALL_ITEMS.filter(i => checkedItems.has(i.key));
  if (visibleCols.length === 0) { alert('请至少勾选一个栏位'); return; }

  const headers = visibleCols.map(c => c.label);
  const rows = currentData.map(row =>
    visibleCols.map(col => {
      const val = row[col.colKey];
      return (val === null || val === undefined) ? '' : val;
    })
  );

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = headers.map((h, i) => ({
    wch: Math.min(Math.max(h.length, ...rows.map(r => String(r[i] || '').length)) + 2, 30)
  }));
  XLSX.utils.book_append_sheet(wb, ws, '投注记录');
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  XLSX.writeFile(wb, `投注记录_${dateStr}.xlsx`);
});

// =============================================
// 工具
// =============================================
function setStatus(type, html) {
  statusBar.innerHTML = html;
  statusBar.className = 'status-bar';
  if (type) statusBar.classList.add(type);
  statusBar.classList.remove('hidden');
}

init();
