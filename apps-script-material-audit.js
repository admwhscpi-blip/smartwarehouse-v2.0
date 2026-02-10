/**
 * SMART WAREHOUSE V2.0 - MATERIAL AUDIT API
 * Updated: Added Raw Records for Table Display
 */

function doGet(e) {
    var tahun = e.parameter.tahun;
    if (!tahun) {
        return ContentService.createTextOutput(JSON.stringify({ error: "Parameter 'tahun' diperlukan" }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    try {
        var result = filterDanAnalisis(tahun);
        return ContentService.createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function filterDanAnalisis(tahun) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var lastRow = sheet.getLastRow();

    var barisMulaiLama = 16, barisAkhirLama = 566;
    var barisMulaiBaruA = 576, barisAkhirBaruA = 591;
    var barisMulaiBaruB = 592;

    var templateStats = () => ({
        hitung: 0, qty: 0, harga: 0, persen: [],
        perLokasi: {}
    });

    var stats = { susut: templateStats(), over: templateStats() };
    var rawRecords = []; // Temporary storage for raw data

    // Optimization: Only get necessary columns if possible, but keeping logic for now
    var dataRange = sheet.getRange(1, 1, lastRow, 93).getValues();

    for (var i = 0; i < lastRow; i++) {
        var barisSekarang = i + 1;
        var rowData = dataRange[i];
        var tahunCell = "", currentP = [], currentQ = [], currentH = [], currentL = [];

        if (barisSekarang >= barisMulaiLama && barisSekarang <= barisAkhirLama) {
            tahunCell = rowData[61].toString();
            currentP = rowData.slice(32, 37);
            currentQ = rowData.slice(13, 18);
            currentH = rowData.slice(22, 27);
            currentL = rowData.slice(44, 48);
        } else if (barisSekarang >= barisMulaiBaruA && barisSekarang <= barisAkhirBaruA) {
            tahunCell = rowData[92].toString();
            currentP = [rowData[79]];
            currentQ = [rowData[73]];
            currentH = [rowData[75]];
            currentL = [rowData[70]];
        } else if (barisSekarang >= barisMulaiBaruB) {
            tahunCell = rowData[92].toString();
            currentP = [rowData[80]];
            currentQ = [rowData[73]];
            currentH = [rowData[76]];
            currentL = [rowData[71]];
        }

        if (tahunCell.indexOf(tahun) !== -1) {
            for (var j = 0; j < currentP.length; j++) {
                var p = parseFloat(currentP[j]);
                if (!isNaN(p) && p !== 0) {
                    var rawLok = (currentL[j] || "LAINNYA").toString().trim().toUpperCase();
                    var lokKey = rawLok.match(/^[A-Z]+/) ? rawLok.match(/^[A-Z]+/)[0] : "LAINNYA";

                    if (lokKey === "WTC" || lokKey === "SL") continue;
                    if (lokKey === "TK") { lokKey = "TANK"; }

                    var q = Math.abs(parseFloat(currentQ[j]) || 0);
                    var h = Math.abs(parseFloat(currentH[j]) || 0);

                    var target = (p < 0) ? stats.over : stats.susut;
                    target.hitung++;
                    target.qty += q;
                    target.harga += h;
                    target.persen.push(Math.abs(p));

                    if (!target.perLokasi[lokKey]) {
                        target.perLokasi[lokKey] = { hitung: 0, qty: 0, harga: 0, persen: [] };
                    }
                    var tLok = target.perLokasi[lokKey];
                    tLok.hitung++;
                    tLok.qty += q;
                    tLok.harga += h;
                    tLok.persen.push(Math.abs(p));

                    // Save to raw record list
                    rawRecords.push({
                        baris: barisSekarang,
                        lokasi: lokKey,
                        qty: q,
                        nilai: h,
                        selisih: p,
                        status: p < 0 ? "OVER" : "SUSUT"
                    });
                }
            }
        }
    }

    function finalizeStats(obj) {
        if (obj.hitung > 0) {
            obj.avgPersen = obj.persen.reduce((a, b) => a + b, 0) / obj.persen.length;
            obj.minPersen = Math.min(...obj.persen);
            obj.maxPersen = Math.max(...obj.persen);
        } else {
            obj.avgPersen = 0;
            obj.minPersen = 0;
            obj.maxPersen = 0;
        }

        for (var loc in obj.perLokasi) {
            var l = obj.perLokasi[loc];
            l.avgPersen = l.persen.reduce((a, b) => a + b, 0) / l.persen.length;
            delete l.persen;
        }
        delete obj.persen;
    }

    finalizeStats(stats.over);
    finalizeStats(stats.susut);

    return {
        tahun: tahun,
        over: stats.over,
        susut: stats.susut,
        rawRecords: rawRecords, // Data to be sorted descending in frontend
        timestamp: new Date().toISOString()
    };
}
