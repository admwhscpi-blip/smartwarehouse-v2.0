/**
 * SMART WAREHOUSE V2.0 - DOWNTIME SUBMISSION & WEBVIEW API
 * 1. Simpan data ke Google Sheets (DATA BONGKARAN / DATA MUAT)
 * 2. Menampilkan Form Input di HP (doGet)
 */

const SHEET_NAME = "DATA BONGKARAN"; 
const MUAT_SHEET_NAME = "DATA MUAT";
const SESSION_SHEET = "SESSIONS";
const RM_STOCK_SHEET = "RM STOCK";

function doGet(e) {
  // 0. Action: Master Data (v17.1 RM STOCK Integration)
  if (e && e.parameter.action === 'getData') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    let sSheet = ss.getSheetByName(SESSION_SHEET);
    let rmStockSheet = ss.getSheetByName(RM_STOCK_SHEET);
    
    let coords = ["ADE YANTO", "SAFII", "HADI"];
    let activeSessions = [];
    let warehouses = ["RM", "INTAKE 71", "BKK", "CPO"];
    let materials = [{name: "CORN"}, {name: "SOYBEAN"}, {name: "POLLARD"}, {name: "MBM"}, {name: "CPO"}, {name: "RM"}];
    
    // 1. Fetch All Downtime Data for Analysis
    // v19.1: Handle empty sheet scenario gracefully
    let downtimeData = [];
    if (sheet) {
      downtimeData = sheet.getDataRange().getValues();
    }
    
  // v18.14 Coord Container Indices (X=23, Y=24, Z=25, AA=26)
  const idx = {
    tanggal: 0, shift: 1, gudang: 2, sloc: 3, material: 4, nopol: 6,
    truck: 7, netto: 8, sampling: 9, krani: 10, coord: 11,
    arrival_date: 23, arrival_time: 24, qc_time: 25, timbang_time: 26
  };

  // Calculate pending status for sessions
  if (sSheet) {
    const sData = sSheet.getDataRange().getValues();
    // v18.10 Skip row 0 if it's "Krani" header
    for (let i = 0; i < sData.length; i++) {
        const rawName = String(sData[i][0]).trim();
        if (rawName.toUpperCase() === "KRANI" || !rawName) continue;
        
        const kraniName = rawName.toUpperCase();
        const coordName = String(sData[i][3]).trim().toUpperCase();
        
        let hasPendingKrani = false;
        let hasPendingCoord = false;

        if (downtimeData.length > 0) {
            for (let j = 0; j < downtimeData.length; j++) {
            const rowKrani = String(downtimeData[j][idx.krani] || "").trim().toUpperCase();
            const rowCoord = String(downtimeData[j][idx.coord] || "").trim().toUpperCase();
            
            // Rule 7: Krani pending if Netto is missing/0/-/blank
            if (rowKrani === kraniName) {
                const nettoVal = String(downtimeData[j][idx.netto]).trim();
                if (!nettoVal || nettoVal === "-" || nettoVal === "0" || nettoVal === "0") hasPendingKrani = true;
            }

            // Rule 8: Coordinator pending if Arrival/QC/Timbang missing
            if (rowCoord === coordName) {
                const rowArrival = String(downtimeData[j][idx.arrival_date] || "").trim();
                const rowTimeArr = String(downtimeData[j][idx.arrival_time] || "").trim();
                const rowQC = String(downtimeData[j][idx.qc_time] || "").trim();
                const rowTimbang = String(downtimeData[j][idx.timbang_time] || "").trim();
                if (!rowArrival || !rowTimeArr || !rowQC || !rowTimbang || rowArrival === "-" || rowQC === "-") hasPendingCoord = true;
            }
            
            if (hasPendingKrani && hasPendingCoord) break;
            }
        }

        activeSessions.push({
          krani: sData[i][0], shift: sData[i][1], gudang: sData[i][2],
          coordinator: sData[i][3], sampling: sData[i][4],
          tim_borong: sData[i][5], tim_harian: sData[i][6],
          hasPending: hasPendingKrani,
          hasPendingKrani: hasPendingKrani,
          hasPendingCoord: hasPendingCoord
        });
    }
  }

  // v18.12 Data Mining for Resume (Direct Scan)
  const pendingKranis = new Set();
  const pendingCoords = new Set();

  // Scan Downtime Data for any pending tasks (ignoring sessions)
  if (downtimeData.length > 0) {
    for (let i = 0; i < downtimeData.length; i++) {
        const row = downtimeData[i];
        // Skip header row if detected (usually checked by date/shift validation or just manual skip)
        if (String(row[0]).toUpperCase().includes("TANGGAL")) continue;

        const kName = String(row[idx.krani]).trim().toUpperCase();
        const netto = String(row[idx.netto]).trim();
        
        // Rule 7: Krani Pending
        if (kName && kName.length > 2 && kName !== "KRANI") {
            if (!netto || netto === "0" || netto === "-") pendingKranis.add(kName);
        }

        const cName = String(row[idx.coord] || "").trim().toUpperCase();
        const truckType = String(row[idx.truck] || "").trim().toUpperCase();
        
        // v18.15 Safety: Handle undefined columns for new fields (X,Y,Z,AA)
        // If row[idx] is undefined, default to "" to trigger pending check
        const arrD = (row[idx.arrival_date] === undefined) ? "" : String(row[idx.arrival_date]).trim();
        const arrT = (row[idx.arrival_time] === undefined) ? "" : String(row[idx.arrival_time]).trim();
        const qcT = (row[idx.qc_time] === undefined) ? "" : String(row[idx.qc_time]).trim();
        const timT = (row[idx.timbang_time] === undefined) ? "" : String(row[idx.timbang_time]).trim();

        // Rule 8: Coordinator Pending (ONLY FOR CONTAINER)
        if (cName && cName.length > 2 && cName !== "KOODINATOR") {
            // v18.14: Check if Container (20FT/40FT)
            if (truckType.includes("CONTAINER")) {
                if (!arrD || arrD === "-" || !arrT || !qcT || !timT) pendingCoords.add(cName);
            }
        }
    }
  }

    // 2. Fetch Dynamic Data from RM STOCK
    if (rmStockSheet) {
      const rmData = rmStockSheet.getDataRange().getValues();
      const rmHeaders = rmData[0].map(h => String(h).trim().toUpperCase());
      const mIdx = rmHeaders.indexOf("MATERIAL");
      const gIdx = rmHeaders.indexOf("GUDANG");
      
      if (mIdx !== -1) {
        const rawM = rmData.slice(1).map(r => String(r[mIdx]).trim()).filter(n => n && n.length > 1);
        materials = [...new Set(rawM)].sort().map(m => ({ name: m }));
      }
      if (gIdx !== -1) {
        const rawG = rmData.slice(1).map(r => String(r[gIdx]).trim()).filter(n => n && n.length > 1);
        warehouses = [...new Set(rawG)].sort();
      }
    }

    // 3. Fetch Coordinators from DOWNTIME_RM (Dynamic Sync)
    if (sheet && downtimeData.length > 0) {
      const data = downtimeData;
      const headers = data[0];
      const cIdx = headers.indexOf("Koordinator Monitoring");
      if (cIdx !== -1) {
        const raw = data.slice(1).map(r => String(r[cIdx]).trim()).filter(n => n && n.length > 2);
        const dynamicList = [...new Set(raw)].sort();
        coords = [...new Set([...coords, ...dynamicList])].sort();
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      warehouses: warehouses,
      coordinators: coords,
      activeSessions: activeSessions,
      materials: materials,
      pendingKranis: Array.from(pendingKranis).sort(),
      pendingCoords: Array.from(pendingCoords).sort()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // v19.4: Action for Manual Risip Filtering (Crosscheck)
  if (e && e.parameter.action === 'getManualRisip') {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(MUAT_SHEET_NAME);
      if (!sheet) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).toUpperCase());
      
      const idx = {
        kategori: headers.indexOf("KATEGORI RISIP"),
        nopol: headers.indexOf("NOPOL"),
        status: headers.indexOf("STATUS VALIDASI"),
        tanggal: headers.indexOf("TANGGAL"),
        material: headers.indexOf("MATERIAL")
      };

      // Fallback Robust if headers missing/incorrect
      if (idx.kategori === -1) idx.kategori = 3; 
      if (idx.nopol === -1) idx.nopol = 4;
      if (idx.material === -1) idx.material = 5;
      if (idx.status === -1) idx.status = 15;
      if (idx.tanggal === -1) idx.tanggal = 1;

      const results = [];
      // Loop data, skip header
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const kat = String(row[idx.kategori] || "").trim().toUpperCase();
        const status = String(row[idx.status] || "").trim().toUpperCase();
        
        if (kat === "MANUAL" && status !== "DONE RISIP") {
            results.push({
                row_id: i+1,
                tanggal: formatDate(row[idx.tanggal]),
                nopol: row[idx.nopol] || "-",
                material: row[idx.material]
            });
        }
      }
      return ContentService.createTextOutput(JSON.stringify(results.reverse())).setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (e && e.parameter.action === 'getTaskQueue') {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_NAME);
      if (!sheet) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
      
      const data = sheet.getDataRange().getValues();
      const role = e.parameter.role;
      const name = String(e.parameter.name || "").trim().toLowerCase();
      const shiftFilter = String(e.parameter.shift || "").trim();
      
      const idx = {
        nopol: 6, mat: 4, gudang: 2, tgl: 0, shift: 1, netto: 8, krani: 10, coord: 11,
        truck: 7, arrival_date: 23, arrival_time: 24, qc_time: 25, timang_time: 26
      };

      const results = [];
      // v18.11 Start from 0 since Header is deleted/optional
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (String(row[0]).toUpperCase().includes("TANGGAL")) continue;
        
        const rowShift = String(row[idx.shift] || "").trim();
        // v18.11: If shiftFilter is provided and not matches, skip (unless it's null/empty)
        if (shiftFilter && rowShift != shiftFilter && shiftFilter !== "null" && shiftFilter !== "") continue;

        if (role === 'krani') {
          const isOwner = String(row[idx.krani] || "").trim().toLowerCase() === name;
          const nettoVal = String(row[idx.netto]).trim();
          const noNetto = !nettoVal || nettoVal === "-" || nettoVal === "0";
          
          if (isOwner && noNetto) {
            results.push({ 
                row_id: i+1, nopol: row[idx.nopol], material: row[idx.mat], 
                status: "TONASE KOSONG", gudang: row[idx.gudang], tanggal: row[idx.tgl],
                jenis_truck: row[idx.truck], netto: row[idx.netto]
            });
          }
        } else if (role === 'coordinator') {
          const isOwner = String(row[idx.coord] || "").trim().toLowerCase() === name;
          const truckType = String(row[idx.truck] || "").toUpperCase();
          // v18.15 Safety: Handle undefined logic for results
          const rowArrival = (row[idx.arrival_date] === undefined) ? "" : String(row[idx.arrival_date]).trim();
          const rowTimeArr = (row[idx.arrival_time] === undefined) ? "" : String(row[idx.arrival_time]).trim();
          const rowQC = (row[idx.qc_time] === undefined) ? "" : String(row[idx.qc_time]).trim();
          const rowTimbang = (row[idx.timang_time] === undefined) ? "" : String(row[idx.timang_time]).trim();
          
          const noData = !rowArrival || !rowTimeArr || !rowQC || !rowTimbang || rowArrival === "-" || rowQC === "-";
          
          // v18.14: Only push if Container & Pending
          if (isOwner && truckType.includes("CONTAINER") && noData) {
            results.push({ 
                row_id: i+1, nopol: row[idx.nopol], material: row[idx.mat], 
                status: "DATA CONTAINER BELUM LENGKAP", gudang: row[idx.gudang], tanggal: row[idx.tgl],
                jenis_truck: row[idx.truck],
                arrival_date: rowArrival, arrival_time: rowTimeArr, qc_time: rowQC, timbang_time: rowTimbang
            });
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify(results.reverse())).setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
    }
  }

  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('WHSMART v2.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// v19.4 Helper
function formatDate(date) {
    if (!date) return "-";
    if (typeof date === 'string') return date;
    const d = new Date(date);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

const MASTER_HEADERS = [
  "Tanggal", "Shift", "Gudang/Intake", "SLoc", "Material", 
  "Lokasi Simpan", "Nopol", "Jenis Truck", "Netto (Kg)", "Krani Bongkar",
  "Sampling Man", "Koordinator Monitoring", "Jenis Kuli", "Tim Kerja",
  "Start Panggil", "Truck Ready", "Start Bongkar", 
  "Hold QC", "Re-start QC", "Manuver Akhir", "Finish", 
  "Tenaga Bongkar", "Backend Timestamp",
  "Arrival Date", "Arrival Time", "QC Sampling 1 Time", "Time Timbang Masuk",
  "Gudang Durasi", "Jumlah Bag" // v19.2: Added Jumlah Bag
];

const MUAT_HEADERS = [
  "Timestamp", "Tanggal", "Shift", "Kategori Risip", "Nopol", // v19.4: New Columns
  "Material", "Netto (Kg)", "Jumlah Bag", "Tim Harian", "Jumlah Kuli", "Nama Krani", 
  "Bongkar Stapel", "Start Muat", "Finish", "OTW Pabrik",
  "Status Validasi", "Validator" // v19.4: For Crosscheck
];

function doPost(e) {
  try {
    const raw = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    let sSheet = ss.getSheetByName(SESSION_SHEET);
    let mSheet = ss.getSheetByName(MUAT_SHEET_NAME);
    
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.getRange(1,1,1,MASTER_HEADERS.length).setValues([MASTER_HEADERS]).setFontWeight("bold");
    }
    if (!sSheet) {
      sSheet = ss.insertSheet(SESSION_SHEET);
      sSheet.getRange(1,1,1,7).setValues([["Krani", "Shift", "Gudang", "Coord", "Sampling", "TimBorong", "TimHarian"]]).setFontWeight("bold");
    }
    if (!mSheet) {
      mSheet = ss.insertSheet(MUAT_SHEET_NAME);
      mSheet.getRange(1,1,1,MUAT_HEADERS.length).setValues([MUAT_HEADERS]).setFontWeight("bold");
    }

    // ACTION: SAVE SESSION SETUP (v16.5)
    if (raw.action === "saveSession") {
      const sData = sSheet.getDataRange().getValues();
      let foundRow = -1;
      for (let i = 1; i < sData.length; i++) {
        if (sData[i][0] === raw.krani) { foundRow = i + 1; break; }
      }
      const newRow = [raw.krani, raw.shift, raw.gudang, raw.coordinator, raw.sampling, raw.tim_borong, raw.tim_harian];
      if (foundRow !== -1) {
        sSheet.getRange(foundRow, 1, 1, 7).setValues([newRow]);
      } else {
        sSheet.appendRow(newRow);
      }
      return ContentService.createTextOutput(JSON.stringify({success:true}));
    }

    // ACTION: TERMINATE SESSION (v16.5)
    if (raw.action === "terminateSession") {
      const sData = sSheet.getDataRange().getValues();
      for (let i = 1; i < sData.length; i++) {
        if (sData[i][0] === raw.krani) { sSheet.deleteRow(i + 1); break; }
      }
      return ContentService.createTextOutput(JSON.stringify({success:true}));
    }

    // ACTION: SAVE KRANI BATCH (v15.7 + v19.1 + v19.2)
    if (raw.units) {
      const common = raw.common;
      const rows = raw.units.map(unit => {
        return [
          common.tanggal, common.shift, common.gudang, unit.sloc, unit.material,
          unit.lokasi_simpan, unit.nopol, unit.jenis_truck, unit.netto, common.krani,
          common.sampling_man, common.coordinator, unit.jenis_kuli, unit.tim_kerja,
          common.start_panggil, common.truck_ready, common.start_bongkar,
          common.hold_qc, common.restart_qc, common.manuver_akhir, common.finish, 
          unit.tenaga_bongkar, new Date(),
          "", "", "", "",
          common.gudang_durasi || "-",
          unit.jumlah_bag || "-" // v19.2: Jumlah Bag
        ];
      });
      sheet.getRange(sheet.getLastRow()+1, 1, rows.length, 29).setValues(rows);
      return ContentService.createTextOutput(JSON.stringify({success:true}));
    }

    // ACTION: SAVE KRANI MUATAN (v19.2 + v19.3 + v19.4)
    if (raw.action === "saveMuat") {
      mSheet.appendRow([
        new Date(),
        raw.tanggal || '-',
        raw.shift || '-',
        raw.kategori_risip || 'AUTO', // v19.4
        raw.nopol || '-',             // v19.4
        raw.material || '-',
        raw.netto || '-',      
        raw.jumlah_bag || '-', 
        raw.tim_harian || '-',
        raw.jumlah_kuli || '-',
        raw.krani || '-',      
        raw.bongkar_stapel || '-',
        raw.start_muat || '-', 
        raw.finish || '-',
        raw.otw_pabrik || '-',
        "", // Status Validasi
        ""  // Validator
      ]);
      return ContentService.createTextOutput(JSON.stringify({success:true}));
    }

    // ACTION: SAVE CROSSCHECK (v19.6 Revision)
    if (raw.action === "saveCrosscheck") {
      const updates = raw.updates; // List of objects {row_id, netto}
      const validator = raw.validator;
      
      const headers = mSheet.getRange(1, 1, 1, mSheet.getLastColumn()).getValues()[0].map(h => String(h).toUpperCase());
      const statusIdx = headers.indexOf("STATUS VALIDASI");
      const validIdx = headers.indexOf("VALIDATOR");
      const nettoIdx = headers.indexOf("NETTO (KG)");
      
      let finalStatusIdx = statusIdx !== -1 ? statusIdx : 15;
      let finalValidIdx = validIdx !== -1 ? validIdx : 16;
      let finalNettoIdx = nettoIdx !== -1 ? nettoIdx : 6;

      updates.forEach(item => {
        const rowId = item.row_id;
        const nettoVal = item.netto;
        
        mSheet.getRange(rowId, finalStatusIdx + 1).setValue("DONE RISIP");
        mSheet.getRange(rowId, finalValidIdx + 1).setValue(validator);
        
        // Update Netto if provided
        if (nettoVal) {
             mSheet.getRange(rowId, finalNettoIdx + 1).setValue(nettoVal);
        }
      });
      
      return ContentService.createTextOutput(JSON.stringify({success:true}));
    }

    // ACTION: UPDATE ARRIVAL (v15.7)
    if (raw.action === "updateCoordinator") {
      const updateArr = [[raw.arrival_date, raw.arrival_time, raw.qc_time, raw.timbang_time]];
      sheet.getRange(raw.row_id, 24, 1, 4).setValues(updateArr);
      return ContentService.createTextOutput(JSON.stringify({success:true}));
    }

    // ACTION: UPDATE NETTO (v15.7)
    if (raw.action === "updateNetto") {
      sheet.getRange(raw.row_id, 9).setValue(raw.netto);
      return ContentService.createTextOutput(JSON.stringify({success:true}));
    }

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({success:false, error: err.toString()}));
  }
}
