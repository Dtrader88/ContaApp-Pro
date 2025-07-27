// Archivo: modules/cuentas_corrientes.js

Object.assign(ContaApp, {
getEstadoDeCuenta(contactoId, tipoContacto) {
        const esCliente = tipoContacto === 'cliente';
        const transaccionesContacto = this.transacciones.filter(t => t.contactoId === contactoId);
        
        let saldo = 0;
        const estadoDeCuenta = transaccionesContacto
            .map(t => {
                let debito = 0, credito = 0, detalle = '';
                if (esCliente) {
                    if (t.tipo === 'venta') {
                        debito = t.total;
                        detalle = `Factura #${t.numeroFactura || t.id}`;
                    } else if (t.tipo === 'pago_cliente' || t.tipo === 'anticipo') {
                        credito = t.monto || t.total;
                        detalle = t.comentario || `Pago/Anticipo #${t.id}`;
                    } else if (t.tipo === 'nota_credito') {
                        credito = t.total;
                        detalle = `Nota de Crédito #${t.numeroNota || t.id}`;
                    } else {
                        return null; // Ignorar otros tipos de transacciones
                    }
                } else { // esProveedor
                    if (t.tipo === 'gasto') {
                        credito = t.total;
                        detalle = t.descripcion;
                    } else if (t.tipo === 'pago_proveedor') {
                        debito = t.monto;
                        detalle = t.comentario || `Pago Gasto #${t.gastoId}`;
                    } else {
                        return null;
                    }
                }
                return { fecha: t.fecha, detalle, debito, credito, transaccionOriginal: t };
            })
            .filter(Boolean) // Eliminar nulos
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)); // Ordenar por fecha ascendente

        // Calcular el saldo corriente
        estadoDeCuenta.forEach(mov => {
            saldo += (mov.debito - mov.credito);
            mov.saldo = saldo;
        });

        return estadoDeCuenta.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // Devolver en orden descendente para la vista
    },
    
    renderEstadoDeCuentaDetalle(contactoId, tipoContacto) {
        const contacto = this.findById(this.contactos, contactoId);
        const esCliente = tipoContacto === 'cliente';
        
        document.getElementById('page-title-header').innerText = `Estado de Cuenta: ${contacto.nombre}`;
        
        const accionesHTML = esCliente 
            ? `<button class="conta-btn conta-btn-success" onclick="ContaApp.procesarSeleccionDePago('cliente')"><i class="fa-solid fa-hand-holding-dollar me-2"></i>Registrar Cobro</button>`
            : `<button class="conta-btn conta-btn-success" onclick="ContaApp.procesarSeleccionDePago('proveedor')"><i class="fa-solid fa-money-bill-wave me-2"></i>Registrar Pago</button>`;
        
        document.getElementById('page-actions-header').innerHTML = `
            <div class="flex gap-2">
                <button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarReporteEstilizadoPDF('Estado de Cuenta - ${contacto.nombre}', 'estado-de-cuenta-area')"><i class="fa-solid fa-print me-2"></i>Generar PDF</button>
                ${accionesHTML}
            </div>`;

        const estadoDeCuenta = this.getEstadoDeCuenta(contactoId, tipoContacto);
        
        // Calcular KPIs
        const deudaTotal = estadoDeCuenta.filter(m => m.debito > 0).reduce((sum, m) => sum + m.debito, 0);
        const creditoTotal = estadoDeCuenta.filter(m => m.credito > 0).reduce((sum, m) => sum + m.credito, 0);
        const saldoFinal = estadoDeCuenta.length > 0 ? estadoDeCuenta[0].saldo : 0;

        let kpiHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="conta-card text-center"><div class="text-xs text-[var(--color-text-secondary)]">TOTAL ${esCliente ? 'FACTURADO' : 'COMPRADO'}</div><p class="font-bold text-xl mt-1">${this.formatCurrency(deudaTotal)}</p></div>
                <div class="conta-card text-center"><div class="text-xs text-[var(--color-text-secondary)]">TOTAL ${esCliente ? 'COBRADO' : 'PAGADO'}</div><p class="font-bold text-xl mt-1">${this.formatCurrency(creditoTotal)}</p></div>
                <div class="conta-card text-center"><div class="text-xs text-[var(--color-text-secondary)]">SALDO ACTUAL</div><p class="font-bold text-xl ${saldoFinal >= 0 ? 'conta-text-danger' : 'conta-text-success'} mt-1">${this.formatCurrency(saldoFinal)}</p></div>
            </div>
        `;
        
        let tablaHTML = `<div class="conta-card overflow-auto" id="estado-de-cuenta-area">
            <h3 class="conta-subtitle !border-0 text-center !mb-4">Movimientos de Cuenta</h3>
            <table class="min-w-full text-sm conta-table-zebra">
                <thead><tr>
                    <th class="conta-table-th">Fecha</th>
                    <th class="conta-table-th">Detalle</th>
                    <th class="conta-table-th text-right">Débito</th>
                    <th class="conta-table-th text-right">Crédito</th>
                    <th class="conta-table-th text-right">Saldo Corriente</th>
                </tr></thead>
                <tbody>`;
        
        if (estadoDeCuenta.length === 0) {
            tablaHTML += `<tr><td colspan="5" class="text-center p-8 text-[var(--color-text-secondary)]">Este contacto aún no tiene transacciones registradas.</td></tr>`;
        } else {
            estadoDeCuenta.forEach(mov => {
                tablaHTML += `<tr>
                    <td class="conta-table-td">${mov.fecha}</td>
                    <td class="conta-table-td">${mov.detalle}</td>
                    <td class="conta-table-td text-right font-mono">${mov.debito > 0 ? this.formatCurrency(mov.debito) : ''}</td>
                    <td class="conta-table-td text-right font-mono conta-text-success">${mov.credito > 0 ? this.formatCurrency(mov.credito) : ''}</td>
                    <td class="conta-table-td text-right font-mono font-bold">${this.formatCurrency(mov.saldo)}</td>
                </tr>`;
            });
        }
        
        tablaHTML += `</tbody></table></div>`;
        
        const containerId = esCliente ? 'cxc' : 'cxp';
        document.getElementById(containerId).innerHTML = kpiHTML + tablaHTML;
    },
  /**
     * Función genérica para calcular datos de antigüedad de saldos.
     * @param {string} tipoContacto - Puede ser 'cliente' (para CXC) o 'proveedor' (para CXP).
     * @param {string} fechaReporte - Fecha 'hasta' la cual se calcula la antigüedad.
     * @returns {object} - Un objeto con los datos de los contactos y los totales.
     */  
getAgingData(tipoContacto, fechaReporte) {
    const tipoTransaccion = tipoContacto === 'cliente' ? 'venta' : 'gasto';
    const facturasPendientes = this.transacciones.filter(t => 
        t.tipo === tipoTransaccion && 
        (t.estado === 'Pendiente' || t.estado === 'Parcial') &&
        t.fecha <= fechaReporte
    );

    const dataAgrupada = {};
    const hoy = new Date(fechaReporte + 'T23:59:59');

    facturasPendientes.forEach(factura => {
        // --- INICIO DE LA CORRECCIÓN ---
        // Si la factura no tiene un ID de contacto, o si el contacto no existe, la ignoramos.
        if (!factura.contactoId) return;
        const contacto = this.findById(this.contactos, factura.contactoId);
        if (!contacto) return;
        // --- FIN DE LA CORRECCIÓN ---

        const saldo = (factura.total || 0) - (factura.montoPagado || 0);
        if (saldo < 0.01) return;

        const fechaFactura = new Date(factura.fecha + 'T00:00:00');
        const diffTime = hoy.getTime() - fechaFactura.getTime();
        const diasVencido = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        if (!dataAgrupada[factura.contactoId]) {
            dataAgrupada[factura.contactoId] = {
                contacto: contacto, // Usamos la variable que ya validamos
                id: factura.contactoId,
                current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_plus: 0, total: 0
            };
        }

        const buckets = dataAgrupada[factura.contactoId];
        if (diasVencido <= 0) buckets.current += saldo;
        else if (diasVencido >= 1 && diasVencido <= 30) buckets.d1_30 += saldo;
        else if (diasVencido >= 31 && diasVencido <= 60) buckets.d31_60 += saldo;
        else if (diasVencido >= 61 && diasVencido <= 90) buckets.d61_90 += saldo;
        else buckets.d91_plus += saldo;
        
        buckets.total += saldo;
    });

    const contactosArray = Object.values(dataAgrupada).sort((a,b) => a.contacto.nombre.localeCompare(b.contacto.nombre));

    const totales = contactosArray.reduce((acc, curr) => {
        acc.current += curr.current;
        acc.d1_30 += curr.d1_30;
        acc.d31_60 += curr.d31_60;
        acc.d61_90 += curr.d61_90;
        acc.d91_plus += curr.d91_plus;
        acc.total += curr.total;
        return acc;
    }, { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_plus: 0, total: 0 });

    return { contactos: contactosArray, totales };
},

    /**
     * Renderiza el reporte de Antigüedad de Saldos por Cobrar (Aging Report).
     */
        renderCXCAging() {
        document.getElementById('page-actions-header').innerHTML = `<button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarReporteEstilizadoPDF('Antigüedad de Cuentas por Cobrar', 'cxc-aging-report-area')"><i class="fa-solid fa-print me-2"></i>Generar Reporte</button>`;
        
        const agingData = this.getAgingData('cliente', this.getTodayDate());
        let html;

        if (agingData.contactos.length === 0) {
            html = this.generarEstadoVacioHTML('fa-file-invoice-dollar', '¡Todo al día!', 'No tienes cuentas por cobrar pendientes. ¡Excelente trabajo!', '+ Crear Nueva Venta', "ContaApp.irModulo('ventas', {action: 'new'})");
        } else {
            // ===== NUEVO: Diseño de Grid para Gráfico y Tabla =====
            html = `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Columna para el Gráfico -->
                <div class="lg:col-span-1 conta-card">
                    <h3 class="conta-subtitle !mb-4">Deuda por Cliente</h3>
                    <div class="h-80 relative">
                        <canvas id="cxc-pie-chart"></canvas>
                    </div>
                </div>

                <!-- Columna para la Tabla de Antigüedad -->
                <div class="lg:col-span-2 conta-card overflow-auto" id="cxc-aging-report-area">
    <div class="text-center p-4">
        <h3 class="text-lg font-semibold">Resumen de Antigüedad de Cuentas por Cobrar</h3>
        <p class="text-sm text-[var(--color-text-secondary)]">Al ${this.getTodayDate()}</p>
    </div>
    <table class="min-w-full text-sm conta-table-zebra">
        <thead><tr>
            <th class="conta-table-th">Cliente</th>
            <th class="conta-table-th text-right">No Vencido</th>
            <th class="conta-table-th text-right">1-30 Días</th>
                            <th class="conta-table-th text-right">31-60 Días</th>
                            <th class="conta-table-th text-right">61-90 Días</th>
                            <th class="conta-table-th text-right">> 90 Días</th>
                            <th class="conta-table-th text-right">Total</th>
                        </tr></thead>
                        <tbody>`;
            
            agingData.contactos.forEach(c => {
                html += `<tr>
                    <td class="conta-table-td font-bold cursor-pointer hover:text-[var(--color-primary)]" onclick="ContaApp.irModulo('cxc', {clienteId: ${c.id}})">${c.contacto.nombre}</td>
                    ${Object.entries(c).filter(([key]) => key !== 'contacto' && key !== 'id').map(([, val]) => `<td class="conta-table-td text-right font-mono">${this.formatCurrency(val)}</td>`).join('')}
                </tr>`;
            });

            html += `</tbody>
                    <tfoot class="bg-[var(--color-bg-accent)] font-bold">
                        <tr>
                            <td class="conta-table-td">TOTAL</td>
                            ${Object.values(agingData.totales).map(val => `<td class="conta-table-td text-right font-mono">${this.formatCurrency(val)}</td>`).join('')}
                        </tr>
                    </tfoot>
                    </table>
                </div>
            </div>`;
        }
        
        const cxcContainer = document.getElementById('cxc-contenido') || document.getElementById('cxc');
        cxcContainer.innerHTML = html;

        // Llamamos a la función para renderizar el gráfico después de crear el canvas
        if (agingData.contactos.length > 0) {
            this.renderCXCPieChart(agingData);
        }
    },
                renderCXC(params = {}) {
        if (params.clienteId) {
            this.renderCXCDetalleCliente(params.clienteId, params);
            return;
        }

        const submodulo = params.submodulo || 'estado-cuenta';

        let html = `
            <div class="flex gap-2 mb-4 border-b border-[var(--color-border-accent)] flex-wrap">
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'estado-cuenta' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('cxc', {submodulo: 'estado-cuenta'})">Estado de Cuenta</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'aging' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('cxc', {submodulo: 'aging'})">Antigüedad de Saldos</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'anticipos' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('cxc', {submodulo: 'anticipos'})">Anticipos de Clientes</button>
            </div>
            <div id="cxc-contenido"></div>
        `;
        document.getElementById('cxc').innerHTML = html;

        if (submodulo === 'estado-cuenta') {
            this.renderCXC_TabEstadoCuenta(params);
        } else if (submodulo === 'aging') {
            this.renderCXC_TabAging();
        } else if (submodulo === 'anticipos') {
            this.renderAnticipos('cxc-contenido');
        }
    },
                renderCXC_TabEstadoCuenta(params = {}) {
        document.getElementById('page-title-header').innerText = `Cuentas por Cobrar`;
        document.getElementById('page-actions-header').innerHTML = `
            <div class="flex gap-2 flex-wrap">
                <button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarCxcCSV()"><i class="fa-solid fa-file-csv me-2"></i>Exportar CSV</button>
                <button class="conta-btn conta-btn-success" onclick="ContaApp.procesarSeleccionDePago('cliente')"><i class="fa-solid fa-hand-holding-dollar me-2"></i>Registrar Cobro</button>
                <button class="conta-btn" onclick="ContaApp.abrirModalVenta()">+ Nueva Venta</button>
            </div>`;
        
        let facturas = this.transacciones.filter(t => t.tipo === 'venta' && t.estado !== 'Anulada');
        
        if (params.search) {
            const term = params.search.toLowerCase();
            facturas = facturas.filter(v => {
                const cliente = this.findById(this.contactos, v.contactoId);
                return (cliente && cliente.nombre.toLowerCase().includes(term)) || 
                       (v.numeroFactura && v.numeroFactura.toLowerCase().includes(term));
            });
        }
        if (params.startDate) facturas = facturas.filter(v => v.fecha >= params.startDate);
        if (params.endDate) facturas = facturas.filter(v => v.fecha <= params.endDate);
        if (params.estado && params.estado !== 'Todas') {
             facturas = facturas.filter(v => (v.estado || 'Pendiente') === params.estado);
        }
        
        let html = `
            <div class="conta-card p-3 mb-4">
                <form onsubmit="event.preventDefault(); ContaApp.filtrarLista('cxc');" class="flex flex-wrap items-end gap-3">
                    <div>
                        <label class="text-xs font-semibold">Buscar por Cliente o # Factura</label>
                        <input type="search" id="cxc-search" class="conta-input md:w-72" value="${params.search || ''}">
                    </div>
                    <div><label class="text-xs font-semibold">Desde</label><input type="date" id="cxc-start-date" class="conta-input" value="${params.startDate || ''}"></div>
                    <div><label class="text-xs font-semibold">Hasta</label><input type="date" id="cxc-end-date" class="conta-input" value="${params.endDate || ''}"></div>
                    <div>
                         <label class="text-xs font-semibold">Estado</label>
                         <select id="cxc-estado" class="conta-input md:w-48">
                            <option value="Todas">Todas (Excepto Anuladas)</option>
                            <option value="Pendiente">Pendiente (Sin pagos)</option>
                            <option value="Parcial">Pago Parcial</option>
                            <option value="Pagada">Pagada</option>
                         </select>
                    </div>
                    <button type="submit" class="conta-btn">Filtrar</button>
                </form>
            </div>
        `;

        if (facturas.length === 0) {
            html += `<div class="conta-card text-center p-8 text-[var(--color-text-secondary)]">
                        <i class="fa-solid fa-filter-circle-xmark fa-3x mb-4 opacity-50"></i>
                        <h3 class="font-bold text-lg">Sin Resultados</h3>
                        <p>No se encontraron facturas que coincidan con los filtros aplicados.</p>
                    </div>`;
        } else {
            facturas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            let tableRowsHTML = '';
            facturas.forEach(v => {
                const cliente = this.findById(this.contactos, v.contactoId);
                const saldo = v.total - (v.montoPagado || 0);
                const estadoVencimiento = this.getVencimientoStatus(v.fechaVencimiento, v.estado);
                const isPayable = v.estado === 'Pendiente' || v.estado === 'Parcial';
                
                const creditoDisponible = this.getCreditosDisponiblesPorCliente(v.contactoId);
                const creditoIconHTML = creditoDisponible > 0 
                    ? `<i class="fa-solid fa-gem credit-icon ml-2" title="Crédito disponible: ${this.formatCurrency(creditoDisponible)}"></i>` 
                    : '';

                tableRowsHTML += `<tr>
                    <td class="conta-table-td text-center">${isPayable ? `<input type="checkbox" class="cxc-factura-check" data-factura-id="${v.id}" data-cliente-id="${v.contactoId}">` : ''}</td>
                    <td class="conta-table-td">${v.fecha}</td>
                    <td class="conta-table-td font-mono">${v.numeroFactura || v.id}</td>
                    <td class="conta-table-td font-bold cursor-pointer hover:text-[var(--color-primary)] cliente-link" data-cliente-id="${v.contactoId}">${cliente?.nombre || 'N/A'} ${creditoIconHTML}</td>
                    <td class="conta-table-td text-right font-mono">${this.formatCurrency(v.total)}</td>
                    <td class="conta-table-td text-right font-mono font-bold">${this.formatCurrency(saldo)}</td>
                    <td class="conta-table-td"><span class="tag ${estadoVencimiento.class}">${estadoVencimiento.text}</span></td>
                    <td class="conta-table-td">
                         <button class="conta-btn conta-btn-small" title="Ver Historial de Pagos" onclick="ContaApp.abrirModalHistorialFactura(${v.id})"><i class="fa-solid fa-history"></i> Ver</button>
                    </td>
                </tr>`;
            });
            html += `<div class="conta-card overflow-auto">
                <table class="min-w-full text-sm conta-table-zebra" id="cxc-table">
                    <thead><tr>
                        <th class="conta-table-th w-10"><input type="checkbox" onchange="ContaApp.toggleAllCheckboxes(this, 'cxc-factura-check')"></th>
                        <th class="conta-table-th">Fecha</th><th class="conta-table-th">Factura #</th>
                        <th class="conta-table-th">Cliente</th><th class="conta-table-th text-right">Total</th>
                        <th class="conta-table-th text-right">Saldo Pendiente</th><th class="conta-table-th">Estado Vencimiento</th>
                        <th class="conta-table-th">Acciones</th>
                    </tr></thead>
                    <tbody>${tableRowsHTML}</tbody>
                </table>
            </div>`;
        }
        
        document.getElementById('cxc-contenido').innerHTML = html;
        
        if(params.estado) document.getElementById('cxc-estado').value = params.estado;

        document.getElementById('cxc-table')?.addEventListener('click', (event) => {
            const target = event.target.closest('.cliente-link');
            if (target && target.dataset.clienteId) {
                const clienteId = parseInt(target.dataset.clienteId);
                this.irModulo('cxc', { clienteId: clienteId });
            }
        });
    },
                renderCXC_TabAging(params = {}) {
        const filtroAntiguedad = params.filtroAntiguedad || 'Todos';

        document.getElementById('page-actions-header').innerHTML = `<button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarReporteEstilizadoPDF('Antigüedad de Cuentas por Cobrar', 'cxc-aging-report-area')"><i class="fa-solid fa-print me-2"></i>Generar Reporte</button>`;
        
        const agingData = this.getAgingData('cliente', this.getTodayDate());
        let html;

        if (agingData.contactos.length === 0) {
            html = this.generarEstadoVacioHTML('fa-file-invoice-dollar', '¡Todo al día!', 'No tienes cuentas por cobrar pendientes. ¡Excelente trabajo!', '+ Crear Nueva Venta', "ContaApp.irModulo('ventas', {action: 'new'})");
        } else {
            const { totales } = agingData;
            const totalDeuda = totales.total;

            const kpiCards = [
                { key: 'current', label: 'No Vencido', value: totales.current, color: 'green' },
                { key: 'd1_30', label: '1-30 Días', value: totales.d1_30, color: 'amber' },
                { key: 'd31_60', label: '31-60 Días', value: totales.d31_60, color: 'amber' },
                { key: 'd61_90', label: '61-90 Días', value: totales.d61_90, color: 'red' },
                { key: 'd91_plus', label: '> 90 Días', value: totales.d91_plus, color: 'red' }
            ];

            let kpiHTML = '<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">';
            kpiCards.forEach(card => {
                const percentage = totalDeuda > 0 ? (card.value / totalDeuda) * 100 : 0;
                const isActive = filtroAntiguedad === card.key;
                kpiHTML += `
                    <div class="conta-card kpi-aging-card ${isActive ? 'active-filter-card' : ''}" onclick="ContaApp.irModulo('cxc', {submodulo: 'aging', filtroAntiguedad: '${card.key}'})">
                        <div class="label">${card.label}</div>
                        <div class="value ${card.color === 'green' ? 'conta-text-success' : (card.color === 'amber' ? 'conta-text-accent' : 'conta-text-danger')}">${this.formatCurrency(card.value)}</div>
                        <div class="progress-bar-container">
                            <div class="progress-bar ${card.color}" style="width: ${percentage}%;"></div>
                        </div>
                    </div>
                `;
            });
            kpiHTML += '</div>';

            const columnasVisibles = {
                current: filtroAntiguedad === 'current',
                d1_30: filtroAntiguedad === 'd1_30',
                d31_60: filtroAntiguedad === 'd31_60',
                d61_90: filtroAntiguedad === 'd61_90',
                d91_plus: filtroAntiguedad === 'd91_plus'
            };
            const mostrarTodas = filtroAntiguedad === 'Todos';

            let contactosFiltrados = agingData.contactos;
            if(!mostrarTodas) {
                contactosFiltrados = agingData.contactos.filter(c => c[filtroAntiguedad] > 0);
            }

            let tablaHTML = `
                <div class="conta-card overflow-auto" id="cxc-aging-report-area">
                    <div class="flex justify-between items-center mb-2">
                         <h3 class="conta-subtitle !border-0 !mb-0">Detalle por Cliente (${filtroAntiguedad})</h3>
                         ${!mostrarTodas ? `<button class="conta-btn conta-btn-small" onclick="ContaApp.irModulo('cxc', {submodulo: 'aging'})">Mostrar Todos</button>` : ''}
                    </div>
                    <table class="min-w-full text-sm conta-table-zebra">
                        <thead><tr>
                            <th class="conta-table-th">Cliente</th>
                            ${mostrarTodas || columnasVisibles.current ? `<th class="conta-table-th text-right">No Vencido</th>` : ''}
                            ${mostrarTodas || columnasVisibles.d1_30 ? `<th class="conta-table-th text-right">1-30 Días</th>` : ''}
                            ${mostrarTodas || columnasVisibles.d31_60 ? `<th class="conta-table-th text-right">31-60 Días</th>` : ''}
                            ${mostrarTodas || columnasVisibles.d61_90 ? `<th class="conta-table-th text-right">61-90 Días</th>` : ''}
                            ${mostrarTodas || columnasVisibles.d91_plus ? `<th class="conta-table-th text-right">> 90 Días</th>` : ''}
                            <th class="conta-table-th text-right">Total Adeudado</th>
                        </tr></thead>
                        <tbody>`;
            
            contactosFiltrados.forEach(c => {
                tablaHTML += `<tr>
                    <td class="conta-table-td font-bold cursor-pointer hover:text-[var(--color-primary)]" onclick="ContaApp.irModulo('cxc', {clienteId: ${c.id}})">${c.contacto.nombre}</td>
                    ${mostrarTodas || columnasVisibles.current ? `<td class="conta-table-td text-right font-mono">${this.formatCurrency(c.current)}</td>` : ''}
                    ${mostrarTodas || columnasVisibles.d1_30 ? `<td class="conta-table-td text-right font-mono">${this.formatCurrency(c.d1_30)}</td>` : ''}
                    ${mostrarTodas || columnasVisibles.d31_60 ? `<td class="conta-table-td text-right font-mono">${this.formatCurrency(c.d31_60)}</td>` : ''}
                    ${mostrarTodas || columnasVisibles.d61_90 ? `<td class="conta-table-td text-right font-mono">${this.formatCurrency(c.d61_90)}</td>` : ''}
                    ${mostrarTodas || columnasVisibles.d91_plus ? `<td class="conta-table-td text-right font-mono">${this.formatCurrency(c.d91_plus)}</td>` : ''}
                    <td class="conta-table-td text-right font-mono font-bold">${this.formatCurrency(c.total)}</td>
                </tr>`;
            });

            tablaHTML += `</tbody>
                    <tfoot class="bg-[var(--color-bg-accent)] font-bold">
                        <tr>
                            <td class="conta-table-td">TOTALES</td>
                            ${mostrarTodas || columnasVisibles.current ? `<td class="conta-table-td text-right font-mono">${this.formatCurrency(totales.current)}</td>` : ''}
                            ${mostrarTodas || columnasVisibles.d1_30 ? `<td class="conta-table-td text-right font-mono">${this.formatCurrency(totales.d1_30)}</td>` : ''}
                            ${mostrarTodas || columnasVisibles.d31_60 ? `<td class="conta-table-td text-right font-mono">${this.formatCurrency(totales.d31_60)}</td>` : ''}
                            ${mostrarTodas || columnasVisibles.d61_90 ? `<td class="conta-table-td text-right font-mono">${this.formatCurrency(totales.d61_90)}</td>` : ''}
                            ${mostrarTodas || columnasVisibles.d91_plus ? `<td class="conta-table-td text-right font-mono">${this.formatCurrency(totales.d91_plus)}</td>` : ''}
                            <td class="conta-table-td text-right font-mono">${this.formatCurrency(totales.total)}</td>
                        </tr>
                    </tfoot>
                    </table>
                </div>`;
            
            html = kpiHTML + tablaHTML;
        }
        
        document.getElementById('cxc-contenido').innerHTML = html;
    },
        renderCXCDetalleCliente(clienteId, filters = {}) {
        this.renderEstadoDeCuentaDetalle(clienteId, 'cliente');
    },
    abrirModalRegistrarPagoCliente(ventaId) {
        const venta = this.findById(this.transacciones, ventaId);
        const cliente = this.findById(this.contactos, venta.contactoId);
        const cuentasBanco = this.planDeCuentas.filter(c => c.tipo === 'DETALLE' && c.parentId === 110).map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        const saldoPendiente = (venta.total || 0) - (venta.montoPagado || 0);

        // INICIO DE MEJORA: Buscar créditos disponibles (Notas de Crédito y Anticipos)
        const creditosDisponibles = this.transacciones.filter(t => 
            t.contactoId === venta.contactoId &&
            (t.tipo === 'nota_credito' || t.tipo === 'anticipo') &&
            (t.total - (t.montoAplicado || 0)) > 0.01
        );

        let creditosHTML = '';
        if (creditosDisponibles.length > 0) {
            creditosHTML = `<div class="conta-card-accent mt-6">
                <h4 class="font-bold text-sm mb-2">Aplicar Créditos Disponibles</h4>
                <div class="space-y-2 max-h-40 overflow-y-auto pr-2">`;
            creditosDisponibles.forEach(credito => {
                const saldoCredito = credito.total - (credito.montoAplicado || 0);
                const tipoTexto = credito.tipo === 'nota_credito' ? `NC #${credito.numeroNota}` : `Anticipo #${credito.id}`;
                creditosHTML += `
                    <div class="flex justify-between items-center text-sm">
                        <label for="credito-${credito.id}" class="flex items-center">
                            <input type="checkbox" id="credito-${credito.id}" class="h-4 w-4 mr-2 credito-a-aplicar" value="${saldoCredito}" data-credito-id="${credito.id}" onchange="ContaApp.actualizarTotalesPagoCliente(${saldoPendiente})">
                            ${tipoTexto} (${credito.fecha})
                        </label>
                        <span class="font-mono">${this.formatCurrency(saldoCredito)}</span>
                    </div>
                `;
            });
            creditosHTML += `</div></div>`;
        }
        // FIN DE MEJORA

        const modalHTML = `<h3 class="conta-title mb-4">Registrar Pago de Cliente</h3>
        <p class="mb-2"><strong>Cliente:</strong> ${cliente.nombre}</p>
        <p class="mb-2"><strong>Factura #${venta.refOriginal || venta.numeroFactura || venta.id}</strong></p>
        <p class="mb-6"><strong>Saldo Pendiente:</strong> <span class="font-bold">${this.formatCurrency(saldoPendiente)}</span></p>
        
        <form onsubmit="ContaApp.guardarPagoCliente(event, ${ventaId})" class="space-y-4 modal-form">
            <div>
                <label>Monto a Pagar (con Banco/Efectivo)</label>
                <input type="number" step="0.01" id="pago-monto" class="w-full p-2 mt-1" value="${saldoPendiente.toFixed(2)}" max="${saldoPendiente.toFixed(2)}" oninput="ContaApp.actualizarTotalesPagoCliente(${saldoPendiente})" required>
            </div>
            <div><label>Depositar en</label><select id="pago-cuenta-banco" class="w-full p-2 mt-1" required>${cuentasBanco}</select></div>
            <div><label>Fecha del Pago</label><input type="date" id="pago-fecha" value="${this.getTodayDate()}" class="w-full p-2 mt-1" required></div>
            <div><label>Comentario / Referencia</label><input type="text" id="pago-comentario" class="w-full p-2 mt-1" placeholder="Ej: Cheque #123, Transferencia Zelle, etc."></div>
            
            ${creditosHTML}

            <div class="mt-6 pt-4 border-t border-[var(--color-border-accent)] text-right space-y-2">
                <div class="flex justify-end items-center gap-4"><span class="text-sm">Monto Pagado:</span> <span class="font-mono">${this.formatCurrency(0)}</span></div>
                <div class="flex justify-end items-center gap-4"><span class="text-sm">Créditos Aplicados:</span> <span id="pago-total-creditos" class="font-mono">${this.formatCurrency(0)}</span></div>
                <div class="flex justify-end items-center gap-4 font-bold text-lg"><span class="">Total a Acreditar:</span> <span id="pago-total-acreditado" class="font-mono">${this.formatCurrency(0)}</span></div>
                <div id="pago-feedback" class="text-sm font-bold h-5"></div>
            </div>

            <div class="flex justify-end gap-2 mt-6"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button id="btn-guardar-pago" type="submit" class="conta-btn">Confirmar Pago</button></div>
        </form>`;
        this.showModal(modalHTML, '2xl');
        this.actualizarTotalesPagoCliente(saldoPendiente);
    },
    actualizarTotalesPagoCliente(saldoPendiente) {
        const montoPagado = parseFloat(document.getElementById('pago-monto').value) || 0;
        let creditosAplicados = 0;
        document.querySelectorAll('.credito-a-aplicar:checked').forEach(checkbox => {
            creditosAplicados += parseFloat(checkbox.value);
        });

        const totalAcreditado = montoPagado + creditosAplicados;
        
        document.getElementById('pago-total-creditos').textContent = this.formatCurrency(creditosAplicados);
        document.getElementById('pago-total-acreditado').textContent = this.formatCurrency(totalAcreditado);

        const feedbackEl = document.getElementById('pago-feedback');
        const guardarBtn = document.getElementById('btn-guardar-pago');
        const diferencia = totalAcreditado - saldoPendiente;

        if (Math.abs(diferencia) < 0.01) {
            feedbackEl.textContent = '¡Saldo cubierto!';
            feedbackEl.className = 'text-sm font-bold h-5 conta-text-success';
            guardarBtn.disabled = false;
        } else if (diferencia > 0) {
            feedbackEl.textContent = `Sobrepago de ${this.formatCurrency(diferencia)}. Ajusta los montos.`;
            feedbackEl.className = 'text-sm font-bold h-5 conta-text-danger';
            guardarBtn.disabled = true;
        } else {
            feedbackEl.textContent = `Faltan ${this.formatCurrency(saldoPendiente - totalAcreditado)} por cubrir.`;
            feedbackEl.className = 'text-sm font-bold h-5 text-[var(--color-text-secondary)]';
            guardarBtn.disabled = false; // Se permite pagar menos
        }
    },
                    guardarPagoCliente(e, ventaId) {
        e.preventDefault();
        const venta = this.findById(this.transacciones, ventaId);
        const montoPagadoBanco = parseFloat(document.getElementById('pago-monto').value) || 0;
        const cuentaBancoId = parseInt(document.getElementById('pago-cuenta-banco').value);
        const fecha = document.getElementById('pago-fecha').value;
        const comentario = document.getElementById('pago-comentario').value;
        const cuentaCxcId = 120;

        const creditosSeleccionados = [];
        document.querySelectorAll('.credito-a-aplicar:checked').forEach(checkbox => {
            creditosSeleccionados.push({
                id: parseInt(checkbox.dataset.creditoId),
                monto: parseFloat(checkbox.value)
            });
        });

        const totalCreditosAplicados = creditosSeleccionados.reduce((sum, c) => sum + c.monto, 0);
        const totalAcreditado = montoPagadoBanco + totalCreditosAplicados;

        // Registro de la transacción de pago (si hubo pago monetario)
        if (montoPagadoBanco > 0) {
            const pagoRegistrado = {
                id: this.idCounter++, tipo: 'pago_cliente', fecha: fecha, contactoId: venta.contactoId,
                monto: montoPagadoBanco, cuentaBancoId: cuentaBancoId, ventaId: ventaId, comentario: comentario
            };
            this.transacciones.push(pagoRegistrado);
            this.crearAsiento(fecha, `Pago Factura #${venta.numeroFactura || venta.id}`, [
                { cuentaId: cuentaBancoId, debe: montoPagadoBanco, haber: 0 },
                { cuentaId: cuentaCxcId, debe: 0, haber: montoPagadoBanco }
            ], pagoRegistrado.id);
        }

        // Aplicación de créditos
        creditosSeleccionados.forEach(creditoInfo => {
            const credito = this.findById(this.transacciones, creditoInfo.id);
            if (credito) {
                credito.montoAplicado = (credito.montoAplicado || 0) + creditoInfo.monto;
                const cuentaContrapartidaId = credito.tipo === 'nota_credito' ? 420 : 220; // 420: Devoluciones, 220: Anticipos
                // El asiento de aplicación salda la cuenta de pasivo/ingreso-contrario contra CXC
                this.crearAsiento(fecha, `Aplicación de ${credito.tipo} #${credito.id} a Factura #${venta.numeroFactura}`, [
                    { cuentaId: cuentaContrapartidaId, debe: creditoInfo.monto, haber: 0 },
                    { cuentaId: cuentaCxcId, debe: 0, haber: creditoInfo.monto }
                ]);
            }
        });

        // Actualizar la factura
        venta.montoPagado = (venta.montoPagado || 0) + totalAcreditado;
        if (venta.montoPagado >= venta.total - 0.01) {
            venta.estado = 'Pagada';
        } else if (venta.montoPagado > 0) {
            venta.estado = 'Parcial';
        } else {
            venta.estado = 'Pendiente';
        }

        this.saveAll();
        this.closeModal();
        this.irModulo('cxc', { clienteId: venta.contactoId });
        this.showToast('Pago registrado y aplicado con éxito.', 'success');
    },
    toggleAllCheckboxes(source, className) {
        const checkboxes = document.getElementsByClassName(className);
        for (let i = 0; i < checkboxes.length; i++) {
            checkboxes[i].checked = source.checked;
        }
    },

    abrirModalPagoLote(tipoContacto) {
        const checkboxClass = tipoContacto === 'cliente' ? 'cxc-factura-check' : 'cxp-gasto-check';
        const facturasSeleccionadasIds = Array.from(document.querySelectorAll(`.${checkboxClass}:checked`)).map(cb => parseInt(cb.dataset.facturaId));

        if (facturasSeleccionadasIds.length === 0) {
            this.showToast('Debes seleccionar al menos una factura.', 'error');
            return;
        }

        const facturas = facturasSeleccionadasIds.map(id => this.findById(this.transacciones, id));
        const primerContactoId = facturas[0].contactoId;

        if (facturas.some(f => f.contactoId !== primerContactoId)) {
            this.showToast(`Todas las facturas seleccionadas deben pertenecer al mismo ${tipoContacto}.`, 'error');
            return;
        }

        const contacto = this.findById(this.contactos, primerContactoId);
        const totalAPagar = facturas.reduce((sum, f) => sum + (f.total - (f.montoPagado || 0)), 0);
        
        const cuentasPagoOptions = this.planDeCuentas
            .filter(c => c.tipo === 'DETALLE' && (c.codigo.startsWith('110') || c.codigo.startsWith('230'))) // Bancos y Tarjetas
            .map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');

        let facturasHTML = '';
        facturas.forEach(f => {
            const saldo = f.total - (f.montoPagado || 0);
            facturasHTML += `
                <div class="pago-lote-asignacion-row" data-factura-id="${f.id}" data-saldo-original="${saldo}">
                    <span>#${f.numeroFactura || f.id} (${f.fecha})</span>
                    <span class="font-mono">${this.formatCurrency(saldo)}</span>
                    <span class="font-mono font-bold text-right pago-lote-monto-aplicado"></span>
                </div>
            `;
        });

        const modalHTML = `
            <h3 class="conta-title mb-4">Registro de Pago en Lote</h3>
            <p class="mb-4"><strong>${tipoContacto === 'cliente' ? 'Cliente' : 'Proveedor'}:</strong> ${contacto.nombre}</p>
            <form onsubmit="ContaApp.guardarPagoLote(event, '${tipoContacto}')" class="modal-form">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label>Monto Total del Pago</label>
                        <input type="number" step="0.01" id="pago-lote-monto-total" class="w-full conta-input" value="${totalAPagar.toFixed(2)}" oninput="ContaApp.actualizarTotalesPagoLote()" required>
                    </div>
                    <div><label>${tipoContacto === 'cliente' ? 'Depositar en' : 'Pagar desde'}</label><select id="pago-lote-cuenta-banco" class="w-full conta-input" required>${cuentasPagoOptions}</select></div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div><label>Fecha del Pago</label><input type="date" id="pago-lote-fecha" value="${this.getTodayDate()}" class="w-full conta-input" required></div>
                    <div><label>Comentario / Referencia</label><input type="text" id="pago-lote-comentario" class="w-full conta-input" placeholder="Ej: Pago varias facturas"></div>
                </div>

                <div class="conta-card mt-6">
                    <h4 class="font-bold text-sm mb-2">Asignación del Pago</h4>
                    <div class="pago-lote-asignacion-row font-bold">
                        <span>Factura</span>
                        <span>Saldo</span>
                        <span class="text-right">Aplicado</span>
                    </div>
                    <div id="pago-lote-facturas-container">${facturasHTML}</div>
                    <div id="pago-lote-feedback" class="text-right mt-2 font-bold h-5"></div>
                </div>

                <div class="flex justify-end gap-2 mt-8">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button id="btn-guardar-pago-lote" type="submit" class="conta-btn">Confirmar Pago</button>
                </div>
            </form>
        `;
        this.showModal(modalHTML, '3xl');
        this.actualizarTotalesPagoLote();
    },

    actualizarTotalesPagoLote() {
        let montoTotalPago = parseFloat(document.getElementById('pago-lote-monto-total').value) || 0;
        const feedbackEl = document.getElementById('pago-lote-feedback');
        const guardarBtn = document.getElementById('btn-guardar-pago-lote');
        const rows = document.querySelectorAll('.pago-lote-asignacion-row[data-factura-id]');
        
        let montoTotalPorAsignar = montoTotalPago;

        rows.forEach(row => {
            const saldoOriginal = parseFloat(row.dataset.saldoOriginal);
            const montoAplicadoEl = row.querySelector('.pago-lote-monto-aplicado');
            
            let montoAAplicar = 0;
            if (montoTotalPorAsignar > 0) {
                montoAAplicar = Math.min(saldoOriginal, montoTotalPorAsignar);
                montoTotalPorAsignar -= montoAAplicar;
            }
            montoAplicadoEl.textContent = this.formatCurrency(montoAAplicar);
        });

        if (montoTotalPorAsignar > 0) {
            feedbackEl.textContent = `Sobrante: ${this.formatCurrency(montoTotalPorAsignar)}`;
            feedbackEl.className = 'text-right mt-2 font-bold h-5 conta-text-success';
        } else {
            feedbackEl.textContent = '';
        }

        guardarBtn.disabled = montoTotalPago <= 0;
    },

    guardarPagoLote(e, tipoContacto) {
        e.preventDefault();
        const montoTotalPago = parseFloat(document.getElementById('pago-lote-monto-total').value);
        const cuentaBancoId = parseInt(document.getElementById('pago-lote-cuenta-banco').value);
        const fecha = document.getElementById('pago-lote-fecha').value;
        const comentario = document.getElementById('pago-lote-comentario').value;

        const rows = document.querySelectorAll('.pago-lote-asignacion-row[data-factura-id]');
        const primeraFactura = this.findById(this.transacciones, parseInt(rows[0].dataset.facturaId));
        const contacto = this.findById(this.contactos, primeraFactura.contactoId);

        const esCobro = tipoContacto === 'cliente';
        const cuentaContrapartidaId = esCobro ? 120 : 210; // 120: CxC, 210: CxP
        const pagoTipo = esCobro ? 'pago_cliente' : 'pago_proveedor';
        const navModulo = esCobro ? 'cxc' : 'cxp';

        // 1. Crear un único asiento contable por el total del pago
        const pagoRegistrado = {
            id: this.idCounter++, tipo: pagoTipo, fecha: fecha, contactoId: contacto.id,
            monto: montoTotalPago, cuentaBancoId: cuentaBancoId, comentario: comentario, esLote: true
        };
        this.transacciones.push(pagoRegistrado);
        this.crearAsiento(fecha, `Pago en lote ${esCobro ? 'de' : 'a'} ${contacto.nombre}. ${comentario}`, [
            { cuentaId: cuentaBancoId, debe: esCobro ? montoTotalPago : 0, haber: esCobro ? 0 : montoTotalPago },
            { cuentaId: cuentaContrapartidaId, debe: esCobro ? 0 : montoTotalPago, haber: esCobro ? montoTotalPago : 0 }
        ], pagoRegistrado.id);

        // 2. Distribuir el pago entre las facturas
        let montoRestante = montoTotalPago;
        rows.forEach(row => {
            if (montoRestante <= 0) return;
            
            const facturaId = parseInt(row.dataset.facturaId);
            const factura = this.findById(this.transacciones, facturaId);
            const saldoFactura = factura.total - (factura.montoPagado || 0);
            
            const montoAAplicar = Math.min(saldoFactura, montoRestante);
            
            factura.montoPagado = (factura.montoPagado || 0) + montoAAplicar;
            if (factura.montoPagado >= factura.total - 0.01) {
                factura.estado = 'Pagado';
            } else {
                factura.estado = 'Parcial';
            }
            montoRestante -= montoAAplicar;
        });
        
        this.saveAll();
        this.closeModal();
        this.irModulo(navModulo);
        this.showToast('Pago en lote registrado y aplicado con éxito.', 'success');
    },
    procesarSeleccionDePago(tipoContacto) {
        const checkboxClass = tipoContacto === 'cliente' ? 'cxc-factura-check' : 'cxp-gasto-check';
        const facturasSeleccionadas = Array.from(document.querySelectorAll(`.${checkboxClass}:checked`));

        if (facturasSeleccionadas.length === 0) {
            this.showToast('Debes seleccionar al menos una factura para registrar el pago.', 'info');
            return;
        }

        if (facturasSeleccionadas.length === 1) {
            // Si solo hay una, abrir el modal de pago individual
            const facturaId = parseInt(facturasSeleccionadas[0].dataset.facturaId);
            if (tipoContacto === 'cliente') {
                this.abrirModalRegistrarPagoCliente(facturaId);
            } else {
                this.abrirModalRegistrarPagoProveedor(facturaId);
            }
        } else {
            // Si hay varias, abrir el modal de pago en lote
            this.abrirModalPagoLote(tipoContacto);
        }
    },
            abrirModalBajaIncobrable(ventaId) {
        const venta = this.findById(this.transacciones, ventaId);
        const cliente = this.findById(this.contactos, venta.contactoId);
        const saldoPendiente = (venta.total || 0) - (venta.montoPagado || 0);

        // ===== INICIO DE LA MEJORA: Crear lista de cuentas de gasto =====
        const cuentasGastoOptions = this.planDeCuentas
            .filter(c => c.tipo === 'DETALLE' && c.codigo.startsWith('5'))
            .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
            .map(c => `<option value="${c.id}" ${c.id === 51004 ? 'selected' : ''}>${c.codigo} - ${c.nombre}</option>`)
            .join('');
        // ===== FIN DE LA MEJORA =====

        const modalHTML = `
            <h3 class="conta-title mb-4">Dar de Baja Saldo Incobrable</h3>
            <p class="mb-2"><strong>Cliente:</strong> ${cliente.nombre}</p>
            <p class="mb-2"><strong>Factura #:</strong> ${venta.refOriginal || venta.numeroFactura || venta.id}</p>
            <p class="mb-6"><strong>Saldo a cancelar:</strong> <span class="font-bold conta-text-danger">${this.formatCurrency(saldoPendiente)}</span></p>
            
            <form onsubmit="ContaApp.guardarBajaIncobrable(event, ${ventaId})" class="space-y-4 modal-form">
                <!-- ===== INICIO DE LA MEJORA: Añadir el selector de cuenta ===== -->
                <div>
                    <label for="baja-cuenta-gasto">Imputar Gasto a la Cuenta:</label>
                    <select id="baja-cuenta-gasto" class="w-full p-2 mt-1" required>
                        ${cuentasGastoOptions}
                    </select>
                </div>
                <!-- ===== FIN DE LA MEJORA ===== -->
                <div>
                    <label>Fecha de la Cancelación</label>
                    <input type="date" id="baja-fecha" value="${this.getTodayDate()}" class="w-full p-2 mt-1" required>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button type="submit" class="conta-btn conta-btn-danger">Confirmar Baja de Saldo</button>
                </div>
            </form>
        `;
        this.showModal(modalHTML, 'xl');
    },

        guardarBajaIncobrable(e, ventaId) {
        e.preventDefault();
        const venta = this.findById(this.transacciones, ventaId);
        const fecha = document.getElementById('baja-fecha').value;
        const saldoPendiente = (venta.total || 0) - (venta.montoPagado || 0);

        if (saldoPendiente < 0.01) {
            this.showToast('No hay saldo pendiente que cancelar.', 'info');
            return;
        }

        const cuentaCxcId = 120; // Cuentas por Cobrar
        
        // ===== INICIO DE LA MEJORA: Leer la cuenta desde el select =====
        const cuentaGastoId = parseInt(document.getElementById('baja-cuenta-gasto').value);
        // const cuentaPerdidaId = 51004; // <-- LÍNEA ELIMINADA
        // ===== FIN DE LA MEJORA =====

        const asiento = this.crearAsiento(
            fecha, 
            `Baja de saldo incobrable Factura #${venta.refOriginal || venta.numeroFactura || venta.id}`, 
            [
                { cuentaId: cuentaGastoId, debe: saldoPendiente, haber: 0 }, // <-- USAMOS LA NUEVA VARIABLE
                { cuentaId: cuentaCxcId, debe: 0, haber: saldoPendiente }
            ]
        );

        if (asiento) {
            // Actualizamos la venta para que ya no aparezca como pendiente
            venta.montoPagado += saldoPendiente;
            if (venta.montoPagado >= venta.total - 0.01) {
                venta.estado = 'Pagada'; // Se considera "Pagada" aunque parte fue una pérdida
            }
            
            this.saveAll();
            this.closeModal();
            this.irModulo('cxc', { clienteId: venta.contactoId });
            this.showToast('Saldo incobrable dado de baja con éxito.', 'success');
        }
    },
                abrirModalHistorialFactura(ventaId) {
        const venta = this.findById(this.transacciones, ventaId);
        if (!venta) return;

        // 1. Recopilar todos los movimientos relacionados con la factura
        let movimientos = [];
        
        // El movimiento original de la factura
        movimientos.push({
            fecha: venta.fecha,
            detalle: `Emisión Factura #${venta.numeroFactura || venta.id}`,
            debito: venta.total,
            credito: 0
        });

        // Pagos directos asociados
        this.transacciones
            .filter(t => t.tipo === 'pago_cliente' && t.ventaId === ventaId)
            .forEach(pago => {
                const cuentaBanco = this.findById(this.planDeCuentas, pago.cuentaBancoId);
                movimientos.push({
                    fecha: pago.fecha,
                    detalle: pago.comentario || `Pago recibido en ${cuentaBanco?.nombre || 'N/A'}`,
                    debito: 0,
                    credito: pago.monto
                });
            });

        // Calcular si hubo aplicación de créditos (NC o Anticipos)
        const totalPagosDirectos = movimientos.filter(m => m.detalle.includes('Pago recibido')).reduce((sum, p) => sum + p.credito, 0);
        const montoCreditosAplicados = (venta.montoPagado || 0) - totalPagosDirectos;

        if (montoCreditosAplicados > 0.01) {
            movimientos.push({
                // Usamos la fecha de la factura como referencia para la aplicación
                fecha: venta.fecha,
                detalle: `Aplicación de Crédito (NC/Anticipo)`,
                debito: 0,
                credito: montoCreditosAplicados
            });
        }

        // 2. Ordenar todos los movimientos por fecha
        movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        // 3. Calcular el saldo corriente y construir las filas de la tabla
        let saldoCorriente = 0;
        let movimientosHTML = '';
        movimientos.forEach(mov => {
            saldoCorriente += mov.debito - mov.credito;
            movimientosHTML += `
                <tr class="border-t">
                    <td class="py-2 px-3">${mov.fecha}</td>
                    <td class="py-2 px-3">${mov.detalle}</td>
                    <td class="py-2 px-3 text-right font-mono">${mov.debito > 0 ? this.formatCurrency(mov.debito) : ''}</td>
                    <td class="py-2 px-3 text-right font-mono">${mov.credito > 0 ? this.formatCurrency(mov.credito) : ''}</td>
                    <td class="py-2 px-3 text-right font-mono font-bold">${this.formatCurrency(saldoCorriente)}</td>
                </tr>
            `;
        });

        const saldoFinal = (venta.total || 0) - (venta.montoPagado || 0);

        const modalHTML = `
            <div id="historial-factura-area">
                <h3 class="conta-title mb-2">Historial de la Factura #${venta.numeroFactura || venta.id}</h3>
                <p class="text-sm text-[var(--color-text-secondary)] mb-6">Cliente: ${this.findById(this.contactos, venta.contactoId)?.nombre}</p>
                
                <div class="grid grid-cols-3 gap-4 text-center mb-6">
                    <div class="conta-card !p-3"><div class="text-xs">Total Factura</div><div class="font-bold text-lg">${this.formatCurrency(venta.total)}</div></div>
                    <div class="conta-card !p-3"><div class="text-xs">Total Abonado</div><div class="font-bold text-lg conta-text-success">${this.formatCurrency(venta.montoPagado)}</div></div>
                    <div class="conta-card !p-3"><div class="text-xs">Saldo Pendiente</div><div class="font-bold text-lg conta-text-danger">${this.formatCurrency(saldoFinal)}</div></div>
                </div>

                <div class="conta-card !p-0">
                    <table class="w-full text-sm">
                        <thead><tr>
                            <th class="conta-table-th">Fecha</th>
                            <th class="conta-table-th">Descripción</th>
                            <th class="conta-table-th text-right">Débito</th>
                            <th class="conta-table-th text-right">Crédito</th>
                            <th class="conta-table-th text-right">Saldo</th>
                        </tr></thead>
                        <tbody>${movimientosHTML}</tbody>
                    </table>
                </div>
            </div>

            <div class="flex justify-between items-center mt-8">
                <button type="button" class="conta-btn" onclick="ContaApp.abrirModalVerAsientos(${venta.id})"><i class="fa-solid fa-book me-2"></i>Ver Asientos</button>
                <div class="flex gap-2">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.exportarReporteEstilizadoPDF('Historial Factura #${venta.numeroFactura || venta.id}', 'historial-factura-area')"><i class="fa-solid fa-print me-2"></i>PDF</button>
                    <button type="button" class="conta-btn" onclick="ContaApp.closeModal()">Cerrar</button>
                </div>
            </div>
        `;
        this.showModal(modalHTML, '3xl');
    },
renderAnticipos(containerId) {
        document.getElementById('page-actions-header').innerHTML = `<button class="conta-btn" onclick="ContaApp.abrirModalAnticipo()">+ Nuevo Anticipo</button>`;
        const anticipos = this.transacciones.filter(t => t.tipo === 'anticipo');
        let html;
        if (anticipos.length === 0) {
            html = this.generarEstadoVacioHTML('fa-hand-holding-dollar','Sin anticipos de clientes','Registra aquí los pagos que recibes de tus clientes por adelantado.','+ Registrar Anticipo',"ContaApp.abrirModalAnticipo()");
        } else {
            html = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra"><thead><tr>
    <th class="conta-table-th">Fecha</th><th class="conta-table-th">Cliente</th>
    <th class="conta-table-th text-right">Monto Original</th>
    <th class="conta-table-th text-right">Saldo Restante</th>
    <th class="conta-table-th text-center">Acciones</th>
    </tr></thead><tbody>`;
            anticipos.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach(a => {
                const cliente = this.findById(this.contactos, a.contactoId);
                const saldoRestante = (a.total || 0) - (a.saldoAplicado || 0);
                html += `<tr>
                    <td class="conta-table-td">${a.fecha}</td>
                    <td class="conta-table-td">${cliente?.nombre || 'N/A'}</td>
                    <td class="conta-table-td text-right font-mono">${this.formatCurrency(a.total)}</td>
                    <td class="conta-table-td text-right font-mono font-bold">${this.formatCurrency(saldoRestante)}</td>
                    <td class="conta-table-td text-center">
                        ${saldoRestante > 0.01 ? `<button class="conta-btn conta-btn-small" onclick="ContaApp.abrirModalVentaDesdeAnticipo(${a.id})">Crear Venta</button>` : '<span class="tag tag-success">Consumido</span>'}
                    </td>
                </tr>`;
            });
            html += `</tbody></table></div>`;
        }
        document.getElementById(containerId).innerHTML = html;
    },
    abrirModalAnticipo() {
        const clientes = this.contactos.filter(c => c.tipo === 'cliente').map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        const cuentasBanco = this.planDeCuentas.filter(c => c.tipo === 'DETALLE' && c.parentId === 110).map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        const modalHTML = `<h3 class="conta-title mb-4">Registrar Anticipo de Cliente</h3>
        <form onsubmit="ContaApp.guardarAnticipo(event)" class="space-y-4 modal-form">
            <div><label>Cliente</label><select id="anticipo-cliente" class="w-full p-2 mt-1" required>${clientes}</select></div>
            <div><label>Monto del Anticipo</label><input type="number" step="0.01" id="anticipo-monto" class="w-full p-2 mt-1" required></div>
            <div><label>Depositar en</label><select id="anticipo-cuenta-banco" class="w-full p-2 mt-1" required>${cuentasBanco}</select></div>
            <div><label>Fecha</label><input type="date" id="anticipo-fecha" value="${this.getTodayDate()}" class="w-full p-2 mt-1" required></div>
            <div class="flex justify-end gap-2 mt-6"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button type="submit" class="conta-btn">Guardar Anticipo</button></div>
        </form>`;
        this.showModal(modalHTML, 'xl');
    },
    guardarAnticipo(e) {
        e.preventDefault();
        const clienteId = parseInt(document.getElementById('anticipo-cliente').value);
        const monto = parseFloat(document.getElementById('anticipo-monto').value);
        const cuentaBancoId = parseInt(document.getElementById('anticipo-cuenta-banco').value);
        const fecha = document.getElementById('anticipo-fecha').value;
        const cliente = this.findById(this.contactos, clienteId);
        const cuentaAnticiposId = 220;
        const transaccion = { id: this.idCounter++, tipo: 'anticipo', fecha, contactoId: clienteId, total: monto, saldoAplicado: 0 };
        this.transacciones.push(transaccion);
        const asiento = this.crearAsiento(fecha, `Anticipo de ${cliente.nombre}`, [
            { cuentaId: cuentaBancoId, debe: monto, haber: 0 },
            { cuentaId: cuentaAnticiposId, debe: 0, haber: monto }
        ], transaccion.id);
        if (asiento) {
            this.saveAll();
            this.closeModal();
            this.irModulo('cxc', { submodulo: 'anticipos' });
            this.showToast('Anticipo registrado con éxito.', 'success');
        }
    },
    
    // Módulo: Cuentas por Pagar (CXP)
                    renderCXP(params = {}) {
        if (params.proveedorId) {
            this.renderCXPDetalleProveedor(params.proveedorId, params);
            return;
        }

        const submodulo = params.submodulo || 'estado-cuenta';

        let html = `
            <div class="flex gap-2 mb-4 border-b border-[var(--color-border-accent)] flex-wrap">
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'estado-cuenta' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('cxp', {submodulo: 'estado-cuenta'})">Estado de Cuenta</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'aging' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('cxp', {submodulo: 'aging'})">Antigüedad de Saldos</button>
            </div>
            <div id="cxp-contenido"></div>
        `;
        document.getElementById('cxp').innerHTML = html;

        if (submodulo === 'estado-cuenta') {
            this.renderCXP_TabEstadoCuenta(params);
        } else if (submodulo === 'aging') {
            this.renderCXP_TabAging(params);
        }
    },
    renderCXP_TabEstadoCuenta(params = {}) {
        document.getElementById('page-title-header').innerText = `Cuentas por Pagar`;
        document.getElementById('page-actions-header').innerHTML = `
            <div class="flex gap-2 flex-wrap">
                <button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarCxpCSV()"><i class="fa-solid fa-file-csv me-2"></i>Exportar CSV</button>
                <button class="conta-btn conta-btn-success" onclick="ContaApp.procesarSeleccionDePago('proveedor')"><i class="fa-solid fa-money-bill-wave me-2"></i>Registrar Pago</button>
                <button class="conta-btn" onclick="ContaApp.abrirModalGasto()">+ Nuevo Gasto</button>
            </div>`;
        
        let gastos = this.transacciones.filter(t => t.tipo === 'gasto');
        
        if (params.search) {
            const term = params.search.toLowerCase();
            gastos = gastos.filter(g => {
                const proveedor = this.findById(this.contactos, g.contactoId);
                return (proveedor && proveedor.nombre.toLowerCase().includes(term)) || g.descripcion.toLowerCase().includes(term);
            });
        }
        if (params.startDate) gastos = gastos.filter(g => g.fecha >= params.startDate);
        if (params.endDate) gastos = gastos.filter(g => g.fecha <= params.endDate);
        if (params.estado && params.estado !== 'Todas') {
            gastos = gastos.filter(g => (g.estado || 'Pendiente') === params.estado);
        }
        
        let html = `
            <div class="conta-card p-3 mb-4">
                 <form onsubmit="event.preventDefault(); ContaApp.filtrarLista('cxp');" class="flex flex-wrap items-end gap-3">
                    <div><label class="text-xs font-semibold">Buscar por Proveedor o Descripción</label><input type="search" id="cxp-search" class="conta-input md:w-72" value="${params.search || ''}"></div>
                    <div><label class="text-xs font-semibold">Desde</label><input type="date" id="cxp-start-date" class="conta-input" value="${params.startDate || ''}"></div>
                    <div><label class="text-xs font-semibold">Hasta</label><input type="date" id="cxp-end-date" class="conta-input" value="${params.endDate || ''}"></div>
                    <div>
                         <label class="text-xs font-semibold">Estado</label>
                         <select id="cxp-estado" class="conta-input md:w-48">
                            <option value="Todas">Todas</option>
                            <option value="Pendiente">Pendiente</option>
                            <option value="Parcial">Pago Parcial</option>
                            <option value="Pagado">Pagado</option>
                            <option value="Anulado">Anulado</option>
                         </select>
                    </div>
                    <button type="submit" class="conta-btn">Filtrar</button>
                </form>
            </div>`;

        if (gastos.length === 0) {
            html += `<div class="conta-card text-center p-8 text-[var(--color-text-secondary)]"><i class="fa-solid fa-filter-circle-xmark fa-3x mb-4 opacity-50"></i><h3 class="font-bold text-lg">Sin Resultados</h3><p>No se encontraron gastos que coincidan con los filtros aplicados.</p></div>`;
        } else {
            gastos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            let tableRowsHTML = '';
            gastos.forEach(g => {
                const proveedor = this.findById(this.contactos, g.contactoId);
                const saldo = g.total - (g.montoPagado || 0);
                const estado = g.estado || 'Pendiente';
                let estadoClass = estado === 'Pagado' ? 'tag-success' : (estado === 'Parcial' ? 'tag-accent' : 'tag-warning');
                if (g.estado === 'Anulado') estadoClass = 'tag-anulada';
                const isPayable = estado === 'Pendiente' || estado === 'Parcial';
                
                let accionesHTML = `
                    <button class="conta-btn-icon" title="Ver Historial de Pagos" onclick="ContaApp.abrirModalHistorialGasto(${g.id})"><i class="fa-solid fa-history"></i></button>
                `;
                if (g.estado !== 'Anulado' && g.montoPagado === 0) {
                    accionesHTML += `<button class="conta-btn-icon delete ml-2" title="Anular Gasto" onclick="ContaApp.anularGasto(${g.id})"><i class="fa-solid fa-ban"></i></button>`;
                }

                tableRowsHTML += `
                    <tr class="${g.estado === 'Anulado' ? 'opacity-50' : ''}">
                        <td class="conta-table-td text-center">${isPayable ? `<input type="checkbox" class="cxp-gasto-check" data-factura-id="${g.id}" data-contacto-id="${g.contactoId}">` : ''}</td>
                        <td class="conta-table-td">${g.fecha}</td>
                        <td class="conta-table-td font-bold cursor-pointer hover:text-[var(--color-primary)]" onclick="ContaApp.irModulo('cxp', { proveedorId: ${g.contactoId} })">${proveedor?.nombre || 'N/A'}</td>
                        <td class="conta-table-td">${g.descripcion} ${g.comprobanteDataUrl ? '<i class="fa-solid fa-paperclip text-[var(--color-text-secondary)] ml-1"></i>' : ''}</td>
                        <td class="conta-table-td text-right font-mono">${this.formatCurrency(g.total)}</td>
                        <td class="conta-table-td text-right font-mono font-bold">${this.formatCurrency(saldo)}</td>
                        <td class="conta-table-td"><span class="tag ${estadoClass}">${estado}</span></td>
                        <td class="conta-table-td">${accionesHTML}</td>
                    </tr>`;
            });
            html += `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra">
                <thead><tr>
                    <th class="conta-table-th w-10"><input type="checkbox" onchange="ContaApp.toggleAllCheckboxes(this, 'cxp-gasto-check')"></th>
                    <th class="conta-table-th">Fecha</th><th class="conta-table-th">Proveedor</th>
                    <th class="conta-table-th">Descripción</th><th class="conta-table-th text-right">Total</th>
                    <th class="conta-table-th text-right">Saldo</th><th class="conta-table-th">Estado</th>
                    <th class="conta-table-th">Acciones</th>
                </tr></thead><tbody>${tableRowsHTML}</tbody></table></div>`;
        }
        
        document.getElementById('cxp-contenido').innerHTML = html;
        if(params.estado) document.getElementById('cxp-estado').value = params.estado;
    },
        renderCXP_TabAging(params = {}) {
        document.getElementById('page-actions-header').innerHTML = `<button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarReporteEstilizadoPDF('Antigüedad de Cuentas por Pagar', 'cxp-aging-report-area')"><i class="fa-solid fa-print me-2"></i>Generar Reporte</button>`;
        
        const agingData = this.getAgingData('proveedor', this.getTodayDate());
        let html;

        if (agingData.contactos.length === 0) {
            html = this.generarEstadoVacioHTML('fa-file-invoice', '¡Sin Deudas!', 'No tienes cuentas por pagar pendientes. ¡Excelente!', '+ Crear Nuevo Gasto', "ContaApp.abrirModalGasto()");
        } else {
            const { totales } = agingData;
            const totalDeuda = totales.total;

            const kpiCards = [
                { key: 'current', label: 'No Vencido', value: totales.current, color: 'green' },
                { key: 'd1_30', label: '1-30 Días', value: totales.d1_30, color: 'amber' },
                { key: 'd31_60', label: '31-60 Días', value: totales.d31_60, color: 'amber' },
                { key: 'd61_90', label: '61-90 Días', value: totales.d61_90, color: 'red' },
                { key: 'd91_plus', label: '> 90 Días', value: totales.d91_plus, color: 'red' }
            ];

            let kpiHTML = '<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">';
            kpiCards.forEach(card => {
                const percentage = totalDeuda > 0 ? (card.value / totalDeuda) * 100 : 0;
                kpiHTML += `
                    <div class="conta-card kpi-aging-card">
                        <div class="label">${card.label}</div>
                        <div class="value ${card.color === 'green' ? 'conta-text-success' : (card.color === 'amber' ? 'conta-text-accent' : 'conta-text-danger')}">${this.formatCurrency(card.value)}</div>
                        <div class="progress-bar-container">
                            <div class="progress-bar ${card.color}" style="width: ${percentage}%;"></div>
                        </div>
                    </div>
                `;
            });
            kpiHTML += '</div>';
            
            let tablaHTML = `<div class="conta-card overflow-auto" id="cxp-aging-report-area">
                    <h3 class="conta-subtitle !border-0 !mb-2">Detalle por Proveedor</h3>
                    <table class="min-w-full text-sm conta-table-zebra">
                        <thead><tr>
                            <th class="conta-table-th">Proveedor</th>
                            <th class="conta-table-th text-right">No Vencido</th>
                            <th class="conta-table-th text-right">1-30 Días</th>
                            <th class="conta-table-th text-right">31-60 Días</th>
                            <th class="conta-table-th text-right">61-90 Días</th>
                            <th class="conta-table-th text-right">> 90 Días</th>
                            <th class="conta-table-th text-right">Total Adeudado</th>
                        </tr></thead><tbody>`;
            
            agingData.contactos.forEach(c => {
                tablaHTML += `<tr>
                    <td class="conta-table-td font-bold cursor-pointer hover:text-[var(--color-primary)]" onclick="ContaApp.irModulo('cxp', {proveedorId: ${c.id}})">${c.contacto.nombre}</td>
                    <td class="conta-table-td text-right font-mono">${this.formatCurrency(c.current)}</td>
                    <td class="conta-table-td text-right font-mono">${this.formatCurrency(c.d1_30)}</td>
                    <td class="conta-table-td text-right font-mono">${this.formatCurrency(c.d31_60)}</td>
                    <td class="conta-table-td text-right font-mono">${this.formatCurrency(c.d61_90)}</td>
                    <td class="conta-table-td text-right font-mono">${this.formatCurrency(c.d91_plus)}</td>
                    <td class="conta-table-td text-right font-mono font-bold">${this.formatCurrency(c.total)}</td>
                </tr>`;
            });

            tablaHTML += `</tbody>
                    <tfoot class="bg-[var(--color-bg-accent)] font-bold">
                        <tr>
                            <td class="conta-table-td">TOTALES</td>
                            <td class="conta-table-td text-right font-mono">${this.formatCurrency(totales.current)}</td>
                            <td class="conta-table-td text-right font-mono">${this.formatCurrency(totales.d1_30)}</td>
                            <td class="conta-table-td text-right font-mono">${this.formatCurrency(totales.d31_60)}</td>
                            <td class="conta-table-td text-right font-mono">${this.formatCurrency(totales.d61_90)}</td>
                            <td class="conta-table-td text-right font-mono">${this.formatCurrency(totales.d91_plus)}</td>
                            <td class="conta-table-td text-right font-mono">${this.formatCurrency(totales.total)}</td>
                        </tr>
                    </tfoot>
                    </table>
                </div>`;
            html = kpiHTML + tablaHTML;
        }
        
        document.getElementById('cxp-contenido').innerHTML = html;
    },
                renderCXPDetalleProveedor(proveedorId, filters = {}) {
        this.renderEstadoDeCuentaDetalle(proveedorId, 'proveedor');
    },
        abrirModalRegistrarPagoProveedor(gastoId) {
        const gasto = this.findById(this.transacciones, gastoId);
        const proveedor = this.findById(this.contactos, gasto.contactoId);
        const cuentasPago = this.planDeCuentas.filter(c => c.tipo === 'DETALLE' && (c.codigo.startsWith('110') || c.codigo.startsWith('230')))
            .map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        const saldoPendiente = gasto.total - (gasto.montoPagado || 0);
        
        // Calcular la deuda total con este proveedor
        const totalDeudaProveedor = this.transacciones
            .filter(t => t.tipo === 'gasto' && t.contactoId === gasto.contactoId && (t.estado === 'Pendiente' || t.estado === 'Parcial'))
            .reduce((sum, g) => sum + (g.total - (g.montoPagado || 0)), 0);

        const modalHTML = `<h3 class="conta-title mb-4">Registrar Pago a Proveedor</h3>
        <p class="mb-2"><strong>Proveedor:</strong> ${proveedor.nombre}</p>
        <p class="mb-2"><strong>Deuda Total con Proveedor:</strong> <span class="font-bold">${this.formatCurrency(totalDeudaProveedor)}</span></p>
        <p class="mb-6"><strong>Saldo Gasto #${gasto.id}:</strong> ${this.formatCurrency(saldoPendiente)}</p>
        <form onsubmit="ContaApp.guardarPagoProveedor(event, ${gastoId})" class="space-y-4 modal-form">
            <div><label>Monto a Pagar</label><input type="number" step="0.01" id="pago-monto" class="w-full p-2 mt-1" value="${saldoPendiente.toFixed(2)}" max="${saldoPendiente.toFixed(2)}" required></div>
            <div><label>Pagar desde</label><select id="pago-cuenta-origen" class="w-full p-2 mt-1" required>${cuentasPago}</select></div>
            <div><label>Fecha del Pago</label><input type="date" id="pago-fecha" value="${this.getTodayDate()}" class="w-full p-2 mt-1" required></div>
            <div><label>Comentario / Referencia</label><input type="text" id="pago-comentario" class="w-full p-2 mt-1" placeholder="Ej: Transferencia #456, Pago parcial, etc."></div>
            <div class="flex justify-end gap-2 mt-6"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button type="submit" class="conta-btn">Confirmar Pago</button></div>
        </form>`;
        this.showModal(modalHTML, 'xl');
    },
            guardarPagoProveedor(e, gastoId) {
        e.preventDefault();
        const gasto = this.findById(this.transacciones, gastoId);
        const monto = parseFloat(document.getElementById('pago-monto').value);
        const cuentaOrigenId = parseInt(document.getElementById('pago-cuenta-origen').value);
        const fecha = document.getElementById('pago-fecha').value;
        const comentario = document.getElementById('pago-comentario').value;
        const cuentaCxpId = 210;

        const pagoRegistrado = {
            id: this.idCounter++,
            tipo: 'pago_proveedor', // Nuevo tipo de transacción
            fecha: fecha,
            contactoId: gasto.contactoId,
            monto: monto,
            cuentaOrigenId: cuentaOrigenId,
            gastoId: gastoId, // Vínculo al gasto original
            comentario: comentario
        };
        this.transacciones.push(pagoRegistrado);

        const asiento = this.crearAsiento(fecha, `Pago a proveedor por: ${gasto.descripcion}`, [
            { cuentaId: cuentaCxpId, debe: monto, haber: 0 },
            { cuentaId: cuentaOrigenId, debe: 0, haber: monto }
        ], pagoRegistrado.id);

        if (asiento) {
            gasto.montoPagado = (gasto.montoPagado || 0) + monto;
            if (gasto.montoPagado >= gasto.total - 0.01) {
                gasto.estado = 'Pagado';
            } else if (gasto.montoPagado > 0) {
                gasto.estado = 'Parcial';
            } else {
                gasto.estado = 'Pendiente';
            }
            this.saveAll();
            this.closeModal();
            this.irModulo('cxp', { proveedorId: gasto.contactoId });
            this.showToast('Pago a proveedor registrado con éxito.', 'success');
        }
    },
            abrirModalHistorialGasto(gastoId) {
        const gasto = this.findById(this.transacciones, gastoId);
        if (!gasto) return;

        const pagos = this.transacciones.filter(t => t.tipo === 'pago_proveedor' && t.gastoId === gastoId);
        
        let pagosHTML = '';
        if (pagos.length > 0) {
            pagos.forEach(pago => {
                const descripcionPago = pago.comentario || `Pago realizado`;
                pagosHTML += `
                    <tr class="border-t border-[var(--color-border-primary)]">
                        <td class="py-2">${pago.fecha}</td>
                        <td class="py-2">${descripcionPago}</td>
                        <td class="py-2 text-right font-mono">${this.formatCurrency(pago.monto)}</td>
                    </tr>`;
            });
        } else {
            pagosHTML = `<tr><td colspan="3" class="text-center py-4 text-[var(--color-text-secondary)]">No se han registrado pagos para este gasto.</td></tr>`;
        }

        const saldo = (gasto.total || 0) - (gasto.montoPagado || 0);

        const modalHTML = `
            <h3 class="conta-title mb-2">Historial del Gasto #${gasto.id}</h3>
            <p class="text-sm text-[var(--color-text-secondary)] mb-6">Proveedor: ${this.findById(this.contactos, gasto.contactoId)?.nombre}</p>
            
            <div class="grid grid-cols-3 gap-4 text-center mb-6">
                <div class="conta-card !p-3"><div class="text-sm text-[var(--color-text-secondary)]">Total Gasto</div><div class="font-bold text-lg">${this.formatCurrency(gasto.total)}</div></div>
                <div class="conta-card !p-3"><div class="text-sm text-[var(--color-text-secondary)]">Total Pagado</div><div class="font-bold text-lg conta-text-success">${this.formatCurrency(gasto.montoPagado)}</div></div>
                <div class="conta-card !p-3"><div class="text-sm text-[var(--color-text-secondary)]">Saldo Pendiente</div><div class="font-bold text-lg conta-text-danger">${this.formatCurrency(saldo)}</div></div>
            </div>

            <div class="conta-card !p-0">
                <table class="w-full text-sm">
                    <thead><tr><th class="conta-table-th">Fecha</th><th class="conta-table-th">Descripción</th><th class="conta-table-th text-right">Monto</th></tr></thead>
                    <tbody>${pagosHTML}</tbody>
                </table>
            </div>

            <div class="flex justify-between items-center mt-8">
                <div>
                    ${gasto.comprobanteDataUrl ? `<button type="button" class="conta-btn" onclick="ContaApp.abrirVistaPreviaRecibo(${gasto.id})"><i class="fa-solid fa-paperclip me-2"></i>Ver Comprobante</button>` : ''}
                </div>
                <div class="flex gap-2">
                    <button type="button" class="conta-btn" onclick="ContaApp.abrirModalVerAsientos(${gasto.id})"><i class="fa-solid fa-book me-2"></i>Ver Asientos</button>
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cerrar</button>
                </div>
            </div>
        `;
        this.showModal(modalHTML, '3xl');
    },
    abrirVistaPreviaRecibo(gastoId) {
        const gasto = this.findById(this.transacciones, gastoId);
        if (!gasto || !gasto.comprobanteDataUrl) {
            this.showToast('Este gasto no tiene un comprobante adjunto.', 'error');
            return;
        }

        const esPDF = gasto.comprobanteDataUrl.startsWith('data:application/pdf');
        
        let contentHTML;
        if (esPDF) {
            contentHTML = `<iframe src="${gasto.comprobanteDataUrl}" width="100%" height="600px" style="border: none;"></iframe>`;
        } else {
            contentHTML = `<img src="${gasto.comprobanteDataUrl}" alt="Comprobante de Gasto" class="max-w-full max-h-[80vh] mx-auto">`;
        }

        const modalHTML = `
            <h3 class="conta-title mb-4">Comprobante del Gasto #${gasto.id}</h3>
            <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                ${contentHTML}
            </div>
            <div class="flex justify-end mt-6">
                <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cerrar</button>
            </div>
        `;
        this.showModal(modalHTML, '4xl');
    },
    abrirModalRegistroPagoRapido() {
        const cuentasBancoOptions = this.planDeCuentas.filter(c => c.tipo === 'DETALLE' && c.parentId === 110).map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');

        const modalHTML = `
            <h3 class="conta-title mb-4">Registro Rápido de Pago</h3>
            <form onsubmit="ContaApp.guardarPagoRapido(event)" class="modal-form">
                <div class="conta-card p-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                            <label>Tipo de Operación</label>
                            <div class="flex gap-4 mt-1">
                                <label><input type="radio" name="pago-rapido-tipo" value="cobro" onchange="ContaApp.actualizarModalPagoRapido()" checked> Cobro de Cliente</label>
                                <label><input type="radio" name="pago-rapido-tipo" value="pago" onchange="ContaApp.actualizarModalPagoRapido()"> Pago a Proveedor</label>
                            </div>
                        </div>
                        <div id="pago-rapido-contacto-container">
                            <!-- El contenido se genera dinámicamente -->
                        </div>
                        <div>
                            <label>Monto</label>
                            <input type="number" step="0.01" id="pago-rapido-monto" class="w-full conta-input mt-1" required oninput="ContaApp.validarAsignacionPagoRapido()">
                        </div>
                        <div>
                            <label>Fecha</label>
                            <input type="date" id="pago-rapido-fecha" value="${this.getTodayDate()}" class="w-full conta-input mt-1" required>
                        </div>
                        <div>
                            <label>Cuenta Bancaria Afectada</label>
                            <select id="pago-rapido-cuenta-banco" class="w-full conta-input mt-1" required>${cuentasBancoOptions}</select>
                        </div>
                        <div>
                            <label>Comentario / Referencia</label>
                            <input type="text" id="pago-rapido-comentario" class="w-full conta-input mt-1">
                        </div>
                    </div>
                </div>

                <!-- Zona de asignación de facturas -->
                <div id="pago-rapido-asignacion-container" class="mt-4 hidden"></div>

                <div class="flex justify-end gap-2 mt-8">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button type="submit" id="pago-rapido-guardar-btn" class="conta-btn" disabled>Guardar Pago</button>
                </div>
            </form>
        `;
        this.showModal(modalHTML, '4xl');
        this.actualizarModalPagoRapido(); // Llamada inicial para renderizar el campo de cliente
    },

                actualizarModalPagoRapido() {
        const tipoOperacion = document.querySelector('input[name="pago-rapido-tipo"]:checked').value;
        const contactoContainer = document.getElementById('pago-rapido-contacto-container');
        const asignacionContainer = document.getElementById('pago-rapido-asignacion-container');
        const guardarBtn = document.getElementById('pago-rapido-guardar-btn');

        const tipoContacto = tipoOperacion === 'cobro' ? 'cliente' : 'proveedor';
        const label = tipoOperacion === 'cobro' ? 'Cliente' : 'Proveedor';

        if (!document.getElementById('pago-rapido-contacto-input') || document.getElementById('pago-rapido-contacto-input').dataset.tipo !== tipoContacto) {
            const contactosOptions = this.contactos.filter(c => c.tipo === tipoContacto).map(c => `<option value="${c.nombre}" data-id="${c.id}"></option>`).join('');
            contactoContainer.innerHTML = `
                <label>${label}</label>
                <div class="flex items-center gap-2">
                    <input list="pago-rapido-datalist" id="pago-rapido-contacto-input" data-tipo="${tipoContacto}" class="w-full conta-input mt-1" placeholder="Escribe para buscar..." oninput="ContaApp.handlePagoRapidoContactoInput(event)">
                    <datalist id="pago-rapido-datalist">${contactosOptions}</datalist>
                    <input type="hidden" id="pago-rapido-contacto-id">
                    <button type="button" class="conta-btn conta-btn-small" onclick="ContaApp.abrirSubModalNuevoContacto('${tipoContacto}', 'pago-rapido-contacto-input')">+</button>
                </div>`;
            asignacionContainer.classList.add('hidden');
            asignacionContainer.innerHTML = '';
        }
        
        const contactoId = document.getElementById('pago-rapido-contacto-id').value;
        
        // Desactivamos el botón de guardar principal por defecto. Solo se activará si hay facturas que asignar.
        guardarBtn.disabled = true;

        if (contactoId) {
            const tipoTransaccion = tipoOperacion === 'cobro' ? 'venta' : 'gasto';
            // Solo buscamos facturas si la operación no es un pago a proveedor (los proveedores no tienen anticipos en nuestra lógica actual)
            const facturasPendientes = tipoOperacion === 'cobro' 
                ? this.transacciones.filter(t => 
                    t.tipo === 'venta' &&
                    t.contactoId === parseInt(contactoId) &&
                    (t.estado === 'Pendiente' || t.estado === 'Parcial')
                  ).sort((a,b) => new Date(a.fecha) - new Date(b.fecha))
                : [];

            if (facturasPendientes.length > 0 && tipoOperacion === 'cobro') {
                // FLUJO ORIGINAL: Mostrar tabla para asignar pago
                let facturasHTML = `<div class="conta-card p-4"><h4 class="font-bold mb-2">Asignar pago a facturas pendientes</h4><table class="w-full text-sm"><thead>
                    <tr><th class="text-left font-semibold pb-2">Factura #</th><th class="text-left font-semibold pb-2">Fecha</th><th class="text-right font-semibold pb-2">Saldo Pendiente</th><th class="text-right font-semibold pb-2">Monto a Aplicar</th></tr>
                </thead><tbody>`;
                facturasPendientes.forEach(f => {
                    const saldo = f.total - (f.montoPagado || 0);
                    facturasHTML += `
                        <tr class="border-t border-[var(--color-border-primary)]">
                            <td class="py-2 font-mono">${f.numeroFactura || f.id}</td>
                            <td class="py-2">${f.fecha}</td>
                            <td class="py-2 text-right font-mono">${this.formatCurrency(saldo)}</td>
                            <td class="py-2 text-right">
                                <input type="number" step="0.01" min="0" max="${saldo.toFixed(2)}" data-factura-id="${f.id}" class="conta-input text-right w-28 pago-rapido-asignacion-input" oninput="ContaApp.validarAsignacionPagoRapido()">
                            </td>
                        </tr>`;
                });
                facturasHTML += `</tbody></table>
                    <div class="text-right mt-4 font-bold">
                        <span id="pago-rapido-feedback" class="text-[var(--color-text-secondary)]">Asigna el monto del pago a las facturas.</span>
                    </div>
                </div>`;
                asignacionContainer.innerHTML = facturasHTML;
                asignacionContainer.classList.remove('hidden');
            } else if (tipoOperacion === 'cobro') {
                // NUEVO FLUJO: Ofrecer crear un anticipo
                const montoTotalPago = parseFloat(document.getElementById('pago-rapido-monto').value) || 0;
                const botonAnticipoHTML = `
                    <button type="button" class="conta-btn conta-btn-success" onclick="ContaApp.guardarAnticipoDesdePagoRapido(event)" ${montoTotalPago > 0 ? '' : 'disabled'}>
                        <i class="fa-solid fa-plus-circle me-2"></i>Crear Anticipo por ${this.formatCurrency(montoTotalPago)}
                    </button>`;

                asignacionContainer.innerHTML = `
                    <div class="conta-card p-4 text-center">
                        <p class="text-[var(--color-text-secondary)] mb-4">Este cliente no tiene facturas pendientes.</p>
                        ${botonAnticipoHTML}
                    </div>`;
                asignacionContainer.classList.remove('hidden');
            } else {
                 // Caso para 'Pago a Proveedor' que no tiene facturas pendientes
                 asignacionContainer.innerHTML = `<div class="conta-card p-4 text-center text-[var(--color-text-secondary)]">Este proveedor no tiene facturas por pagar registradas.</div>`;
                 asignacionContainer.classList.remove('hidden');
            }
        } else {
            asignacionContainer.classList.add('hidden');
            asignacionContainer.innerHTML = '';
        }

        this.validarAsignacionPagoRapido();
    },
        validarAsignacionPagoRapido() {
        const montoTotalPago = parseFloat(document.getElementById('pago-rapido-monto').value) || 0;
        let montoTotalAsignado = 0;
        document.querySelectorAll('.pago-rapido-asignacion-input').forEach(input => {
            montoTotalAsignado += parseFloat(input.value) || 0;
        });

        const feedbackEl = document.getElementById('pago-rapido-feedback');
        const guardarBtn = document.getElementById('pago-rapido-guardar-btn');

        if (!feedbackEl) {
            guardarBtn.disabled = true;
            return;
        }

        const diferencia = montoTotalPago - montoTotalAsignado;
        if (montoTotalPago > 0 && Math.abs(diferencia) < 0.01) {
            feedbackEl.textContent = 'Total asignado correctamente.';
            feedbackEl.className = 'conta-text-success';
            guardarBtn.disabled = false;
        } else if (montoTotalPago > 0 && montoTotalAsignado > 0) {
            feedbackEl.textContent = `Descuadre: ${this.formatCurrency(diferencia)}`;
            feedbackEl.className = 'conta-text-danger';
            guardarBtn.disabled = true;
        } else {
            feedbackEl.textContent = 'Asigna el monto del pago a las facturas.';
            feedbackEl.className = 'text-[var(--color-text-secondary)]';
            guardarBtn.disabled = true;
        }
    },
        handlePagoRapidoContactoInput(event) {
        const input = event.target;
        const datalist = document.getElementById('pago-rapido-datalist');
        const hiddenInput = document.getElementById('pago-rapido-contacto-id');
        const inputValue = input.value;
        let found = false;

        for (let i = 0; i < datalist.options.length; i++) {
            if (datalist.options[i].value === inputValue) {
                hiddenInput.value = datalist.options[i].getAttribute('data-id');
                found = true;
                break;
            }
        }

        if (!found) {
            hiddenInput.value = '';
        }
        
        // Disparamos la actualización principal para que muestre (u oculte) las facturas
        this.actualizarModalPagoRapido();
    },

    guardarPagoRapido(e) {
        e.preventDefault();
        const tipoOperacion = document.querySelector('input[name="pago-rapido-tipo"]:checked').value;
        const contactoId = parseInt(document.getElementById('pago-rapido-contacto-id').value);
        const monto = parseFloat(document.getElementById('pago-rapido-monto').value);
        const fecha = document.getElementById('pago-rapido-fecha').value;
        const cuentaBancoId = parseInt(document.getElementById('pago-rapido-cuenta-banco').value);
        const comentario = document.getElementById('pago-rapido-comentario').value;

        const asignaciones = [];
        document.querySelectorAll('.pago-rapido-asignacion-input').forEach(input => {
            const montoAsignado = parseFloat(input.value) || 0;
            if (montoAsignado > 0) {
                asignaciones.push({
                    facturaId: parseInt(input.dataset.facturaId),
                    monto: montoAsignado
                });
            }
        });

        if (asignaciones.length === 0) {
            this.showToast('Debes asignar el pago a al menos una factura.', 'error');
            return;
        }

        const esCobro = tipoOperacion === 'cobro';
        const cuentaContrapartidaId = esCobro ? 120 : 210; // 120: CxC, 210: CxP
        const contacto = this.findById(this.contactos, contactoId);

        // Crear un único asiento contable para el total del pago
        const asiento = this.crearAsiento(
            fecha,
            `${esCobro ? 'Cobro de' : 'Pago a'} ${contacto.nombre}. ${comentario}`,
            [
                { cuentaId: cuentaBancoId, debe: esCobro ? monto : 0, haber: esCobro ? 0 : monto },
                { cuentaId: cuentaContrapartidaId, debe: esCobro ? 0 : monto, haber: esCobro ? monto : 0 }
            ]
        );

        if (asiento) {
            // Actualizar cada factura individualmente
            asignaciones.forEach(asignacion => {
                const factura = this.findById(this.transacciones, asignacion.facturaId);
                if (factura) {
                    factura.montoPagado = (factura.montoPagado || 0) + asignacion.monto;
                    if (factura.montoPagado >= factura.total - 0.01) {
                        factura.estado = 'Pagada';
                    } else {
                        factura.estado = 'Parcial';
                    }
                }
            });

            this.saveAll();
            this.closeModal();
            this.irModulo('dashboard');
            this.showToast('Pago registrado y aplicado con éxito.', 'success');
        }
    },
    guardarAnticipoDesdePagoRapido(e) {
        e.preventDefault();
        const clienteId = parseInt(document.getElementById('pago-rapido-contacto-id').value);
        const monto = parseFloat(document.getElementById('pago-rapido-monto').value);
        const cuentaBancoId = parseInt(document.getElementById('pago-rapido-cuenta-banco').value);
        const fecha = document.getElementById('pago-rapido-fecha').value;
        const comentario = document.getElementById('pago-rapido-comentario').value || 'Anticipo de cliente';
        
        if (!clienteId || !monto || !cuentaBancoId || !fecha) {
            this.showToast('Faltan datos para crear el anticipo.', 'error');
            return;
        }

        const cliente = this.findById(this.contactos, clienteId);
        const cuentaAnticiposId = 220; // La cuenta de pasivo para anticipos

        const transaccion = { 
            id: this.idCounter++, 
            tipo: 'anticipo', 
            fecha, 
            contactoId: clienteId, 
            total: monto, 
            saldoAplicado: 0,
            refOriginal: comentario
        };
        this.transacciones.push(transaccion);
        
        const asiento = this.crearAsiento(
            fecha, 
            `Anticipo recibido de ${cliente.nombre}`, 
            [
                { cuentaId: cuentaBancoId, debe: monto, haber: 0 },
                { cuentaId: cuentaAnticiposId, debe: 0, haber: monto }
            ], 
            transaccion.id
        );
        
        if (asiento) {
            this.saveAll();
            this.closeModal();
            this.irModulo('cxc', { submodulo: 'anticipos' });
            this.showToast('Anticipo registrado con éxito.', 'success');
        }
    },
        abrirModalVerAsientos(transaccionId) {
        const transaccion = this.findById(this.transacciones, transaccionId);
        if (!transaccion) return;

        const asientos = this.asientos.filter(a => a.transaccionId === transaccionId);
        
        let asientosHTML = '';
        if (asientos.length > 0) {
            asientos.forEach(asiento => {
                asientosHTML += `<div class="conta-card mb-4">
                    <div class="flex justify-between items-center border-b border-[var(--color-border-accent)] pb-2 mb-2">
                        <div>
                            <span class="font-bold">Asiento #${asiento.id}</span> 
                            <span class="text-sm text-[var(--color-text-secondary)]">(${asiento.fecha})</span>
                        </div>
                        <div class="text-sm">${asiento.descripcion}</div>
                    </div>
                    <table class="min-w-full text-sm conta-table-zebra">
                        <thead><tr>
                            <th class="conta-table-th">Código</th><th class="conta-table-th">Cuenta</th>
                            <th class="conta-table-th text-right">Debe</th><th class="conta-table-th text-right">Haber</th>
                        </tr></thead>
                        <tbody>`;
                asiento.movimientos.forEach(mov => {
                    const cuenta = this.findById(this.planDeCuentas, mov.cuentaId);
                    asientosHTML += `<tr>
                        <td class="conta-table-td font-mono">${cuenta?.codigo || 'N/A'}</td>
                        <td class="conta-table-td">${cuenta?.nombre || 'N/A'}</td>
                        <td class="conta-table-td text-right font-mono">${mov.debe > 0 ? this.formatCurrency(mov.debe) : ''}</td>
                        <td class="conta-table-td text-right font-mono">${mov.haber > 0 ? this.formatCurrency(mov.haber) : ''}</td>
                    </tr>`;
                });
                asientosHTML += `</tbody></table></div>`;
            });
        } else {
            asientosHTML = `<p class="text-center text-[var(--color-text-secondary)]">No se encontraron asientos contables para esta transacción.</p>`;
        }

        const modalHTML = `
            <h3 class="conta-title mb-4">Asientos Contables Vinculados</h3>
            <div class="max-h-96 overflow-y-auto pr-2">
                ${asientosHTML}
            </div>
            <div class="flex justify-end mt-6">
                <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cerrar</button>
            </div>
        `;
        this.showModal(modalHTML, '4xl');
    },
    abrirVistaPreviaGasto(gastoId) {
        const gasto = this.findById(this.transacciones, gastoId);
        if (!gasto) return;

        const proveedor = this.findById(this.contactos, gasto.contactoId);

        let itemsHTML = '';
        gasto.items.forEach(item => {
            const cuenta = this.findById(this.planDeCuentas, item.cuentaId);
            itemsHTML += `<tr class="border-t border-[var(--color-border-primary)]">
                <td class="py-2">${cuenta?.codigo || 'N/A'} - ${cuenta?.nombre || 'N/A'}</td>
                <td class="py-2 text-right font-mono">${this.formatCurrency(item.monto)}</td>
            </tr>`;
        });

        const modalHTML = `
            <h3 class="conta-title mb-2">Detalle del Gasto #${gasto.id}</h3>
            <p class="text-sm text-[var(--color-text-secondary)] mb-6">${gasto.descripcion}</p>
            
            <div class="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div><strong>Proveedor:</strong> ${proveedor?.nombre || 'N/A'}</div>
                <div class="text-right"><strong>Fecha:</strong> ${gasto.fecha}</div>
            </div>

            <div class="conta-card !p-0">
    <table class="w-full text-sm conta-table-zebra">
        <thead>
            <tr>
                <th class="conta-table-th">Cuenta Afectada</th>
                            <th class="conta-table-th text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHTML}</tbody>
                    <tfoot class="bg-[var(--color-bg-accent)] font-bold">
                        <tr>
                            <td class="conta-table-td text-right">TOTAL</td>
                            <td class="conta-table-td text-right font-mono">${this.formatCurrency(gasto.total)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div class="flex justify-end mt-8">
                <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cerrar</button>
            </div>
        `;
        this.showModal(modalHTML, '2xl');
    },
    exportarCxcCSV() {
        const filters = {
            search: document.getElementById('cxc-search')?.value,
            startDate: document.getElementById('cxc-start-date')?.value,
            endDate: document.getElementById('cxc-end-date')?.value,
            estado: document.getElementById('cxc-estado')?.value
        };
        let facturas = this.transacciones.filter(t => t.tipo === 'venta' && t.estado !== 'Anulada');
        
        if (filters.search) {
            const term = filters.search.toLowerCase();
            facturas = facturas.filter(v => {
                const cliente = this.findById(this.contactos, v.contactoId);
                return (cliente && cliente.nombre.toLowerCase().includes(term)) || (v.numeroFactura && v.numeroFactura.toLowerCase().includes(term));
            });
        }
        if (filters.startDate) facturas = facturas.filter(v => v.fecha >= filters.startDate);
        if (filters.endDate) facturas = facturas.filter(v => v.fecha <= filters.endDate);
        if (filters.estado && filters.estado !== 'Todas') {
             facturas = facturas.filter(v => (v.estado || 'Pendiente') === filters.estado);
        }

        const dataParaExportar = facturas.map(v => {
            const cliente = this.findById(this.contactos, v.contactoId);
            const saldo = v.total - (v.montoPagado || 0);
            return {
                'Fecha': v.fecha,
                'Factura_Numero': v.numeroFactura || v.id,
                'Cliente': cliente?.nombre || 'N/A',
                'Total': v.total,
                'Monto_Pagado': v.montoPagado || 0,
                'Saldo_Pendiente': saldo,
                'Estado': v.estado,
                'Fecha_Vencimiento': v.fechaVencimiento || ''
            };
        });
        this.exportarA_CSV(`cuentas_por_cobrar_${this.getTodayDate()}.csv`, dataParaExportar);
    },

    exportarCxpCSV() {
        const filters = {
            search: document.getElementById('cxp-search')?.value,
            startDate: document.getElementById('cxp-start-date')?.value,
            endDate: document.getElementById('cxp-end-date')?.value,
            estado: document.getElementById('cxp-estado')?.value
        };
        let gastos = this.transacciones.filter(t => t.tipo === 'gasto');

        if (filters.search) {
            const term = filters.search.toLowerCase();
            gastos = gastos.filter(g => {
                const proveedor = this.findById(this.contactos, g.contactoId);
                return (proveedor && proveedor.nombre.toLowerCase().includes(term)) || g.descripcion.toLowerCase().includes(term);
            });
        }
        if (filters.startDate) gastos = gastos.filter(g => g.fecha >= filters.startDate);
        if (filters.endDate) gastos = gastos.filter(g => g.fecha <= filters.endDate);
        if (filters.estado && filters.estado !== 'Todas') {
            gastos = gastos.filter(g => (g.estado || 'Pendiente') === filters.estado);
        }

        const dataParaExportar = gastos.map(g => {
            const proveedor = this.findById(this.contactos, g.contactoId);
            const saldo = g.total - (g.montoPagado || 0);
            return {
                'Fecha': g.fecha,
                'Proveedor': proveedor?.nombre || 'N/A',
                'Descripcion': g.descripcion,
                'Total': g.total,
                'Monto_Pagado': g.montoPagado || 0,
                'Saldo_Pendiente': saldo,
                'Estado': g.estado || 'Pendiente'
            };
        });
        this.exportarA_CSV(`cuentas_por_pagar_${this.getTodayDate()}.csv`, dataParaExportar);
    },
});