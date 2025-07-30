Object.assign(ContaApp, {
    async renderDashboard() {
        if (!this.empresa.dashboardWidgets) {
            this.empresa.dashboardWidgets = ['ingresos', 'gastos', 'resultadoNeto', 'bancos'];
        }
        if (!this.empresa.dashboardContentWidgets || !this.empresa.dashboardContentWidgets.order) {
            this.empresa.dashboardContentWidgets = {
                order: ['financialPerformance', 'activity-feed', 'topExpenses', 'quick-actions'],
                settings: {
                    financialPerformance: { timeRange: 'last6months', visible: true },
                    'activity-feed': { visible: true },
                    topExpenses: { timeRange: 'currentMonth', visible: true },
                    'quick-actions': { visible: true }
                }
            };
        }

        // --- INICIO DE LA LÓGICA REESTRUCTURADA Y CORREGIDA ---
        const hoy = new Date();
        const finPeriodoActual = hoy.toISOString().slice(0, 10);
        const inicioPeriodoActual = new Date(new Date().setDate(hoy.getDate() - 30)).toISOString().slice(0, 10);
        const finPeriodoAnterior = new Date(new Date().setDate(hoy.getDate() - 31)).toISOString().slice(0, 10);
        const inicioPeriodoAnterior = new Date(new Date().setDate(hoy.getDate() - 60)).toISOString().slice(0, 10);

        const saldosPeriodoActual = this.getSaldosPorPeriodo(finPeriodoActual, inicioPeriodoActual);
        const saldosPeriodoAnterior = this.getSaldosPorPeriodo(finPeriodoAnterior, inicioPeriodoAnterior);
        const saldosAcumulados = this.getSaldosPorPeriodo();

        const ingresosPeriodo = saldosPeriodoActual.find(c => c.codigo === '400')?.saldo || 0;
        const costosPeriodo = saldosPeriodoActual.find(c => c.codigo === '500')?.saldo || 0;
        const gastosPeriodo = saldosPeriodoActual.find(c => c.codigo === '600')?.saldo || 0;
        const totalEgresosPeriodo = costosPeriodo + gastosPeriodo;

        const ingresosPeriodoAnterior = saldosPeriodoAnterior.find(c => c.codigo === '400')?.saldo || 0;
        const costosPeriodoAnterior = saldosPeriodoAnterior.find(c => c.codigo === '500')?.saldo || 0;
        const gastosPeriodoAnterior = saldosPeriodoAnterior.find(c => c.codigo === '600')?.saldo || 0;
        const totalEgresosAnterior = costosPeriodoAnterior + gastosPeriodoAnterior;
        
        const bancosSaldo = saldosAcumulados.find(c => c.codigo === '110')?.saldo || 0;
        const cxcSaldo = saldosAcumulados.find(c => c.codigo === '120')?.saldo || 0;
        const inventarioSaldo = saldosAcumulados.find(c => c.codigo === '130')?.saldo || 0;
        const cxpSaldo = saldosAcumulados.find(c => c.codigo === '210')?.saldo || 0;
        // --- FIN DE LA LÓGICA REESTRUCTURADA ---

        const currentLayout = this.empresa.dashboardLayout || 'grid';
        document.getElementById('page-actions-header').innerHTML = `
            <div class="flex items-center gap-4">
                <div class="flex items-center gap-1">
                    <button class="conta-btn-icon layout-toggle ${currentLayout === 'grid' ? 'active' : ''}" title="Vista de Cuadrícula" onclick="ContaApp.toggleDashboardLayout('grid')"><i class="fa-solid fa-grip"></i></button>
                    <button class="conta-btn-icon layout-toggle ${currentLayout === 'list' ? 'active' : ''}" title="Vista de Lista" onclick="ContaApp.toggleDashboardLayout('list')"><i class="fa-solid fa-bars"></i></button>
                </div>
                <button class="conta-btn conta-btn-small conta-btn-accent" onclick="ContaApp.abrirModalPersonalizarDashboard()"><i class="fa-solid fa-wand-magic-sparkles me-2"></i> Personalizar</button>
            </div>`;
        
        const getTendenciaHTML = (valorActual, valorAnterior) => {
            if (valorAnterior === 0 && valorActual !== 0) return `<span class="text-xs text-[var(--color-text-secondary)]">Nuevo</span>`;
            if (valorAnterior === 0) return '';
            const cambio = valorActual - valorAnterior;
            const porcentaje = Math.abs(valorAnterior) > 0 ? (cambio / Math.abs(valorAnterior)) * 100 : 0;
            const esPositivo = porcentaje >= 0;
            const colorClass = esPositivo ? 'conta-text-success' : 'conta-text-danger';
            const icon = esPositivo ? 'fa-arrow-up' : 'fa-arrow-down';
            
            return `<span class="text-xs font-bold ${colorClass} flex items-center gap-1"><i class="fa-solid ${icon}"></i>${Math.abs(porcentaje).toFixed(1)}%</span>`;
        };

        const kpiWidgetDefinitions = {
            ingresos: { title: 'Ingresos (Últ. 30 días)', value: () => ingresosPeriodo, colorClass: 'conta-text-success', link: "ContaApp.irModulo('ventas')", tendencia: getTendenciaHTML(ingresosPeriodo, ingresosPeriodoAnterior) },
            gastos: { title: 'Costos + Gastos (Últ. 30 días)', value: () => totalEgresosPeriodo, colorClass: 'conta-text-danger', link: "ContaApp.irModulo('gastos')", tendencia: getTendenciaHTML(totalEgresosPeriodo, totalEgresosAnterior) },
            resultadoNeto: { title: 'Resultado Neto (Últ. 30 días)', value: () => ingresosPeriodo - totalEgresosPeriodo, colorClass: 'dinamica', link: "ContaApp.irModulo('reportes', { submodulo: 'pnl' })", tendencia: getTendenciaHTML(ingresosPeriodo - totalEgresosPeriodo, ingresosPeriodoAnterior - totalEgresosAnterior) },
            bancos: { title: 'Saldo en Bancos (Actual)', value: () => bancosSaldo, colorClass: 'conta-text-primary', link: "ContaApp.irModulo('bancos')" },
            cxc: { title: 'Cuentas por Cobrar (Actual)', value: () => cxcSaldo, colorClass: 'conta-text-accent', link: "ContaApp.irModulo('cxc')" },
            cxp: { title: 'Cuentas por Pagar (Actual)', value: () => cxpSaldo, colorClass: 'conta-text-danger', link: "ContaApp.irModulo('cxp')" },
            inventario: { title: 'Valor de Inventario (Actual)', value: () => inventarioSaldo, colorClass: 'conta-text-primary', link: "ContaApp.irModulo('inventario')" }
        };

        const kpiWidgetsHTML = this.empresa.dashboardWidgets.map(widgetId => {
            const widget = kpiWidgetDefinitions[widgetId];
            if (!widget) return '';
            const valor = widget.value();
            let colorClass = widget.colorClass;
            if (colorClass === 'dinamica') colorClass = valor >= 0 ? 'conta-text-success' : 'conta-text-danger';
            
            return `<a onclick="${widget.link}" class="conta-card conta-card-clickable kpi-dashboard-card w-64">
                        <div class="flex justify-between items-start">
                            <span class="text-xs text-[var(--color-text-secondary)]">${widget.title}</span>
                            ${widget.tendencia || ''}
                        </div>
                        <div class="flex justify-between items-end">
                            <p class="font-bold text-2xl ${colorClass} mt-1">${this.formatCurrency(valor)}</p>
                            <div class="h-8 w-20"><canvas id="sparkline-${widgetId}"></canvas></div>
                        </div>
                    </a>`;
        }).join('');
        
        const timeRangeSelectorHTML = (chartId, timeRange) => {
            const options = { currentMonth: 'Este Mes', last3months: 'Últ. 3 Meses', last6months: 'Últ. 6 Meses', yearToDate: 'Año Actual' };
            let optionsHTML = '';
            for(const [key, value] of Object.entries(options)) {
                optionsHTML += `<option value="${key}" ${key === timeRange ? 'selected' : ''}>${value}</option>`;
            }
            return `<select class="conta-input !p-1 text-xs" onchange="ContaApp.updateChartTimeRange('${chartId}', this.value)">${optionsHTML}</select>`;
        };

        const contentWidgetDefinitions = {
            financialPerformance: (settings) => `<div class="widget-full-height">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="conta-subtitle !mb-0 !border-0">Ingresos vs. Gastos</h3>
                    ${timeRangeSelectorHTML('financialPerformance', settings.timeRange)}
                </div>
                <div id="financial-performance-container" class="flex-grow"></div>
            </div>`,
            'activity-feed': () => `<div><h3 class="conta-subtitle !mb-2 !border-0">Actividad Reciente</h3><div id="activity-feed-container"></div></div>`,
            topExpenses: (settings) => `<div class="widget-full-height">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="conta-subtitle !mb-0 !border-0">Principales Gastos</h3>
                    ${timeRangeSelectorHTML('topExpenses', settings.timeRange)}
                </div>
                <div id="top-expenses-container" class="flex-grow"></div>
            </div>`,
            'quick-actions': () => `<div class="h-full">
                <h3 class="conta-subtitle !mb-4 !border-0">Acciones Rápidas</h3>
                <div class="grid grid-cols-2 gap-3 h-full">
                    <a onclick="ContaApp.irModulo('ventas', {action: 'new'})" class="quick-action-button"><i class="fa-solid fa-file-invoice-dollar fa-xl"></i><span class="text-sm font-semibold">Nueva Venta</span></a>
                    <a onclick="ContaApp.abrirModalGasto()" class="quick-action-button"><i class="fa-solid fa-receipt fa-xl"></i><span class="text-sm font-semibold">Nuevo Gasto</span></a>
                    <a onclick="ContaApp.abrirModalPagoRapido()" class="quick-action-button"><i class="fa-solid fa-hand-holding-dollar fa-xl"></i><span class="text-sm font-semibold">Registrar Pago</span></a>
                    <a onclick="ContaApp.abrirModalAjusteInventario()" class="quick-action-button"><i class="fa-solid fa-wrench fa-xl"></i><span class="text-sm font-semibold">Ajustar Stock</span></a>
                </div>
            </div>`
        };
        
        const contentWidgetsHTML = this.empresa.dashboardContentWidgets.order.map(widgetId => {
            const settings = this.empresa.dashboardContentWidgets.settings[widgetId];
            if (!settings || !settings.visible) return '';
            return `<div class="conta-card flex flex-col" data-widget-id="${widgetId}">${contentWidgetDefinitions[widgetId](settings)}</div>`;
        }).join('');

        const layoutClass = currentLayout === 'grid' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1';

        // ===== INICIO DE LA CORRECCIÓN FINAL DEL LAYOUT =====
        // 1. Se añade w-full a la cuadrícula para que ocupe todo el ancho del contenedor.
        // 2. Se cambia el breakpoint a "lg" para que el 2x2 se active en pantallas más grandes.
        const dashboardHTML = `
            <div class="max-w-7xl mx-auto h-full flex flex-col">
                <div class="flex-shrink-0 flex flex-nowrap gap-4 overflow-x-auto pb-4">${kpiWidgetsHTML}</div>
                <div id="dashboard-grid" class="flex-grow w-full grid ${layoutClass} lg:grid-rows-2 gap-6 mt-6 animate-fadeInUp">
                    ${contentWidgetsHTML}
                </div>
            </div>
        `;
        // ===== FIN DE LA CORRECCIÓN FINAL DEL LAYOUT =====
        
        document.getElementById("dashboard").innerHTML = dashboardHTML;
        document.getElementById("dashboard").style.height = '100%';

        this.empresa.dashboardContentWidgets.order.forEach(widgetId => {
            const settings = this.empresa.dashboardContentWidgets.settings[widgetId];
            if (settings && settings.visible) {
                if (widgetId === 'financialPerformance') this.renderFinancialPerformanceChart(settings.timeRange);
                else if (widgetId === 'topExpenses') this.renderTopExpensesChart(settings.timeRange);
                else if (widgetId === 'activity-feed') this.renderActivityFeed();
            }
        });

        this.initDashboardDragAndDrop();
        this.renderSparklines();
    },

    guardarPersonalizacionDashboard(e) {
        e.preventDefault();
        const selectedKPIs = Array.from(document.querySelectorAll('.kpi-checkbox:checked')).map(cb => cb.value);
        
        const contentCheckboxes = document.querySelectorAll('.content-checkbox');
        contentCheckboxes.forEach(cb => {
            if (!this.empresa.dashboardContentWidgets.settings[cb.value]) {
                this.empresa.dashboardContentWidgets.settings[cb.value] = {};
            }
            this.empresa.dashboardContentWidgets.settings[cb.value].visible = cb.checked;
        });

        this.empresa.dashboardWidgets = selectedKPIs;
        this.saveAll();
        this.closeModal();
        this.irModulo('dashboard');
        this.showToast('Dashboard actualizado.', 'success');
    },

    initDashboardDragAndDrop() {
        const grid = document.getElementById('dashboard-grid');
        if (grid) {
            new Sortable(grid, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: (evt) => {
                    const newOrder = Array.from(evt.target.children).map(item => item.dataset.widgetId);
                    this.empresa.dashboardContentWidgets.order = newOrder;
                    this.saveAll();
                    this.showToast('Orden del dashboard guardado.', 'success');
                }
            });
        }
    },

    toggleDashboardLayout(newLayout) {
        if (this.empresa.dashboardLayout !== newLayout) {
            this.empresa.dashboardLayout = newLayout;
            this.saveAll();
            this.irModulo('dashboard');
        }
    },

    updateChartTimeRange(chartId, timeRange) {
        if (this.empresa.dashboardContentWidgets.settings[chartId]) {
            this.empresa.dashboardContentWidgets.settings[chartId].timeRange = timeRange;
            this.saveAll();
        }
        if (chartId === 'financialPerformance') this.renderFinancialPerformanceChart(timeRange);
        if (chartId === 'topExpenses') this.renderTopExpensesChart(timeRange);
    },

    getSparklineData(widgetId) {
        const data = [];
        const today = new Date();
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateString = date.toISOString().slice(0, 10);
            
            let value = 0;
            switch(widgetId) {
                case 'ingresos':
                    value = this.transacciones.filter(t => t.tipo === 'venta' && t.fecha === dateString && t.estado !== 'Anulada').reduce((sum, t) => sum + t.total, 0);
                    break;
                case 'gastos':
                    value = this.transacciones.filter(t => (t.tipo === 'gasto' || t.tipo === 'compra_inventario') && t.fecha === dateString && t.estado !== 'Anulada').reduce((sum, t) => sum + t.total, 0);
                    break;
                case 'resultadoNeto': {
                    const saldosHastaHoy = this.getSaldosPorPeriodo(dateString, firstDayOfYear);
                    const ingresos = saldosHastaHoy.find(c => c.codigo === '400')?.saldo || 0;
                    const costos = saldosHastaHoy.find(c => c.codigo === '500')?.saldo || 0;
                    const gastos = saldosHastaHoy.find(c => c.codigo === '600')?.saldo || 0;
                    value = ingresos - costos - gastos;
                    break;
                }
                case 'bancos':
                case 'cxc':
                case 'cxp':
                case 'inventario': {
                    const accountCodes = { bancos: '110', cxc: '120', cxp: '210', inventario: '130' };
                    const saldosDelDia = this.getSaldosPorPeriodo(dateString);
                    value = saldosDelDia.find(c => c.codigo === accountCodes[widgetId])?.saldo || 0;
                    break;
                }
            }
            data.push(value);
        }
        return data;
    },

    renderSparklines() {
        this.empresa.dashboardWidgets.forEach(widgetId => {
            const canvas = document.getElementById(`sparkline-${widgetId}`);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const data = this.getSparklineData(widgetId);
            const pValue = canvas.closest('.kpi-dashboard-card').querySelector('p');
            const widgetColor = getComputedStyle(pValue).color;

            const existingChart = Chart.getChart(ctx);
            if (existingChart) existingChart.destroy();

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: Array(7).fill(''),
                    datasets: [{
                        data: data,
                        borderColor: widgetColor,
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: true,
                        backgroundColor: widgetColor.replace(')', ', 0.1)').replace('rgb', 'rgba'),
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { y: { display: false }, x: { display: false } },
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    layout: { padding: { top: 5, bottom: 5 } }
                }
            });
        });
    },

    getDateRange(timeRange) {
        const hoy = new Date();
        let startDate, endDate = hoy.toISOString().slice(0, 10);
        let interval = 'month';

        switch (timeRange) {
            case 'currentMonth':
                startDate = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
                interval = 'day';
                break;
            case 'last3months':
                startDate = new Date(new Date().setMonth(hoy.getMonth() - 2));
                startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1).toISOString().slice(0, 10);
                break;
            case 'yearToDate':
                startDate = new Date(hoy.getFullYear(), 0, 1).toISOString().slice(0, 10);
                break;
            case 'last6months':
            default:
                startDate = new Date(new Date().setMonth(hoy.getMonth() - 5));
                startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1).toISOString().slice(0, 10);
                break;
        }
        return { startDate, endDate, interval };
    },

    getFinancialPerformanceData(timeRange) {
        const { startDate, endDate, interval } = this.getDateRange(timeRange);
        const labels = [];
        const ingresosData = [];
        const gastosData = [];
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

        let current = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');
        
        while (current <= end) {
            let label, periodStartStr, periodEndStr;

            if (interval === 'month') {
                label = `${monthNames[current.getMonth()]} ${current.getFullYear()}`;
                periodStartStr = new Date(current.getFullYear(), current.getMonth(), 1).toISOString().slice(0, 10);
                periodEndStr = new Date(current.getFullYear(), current.getMonth() + 1, 0).toISOString().slice(0, 10);
            } else { // 'day'
                label = `${current.getDate()}/${monthNames[current.getMonth()]}`;
                periodStartStr = periodEndStr = current.toISOString().slice(0, 10);
            }
            labels.push(label);

            const saldosPeriodo = this.getSaldosPorPeriodo(periodEndStr, periodStartStr);
            const ingresos = saldosPeriodo.find(c => c.codigo === '400')?.saldo || 0;
            const costos = saldosPeriodo.find(c => c.codigo === '500')?.saldo || 0;
            const gastos = saldosPeriodo.find(c => c.codigo === '600')?.saldo || 0;

            ingresosData.push(ingresos);
            gastosData.push(costos + gastos);

            if (interval === 'month') {
                current.setMonth(current.getMonth() + 1);
            } else {
                current.setDate(current.getDate() + 1);
            }
        }
        
        const hasData = ingresosData.some(d => d > 0) || gastosData.some(d => d > 0);
        return { labels, ingresosData, gastosData, hasData };
    },

    getTopExpensesData(timeRange) {
        const { startDate, endDate } = this.getDateRange(timeRange);
        const saldosPeriodo = this.getSaldosPorPeriodo(endDate, startDate);
        const cuentasGastoDetalle = this.planDeCuentas.filter(c => c.tipo === 'DETALLE' && (c.codigo.startsWith('5') || c.codigo.startsWith('6')));

        const gastosPorCategoria = cuentasGastoDetalle.map(cuenta => {
            const saldo = saldosPeriodo.find(s => s.id === cuenta.id)?.saldo || 0;
            return { id: cuenta.id, nombre: cuenta.nombre, monto: saldo };
        }).filter(g => g.monto > 0).sort((a, b) => b.monto - a.monto).slice(0, 5);

        const labels = gastosPorCategoria.map(g => g.nombre);
        const data = gastosPorCategoria.map(g => g.monto);
        
        const datasets = [{
            label: 'Gasto del Período',
            data: data,
            backgroundColor: ['#F87171', '#E545B7', '#F77F00', '#33B1FF', '#34D399'].map(c => c + 'CC'),
            borderColor: ['#F87171', '#E545B7', '#F77F00', '#33B1FF', '#34D399'],
            borderWidth: 1
        }];

        return { labels, datasets };
    },

    renderFinancialPerformanceChart(timeRange) {
        if (this.charts.financialPerformance) this.charts.financialPerformance.destroy();
        const container = document.getElementById('financial-performance-container');
        if (!container) return;
        const data = this.getFinancialPerformanceData(timeRange);
        
        if (!data.hasData) {
            container.innerHTML = `<div class="flex items-center justify-center h-full text-center text-[var(--color-text-secondary)]"><i class="fa-solid fa-chart-line fa-2x me-4 opacity-50"></i><div><p class="font-bold">Sin datos</p><p class="text-sm">No hay transacciones en el período.</p></div></div>`;
        } else {
            container.innerHTML = `<canvas id="financialPerformanceChart"></canvas>`;
            const ctx = document.getElementById('financialPerformanceChart').getContext('2d');
            this.charts.financialPerformance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [
                        { label: 'Ingresos', data: data.ingresosData, borderColor: this.getThemeColor('--color-success'), backgroundColor: this.getThemeColor('--color-success') + '33', borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 6, pointBackgroundColor: this.getThemeColor('--color-success') },
                        { label: 'Gastos', data: data.gastosData, borderColor: this.getThemeColor('--color-danger'), backgroundColor: this.getThemeColor('--color-danger') + '33', borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 6, pointBackgroundColor: this.getThemeColor('--color-danger') }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: true, position: 'top', labels: { color: this.getThemeColor('--color-text-secondary'), font: { size: 12, weight: '600' } } } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: this.getThemeColor('--color-border-accent') + '80' }, ticks: { color: this.getThemeColor('--color-text-secondary'), callback: function(value) { return '$' + (value / 1000).toFixed(0) + 'K'; } } },
                        x: { grid: { display: false }, ticks: { color: this.getThemeColor('--color-text-secondary') } }
                    },
                    interaction: { mode: 'index', intersect: false },
                }
            });
        }
    },

    renderTopExpensesChart(timeRange) {
        if (this.charts.topExpenses) this.charts.topExpenses.destroy();
        const container = document.getElementById('top-expenses-container');
        if (!container) return;
        const data = this.getTopExpensesData(timeRange);

        if (data.datasets.length === 0 || data.datasets[0].data.length === 0) {
            container.innerHTML = `<div class="flex items-center justify-center h-full text-center text-[var(--color-text-secondary)]"><i class="fa-solid fa-chart-pie fa-2x me-4 opacity-50"></i><div><p class="font-bold">Sin datos de gastos</p><p class="text-sm">No hay gastos en el período seleccionado.</p></div></div>`;
        } else {
            container.innerHTML = `<canvas id="top-expenses-chart"></canvas>`;
            const ctx = document.getElementById('top-expenses-chart').getContext('2d');
            this.charts.topExpenses = new Chart(ctx, {
                type: 'bar',
                data: { labels: data.labels, datasets: data.datasets },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    barPercentage: 0.5, categoryPercentage: 0.7,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: this.getThemeColor('--color-border-accent') + '80' }, ticks: { color: this.getThemeColor('--color-text-secondary'), callback: function(value) { return '$' + (value / 1000).toFixed(0) + 'K'; } } },
                        x: { grid: { display: false }, ticks: { color: this.getThemeColor('--color-text-secondary'), autoSkip: false, maxRotation: 45, minRotation: 0 } }
                    },
                    interaction: { mode: 'index', intersect: false },
                }
            });
        }
    },

    renderActivityFeed() {
        const container = document.getElementById('activity-feed-container');
        if (!container) return;
        const activity = this.transacciones
            .filter(t => ['venta', 'gasto', 'pago_cliente', 'pago_proveedor'].includes(t.tipo) && t.estado !== 'Anulada')
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, 5);

        if (activity.length === 0) {
            container.innerHTML = `<div class="flex items-center justify-center h-full text-center text-[var(--color-text-secondary)]"><i class="fa-solid fa-clock-rotate-left fa-2x me-4 opacity-50"></i><div><p class="font-bold">Sin actividad reciente</p><p class="text-sm">Aquí aparecerán tus últimas transacciones.</p></div></div>`;
            return;
        }

        let html = '<ul class="activity-feed">';
        activity.forEach(t => {
            let iconClass, icon, title, amount, link;
            const contacto = this.findById(this.contactos, t.contactoId);
            switch (t.tipo) {
                case 'venta':
                    iconClass = 'icon-venta'; icon = 'fa-shopping-cart'; title = `Venta a ${contacto?.nombre || 'N/A'}`; amount = `<span class="conta-text-success font-mono">+${this.formatCurrency(t.total)}</span>`; link = `ContaApp.abrirVistaPreviaFactura(${t.id})`;
                    break;
                case 'gasto':
                    iconClass = 'icon-gasto'; icon = 'fa-receipt'; title = t.descripcion; amount = `<span class="conta-text-danger font-mono">-${this.formatCurrency(t.total)}</span>`; link = `ContaApp.abrirModalHistorialGasto(${t.id})`;
                    break;
                case 'pago_cliente':
                    iconClass = 'icon-pago-cliente'; icon = 'fa-hand-holding-dollar'; title = `Cobro de ${contacto?.nombre || 'N/A'}`; amount = `<span class="conta-text-success font-mono">+${this.formatCurrency(t.monto)}</span>`; link = `ContaApp.abrirModalHistorialFactura(${t.ventaId})`;
                    break;
                case 'pago_proveedor':
                    iconClass = 'icon-pago-proveedor'; icon = 'fa-money-bill-wave'; title = `Pago a ${contacto?.nombre || 'N/A'}`; amount = `<span class="conta-text-danger font-mono">-${this.formatCurrency(t.monto)}</span>`; link = `ContaApp.abrirModalHistorialGasto(${t.gastoId})`;
                    break;
            }
            if(title) {
                html += `<li class="activity-item" onclick="${link}" title="Haz clic para ver detalles"><div class="activity-icon ${iconClass}"><i class="fa-solid ${icon}"></i></div><div class="flex-grow"><p class="font-semibold text-sm truncate">${title}</p><p class="text-xs text-[var(--color-text-secondary)]">${t.fecha}</p></div><div class="font-bold text-sm">${amount}</div></li>`;
            }
        });
        html += '</ul>';
        container.innerHTML = html;
    },
});