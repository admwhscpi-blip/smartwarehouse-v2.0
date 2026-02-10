// ==========================================
// COPY SEMUA KODE INI KE APPS SCRIPT ANDA
// ==========================================

function doGet(e) {
  // Routing berdasarkan parameter 'action'
  if (e.parameter.action == 'getPalletData') {
    return getPalletCycleLog();
  }

  // Default response jika action tidak dikenal
  return ContentService.createTextOutput("Smart Warehouse API Active. Action parameter missing.");
}

function getPalletCycleLog() {
  const ss = SpreadsheetApp.openById("1qJBAv3Wjqud_ViW6wSNZ2YUHGX_N0uXDimueyaEhnsk");
  const sheet = ss.getSheetByName("FG INPUT");

  // Ambil semua data
  const data = sheet.getDataRange().getValues();

  // DATA DIMULAI DARI ROW 9
  // Array index 0 = Row 1. Jadi Row 9 = Index 8.
  // Kita potong 8 baris pertama (Header/Judul)
  const rows = data.slice(8);

  const result = rows.map(row => {
    // Validasi: Skip jika Tanggal (Col B / Index 1) kosong
    if (!row[1]) return null;

    return {
      tanggal: row[1],      // Col B
      shift: row[2],        // Col C
      jenis_barang: row[3], // Col D
      origin: row[4],       // Col E
      destination: row[5],  // Col F
      pallet_out: row[6],   // Col G
      pallet_return: row[7],// Col H
      selisih: row[8],      // Col I
      status: row[9],       // Col J
      remarks: row[10]      // Col K
    };
  }).filter(item => item !== null);

  // Return JSON Response
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
