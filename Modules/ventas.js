// Archivo: modules/ventas.js

Object.assign(ContaApp, {
    ordenarVentasPor(columna) {
        if (this.ventasSortState.column === columna) {
            // Si ya se está ordenando por esta columna, invertir el orden
            this.ventasSortState.order = this.ventasSortState.order === 'asc' ? 'desc' : 'asc';
        } else {
            // Si es una nueva columna, ordenarla ascendentemente por defecto
            this.ventasSortState.column = columna;
            this.ventasSortState.order = 'asc';
        }
        // Volver a renderizar el módulo de ventas para aplicar el nuevo orden
        this.irModulo('ventas');
    },
    
    renderVentas(params = {}) {
        const submodulo = params.submodulo || 'historial';

        let html = `
            <div class="flex gap-2 mb-4 border-b border-[var(--color-border-accent)] flex-wrap">
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'historial' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('ventas', {submodulo: 'historial'})">Historial de Ventas</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'cotizaciones' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('ventas', {submodulo: 'cotizaciones'})">Cotizaciones</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'recurrentes' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('ventas', {submodulo: 'recurrentes'})">Ventas Recurrentes</button>
            </div>
            <div id="ventas-contenido"></div>
        `;
        document.getElementById('ventas').innerHTML = html;

        if (submodulo === 'historial') {
            this.renderVentas_TabHistorial(params);
        } else if (submodulo === 'cotizaciones') {
            this.renderVentas_TabCotizaciones(params);
        } else if (submodulo === 'recurrentes') {
            this.renderVentas_TabRecurrentes();
        }
    },
    async renderVentas_TabHistorial(filters = {}) {
    document.getElementById('page-actions-header').innerHTML = `
        <div class="flex gap-2 flex-wrap">
            <button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarVentasCSV()"><i class="fa-solid fa-file-csv me-2"></i>Exportar CSV</button>
            <button class="conta-btn conta-btn-accent" onclick="ContaApp.abrirModalCotizacion()">+ Nueva Cotización</button>
            <button class="conta-btn" onclick="ContaApp.abrirModalVenta()">+ Nueva Venta</button>
        </div>`;

    const todasLasTransacciones = this.transacciones.length > 0 ? this.transacciones : (await this.repository.getPaginatedTransactions({ perPage: 10000, filters: { tipos: ['venta', 'nota_credito'] } })).data;
    
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0,10);
    const ventasNetasDelMes = todasLasTransacciones.filter(t => t.fecha >= primerDiaMes && t.estado !== 'Anulada').reduce((sum, t) => {
        if (t.tipo === 'venta') return sum + t.total;
        if (t.tipo === 'nota_credito') return sum - t.total;
        return sum;
    }, 0);
    const ventasActivas = todasLasTransacciones.filter(t => t.tipo === 'venta' && t.estado !== 'Anulada');
    const ticketPromedio = ventasActivas.length > 0 ? (ventasActivas.reduce((sum, v) => sum + v.total, 0) / ventasActivas.length) : 0;
    let productoEstrella = 'N/A';
    if (ventasActivas.length > 0) {
        const ventasPorItem = ventasActivas.flatMap(v => v.items).reduce((acc, item) => { let itemId = item.itemType === 'producto' ? `P-${item.productoId}` : `S-${item.cuentaId}`; let totalVentaItem = item.cantidad * item.precio; acc[itemId] = (acc[itemId] || 0) + totalVentaItem; return acc; }, {});
        if(Object.keys(ventasPorItem).length > 0) { 
            const maxVendidoId = Object.keys(ventasPorItem).reduce((a, b) => ventasPorItem[a] > ventasPorItem[b] ? a : b); 
            const [tipo, id] = maxVendidoId.split('-'); 
            if (tipo === 'P') { 
                const producto = this.findById(this.productos, id); 
                if(producto) productoEstrella = producto.nombre; 
            } else { 
                const cuenta = this.findById(this.planDeCuentas, id);
                if(cuenta) productoEstrella = cuenta.nombre; 
            } 
        } 
    }
    const kpiHTML = `<div class="flex flex-wrap justify-center gap-4 mb-4">
        <div class="conta-card kpi-dashboard-card w-64 text-center"><span class="text-xs text-[var(--color-text-secondary)] flex items-center justify-center"><i class="fa-solid fa-calendar-day fa-fw me-2"></i> Ventas Netas del Mes</span><p class="font-bold text-xl conta-text-primary mt-1">${this.formatCurrency(ventasNetasDelMes)}</p></div>
        <div class="conta-card kpi-dashboard-card w-64 text-center"><span class="text-xs text-[var(--color-text-secondary)] flex items-center justify-center"><i class="fa-solid fa-receipt fa-fw me-2"></i> Ticket Promedio (Ventas)</span><p class="font-bold text-xl conta-text-success mt-1">${this.formatCurrency(ticketPromedio)}</p></div>
        <div class="conta-card kpi-dashboard-card w-64 text-center"><span class="text-xs text-[var(--color-text-secondary)] flex items-center justify-center"><i class="fa-solid fa-star fa-fw me-2"></i> Producto/Servicio Estrella</span><p class="font-bold text-xl conta-text-accent mt-1 truncate">${productoEstrella}</p></div>
    </div>`;
    
    const filterFormHTML = `<div class="conta-card p-3 mb-4">
        <form onsubmit="event.preventDefault(); ContaApp.filtrarLista('ventas');" class="flex flex-wrap items-end gap-3">
            <div><label class="text-xs font-semibold">Buscar por Cliente o #</label><input type="search" id="ventas-search" class="conta-input md:w-72" value="${filters.search || ''}"></div>
            <div><label class="text-xs font-semibold">Desde</label><input type="date" id="ventas-start-date" class="conta-input" value="${filters.startDate || ''}"></div>
            <div><label class="text-xs font-semibold">Hasta</label><input type="date" id="ventas-end-date" class="conta-input" value="${filters.endDate || ''}"></div>
            <button type="submit" class="conta-btn">Filtrar</button>
            <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.abrirModalFiltrosAvanzadosVentas()">Filtros Avanzados</button>
        </form>
    </div>`;
    
    const { currentPage, perPage } = this.getPaginationState('ventas');
    const { column, order } = this.ventasSortState;

    const { data: itemsParaMostrar, totalItems } = await this.repository.getPaginatedTransactions({
        page: currentPage, perPage: perPage,
        filters: {
            tipos: ['venta', 'nota_credito'],
            ...filters 
        },
        sort: { column, order }
    });
    
    let resultsHTML;
    if (totalItems === 0) {
        resultsHTML = `<div class="conta-card text-center p-8 text-[var(--color-text-secondary)]"><i class="fa-solid fa-filter-circle-xmark fa-3x mb-4 opacity-50"></i><h3 class="font-bold text-lg">Sin Resultados</h3><p>No se encontraron transacciones que coincidan con los filtros aplicados.</p></div>`;
    } else {
        const generarEncabezado = (nombreColumna, clave) => {
            let icono = this.ventasSortState.column === clave ? (this.ventasSortState.order === 'asc' ? '<i class="fa-solid fa-arrow-up ml-2"></i>' : '<i class="fa-solid fa-arrow-down ml-2"></i>') : '';
            return `<th class="conta-table-th cursor-pointer" onclick="ContaApp.ordenarVentasPor('${clave}')">${nombreColumna} ${icono}</th>`;
        };

        let tableRowsHTML = '';
        itemsParaMostrar.forEach(t => {
            const cliente = this.findById(this.contactos, t.contactoId);
            let estadoClass = '', estadoTexto = t.estado || 'Pendiente', totalDisplay, numeroDisplay, accionesHTML, rowOnclick;

            // --- INICIO DE LA CORRECCIÓN ---
            // Se han añadido comillas simples ('') alrededor de ${t.id} en todas las llamadas onclick.
            if (t.tipo === 'venta') {
                switch(t.estado) {
                    case 'Pagada': estadoClass = 'tag-success'; break;
                    case 'Pendiente': estadoClass = 'tag-warning'; break;
                    case 'Parcial': estadoClass = 'tag-accent'; break;
                    case 'Anulada': estadoClass = 'tag-anulada'; break;
                    default: estadoClass = 'tag-neutral';
                }
                totalDisplay = this.formatCurrency(t.total);
                numeroDisplay = t.numeroFactura || t.id;
                accionesHTML = `<button class="conta-btn-icon" title="Ver Factura" onclick="event.stopPropagation(); ContaApp.abrirVistaPreviaFactura('${t.id}')"><i class="fa-solid fa-file-lines"></i></button>`;
                if (t.estado !== 'Anulada') {
                    accionesHTML += `<button class="conta-btn-icon edit" title="Editar Venta" onclick="event.stopPropagation(); ContaApp.abrirModalEditarVenta('${t.id}')"><i class="fa-solid fa-pencil"></i></button>`;
                }
                accionesHTML += `<button class="conta-btn-icon" title="Duplicar Venta" onclick="event.stopPropagation(); ContaApp.abrirModalVenta(null, null, '${t.id}')"><i class="fa-solid fa-copy"></i></button>`;
                if (t.estado !== 'Anulada' && this.hasPermission('anular_transaccion')) {
                    accionesHTML += `<button class="conta-btn-icon delete" title="Anular Factura" onclick="event.stopPropagation(); ContaApp.anularVenta('${t.id}')"><i class="fa-solid fa-ban"></i></button>`;
                }
                rowOnclick = `ContaApp.abrirVistaPreviaFactura('${t.id}')`;
            } else {
                estadoClass = 'tag-nota-credito';
                estadoTexto = 'Nota de Crédito';
                totalDisplay = `-${this.formatCurrency(t.total)}`;
                numeroDisplay = t.numeroNota || t.id;
                accionesHTML = `<button class="conta-btn-icon" title="Ver Nota de Crédito" onclick="event.stopPropagation(); ContaApp.abrirVistaPreviaNotaCredito('${t.id}')"><i class="fa-solid fa-file-lines"></i></button>`;
                rowOnclick = `ContaApp.abrirVistaPreviaNotaCredito('${t.id}')`;
            }
            // --- FIN DE LA CORRECCIÓN ---
            
            tableRowsHTML += `<tr class="cursor-pointer" onclick="${rowOnclick}">
                <td class="conta-table-td font-mono">${numeroDisplay}</td>
                <td class="conta-table-td">${t.fecha}</td>
                <td class="conta-table-td">${cliente?.nombre || 'N/A'}</td>
                <td class="conta-table-td text-right font-mono ${t.tipo === 'nota_credito' ? 'conta-text-danger' : ''}">${totalDisplay}</td>
                <td class="conta-table-td"><span class="tag ${estadoClass}">${estadoTexto}</span></td>
                <td class="conta-table-td text-center">${accionesHTML}</td>
            </tr>`;
        });

        resultsHTML = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra"><thead><tr>
            ${generarEncabezado('Documento #', 'numeroFactura')}
            ${generarEncabezado('Fecha', 'fecha')}
            ${generarEncabezado('Cliente', 'cliente')}
            ${generarEncabezado('Total', 'total')}
            ${generarEncabezado('Estado', 'estado')}
            <th class="conta-table-th text-center">Acciones</th>
        </tr></thead><tbody>${tableRowsHTML}</tbody></table></div>`;

        this.renderPaginationControls('ventas', totalItems);
    }
    
    document.getElementById('ventas-contenido').innerHTML = kpiHTML + filterFormHTML + resultsHTML;
},
abrirModalEditarVenta(ventaId) {
    const venta = this.findById(this.transacciones, ventaId);
    if (!venta) {
        this.showToast('Error: Venta no encontrada.', 'error');
        return;
    }
    if (venta.montoPagado > 0 || venta.estado === 'Anulada') {
        this.showToast('No se puede editar una venta pagada o anulada.', 'error');
        return;
    }

    this.abrirModalVenta(null, null, null, null, ventaId); // El nuevo quinto parámetro es el ID de la venta a editar
},
    renderVentas_TabCotizaciones(filters = {}) {
        document.getElementById('page-actions-header').innerHTML = `<button class="conta-btn" onclick="ContaApp.abrirModalCotizacion()">+ Nueva Cotización</button>`;

        const cotizaciones = this.transacciones.filter(t => t.tipo === 'cotizacion');

        let contentHTML;
        if (cotizaciones.length === 0) {
            contentHTML = this.generarEstadoVacioHTML(
                'fa-file-alt',
                'Aún no tienes cotizaciones',
                'Crea tu primera cotización para un cliente. Luego podrás convertirla en una factura fácilmente.',
                '+ Crear Primera Cotización',
                "ContaApp.abrirModalCotizacion()"
            );
        } else {
            const { currentPage, perPage } = this.getPaginationState('ventas-cotizaciones');
            const startIndex = (currentPage - 1) * perPage;
            const endIndex = startIndex + perPage;
            
            cotizaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            const itemsParaMostrar = cotizaciones.slice(startIndex, endIndex);

            let tableHTML = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra"><thead><tr>
                <th class="conta-table-th">#</th>
                <th class="conta-table-th">Fecha</th>
                <th class="conta-table-th">Cliente</th>
                <th class="conta-table-th text-right">Total</th>
                <th class="conta-table-th">Estado</th>
                <th class="conta-table-th text-center">Acciones</th>
            </tr></thead><tbody>`;

            itemsParaMostrar.forEach(c => {
                const cliente = this.findById(this.contactos, c.contactoId);
                let estadoClass = '';
                switch (c.estado) {
                    case 'Facturada': estadoClass = 'tag-facturada'; break;
                    case 'Aceptada': estadoClass = 'tag-success'; break;
                    case 'Rechazada': estadoClass = 'tag-danger'; break;
                    default: estadoClass = 'tag-neutral';
                }

                tableHTML += `<tr>
                    <td class="conta-table-td font-mono">${c.numeroCotizacion || c.id}</td>
                    <td class="conta-table-td">${c.fecha}</td>
                    <td class="conta-table-td">${cliente?.nombre || 'N/A'}</td>
                    <td class="conta-table-td text-right font-mono">${this.formatCurrency(c.total)}</td>
                    <td class="conta-table-td"><span class="tag ${estadoClass}">${c.estado}</span></td>
                    <td class="conta-table-td text-center">
                        ${c.estado !== 'Facturada' ? `<button class="conta-btn conta-btn-small" onclick="ContaApp.convertirCotizacionAVenta(${c.id})">Convertir en Venta</button>` : ''}
                    </td>
                </tr>`;
            });
            tableHTML += `</tbody></table></div>`;
            contentHTML = tableHTML;
            
            this.renderPaginationControls('ventas-cotizaciones', cotizaciones.length);
        }
        document.getElementById('ventas-contenido').innerHTML = contentHTML;
    },
    renderVentas_TabRecurrentes() {
        document.getElementById('page-actions-header').innerHTML = `<button class="conta-btn conta-btn-accent" onclick="ContaApp.generarVentasRecurrentesDelMes()"><i class="fa-solid fa-magic-sparkles me-2"></i>Generar Ventas del Mes</button>`;
        
        const plantillasVenta = this.recurrentes.filter(r => r.tipo === 'venta');

        let html;
        if (plantillasVenta.length === 0) {
            html = this.generarEstadoVacioHTML(
                'fa-repeat',
                'No tienes ventas recurrentes configuradas',
                'Crea una nueva venta y marca la casilla "Venta Recurrente" para añadir tu primera plantilla aquí.',
                '+ Crear Primera Venta',
                "ContaApp.abrirModalVenta()"
            );
        } else {
            html = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra"><thead><tr>
                <th class="conta-table-th">Cliente</th>
                <th class="conta-table-th">Próxima Generación</th>
                <th class="conta-table-th text-center">Acciones</th>
            </tr></thead><tbody>`;
            
            plantillasVenta.forEach(p => {
                const cliente = this.findById(this.contactos, p.contactoId);
                const hoy = new Date();
                const mesActual = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
                const proximaFecha = p.ultimoGenerado === mesActual ? 'Próximo Mes' : 'Este Mes';
                html += `<tr>
                    <td class="conta-table-td">${cliente?.nombre || 'N/A'}</td>
                    <td class="conta-table-td">${proximaFecha}</td>
                    <td class="conta-table-td text-center">
                        <button class="conta-btn-icon delete" title="Eliminar Plantilla" onclick="ContaApp.eliminarPlantillaRecurrente(${p.id})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;
            });
            html += `</tbody></table></div>`;
        }
        document.getElementById('ventas-contenido').innerHTML = html;
    
    },
        generarVentasRecurrentesDelMes() {
        const hoy = new Date();
        const mesActual = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
        let ventasGeneradas = 0;

        this.recurrentes.filter(p => p.tipo === 'venta').forEach(plantilla => {
            if (plantilla.ultimoGenerado !== mesActual) {
                const fechaVenta = mesActual + '-01';
                
                const subtotal = plantilla.items.reduce((sum, i) => sum + (i.cantidad * i.precio), 0);
                const costoTotal = plantilla.items.filter(i => i.itemType === 'producto').reduce((sum, i) => sum + (i.costo * i.cantidad), 0);
                const subtotalConDescuento = subtotal - (plantilla.descuento || 0);
                const impuesto = subtotalConDescuento * (this.empresa.taxRate / 100);
                const total = subtotalConDescuento + impuesto;

                const nuevaVenta = {
                    id: this.idCounter++,
                    numeroFactura: this.generarSiguienteNumeroDeFactura(),
                    tipo: 'venta', fecha: fechaVenta, contactoId: plantilla.contactoId, items: plantilla.items,
                    subtotal, descuento: (plantilla.descuento || 0), impuesto, total,
                    estado: 'Pendiente', montoPagado: 0
                };
                this.registrarAuditoria('CREAR_VENTA', `Creó la factura #${nuevaVenta.numeroFactura} por ${this.formatCurrency(nuevaVenta.total)}`, nuevaVenta.id, 'venta');
                const cuentaDebeId = 120; // Siempre a crédito
                const asientoDescripcion = `Venta recurrente a ${this.findById(this.contactos, plantilla.contactoId).nombre} #${nuevaVenta.numeroFactura}`;
                const cuentaIvaDebitoId = 240, cuentaCostoVentasId = 501, cuentaInventarioId = 130, cuentaDescuentoId = 420;
                const movimientos = [ { cuentaId: cuentaDebeId, debe: total, haber: 0 }, { cuentaId: cuentaIvaDebitoId, debe: 0, haber: impuesto } ];
                if (plantilla.descuento > 0) movimientos.push({ cuentaId: cuentaDescuentoId, debe: plantilla.descuento, haber: 0 });

                plantilla.items.forEach(item => {
                    const montoItem = item.cantidad * item.precio;
                    if (item.itemType === 'producto') {
                        const producto = this.findById(this.productos, item.productoId);
                        if(producto) producto.stock -= item.cantidad; // Reducir stock
                        movimientos.push({ cuentaId: this.planDeCuentas.find(c => c.codigo === '401.1').id, debe: 0, haber: montoItem });
                    } else {
                        movimientos.push({ cuentaId: item.cuentaId, debe: 0, haber: montoItem });
                    }
                });

                this.transacciones.push(nuevaVenta);
                this.crearAsiento(fechaVenta, asientoDescripcion, movimientos, nuevaVenta.id);
                if (costoTotal > 0) {
                    this.crearAsiento(fechaVenta, `Costo de venta #${nuevaVenta.numeroFactura}`, [
                        { cuentaId: cuentaCostoVentasId, debe: costoTotal, haber: 0 },
                        { cuentaId: cuentaInventarioId, debe: 0, haber: costoTotal }
                    ], nuevaVenta.id);
                }
                
                plantilla.ultimoGenerado = mesActual;
                ventasGeneradas++;
            }
        });

        if (ventasGeneradas > 0) {
            this.saveAll();
            this.showToast(`${ventasGeneradas} venta(s) recurrente(s) generada(s) para este mes.`, 'success');
            this.irModulo('ventas', { submodulo: 'historial' });
        } else {
            this.showToast('Todas las ventas recurrentes para este mes ya han sido generadas.', 'info');
        }
    },
    togglePagoContado(selectElement) {
        document.getElementById('venta-pago-contado-div').style.display = selectElement.value === 'contado' ? 'block' : 'none';
    },
                                abrirModalVenta(clienteIdPreseleccionado = null, anticipoIdPreseleccionado = null, ventaIdDuplicar = null, cotizacionIdDuplicar = null, ventaIdEditar = null) {
    const isEditing = ventaIdEditar !== null;
    const isDuplicating = ventaIdDuplicar !== null || cotizacionIdDuplicar !== null;
    
    const transaccionOriginal = isEditing 
        ? this.findById(this.transacciones, ventaIdEditar) 
        : (ventaIdDuplicar 
            ? this.findById(this.transacciones, ventaIdDuplicar) 
            : (cotizacionIdDuplicar ? this.findById(this.transacciones, cotizacionIdDuplicar) : null));

    let modalTitle = 'Nueva Venta';
    if (isEditing) modalTitle = 'Editar Venta';
    if (isDuplicating && !cotizacionIdDuplicar) modalTitle = 'Duplicar Venta';
    if (cotizacionIdDuplicar) modalTitle = `Venta desde Cotización #${transaccionOriginal.numeroCotizacion || transaccionOriginal.id}`;

    const numeroFactura = isEditing ? transaccionOriginal.numeroFactura : this.generarSiguienteNumeroDeFactura();
    const fecha = isDuplicating ? this.getTodayDate() : (transaccionOriginal?.fecha || this.getTodayDate());

    const cuentasBancoOptions = this.planDeCuentas.filter(c => c.tipo === 'DETALLE' && c.parentId === 110).map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    
    this.isFormDirty = false;
    const modalHTML = `
        <h3 class="conta-title mb-4">${modalTitle}</h3>
        <form onsubmit="ContaApp.guardarVenta(event, ${anticipoIdPreseleccionado})" oninput="ContaApp.isFormDirty = true;" class="modal-form">
            ${isEditing ? `<input type="hidden" id="venta-id-edit" value="${ventaIdEditar}">` : ''}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label>Cliente</label>
                    <div class="flex items-center gap-2">
                        <input list="clientes-datalist" id="venta-cliente-input" class="w-full conta-input" required placeholder="Escribe para buscar...">
                        <datalist id="clientes-datalist">${this.contactos.filter(c => c.tipo === 'cliente').map(c => `<option value="${c.nombre}" data-id="${c.id}"></option>`).join('')}</datalist>
                        <input type="hidden" id="venta-cliente-id">
                        <button type="button" class="conta-btn conta-btn-small" onclick="ContaApp.abrirSubModalNuevoContacto('cliente', 'venta-cliente-input')">+</button>
                    </div>
                </div>
                <div>
                    <label>Fecha</label>
                    <input type="date" id="venta-fecha" value="${fecha}" class="w-full conta-input" required>
                </div>
                <div>
                    <label>Factura #</label>
                    <input type="text" id="venta-numero-factura" value="${numeroFactura}" class="w-full conta-input ${isEditing ? 'bg-gray-100 dark:bg-gray-700' : ''}" ${isEditing ? 'readonly' : ''}>
                </div>
            </div>
            
            <div class="conta-card p-2 md:p-4">
                <h4 class="font-bold mb-2 text-sm">Ítems de la Venta</h4>
                <div id="venta-items-container" class="space-y-3"></div>
                <button type="button" class="conta-btn conta-btn-small conta-btn-accent mt-2" onclick="ContaApp.agregarItemVenta()">+ Agregar Ítem</button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-start">
                <div>
                    <label>Términos de Pago</label>
                    <select id="venta-terminos-pago" class="w-full conta-input" onchange="this.value === 'contado' ? document.getElementById('venta-pago-contado-div').style.display = 'block' : document.getElementById('venta-pago-contado-div').style.display = 'none'">
                        <option value="credito_30">Crédito (30 días)</option>
                        <option value="credito_15">Crédito (15 días)</option>
                        <option value="contado">De Contado</option>
                    </select>
                    <div id="venta-pago-contado-div" style="display: none;" class="mt-2">
                        <label>Depositar en</label>
                        <select id="venta-pago-cuenta-banco" class="w-full conta-input">${cuentasBancoOptions}</select>
                    </div>
                </div>
                <div class="space-y-2 text-right">
                    <div class="flex justify-end items-center gap-2 mb-2">
                        <label for="venta-recurrente-check" class="text-sm font-medium">Venta Recurrente</label>
                        <input type="checkbox" id="venta-recurrente-check" class="h-4 w-4">
                    </div>
                    <div class="flex justify-between font-semibold"><span class="text-[var(--color-text-secondary)]">Subtotal:</span> <span id="venta-subtotal">${this.formatCurrency(0)}</span></div>
                    <div class="flex justify-between items-center font-semibold">
                        <span class="text-[var(--color-text-secondary)]">Descuento:</span>
                        <div class="flex items-center gap-1"><input type="number" step="0.01" id="venta-descuento-monto" class="conta-input w-24 text-right" oninput="ContaApp.actualizarTotalesVenta('monto')"><input type="number" step="0.01" id="venta-descuento-porc" class="conta-input w-20 text-right" oninput="ContaApp.actualizarTotalesVenta('porc')"></div>
                    </div>
                    <div class="flex justify-between font-semibold"><span class="text-[var(--color-text-secondary)]">Impuesto (${this.empresa.taxRate}%):</span> <span id="venta-impuesto">${this.formatCurrency(0)}</span></div>
                    <div class="flex justify-between font-bold text-xl"><span class="text-[var(--color-text-primary)]">Total:</span> <span id="venta-total">${this.formatCurrency(0)}</span></div>
                </div>
            </div>
            <div class="flex justify-end gap-2 mt-8"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button type="submit" class="conta-btn">${isEditing ? 'Guardar Cambios' : 'Guardar'}</button></div>
        </form>
    `;
    this.showModal(modalHTML, '5xl');
    this.setupDatalistListener('venta-cliente-input', 'venta-cliente-id', 'clientes-datalist');
    
    const itemsContainer = document.getElementById('venta-items-container');
    itemsContainer.innerHTML = '';

    if (this.tempItemsParaVenta && this.tempItemsParaVenta.length > 0) {
        this.tempItemsParaVenta.forEach(item => { this.agregarItemVenta(); /* ...lógica para rellenar... */ });
        this.tempItemsParaVenta = [];
    } else if (transaccionOriginal) {
        // ... (lógica para rellenar desde una transacción existente sin cambios)
    } else {
         this.agregarItemVenta();
    }

    this.actualizarTotalesVenta('monto');
},
        convertirCotizacionAVenta(cotizacionId) {
        const cotizacion = this.findById(this.transacciones, cotizacionId);
        if (!cotizacion) {
            this.showToast('Error: No se encontró la cotización.', 'error');
            return;
        }
        // Marcar la cotización como facturada para que no se pueda volver a usar
        cotizacion.estado = 'Facturada';
        this.saveAll();
        
        // Abrir el modal de venta, pasando el ID de la cotización para duplicar sus datos
        this.abrirModalVenta(null, null, null, cotizacionId);
    },

    abrirModalCotizacion() {
        const proximoNumeroCotizacion = this.generarSiguienteNumeroDeCotizacion();

        const modalHTML = `
            <h3 class="conta-title mb-4">Nueva Cotización</h3>
            <form onsubmit="ContaApp.guardarCotizacion(event)" class="modal-form">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label>Cliente</label>
                        <div class="flex items-center gap-2">
                            <input list="clientes-datalist-cot" id="cot-cliente-input" class="w-full conta-input" required placeholder="Escribe para buscar...">
                            <datalist id="clientes-datalist-cot">${this.contactos.filter(c => c.tipo === 'cliente').map(c => `<option value="${c.nombre}" data-id="${c.id}"></option>`).join('')}</datalist>
                            <input type="hidden" id="cot-cliente-id">
                            <button type="button" class="conta-btn conta-btn-small" onclick="ContaApp.abrirSubModalNuevoContacto('cliente', 'cot-cliente-input')">+</button>
                        </div>
                    </div>
                    <div>
                        <label>Fecha</label>
                        <input type="date" id="cot-fecha" value="${this.getTodayDate()}" class="w-full conta-input" required>
                    </div>
                    <div>
                        <label>Cotización #</label>
                        <input type="text" id="cot-numero" value="${proximoNumeroCotizacion}" class="w-full conta-input bg-gray-100 dark:bg-gray-700" readonly>
                    </div>
                </div>
                
                <div class="conta-card p-2 md:p-4">
                    <h4 class="font-bold mb-2 text-sm">Ítems de la Cotización</h4>
                    <div id="venta-items-container" class="space-y-3"></div>
                    <button type="button" class="conta-btn conta-btn-small conta-btn-accent mt-2" onclick="ContaApp.agregarItemVenta()">+ Agregar Ítem</button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-start">
                     <div>
                        <label>Validez de la Oferta</label>
                        <input type="text" id="cot-validez" class="w-full conta-input" value="15 días">
                    </div>
                    <div class="space-y-2 text-right">
                        <div class="flex justify-between font-semibold"><span class="text-[var(--color-text-secondary)]">Subtotal:</span> <span id="venta-subtotal">${this.formatCurrency(0)}</span></div>
                        <div class="flex justify-between items-center font-semibold">
                            <span class="text-[var(--color-text-secondary)]">Descuento:</span>
                            <div class="flex items-center gap-1"><input type="number" step="0.01" id="venta-descuento-monto" class="conta-input w-24 text-right" oninput="ContaApp.actualizarTotalesVenta('monto')"><input type="number" step="0.01" id="venta-descuento-porc" class="conta-input w-20 text-right" oninput="ContaApp.actualizarTotalesVenta('porc')"></div>
                        </div>
                        <div class="flex justify-between font-semibold"><span class="text-[var(--color-text-secondary)]">Impuesto (${this.empresa.taxRate}%):</span> <span id="venta-impuesto">${this.formatCurrency(0)}</span></div>
                        <div class="flex justify-between font-bold text-xl"><span class="text-[var(--color-text-primary)]">Total:</span> <span id="venta-total">${this.formatCurrency(0)}</span></div>
                    </div>
                </div>
                <div class="flex justify-end gap-2 mt-8"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button type="submit" class="conta-btn">Guardar Cotización</button></div>
            </form>
        `;
        this.showModal(modalHTML, '5xl');
        this.setupDatalistListener('cot-cliente-input', 'cot-cliente-id', 'clientes-datalist-cot');
        this.agregarItemVenta();
    },

    guardarCotizacion(e) {
        e.preventDefault();
        const clienteId = parseInt(document.getElementById('cot-cliente-id').value);
        if (!clienteId) { this.showToast('Por favor, selecciona un cliente válido.', 'error'); return; }

        const items = [];
        let subtotal = 0;
        document.querySelectorAll('.venta-item-row').forEach(row => {
            const tipo = row.querySelector('.venta-item-type').value;
            const itemId = parseInt(row.querySelector('.venta-item-id').value);
            const cantidad = parseInt(row.querySelector('.venta-item-cantidad').value);
            const precio = parseFloat(row.querySelector('.venta-item-precio').value);
            const descripcion = row.querySelector('.venta-item-descripcion')?.value || '';
            
            if (tipo === 'producto') {
                const producto = this.findById(this.productos, itemId);
                if (producto) items.push({ itemType: 'producto', productoId: itemId, cantidad, precio, costo: producto.costo });
            } else {
                items.push({ itemType: 'servicio', cuentaId: itemId, cantidad, precio, descripcion });
            }
            subtotal += cantidad * precio;
        });

        if (items.length === 0) { this.showToast('Debes agregar al menos un ítem.', 'error'); return; }

        const descuento = parseFloat(document.getElementById('venta-descuento-monto').dataset.montoReal) || 0;
        const subtotalConDescuento = subtotal - descuento;
        const impuesto = subtotalConDescuento * (this.empresa.taxRate / 100);
        const total = subtotalConDescuento + impuesto;

        const nuevaCotizacion = {
            id: this.idCounter++,
            numeroCotizacion: document.getElementById('cot-numero').value,
            tipo: 'cotizacion',
            fecha: document.getElementById('cot-fecha').value,
            contactoId: clienteId,
            validez: document.getElementById('cot-validez').value,
            items,
            subtotal,
            descuento,
            impuesto,
            total,
            estado: 'Pendiente' // Estados: Pendiente, Aceptada, Rechazada, Facturada
        };

        // IMPORTANTE: Las cotizaciones NO generan asientos contables.
        this.transacciones.push(nuevaCotizacion);
        this.saveAll();
        this.closeModal();
        this.irModulo('ventas', { submodulo: 'cotizaciones' });
        this.showToast('Cotización creada con éxito.', 'success');
    },

    generarSiguienteNumeroDeCotizacion() {
        const hoy = new Date();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const ano = String(hoy.getFullYear()).slice(-2);
        const periodo = `${mes}${ano}`; // ej: "0725"

        const cotizacionesDelPeriodo = this.transacciones.filter(t => 
            t.tipo === 'cotizacion' && 
            t.numeroCotizacion && 
            t.numeroCotizacion.startsWith(`COT-${periodo}`)
        );

        let maxNumero = 0;
        cotizacionesDelPeriodo.forEach(c => {
            const numero = parseInt(c.numeroCotizacion.split('-')[2]);
            if (numero > maxNumero) maxNumero = numero;
        });

        const siguienteNumero = String(maxNumero + 1).padStart(3, '0');
        return `COT-${periodo}-${siguienteNumero}`;
    },
    abrirModalVentaDesdeAnticipo(anticipoId) {
        const anticipo = this.findById(this.transacciones, anticipoId);
        if(!anticipo) return;
        this.irModulo('ventas', { action: 'new', clienteId: anticipo.contactoId, anticipoId: anticipo.id });
    },
    // =====================================================================
    // FUNCIÓN CORREGIDA (AÑADIDA)
    // =====================================================================
    agregarItemVenta() {
        const container = document.getElementById('venta-items-container');
        
        // CORRECCIÓN: Se añade una opción vacía como placeholder al inicio del selector
        const centrosDeCostoOptions = (this.empresa.centrosDeCosto || [])
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .map(cc => `<option value="${cc.id}">${cc.nombre}</option>`)
            .join('');

        const itemHTML = `
            <div class="grid grid-cols-12 gap-2 items-center dynamic-row venta-item-row">
                <select class="col-span-2 conta-input venta-item-type" onchange="ContaApp.cambiarTipoItemVenta(this)">
                    <option value="producto">Producto</option>
                    <option value="servicio">Servicio</option>
                </select>
                <div class="col-span-3 venta-item-selector-container"></div>
                
                <select class="col-span-3 conta-input venta-item-centro-costo" required>
                    <option value="" disabled selected>-- Centro de Costo --</option>
                    ${centrosDeCostoOptions}
                </select>

                <input type="text" class="col-span-1 conta-input bg-gray-100 dark:bg-gray-700 text-center venta-item-unidad" readonly placeholder="Unidad">
                <input type="number" value="1" min="1" class="col-span-1 conta-input text-right venta-item-cantidad" oninput="ContaApp.actualizarTotalesVenta()">
                <input type="number" step="0.01" class="col-span-1 conta-input text-right venta-item-precio" oninput="ContaApp.actualizarTotalesVenta()">
                <button type="button" class="col-span-1 conta-btn-icon delete" onclick="this.closest('.venta-item-row').remove(); ContaApp.actualizarTotalesVenta();">🗑️</button>
            </div>`;
            
        container.insertAdjacentHTML('beforeend', itemHTML);
        this.cambiarTipoItemVenta(container.lastChild.querySelector('.venta-item-type'));
    },
        cambiarTipoItemVenta(selectElement) {
        const row = selectElement.closest('.venta-item-row');
        const container = row.querySelector('.venta-item-selector-container');
        const tipo = selectElement.value;
        let optionsHTML = '';
        let isPriceEditable = false;

        if (tipo === 'producto') {
            optionsHTML = this.productos
                .filter(p => p.tipo === 'producto' && p.cuentaInventarioId !== 13002)
                .map(p => `<option value="${p.id}" data-precio="${p.precio}">${p.nombre}</option>`)
                .join('');
            container.innerHTML = `<select class="w-full p-2 venta-item-id" onchange="ContaApp.actualizarTotalesVenta()">${optionsHTML}</select>`;
        } else {
            optionsHTML = this.planDeCuentas.filter(c => c.parentId === 420 && c.tipo === 'DETALLE').map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
            container.innerHTML = `<div class="flex items-center gap-1">
                <select class="w-2/3 p-2 venta-item-id">${optionsHTML}</select>
                <input type="text" class="w-1/3 p-2 venta-item-descripcion" placeholder="Desc.">
            </div>`;
            isPriceEditable = true;
        }
        row.querySelector('.venta-item-precio').readOnly = !isPriceEditable;
        this.actualizarTotalesVenta();
    },
        actualizarTotalesVenta(descuentoDesde = null) {
    let subtotal = 0;
    document.querySelectorAll('.venta-item-row').forEach(row => {
        const tipo = row.querySelector('.venta-item-type').value;
        const idSelect = row.querySelector('.venta-item-id');
        const cantidadInput = row.querySelector('.venta-item-cantidad');
        const precioInput = row.querySelector('.venta-item-precio');
        const unidadInput = row.querySelector('.venta-item-unidad');
        
        if (tipo === 'producto') {
            const selectedOption = idSelect.options[idSelect.selectedIndex];
            const precioSugerido = parseFloat(selectedOption?.dataset.precio) || 0;
            if (!precioInput.value) {
                precioInput.value = precioSugerido.toFixed(2);
            }
            const productoId = parseInt(idSelect.value);
            const producto = this.findById(this.productos, productoId);
            if (producto) {
                const unidad = this.findById(this.unidadesMedida, producto.unidadMedidaId);
                unidadInput.value = unidad ? unidad.nombre : 'N/A';
            }
        } else {
            unidadInput.value = '';
        }
        
        precioInput.readOnly = false;

        const cantidad = parseInt(cantidadInput.value) || 0;
        const precio = parseFloat(precioInput.value) || 0;
        subtotal += cantidad * precio;
    });

    const descuentoMontoInput = document.getElementById('venta-descuento-monto');
    const descuentoPorcInput = document.getElementById('venta-descuento-porc');
    let descuento = 0;

    if (descuentoDesde === 'monto') {
        descuento = parseFloat(descuentoMontoInput.value) || 0;
        if (subtotal > 0) {
            descuentoPorcInput.value = ((descuento / subtotal) * 100).toFixed(2);
        } else {
            descuentoPorcInput.value = '';
        }
    } else if (descuentoDesde === 'porc') {
        const porc = parseFloat(descuentoPorcInput.value) || 0;
        descuento = subtotal * (porc / 100);
        descuentoMontoInput.value = descuento.toFixed(2);
    } else {
         descuento = parseFloat(descuentoMontoInput.value) || 0;
    }

    const subtotalConDescuento = subtotal - descuento;
    const impuesto = subtotalConDescuento * (this.empresa.taxRate / 100);
    const total = subtotalConDescuento + impuesto;

    document.getElementById('venta-subtotal').textContent = this.formatCurrency(subtotal);
    descuentoMontoInput.dataset.montoReal = descuento; 
    document.getElementById('venta-impuesto').textContent = this.formatCurrency(impuesto);
    document.getElementById('venta-total').textContent = this.formatCurrency(total);
},
    async guardarVenta(e, anticipoIdAplicado = null) {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    this.toggleButtonLoading(submitButton, true);

    const ventaIdEdit = document.getElementById('venta-id-edit')?.value;
    const isEditing = !!ventaIdEdit;

    try {
        const clienteId = document.getElementById('venta-cliente-id').value;
        if (!clienteId) throw new Error('Por favor, selecciona un cliente válido de la lista.');
        
        const fecha = document.getElementById('venta-fecha').value;
        const terminosPago = document.getElementById('venta-terminos-pago').value;
        const items = [];
        let subtotal = 0;

        for (const row of document.querySelectorAll('.venta-item-row')) {
            const tipo = row.querySelector('.venta-item-type').value;
            // --- INICIO DE LA CORRECCIÓN ---
            // Se ajusta el querySelector para encontrar el ID dentro de su contenedor.
            const itemIdSelect = row.querySelector('.venta-item-selector-container .venta-item-id');
            if (!itemIdSelect) continue; // Si no se encuentra el selector, se salta la fila.
            const itemId = itemIdSelect.value;
            // --- FIN DE LA CORRECCIÓN ---
            
            const cantidad = parseInt(row.querySelector('.venta-item-cantidad').value);
            const precio = parseFloat(row.querySelector('.venta-item-precio').value);
            const centroDeCostoId = row.querySelector('.venta-item-centro-costo').value;
            if (!centroDeCostoId) {
                throw new Error('Todas las líneas de la venta deben tener un Centro de Costo asignado.');
            }

            const item = { itemType: tipo, cantidad, precio, costo: 0, centroDeCostoId };
            if (tipo === 'producto') {
                const producto = this.findById(this.productos, itemId);
                if (!producto) continue;
                item.productoId = itemId;
                item.costo = producto.costo;
            } else {
                item.cuentaId = itemId;
                item.descripcion = row.querySelector('.venta-item-descripcion')?.value || '';
            }
            items.push(item);
            subtotal += cantidad * precio;
        }

        if (items.length === 0) throw new Error('Debes agregar al menos un ítem.');

        const descuento = parseFloat(document.getElementById('venta-descuento-monto').dataset.montoReal) || 0;
        const impuesto = (subtotal - descuento) * (this.empresa.taxRate / 100);
        const total = (subtotal - descuento) + impuesto;
        
        let ventaParaGuardar;
        if (isEditing) {
            ventaParaGuardar = this.findById(this.transacciones, ventaIdEdit);
            // Revertir stock antes de re-calcular
            ventaParaGuardar.items.forEach(item => {
                if (item.itemType === 'producto') {
                    const producto = this.findById(this.productos, item.productoId);
                    if (producto) producto.stock += item.cantidad;
                }
            });
            // Eliminar asientos viejos para recrearlos
            this.asientos = this.asientos.filter(a => a.transaccionId !== ventaParaGuardar.id);
        } else {
            ventaParaGuardar = {
                id: this.generarUUID(),
                numeroFactura: document.getElementById('venta-numero-factura').value,
                tipo: 'venta',
            };
            this.transacciones.push(ventaParaGuardar);
        }

        Object.assign(ventaParaGuardar, {
            fecha, terminosPago, contactoId: clienteId, items, subtotal, descuento, 
            impuesto, total
        });
        
        items.forEach(item => {
            if (item.itemType === 'producto') {
                const producto = this.findById(this.productos, item.productoId);
                if (producto.stock < item.cantidad) throw new Error(`Stock insuficiente para "${producto.nombre}".`);
                producto.stock -= item.cantidad;
            }
        });
        
        const esContado = terminosPago === 'contado';
        const cuentaDebeId = esContado ? parseInt(document.getElementById('venta-pago-cuenta-banco').value) : 120;
        
        if(esContado) {
            ventaParaGuardar.estado = 'Pagada';
            ventaParaGuardar.montoPagado = total;
        } else {
            ventaParaGuardar.estado = 'Pendiente';
            ventaParaGuardar.montoPagado = 0;
        }

        const asientoDescripcion = `Venta a ${this.findById(this.contactos, clienteId).nombre} #${ventaParaGuardar.numeroFactura}`;
        const movimientosVenta = [{ cuentaId: cuentaDebeId, debe: total, haber: 0 }, { cuentaId: 240, debe: 0, haber: impuesto }];
        if (descuento > 0) movimientosVenta.push({ cuentaId: 490, debe: descuento, haber: 0 });
        items.forEach(item => {
            const cuentaIngresoId = item.itemType === 'producto' ? this.findById(this.productos, item.productoId).cuentaIngresoId : item.cuentaId;
            movimientosVenta.push({ cuentaId: cuentaIngresoId, debe: 0, haber: item.cantidad * item.precio, centroDeCostoId: item.centroDeCostoId });
        });
        const asientoVenta = this.crearAsiento(fecha, asientoDescripcion, movimientosVenta, ventaParaGuardar.id);

        if (esContado && asientoVenta) {
            this._registrarMovimientoBancarioPendiente(cuentaDebeId, fecha, `Cobro Factura #${ventaParaGuardar.numeroFactura}`, total, asientoVenta.id);
        }
        
        const costoTotalItems = items.filter(i => i.itemType === 'producto').reduce((sum, i) => sum + (i.costo * i.cantidad), 0);
        if (costoTotalItems > 0) {
            this.crearAsiento(fecha, `Costo de venta #${ventaParaGuardar.numeroFactura}`, [
                { cuentaId: 510, debe: costoTotalItems, haber: 0 },
                { cuentaId: 13004, debe: 0, haber: costoTotalItems } // Asumiendo que los productos terminados salen de esta cuenta
            ], ventaParaGuardar.id);
        }
        
        await this.saveAll();
        
        this.isFormDirty = false;
        this.closeModal();
        this.irModulo('ventas');
        this.showToast(`Venta ${isEditing ? 'actualizada' : 'creada'} con éxito.`, 'success');

    } catch (error) {
        console.error("Error al guardar la venta:", error);
        this.showToast(error.message || 'Ocurrió un error al guardar.', 'error');
        if (isEditing) this.irModulo('ventas');
    } finally {
        this.toggleButtonLoading(submitButton, false);
    }
},
    anularVenta(ventaId) {
    const venta = this.findById(this.transacciones, ventaId);
    if (!venta) {
        this.showToast('Error: Venta no encontrada.', 'error');
        return;
    }

    if (venta.montoPagado > 0) {
        this.showToast('No se puede anular una venta que ya tiene pagos registrados.', 'error');
        return;
    }
    if (venta.estado === 'Anulada') {
        this.showToast('Esta factura ya ha sido anulada.', 'info');
        return;
    }

    this.showConfirm(
        `¿Seguro que deseas anular la Factura #${venta.numeroFactura}? Esta acción revertirá el asiento contable y devolverá los productos al stock. No se puede deshacer.`,
        async () => {
            try {
                venta.items.forEach(item => {
                    if (item.itemType === 'producto') {
                        const producto = this.findById(this.productos, item.productoId);
                        if (producto) {
                            producto.stock = (producto.stock || 0) + item.cantidad;
                        }
                    }
                });

                const asientosOriginales = this.asientos.filter(a => a && a.transaccionId === venta.id);
                
                if (asientosOriginales.length > 0) {
                    asientosOriginales.forEach(asientoOriginal => {
                        if (asientoOriginal && asientoOriginal.movimientos) {
                            const movimientosReversos = asientoOriginal.movimientos.map(mov => {
                                const reverseMov = {
                                    cuentaId: mov.cuentaId,
                                    debe: mov.haber,
                                    haber: mov.debe,
                                };
                                if (mov.centroDeCostoId) {
                                    reverseMov.centroDeCostoId = mov.centroDeCostoId;
                                }
                                return reverseMov;
                            });
                            this.crearAsiento(this.getTodayDate(), `Anulación de Factura #${venta.numeroFactura}`, movimientosReversos);
                        }
                    });
                } else {
                    console.warn(`No se encontraron asientos para la venta #${venta.id} al anular. La anulación continuará sin reverso contable.`);
                }
                
                venta.estado = 'Anulada';
                this.registrarAuditoria('ANULAR_VENTA', `Anuló la factura #${venta.numeroFactura}`, venta.id, 'venta');

                await this.repository.actualizarMultiplesDatos({
                    productos: this.productos,
                    transacciones: this.transacciones,
                    asientos: this.asientos,
                    auditLog: this.auditLog
                });

                this.irModulo('ventas');
                this.showToast('Factura anulada correctamente.', 'success');

            } catch (error) {
                console.error("Error al anular la venta:", error);
                this.showToast(`Error al anular: ${error.message}`, 'error');
            }
        }
    );
},
    abrirModalNotaCredito() {
        const modalHTML = `
            <h3 class="conta-title mb-4">Nueva Nota de Crédito</h3>
            <form onsubmit="ContaApp.guardarNotaCredito(event)" class="modal-form">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label>Cliente</label>
                        <div class="flex items-center gap-2">
                            <input list="clientes-datalist-nc" id="nc-cliente-input" class="w-full conta-input" required placeholder="Escribe para buscar...">
                            <datalist id="clientes-datalist-nc">${this.contactos.filter(c => c.tipo === 'cliente').map(c => `<option value="${c.nombre}" data-id="${c.id}"></option>`).join('')}</datalist>
                            <input type="hidden" id="nc-cliente-id">
                        </div>
                    </div>
                    <div>
                        <label>Fecha</label>
                        <input type="date" id="nc-fecha" value="${this.getTodayDate()}" class="w-full conta-input" required>
                    </div>
                </div>
                 <div>
                    <label>Motivo de la Nota de Crédito</label>
                    <input type="text" id="nc-motivo" class="w-full conta-input" required placeholder="Ej: Devolución de mercancía, ajuste de precio, etc.">
                </div>
                
                <div class="conta-card p-2 md:p-4 mt-4">
                    <h4 class="font-bold mb-2 text-sm">Ítems a Acreditar/Devolver</h4>
                    <div id="nc-items-container" class="space-y-3"></div>
                    <button type="button" class="conta-btn conta-btn-small conta-btn-accent mt-2" onclick="ContaApp.agregarItemVenta('nc')">+ Agregar Ítem</button>
                </div>

                <div class="flex justify-end mt-6">
                    <div class="space-y-2 text-right">
                        <div class="flex justify-between font-semibold"><span class="text-[var(--color-text-secondary)]">Subtotal:</span> <span id="nc-subtotal">${this.formatCurrency(0)}</span></div>
                        <div class="flex justify-between font-semibold"><span class="text-[var(--color-text-secondary)]">Impuesto (${this.empresa.taxRate}%):</span> <span id="nc-impuesto">${this.formatCurrency(0)}</span></div>
                        <div class="flex justify-between font-bold text-xl"><span class="text-[var(--color-text-primary)]">Total Crédito:</span> <span id="nc-total">${this.formatCurrency(0)}</span></div>
                    </div>
                </div>

                <div class="flex justify-end gap-2 mt-8"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button type="submit" class="conta-btn">Guardar Nota de Crédito</button></div>
            </form>
        `;
        this.showModal(modalHTML, '5xl');
        this.setupDatalistListener('nc-cliente-input', 'nc-cliente-id', 'clientes-datalist-nc');
        this.agregarItemVenta('nc'); // Prefijo 'nc' para los IDs
    },

    async guardarNotaCredito(e) {
        e.preventDefault();
        const submitButton = e.target.querySelector('button[type="submit"]');
        this.toggleButtonLoading(submitButton, true);

        try {
            const clienteId = parseInt(document.getElementById('nc-cliente-id').value);
            if (!clienteId) throw new Error('Por favor, selecciona un cliente válido de la lista.');
            
            const fecha = document.getElementById('nc-fecha').value;
            const motivo = document.getElementById('nc-motivo').value;
            const items = [];
            let subtotal = 0;

            document.querySelectorAll('.nc-item-row').forEach(row => {
                const tipo = row.querySelector('.nc-item-type').value;
                const itemId = parseInt(row.querySelector('.nc-item-id').value);
                const cantidad = parseInt(row.querySelector('.nc-item-cantidad').value);
                const precio = parseFloat(row.querySelector('.nc-item-precio').value);
                
                if (tipo === 'producto') {
                    const producto = this.findById(this.productos, itemId);
                    if (producto) {
                        items.push({ itemType: 'producto', productoId: itemId, cantidad, precio, costo: producto.costo });
                        subtotal += cantidad * precio;
                    }
                } else {
                    items.push({ itemType: 'servicio', cuentaId: itemId, cantidad, precio });
                    subtotal += cantidad * precio;
                }
            });

            if (items.length === 0) throw new Error('Debes agregar al menos un ítem.');

            const impuesto = subtotal * (this.empresa.taxRate / 100);
            const total = subtotal + impuesto;

            const nuevaNota = {
                id: this.idCounter++,
                numeroNota: `NC-${this.idCounter}`,
                tipo: 'nota_credito',
                fecha,
                contactoId: clienteId,
                motivo,
                items,
                subtotal,
                impuesto,
                total,
                estado: 'Activa',
                montoAplicado: 0
            };

            items.forEach(item => {
                if (item.itemType === 'producto') {
                    const producto = this.findById(this.productos, item.productoId);
                    if (producto) producto.stock += item.cantidad; // Devolver al stock
                }
            });

            const cuentaDevolucionesId = 420;
            const cuentaIvaDebitoId = 240;
            const cuentaCxcId = 120;

            const movimientos = [
                { cuentaId: cuentaDevolucionesId, debe: subtotal, haber: 0 },
                { cuentaId: cuentaIvaDebitoId, debe: impuesto, haber: 0 },
                { cuentaId: cuentaCxcId, debe: 0, haber: total }
            ];

            this.transacciones.push(nuevaNota);
            this.crearAsiento(fecha, `Nota de Crédito por: ${motivo}`, movimientos, nuevaNota.id);

            this.saveAll();
            this.closeModal();
            this.irModulo('ventas');
            this.showToast('Nota de Crédito creada con éxito.', 'success');

        } catch (error) {
            console.error("Error al guardar la nota de crédito:", error);
            this.showToast(error.message || 'Ocurrió un error al guardar.', 'error');
        } finally {
            this.toggleButtonLoading(submitButton, false);
        }
    },

    abrirVistaPreviaNotaCredito(notaId) {
        const nota = this.findById(this.transacciones, notaId);
        const cliente = this.findById(this.contactos, nota.contactoId);
        const { empresa } = this;

        let itemsHTML = '';
        nota.items.forEach(item => {
            let descripcion = '';
            if (item.itemType === 'producto') {
                descripcion = this.findById(this.productos, item.productoId).nombre;
            } else {
                descripcion = this.findById(this.planDeCuentas, item.cuentaId).nombre;
            }
            itemsHTML += `<tr>
                <td>${descripcion}</td>
                <td class="text-center">${item.cantidad}</td>
                <td class="text-right">${this.formatCurrency(item.precio)}</td>
                <td class="text-right font-bold">${this.formatCurrency(item.cantidad * item.precio)}</td>
            </tr>`;
        });

        const modalHTML = `
            <div class="flex justify-end gap-2 mb-4 no-print">
                <button class="conta-btn conta-btn-small" onclick="window.print()">Imprimir</button>
                <button class="conta-btn conta-btn-small conta-btn-accent" onclick="ContaApp.closeModal()">Cerrar</button>
            </div>
            <div id="invoice-preview-container">
                <div id="invoice-preview-content">
                    <header class="flex justify-between items-start pb-8 mb-8 border-b">
                        <div class="w-2/3"><img src="${empresa.logo || 'images/logo.png'}" alt="Logo" class="h-16 mb-4">...</div>
                        <div class="text-right">
                            <h1 class="text-4xl font-bold text-gray-700 uppercase">NOTA DE CRÉDITO</h1>
                            <div class="invoice-details-box mt-4">
                                <div class="grid grid-cols-2"><strong>N°:</strong><span>${nota.numeroNota || nota.id}</span></div>
                                <div class="grid grid-cols-2"><strong>FECHA:</strong><span>${nota.fecha}</span></div>
                            </div>
                        </div>
                    </header>
                    <section class="mb-10">
                        <div class="invoice-header-bar">Crédito A</div>
                        <div class="pt-4"><h3 class="text-base font-bold text-gray-800">${cliente.nombre}</h3></div>
                    </section>
                    <p class="text-sm mb-4"><strong>Motivo:</strong> ${nota.motivo}</p>
                    <table id="invoice-items-table" class="w-full text-sm">...</table>
                    <div class="flex justify-end mt-8">
                        <table class="invoice-totals-table">
                            <tbody>
                                <tr><td class="text-gray-600">SUBTOTAL:</td><td class="text-right">${this.formatCurrency(nota.subtotal)}</td></tr>
                                <tr><td class="text-gray-600">IMPUESTO (${empresa.taxRate}%):</td><td class="text-right">${this.formatCurrency(nota.impuesto)}</td></tr>
                                <tr class="total-line"><td class="text-lg">TOTAL CRÉDITO:</td><td class="text-right text-lg">${this.formatCurrency(nota.total)}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        this.showModal(modalHTML, '6xl');
    },
    abrirVistaPreviaFactura(ventaId) {
        const venta = this.findById(this.transacciones, ventaId);
        const cliente = this.findById(this.contactos, venta.contactoId);
        const { empresa } = this;
        
        let terminosTexto = 'Crédito';
        if (venta.terminosPago === 'contado') terminosTexto = 'Pagada al Contado';
        else if (venta.terminosPago === 'credito_15') terminosTexto = 'Crédito (15 días)';
        else if (venta.terminosPago === 'credito_30') terminosTexto = 'Crédito (30 días)';

        let itemsHTML = '';
        venta.items.forEach((item, index) => {
            let descripcion = '';
            if (item.itemType === 'producto') {
                const producto = this.findById(this.productos, item.productoId);
                descripcion = producto.nombre;
            } else {
                const cuenta = this.findById(this.planDeCuentas, item.cuentaId);
                descripcion = `${cuenta.nombre} ${item.descripcion ? `(${item.descripcion})` : ''}`;
            }
            itemsHTML += `<tr>
                <td>${descripcion}</td>
                <td class="text-center">${item.cantidad}</td>
                <td class="text-right">${this.formatCurrency(item.precio)}</td>
                <td class="text-right font-bold">${this.formatCurrency(item.cantidad * item.precio)}</td>
            </tr>`;
        });

        const saldoPendiente = venta.total - (venta.montoPagado || 0);

        const modalHTML = `
            <div class="flex justify-end gap-2 mb-4 no-print">
                <button class="conta-btn conta-btn-small" onclick="ContaApp.generarFacturaPDF(${venta.id})"><i class="fa-solid fa-file-pdf me-2"></i>Generar PDF</button>
                <button class="conta-btn conta-btn-small conta-btn-accent" onclick="ContaApp.closeModal()">Cerrar</button>
            </div>
            <div id="invoice-preview-container">
                <div id="invoice-preview-content">
                    <header class="flex justify-between items-start pb-8 mb-8 border-b">
                        <div class="w-2/3">
                            <img src="${empresa.logo || 'images/logo.png'}" alt="Logo" class="h-16 mb-4">
                            <h2 class="text-lg font-bold text-gray-800">${empresa.nombre}</h2>
                            <p class="text-xs text-gray-500">${empresa.direccion || ''}</p>
                            <p class="text-xs text-gray-500">${empresa.email || ''} | ${empresa.telefono || ''}</p>
                        </div>
                        <div class="text-right">
                            <h1 class="text-4xl font-bold text-gray-700 uppercase">FACTURA</h1>
                            <div class="invoice-details-box mt-4">
                                <div class="grid grid-cols-2"><strong>N° DE FACTURA:</strong><span>${venta.numeroFactura || venta.id}</span></div>
                                <div class="grid grid-cols-2"><strong>FECHA:</strong><span>${venta.fecha}</span></div>
                                <div class="grid grid-cols-2"><strong>VENCIMIENTO:</strong><span>${venta.fechaVencimiento || venta.fecha}</span></div>
                                <div class="grid grid-cols-2"><strong>CONDICIONES:</strong><span>${terminosTexto}</span></div>
                            </div>
                        </div>
                    </header>
                    
                    <section class="mb-10">
                        <div class="invoice-header-bar">Facturar A</div>
                        <div class="pt-4">
                             <h3 class="text-base font-bold text-gray-800">${cliente.nombre}</h3>
                             ${cliente.email ? `<p class="text-xs text-gray-500">${cliente.email}</p>` : ''}
                             ${cliente.telefono ? `<p class="text-xs text-gray-500">${cliente.telefono}</p>` : ''}
                        </div>
                    </section>
                    
                    <table id="invoice-items-table" class="w-full text-sm">
                        <thead><tr><th>Descripción</th><th class="text-center">Cantidad</th><th class="text-right">Precio Unit.</th><th class="text-right">Monto</th></tr></thead>
                        <tbody>${itemsHTML}</tbody>
                    </table>
                    
                    <div class="flex justify-end mt-8">
                        <table class="invoice-totals-table">
                            <tbody>
                                <tr><td class="text-gray-600">SUBTOTAL:</td><td class="text-right">${this.formatCurrency(venta.subtotal)}</td></tr>
                                ${venta.descuento > 0 ? `<tr><td class="text-gray-600">DESCUENTO:</td><td class="text-right text-red-500">-${this.formatCurrency(venta.descuento)}</td></tr>` : ''}
                                <tr><td class="text-gray-600">IMPUESTO (${empresa.taxRate}%):</td><td class="text-right">${this.formatCurrency(venta.impuesto)}</td></tr>
                                <tr class="font-bold border-t"><td class="pt-2">TOTAL FACTURA:</td><td class="text-right pt-2">${this.formatCurrency(venta.total)}</td></tr>
                                <tr class="text-green-600"><td class="text-gray-600">PAGADO:</td><td class="text-right">${this.formatCurrency(venta.montoPagado)}</td></tr>
                                <tr class="total-line text-red-600"><td class="text-lg">SALDO PENDIENTE:</td><td class="text-right text-lg">${this.formatCurrency(saldoPendiente)}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <footer class="mt-16 pt-6 border-t text-center text-xs text-gray-500">
                        <p class="font-bold mb-1">¡Gracias por su negocio!</p>
                        <p>Si tiene alguna pregunta sobre esta factura, póngase en contacto con nosotros.</p>
                        <p>${empresa.nombre} | ${empresa.taxId || ''}</p>
                    </footer>
                </div>
            </div>
        `;
        this.showModal(modalHTML, '6xl');
    },
    async generarFacturaPDF(ventaId) {
    const venta = this.findById(this.transacciones, ventaId);
    const cliente = this.findById(this.contactos, venta.contactoId);
    const { empresa } = this;
    const titulo = `Factura_${venta.numeroFactura || venta.id}`;

    const generateAndShowPdf = (logoDataUrl = null) => {
        const pdfDoc = ContaApp._generarFacturaPDF(venta, cliente, empresa, logoDataUrl);
        ContaApp._displayPDFPreviewInModal(pdfDoc, titulo);
    };

    if (empresa.logo) {
        try {
            const response = await fetch(empresa.logo);
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onload = () => generateAndShowPdf(reader.result);
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error("Error al cargar el logo para el PDF:", error);
            this.showToast('No se pudo cargar el logo, se generará el PDF sin él.', 'error');
            generateAndShowPdf();
        }
    } else {
        generateAndShowPdf();
    }
},

_generarFacturaPDF(venta, cliente, empresa, logoDataUrl) {
    const doc = this._generarPDFBase(`Factura #${venta.numeroFactura || venta.id}`, logoDataUrl);
    const accentColor = empresa.pdfColor || '#1877f2';

    doc.setFontSize(9);
    doc.setTextColor('#333333');
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURAR A:', 15, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(cliente.nombre, 15, 65);
    
    doc.autoTable({
        body: [
            ['Fecha:', venta.fecha],
            ['Vencimiento:', venta.fechaVencimiento || venta.fecha],
            ['Condiciones:', venta.terminosPago === 'contado' ? 'De Contado' : 'Crédito'],
        ],
        startY: 55,
        margin: { left: 140 },
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 1 },
    });

    const tableData = venta.items.map(item => {
        const descripcion = item.itemType === 'producto' 
            ? this.findById(this.productos, item.productoId).nombre 
            : this.findById(this.planDeCuentas, item.cuentaId).nombre;
        return [
            descripcion,
            item.cantidad,
            this.formatCurrency(item.precio),
            this.formatCurrency(item.cantidad * item.precio)
        ];
    });

    doc.autoTable({
        head: [['Descripción', 'Cantidad', 'Precio Unit.', 'Total']],
        body: tableData,
        startY: 75,
        theme: 'striped',
        headStyles: { fillColor: accentColor },
    });

    const finalY = doc.autoTable.previous.finalY;
    const totals = [
        ['Subtotal:', this.formatCurrency(venta.subtotal)],
        ['Descuento:', `-${this.formatCurrency(venta.descuento || 0)}`],
        [`Impuesto (${empresa.taxRate}%):`, this.formatCurrency(venta.impuesto)],
        [{content: 'TOTAL:', styles: {fontStyle: 'bold'}}, {content: this.formatCurrency(venta.total), styles: {fontStyle: 'bold'}}],
        ['Pagado:', this.formatCurrency(venta.montoPagado || 0)],
        [{content: 'SALDO:', styles: {fontStyle: 'bold', fontSize: 11}}, {content: this.formatCurrency(venta.total - (venta.montoPagado || 0)), styles: {fontStyle: 'bold', fontSize: 11}}]
    ];
    doc.autoTable({
        body: totals,
        startY: finalY + 5,
        margin: { left: 120 },
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1.5, halign: 'right' },
    });

    return doc;
},

_displayPDFPreviewInModal(pdfDoc, titulo) {
    const pdfDataUri = pdfDoc.output('datauristring');
    const previewHTML = `
        <div class="flex justify-between items-center mb-4 no-print">
            <h3 class="conta-title !mb-0">Vista Previa: ${titulo}</h3>
            <div>
                <button class="conta-btn conta-btn-small" onclick="this.nextElementSibling.click()"><i class="fa-solid fa-download me-2"></i>Descargar PDF</button>
                <a href="${pdfDataUri}" download="${titulo.replace(/ /g, '_')}_${this.empresa.nombre}.pdf" class="hidden"></a>
                <button class="conta-btn conta-btn-small conta-btn-accent" onclick="ContaApp.closeModal()">Cerrar</button>
            </div>
        </div>
        <iframe src="${pdfDataUri}" width="100%" height="600px" style="border: none;"></iframe>
    `;
    this.showModal(previewHTML, '6xl');
},

    exportarVentasCSV() {
        const filters = {
            search: document.getElementById('ventas-search')?.value,
            startDate: document.getElementById('ventas-start-date')?.value,
            endDate: document.getElementById('ventas-end-date')?.value
        };
        let transacciones = this.transacciones.filter(t => t.tipo === 'venta' || t.tipo === 'nota_credito');
        if (filters.search) {
            const term = filters.search.toLowerCase();
            transacciones = transacciones.filter(t => {
                const cliente = this.findById(this.contactos, t.contactoId);
                return t.numeroFactura?.toLowerCase().includes(term) || t.numeroNota?.toLowerCase().includes(term) || (cliente && cliente.nombre.toLowerCase().includes(term));
            });
        }
        if (filters.startDate) transacciones = transacciones.filter(t => t.fecha >= filters.startDate);
        if (filters.endDate) transacciones = transacciones.filter(t => t.fecha <= filters.endDate);

        const dataParaExportar = transacciones.map(t => {
            const cliente = this.findById(this.contactos, t.contactoId);
            return {
                'Documento_Numero': t.numeroFactura || t.numeroNota || t.id,
                'Tipo': t.tipo === 'venta' ? 'Venta' : 'Nota de Credito',
                'Fecha': t.fecha,
                'Cliente': cliente?.nombre || 'N/A',
                'Subtotal': t.subtotal,
                'Descuento': t.descuento || 0,
                'Impuesto': t.impuesto,
                'Total': t.tipo === 'venta' ? t.total : -t.total,
                'Estado': t.estado
            };
        });
        this.exportarA_CSV(`ventas_${this.getTodayDate()}.csv`, dataParaExportar);
    },
    abrirModalFiltrosAvanzadosVentas() {
        const filtrosActuales = this.moduleFilters['ventas'] || {};

        const clientesOptions = this.contactos
            .filter(c => c.tipo === 'cliente')
            .map(c => `<option value="${c.id}" ${parseInt(filtrosActuales.clienteId) === c.id ? 'selected' : ''}>${c.nombre}</option>`)
            .join('');

        const productosOptions = this.productos
            .map(p => `<option value="P-${p.id}" ${filtrosActuales.itemId === `P-${p.id}` ? 'selected' : ''}>${p.nombre} (Producto)</option>`)
            .join('');

        const serviciosOptions = this.planDeCuentas
            .filter(c => c.parentId === 420 && c.tipo === 'DETALLE')
            .map(c => `<option value="S-${c.id}" ${filtrosActuales.itemId === `S-${c.id}` ? 'selected' : ''}>${c.nombre} (Servicio)</option>`)
            .join('');

        const modalHTML = `
            <h3 class="conta-title mb-4">Filtros Avanzados de Ventas</h3>
            <form id="filtros-avanzados-form" onsubmit="event.preventDefault(); ContaApp.aplicarFiltrosAvanzados('ventas')" class="space-y-4 modal-form">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label>Cliente Específico</label>
                        <select id="filtro-avanzado-cliente" class="w-full conta-input mt-1">
                            <option value="">-- Todos los Clientes --</option>
                            ${clientesOptions}
                        </select>
                    </div>
                    <div>
                        <label>Estado de la Factura</label>
                        <select id="filtro-avanzado-estado" class="w-full conta-input mt-1">
                            <option value="Todas" ${!filtrosActuales.estado || filtrosActuales.estado === 'Todas' ? 'selected' : ''}>Todas</option>
                            <option value="Pendiente" ${filtrosActuales.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="Pagada" ${filtrosActuales.estado === 'Pagada' ? 'selected' : ''}>Pagada</option>
                            <option value="Parcial" ${filtrosActuales.estado === 'Parcial' ? 'selected' : ''}>Parcial</option>
                            <option value="Anulada" ${filtrosActuales.estado === 'Anulada' ? 'selected' : ''}>Anulada</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label>Contiene el Producto o Servicio</label>
                    <select id="filtro-avanzado-item" class="w-full conta-input mt-1">
                        <option value="">-- Cualquier Producto/Servicio --</option>
                        <optgroup label="Productos">${productosOptions}</optgroup>
                        <optgroup label="Servicios">${serviciosOptions}</optgroup>
                    </select>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label>Monto Total Mínimo</label>
                        <input type="number" step="0.01" id="filtro-avanzado-min-total" class="w-full conta-input mt-1" placeholder="Ej: 100" value="${filtrosActuales.minTotal || ''}">
                    </div>
                    <div>
                        <label>Monto Total Máximo</label>
                        <input type="number" step="0.01" id="filtro-avanzado-max-total" class="w-full conta-input mt-1" placeholder="Ej: 500" value="${filtrosActuales.maxTotal || ''}">
                    </div>
                </div>
                <div class="flex justify-between items-center mt-8">
                    <button type="button" class="conta-btn conta-btn-danger" onclick="ContaApp.limpiarFiltrosAvanzados('ventas')">Limpiar Filtros</button>
                    <div class="flex gap-2">
                        <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                        <button type="submit" class="conta-btn">Aplicar Filtros</button>
                    </div>
                </div>
            </form>
        `;
        this.showModal(modalHTML, '3xl');
    },
});