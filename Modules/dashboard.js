Object.assign(ContaApp, {
renderDashboard() {
        // --- INICIO DE LA CORRECCIÓN DEFINITIVA ---
        // Asegurarse de que las propiedades de personalización existan ANTES de usarlas.
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
        // --- FIN DE LA CORRECCIÓN DEFINITIVA ---

        const { ingresosPeriodo, gastosPeriodo } = this.getDashboardKpiData();
        const saldosAcumulados = this.getSaldosPorPeriodo();
        const bancosSaldo = saldosAcumulados.find(c => c.codigo === '110')?.saldo || 0;
        const cxcSaldo = saldosAcumulados.find(c => c.codigo === '120')?.saldo || 0;
        const cxpSaldo = saldosAcumulados.find(c => c.codigo === '210')?.saldo || 0;
        const inventarioSaldo = saldosAcumulados.find(c => c.codigo === '130')?.saldo || 0;

        const currentLayout = this.empresa.dashboardLayout || 'grid';
        document.getElementById('page-actions-header').innerHTML = `
            <div class="flex items-center gap-4">
                <div class="flex items-center gap-1">
                    <button class="conta-btn-icon layout-toggle ${currentLayout === 'grid' ? 'active' : ''}" title="Vista de Cuadrícula" onclick="ContaApp.toggleDashboardLayout('grid')"><i class="fa-solid fa-grip"></i></button>
                    <button class="conta-btn-icon layout-toggle ${currentLayout === 'list' ? 'active' : ''}" title="Vista de Lista" onclick="ContaApp.toggleDashboardLayout('list')"><i class="fa-solid fa-bars"></i></button>
                </div>
                <button class="conta-btn conta-btn-small conta-btn-accent" onclick="ContaApp.abrirModalPersonalizarDashboard()"><i class="fa-solid fa-wand-magic-sparkles me-2"></i> Personalizar</button>
            </div>`;
        
        const kpiWidgetDefinitions = {
            ingresos: { title: 'Ingresos (Últ. 30 días)', value: () => ingresosPeriodo, colorClass: 'conta-text-success', link: "ContaApp.irModulo('ventas')" },
            gastos: { title: 'Gastos (Últ. 30 días)', value: () => gastosPeriodo, colorClass: 'conta-text-danger', link: "ContaApp.irModulo('gastos')" },
            resultadoNeto: { title: 'Resultado Neto (Últ. 30 días)', value: () => ingresosPeriodo - gastosPeriodo, colorClass: 'dinamica', link: "ContaApp.irModulo('reportes', { submodulo: 'pnl' })" },
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
                        <div class="flex justify-between items-start"><span class="text-xs text-[var(--color-text-secondary)]">${widget.title}</span><div class="h-8 w-20"><canvas id="sparkline-${widgetId}"></canvas></div></div>
                        <p class="font-bold text-2xl ${colorClass} mt-1">${this.formatCurrency(valor)}</p>
                    </a>`;
        }).join('');

        const timeRangeSelectorHTML = (chartId, timeRange) => `
            <select class="conta-input conta-input-small" onchange="ContaApp.updateChartTimeRange('${chartId}', this.value)">
                <option value="currentMonth" ${timeRange === 'currentMonth' ? 'selected' : ''}>Este Mes</option>
                <option value="last3months" ${timeRange === 'last3months' ? 'selected' : ''}>Últimos 3 Meses</option>
                <option value="last6months" ${timeRange === 'last6months' ? 'selected' : ''}>Últimos 6 Meses</option>
                <option value="yearToDate" ${timeRange === 'yearToDate' ? 'selected' : ''}>Año Actual</option>
            </select>
        `;

        const contentWidgetDefinitions = {
            financialPerformance: (settings) => `<div class="flex justify-between items-center mb-2"><h3 class="conta-subtitle !mb-0 !border-0">Ingresos vs. Gastos</h3>${timeRangeSelectorHTML('financialPerformance', settings.timeRange)}</div><div id="financial-performance-container" class="relative flex-grow"><canvas id="financialPerformanceChart"></canvas></div>`,
            'activity-feed': () => `<h3 class="conta-subtitle">Actividad Reciente</h3><div id="activity-feed-container" class="overflow-y-auto pr-2 flex-grow"></div>`,
            topExpenses: (settings) => `<div class="flex justify-between items-center mb-2"><h3 class="conta-subtitle !mb-0 !border-0">Principales Gastos</h3>${timeRangeSelectorHTML('topExpenses', settings.timeRange)}</div><div id="top-expenses-container" class="relative flex-grow"><canvas id="top-expenses-chart"></canvas></div>`,
            'quick-actions': () => `<h3 class="conta-subtitle !mb-4">Acciones Rápidas</h3>
                <div class="grid grid-cols-2 gap-4 h-full content-center">
                    <button onclick="ContaApp.abrirModalVenta()" class="quick-action-button"><i class="fa-solid fa-cart-plus fa-2x"></i><span class="text-sm font-semibold">Venta</span></button>
                    <button onclick="ContaApp.abrirModalGasto()" class="quick-action-button"><i class="fa-solid fa-receipt fa-2x"></i><span class="text-sm font-semibold">Gasto</span></button>
                    <button onclick="ContaApp.abrirModalRegistroPagoRapido()" class="quick-action-button"><i class="fa-solid fa-exchange-alt fa-2x"></i><span class="text-sm font-semibold">Transacción</span></button>
                    <button onclick="ContaApp.abrirModalAsientoManual()" class="quick-action-button"><i class="fa-solid fa-book-medical fa-2x"></i><span class="text-sm font-semibold">Asiento</span></button>
                </div>`
        };

        const contentWidgetsHTML = this.empresa.dashboardContentWidgets.order.map(widgetId => {
            const settings = this.empresa.dashboardContentWidgets.settings[widgetId] || { visible: true };
            if (!settings.visible) return '';
            const widgetContent = contentWidgetDefinitions[widgetId] ? contentWidgetDefinitions[widgetId](settings) : '';
            return `<div class="conta-card widget-full-height" data-widget-id="${widgetId}">${widgetContent}</div>`;
        }).join('');
        
        const layoutClass = currentLayout === 'grid' ? 'lg:grid-cols-2' : 'lg:grid-cols-1';
        const dashboardHTML = `<div class="flex flex-wrap justify-center gap-4 mb-4">${kpiWidgetsHTML}</div><div id="dashboard-grid" class="grid grid-cols-1 ${layoutClass} gap-6">${contentWidgetsHTML}</div>`;
        
        document.getElementById("dashboard").innerHTML = dashboardHTML;
        
        this.empresa.dashboardContentWidgets.order.forEach(widgetId => {
            const settings = this.empresa.dashboardContentWidgets.settings[widgetId];
            if (settings && settings.visible) {
                if (widgetId === 'financialPerformance') {
                    this.renderFinancialPerformanceChart(settings.timeRange);
                } else if (widgetId === 'topExpenses') {
                    this.renderTopExpensesChart(settings.timeRange);
                } else if (widgetId === 'activity-feed') {
                    this.renderActivityFeed();
                }
            }
        });

        this.initDashboardDragAndDrop();
        this.renderSparklines();
    },
getDashboardKpiData() {
        const hoy = new Date();
        const hace30Dias = new Date(new Date().setDate(hoy.getDate() - 30)).toISOString().slice(0, 10);
        const fechaFin = hoy.toISOString().slice(0, 10);

        const saldosPeriodo = this.getSaldosPorPeriodo(fechaFin, hace30Dias);
        const ingresosPeriodo = saldosPeriodo.find(c => c.codigo === '400')?.saldo || 0;
        const gastosPeriodo = saldosPeriodo.find(c => c.codigo === '500')?.saldo || 0;
        
        return { ingresosPeriodo, gastosPeriodo };
    },
abrirModalPersonalizarDashboard() {
        const kpiDefinitions = {
            ingresos: 'Ingresos (Últ. 30 días)', gastos: 'Gastos (Últ. 30 días)', resultadoNeto: 'Resultado Neto (Últ. 30 días)',
            bancos: 'Saldo en Bancos', cxc: 'Cuentas por Cobrar', cxp: 'Cuentas por Pagar', inventario: 'Valor de Inventario'
        };
        const contentWidgetDefinitions = {
            financialPerformance: 'Gráfico: Ingresos vs. Gastos', 
            'activity-feed': 'Feed de Actividad Reciente',
            topExpenses: 'Gráfico: Principales Gastos', 
            'quick-actions': 'Panel de Acciones Rápidas'
        };

        const selectedKPIs = this.empresa.dashboardWidgets || [];
        const contentSettings = this.empresa.dashboardContentWidgets.settings;

        const kpiCheckboxes = Object.entries(kpiDefinitions).map(([id, title]) => `
            <div class="flex items-center"><input type="checkbox" id="kpi-${id}" value="${id}" class="h-4 w-4 kpi-checkbox" ${selectedKPIs.includes(id) ? 'checked' : ''}><label for="kpi-${id}" class="ml-3 text-sm">${title}</label></div>
        `).join('');

        const contentCheckboxes = Object.entries(contentWidgetDefinitions).map(([id, title]) => {
            // El error estaba aquí, la key 'activity-feed' necesita corchetes.
            const isVisible = contentSettings[id] ? contentSettings[id].visible : true;
            return `<div class="flex items-center"><input type="checkbox" id="content-${id}" value="${id}" class="h-4 w-4 content-checkbox" ${isVisible ? 'checked' : ''}><label for="content-${id}" class="ml-3 text-sm">${title}</label></div>`;
        }).join('');

        const modalHTML = `
            <h3 class="conta-title mb-4">Personalizar Dashboard</h3>
            <p class="text-[var(--color-text-secondary)] mb-4 text-sm">Selecciona los elementos que deseas ver. En el dashboard, puedes arrastrar y soltar los 4 widgets principales para reordenarlos.</p>
            <form onsubmit="ContaApp.guardarPersonalizacionDashboard(event)">
                <div class="conta-card mb-6"><h4 class="conta-subtitle !border-0 !mb-2">Indicadores Superiores (KPIs)</h4><div class="grid grid-cols-2 md:grid-cols-3 gap-4">${kpiCheckboxes}</div></div>
                <div class="conta-card"><h4 class="conta-subtitle !border-0 !mb-2">Widgets de Contenido (Arrastrables)</h4><div class="grid grid-cols-1 md:grid-cols-2 gap-4">${contentCheckboxes}</div></div>
                <div class="flex justify-end gap-2 mt-8"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button type="submit" class="conta-btn">Guardar Cambios</button></div>
            </form>
        `;
        this.showModal(modalHTML, '3xl');
    },
guardarPersonalizacionDashboard(e) {
        e.preventDefault();
        const selectedKPIs = Array.from(document.querySelectorAll('.kpi-checkbox:checked')).map(cb => cb.value);
        
        const contentCheckboxes = document.querySelectorAll('.content-checkbox');
        contentCheckboxes.forEach(cb => {
            // Asegurarse de que el objeto de settings exista antes de asignarle propiedades
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
            this.irModulo('dashboard'); // Re-renderizar el dashboard para aplicar el cambio
        }
    },
updateChartTimeRange(chartId, timeRange) {
        // Guardar la nueva preferencia de tiempo
        if (this.empresa.dashboardContentWidgets.settings[chartId]) {
            this.empresa.dashboardContentWidgets.settings[chartId].timeRange = timeRange;
            this.saveAll();
        }
        // Volver a dibujar solo ese gráfico
        this.renderDashboardCharts(chartId, timeRange);
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
                    value = this.transacciones.filter(t => t.tipo === 'gasto' && t.fecha === dateString).reduce((sum, t) => sum + t.total, 0);
                    break;
                case 'resultadoNeto': {
                    const saldosHastaHoy = this.getSaldosPorPeriodo(dateString, firstDayOfYear);
                    const ingresos = saldosHastaHoy.find(c => c.codigo === '400')?.saldo || 0;
                    const gastos = saldosHastaHoy.find(c => c.codigo === '500')?.saldo || 0;
                    value = ingresos - gastos;
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
                default:
                    value = 0;
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
            const card = canvas.closest('.kpi-dashboard-card');
            const pValue = card.querySelector('p');
            const widgetColor = getComputedStyle(pValue).color;

            // Destruir cualquier gráfico anterior en este canvas para evitar errores
            const existingChart = Chart.getChart(ctx);
            if (existingChart) {
                existingChart.destroy();
            }

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
                        backgroundColor: widgetColor.replace(')', ', 0.1)').replace('rgb', 'rgba'), // Añade un relleno sutil
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { display: false },
                        x: { display: false }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    layout: {
                        padding: { top: 5, bottom: 5 }
                    }
                }
            });
        });
    },
getFinancialPerformanceData(timeRange) {
        const { startDate, endDate, interval } = this.getDateRange(timeRange);
        const labels = [];
        const ingresosData = [];
        const gastosData = [];
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

        let current = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        
        // --- INICIO DE LA CORRECCIÓN DE LÓGICA DE FECHAS ---
        while (current <= end) {
            const year = current.getFullYear();
            const month = current.getMonth();
            const day = current.getDate();

            let label;
            let periodStartStr, periodEndStr;

            if (interval === 'month') {
                label = `${monthNames[month]} ${year}`;
                periodStartStr = new Date(year, month, 1).toISOString().slice(0, 10);
                periodEndStr = new Date(year, month + 1, 0).toISOString().slice(0, 10);
            } else { // 'day'
                label = `${day}/${monthNames[month]}`;
                periodStartStr = periodEndStr = current.toISOString().slice(0, 10);
            }
            labels.push(label);

            let ingresosDelPeriodo = 0;
            let gastosDelPeriodo = 0;

            // Filtramos los asientos que corresponden EXACTAMENTE a este período (día o mes)
            const asientosDelPeriodo = this.asientos.filter(a => 
                a.fecha >= periodStartStr && a.fecha <= periodEndStr
            );
            
            asientosDelPeriodo.forEach(asiento => {
                asiento.movimientos.forEach(mov => {
                    const cuenta = this.findById(this.planDeCuentas, mov.cuentaId);
                    if (cuenta) {
                        if (cuenta.codigo.startsWith('4')) {
                            ingresosDelPeriodo += mov.haber - mov.debe;
                        }
                        else if (cuenta.codigo.startsWith('5')) {
                            gastosDelPeriodo += mov.debe - mov.haber;
                        }
                    }
                });
            });

            ingresosData.push(ingresosDelPeriodo);
            gastosData.push(gastosDelPeriodo);

            // Avanzamos al siguiente día o mes
            if (interval === 'month') {
                current.setMonth(current.getMonth() + 1);
            } else {
                current.setDate(current.getDate() + 1);
            }
        }
        // --- FIN DE LA CORRECCIÓN DE LÓGICA DE FECHAS ---
        
        const hasData = ingresosData.some(d => d > 0) || gastosData.some(d => d > 0);
        return { labels, ingresosData, gastosData, hasData };
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
                startDate = new Date(new Date().setMonth(hoy.getMonth() - 2)).toISOString().slice(0, 10);
                startDate = startDate.substring(0, 8) + '01'; // Inicio del mes
                break;
            case 'yearToDate':
                startDate = new Date(hoy.getFullYear(), 0, 1).toISOString().slice(0, 10);
                break;
            case 'last6months':
            default:
                startDate = new Date(new Date().setMonth(hoy.getMonth() - 5)).toISOString().slice(0, 10);
                startDate = startDate.substring(0, 8) + '01'; // Inicio del mes
                break;
        }
        return { startDate, endDate, interval };
    },
getTopExpensesData(timeRange) {
        const { startDate, endDate } = this.getDateRange(timeRange);
        
        // --- INICIO DE LA MEJORA: Leer desde los asientos, no desde las transacciones ---
        const gastosPorCategoria = {};

        // 1. Filtrar los asientos que están dentro del rango de fechas
        const asientosPeriodo = this.asientos.filter(a => a.fecha >= startDate && a.fecha <= endDate);

        // 2. Recorrer los movimientos de esos asientos
        asientosPeriodo.forEach(asiento => {
            asiento.movimientos.forEach(mov => {
                const cuenta = this.findById(this.planDeCuentas, mov.cuentaId);
                // 3. Si un movimiento es un DEBE a una cuenta de Gasto (código '5'), lo sumamos
                if (cuenta && cuenta.codigo.startsWith('5') && mov.debe > 0) {
                    gastosPorCategoria[mov.cuentaId] = (gastosPorCategoria[mov.cuentaId] || 0) + mov.debe;
                }
            });
        });
        // --- FIN DE LA MEJORA ---

        const topCategorias = Object.entries(gastosPorCategoria)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        const labels = [];
        const data = [];
        const backgroundColors = ['#F87171', '#E545B7', '#F77F00', '#33B1FF', '#34D399'].map(c => c + 'CC');
        const borderColors = ['#F87171', '#E545B7', '#F77F00', '#33B1FF', '#34D399'];

        topCategorias.forEach(([id]) => {
            const cuenta = this.findById(this.planDeCuentas, id);
            if (cuenta) {
                labels.push(cuenta.nombre);
                data.push(gastosPorCategoria[id] || 0);
            }
        });
        
        const datasets = [{
            label: 'Gasto del Período',
            data: data,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1
        }];

        return { labels, datasets };
    },
renderDashboardCharts(chartToUpdate, timeRange) {
        if (chartToUpdate === 'financialPerformance') {
            this.renderFinancialPerformanceChart(timeRange);
        }
        if (chartToUpdate === 'topExpenses') {
            this.renderTopExpensesChart(timeRange);
        }
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
            const newCtx = document.getElementById('financialPerformanceChart').getContext('2d');
            const currentTheme = document.documentElement.getAttribute('data-theme');
            
            let incomeColor = this.getThemeColor('--color-success');
            let expenseColor = this.getThemeColor('--color-danger');
            let incomeBg = this.getThemeColor('--color-success') + '33';
            let expenseBg = this.getThemeColor('--color-danger') + '33';

            if (currentTheme === 'infinito') {
                incomeColor = this.getThemeColor('--color-primary');
                expenseColor = this.getThemeColor('--color-accent');
                const incomeGradient = newCtx.createLinearGradient(0, 0, 0, 300);
                incomeGradient.addColorStop(0, incomeColor + '80');
                incomeGradient.addColorStop(1, incomeColor + '00');
                incomeBg = incomeGradient;
                const expenseGradient = newCtx.createLinearGradient(0, 0, 0, 300);
                expenseGradient.addColorStop(0, expenseColor + '80');
                expenseGradient.addColorStop(1, expenseColor + '00');
                expenseBg = expenseGradient;
            }

            this.charts.financialPerformance = new Chart(newCtx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [
                        { label: 'Ingresos', data: data.ingresosData, borderColor: incomeColor, backgroundColor: incomeBg, borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 6, pointBackgroundColor: incomeColor },
                        { label: 'Gastos', data: data.gastosData, borderColor: expenseColor, backgroundColor: expenseBg, borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 6, pointBackgroundColor: expenseColor }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true, position: 'top', labels: { color: this.getThemeColor('--color-text-secondary'), font: { size: 12, weight: '600' } } } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: this.getThemeColor('--color-border-accent') + '80' }, ticks: { color: this.getThemeColor('--color-text-secondary'), callback: function(value) { return '$' + value / 1000 + 'K'; } } },
                        x: { grid: { display: false }, ticks: { color: this.getThemeColor('--color-text-secondary') } }
                    },
                    interaction: { mode: 'index', intersect: false },
                }
            });
        }
    },
renderTopExpensesChart(timeRange) {
        if (this.charts.topExpenses) {
            this.charts.topExpenses.destroy();
        }
        
        const expensesContainer = document.getElementById('top-expenses-container');
        if (!expensesContainer) return;

        const data = this.getTopExpensesData(timeRange);

        if (data.datasets.length === 0 || data.datasets[0].data.length === 0) {
            expensesContainer.innerHTML = `<div class="flex items-center justify-center h-full text-center text-[var(--color-text-secondary)]"><i class="fa-solid fa-chart-pie fa-2x me-4 opacity-50"></i><div><p class="font-bold">Sin datos de gastos</p><p class="text-sm">No hay gastos en el período seleccionado.</p></div></div>`;
        } else {
            expensesContainer.innerHTML = `<canvas id="top-expenses-chart"></canvas>`;
            const newCtx = document.getElementById('top-expenses-chart').getContext('2d');

            // --- INICIO DE LA MEJORA VISUAL ---
            // Aplicar degradados a los colores de las barras
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const colors = ['#F87171', '#E545B7', '#F77F00', '#33B1FF', '#34D399'];
            
            data.datasets[0].backgroundColor = colors.map(color => {
                const gradient = newCtx.createLinearGradient(0, 0, 0, 300);
                if (currentTheme === 'infinito') {
                    gradient.addColorStop(0, color + '99');
                    gradient.addColorStop(1, color + '22');
                } else {
                    gradient.addColorStop(0, color + 'CC');
                    gradient.addColorStop(1, color + '55');
                }
                return gradient;
            });
            data.datasets[0].borderColor = colors;
            // --- FIN DE LA MEJORA VISUAL ---

            this.charts.topExpenses = new Chart(newCtx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: data.datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    // --- INICIO DE LA MEJORA VISUAL ---
                    // Ajustar el ancho de las barras
                    barPercentage: 0.5,
                    categoryPercentage: 0.7,
                    // --- FIN DE LA MEJORA VISUAL ---
                    plugins: { 
                        legend: { display: false }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            grid: { color: this.getThemeColor('--color-border-accent') + '80' }, 
                            ticks: { 
                                color: this.getThemeColor('--color-text-secondary'), 
                                callback: function(value) { return '$' + value / 1000 + 'K'; } 
                            } 
                        },
                        x: { 
                            grid: { display: false }, 
                            ticks: { 
                                color: this.getThemeColor('--color-text-secondary'),
                                autoSkip: false,
                                maxRotation: 45,
                                minRotation: 0
                            } 
                        }
                    },
                    interaction: { mode: 'index', intersect: false },
                }
            });
        }
    },
renderActivityFeed() {
        const container = document.getElementById('activity-feed-container');
        if (!container) return;

        // Unimos ventas, gastos y pagos en un solo array
        const activity = this.transacciones
            .filter(t => ['venta', 'gasto', 'pago_cliente', 'pago_proveedor'].includes(t.tipo))
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, 5); // Mostramos las últimas 5 actividades

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
                    iconClass = 'icon-venta';
                    icon = 'fa-shopping-cart';
                    title = `Venta a ${contacto?.nombre || 'N/A'}`;
                    amount = `<span class="conta-text-success font-mono">+${this.formatCurrency(t.total)}</span>`;
                    link = `ContaApp.abrirVistaPreviaFactura(${t.id})`;
                    break;
                case 'gasto':
                    iconClass = 'icon-gasto';
                    icon = 'fa-receipt';
                    title = t.descripcion;
                    amount = `<span class="conta-text-danger font-mono">-${this.formatCurrency(t.total)}</span>`;
                    link = `ContaApp.abrirModalHistorialGasto(${t.id})`;
                    break;
                case 'pago_cliente':
                    const ventaAsociada = this.findById(this.transacciones, t.ventaId);
                    iconClass = 'icon-pago-cliente';
                    icon = 'fa-hand-holding-dollar';
                    title = `Cobro de ${contacto?.nombre || 'N/A'}`;
                    amount = `<span class="conta-text-success font-mono">+${this.formatCurrency(t.monto)}</span>`;
                    link = `ContaApp.abrirModalHistorialFactura(${t.ventaId})`;
                    break;
                case 'pago_proveedor':
                    iconClass = 'icon-pago-proveedor';
                    icon = 'fa-money-bill-wave';
                    title = `Pago a ${contacto?.nombre || 'N/A'}`;
                    amount = `<span class="conta-text-danger font-mono">-${this.formatCurrency(t.monto)}</span>`;
                    link = `ContaApp.abrirModalHistorialGasto(${t.gastoId})`;
                    break;
                default:
                    return; // No mostrar otros tipos de transacciones
            }

            html += `
                <li class="activity-item" onclick="${link}" title="Haz clic para ver detalles">
                    <div class="activity-icon ${iconClass}">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div class="flex-grow">
                        <p class="font-semibold text-sm truncate">${title}</p>
                        <p class="text-xs text-[var(--color-text-secondary)]">${t.fecha}</p>
                    </div>
                    <div class="font-bold text-sm">${amount}</div>
                </li>
            `;
        });
        html += '</ul>';
        container.innerHTML = html;
    },
getTopClientesData() {
        const agingData = this.getAgingData('cliente', this.getTodayDate());
        return agingData.contactos
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
            .map(c => ({ nombre: c.contacto.nombre, saldo: c.total }));
    },
getTopProductosData() {
        const ventasActivas = this.transacciones.filter(t => t.tipo === 'venta' && t.estado !== 'Anulada');
        const ventasPorItem = ventasActivas.flatMap(v => v.items).reduce((acc, item) => {
            if (item.itemType === 'producto') {
                const producto = this.findById(this.productos, item.productoId);
                if (producto) {
                    const totalVentaItem = item.cantidad * item.precio;
                    acc[producto.nombre] = (acc[producto.nombre] || 0) + totalVentaItem;
                }
            }
            return acc;
        }, {});

        return Object.entries(ventasPorItem)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([nombre, totalVendido]) => ({ nombre, totalVendido }));
    },
renderTopClientsWidget() {
        const container = document.getElementById('top-clients-container');
        if (!container) return;
        const topClientes = this.getTopClientesData();
        if (topClientes.length === 0) {
            container.innerHTML = `<div class="flex items-center justify-center h-full text-center text-[var(--color-text-secondary)]"><p>No hay clientes con saldos pendientes.</p></div>`;
            return;
        }
        const listHTML = topClientes.map(c => `
            <div class="flex justify-between items-center py-2 border-b border-[var(--color-border-primary)] text-sm">
                <span class="font-semibold">${c.nombre}</span>
                <span class="font-mono conta-text-danger">${this.formatCurrency(c.saldo)}</span>
            </div>
        `).join('');
        container.innerHTML = `<div class="space-y-1">${listHTML}</div>`;
    },
renderTopProductsWidget() {
        const container = document.getElementById('top-products-container');
        if (!container) return;
        const topProductos = this.getTopProductosData();
        if (topProductos.length === 0) {
            container.innerHTML = `<div class="flex items-center justify-center h-full text-center text-[var(--color-text-secondary)]"><p>No se han registrado ventas de productos.</p></div>`;
            return;
        }
        const listHTML = topProductos.map(p => `
            <div class="flex justify-between items-center py-2 border-b border-[var(--color-border-primary)] text-sm">
                <span class="font-semibold">${p.nombre}</span>
                <span class="font-mono conta-text-success">${this.formatCurrency(p.totalVendido)}</span>
            </div>
        `).join('');
        container.innerHTML = `<div class="space-y-1">${listHTML}</div>`;
    },
});
