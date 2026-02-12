const BKKDowntimeApp = {
    data: [],
    charts: {},

    init: async function () {
        console.log("Initializing BKK Downtime App...");
        await this.fetchData();

        // Auto refresh every 5 minutes
        setInterval(() => this.fetchData(), 300000);
    },

    fetchData: async function () {
        try {
            const response = await fetch(`${CONFIG.BKK_DOWNTIME_API_URL}&t=${new Date().getTime()}`);
            const result = await response.json();

            if (result.data) {
                this.data = result.data;
                this.renderDashboard();
                document.getElementById('refresh-time').innerText = `LAST SYNC: ${new Date().toLocaleTimeString()}`;
            }

            document.getElementById('loading').classList.add('hidden');
        } catch (error) {
            console.error("Fetch Error:", error);
            alert("Gagal mengambil data BKK Downtime.");
        }
    },

    renderDashboard: function () {
        this.renderMetrics();
        this.renderTable();
        this.renderCharts();
    },

    renderMetrics: function () {
        if (this.data.length === 0) return;

        // Calculate Averages
        let totalPB = 0;
        let totalQC = 0;
        let totalMoisture = 0;
        let countPB = 0;
        let countQC = 0;
        let countMoisture = 0;

        this.data.forEach(d => {
            // PB Total (format might be HH:mm:ss or mm:ss)
            const pbMin = this.parseTimeToMinutes(d.pb_total);
            if (pbMin > 0) { totalPB += pbMin; countPB++; }

            // QC Total
            const qcMin = this.parseTimeToMinutes(d.qc_total);
            if (qcMin > 0) { totalQC += qcMin; countQC++; }

            // Moisture
            const moiste = parseFloat(d.moisture);
            if (!isNaN(moiste)) { totalMoisture += moiste; countMoisture++; }
        });

        const avgPB = countPB > 0 ? totalPB / countPB : 0;
        const avgQC = countQC > 0 ? totalQC / countQC : 0;
        const avgMoist = countMoisture > 0 ? totalMoisture / countMoisture : 0;

        document.getElementById('avg-pb-total').innerText = this.formatMinutesToTime(avgPB);
        document.getElementById('avg-qc-total').innerText = this.formatMinutesToTime(avgQC);
        document.getElementById('avg-moisture').innerText = `${avgMoist.toFixed(1)}%`;
    },

    renderTable: function () {
        const tbody = document.querySelector('#table-downtime tbody');
        tbody.innerHTML = "";

        // Show last 20 entries
        const recent = this.data.slice(-20).reverse();
        recent.forEach(d => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${d.nopol}</td>
                <td><span style="color:var(--neon-gold)">${d.material}</span></td>
                <td style="color:var(--neon-green)">${d.pb_total || '-'}</td>
                <td style="color:var(--neon-red)">${d.qc_total || '-'}</td>
                <td style="font-weight:700;">${d.moisture}%</td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderCharts: function () {
        const last10 = this.data.slice(-10);
        const categories = last10.map(d => d.nopol);
        const pbData = last10.map(d => this.parseTimeToMinutes(d.pb_total));
        const qcData = last10.map(d => this.parseTimeToMinutes(d.qc_total));

        const options = {
            series: [
                { name: 'PB TIME (Min)', data: pbData },
                { name: 'QC TIME (Min)', data: qcData }
            ],
            chart: { type: 'bar', height: '100%', stacked: true, toolbar: { show: false } },
            colors: ['#00ff88', '#ff003c'],
            plotOptions: { bar: { borderRadius: 4, columnWidth: '40%' } },
            xaxis: {
                categories: categories,
                labels: { style: { colors: '#64748b', fontSize: '10px' } }
            },
            yaxis: { labels: { style: { colors: '#64748b' } } },
            legend: { position: 'top', horizontalAlign: 'right', labels: { colors: '#fff' } },
            grid: { borderColor: 'rgba(255,255,255,0.05)' },
            tooltip: { theme: 'dark' }
        };

        if (this.charts.main) this.charts.main.destroy();
        this.charts.main = new ApexCharts(document.querySelector("#chart-downtime"), options);
        this.charts.main.render();
    },

    // HELPERS
    parseTimeToMinutes: function (timeStr) {
        if (!timeStr) return 0;
        const parts = timeStr.split(':');
        if (parts.length === 3) {
            // HH:mm:ss
            return (parseInt(parts[0]) * 60) + parseInt(parts[1]) + (parseInt(parts[2]) / 60);
        } else if (parts.length === 2) {
            // mm:ss
            return parseInt(parts[0]) + (parseInt(parts[1]) / 60);
        }
        return parseFloat(timeStr) || 0;
    },

    formatMinutesToTime: function (totalMin) {
        const mins = Math.floor(totalMin);
        const secs = Math.round((totalMin - mins) * 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
};

window.onload = () => BKKDowntimeApp.init();
