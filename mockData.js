/**
 * ==========================================================================
 * 雙和醫院肌無力中心 (MG Center) 臨床數據展示系統 - 模擬測試數據庫
 * 設計宗旨：為老教授展示最真實的臨床病程發展，配合全新「門診隨訪勾選系統」
 * ==========================================================================
 */

const DEFAULT_MOCK_DATA = {
  // 1. 初診建檔工作表資料
  initialAssessments: [
    {
      chartId: "05834921",
      name: "陳松林",
      gender: "男",
      age: 68,
      phone: "0912-345-678",
      mgfaClass: "Class IIIb",
      onsetKeywords: "2024-06-15 / 雙眼皮下垂、嚼肉困難",
      antibodyStatus: "AChR-Ab 陽性 (+), MuSK-Ab 陰性 (-)",
      medications: "大力丸 (Mestinon) 60mg QID (一天四次) \n類固醇 (Prednisolone) 15mg QD (一天一次) \n免疫抑制劑 (Imuran) 50mg QD (一天一次)",
      thymectomyStatus: "已切除 (2024-11-12) / 病理: 胸腺增生 (Thymic Hyperplasia)",
      clinicalNotes: "患者有多年高血壓病史，發病初期以雙眼皮下垂與視物重影為主，後續波及吞嚥與四肢肌力。\n2024年底接受胸腺切除手術後，症狀顯著改善，目前持續門診追蹤調藥，復健狀態良好。"
    },
    {
      chartId: "12493028",
      name: "林淑惠",
      gender: "女",
      age: 42,
      phone: "0928-111-222",
      mgfaClass: "Class IIb",
      onsetKeywords: "2025-04-10 / 說話含糊不清、鼻音重、吞嚥嗆咳",
      antibodyStatus: "MuSK-Ab 陽性 (+), AChR-Ab 陰性 (-)",
      medications: "大力丸 (Mestinon) 60mg TID (一天三次) \n類固醇 (Prednisolone) 20mg QD (一天一次) \n免疫抑制劑 (CellCept) 500mg BID (一天兩次)",
      thymectomyStatus: "未切除 (胸腺 CT 正常 / 無胸腺瘤)",
      clinicalNotes: "發病主要以球部症狀 (Bulbar symptoms) 為主，說話容易疲倦、語音低沉、傍晚吞嚥流質容易嗆咳。\n由於為 MuSK 抗體陽性，對大力丸反應一般，主要仰賴類固醇與 CellCept 進行免疫抑制治療。冬天天氣變化或感冒時症狀容易波動。"
    },
    {
      chartId: "09384723",
      name: "王大同",
      gender: "男",
      age: 55,
      phone: "0935-888-999",
      mgfaClass: "Class I",
      onsetKeywords: "2025-09-01 / 右側眼瞼下垂、看東西疊影(複視)",
      antibodyStatus: "AChR-Ab 陽性 (+), MuSK-Ab 陰性 (-)",
      medications: "大力丸 (Mestinon) 60mg TID (一天三次)",
      thymectomyStatus: "未切除 (胸腺 CT 正常 / 無胸腺瘤)",
      clinicalNotes: "純眼肌型重症肌無力患者。早晨剛起床時完全正常，午後至傍晚症狀加重，右眼皮明顯下垂且看電視有複視。\n對大力丸反應極佳，服藥後半小時症狀幾乎完全緩解。目前不需使用類固醇或免疫抑制劑，持續門診追蹤是否發展為全身型。"
    }
  ],

  // 2. 歷次門診隨訪紀錄 (整合 MG-ADL、抗體、藥物勾選與臨床評估)
  mgAdlAssessments: [
    // ==========================================
    // 患者 1: 陳松林 (05834921) - 穩步好轉病程
    // ==========================================
    {
      timestamp: "2025-01-10",
      chartId: "05834921",
      evaluator: "林護理師",
      q1_talking: 2,
      q2_chewing: 2,
      q3_swallowing: 2,
      q4_breathing: 1,
      q5_brushing: 1,
      q6_arising: 2,
      q7_doublevision: 1,
      q8_eyeliddroop: 1,
      
      // 隨訪處方與分期 (新增)
      antibodyDate: "2025-01-10",
      antibodyIndex: "8.4",
      medications: {
        mestinon: { dose: "2#", freq: "QID" },
        prednisolone: { dose: "3#", dose2: "", freq: "QD" },
        imuran: { dose: "1#", freq: "QD" },
        tacrolimus: { dose: "0#", freq: "" },
        cellcept: { dose: "0#", freq: "" }
      },
      mgfaPis: {
        status: "MM",
        mmValue: "MM-3",
        change: "Improved"
      },
      mgfaClass: "Class IIIb"
    },
    {
      timestamp: "2025-05-15",
      chartId: "05834921",
      evaluator: "陳護理師",
      q1_talking: 0,
      q2_chewing: 1,
      q3_swallowing: 1,
      q4_breathing: 0,
      q5_brushing: 0,
      q6_arising: 1,
      q7_doublevision: 1,
      q8_eyeliddroop: 1,

      antibodyDate: "2025-05-15",
      antibodyIndex: "4.2",
      medications: {
        mestinon: { dose: "1#", freq: "QID" },
        prednisolone: { dose: "2#", dose2: "", freq: "QD" },
        imuran: { dose: "1#", freq: "QD" },
        tacrolimus: { dose: "0#", freq: "" },
        cellcept: { dose: "0#", freq: "" }
      },
      mgfaPis: {
        status: "MM",
        mmValue: "MM-2",
        change: "Improved"
      },
      mgfaClass: "Class IIb"
    },
    {
      timestamp: "2025-11-22",
      chartId: "05834921",
      evaluator: "陳護理師",
      q1_talking: 0,
      q2_chewing: 0,
      q3_swallowing: 0,
      q4_breathing: 0,
      q5_brushing: 0,
      q6_arising: 0,
      q7_doublevision: 1,
      q8_eyeliddroop: 1,

      antibodyDate: "2025-11-20",
      antibodyIndex: "2.1",
      medications: {
        mestinon: { dose: "1#", freq: "TID" },
        prednisolone: { dose: "1#", dose2: "", freq: "QD" },
        imuran: { dose: "1#", freq: "QD" },
        tacrolimus: { dose: "0#", freq: "" },
        cellcept: { dose: "0#", freq: "" }
      },
      mgfaPis: {
        status: "MM",
        mmValue: "MM-1",
        change: "Improved"
      },
      mgfaClass: "Class I"
    },
    {
      timestamp: "2026-05-20",
      chartId: "05834921",
      evaluator: "林護理師",
      q1_talking: 0,
      q2_chewing: 0,
      q3_swallowing: 0,
      q4_breathing: 0,
      q5_brushing: 0,
      q6_arising: 0,
      q7_doublevision: 0,
      q8_eyeliddroop: 1,

      antibodyDate: "2026-05-18",
      antibodyIndex: "1.1",
      medications: {
        mestinon: { dose: "1#", freq: "TID" },
        prednisolone: { dose: "0.5#", dose2: "", freq: "QD" },
        imuran: { dose: "1#", freq: "QOD" },
        tacrolimus: { dose: "0#", freq: "" },
        cellcept: { dose: "0#", freq: "" }
      },
      mgfaPis: {
        status: "PR",
        mmValue: "",
        change: "Improved"
      },
      mgfaClass: "Class I"
    },

    // ==========================================
    // 患者 2: 林淑惠 (12493028) - 波動型病程
    // ==========================================
    {
      timestamp: "2025-05-02",
      chartId: "12493028",
      evaluator: "陳護理師",
      q1_talking: 2,
      q2_chewing: 1,
      q3_swallowing: 2,
      q4_breathing: 0,
      q5_brushing: 0,
      q6_arising: 0,
      q7_doublevision: 1,
      q8_eyeliddroop: 1,

      antibodyDate: "2025-05-01",
      antibodyIndex: "12.5",
      medications: {
        mestinon: { dose: "1#", freq: "TID" },
        prednisolone: { dose: "4#", dose2: "", freq: "QD" },
        imuran: { dose: "0#", freq: "" },
        tacrolimus: { dose: "0#", freq: "" },
        cellcept: { dose: "1#", freq: "BID" }
      },
      mgfaPis: {
        status: "MM",
        mmValue: "MM-2",
        change: "Unchanged"
      },
      mgfaClass: "Class IIb"
    },
    {
      timestamp: "2025-12-05",
      chartId: "12493028",
      evaluator: "陳護理師",
      q1_talking: 3, // 感冒惡化
      q2_chewing: 2,
      q3_swallowing: 2,
      q4_breathing: 1,
      q5_brushing: 0,
      q6_arising: 0,
      q7_doublevision: 0,
      q8_eyeliddroop: 1,

      antibodyDate: "2025-12-02",
      antibodyIndex: "22.4",
      medications: {
        mestinon: { dose: "2#", freq: "QID" },
        prednisolone: { dose: "6#", dose2: "", freq: "QD" },
        imuran: { dose: "0#", freq: "" },
        tacrolimus: { dose: "1#", freq: "QD" }, // 新增普樂可復
        cellcept: { dose: "2#", freq: "BID" } // Cellcept 加量
      },
      mgfaPis: {
        status: "MM",
        mmValue: "MM-3",
        change: "Worse"
      },
      mgfaClass: "Class IIIb"
    },
    {
      timestamp: "2026-05-18",
      chartId: "12493028",
      evaluator: "林護理師",
      q1_talking: 1,
      q2_chewing: 0,
      q3_swallowing: 0,
      q4_breathing: 0,
      q5_brushing: 0,
      q6_arising: 0,
      q7_doublevision: 0,
      q8_eyeliddroop: 1,

      antibodyDate: "2026-05-15",
      antibodyIndex: "6.8",
      medications: {
        mestinon: { dose: "1#", freq: "TID" },
        prednisolone: { dose: "2#", dose2: "", freq: "QD" },
        imuran: { dose: "0#", freq: "" },
        tacrolimus: { dose: "1#", freq: "QD" },
        cellcept: { dose: "1#", freq: "BID" }
      },
      mgfaPis: {
        status: "MM",
        mmValue: "MM-1",
        change: "Improved"
      },
      mgfaClass: "Class IIb"
    },

    // ==========================================
    // 患者 3: 王大同 (09384723) - 純眼肌型穩定病程
    // ==========================================
    {
      timestamp: "2025-09-15",
      chartId: "09384723",
      evaluator: "林護理師",
      q1_talking: 0,
      q2_chewing: 0,
      q3_swallowing: 0,
      q4_breathing: 0,
      q5_brushing: 0,
      q6_arising: 0,
      q7_doublevision: 2,
      q8_eyeliddroop: 2,

      antibodyDate: "2025-09-12",
      antibodyIndex: "3.4",
      medications: {
        mestinon: { dose: "1#", freq: "TID" },
        prednisolone: { dose: "0#", dose2: "", freq: "" },
        imuran: { dose: "0#", freq: "" },
        tacrolimus: { dose: "0#", freq: "" },
        cellcept: { dose: "0#", freq: "" }
      },
      mgfaPis: {
        status: "MM",
        mmValue: "MM-0",
        change: "Improved"
      },
      mgfaClass: "Class I"
    },
    {
      timestamp: "2026-05-15",
      chartId: "09384723",
      evaluator: "林護理師",
      q1_talking: 0,
      q2_chewing: 0,
      q3_swallowing: 0,
      q4_breathing: 0,
      q5_brushing: 0,
      q6_arising: 0,
      q7_doublevision: 1,
      q8_eyeliddroop: 1,

      antibodyDate: "2026-05-10",
      antibodyIndex: "1.8",
      medications: {
        mestinon: { dose: "1#", freq: "BID" },
        prednisolone: { dose: "0#", dose2: "", freq: "" },
        imuran: { dose: "0#", freq: "" },
        tacrolimus: { dose: "0#", freq: "" },
        cellcept: { dose: "0#", freq: "" }
      },
      mgfaPis: {
        status: "MM",
        mmValue: "MM-0",
        change: "Improved"
      },
      mgfaClass: "Class I"
    }
  ]
};

// 將此模擬資料掛載至全域變數，方便 app.js 直接存取
window.DEFAULT_MOCK_DATA = DEFAULT_MOCK_DATA;
console.log("MG Clinical Mock Database upgraded successfully!");
