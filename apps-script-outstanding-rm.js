/**
 * SMART WAREHOUSE V2.0 - OUTSTANDING RM (PRECISION VERSION)
 * -----------------------------------------------
 * Spreadsheet ID: 1Ze745HDK0KAob9bwzOleux1NzHwU_5yRmnYKxjQ34Cc
 * Sheet Name: PENEMPATAN BONGKARAN
 * -----------------------------------------------
 */

function doGet(e) {
    const cb = e.parameter.callback;
    const data = getOutstandingData();
    const json = JSON.stringify(data);

    if (cb) {
        return ContentService.createTextOutput(cb + "(" + json + ")")
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
        return ContentService.createTextOutput(json)
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function getOutstandingData() {
    const SPREADSHEET_ID = '1Ze745HDK0KAob9bwzOleux1NzHwU_5yRmnYKxjQ34Cc';
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("PENEMPATAN BONGKARAN");

    if (!sheet) return { error: "Sheet 'PENEMPATAN BONGKARAN' tidak ditemukan" };

    // 1. DATA ACUAN PENEMPATAN (Baris 13-26, Kolom D-K)
    const rangeAcuan = sheet.getRange(13, 4, 14, 8).getValues();
    const placement = rangeAcuan.filter(r => r[0] != "").map(r => ({
        acuan: String(r[0]),
        grade: String(r[1]),
        option1: { gudang: String(r[2]), lot: String(r[3]), qty: r[4] },
        option2: { gudang: String(r[5]), lot: String(r[6]), qty: r[7] }
    }));

    // 2. DATA MONITORING OUTSTANDING (Baris 43-146, Kolom D-N)
    const lastRow = 146;
    const rangeMonitoring = sheet.getRange(43, 4, lastRow - 43 + 1, 11).getValues();
    const monitoring = rangeMonitoring.filter(r => r[0] !== "" || r[2] !== "").map(r => {

        const seq = String(r[0]);
        let tgl = r[1]; // Kolom E

        // Fallback: Jika Kolom E kosong, coba cari tanggal di Kolom D (Sequence)
        if (!tgl || String(tgl).trim() === "") {
            const dateMatch = seq.match(/\d{2}[\./]\d{2}[\./]\d{4}/);
            if (dateMatch) tgl = dateMatch[0];
        }

        if (tgl instanceof Date) {
            tgl = Utilities.formatDate(tgl, "GMT+7", "dd/MM/yyyy");
        } else {
            tgl = String(tgl || "");
        }

        // Jam Masuk (Kolom N = Index 10)
        let jam = r[10];
        if (jam instanceof Date) {
            jam = Utilities.formatDate(jam, "GMT+7", "HH:mm");
        } else if (typeof jam === 'number') {
            let hours = Math.floor(jam * 24);
            let minutes = Math.round((jam * 24 - hours) * 60);
            jam = (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes);
        } else {
            jam = String(jam || "00:00");
        }

        return {
            sequence: seq,
            tglMasuk: tgl,
            material: String(r[2]),     // Kolom F
            netto: r[3],                // Kolom G
            truckType: String(r[4]),    // Kolom H
            agingStatus: String(r[5]),  // Kolom I
            jamMasuk: jam               // Kolom N
        };
    });

    return {
        placement: placement,
        monitoring: monitoring,
        lastUpdate: new Date().toLocaleString()
    };
}
