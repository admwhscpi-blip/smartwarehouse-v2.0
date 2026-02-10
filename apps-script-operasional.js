var SPREADSHEET_ID = '1ASKbDvw1RVi5aSOJ_l6nE0PY9Syx-Zw2N79WHAHf2Vg';

function doGet(e) {
    var action = e.parameter.action;
    var ss;

    try {
        ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (err) {
        return createJsonResponse({
            error: "Spreadsheet ID tidak valid atau tidak memiliki akses.",
            details: err.toString()
        });
    }

    try {
        if (action === 'getEkspedisi') {
            return createJsonResponse(getSheetData(ss, 'Truck Langsir', 12));
        } else if (action === 'getSewaUnit') {
            return createJsonResponse(getSheetData(ss, 'Excavator', 11));
        } else if (action === 'getSolar') {
            return createJsonResponse(getSheetData(ss, 'Solar', 13));
        } else if (action === 'getLoader') {
            return createJsonResponse(getSheetData(ss, 'Loader Internal & Rental', 4));
        } else if (action === 'getKadarAir') {
            var ssKA = ss;
            try {
                var activeSS = SpreadsheetApp.getActiveSpreadsheet();
                if (activeSS && activeSS.getSheetByName("PENERIMAAN")) {
                    ssKA = activeSS;
                }
            } catch (e) { }
            return createJsonResponse(getKadarAirData(ssKA));
        } else {
            return createJsonResponse({ error: 'Action tidak valid' });
        }
    } catch (err) {
        return createJsonResponse({ error: err.toString() });
    }
}

function getKadarAirData(ss) {
    var res = {
        penerimaan: [],
        pengiriman: [],
        debug: {}
    };

    var sheets = ss.getSheets();
    var sPen = null;
    var sPeng = null;

    for (var i = 0; i < sheets.length; i++) {
        var name = sheets[i].getName().toUpperCase();
        if (name === "PENERIMAAN") sPen = sheets[i];
        if (name === "PENGIRIMAN") sPeng = sheets[i];
    }

    if (sPen) {
        res.debug.penerimaanSheet = sPen.getName();
        var lastRow = sPen.getLastRow();
        if (lastRow >= 4) {
            var vals = sPen.getRange(4, 1, lastRow - 3, 8).getValues();
            res.penerimaan = vals.map(function (r) {
                return {
                    material: r[0],
                    date: r[1] instanceof Date ? Utilities.formatDate(r[1], "GMT+7", "dd/MM/yyyy") : String(r[1]),
                    supplier: r[2],
                    po: r[3],
                    nopol: r[4],
                    moisture: r[5],
                    kapal: r[6],
                    lokasi: r[7]
                };
            }).reverse();
        }
    }

    if (sPeng) {
        res.debug.pengirimanSheet = sPeng.getName();
        var lastRow2 = sPeng.getLastRow();
        if (lastRow2 >= 2) {
            var vals2 = sPeng.getRange(2, 1, lastRow2 - 1, 4).getValues();
            res.pengiriman = vals2.map(function (r) {
                return {
                    material: r[0],
                    date: r[1] instanceof Date ? Utilities.formatDate(r[1], "GMT+7", "dd/MM/yyyy") : String(r[1]),
                    lokasi: r[2],
                    moisture: r[3]
                };
            }).reverse();
        }
    }

    return res;
}

function getSheetData(ss, sheetName, startRow) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { error: 'Sheet "' + sheetName + '" tidak ditemukan.' };

    var lastRow = sheet.getLastRow();
    if (lastRow < startRow) return [];

    var lastCol = sheet.getLastColumn();
    var range = sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol);
    var values = range.getValues();

    return values.map(function (row) {
        return row.map(function (cell) {
            if (cell instanceof Date) {
                return Utilities.formatDate(cell, "GMT+7", "dd/MM/yyyy");
            }
            return cell;
        });
    });
}

function createJsonResponse(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}
