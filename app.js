/**
 * ==========================================================================
 * 雙和醫院肌無力中心 (MG Center) 臨床數據展示系統 - 核心控制邏輯
 * 設計宗旨：防呆、極簡交互、大字體高對比、流暢圖表、本地隨訪處方勾選資料庫
 * ==========================================================================
 */

// 1. 全局狀態變數
let globalPatients = [];         // 整合後的患者數據列表
let activePatientId = null;       // 當前選取的患者病歷號 (chartId)
let mgAdlChartInstance = null;    // Chart.js 實例引用
let currentFontScale = 1.3;       // 字體放大比例（預設 1.3x）
let localDbFileHandle = null;       // 本地資料庫 (JSON) 的 File System Access API 句柄
let localOverrides = {};          // 本地資料庫讀取出來的覆寫資料 (key: chartId)
let currentListMode = 'today';    // 病患列表過濾模式: 'today' | 'all'
let currentEditMode = 'edit';     // Modal 模式: 'edit' | 'new'

// 2. DOM 元素常數
const DOM = {
  // 工具與全域按鈕
  btnRefreshData: document.getElementById('btnRefreshData'),
  // 無障礙控制
  btnFontDecrease: document.getElementById('btnFontDecrease'),
  btnFontIncrease: document.getElementById('btnFontIncrease'),
  fontSizeDisplay: document.getElementById('fontSizeDisplay'),
  
  // 側邊欄
  patientSearchInput: document.getElementById('patientSearchInput'),
  btnFilterToday: document.getElementById('btnFilterToday'),
  btnFilterAll: document.getElementById('btnFilterAll'),
  patientListContainer: document.getElementById('patientListContainer'),
  btnOpenConfigModal: document.getElementById('btnOpenConfigModal'),
  btnExportJson: document.getElementById('btnExportJson'),
  btnImportTrigger: document.getElementById('btnImportTrigger'),
  fileImportJson: document.getElementById('fileImportJson'),
  btnConnectLocalDb: document.getElementById('btnConnectLocalDb'),
  txtLocalDbStatus: document.getElementById('txtLocalDbStatus'),
  
  // 視窗視角
  mainViewport: document.getElementById('mainViewport'),
  emptyStateView: document.getElementById('emptyStateView'),
  detailPanelView: document.getElementById('detailPanelView'),
  
  // 患者詳情欄位
  patientName: document.getElementById('patientName'),
  patientGenderAge: document.getElementById('patientGenderAge'),
  patientChartId: document.getElementById('patientChartId'),
  patientContactPhone: document.getElementById('patientContactPhone'),
  btnEditPatient: document.getElementById('btnEditPatient'),
  
  // 初診病史
  initOnset: document.getElementById('initOnset'),
  initAntibody: document.getElementById('initAntibody'),
  initMeds: document.getElementById('initMeds'),
  initThymusDetail: document.getElementById('initThymusDetail'),
  initNotes: document.getElementById('initNotes'),
  
  // 回診評估時間軸
  evalTimelineList: document.getElementById('evalTimelineList'),
  
  // 隨訪抽屜元件
  btnOpenFollowUpDrawer: document.getElementById('btnOpenFollowUpDrawer'),
  btnCloseFollowUpDrawer: document.getElementById('btnCloseFollowUpDrawer'),
  btnCancelFollowUpDrawer: document.getElementById('btnCancelFollowUpDrawer'),
  btnSaveFollowUpDrawer: document.getElementById('btnSaveFollowUpDrawer'),
  followUpDrawer: document.getElementById('followUpDrawer'),
  followUpForm: document.getElementById('followUpForm'),
  
  drawerPatientName: document.getElementById('drawerPatientName'),
  drawerPatientChartId: document.getElementById('drawerPatientChartId'),
  inputFollowUpDate: document.getElementById('inputFollowUpDate'),
  inputAntibodyDate: document.getElementById('inputAntibodyDate'),
  inputAntibodyIndex: document.getElementById('inputAntibodyIndex'),
  inputPrednisoloneDose: document.getElementById('inputPrednisoloneDose'),
  inputPrednisoloneDose2: document.getElementById('inputPrednisoloneDose2'),
  
  // 設定 Modal 元件
  configModal: document.getElementById('configModal'),
  btnCloseConfigModal: document.getElementById('btnCloseConfigModal'),
  btnSaveConfig: document.getElementById('btnSaveConfig'),
  btnResetConfig: document.getElementById('btnResetConfig'),
  inputSheetId: document.getElementById('inputSheetId'),
  inputInitialSheetName: document.getElementById('inputInitialSheetName'),
  inputAdlSheetName: document.getElementById('inputAdlSheetName'),
  

  // 編輯初診資料 Modal
  editPatientModal: document.getElementById('editPatientModal'),
  btnCloseEditPatient: document.getElementById('btnCloseEditPatient'),
  btnCancelEditPatient: document.getElementById('btnCancelEditPatient'),
  editPatientForm: document.getElementById('editPatientForm'),
  editName: document.getElementById('editName'),
  editChartId: document.getElementById('editChartId'),
  editGender: document.getElementById('editGender'),
  editBirthdate: document.getElementById('editBirthdate'),
  editPhone: document.getElementById('editPhone'),
  editMgfaClass: document.getElementById('editMgfaClass'),
  editOnset: document.getElementById('editOnset'),
  editAntibody: document.getElementById('editAntibody'),
  editInitAntibodyIndex: document.getElementById('editInitAntibodyIndex'),
  editInitAntibodyDate: document.getElementById('editInitAntibodyDate'),
  editMeds: document.getElementById('editMeds'),
  editThymus: document.getElementById('editThymus'),
  editNotes: document.getElementById('editNotes'),
  editPatientModalTitle: document.getElementById('editPatientModalTitle'),
  btnConfirmEditPatient: document.getElementById('btnConfirmEditPatient'),
  editOnsetAge:        document.getElementById('editOnsetAge'),
  editOnsetSymptoms:   document.getElementById('editOnsetSymptoms'),
  editCrisisCount:     document.getElementById('editCrisisCount'),
  editThymusImaging:   document.getElementById('editThymusImaging'),
  editPastMeds:        document.getElementById('editPastMeds'),
  editDiagnosticTests: document.getElementById('editDiagnosticTests')
};

// MG-ADL 8個分項指標的中文名稱與說明對照表
const MG_ADL_METRICS = {
  q1_talking:    { name: "1. 說話功能",   labels: ["0: 正常", "1: 說話有鼻音或說話易疲累", "2: 說話含糊不清、能被理解但吃力", "3: 無法言語、說話完全無法被理解"] },
  q2_chewing:    { name: "2. 咀嚼功能",   labels: ["0: 正常", "1: 咀嚼固體食物時易疲累", "2: 只能進食軟質食物", "3: 無法進食固體或軟質食物"] },
  q3_swallowing: { name: "3. 吞嚥功能",   labels: ["0: 正常", "1: 偶爾嗆咳或吞嚥費力", "2: 必須調整食物質地(如變稠)以防嗆咳", "3: 無法吞嚥、需要置留鼻胃管或管灌"] },
  q4_breathing:  { name: "4. 呼吸功能",   labels: ["0: 正常", "1: 活動時呼吸困難/喘", "2: 休息或靜止時呼吸困難/喘", "3: 需要呼吸器支持(如 BiPAP)"] },
  q5_brushing:   { name: "5. 梳頭與刷牙", labels: ["0: 正常", "1: 雙手抬高時容易疲累，但可獨立完成", "2: 必須有他人協助或需頻繁休息", "3: 完全無法抬起雙手梳頭或刷牙"] },
  q6_arising:    { name: "6. 起立功能",   labels: ["0: 正常", "1: 起立時有些微吃力，但不需要旁人扶持", "2: 必須用手支撐或藉助外力才能站起", "3: 完全需要他人協助或完全無法站立"] },
  q7_doublevision: { name: "7. 複視症狀",   labels: ["0: 無", "1: 偶爾出現複視（如疲累時）", "2: 每日皆會出現複視，但非持續整天", "3: 持續整天存在，影響日常活動"] },
  q8_eyeliddroop:  { name: "8. 眼皮下垂",   labels: ["0: 無", "1: 偶爾出現眼瞼下垂", "2: 每日皆會出現，但非持續整天", "3: 持續整天存在，且已遮擋部分視線"] }
};

// ==========================================
// 3. 初始化與設定載入邏輯
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initAccessibility();
  initChipGroups();
  initLocalDb().then(() => {
    loadConfigAndData();
  });
  bindEvents();
});

// 無障礙初始化 (字體比例與主題)
function initAccessibility() {
  // 字體大小
  const savedScale = localStorage.getItem('mg_font_scale');
  if (savedScale) {
    currentFontScale = parseFloat(savedScale);
  } else {
    currentFontScale = 1.3; // 預設 1.3x（若尚未自訂過）
  }
  applyFontScale();

  // 主題 (預設為淺色高對比)
  const savedTheme = localStorage.getItem('mg_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcons(savedTheme);
}

// 綁定所有點擊與輸入事件
function bindEvents() {
  // 無痕重新整理
  DOM.btnRefreshData.addEventListener('click', () => {
    // 讓圖示旋轉 (Lucide 會將 i 標籤替換為 svg)
    const icon = DOM.btnRefreshData.querySelector('svg') || DOM.btnRefreshData.querySelector('i');
    if (icon) icon.style.animation = 'spin 1s linear infinite';
    loadConfigAndData().then(() => {
      setTimeout(() => { if (icon) icon.style.animation = 'none'; }, 500);
    }).catch(err => {
      console.error(err);
      if (icon) icon.style.animation = 'none';
    });
  });

  // 字體放大縮小
  DOM.btnFontDecrease.addEventListener('click', () => adjustFontScale(-0.15));
  DOM.btnFontIncrease.addEventListener('click', () => adjustFontScale(0.15));
  
  // 即時搜尋
  DOM.patientSearchInput.addEventListener('input', handleSearch);
  
  // 門診模式切換
  DOM.btnFilterToday.addEventListener('click', () => setListMode('today'));
  DOM.btnFilterAll.addEventListener('click', () => setListMode('all'));
  
  // Config Modal 顯示與隱藏
  DOM.btnOpenConfigModal.addEventListener('click', openConfigModal);
  DOM.btnCloseConfigModal.addEventListener('click', closeConfigModal);
  DOM.btnSaveConfig.addEventListener('click', saveConfig);
  DOM.btnResetConfig.addEventListener('click', resetConfigToDemo);
  
  // 門診隨訪抽屜顯示與隱藏
  DOM.btnOpenFollowUpDrawer.addEventListener('click', openFollowUpDrawer);
  DOM.btnCloseFollowUpDrawer.addEventListener('click', closeFollowUpDrawer);
  DOM.btnCancelFollowUpDrawer.addEventListener('click', closeFollowUpDrawer);
  DOM.btnSaveFollowUpDrawer.addEventListener('click', saveFollowUpRecord);
  
  // 備份資料匯出與還原匯入
  DOM.btnExportJson.addEventListener('click', exportDataToJson);
  DOM.btnImportTrigger.addEventListener('click', () => DOM.fileImportJson.click());
  DOM.fileImportJson.addEventListener('change', importDataFromJson);
  
  // 本地資料庫 (JSON)
  DOM.btnConnectLocalDb.addEventListener('click', handleConnectLocalDb);
  
  // 編輯初診資料
  DOM.btnEditPatient.addEventListener('click', openEditPatientModal);
  DOM.btnCloseEditPatient.addEventListener('click', closeEditPatientModal);
  DOM.btnCancelEditPatient.addEventListener('click', closeEditPatientModal);
  DOM.editPatientForm.addEventListener('submit', saveEditPatient);
}

// 搜尋與列表過濾邏輯
function handleSearch() {
  renderPatientList(DOM.patientSearchInput.value);
}

function setListMode(mode) {
  currentListMode = mode;
  if (mode === 'today') {
    DOM.btnFilterToday.classList.add('active');
    DOM.btnFilterToday.style.background = '#fff';
    DOM.btnFilterToday.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    DOM.btnFilterToday.style.color = 'var(--text-primary)';
    
    DOM.btnFilterAll.classList.remove('active');
    DOM.btnFilterAll.style.background = 'transparent';
    DOM.btnFilterAll.style.boxShadow = 'none';
    DOM.btnFilterAll.style.color = 'var(--text-muted)';
  } else {
    DOM.btnFilterAll.classList.add('active');
    DOM.btnFilterAll.style.background = '#fff';
    DOM.btnFilterAll.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    DOM.btnFilterAll.style.color = 'var(--text-primary)';
    
    DOM.btnFilterToday.classList.remove('active');
    DOM.btnFilterToday.style.background = 'transparent';
    DOM.btnFilterToday.style.boxShadow = 'none';
    DOM.btnFilterToday.style.color = 'var(--text-muted)';
  }
  renderPatientList(DOM.patientSearchInput.value);
}

function isToday(dateString) {
  if (!dateString) return false;
  try {
    // 用本地時間（台灣 UTC+8），避免 toISOString() 的 UTC 偏差
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    // 統一格式後比對
    return normalizeDate(String(dateString).trim().split(' ')[0]) === todayStr;
  } catch(e) {
    return false;
  }
}

// 根據搜尋字詞與 currentListMode 渲染卡片
function renderPatientList(query = '') {
  let list = globalPatients;
  
  if (currentListMode === 'today') {
    list = list.filter(p =>
      p.history.some(h => isToday(h.timestamp)) ||
      isToday(p.registrationDate)
    );
  }

  const filtered = list.filter(patient => {
    const nameMatch = patient.name.toLowerCase().includes(query.toLowerCase());
    const idMatch = patient.chartId.toLowerCase().includes(query.toLowerCase()) || 
                    (patient.rawChartId && patient.rawChartId.toLowerCase().includes(query.toLowerCase()));
    return nameMatch || idMatch;
  });

  renderPatientListUI(filtered);
}

function renderPatientListUI(list) {
  if (list.length === 0) {
    DOM.patientListContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); text-align: center; padding: 24px; gap: 8px;">
        <i data-lucide="user-x" style="width: 32px; height: 32px;"></i>
        <p style="font-size: var(--font-sm); font-weight: 600;">無相符的病患</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  DOM.patientListContainer.innerHTML = list.map(patient => {
    const isAct = patient.chartId === activePatientId ? 'active' : '';
    const scoreVal = patient.latestScore !== null ? patient.latestScore : '--';
    
    let colorClass = 'bg-score-0';
    if (scoreVal !== '--') {
      if (scoreVal >= 15) colorClass = 'bg-score-3';
      else if (scoreVal >= 8) colorClass = 'bg-score-2';
      else if (scoreVal >= 3) colorClass = 'bg-score-1';
    }

    return `
      <div class="patient-card ${isAct}" onclick="selectPatient('${patient.chartId}')" data-id="${patient.chartId}" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 6px; margin-bottom: 2px;">
        <h3 style="font-size: 18px; font-weight: 700; margin: 0; padding: 2px 0; line-height: 1.4; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; margin-right: 8px;">${patient.name}</h3>
        <div class="${colorClass}" style="display: flex; align-items: center; justify-content: center; padding: 2px 8px; font-size: 13px; font-weight: 700; border-radius: 12px; min-width: 28px; flex-shrink: 0; color: #fff;">
          ${scoreVal}
        </div>
      </div>
    `;
  }).join('');
  
  lucide.createIcons();
}

// ==========================================
// 4. 無障礙控制功能 (Accessibility Actions)
// ==========================================
function applyFontScale() {
  document.documentElement.style.setProperty('--font-scale', currentFontScale);
  DOM.fontSizeDisplay.textContent = `${currentFontScale.toFixed(2)}x`;
  localStorage.setItem('mg_font_scale', currentFontScale);
}

function adjustFontScale(delta) {
  currentFontScale = Math.min(Math.max(currentFontScale + delta, 0.85), 1.45);
  applyFontScale();
  if (activePatientId) {
    const patient = globalPatients.find(p => p.chartId === activePatientId);
    if (patient) updateChart(patient);
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('mg_theme', newTheme);
  updateThemeIcons(newTheme);
  
  if (activePatientId) {
    const patient = globalPatients.find(p => p.chartId === activePatientId);
    if (patient) updateChart(patient);
  }
}

function updateThemeIcons(theme) {
  if (!DOM.btnThemeToggle) return;
  const sunIcon = DOM.btnThemeToggle.querySelector('.theme-sun-icon');
  const moonIcon = DOM.btnThemeToggle.querySelector('.theme-moon-icon');
  if (sunIcon && moonIcon) {
    if (theme === 'dark') {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
  }
}

// ==========================================
// 5. 數據加載與 Google Sheets 串接解析模組
// ==========================================
async function loadConfigAndData() {
  showSidebarLoading();

  // 本機模式：直接從 localStorage 讀取病患覆寫資料，不呼叫 Google Sheets
  const savedOverrides = localStorage.getItem('mg_patient_overrides');
  if (savedOverrides) {
    try { localOverrides = JSON.parse(savedOverrides); } catch(e) { localOverrides = {}; }
  }

  // 以空白初診與ADL列表呼叫，資料完全由 localOverrides 與 customVisits 驅動
  processAndRenderData([], []);
}

async function fetchGoogleSheetsData(sheetId, initSheetName, adlSheetName) {
  const baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
  const cacheBuster = `&_=${Date.now()}`;
  const urlInit = `${baseUrl}sheet=${encodeURIComponent(initSheetName)}${cacheBuster}`;
  const urlAdl  = `${baseUrl}sheet=${encodeURIComponent(adlSheetName)}${cacheBuster}`;

  const [initials, adls] = await Promise.all([
    loadGvizSheet(urlInit, 'gvizCbInit'),
    loadGvizSheet(urlAdl,  'gvizCbAdl')
  ]);
  return { initials, adls };
}

async function loadGvizSheet(url, callbackName) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return parseGvizData(text);
  } catch (fetchErr) {
    console.warn(`[fetch 失敗，切換 JSONP] ${fetchErr.message}`);
  }

  return new Promise((resolve, reject) => {
    const TIMEOUT_MS = 15000;
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`JSONP 逾時 (${TIMEOUT_MS / 1000}s)`));
    }, TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timer);
      try { delete window[callbackName]; } catch (e) {}
      const el = document.getElementById('_jsonp_' + callbackName);
      if (el) el.remove();
    }

    window[callbackName] = function (data) {
      cleanup();
      try { resolve(parseGvizData(data)); } catch (parseErr) { reject(parseErr); }
    };

    const script = document.createElement('script');
    script.id = '_jsonp_' + callbackName;
    script.src = `${url}&tqx=responseHandler:${callbackName}`;
    script.onerror = () => { cleanup(); reject(new Error(`JSONP script 載入失敗`)); };
    document.head.appendChild(script);
  });
}

function parseGvizData(raw) {
  let data;
  if (typeof raw === 'string') {
    const start = raw.indexOf('{');
    const end   = raw.lastIndexOf('}');
    data = JSON.parse(raw.substring(start, end + 1));
  } else {
    data = raw;
  }

  if (data.status === 'error') {
    const msg = (data.errors || []).map(e => e.detailed_message || e.message).join('; ');
    throw new Error(`[Gviz 資料錯誤] ${msg}`);
  }

  const cols = (data.table.cols || []).map(c => c.label ? c.label.trim() : '');
  const rows = (data.table.rows || []).map(r => {
    const obj = {};
    (r.c || []).forEach((cell, idx) => {
      const key = cols[idx] || `col_${idx}`;
      let val = '';
      if (cell) {
        if (cell.f !== undefined && cell.f !== null) val = cell.f;
        else if (cell.v !== null && cell.v !== undefined) val = String(cell.v);
      }
      obj[key] = val;
    });
    return obj;
  });
  return rows;
}

function loadDemoData() {
  if (window.DEFAULT_MOCK_DATA) {
    const initialsCopy = JSON.parse(JSON.stringify(window.DEFAULT_MOCK_DATA.initialAssessments));
    const adlsCopy = JSON.parse(JSON.stringify(window.DEFAULT_MOCK_DATA.mgAdlAssessments));
    processAndRenderData(initialsCopy, adlsCopy);
  } else {
    showSidebarError("模擬數據缺失。");
  }
}

function calculateAge(birthdateStr) {
  if (!birthdateStr) return 0;
  try {
    const cleanStr = birthdateStr.replace(/\//g, '-');
    const birthDate = new Date(cleanStr);
    if (isNaN(birthDate.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  } catch (e) { return 0; }
}

// ==========================================
// 6. 臨床數據處理與整合邏輯 (Data Processor)
// ==========================================
function processAndRenderData(initials, adls) {
  const savedOverrides = localStorage.getItem('mg_patient_overrides');
  if (savedOverrides) {
    const overrides = JSON.parse(savedOverrides);
    initials = initials.map(p => {
      const rawChartId = String(findValueByKeys(p, ['病歷號', 'chartid', 'chart id', 'Chart ID']) || '').trim();
      const name = String(findValueByKeys(p, ['姓名', 'name', 'Name']) || '').trim();
      const birthdate = String(findValueByKeys(p, ['出生年月日', '生日', '出生日期', 'birthdate', 'birthday']) || '').trim();
      const keyId = rawChartId || (name && birthdate ? `${name}_${birthdate.replace(/\//g, '-')}` : (name ? name : ''));
      if (overrides[keyId]) {
        p['臨床分期'] = overrides[keyId].mgfaClass;
        p['目前主要臨床用藥'] = overrides[keyId].medications;
      }
      return p;
    });
  }

  const normalizedInitials = initials.map(p => {
    const rawChartId = String(findValueByKeys(p, ['病歷號', 'chartid', 'chart id', 'Chart ID', 'chartno', 'chart no', '掛號', '病人編號']) || '').trim();
    const name = String(findValueByKeys(p, ['姓名', '病患姓名', '患者姓名', '名字', 'name', 'Name', 'patient name']) || '').trim();
    const birthdate = String(findValueByKeys(p, ['出生年月日', '生日', '出生日期', '出生', 'birthdate', 'birthday', 'dob', 'date of birth']) || '').trim();
    const rawAge = parseInt(findValueByKeys(p, ['年齡', '歲', 'age', 'Age']) || 0);
    const age = rawAge > 0 ? rawAge : (birthdate ? calculateAge(birthdate) : 0);
    const chartId = rawChartId || (name && birthdate ? `${name}_${birthdate.replace(/\//g, '-')}` : (name ? name : ''));

    const registrationDate = formatDateString(findValueByKeys(p, ['時間戳記', '時間', '填表時間', 'timestamp', 'Timestamp']) || '');
    return {
      chartId, rawChartId, name, birthdate,
      registrationDate,
      gender: String(findValueByKeys(p, ['性別', 'gender', 'Gender', '男', '女']) || '').trim(),
      age,
      phone: String(findValueByKeys(p, ['電話', '聯絡電話', '手機', '電話號碼', 'phone', 'Phone', 'contact', 'tel']) || '').trim(),
      mgfaClass: String(findValueByKeys(p, ['臨床分期', 'MGFA', 'mgfa', 'mgfa期', 'mgfaclass', '分期', '期別']) || '').trim(),
      onsetKeywords: String(findValueByKeys(p, ['發病日期', '首發症狀', '初次發病時間', '發病', 'onset', 'Onset']) || '').trim(),
      antibodyStatus: String(findValueByKeys(p, ['抗體狀態', '血清抗體', 'antibody', 'Antibody', 'AChR', 'MuSK']) || '').trim(),
      medications: String(findValueByKeys(p, ['「目前」使用過的藥物', '目前用藥', '目前主要臨床用藥', '用藥', 'medications', 'meds', 'Meds', 'drugs']) || '').trim(),
      thymectomyStatus: String(findValueByKeys(p, ['是否進行過胸腺', '胸腺切除', '胸腺狀態', '胸腺切除手術狀態', '胸腺手術', 'thymus', 'thymectomy']) || '').trim(),
      clinicalNotes: String(findValueByKeys(p, ['備註', '臨床診斷備註', '備注', '臨床備註', '其他備註', 'clinicalnotes', 'notes', 'note', 'remark']) || '').trim(),
      // 新欄位（2026年6月更新）
      onsetAge:        String(findValueByKeys(p, ['初次發病時的年紀', '發病時年紀', '發病年紀']) || '').trim(),
      onsetSymptoms:   String(findValueByKeys(p, ['初始症狀']) || '').trim(),
      crisisCount:     String(findValueByKeys(p, ['危象次數', '至今的危象次數']) || '').trim(),
      thymusImaging:   String(findValueByKeys(p, ['胸腺影像檢查', '胸腺影像']) || '').trim(),
      pastMedications: String(findValueByKeys(p, ['「曾經」使用過的藥物', '曾使用藥物']) || '').trim(),
      diagnosticTests: String(findValueByKeys(p, ['曾接受過肌無力檢查', '肌無力檢查']) || '').trim(),
    };
  }).filter(p => p.chartId !== '');

  const normalizedAdls = adls.map(entry => {
    const rawChartId = String(findValueByKeys(entry, ['病歷號', '病歷', 'chartid', 'chart id', 'Chart ID', 'chartno', '病人編號']) || '').trim();
    const name = String(findValueByKeys(entry, ['姓名', '姓名(病患)', '病患姓名', '患者姓名', 'name', 'Name', 'patient name']) || '').trim();
    const birthdate = String(findValueByKeys(entry, ['出生年月日', '生日', '出生日期', '出生年月日(病患)', 'birthdate', 'birthday', 'dob']) || '').trim();
    
    let matchedPatient = null;
    if (name && birthdate) {
      const cleanDob = birthdate.replace(/\//g, '-').trim();
      matchedPatient = normalizedInitials.find(p => p.name === name && p.birthdate.replace(/\//g, '-').trim() === cleanDob);
    }
    if (!matchedPatient && rawChartId) {
      matchedPatient = normalizedInitials.find(p => p.chartId === rawChartId || p.rawChartId === rawChartId);
    }
    
    const chartId = matchedPatient ? matchedPatient.chartId : (rawChartId || (name && birthdate ? `${name}_${birthdate.replace(/\//g, '-')}` : (name ? `${name}_(缺生日)` : `未知病患_${Date.now()}`)));
    
    const q1 = parseAdlScore(findValueByKeys(entry, ['說話', '說話功能', 'talking', 'q1']));
    const q2 = parseAdlScore(findValueByKeys(entry, ['咀嚼', '咀嚼功能', 'chewing', 'q2']));
    const q3 = parseAdlScore(findValueByKeys(entry, ['吞嚥', '吞嚥功能', 'swallowing', 'q3']));
    const q4 = parseAdlScore(findValueByKeys(entry, ['呼吸', '呼吸功能', 'breathing', 'q4']));
    const q5 = parseAdlScore(findValueByKeys(entry, ['梳頭', '刷牙', '梳頭刷牙', 'grooming', 'brushing', 'q5']));
    const q6 = parseAdlScore(findValueByKeys(entry, ['起立', '從椅子', '站起', 'arising', 'q6']));
    const q7 = parseAdlScore(findValueByKeys(entry, ['複視', '重影', 'doublevision', 'double vision', 'q7']));
    const q8 = parseAdlScore(findValueByKeys(entry, ['眼皮', '眼瞼', '下垂', 'eyelid', 'droop', 'q8']));
    
    const totalScore = q1 + q2 + q3 + q4 + q5 + q6 + q7 + q8;
    let formattedDate = formatDateString(findValueByKeys(entry, ['時間戳記', '時間', '填表時間', '日期', '回診日期', 'timestamp', 'Timestamp', 'date', 'Date']) || '');

    return {
      chartId, patientName: name, patientBirthdate: birthdate,
      patientGender: String(findValueByKeys(entry, ['性別', 'gender', 'Gender', '男', '女']) || '').trim(),
      timestamp: formattedDate,
      evaluator: String(findValueByKeys(entry, ['填表人', 'evaluator', 'Evaluator']) || '臨床醫護').trim(),
      totalScore,
      details: { q1_talking: q1, q2_chewing: q2, q3_swallowing: q3, q4_breathing: q4, q5_brushing: q5, q6_arising: q6, q7_doublevision: q7, q8_eyeliddroop: q8 },
      antibodyDate: entry.antibodyDate || '',
      antibodyIndex: entry.antibodyIndex || '',
      medications: entry.medications || null,
      mgfaPis: entry.mgfaPis || null,
      mgfaClass: entry.mgfaClass || ''
    };
  }).filter(entry => entry.chartId !== '');

  let customVisits = JSON.parse(localStorage.getItem('mg_custom_visits') || '[]');
  if (localOverrides['_system_custom_visits']) {
    const localVisits = localOverrides['_system_custom_visits'];
    customVisits = customVisits.filter(cv => !localVisits.some(lv => lv.chartId === cv.chartId && normalizeDate(lv.timestamp) === normalizeDate(cv.timestamp)));
    customVisits = customVisits.concat(localVisits);
  }
  
  customVisits.forEach(cv => {
    const index = normalizedAdls.findIndex(av => av.chartId === cv.chartId && normalizeDate(av.timestamp) === normalizeDate(cv.timestamp));
    if (index !== -1) {
      normalizedAdls[index].medications = cv.medications;
      normalizedAdls[index].mgfaPis = cv.mgfaPis;
      normalizedAdls[index].mgfaClass = cv.mgfaClass;
      if (cv.antibodyIndex) {
        normalizedAdls[index].antibodyDate = cv.antibodyDate;
        normalizedAdls[index].antibodyIndex = cv.antibodyIndex;
      }
      normalizedAdls[index].evaluator = "患者本人與門診教授";
    } else {
      // 若 customVisit 有實際 ADL 評分，視為表單記錄（非純OPD）；否則標記為純OPD
      const hasAdlData = cv.totalScore > 0 || Object.values(cv.details || {}).some(v => v > 0);
      normalizedAdls.push({ ...cv, _opdOnly: !hasAdlData });
    }
  });

  function buildPatientWithHistory(patient) {
    const history = normalizedAdls.filter(entry => entry.chartId === patient.chartId).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    let latestScore = null, trend = 'stable', trendText = '穩定';
    if (history.length > 0) {
      latestScore = history[history.length - 1].totalScore;
      if (history.length > 1) {
        const diff = latestScore - history[history.length - 2].totalScore;
        if (diff < 0) { trend = 'better'; trendText = `${Math.abs(diff)} 分 ↓`; }
        else if (diff > 0) { trend = 'worse'; trendText = `${diff} 分 ↑`; }
      } else trendText = '首次評估';
    }
    return { ...patient, history, latestScore, trend, trendText };
  }

  globalPatients = normalizedInitials.map(patient => buildPatientWithHistory(patient));
  const existingChartIds = new Set(normalizedInitials.map(p => p.chartId));
  [...new Set(normalizedAdls.filter(e => e.chartId && !existingChartIds.has(e.chartId)).map(e => e.chartId))].forEach(chartId => {
    const adlEntries = normalizedAdls.filter(e => e.chartId === chartId);
    const firstEntry = adlEntries[0] || {}, latestEntry = adlEntries[adlEntries.length - 1] || {};
    let displayName = latestEntry.patientName || firstEntry.patientName || chartId;
    let birthdate = latestEntry.patientBirthdate || firstEntry.patientBirthdate || '';
    globalPatients.push(buildPatientWithHistory({
      chartId, rawChartId: '', name: displayName, birthdate,
      gender: latestEntry.patientGender || firstEntry.patientGender || '', age: birthdate ? calculateAge(birthdate) : 0,
      phone: '', mgfaClass: latestEntry.mgfaClass || '--', onsetKeywords: '', antibodyStatus: '', medications: '', thymectomyStatus: '',
      clinicalNotes: '⚠️ 此患者尚未填寫初診建檔表。', _adlOnly: true
    }));
  });

  // 加入純本地建立的病患（不依附 Google Sheets）
  Object.entries(localOverrides).forEach(([key, o]) => {
    if (!o._localPatient) return;
    if (globalPatients.some(p => p.chartId === key)) return; // 已存在則略過
    globalPatients.push(buildPatientWithHistory({
      chartId: key,
      rawChartId: o.chartId || '',
      name: o.name || key,
      birthdate: o.birthdate || '',
      gender: o.gender || '',
      age: o.birthdate ? calculateAge(o.birthdate) : 0,
      phone: o.phone || '',
      mgfaClass: o.mgfaClass || '--',
      onsetKeywords: o.onsetKeywords || '',
      antibodyStatus: o.antibodyStatus || '',
      medications: o.medications || '',
      thymectomyStatus: o.thymectomyStatus || '',
      clinicalNotes: o.clinicalNotes || '',
      initAntibodyIndex: o.initAntibodyIndex || '',
      initAntibodyDate:  o.initAntibodyDate  || '',
      onsetAge:          o.onsetAge          || '',
      onsetSymptoms:     o.onsetSymptoms     || '',
      crisisCount:       o.crisisCount       || '',
      thymusImaging:     o.thymusImaging     || '',
      pastMedications:   o.pastMedications   || '',
      diagnosticTests:   o.diagnosticTests   || '',
      registrationDate:  o.registrationDate  || '',
    }));
  });

  globalPatients.forEach(p => {
    if (localOverrides[p.chartId]) {
      const o = localOverrides[p.chartId];
      if (o.name !== undefined)             p.name             = o.name;
      if (o.chartId !== undefined)          p.rawChartId       = o.chartId;
      if (o.gender !== undefined)           p.gender           = o.gender;
      if (o.phone !== undefined)            p.phone            = o.phone;
      if (o.mgfaClass !== undefined)        p.mgfaClass        = o.mgfaClass;
      if (o.medications !== undefined)      p.medications      = o.medications;
      if (o.onsetKeywords !== undefined)    p.onsetKeywords    = o.onsetKeywords;
      if (o.antibodyStatus !== undefined)   p.antibodyStatus   = o.antibodyStatus;
      if (o.thymectomyStatus !== undefined) p.thymectomyStatus = o.thymectomyStatus;
      if (o.clinicalNotes !== undefined)    p.clinicalNotes    = o.clinicalNotes;
      if (o.birthdate)                      p.age              = calculateAge(o.birthdate);
      if (o.initAntibodyIndex)              p.initAntibodyIndex  = o.initAntibodyIndex;
      if (o.initAntibodyDate)               p.initAntibodyDate   = o.initAntibodyDate;
      if (o.onsetAge        !== undefined)  p.onsetAge           = o.onsetAge;
      if (o.onsetSymptoms   !== undefined)  p.onsetSymptoms      = o.onsetSymptoms;
      if (o.crisisCount     !== undefined)  p.crisisCount        = o.crisisCount;
      if (o.thymusImaging   !== undefined)  p.thymusImaging      = o.thymusImaging;
      if (o.pastMedications !== undefined)  p.pastMedications    = o.pastMedications;
      if (o.diagnosticTests !== undefined)  p.diagnosticTests    = o.diagnosticTests;
    }
  });

  // 過濾掉已被本地標記刪除的病患
  globalPatients = globalPatients.filter(p => !localOverrides[p.chartId]?._deleted);

  globalPatients.sort((a, b) => {
    const aDate = a.history.length > 0 ? new Date(a.history[a.history.length - 1].timestamp) : new Date(0);
    const bDate = b.history.length > 0 ? new Date(b.history[b.history.length - 1].timestamp) : new Date(0);
    return bDate - aDate;
  });

  renderPatientList(DOM.patientSearchInput.value);
  if (globalPatients.length > 0) {
    const isActExists = globalPatients.some(p => p.chartId === activePatientId);
    selectPatient(isActExists ? activePatientId : globalPatients[0].chartId);
  } else {
    showEmptyState();
  }
}

function parseAdlScore(val) {
  if (!val) return 0;
  const match = String(val).trim().match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function findValueByKeys(obj, keys) {
  for (let key of keys) {
    const lowerKey = key.toLowerCase().trim();
    for (let k in obj) {
      if (k.toLowerCase().trim() === lowerKey && obj[k]) return obj[k];
    }
  }
  for (let key of keys) {
    const lowerKey = key.toLowerCase().trim();
    for (let k in obj) {
      if ((k.toLowerCase().trim().includes(lowerKey) || lowerKey.includes(k.toLowerCase().trim())) && obj[k]) return obj[k];
    }
  }
  return null;
}

function formatDateString(rawDateStr) {
  if (!rawDateStr) return '無日期';
  try {
    let s = String(rawDateStr).trim();
    if (s.includes('Date(')) {
      const parts = s.match(/\d+/g);
      if (parts) return `${parts[0]}-${String(parseInt(parts[1])+1).padStart(2,'0')}-${String(parts[2]).padStart(2,'0')}`;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? s.split(' ')[0] : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  } catch (e) { return String(rawDateStr).split(' ')[0]; }
}

// 直立模式：展開 / 收合 ADL 詳細卡片
function toggleAdlGrid(detailId, btn) {
  const detail = document.getElementById(detailId);
  if (!detail) return;
  const grid = detail.querySelector('.adl-cards-grid');
  if (!grid) return;
  const expanded = grid.classList.toggle('adl-expanded');
  if (btn) btn.textContent = expanded ? '▲ 收合評估' : '▼ 展開評估';
}

// 直立模式：側欄開關（漢堡選單）
function openSidebarMobile() {
  document.getElementById('mainSidebar')?.classList.add('sidebar-open');
  document.getElementById('sidebarOverlay')?.classList.add('active');
}
function closeSidebarMobile() {
  document.getElementById('mainSidebar')?.classList.remove('sidebar-open');
  document.getElementById('sidebarOverlay')?.classList.remove('active');
}

function showSidebarLoading() {
  DOM.patientListContainer.innerHTML = `<div style="text-align:center; padding: 20px;">資料載入中...</div>`;
}

function showEmptyState() {
  DOM.emptyStateView.style.display = 'flex';
  DOM.detailPanelView.style.display = 'none';
}

function selectPatient(chartId) {
  activePatientId = chartId;
  document.querySelectorAll('.patient-card').forEach(card => card.classList.toggle('active', card.getAttribute('data-id') === chartId));
  // 直立模式下選取病患後自動收合側欄
  if (window.innerWidth < 768) closeSidebarMobile();
  const patient = globalPatients.find(p => p.chartId === chartId);
  if (!patient) return;
  DOM.emptyStateView.style.display = 'none';
  DOM.detailPanelView.style.display = 'flex';
  DOM.patientName.textContent = patient.name;
  DOM.patientGenderAge.textContent = `${patient.gender || '--'} | ${patient.age} 歲`;
  DOM.patientChartId.textContent = patient.rawChartId || '';
  DOM.patientContactPhone.textContent = `電話：${patient.phone || '--'}`;
  DOM.initOnset.textContent = patient.onsetKeywords || '無';
  DOM.initAntibody.textContent = patient.antibodyStatus || '無';
  DOM.initMeds.textContent = patient.medications || '無';
  updateChart(patient);
  renderTimeline(patient);
}

function updateChart(patient) {
  const ctx = document.getElementById('mgAdlTrendChart').getContext('2d');
  if (mgAdlChartInstance) mgAdlChartInstance.destroy();
  // 只顯示有實際 ADL 分數的紀錄（排除純OPD登錄的零分項）
  const history = (patient.history || []).filter(h => h.totalScore > 0 || Object.values(h.details || {}).some(v => v > 0));
  if (history.length === 0) return;
  mgAdlChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: history.map(h => normalizeDate(h.timestamp)),
      datasets: [{
        label: 'MG-ADL 總分',
        data: history.map(h => h.totalScore),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.08)',
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: '#6366f1',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }   // 單一資料集不需要 legend
      },
      scales: {
        y: { beginAtZero: true, max: 24, ticks: { stepSize: 4 } }
      }
    }
  });
}

// 統一日期格式為 YYYY-MM-DD（解決 2026/6/2 與 2026-06-02 不一致的問題）
function normalizeDate(dateStr) {
  if (!dateStr || dateStr === '無日期') return dateStr;
  const s = String(dateStr).trim().replace(/\//g, '-');
  const parts = s.split('-');
  if (parts.length === 3) {
    return `${parts[0]}-${String(parseInt(parts[1])).padStart(2, '0')}-${String(parseInt(parts[2])).padStart(2, '0')}`;
  }
  return dateStr;
}

function renderTimeline(patient) {
  const list = DOM.evalTimelineList;
  list.innerHTML = '';

  // 顯示編輯按鈕
  DOM.btnEditPatient.style.display = 'inline-flex';

  // 更新初診視窗欄位（在 baselineModal 內）
  DOM.initOnset.textContent = patient.onsetKeywords || '無';
  DOM.initAntibody.textContent = patient.antibodyStatus || '無';
  DOM.initMeds.textContent = patient.medications || '無';
  DOM.initThymusDetail.textContent = patient.thymectomyStatus || '無';
  DOM.initNotes.textContent = patient.clinicalNotes || '無';
  const baselineEl = document.getElementById('initAntibodyBaseline');
  if (baselineEl) {
    if (patient.initAntibodyIndex) {
      baselineEl.textContent = patient.initAntibodyDate
        ? `${patient.initAntibodyIndex}  (${normalizeDate(patient.initAntibodyDate)})`
        : patient.initAntibodyIndex;
    } else {
      baselineEl.textContent = '--';
    }
  }

  // 更新 Ach 抗體趨勢摘要
  updateAchSummary(patient);

  const history = [...(patient.history || [])].reverse(); // 最新在上

  if (history.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-muted); font-size:var(--font-sm);">尚無評估記錄</div>`;
    return;
  }

  let customVisits = JSON.parse(localStorage.getItem('mg_custom_visits') || '[]');
  if (localOverrides['_system_custom_visits']) {
    const localVisits = localOverrides['_system_custom_visits'];
    customVisits = customVisits.filter(cv => !localVisits.some(lv => lv.chartId === cv.chartId && normalizeDate(lv.timestamp) === normalizeDate(cv.timestamp)));
    customVisits = customVisits.concat(localVisits);
  }
  const customSet = new Set(customVisits.map(cv => `${cv.chartId}::${cv.timestamp}`));

  // ── 按日期分組（統一格式後合併，解決 2026/6/2 vs 2026-06-02 不一致）──
  const dateMap = new Map();
  history.forEach(entry => {
    const key = normalizeDate(entry.timestamp);  // ← 統一格式作為 key
    if (!dateMap.has(key)) dateMap.set(key, []);
    dateMap.get(key).push(entry);
  });

  Array.from(dateMap.entries()).forEach(([date, entries], groupIdx) => {
    // formEntry = 來自表單的填寫（非純OPD），不論分數高低
    const formEntry  = entries.find(e => !e._opdOnly);
    const opdEntry   = entries.find(e => customSet.has(`${e.chartId}::${normalizeDate(e.timestamp)}`));
    const primary    = formEntry || entries[0];
    // 藥物資料優先從 OPD entry 取，若已合併到 formEntry 也直接取
    const medSource  = (formEntry?.medications) ? formEntry : (opdEntry || primary);

    const isOpdOnly  = !formEntry && !!opdEntry;   // 純 OPD，無表單 ADL
    const hasMed     = !!medSource.medications;
    const hasAdl     = !!formEntry;                // 有表單資料就顯示，即使全是 0 分
    const detailId   = `tl-detail-${groupIdx}`;
    const isTodayCard = isToday(date);

    const scoreColor = primary.totalScore >= 15 ? 'var(--score-severe)' : primary.totalScore >= 8 ? 'var(--score-moderate)' : primary.totalScore >= 3 ? 'var(--score-mild)' : 'var(--score-normal)';

    // ── 藥物清單 ──
    const meds = medSource.medications;
    const medLines = [];
    if (meds) {
      if (meds.mestinon?.dose && meds.mestinon.dose !== '0#' && meds.mestinon.freq) medLines.push(`大力丸 (Mestinon) ${meds.mestinon.dose} ${meds.mestinon.freq}`);
      if (meds.prednisolone?.freq) medLines.push(`類固醇 (Prednisolone) ${meds.prednisolone.dose}${meds.prednisolone.dose2 ? ' / ' + meds.prednisolone.dose2 : ''} ${meds.prednisolone.freq}`);
      if (meds.imuran?.dose && meds.imuran.dose !== '0#' && meds.imuran.freq) medLines.push(`移護寧 (Imuran) ${meds.imuran.dose} ${meds.imuran.freq}`);
      if (meds.tacrolimus?.dose && meds.tacrolimus.dose !== '0#' && meds.tacrolimus.freq) medLines.push(`普樂可復 (Tacrolimus) ${meds.tacrolimus.dose} ${meds.tacrolimus.freq}`);
      if (meds.cellcept?.dose && meds.cellcept.dose !== '0#' && meds.cellcept.freq) medLines.push(`山喜多 (Cellcept) ${meds.cellcept.dose} ${meds.cellcept.freq}`);
    }

    // ── MG-ADL 分項卡片（左欄1-4，右欄5-8，圓形徽章）──
    const makeAdlCard = ([key, metric]) => {
      const score = primary.details?.[key] ?? 0;
      const badgeBg = score >= 3 ? '#ff4d4f' : score >= 2 ? '#fa8c16' : score >= 1 ? '#faad14' : '#52c41a';
      const label = metric.labels[score] || `${score}`;
      return `
        <div style="background:#fff; border:1px solid #e8e8e8; border-radius:14px; padding:14px 16px; display:flex; justify-content:space-between; align-items:center; gap:12px; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <div style="flex:1; min-width:0;">
            <div style="font-size:var(--font-sm); font-weight:700; color:var(--text-primary); margin-bottom:4px;">${metric.name}</div>
            <div style="font-size:var(--font-xs); color:var(--text-secondary); line-height:1.4;">${label}</div>
          </div>
          <div style="width:36px; height:36px; border-radius:50%; background:${badgeBg}; color:#fff; font-size:16px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${score}</div>
        </div>`;
    };
    const allMetrics = Object.entries(MG_ADL_METRICS);

    // ── MG-ADL 總分摘要橫幅（含直立模式展開按鈕）──
    const severityLabel = primary.totalScore >= 15 ? '重度' : primary.totalScore >= 8 ? '中度' : primary.totalScore >= 3 ? '輕度' : '正常';
    const mgScoreBannerHtml = hasAdl ? `
      <div style="display:flex; align-items:center; gap:12px; background:var(--primary-light); border:1px solid rgba(99,102,241,0.25); border-radius:12px; padding:10px 16px; margin-bottom:12px; flex-wrap:wrap;">
        <span style="font-size:13px; font-weight:700; color:var(--primary);">MG-ADL 總分</span>
        <span style="background:${scoreColor}; color:#fff; padding:3px 16px; border-radius:12px; font-size:18px; font-weight:800;">${primary.totalScore} / 24</span>
        <span style="font-size:13px; color:var(--text-muted); font-weight:600;">${severityLabel}</span>
        <button class="adl-detail-toggle" onclick="toggleAdlGrid('${detailId}', this)">▼ 展開評估</button>
      </div>` : '';

    // ── 直立模式：緊湊列表（每題一列，badge + 名稱 + 描述）──
    const makeCompactItem = ([key, metric], idx) => {
      const score = primary.details?.[key] ?? 0;
      const bg = score >= 3 ? '#ff4d4f' : score >= 2 ? '#fa8c16' : score >= 1 ? '#faad14' : '#52c41a';
      return `<div class="adl-compact-item">
        <span style="width:24px;height:24px;border-radius:50%;background:${bg};color:#fff;font-size:12px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${score}</span>
        <span style="font-size:12px;font-weight:700;color:var(--text-primary);flex:1;">${idx+1}. ${metric.name}</span>
        <span style="font-size:11px;color:var(--text-muted);white-space:nowrap;">${metric.labels[score] || score}</span>
      </div>`;
    };
    const adlCompactHtml = hasAdl ? `
      <div class="adl-compact-grid" ${hasMed ? 'style="margin-top:8px;"' : ''}>
        ${allMetrics.map((m, i) => makeCompactItem(m, i)).join('')}
      </div>` : '';

    // ── 全尺寸 ADL 卡片（橫向預設顯示；直立模式預設隱藏，展開後顯示）──
    const adlCardsHtml = hasAdl ? `
      <div class="adl-cards-grid" ${hasMed ? 'style="margin-top:12px;"' : ''}>
        <div style="display:flex; flex-direction:column; gap:10px;">${allMetrics.slice(0,4).map(makeAdlCard).join('')}</div>
        <div style="display:flex; flex-direction:column; gap:10px;">${allMetrics.slice(4,8).map(makeAdlCard).join('')}</div>
      </div>` : '';

    // ── 門診處方區塊（新設計：pill 徽章 + 右欄抗體/PIS）── 有 OPD 資料時顯示
    const pisEntry = medSource.mgfaPis;
    const pisColor = pisEntry?.change === 'Improved' ? '#059669' : pisEntry?.change === 'Worse' ? '#dc2626' : pisEntry?.change === 'Exacerbation' ? '#7c3aed' : 'var(--text-secondary)';
    const pisText  = pisEntry ? `${pisEntry.status}${pisEntry.mmValue ? ' (' + pisEntry.mmValue + ')' : ''}${pisEntry.change ? ' - ' + pisEntry.change : ''}` : null;
    const mgfaCls  = medSource.mgfaClass || primary.mgfaClass;
    const abxIdx   = medSource.antibodyIndex || primary.antibodyIndex;
    const abxDate  = medSource.antibodyDate  || primary.antibodyDate;

    const opdBlockHtml = hasMed ? `
      <div style="background:#f5f3ff; border:1px solid #ddd6fe; border-radius:14px; padding:16px; ${hasAdl ? 'margin-top:16px;' : ''}">
        <div style="display:flex; align-items:center; gap:8px; color:#6366f1; font-weight:700; font-size:14px; margin-bottom:12px; padding-bottom:10px; border-bottom:1px dashed #c4b5fd;">
          <i data-lucide="stethoscope" style="width:16px; height:16px;"></i>
          門診處方與當前回診評估
          ${!!opdEntry ? `<button onclick="deleteCustomVisit('${primary.chartId}', '${primary.timestamp}')" style="margin-left:auto; background:none; border:none; cursor:pointer; color:#ef4444; font-size:12px; font-weight:600; padding:2px 8px; border-radius:6px; border:1px solid #fca5a5;" title="刪除此筆本機紀錄">✕ 刪除</button>` : ''}
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:start;">
          <div>
            <div style="font-size:11px; color:var(--text-muted); font-weight:600; margin-bottom:8px;">💊 當次隨訪處方用藥：</div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${medLines.length > 0
                ? medLines.map(m => `<div style="display:inline-flex; align-items:center; background:#ede9fe; color:#5b21b6; padding:6px 12px; border-radius:20px; font-size:13px; font-weight:600;">${m}</div>`).join('')
                : `<span style="font-size:13px; color:var(--text-muted);">無用藥紀錄</span>`}
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="font-size:14px; color:var(--text-primary);"><strong>抗體指數：</strong>${abxIdx ? `${abxIdx}${abxDate ? ' (' + abxDate + ')' : ''}` : '未檢測'}</div>
            <div style="font-size:14px; color:var(--text-primary); display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <strong>MGFA分期：</strong>
              ${mgfaCls ? `<span style="background:#ede9fe; color:#5b21b6; padding:3px 12px; border-radius:12px; font-size:12px; font-weight:700;">${mgfaCls}</span>` : '<span style="color:var(--text-muted);">--</span>'}
            </div>
            ${pisText ? `<div style="font-size:14px; font-weight:700; color:${pisColor};"><strong style="color:var(--text-primary);">介入後狀態(PIS)：</strong>${pisText}</div>` : ''}
          </div>
        </div>
      </div>
    ` : '';

    // ── 組合卡片 ──
    const card = document.createElement('div');
    card.style.cssText = 'border:1px solid var(--border-color); border-radius:var(--radius-md); margin-bottom:10px; overflow:hidden; background:var(--bg-card);';
    card.innerHTML = `
      <div onclick="toggleTimelineCard('${detailId}')" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; cursor:pointer; background:var(--bg-input); user-select:none;">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <i data-lucide="calendar" style="width:16px; height:16px; color:var(--primary);"></i>
          <span style="font-size:var(--font-sm); font-weight:700; color:var(--text-primary);">${date} 門診回診</span>
          ${hasMed && !isOpdOnly ? `<span style="font-size:10px; color:var(--primary); border:1px solid rgba(99,102,241,0.35); border-radius:4px; padding:1px 6px; background:var(--primary-light);">含OPD處方</span>` : ''}
          ${isOpdOnly ? `<span style="font-size:10px; color:#059669; border:1px solid #6ee7b7; border-radius:4px; padding:1px 6px; background:#ecfdf5;">僅OPD登錄</span>` : ''}
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:12px; color:var(--text-muted);">評估人: ${primary.evaluator}</span>
          ${hasAdl
            ? `<div style="width:34px; height:34px; border-radius:50%; background:${scoreColor}; color:#fff; font-size:15px; font-weight:800; display:flex; align-items:center; justify-content:center;" title="MG-ADL 總分">${primary.totalScore}</div>`
            : `<div style="width:34px; height:34px; border-radius:50%; background:#e0e7ff; color:#6366f1; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center;" title="無 ADL 評分">OPD</div>`}
          <i data-lucide="chevron-down" style="width:16px; height:16px; color:var(--text-muted); transition:transform 0.2s; ${isTodayCard ? 'transform:rotate(180deg);' : ''}"></i>
        </div>
      </div>
      <div id="${detailId}" style="display:${isTodayCard ? 'block' : 'none'}; padding:16px; background:var(--bg-app);">
        ${mgScoreBannerHtml}
        ${adlCompactHtml}
        ${adlCardsHtml}
        ${opdBlockHtml}
        ${primary.notes ? `
        <div style="margin-top:12px; background:#fafafa; border:1px solid var(--border-color); border-radius:10px; padding:10px 14px; display:flex; gap:8px; align-items:flex-start;">
          <i data-lucide="notebook-pen" style="width:14px; height:14px; color:var(--text-muted); flex-shrink:0; margin-top:2px;"></i>
          <div>
            <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:4px;">備註</div>
            <div style="font-size:13px; color:var(--text-primary); line-height:1.6; white-space:pre-wrap;">${primary.notes}</div>
          </div>
        </div>` : ''}
      </div>
    `;
    list.appendChild(card);
  });

  lucide.createIcons();
}

// 切換時間軸卡片展開/收合
function toggleTimelineCard(detailId) {
  const el = document.getElementById(detailId);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// 刪除本機自訂隨訪紀錄
function deleteCustomVisit(chartId, timestamp) {
  if (!confirm('確定要刪除此筆本機登錄的隨訪記錄嗎？')) return;
  let customVisits = JSON.parse(localStorage.getItem('mg_custom_visits') || '[]');
  customVisits = customVisits.filter(cv => !(cv.chartId === chartId && cv.timestamp === timestamp));
  localStorage.setItem('mg_custom_visits', JSON.stringify(customVisits));

  if (localOverrides['_system_custom_visits']) {
    localOverrides['_system_custom_visits'] = localOverrides['_system_custom_visits'].filter(
      cv => !(cv.chartId === chartId && cv.timestamp === timestamp)
    );
    writeLocalDb();
  }
  loadConfigAndData();
}

// 更新 Ach 抗體趨勢摘要欄
function updateAchSummary(patient) {
  // Collect history-based antibody entries
  const historyEntries = patient.history
    .filter(h => h.antibodyIndex)
    .map(h => ({ date: normalizeDate(h.antibodyDate || h.timestamp), value: h.antibodyIndex }));

  // Prepend the initial antibody record if set, and not already covered by history
  if (patient.initAntibodyIndex && patient.initAntibodyDate) {
    const initDate = normalizeDate(patient.initAntibodyDate);
    if (!historyEntries.some(e => e.date === initDate)) {
      historyEntries.unshift({ date: initDate, value: patient.initAntibodyIndex, isInit: true });
    }
  }

  // Sort chronologically, keep last 5
  historyEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
  const entries = historyEntries.slice(-5);

  const container = document.getElementById('achSummaryList');
  if (!container) return;

  if (entries.length === 0) {
    container.innerHTML = '<span style="font-size:16px; color:var(--text-muted); font-weight:600;">沒有近期的 Ach 資料</span>';
    return;
  }
  container.innerHTML = entries.map(e =>
    `<span style="display:flex; align-items:center; gap:6px;">
      <span style="font-size:13px; color:${e.isInit ? 'var(--primary)' : 'var(--text-secondary)'}; font-weight:600;">${e.date}${e.isInit ? ' (初診)' : ''}</span>
      <strong style="font-size:20px; color:var(--primary);">${e.value}</strong>
    </span>`
  ).join('<span style="font-size:18px; color:var(--text-muted); margin:0 4px;">→</span>');
}

// ==========================================
// 13. 設置對話框控制模組 (Config Modal Settings)
// ==========================================
function openConfigModal() {
  DOM.configModal.classList.add('open');
}

function closeConfigModal() {
  DOM.configModal.classList.remove('open');
}

function saveConfig() {
  const sheetId = DOM.inputSheetId.value.trim();
  const initSheetName = DOM.inputInitialSheetName.value.trim() || '初診資訊';
  const adlSheetName = DOM.inputAdlSheetName.value.trim() || 'MG-ADL';

  localStorage.setItem('mg_sheet_id', sheetId);
  localStorage.setItem('mg_initial_sheet', initSheetName);
  localStorage.setItem('mg_adl_sheet', adlSheetName);

  closeConfigModal();
  loadConfigAndData();
}

function resetConfigToDemo() {
  if (confirm("🔄 您確定要還原為系統內建的【Demo 模擬測試數據】嗎？\n這將會清除您目前設定的 Google 試算表 ID。")) {
    DOM.inputSheetId.value = '';
    localStorage.removeItem('mg_sheet_id');
    closeConfigModal();
    loadConfigAndData();
  }
}

// ==========================================
// 14. 本地編輯儲存機制 (File System Access API & IndexedDB)
// ==========================================

// IndexedDB 工具：用來儲存 File System Access API 的 Handle
const idb = {
  dbName: 'MGCenterDB',
  storeName: 'FileHandles',
  init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = e => {
        e.target.result.createObjectStore(this.storeName);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  async get(key) {
    const db = await this.init();
    return new Promise(resolve => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
    });
  },
  async set(key, val) {
    const db = await this.init();
    return new Promise(resolve => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.put(val, key);
      tx.oncomplete = () => resolve();
    });
  }
};

// 驗證檔案權限
async function verifyPermission(fileHandle, readWrite) {
  const options = {};
  if (readWrite) options.mode = 'readwrite';
  if ((await fileHandle.queryPermission(options)) === 'granted') return true;
  if ((await fileHandle.requestPermission(options)) === 'granted') return true;
  return false;
}

// 從 Handle 讀取資料並更新 UI，同步更新 localStorage 快取
async function loadDataFromFileHandle(fileHandle) {
  const file = await fileHandle.getFile();
  const text = await file.text();
  localOverrides = text ? JSON.parse(text) : {};
  localStorage.setItem('mg_local_db_cache', text);            // ← 快取到 localStorage
  localStorage.setItem('mg_local_db_filename', file.name);    // ← 記住檔名
  setLocalDbConnectedUI(file.name);
}

function setLocalDbConnectedUI(filename) {
  DOM.txtLocalDbStatus.textContent = '已連接: ' + filename;
  DOM.btnConnectLocalDb.style.backgroundColor = '#f6ffed';
  DOM.btnConnectLocalDb.style.borderColor = '#b7eb8f';
  DOM.btnConnectLocalDb.style.color = '#389e0d';
}

// 頁面載入時從 localStorage 快取還原資料
async function initLocalDb() {
  // 本機模式：直接從 localStorage 讀取，不依賴 File System Access API
  const cached = localStorage.getItem('mg_patient_overrides');
  if (cached) {
    try {
      localOverrides = JSON.parse(cached);
      console.log('[initLocalDb] 已從 localStorage 讀取病患艣覆資料');
    } catch (e) {
      console.error('[initLocalDb] localStorage 讀取失敗', e);
      localOverrides = {};
    }
  }
  // 同步讀取 custom visits
  const cachedVisits = localStorage.getItem('mg_custom_visits');
  if (cachedVisits) {
    try { JSON.parse(cachedVisits); } catch(e) { localStorage.removeItem('mg_custom_visits'); }
  }
}


// 偵測瀏覽器是否支援 File System Access API
const hasFSA = typeof window.showOpenFilePicker === 'function';

// 連接/重新授權本地 JSON 檔案
function showCustomConfirm(msg, okLabel, cancelLabel) {
  return new Promise(resolve => {
    const mask = document.getElementById('customConfirmMask');
    document.getElementById('customConfirmMsg').textContent = msg;
    document.getElementById('customConfirmOk').textContent = okLabel;
    document.getElementById('customConfirmCancel').textContent = cancelLabel;
    mask.style.display = 'flex';
    const cleanup = result => { mask.style.display = 'none'; resolve(result); };
    document.getElementById('customConfirmOk').onclick = () => cleanup(true);
    document.getElementById('customConfirmCancel').onclick = () => cleanup(false);
  });
}

async function handleConnectLocalDb() {
  if (hasFSA) {
    // Chrome / Edge：可雙向讀寫，Handle 持久化
    try {
      if (localDbFileHandle) {
        const chooseNew = await showCustomConfirm(
          `目前已連接：${localDbFileHandle.name}`,
          '選擇其他 JSON',
          '直接讀取目前檔案'
        );
        if (!chooseNew) {
          // 重新讀取目前檔案
          if (await verifyPermission(localDbFileHandle, true)) {
            await loadDataFromFileHandle(localDbFileHandle);
            loadConfigAndData();
          }
          return;
        }
        // 清除舊 handle，讓使用者重新選擇
        localDbFileHandle = null;
        await idb.set('localDbHandle', null);
      }
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON 資料庫', accept: { 'application/json': ['.json'] } }],
        multiple: false
      });
      localDbFileHandle = fileHandle;
      await idb.set('localDbHandle', fileHandle);
      await loadDataFromFileHandle(fileHandle);
      alert('✅ 成功連接本地資料庫！\n稍後重新載入畫面將套用本地覆寫。');
      loadConfigAndData();
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('File System Access 錯誤:', err);
        alert('連線失敗: ' + err.message);
      }
    }
  } else {
    // Safari / Firefox：用傳統 input[type=file] 讀入，資料存於記憶體
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        localOverrides = text ? JSON.parse(text) : {};
        localStorage.setItem('mg_local_db_cache', text);           // ← 快取到 localStorage
        localStorage.setItem('mg_local_db_filename', file.name);   // ← 記住檔名
        setLocalDbConnectedUI(file.name);
        alert('✅ 成功載入本地備份！\n注意：此瀏覽器不支援自動回存，修改後請使用右側「↓」按鈕手動匯出備份。\n資料已快取，重新整理後會自動還原。');
        loadConfigAndData();
      } catch (err) {
        alert('❌ 讀取失敗：' + err.message);
      }
    };
    input.click();
  }
}

// 寫入變更至本機 localStorage（本機模式，不使用 File System Access API）
async function writeLocalDb() {
  try {
    const json = JSON.stringify(localOverrides, null, 2);
    localStorage.setItem('mg_patient_overrides', json);  // ← 主要持久化 key
    localStorage.setItem('mg_local_db_cache', json);     // ← 相容舊版快取
    return true;
  } catch (err) {
    console.error('寫入 localStorage 失敗', err);
    return false;
  }
}

// 開啟編輯視窗
function openNewPatientModal() {
  currentEditMode = 'new';
  DOM.editPatientModalTitle.textContent = '新增病患建檔';
  DOM.btnConfirmEditPatient.textContent = '建立並寫入本地端';

  // 清空所有欄位
  DOM.editName.value = '';
  DOM.editChartId.value = '';
  DOM.editGender.value = '男';
  DOM.editBirthdate.value = '';
  DOM.editPhone.value = '';
  DOM.editMgfaClass.value = '';
  DOM.editOnset.value = '';
  DOM.editAntibody.value = '';
  DOM.editInitAntibodyIndex.value = '';
  DOM.editInitAntibodyDate.value = '';
  DOM.editMeds.value = '';
  DOM.editThymus.value = '';
  DOM.editNotes.value = '';
  DOM.editOnsetAge.value = '';
  DOM.editOnsetSymptoms.value = '';
  DOM.editCrisisCount.value = '';
  DOM.editThymusImaging.value = '';
  DOM.editPastMeds.value = '';
  DOM.editDiagnosticTests.value = '';

  DOM.editPatientModal.classList.add('open');
}

function openEditPatientModal() {
  if (!activePatientId) return;
  const patient = globalPatients.find(p => p.chartId === activePatientId);
  if (!patient) return;

  currentEditMode = 'edit';
  DOM.editPatientModalTitle.textContent = '編輯初診建檔資料';
  DOM.btnConfirmEditPatient.textContent = '儲存並寫入本地端';

  // 填入資料 (優先填寫 overrides 的資料)
  const override = localOverrides[activePatientId] || {};

  DOM.editName.value = override.name !== undefined ? override.name : (patient.name || '');
  DOM.editChartId.value = override.chartId !== undefined ? override.chartId : (patient.rawChartId || '');
  DOM.editGender.value = override.gender !== undefined ? override.gender : (patient.gender || '男');
  DOM.editBirthdate.value = override.birthdate !== undefined ? override.birthdate : (patient.birthdate || '');
  DOM.editPhone.value = override.phone !== undefined ? override.phone : (patient.phone || '');
  DOM.editMgfaClass.value = override.mgfaClass !== undefined ? override.mgfaClass : (patient.mgfaClass || '');
  DOM.editOnset.value = override.onsetKeywords !== undefined ? override.onsetKeywords : (patient.onsetKeywords || '');
  DOM.editAntibody.value = override.antibodyStatus !== undefined ? override.antibodyStatus : (patient.antibodyStatus || '');
  DOM.editInitAntibodyIndex.value = override.initAntibodyIndex || '';
  DOM.editInitAntibodyDate.value = override.initAntibodyDate || '';
  DOM.editMeds.value = override.medications !== undefined ? override.medications : (patient.medications || '');
  DOM.editThymus.value = override.thymectomyStatus !== undefined ? override.thymectomyStatus : (patient.thymectomyStatus || '');
  DOM.editNotes.value = override.clinicalNotes !== undefined ? override.clinicalNotes : (patient.clinicalNotes || '');
  DOM.editOnsetAge.value        = override.onsetAge        !== undefined ? override.onsetAge        : (patient.onsetAge        || '');
  DOM.editOnsetSymptoms.value   = override.onsetSymptoms   !== undefined ? override.onsetSymptoms   : (patient.onsetSymptoms   || '');
  DOM.editCrisisCount.value     = override.crisisCount     !== undefined ? override.crisisCount     : (patient.crisisCount     || '');
  DOM.editThymusImaging.value   = override.thymusImaging   !== undefined ? override.thymusImaging   : (patient.thymusImaging   || '');
  DOM.editPastMeds.value        = override.pastMedications !== undefined ? override.pastMedications : (patient.pastMedications || '');
  DOM.editDiagnosticTests.value = override.diagnosticTests !== undefined ? override.diagnosticTests : (patient.diagnosticTests || '');

  DOM.editPatientModal.classList.add('open');
}

function closeEditPatientModal() {
  DOM.editPatientModal.classList.remove('open');
}

// 刪除病患
async function deletePatient() {
  if (!activePatientId) return;
  const patient = globalPatients.find(p => p.chartId === activePatientId);
  const name = patient?.name || activePatientId;
  const confirmed = await showCustomConfirm(
    `確定要刪除「${name}」嗎？\n此操作將從本地名單中移除，無法復原。`,
    '確定刪除',
    '取消'
  );
  if (!confirmed) return;

  const existing = localOverrides[activePatientId] || {};
  localOverrides[activePatientId] = { ...existing, _deleted: true };
  const success = await writeLocalDb();
  if (success) {
    closeEditPatientModal();
    activePatientId = null;
    DOM.detailPanelView.style.display = 'none';
    DOM.emptyStateView.style.display = 'flex';
    loadConfigAndData();
  }
}

// 儲存編輯 / 新增病患
async function saveEditPatient() {
  const name = DOM.editName.value.trim();
  const rawChartId = DOM.editChartId.value.trim();
  const birthdate = DOM.editBirthdate.value.trim();

  if (!name) { alert('請填寫姓名'); return; }

  const data = {
    name,
    chartId: rawChartId,
    gender: DOM.editGender.value,
    birthdate,
    phone: DOM.editPhone.value.trim(),
    mgfaClass: DOM.editMgfaClass.value.trim(),
    onsetKeywords: DOM.editOnset.value.trim(),
    antibodyStatus: DOM.editAntibody.value.trim(),
    initAntibodyIndex: DOM.editInitAntibodyIndex.value.trim(),
    initAntibodyDate: DOM.editInitAntibodyDate.value.trim(),
    medications: DOM.editMeds.value.trim(),
    thymectomyStatus: DOM.editThymus.value.trim(),
    clinicalNotes:    DOM.editNotes.value.trim(),
    onsetAge:         DOM.editOnsetAge.value.trim(),
    onsetSymptoms:    DOM.editOnsetSymptoms.value.trim(),
    crisisCount:      DOM.editCrisisCount.value.trim(),
    thymusImaging:    DOM.editThymusImaging.value.trim(),
    pastMedications:  DOM.editPastMeds.value.trim(),
    diagnosticTests:  DOM.editDiagnosticTests.value.trim()
  };

  if (currentEditMode === 'new') {
    // 決定本地 key：優先用病歷號，否則用 姓名_生日，否則只用姓名
    const key = rawChartId || (name && birthdate ? `${name}_${birthdate.replace(/\//g, '-')}` : name);
    if (localOverrides[key]) {
      if (!confirm(`「${key}」已存在，要覆蓋嗎？`)) return;
    }
    data._localPatient = true;  // 標記為純本地建立的病患
    data.registrationDate = new Date().toISOString(); // 記錄建檔時間，讓今日門診可顯示
    localOverrides[key] = data;
  } else {
    if (!activePatientId) return;
    // 保留 _localPatient 標記（若原本就是本地建立的）
    if (localOverrides[activePatientId]?._localPatient) data._localPatient = true;
    localOverrides[activePatientId] = data;
  }

  const success = await writeLocalDb();
  if (success) {
    alert(currentEditMode === 'new' ? '✅ 病患建立成功！' : '✅ 儲存成功！');
    closeEditPatientModal();
    loadConfigAndData();
  }
}

// ==========================================
// 7. 側邊欄錯誤提示
// ==========================================
function showSidebarError(msg) {
  DOM.patientListContainer.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--score-severe); text-align:center; padding:24px; gap:8px;">
      <i data-lucide="alert-circle" style="width:32px; height:32px;"></i>
      <p style="font-size:var(--font-sm); font-weight:600;">${msg}</p>
    </div>
  `;
  lucide.createIcons();
}

// ==========================================
// 8. Chip 選擇群組初始化
// ==========================================
function initChipGroups() {
  document.querySelectorAll('.chip-grid').forEach(grid => {
    grid.addEventListener('click', e => {
      const chip = e.target.closest('.chip-choice');
      if (!chip) return;
      grid.querySelectorAll('.chip-choice').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      // MM 子選項顯示控制
      if (grid.id === 'chipGroupMgfaPis') {
        const mmGroup = document.getElementById('mmValueSubGroup');
        if (mmGroup) mmGroup.style.display = chip.dataset.value === 'MM' ? 'block' : 'none';
      }

      // 若為 ADL 評分項目，即時計算總分
      if (grid.dataset.adl === 'true') {
        let sum = 0;
        document.querySelectorAll('.adl-chip-grid').forEach(adlGrid => {
          const active = adlGrid.querySelector('.chip-choice.active');
          if (active) sum += parseInt(active.dataset.value || 0);
        });
        const totalSpan = document.getElementById('drawerAdlTotal');
        if (totalSpan) totalSpan.textContent = sum;
      }
    });
  });
}

// 取得指定 chip-grid 中 active chip 的 value
function getActiveChipValue(gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return '';
  const active = grid.querySelector('.chip-choice.active');
  return active ? (active.dataset.value || '') : '';
}

// ==========================================
// 9. 門診隨訪抽屜 (Follow-Up Drawer)
// ==========================================
function openFollowUpDrawer() {
  if (!activePatientId) return;
  const patient = globalPatients.find(p => p.chartId === activePatientId);
  if (!patient) return;

  DOM.drawerPatientName.value = patient.name;
  DOM.drawerPatientChartId.value = patient.rawChartId || patient.chartId;
  DOM.inputFollowUpDate.value = new Date().toISOString().split('T')[0];
  DOM.inputAntibodyDate.value = '';
  DOM.inputAntibodyIndex.value = '';
  DOM.inputPrednisoloneDose.value = '';
  DOM.inputPrednisoloneDose2.value = '';

  // 重置 chip：藥物類 → 第一個（停藥/無）；MGFA 分期、PIS、ADL → 不設預設，避免誤送出
  const noDefaultGridIds = new Set([
    'chipGroupMgfaPis', 'chipGroupDrawerMgfaClass',
    'drawerAdlQ1','drawerAdlQ2','drawerAdlQ3','drawerAdlQ4',
    'drawerAdlQ5','drawerAdlQ6','drawerAdlQ7','drawerAdlQ8'
  ]);
  document.querySelectorAll('.chip-grid').forEach(grid => {
    if (noDefaultGridIds.has(grid.id)) {
      grid.querySelectorAll('.chip-choice').forEach(c => c.classList.remove('active'));
    } else {
      grid.querySelectorAll('.chip-choice').forEach((c, i) => c.classList.toggle('active', i === 0));
    }
  });
  const mmGroup = document.getElementById('mmValueSubGroup');
  if (mmGroup) mmGroup.style.display = 'none';

  // 重置 ADL 總分與備註
  const totalSpan = document.getElementById('drawerAdlTotal');
  if (totalSpan) totalSpan.textContent = '0';
  const notesInput = document.getElementById('inputFollowUpNotes');
  if (notesInput) notesInput.value = '';

  // ── 若當天已有記錄，自動帶入（方便教授修改錯誤） ──
  const todayDate = DOM.inputFollowUpDate.value;
  const allVisits = JSON.parse(localStorage.getItem('mg_custom_visits') || '[]');
  const existing = allVisits.find(cv =>
    cv.chartId === activePatientId && normalizeDate(cv.timestamp) === normalizeDate(todayDate)
  );
  if (existing) prefillFollowUpForm(existing);

  DOM.followUpDrawer.classList.add('open');
}

function closeFollowUpDrawer() {
  DOM.followUpDrawer.classList.remove('open');
}

// 設定指定 chip-grid 的 active 值
function setActiveChip(gridId, value) {
  const grid = document.getElementById(gridId);
  if (!grid || value === undefined || value === null) return;
  grid.querySelectorAll('.chip-choice').forEach(c => c.classList.remove('active'));
  const chip = grid.querySelector(`[data-value="${value}"]`);
  if (chip) chip.classList.add('active');
}

// 以已存記錄預填表單（當天重新開啟時方便修改）
function prefillFollowUpForm(cv) {
  // ADL 8 題
  const adlKeys = ['q1_talking','q2_chewing','q3_swallowing','q4_breathing','q5_brushing','q6_arising','q7_doublevision','q8_eyeliddroop'];
  adlKeys.forEach((key, i) => {
    const val = cv.details?.[key] ?? 0;
    const grid = document.getElementById(`drawerAdlQ${i + 1}`);
    if (!grid) return;
    grid.querySelectorAll('.chip-choice').forEach(c => c.classList.remove('active'));
    const chip = grid.querySelector(`[data-value="${val}"]`);
    if (chip) chip.classList.add('active');
  });
  // 更新 ADL 總分顯示
  let adlSum = 0;
  document.querySelectorAll('.adl-chip-grid').forEach(g => {
    const a = g.querySelector('.chip-choice.active');
    if (a) adlSum += parseInt(a.dataset.value || 0);
  });
  const totalSpan = document.getElementById('drawerAdlTotal');
  if (totalSpan) totalSpan.textContent = adlSum;

  // 藥物 chips & inputs
  const meds = cv.medications;
  if (meds) {
    setActiveChip('chipGroupMestinonDose', meds.mestinon?.dose);
    setActiveChip('chipGroupMestinonFreq', meds.mestinon?.freq);
    DOM.inputPrednisoloneDose.value  = (meds.prednisolone?.dose  || '').replace('#', '');
    DOM.inputPrednisoloneDose2.value = (meds.prednisolone?.dose2 || '').replace('#', '');
    setActiveChip('chipGroupPrednisoloneFreq', meds.prednisolone?.freq);
    setActiveChip('chipGroupImuranDose',       meds.imuran?.dose);
    setActiveChip('chipGroupImuranFreq',       meds.imuran?.freq);
    setActiveChip('chipGroupTacrolimusDose',   meds.tacrolimus?.dose);
    setActiveChip('chipGroupTacrolimusFreq',   meds.tacrolimus?.freq);
    setActiveChip('chipGroupCellceptDose',     meds.cellcept?.dose);
    setActiveChip('chipGroupCellceptFreq',     meds.cellcept?.freq);
  }
  // MGFA PIS / 分期
  if (cv.mgfaPis?.status) setActiveChip('chipGroupMgfaPis', cv.mgfaPis.status);
  setActiveChip('chipGroupDrawerMgfaClass', cv.mgfaClass);
  // 抗體
  DOM.inputAntibodyDate.value  = cv.antibodyDate  || '';
  DOM.inputAntibodyIndex.value = cv.antibodyIndex || '';
  // 備註
  const notesInput = document.getElementById('inputFollowUpNotes');
  if (notesInput) notesInput.value = cv.notes || '';
}

async function saveFollowUpRecord() {
  if (!activePatientId) return;

  const followUpDate = DOM.inputFollowUpDate.value;
  if (!followUpDate) {
    alert('請填寫隨訪日期！');
    return;
  }

  const medications = {
    mestinon: {
      dose: getActiveChipValue('chipGroupMestinonDose'),
      freq: getActiveChipValue('chipGroupMestinonFreq')
    },
    prednisolone: {
      dose: DOM.inputPrednisoloneDose.value.trim() ? DOM.inputPrednisoloneDose.value.trim() + '#' : '0#',
      dose2: DOM.inputPrednisoloneDose2.value.trim() ? DOM.inputPrednisoloneDose2.value.trim() + '#' : '',
      freq: getActiveChipValue('chipGroupPrednisoloneFreq')
    },
    imuran: {
      dose: getActiveChipValue('chipGroupImuranDose'),
      freq: getActiveChipValue('chipGroupImuranFreq')
    },
    tacrolimus: {
      dose: getActiveChipValue('chipGroupTacrolimusDose'),
      freq: getActiveChipValue('chipGroupTacrolimusFreq')
    },
    cellcept: {
      dose: getActiveChipValue('chipGroupCellceptDose'),
      freq: getActiveChipValue('chipGroupCellceptFreq')
    }
  };

  const pisStatus = getActiveChipValue('chipGroupMgfaPis');
  // 新格式：平鋪單選， pisStatus 直接就是完整狀態字串
  const mgfaPis = pisStatus ? { status: pisStatus } : null;

  const newMgfaClass = getActiveChipValue('chipGroupDrawerMgfaClass');

  // 組成處方文字
  const medParts = [];
  if (medications.mestinon.dose !== '0#' && medications.mestinon.freq) medParts.push(`大力丸 (Mestinon) ${medications.mestinon.dose} ${medications.mestinon.freq}`);
  if (medications.prednisolone.freq) {
    const d2 = medications.prednisolone.dose2 ? ' / 隔日 ' + medications.prednisolone.dose2 : '';
    medParts.push(`類固醇 (Prednisolone) ${medications.prednisolone.dose}${d2} ${medications.prednisolone.freq}`);
  }
  if (medications.imuran.dose !== '0#' && medications.imuran.freq) medParts.push(`移護寧 (Imuran) ${medications.imuran.dose} ${medications.imuran.freq}`);
  if (medications.tacrolimus.dose !== '0#' && medications.tacrolimus.freq) medParts.push(`普樂可復 (Tacrolimus) ${medications.tacrolimus.dose} ${medications.tacrolimus.freq}`);
  if (medications.cellcept.dose !== '0#' && medications.cellcept.freq) medParts.push(`山喜多 (Cellcept) ${medications.cellcept.dose} ${medications.cellcept.freq}`);

  const patient = globalPatients.find(p => p.chartId === activePatientId);

  const q1 = parseInt(getActiveChipValue('drawerAdlQ1') || 0);
  const q2 = parseInt(getActiveChipValue('drawerAdlQ2') || 0);
  const q3 = parseInt(getActiveChipValue('drawerAdlQ3') || 0);
  const q4 = parseInt(getActiveChipValue('drawerAdlQ4') || 0);
  const q5 = parseInt(getActiveChipValue('drawerAdlQ5') || 0);
  const q6 = parseInt(getActiveChipValue('drawerAdlQ6') || 0);
  const q7 = parseInt(getActiveChipValue('drawerAdlQ7') || 0);
  const q8 = parseInt(getActiveChipValue('drawerAdlQ8') || 0);
  const totalScore = q1 + q2 + q3 + q4 + q5 + q6 + q7 + q8;

  const notes = document.getElementById('inputFollowUpNotes').value.trim();

  const newVisit = {
    chartId: activePatientId,
    timestamp: followUpDate,
    evaluator: '門診教授',
    totalScore: totalScore,
    details: { q1_talking: q1, q2_chewing: q2, q3_swallowing: q3, q4_breathing: q4, q5_brushing: q5, q6_arising: q6, q7_doublevision: q7, q8_eyeliddroop: q8 },
    patientName: patient ? patient.name : '',
    patientBirthdate: patient ? (patient.birthdate || '') : '',
    antibodyDate: DOM.inputAntibodyDate.value.trim(),
    antibodyIndex: DOM.inputAntibodyIndex.value.trim(),
    medications,
    mgfaPis,
    mgfaClass: newMgfaClass,
    notes: notes
  };

  // 更新病患 override（MGFA 分期、處方摘要）
  if (!localOverrides[activePatientId]) localOverrides[activePatientId] = {};
  if (newMgfaClass) localOverrides[activePatientId].mgfaClass = newMgfaClass; // 未選擇則保留舊值
  localOverrides[activePatientId].medications = medParts.length > 0 ? medParts.join('\n') : '無用藥處方';

  // 存入 localStorage
  let customVisits = JSON.parse(localStorage.getItem('mg_custom_visits') || '[]');
  const existIdx = customVisits.findIndex(cv => cv.chartId === newVisit.chartId && cv.timestamp === newVisit.timestamp);
  if (existIdx !== -1) customVisits[existIdx] = newVisit;
  else customVisits.push(newVisit);
  localStorage.setItem('mg_custom_visits', JSON.stringify(customVisits));

  // 若已連接本機檔案，同步寫入
  if (localDbFileHandle) {
    if (!localOverrides['_system_custom_visits']) localOverrides['_system_custom_visits'] = [];
    const lvIdx = localOverrides['_system_custom_visits'].findIndex(cv => cv.chartId === newVisit.chartId && cv.timestamp === newVisit.timestamp);
    if (lvIdx !== -1) localOverrides['_system_custom_visits'][lvIdx] = newVisit;
    else localOverrides['_system_custom_visits'].push(newVisit);
    await writeLocalDb();
  }

  closeFollowUpDrawer();
  await loadConfigAndData();
  selectPatient(activePatientId);
}

// ==========================================
// 10. 資料備份匯出與匯入
// ==========================================
function exportDataToJson() {
  const customVisits = JSON.parse(localStorage.getItem('mg_custom_visits') || '[]');
  const exportData = {
    version: '1.0',
    backupTime: new Date().toISOString(),
    customVisits,
    patientOverrides: {},
    ...localOverrides
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `雙和醫院_MG_本機處方備份_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importDataFromJson(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);

      // 合併 customVisits
      if (data.customVisits && Array.isArray(data.customVisits)) {
        let existing = JSON.parse(localStorage.getItem('mg_custom_visits') || '[]');
        data.customVisits.forEach(cv => {
          const idx = existing.findIndex(ex => ex.chartId === cv.chartId && ex.timestamp === cv.timestamp);
          if (idx !== -1) existing[idx] = cv;
          else existing.push(cv);
        });
        localStorage.setItem('mg_custom_visits', JSON.stringify(existing));
      }

      // 合併 overrides（排除 meta 欄位）
      const { version, backupTime, customVisits, patientOverrides, ...overrideData } = data;
      Object.assign(localOverrides, overrideData);

      if (localDbFileHandle) writeLocalDb();

      alert('✅ 匯入成功！資料已合併至本機。');
      loadConfigAndData();
    } catch (err) {
      alert('❌ 匯入失敗：JSON 格式錯誤。\n' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}
