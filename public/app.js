/**
 * app.js - 投注记录查询系统 前端逻辑
 *
 * 主要功能：
 * 1. 登入 / 登出
 * 2. 栏位勾选管理
 * 3. 筛选条件查询
 * 4. 分页
 * 5. 导出 Excel（使用 SheetJS）
 */

// =============================================
// 常量：所有可用栏位定义
// =============================================
const ALL_COLUMNS = [
  { key: 'bet_time',     label: '时间',     group: '📅 时间' },
  { key: 'user_id',      label: '用户ID',   group: '👤 用户' },
  { key: 'vendor_name',  label: '游戏厂商', group: '🎮 游戏' },
  { key: 'game_name',    label: '游戏类型', group: '🎮 游戏' },
  { key: 'bet_amount',   label: '投注金额', group: '💰 金额' },
  { key: 'win_amount',   label: '输赢金额', group: '💰 金额' },
  { key: 'profit',       label: '用户流水', group: '💰 金额' },
  { key: 'status',       label: '状态',     group: '📌 其他' },
];

// localStorage key 名（与需求一致）
const TOKEN_KEY = 'bet_token';
const API_URL_KEY = 'bet_api_url';

// =============================================
// 状态变量
// =============================================
let currentPage = 1;          // 当前页码
let totalPages = 1;           // 总页数
let totalCount = 0;           // 总记录数
let currentData = [];         // 当前查询结果（用于导出 Excel）
let checkedColumns = new Set(ALL_COLUMNS.map(c => c.key)); // 默认全部勾选

// =============================================
// DOM 元素引用
// =============================================
const loginPage    = document.getElementById('login-page');
const mainPage     = document.getElementById('main-page');
const loginBtn     = document.getElementById('login-btn');
const logoutBtn    = document.getElementById('logout-btn');
const loginError   = document.getElementById('login-error');
const navApiUrl    = document.getElementById('nav-api-url');

const columnList   = document.getElementById('column-list');
const checkAllBtn  = document.getElementById('check-all-btn');
const uncheckAllBtn = document.getElementById('uncheck-all-btn');

const filterStartTime = document.getElementById('filter-start-time');
const filterEndTime   = document.getElementById('filter-end-time');
const filterUsername  = document.getElementById('filter-username');
const filterVendor    = document.getElementById('filter-vendor');
const filterPageSize  = document.getElementById('filter-page-size');
const searchBtn    = document.getElementById('search-btn');
const exportBtn    = document.getElementById('export-btn');

const statusBar    = document.getElementById('status-bar');
const tableInfo    = document.getElementById('table-info');
const emptyState   = document.getElementById('empty-state');
const dataTable    = document.getElementById('data-table');
const tableHead    = document.getElementById('table-head');
const tableBody    = document.getElementById('table-body');
const pagination   = document.getElementById('pagination');
const prevBtn      = document.getElementById('prev-btn');
const nextBtn      = document.getElementById('next-btn');
const pageInfo     = document.getElementById('page-info');
const totalCountEl = document.getElementById('total-count');
const currentPageEl = document.getElementById('current-page');
const totalPagesEl = document.getElementById('total-pages');

// =============================================
// 初始化：判断是否已登入
// =============================================
function init() {
  const token = localStorage.getItem(TOKEN_KEY);
  const apiUrl = localStorage.getItem(API_URL_KEY);

  if (token && apiUrl) {
    // 已登入，显示主页
    showMainPage();
  } else {
    // 未登入，显示登入页
    showLoginPage();
  }
}

// =============================================
// 页面切换
// =============================================
function showLoginPage() {
  loginPage.classList.remove('hidden');
  mainPage.classList.add('hidden');
  // 如果已储存的 API URL，预填到输入框
  const savedUrl = localStorage.getItem(API_URL_KEY);
  if (savedUrl) {
    document.getElementById('api-url').value = savedUrl;
  }
}

function showMainPage() {
  loginPage.classList.add('hidden');
  mainPage.classList.remove('hidden');
  // 显示当前使用的 API URL
  navApiUrl.textContent = localStorage.getItem(API_URL_KEY) || '';
  // 渲染栏位勾选列表
  renderColumnList();
}

// =============================================
// 登入逻辑
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

// 按 Enter 也能登入
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !loginPage.classList.contains('hidden')) {
    loginBtn.click();
  }
});

// =============================================
// 登出逻辑
// =============================================
logoutBtn.addEventListener('click', () => {
  if (!confirm('确认要登出吗？')) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(API_URL_KEY);
  showLoginPage();
});

// =============================================
// 渲染栏位勾选列表
// =============================================
function renderColumnList() {
  columnList.innerHTML = '';

  // 按 group 分组
  const groups = {};
  ALL_COLUMNS.forEach(col => {
    if (!groups[col.group]) groups[col.group] = [];
    groups[col.group].push(col);
  });

  Object.entries(groups).forEach(([groupName, cols]) => {
    // 分组标题
    const groupHeader = document.createElement('div');
    groupHeader.className = 'col-group-header';
    groupHeader.textContent = groupName;
    columnList.appendChild(groupHeader);

    cols.forEach(col => {
      const item = document.createElement('label');
      item.className = 'col-item';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = col.key;
      cb.checked = checkedColumns.has(col.key);
      cb.addEventListener('change', () => {
        if (cb.checked) {
          checkedColumns.add(col.key);
        } else {
          checkedColumns.delete(col.key);
        }
        if (currentData.length > 0) renderTable(currentData);
      });

      const labelSpan = document.createElement('span');
      labelSpan.textContent = col.label;

      item.appendChild(cb);
      item.appendChild(labelSpan);
      columnList.appendChild(item);
    });
  });
}

// 全选 / 全不选
checkAllBtn.addEventListener('click', () => {
  checkedColumns = new Set(ALL_COLUMNS.map(c => c.key));
  renderColumnList();
  if (currentData.length > 0) renderTable(currentData);
});

uncheckAllBtn.addEventListener('click', () => {
  checkedColumns.clear();
  renderColumnList();
  if (currentData.length > 0) renderTable(currentData);
});

// =============================================
// 查询逻辑
// =============================================
searchBtn.addEventListener('click', () => {
  currentPage = 1; // 点击查询时重置到第一页
  doSearch();
});

async function doSearch() {
  const token  = localStorage.getItem(TOKEN_KEY);
  const apiUrl = localStorage.getItem(API_URL_KEY);

  if (!token || !apiUrl) {
    showLoginPage();
    return;
  }

  // 构建查询参数
  const params = {
    baseUrl: apiUrl,
    token: token,
    page: currentPage,
    per_page: parseInt(filterPageSize.value, 10),
  };

  if (filterStartTime.value) params.start_time = filterStartTime.value.replace('T', ' ');
  if (filterEndTime.value)   params.end_time   = filterEndTime.value.replace('T', ' ');
  if (filterUsername.value.trim()) params.username = filterUsername.value.trim();
  if (filterVendor.value.trim())   params.vendor_name = filterVendor.value.trim();

  // UI 状态：查询中
  setStatus('loading', '<span class="spinner"></span> 查询中...');
  searchBtn.disabled = true;
  exportBtn.disabled = true;

  try {
    const res = await fetch('/api/bet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    // token 失效，跳回登入页
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      alert('登入已过期，请重新登入');
      showLoginPage();
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      setStatus('error', `查询失败：${data?.message || data?.error || res.status}`);
      return;
    }

    // 兼容不同 API 响应结构
    // 常见格式：{ data: { list: [...], total: N, page: N, total_pages: N } }
    //           { data: [...], total: N }
    //           { list: [...], total: N }
    const rows = data?.data?.list || data?.data?.data || data?.data || data?.list || [];
    totalCount = data?.data?.total || data?.total || rows.length;
    totalPages = data?.data?.total_pages
               || data?.total_pages
               || Math.ceil(totalCount / parseInt(filterPageSize.value, 10))
               || 1;
    currentPage = data?.data?.page || data?.page || currentPage;

    currentData = rows;

    // 渲染表格
    renderTable(rows);
    updatePagination();

    if (rows.length === 0) {
      setStatus('', '查询完成，没有符合条件的记录');
    } else {
      setStatus('success', `查询成功，共 ${totalCount} 笔记录`);
      exportBtn.disabled = false;
    }

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
  // 取得当前勾选的栏位（保持原定义顺序）
  const visibleCols = ALL_COLUMNS.filter(c => checkedColumns.has(c.key));

  if (visibleCols.length === 0) {
    emptyState.textContent = '请至少勾选一个栏位';
    emptyState.classList.remove('hidden');
    dataTable.classList.add('hidden');
    tableInfo.classList.add('hidden');
    return;
  }

  // 渲染表头
  tableHead.innerHTML = '';
  const headerRow = document.createElement('tr');
  visibleCols.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.label;
    th.title = col.key;
    headerRow.appendChild(th);
  });
  tableHead.appendChild(headerRow);

  // 渲染表体
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
      const val = row[col.key];
      // 空值显示为 -
      td.textContent = (val === null || val === undefined || val === '') ? '-' : val;
      td.title = td.textContent; // 鼠标悬停显示完整内容
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });

  emptyState.classList.add('hidden');
  dataTable.classList.remove('hidden');

  // 更新统计信息
  tableInfo.classList.remove('hidden');
  totalCountEl.textContent = totalCount;
  currentPageEl.textContent = currentPage;
  totalPagesEl.textContent = totalPages;
}

// =============================================
// 分页
// =============================================
function updatePagination() {
  if (totalPages <= 1 && currentData.length === 0) {
    pagination.classList.add('hidden');
    return;
  }
  pagination.classList.remove('hidden');
  pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    doSearch();
  }
});

nextBtn.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    doSearch();
  }
});

// =============================================
// 导出 Excel（SheetJS）
// =============================================
exportBtn.addEventListener('click', () => {
  if (currentData.length === 0) {
    alert('没有可导出的数据');
    return;
  }

  // 只导出勾选的栏位
  const visibleCols = ALL_COLUMNS.filter(c => checkedColumns.has(c.key));

  if (visibleCols.length === 0) {
    alert('请至少勾选一个栏位');
    return;
  }

  // 转换为二维数组（第一行为标题）
  const headers = visibleCols.map(c => c.label);
  const rows = currentData.map(row =>
    visibleCols.map(col => {
      const val = row[col.key];
      return (val === null || val === undefined) ? '' : val;
    })
  );

  const sheetData = [headers, ...rows];

  // 使用 SheetJS 创建工作簿
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // 自动调整栏宽（简单估算）
  ws['!cols'] = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => String(r[i] || '').length)
    );
    return { wch: Math.min(maxLen + 2, 30) };
  });

  XLSX.utils.book_append_sheet(wb, ws, '投注记录');

  // 下载文件
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  XLSX.writeFile(wb, `投注记录_${dateStr}.xlsx`);
});

// =============================================
// 工具函数：显示状态栏
// =============================================
function setStatus(type, html) {
  statusBar.innerHTML = html;
  statusBar.className = 'status-bar';
  if (type) statusBar.classList.add(type);
  statusBar.classList.remove('hidden');
}

// =============================================
// 启动
// =============================================
init();
