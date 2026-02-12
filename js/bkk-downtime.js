const BKKDowntimeApp = {
    aggregatedData: [],
    filterMode: 'overall', // overall, material
    selectedMaterial: '',
    timeView: 'daily',
    charts: {},
    availableMaterials: [],

    init: async function () {
        console.log("Initializing SEARCH-FIRST V7.1...");

        // Auto-set current month and year
        const now = new Date();
        document.getElementById('select-month').value = now.getMonth() + 1;
        document.getElementById('select-year').value = now.getFullYear();

        // V7: Sembunyikan loading screen agar parameter langsung muncul!
        if (document.getElementById('loading')) {
            document.getElementById('loading').classList.add('hidden');
        }
        this.renderDashboard();
    },

    /**
     * V6 CORE: APPLY FILTERS & FETCH AGGREGATED DATA
     */
    applyFilters: function () {
        return new Promise((resolve) => {
            const btnText = document.getElementById('btn-run-text');
            if (btnText) btnText.innerText = "PROCESSING...";
            document.getElementById('loading').classList.remove('hidden');

            const month = document.getElementById('select-month').value;
            const year = document.getElementById('select-year').value;
            const material = this.filterMode === 'material' ? document.getElementById('select-material').value : '';

            console.log(`[V7 DEBUG] Running Query: Month=${month}, Year=${year}, Material=${material}`);

            const cb = 'bkk_v6_' + Math.round(Math.random() * 100000);
            window[cb] = (result) => {
                console.log("[V7 DEBUG] Data Received:", result);
                if (btnText) btnText.innerText = "RUN ANALYTICS";
                delete window[cb];
                if (result && result.data && result.data.length > 0) {
                    this.aggregatedData = result.data;
                    this.availableMaterials = result.materials || [];
                    this.populateMaterialSelect();
                    this.renderDashboard();
                    document.getElementById('sync-label').innerText = `SYNCED (V7): ${new Date().toLocaleTimeString()}`;
                } else {
                    console.warn("[V7 DEBUG] Result empty or invalid:", result);
                    this.aggregatedData = [];
                    this.renderDashboard(); // Render empty state with msg
                    alert("DATA TIDAK DITEMUKAN: Periksa apakah ada data pada periode " + month + "/" + year + " di 10.000 baris terbaru.");
                }
                document.getElementById('loading').classList.add('hidden');
                resolve();
            };

            const baseUrl = CONFIG.BKK_DOWNTIME_API_URL.split('?')[0];
            const matParam = material ? `&material=${encodeURIComponent(material)}` : '';
            const script = document.createElement('script');
            script.src = `${baseUrl}?action=getDowntimeQuery&month=${month}&year=${year}${matParam}&callback=${cb}&t=${Date.now()}`;
            console.log("[V7 DEBUG] Script Source:", script.src);
            document.body.appendChild(script);
        });
    },

    populateMaterialSelect: function () {
        const select = document.getElementById('select-material');
        const currentVal = select.value;
        select.innerHTML = '<option value="">SELECT MATERIAL...</option>';
        this.availableMaterials.forEach(m => {
            select.innerHTML += `<option value="${m}">${m}</option>`;
        });
        select.value = currentVal;
    },

    setFilterMode: function (mode) {
        this.filterMode = mode;
        document.getElementById('btn-overall').classList.toggle('active', mode === 'overall');
        document.getElementById('btn-material').classList.toggle('active', mode === 'material');
        document.getElementById('material-filter-container').style.display = mode === 'material' ? 'block' : 'none';

        if (mode === 'overall') {
            document.getElementById('select-material').value = '';
        }
        // V7: Don't auto-fetch, wait for button click
    },

    setTimeView: function (view) {
        this.timeView = view;
        document.getElementById('btn-daily').classList.toggle('active', view === 'daily');
        document.getElementById('btn-weekly').classList.toggle('active', view === 'weekly');
        document.getElementById('btn-monthly').classList.toggle('active', view === 'monthly');

        if (this.aggregatedData.length > 0) {
            this.renderDashboard(); // Local re-render if data already exists
        }
    },

    /**
     * RENDER ENGINE V7
     */
    renderDashboard: function () {
        this.renderKPIs();
        this.renderVolumeTrend();
        this.renderDistribution();
        this.renderProcessCharts();
    },

    renderKPIs: function () {
        if (this.aggregatedData.length === 0) {
            ['val-netto', 'val-trucks', 'val-cycle', 'val-efficiency'].forEach(id => {
                document.getElementById(id).innerText = '-';
                document.getElementById(id).style.color = '#444';
            });
            return;
        }

        ['val-netto', 'val-trucks', 'val-cycle', 'val-efficiency'].forEach(id => {
            document.getElementById(id).style.color = ''; // Reset color
        });

        const totals = this.aggregatedData.reduce((acc, d) => {
            acc.netto += d.netto;
            acc.trucks += d.trucks;
            acc.cycleTotal += (d.avgCycle * d.trucks);
            return acc;
        }, { netto: 0, trucks: 0, cycleTotal: 0 });

        document.getElementById('val-netto').innerText = Math.round(totals.netto).toLocaleString();
        document.getElementById('val-trucks').innerText = totals.trucks;

        const avgCycle = totals.cycleTotal / totals.trucks;
        document.getElementById('val-cycle').innerText = this.formatMinutesToTime(avgCycle);

        const efficiency = Math.max(0, Math.min(100, (45 / avgCycle) * 100));
        document.getElementById('val-efficiency').innerText = `${Math.round(efficiency)}%`;
    },

    renderVolumeTrend: function () {
        if (this.aggregatedData.length === 0) {
            document.querySelector("#chart-main-volume").innerHTML = `
                <div style="display:flex; height:100%; align-items:center; justify-content:center; color:#444; font-family:Orbitron; font-size:1.2rem; letter-spacing:2px;">
                    <i class="fas fa-search" style="margin-right:15px; opacity:0.5;"></i> READY TO SCAN...
                </div>`;
            return;
        }

        const groups = {};
        this.aggregatedData.forEach(d => {
            const dateObj = new Date(d.date);
            const keys = {
                daily: d.date,
                weekly: this.getWeekStr(dateObj),
                monthly: d.date.substring(0, 7)
            };
            const key = keys[this.timeView] || keys.daily;

            if (!groups[key]) groups[key] = { netto: 0, trucks: 0 };
            groups[key].netto += d.netto;
            groups[key].trucks += d.trucks;
        });

        const sortedKeys = Object.keys(groups).sort();
        const seriesData = sortedKeys.map(k => Math.round(groups[k].netto));

        const options = {
            series: [{ name: 'NETTO (KG)', data: seriesData }],
            chart: {
                type: 'area', height: 380, toolbar: { show: false }, zoom: { enabled: false }
            },
            dataLabels: { enabled: false },
            colors: ['#00f3ff'],
            fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.1 } },
            stroke: { curve: 'smooth', width: 3 },
            xaxis: {
                categories: sortedKeys,
                labels: { style: { colors: '#64748b', fontSize: '10px', fontFamily: 'Orbitron' } }
            },
            yaxis: {
                labels: { formatter: val => (val / 1000).toFixed(0) + 'T', style: { colors: '#64748b' } }
            },
            grid: { borderColor: 'rgba(255,255,255,0.05)' },
            tooltip: { theme: 'dark' }
        };

        if (this.charts.volume) this.charts.volume.destroy();
        this.charts.volume = new ApexCharts(document.querySelector("#chart-main-volume"), options);
        this.charts.volume.render();
    },

    renderDistribution: function () {
        if (this.aggregatedData.length === 0) {
            document.querySelector("#chart-distribution").innerHTML = `<div style="display:flex; height:100%; align-items:center; justify-content:center; color:#444; font-family:Orbitron; font-size:0.7rem;">NO DATA</div>`;
            return;
        }

        const totals = this.aggregatedData.reduce((acc, d) => {
            acc.intake += (d.netto * d.dist.intake / 100);
            acc.direct += (d.netto * d.dist.direct / 100);
            return acc;
        }, { intake: 0, direct: 0 });

        const options = {
            series: [Math.round(totals.intake), Math.round(totals.direct)],
            labels: ['INTAKE', 'DIRECT'],
            chart: { type: 'donut', height: 380 },
            colors: ['#00f3ff', '#ffcc00'],
            stroke: { show: false },
            legend: { position: 'bottom', labels: { colors: '#fff' }, fontFamily: 'Orbitron' },
            plotOptions: { pie: { donut: { size: '75%' } } },
            tooltip: { theme: 'dark', y: { formatter: val => val.toLocaleString() + ' KG' } }
        };

        if (this.charts.dist) this.charts.dist.destroy();
        this.charts.dist = new ApexCharts(document.querySelector("#chart-distribution"), options);
        this.charts.dist.render();
    },

    renderProcessCharts: function () {
        if (this.aggregatedData.length === 0) {
            const emptyHtml = `<div style="display:flex; height:100%; align-items:center; justify-content:center; color:#444; font-family:Orbitron; font-size:0.7rem;">SELECT PERIOD & CLICK RUN</div>`;
            document.getElementById("chart-process-a").innerHTML = emptyHtml;
            document.getElementById("chart-process-b").innerHTML = emptyHtml;
            return;
        }

        const totalTrucks = this.aggregatedData.reduce((acc, d) => acc + d.trucks, 0);
        const avg = this.aggregatedData.reduce((acc, d) => {
            acc.pt += (d.procs.pt * d.trucks);
            acc.pb += (d.procs.pb * d.trucks);
            acc.man += (d.procs.man * d.trucks);
            acc.qc += (d.procs.qc * d.trucks);
            return acc;
        }, { pt: 0, pb: 0, man: 0, qc: 0 });

        const dataA = [(avg.pt / totalTrucks).toFixed(1), (avg.pb / totalTrucks).toFixed(1)];
        const dataB = [(avg.man / totalTrucks).toFixed(1), (avg.qc / totalTrucks).toFixed(1)];

        const optionsA = {
            series: [{ name: 'Avg Duration', data: dataA }],
            chart: { type: 'bar', height: 280, toolbar: { show: false } },
            plotOptions: { bar: { columnWidth: '45%', distributed: true, borderRadius: 6 } },
            colors: ['#00f3ff', '#00ff88'],
            xaxis: { categories: ['TIMBANG', 'BONGKAR'], labels: { style: { colors: '#fff', fontFamily: 'Orbitron', fontSize: '9px' } } },
            legend: { show: false }, tooltip: { theme: 'dark' }
        };

        const optionsB = {
            series: [{ name: 'Avg Duration', data: dataB }],
            chart: { type: 'bar', height: 280, toolbar: { show: false } },
            plotOptions: { bar: { columnWidth: '45%', distributed: true, borderRadius: 6 } },
            colors: ['#bc13fe', '#ff003c'],
            xaxis: { categories: ['MANUVER', 'QC DOWNTIME'], labels: { style: { colors: '#fff', fontFamily: 'Orbitron', fontSize: '9px' } } },
            legend: { show: false }, tooltip: { theme: 'dark' }
        };

        if (this.charts.procA) this.charts.procA.destroy();
        if (this.charts.procB) this.charts.procB.destroy();
        this.charts.procA = new ApexCharts(document.querySelector("#chart-process-a"), optionsA);
        this.charts.procB = new ApexCharts(document.querySelector("#chart-process-b"), optionsB);
        this.charts.procA.render();
        this.charts.procB.render();
    },

    showDrillDown: function (label) {
        const modal = document.getElementById('modal-drill');
        modal.style.display = 'flex';
        document.getElementById('modal-header').innerText = `SUMMARY: ${label}`;
        document.getElementById('modal-content-body').innerHTML = `
            <div style="text-align:center; padding:50px; color:#666; font-family:Orbitron;">
                <i class="fas fa-bolt" style="font-size:3rem; color:var(--neon-gold); margin-bottom:20px;"></i><br>
                DIRECT ANALYTICS V7 ACTIVE<br>
                <span style="font-size:0.8rem; color:#444;">Detailed logs are hidden for maximum performance.</span>
            </div>
        `;
    },

    closeModal: function () {
        document.getElementById('modal-drill').style.display = 'none';
    },

    // HELPERS
    getWeekStr: function (date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const weekNo = Math.ceil((((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
    },

    formatMinutesToTime: function (totalMin) {
        if (isNaN(totalMin) || totalMin === 0) return "00:00";
        const mins = Math.floor(totalMin);
        const secs = Math.round((totalMin - mins) * 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
};

window.onload = () => BKKDowntimeApp.init();
