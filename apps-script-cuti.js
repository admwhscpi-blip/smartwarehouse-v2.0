/**
 * API KONTROL CUTI v2.0 - SMART WAREHOUSE
 * Logic: 8 Days Quota starting Feb 1, 2026.
 * Master Reference: "TABEL" sheet.
 */

const SPREADSHEET_ID = "1oQ23jypr_U9uoyY7ReWiIhYspckZQvPhdf6zAlgB5ac";
const START_DATE = new Date("2026-02-01T00:00:00");
const TOTAL_QUOTA = 8;

function doGet(e) {
    const params = e.parameter;
    const action = params.action || 'getData';

    const success = (data) => ContentService.createTextOutput(JSON.stringify({ status: 'success', data: data })).setMimeType(ContentService.MimeType.JSON);
    const error = (msg) => ContentService.createTextOutput(JSON.stringify({ status: 'error', message: msg })).setMimeType(ContentService.MimeType.JSON);

    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const respSheet = ss.getSheetByName("Form Responses 1");
        const tableSheet = ss.getSheetByName("TABEL");

        if (!respSheet || !tableSheet) return error("Sheet 'Form Responses 1' atau 'TABEL' tidak ditemukan.");

        if (action === 'getData') {
            // 1. Load Master Table (TABEL) -> As Source of Truth
            // C: Nama, D: NIK, E: Bagian, F: OS/VENDOR
            const tableData = tableSheet.getRange("C2:F" + tableSheet.getLastRow()).getValues();
            const masterEmployees = {}; // Key: NIK

            tableData.forEach(row => {
                const nik = String(row[1]).trim();
                if (!nik) return;
                masterEmployees[nik] = {
                    name: String(row[0]).trim(),
                    nik: nik,
                    dept: String(row[2]).trim(),
                    vendor: String(row[3]).trim(),
                    used: 0,
                    history: []
                };
            });

            // 2. Load Leave Logs (Form Responses 1)
            // A: Timestamp, B: NIK, C: Tgl Cuti, D: Jenis Cuti, E: Posisi, F: Nama, G: OS/VENDOR
            const fullLogs = respSheet.getDataRange().getValues();
            fullLogs.shift(); // Remove header

            const filteredLogs = [];
            const calendarStats = {}; // { "YYYY-MM-DD": [names] }

            fullLogs.forEach(row => {
                const rawNik = String(row[1]).trim();
                const leaveDate = new Date(row[2]);
                const type = String(row[3]).trim().toUpperCase();

                // Validation: Date must be >= Feb 1, 2026
                if (leaveDate < START_DATE) return;
                if (isNaN(leaveDate.getTime())) return;

                // Typo Correction: Map to Master Data by NIK
                const emp = masterEmployees[rawNik];
                const finalName = emp ? emp.name : String(row[5]).trim();
                const finalDept = emp ? emp.dept : String(row[4]).trim();

                const dateStr = Utilities.formatDate(leaveDate, "GMT+7", "yyyy-MM-dd");

                const logEntry = {
                    timestamp: row[0],
                    nik: rawNik,
                    name: finalName,
                    date: dateStr,
                    type: type,
                    dept: finalDept,
                    vendor: row[6]
                };

                filteredLogs.push(logEntry);

                // Logic: Analytics only for "Cuti Tahunan"
                if (type.includes("TAHUNAN") || type === "CUTI" || type === "CT") {
                    if (emp) {
                        emp.used += 1;
                        emp.history.push({ date: dateStr, type: type });
                    }

                    // Calendar grouping
                    if (!calendarStats[dateStr]) calendarStats[dateStr] = [];
                    calendarStats[dateStr].push(finalName);
                }
            });

            // 3. Prepare Final Employee List with Remaining Balance
            const employeeList = Object.values(masterEmployees).map(e => {
                return {
                    ...e,
                    remaining: TOTAL_QUOTA - e.used
                };
            });

            // 4. Group by Dept for Analytics
            const deptSummary = {};
            employeeList.forEach(e => {
                if (!deptSummary[e.dept]) deptSummary[e.dept] = { totalRemaining: 0, count: 0, members: [] };
                deptSummary[e.dept].totalRemaining += e.remaining;
                deptSummary[e.dept].count += 1;
                deptSummary[e.dept].members.push({ name: e.name, balance: e.remaining });
            });

            return success({
                employees: employeeList,
                logs: filteredLogs.reverse(), // Newest logs first
                calendar: calendarStats,
                deptBalance: deptSummary
            });
        }

        return error("Action '" + action + "' tidak didukung.");

    } catch (err) {
        return error(err.toString());
    }
}
