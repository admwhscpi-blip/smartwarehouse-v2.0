/**
 * API KONTROL LEMBURAN - SMART WAREHOUSE
 * Spreadsheet ID: 1U5LfG5W34GS8i7iJM-wvjyY7Fi67ZHZ7jl5MtZanatc
 */

const SPREADSHEET_ID = "11xVYaLB2SnuTgK9-buWXUScjy83xGxTAGKdLU1NvSBc";

// Baris yang harus diabaikan (1-based index sesuai sheet)
const IGNORED_ROWS = [
  69, 70, 71, 
  82, 83, 84, 
  102, 103, 104
];

function doGet(e) {
  const params = e.parameter;
  const action = params.action || 'getData';
  
  // Return JSON helper
  const success = (data) => ContentService.createTextOutput(JSON.stringify({ status: 'success', data: data })).setMimeType(ContentService.MimeType.JSON);
  const error = (msg) => ContentService.createTextOutput(JSON.stringify({ status: 'error', message: msg })).setMimeType(ContentService.MimeType.JSON);

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (action === 'getSheetNames') {
      const sheets = ss.getSheets().map(s => s.getName());
      return success(sheets);
    } 
    
    if (action === 'getData') {
      // Default ke sheet bulan ini jika tidak ada parameter 'sheet'
      let sheetName = params.sheet;
      if (!sheetName) {
        // Fallback: Coba ambil bulan sekarang (Contoh format: "FEBRUARI 2026")
        const months = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
        const d = new Date();
        // Note: Logic ini asumsi sederhana, user bisa kirim parameter sheet spesifik
        // sheetName = months[d.getMonth()] + " " + d.getFullYear(); 
        
        // Tapi lebih aman return error minta nama sheet, atau default ke sheet pertama
        sheetName = ss.getSheets()[0].getName();
      }

      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return error("Sheet tidak ditemukan: " + sheetName);

      // Ambil Data: Baris 8 sampai terakhir (Max row data)
      // Kolom A (1) sampai AG (33)
      // A=Nama, B=NIK, C-AG=Tanggal 1-31
      
      const lastRow = sheet.getLastRow();
      // Kita batasi pembacaan sampai baris 150 dulu agar performa terjaga, atau sesuai lastRow
      const maxRow = lastRow > 150 ? 150 : lastRow; 
      
      if (maxRow < 8) return success([]); // Data kosong

      const startRow = 8;
      const numRows = maxRow - startRow + 1;
      const dataValues = sheet.getRange(startRow, 1, numRows, 33).getDisplayValues(); // Pakai getDisplayValues agar dapat format text sesuai request

      const processedData = [];

      dataValues.forEach((row, index) => {
        const currentRowNum = startRow + index;

        // Skip jika baris masuk daftar IGNORE
        if (IGNORED_ROWS.includes(currentRowNum)) return;

        // Validasi: Nama tidak boleh kosong
        const name = row[0]; // Kolom A
        const nik = row[1];  // Kolom B
        
        if (!name || name === "") return;

        // Ambil data tanggal 1-31 (Index 2 sampai 32)
        const dailyData = {};
        for (let i = 1; i <= 31; i++) {
            // Kolom C is index 2. Tanggal 1 ada di index 2.
            // Tanggal n ada di index 2 + n - 1 = n + 1
            dailyData[i] = row[i + 1] || "";
        }

        processedData.push({
          row: currentRowNum,
          name: name,
          nik: nik,
          attendance: dailyData
        });
      });

      return success({
        sheetName: sheetName,
        totalEmployees: processedData.length,
        employees: processedData
      });
    }

    return error("Action tidak dikenal");

  } catch (err) {
    return error(err.toString());
  }
}
