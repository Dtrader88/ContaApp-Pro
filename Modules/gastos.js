// Archivo: modules/gastos.js

Object.assign(ContaApp, {

    renderGastos(params = {}) {
    const submodulo = params.submodulo || 'historial';

    let html = `
        <div class="flex gap-2 mb-6 border-b border-[var(--color-border-accent)] flex-wrap">
            <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'historial' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('gastos', {submodulo: 'historial'})">Historial de Gastos</button>
            <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'ordenes-compra' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('gastos', {submodulo: 'ordenes-compra'})">Órdenes de Compra</button>
            <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'recurrentes' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('gastos', {submodulo: 'recurrentes'})">Gastos Recurrentes</button>
        </div>
        <div id="gastos-contenido"></div>
    `;
    document.getElementById('gastos').innerHTML = html;

    if (submodulo === 'historial') {
        this.renderGastosHistorial(params);
    } else if (submodulo === 'ordenes-compra') {
        this.renderOrdenesDeCompra(params);
    } else if (submodulo === 'recurrentes') {
        this.renderGastosRecurrentes();
    }
},

        async renderGastosHistorial(filters = {}) {
    document.getElementById('page-actions-header').innerHTML = `<div class="flex gap-2 flex-wrap">
        <button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarGastosCSV()"><i class="fa-solid fa-file-csv me-2"></i>Exportar CSV</button>
        <button class="conta-btn" onclick="ContaApp.abrirModalGasto()">+ Nuevo Gasto</button>
    </div>`;
    
    const todosLosGastos = this.transacciones.length > 0 ? this.transacciones : (await this.repository.getPaginatedTransactions({ perPage: 10000, filters: { tipos: ['gasto', 'compra_inventario'] } })).data;
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0,10);
    const gastosDelMes = todosLosGastos.filter(g => g.fecha >= primerDiaMes).reduce((sum, g) => sum + g.total, 0);
    let proveedorPrincipal = 'N/A';
    if (todosLosGastos.length > 0) {
        const gastosPorProveedor = todosLosGastos.reduce((acc, g) => {
            if(g.contactoId) acc[g.contactoId] = (acc[g.contactoId] || 0) + g.total;
            return acc;
        }, {});
        if (Object.keys(gastosPorProveedor).length > 0) {
            const maxProveedorId = Object.keys(gastosPorProveedor).reduce((a, b) => gastosPorProveedor[a] > gastosPorProveedor[b] ? a : b);
            const proveedor = this.findById(this.contactos, maxProveedorId);
            if (proveedor) proveedorPrincipal = proveedor.nombre;
        }
    }
    let categoriaPrincipal = 'N/A';
    if (todosLosGastos.length > 0) {
        const gastosPorCategoria = todosLosGastos.flatMap(g => g.items || []).reduce((acc, item) => {
            acc[item.cuentaId] = (acc[item.cuentaId] || 0) + item.monto;
            return acc;
        }, {});
        if (Object.keys(gastosPorCategoria).length > 0) {
            const maxCategoriaId = Object.keys(gastosPorCategoria).reduce((a, b) => gastosPorCategoria[a] > gastosPorCategoria[b] ? a : b);
            const cuenta = this.findById(this.planDeCuentas, maxCategoriaId);
            if (cuenta) categoriaPrincipal = cuenta.nombre;
        }
    }

    const kpiHTML = `
        <div class="flex flex-wrap justify-center gap-4 mb-4">
            <div class="conta-card kpi-dashboard-card w-64 text-center"><span class="text-xs text-[var(--color-text-secondary)] flex items-center justify-center"><i class="fa-solid fa-calendar-day fa-fw me-2"></i> Gastos del Mes</span><p class="font-bold text-xl conta-text-danger mt-1">${this.formatCurrency(gastosDelMes)}</p></div>
            <div class="conta-card kpi-dashboard-card w-64 text-center"><span class="text-xs text-[var(--color-text-secondary)] flex items-center justify-center"><i class="fa-solid fa-truck-fast fa-fw me-2"></i> Proveedor Principal</span><p class="font-bold text-xl conta-text-accent mt-1 truncate">${proveedorPrincipal}</p></div>
            <div class="conta-card kpi-dashboard-card w-64 text-center"><span class="text-xs text-[var(--color-text-secondary)] flex items-center justify-center"><i class="fa-solid fa-tags fa-fw me-2"></i> Categoría Principal</span><p class="font-bold text-xl conta-text-primary mt-1 truncate">${categoriaPrincipal}</p></div>
        </div>
    `;

    const filterFormHTML = `<div class="conta-card p-3 mb-4"><form onsubmit="event.preventDefault(); ContaApp.filtrarLista('gastos');" class="flex flex-wrap items-end gap-3">
        <div><label class="text-xs font-semibold">Buscar por Proveedor, Desc. o #</label><input type="search" id="gastos-search" class="conta-input md:w-72" value="${filters.search || ''}"></div>
        <div><label class="text-xs font-semibold">Desde</label><input type="date" id="gastos-start-date" class="conta-input" value="${filters.startDate || ''}"></div>
        <div><label class="text-xs font-semibold">Hasta</label><input type="date" id="gastos-end-date" class="conta-input" value="${filters.endDate || ''}"></div>
        <button type="submit" class="conta-btn">Filtrar</button>
    </form></div>`;
    
    const { currentPage, perPage } = this.getPaginationState('gastos');
    const { column, order } = this.gastosSortState;
    const { data: itemsParaMostrar, totalItems } = await this.repository.getPaginatedTransactions({
        page: currentPage, perPage: perPage,
        filters: { tipos: ['gasto'], search: filters.search, startDate: filters.startDate, endDate: filters.endDate },
        sort: { column, order }
    });
    
    let resultsHTML;
    if (totalItems === 0) {
         resultsHTML = `<div class="conta-card text-center p-8 text-[var(--color-text-secondary)]"><i class="fa-solid fa-filter-circle-xmark fa-3x mb-4 opacity-50"></i><h3 class="font-bold text-lg">Sin Resultados</h3><p>No se encontraron gastos que coincidan con los filtros.</p></div>`;
    } else {
        const generarEncabezado = (nombreColumna, clave) => `<th class="conta-table-th cursor-pointer" onclick="ContaApp.ordenarGastosPor('${clave}')">${nombreColumna} ${this.gastosSortState.column === clave ? (this.gastosSortState.order === 'asc' ? '<i class="fa-solid fa-arrow-up ml-2"></i>' : '<i class="fa-solid fa-arrow-down ml-2"></i>') : ''}</th>`;
        let tableRowsHTML = '';
        itemsParaMostrar.forEach(g => {
            const proveedor = this.findById(this.contactos, g.contactoId);
            const estado = g.estado || 'Pendiente';
            let estadoClass = estado === 'Pagado' ? 'tag-success' : (estado === 'Parcial' ? 'tag-accent' : 'tag-warning');
            tableRowsHTML += `<tr class="cursor-pointer" onclick="ContaApp.abrirModalHistorialGasto(${g.id})">
                <td class="conta-table-td font-mono">${g.referencia || g.id}</td>
                <td class="conta-table-td">${g.fecha}</td>
                <td class="conta-table-td">${proveedor?.nombre || 'N/A'}</td>
                <td class="conta-table-td">${g.descripcion}</td>
                <td class="conta-table-td text-right font-mono">${this.formatCurrency(g.total)}</td>
                <td class="conta-table-td"><span class="tag ${estadoClass}">${estado}</span></td>
                <td class="conta-table-td text-center">
                    <button class="conta-btn-icon" title="Ver Detalle" onclick="event.stopPropagation(); ContaApp.abrirModalHistorialGasto(${g.id})"><i class="fa-solid fa-eye"></i></button>
                    <button class="conta-btn-icon edit" title="Editar Gasto" onclick="event.stopPropagation(); ContaApp.abrirModalEditarGasto(${g.id})"><i class="fa-solid fa-pencil"></i></button>
                    <button class="conta-btn-icon" title="Duplicar Gasto" onclick="event.stopPropagation(); ContaApp.abrirModalGasto(${g.id})"><i class="fa-solid fa-copy"></i></button>
                </td>
            </tr>`;
        });
        resultsHTML = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra"><thead><tr>
            ${generarEncabezado('Referencia #', 'referencia')}
            ${generarEncabezado('Fecha', 'fecha')}
            ${generarEncabezado('Proveedor', 'contacto')}
            ${generarEncabezado('Descripción', 'descripcion')}
            ${generarEncabezado('Total', 'total')}
            ${generarEncabezado('Estado', 'estado')}
            <th class="conta-table-th text-center">Acciones</th>
        </tr></thead><tbody>${tableRowsHTML}</tbody></table></div>`;
        this.renderPaginationControls('gastos', totalItems);
    }
    document.getElementById('gastos-contenido').innerHTML = kpiHTML + filterFormHTML + resultsHTML;
},
    renderGastosRecurrentes() {
        // Botón para generar los gastos del mes actual
        document.getElementById('page-actions-header').innerHTML = `<button class="conta-btn conta-btn-accent" onclick="ContaApp.generarGastosRecurrentesDelMes()"><i class="fa-solid fa-magic-sparkles me-2"></i>Generar Gastos del Mes</button>`;
        
        let html;
        if (this.recurrentes.length === 0) {
            html = this.generarEstadoVacioHTML(
                'fa-repeat',
                'No tienes gastos recurrentes configurados',
                'Crea un nuevo gasto y marca la casilla "Gasto Recurrente" para añadir tu primera plantilla aquí.',
                '+ Crear Primer Gasto',
                "ContaApp.abrirModalGasto()"
            );
        } else {
            html = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra"><thead><tr>
    <th class="conta-table-th">Descripción</th>
    <th class="conta-table-th">Proveedor</th>
    <th class="conta-table-th text-right">Monto</th>
    <th class="conta-table-th">Frecuencia</th>
    <th class="conta-table-th text-center">Acciones</th>
    </tr></thead><tbody>`;
            
            this.recurrentes.forEach(r => {
                const proveedor = this.findById(this.contactos, r.contactoId);
                html += `<tr>
                    <td class="conta-table-td">${r.descripcion}</td>
                    <td class="conta-table-td">${proveedor?.nombre || 'N/A'}</td>
                    <td class="conta-table-td text-right font-mono">${this.formatCurrency(r.total)}</td>
                    <td class="conta-table-td">${r.frecuencia}</td>
                    <td class="conta-table-td text-center">
                        <button class="conta-btn-icon delete" title="Eliminar Plantilla" onclick="ContaApp.eliminarPlantillaRecurrente(${r.id})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;
            });
            html += `</tbody></table></div>`;
        }
        document.getElementById('gastos-contenido').innerHTML = html;
    },

        eliminarPlantillaRecurrente(id) {
        this.showConfirm('¿Seguro que deseas eliminar esta plantilla de gasto recurrente? Esto no afectará a los gastos ya generados.', () => {
            this.recurrentes = this.recurrentes.filter(r => r.id !== id);
            this.saveAll();
            this.irModulo('gastos', { submodulo: 'recurrentes' });
            this.showToast('Plantilla recurrente eliminada.', 'success');
        });
    },

           generarGastosRecurrentesDelMes() {
        const hoy = new Date();
        const mesActual = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
        let gastosGenerados = 0;

        // ===== MEJORA: Filtrar solo por plantillas de tipo 'gasto' =====
        this.recurrentes.filter(p => p.tipo === 'gasto').forEach(plantilla => {
            if (plantilla.ultimoGenerado !== mesActual) {
                const fechaGasto = mesActual + '-01';
                const transaccion = {
                    id: this.idCounter++,
                    tipo: 'gasto',
                    fecha: fechaGasto,
                    contactoId: plantilla.contactoId,
                    descripcion: plantilla.descripcion,
                    total: plantilla.total,
                    estado: 'Pendiente',
                    items: plantilla.items,
                    montoPagado: 0
                };
                this.transacciones.push(transaccion);

                const cuentaCxpId = 210;
                const movimientos = [];
                (plantilla.items || []).forEach(linea => {
                    movimientos.push({ cuentaId: linea.cuentaId, debe: linea.monto, haber: 0 });
                });
                movimientos.push({ cuentaId: cuentaCxpId, debe: 0, haber: plantilla.total });
                
                this.crearAsiento(fechaGasto, `Gasto recurrente: ${plantilla.descripcion}`, movimientos, transaccion.id);
                
                plantilla.ultimoGenerado = mesActual;
                gastosGenerados++;
            }
        });

        if (gastosGenerados > 0) {
            this.saveAll();
            this.showToast(`${gastosGenerados} gasto(s) recurrente(s) generado(s) para este mes.`, 'success');
            this.irModulo('gastos', { submodulo: 'historial' });
        } else {
            this.showToast('Todos los gastos recurrentes para este mes ya han sido generados.', 'info');
        }
    },
        abrirModalGasto(gastoIdDuplicar = null, gastoIdEditar = null) {
    const isEditing = gastoIdEditar !== null;
    const gastoOriginal = isEditing ? this.findById(this.transacciones, gastoIdEditar) : (gastoIdDuplicar ? this.findById(this.transacciones, gastoIdDuplicar) : null);
    const modalTitle = isEditing ? 'Editar Gasto' : (gastoIdDuplicar ? 'Duplicar Gasto' : 'Nuevo Gasto o Compra');

    const cuentasBancoOptions = this.planDeCuentas.filter(c => c.tipo === 'DETALLE' && (c.codigo.startsWith('110') || c.codigo.startsWith('230'))).map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    
    this.isFormDirty = false;
    const modalHTML = `<h3 class="conta-title mb-4">${modalTitle}</h3>
        <form onsubmit="ContaApp.guardarGasto(event)" oninput="ContaApp.isFormDirty = true;" class="modal-form">
            ${isEditing ? `<input type="hidden" id="gasto-id-edit" value="${gastoIdEditar}">` : ''}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div><label>Proveedor</label><div class="flex items-center gap-2">
                    <input list="proveedores-datalist" id="gasto-proveedor-input" class="w-full p-2 mt-1" placeholder="Buscar proveedor...">
                    <datalist id="proveedores-datalist">${this.contactos.filter(c => c.tipo === 'proveedor').map(c => `<option value="${c.nombre}" data-id="${c.id}"></option>`).join('')}</datalist>
                    <input type="hidden" id="gasto-proveedor-id">
                    <button type="button" class="conta-btn conta-btn-small" onclick="ContaApp.abrirSubModalNuevoContacto('proveedor', 'gasto-proveedor-input')">+</button>
                </div></div>
                <div><label>Fecha</label><input type="date" id="gasto-fecha" value="${this.getTodayDate()}" class="w-full p-2 mt-1" required></div>
                <div><label>Referencia / Factura Prov.</label><input type="text" id="gasto-referencia" class="w-full p-2 mt-1" placeholder="Ej: F-54321"></div>
            </div>
            <div><label>Descripción General del Gasto</label><input type="text" id="gasto-descripcion" class="w-full p-2 mt-1" required></div>
            <div class="mt-4"><label>Adjuntar Comprobante (Opcional, máx 1MB)</label><input type="file" id="gasto-comprobante" class="w-full p-2 mt-1 border rounded" accept="image/*,.pdf"></div>
            <div class="conta-card p-2 md:p-4 mt-4">
                <h4 class="font-bold mb-2 text-sm">Detalle del Gasto/Compra</h4>
                <div id="gasto-items-container" class="space-y-3"></div>
                <button type="button" class="conta-btn conta-btn-small conta-btn-accent mt-2" onclick="ContaApp.agregarItemGasto()">+ Agregar Línea</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-start">
                <div><label>Condición de Pago</label>
                    <select id="gasto-pago-tipo" class="w-full p-2 mt-1" onchange="document.getElementById('gasto-pago-cuenta-banco-div').style.display = this.value === 'contado' ? 'block' : 'none'"><option value="credito">A crédito (genera Cta. por Pagar)</option><option value="contado">De Contado</option></select>
                    <div id="gasto-pago-cuenta-banco-div" style="display: none;" class="mt-2"><label>Pagar desde</label><select id="gasto-pago-cuenta-banco" class="w-full p-2 mt-1">${cuentasBancoOptions}</select></div>
                </div>
                <div class="space-y-2 text-right">
                    <div class="flex justify-end items-center gap-2 mb-2"><label for="gasto-recurrente-check" class="text-sm font-medium">Gasto Recurrente</label><input type="checkbox" id="gasto-recurrente-check" class="h-4 w-4"></div>
                    <div class="flex justify-between font-bold text-xl"><span class="text-[var(--color-text-primary)]">Total:</span> <span id="gasto-total">${this.formatCurrency(0)}</span></div>
                </div>
            </div>
            <div class="flex justify-end gap-2 mt-8"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button type="submit" class="conta-btn">${isEditing ? 'Guardar Cambios' : 'Guardar Gasto'}</button></div>
        </form>`;
    this.showModal(modalHTML, '4xl');
    this.setupDatalistListener('gasto-proveedor-input', 'gasto-proveedor-id', 'proveedores-datalist');

    if (gastoOriginal) {
        const proveedor = this.findById(this.contactos, gastoOriginal.contactoId);
        if (proveedor) {
            document.getElementById('gasto-proveedor-input').value = proveedor.nombre;
            document.getElementById('gasto-proveedor-id').value = proveedor.id;
        }
        document.getElementById('gasto-fecha').value = gastoOriginal.fecha;
        document.getElementById('gasto-referencia').value = gastoOriginal.referencia || '';
        document.getElementById('gasto-descripcion').value = gastoOriginal.descripcion;
        const itemsContainer = document.getElementById('gasto-items-container');
        itemsContainer.innerHTML = '';
        gastoOriginal.items.forEach(item => {
            this.agregarItemGasto();
            const nuevaFila = itemsContainer.lastChild;
            nuevaFila.querySelector('.gasto-item-cuenta').value = item.cuentaId;
            nuevaFila.querySelector('.gasto-item-monto').value = item.monto.toFixed(2);
        });
        this.actualizarTotalesGasto();
    } else {
        this.agregarItemGasto();
    }
},
                handleGastoItemChange(selectElement) {
        // Esta función ahora no necesita hacer nada, pero la mantenemos
        // por si en el futuro queremos añadir lógica aquí.
        // Lo importante es que ya no intenta cambiar la fila a "modo inventario".
        this.actualizarTotalesGasto();
    },
    abrirModalEditarGasto(gastoId) {
    const gasto = this.findById(this.transacciones, gastoId);
    if (!gasto) {
        this.showToast('Error: Gasto no encontrado.', 'error');
        return;
    }
    if (gasto.montoPagado > 0 || gasto.estado === 'Anulada') {
        this.showToast('No se puede editar un gasto que ya tiene pagos o está anulado.', 'error');
        return;
    }
    // Llamamos a la función principal del modal, pasando el ID para editar
    this.abrirModalGasto(null, gastoId);
},
    agregarItemGasto() {
    const container = document.getElementById('gasto-items-container');
    
    // --- INICIO DE LA CORRECCIÓN ---
    // Se corrige el filtro para que apunte al grupo de GASTOS (código 600) en lugar de COSTOS (código 500).
    const cuentasGastoOptions = this.planDeCuentas
        .filter(c => c.tipo === 'DETALLE' && c.codigo.startsWith('6'))
        .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
        .map(c => `<option value="${c.id}">${c.codigo} - ${c.nombre}</option>`)
        .join('');
    // --- FIN DE LA CORRECCIÓN ---

    const itemHTML = `
        <div class="grid grid-cols-12 gap-2 items-center dynamic-row gasto-item-row">
            <div class="gasto-item-inputs-container col-span-11 grid grid-cols-10 gap-2 items-center">
                <select class="col-span-7 p-2 gasto-item-cuenta" onchange="ContaApp.handleGastoItemChange(this)">${cuentasGastoOptions}</select>
                <input type="number" step="0.01" min="0" placeholder="Monto" class="col-span-3 p-2 text-right gasto-item-monto" oninput="ContaApp.actualizarTotalesGasto()">
            </div>
            <button type="button" class="col-span-1 conta-btn-icon delete" onclick="this.closest('.gasto-item-row').remove(); ContaApp.actualizarTotalesGasto();">🗑️</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', itemHTML);
},
        async guardarGasto(e) {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    this.toggleButtonLoading(submitButton, true);

    const gastoIdEdit = document.getElementById('gasto-id-edit')?.value;
    const isEditing = !!gastoIdEdit;

    try {
        const contactoId = parseInt(document.getElementById('gasto-proveedor-id').value);
        if (!contactoId) throw new Error('Debe seleccionar un proveedor válido.');

        const fecha = document.getElementById('gasto-fecha').value;
        const descripcion = document.getElementById('gasto-descripcion').value;
        const referencia = document.getElementById('gasto-referencia').value;
        const pagoTipo = document.getElementById('gasto-pago-tipo').value;
        
        const lineas = [];
        let total = 0;
        document.querySelectorAll('.gasto-item-row').forEach(row => {
            const cuentaId = parseInt(row.querySelector('.gasto-item-cuenta').value);
            const monto = parseFloat(row.querySelector('.gasto-item-monto').value) || 0;
            if (!cuentaId || monto <= 0) return;
            lineas.push({ cuentaId, monto });
            total += monto;
        });

        if (lineas.length === 0) throw new Error('Debes agregar al menos una línea de gasto válida.');
        
        let gastoParaGuardar;
        if (isEditing) {
            gastoParaGuardar = this.findById(this.transacciones, parseInt(gastoIdEdit));
            const asientoOriginal = this.asientos.find(a => a.transaccionId === gastoParaGuardar.id);
            if (asientoOriginal) {
                const movReversos = asientoOriginal.movimientos.map(m => ({ cuentaId: m.cuentaId, debe: m.haber, haber: m.debe }));
                this.crearAsiento(this.getTodayDate(), `Modificación Gasto #${gastoParaGuardar.id}`, movReversos);
            }
        } else {
            gastoParaGuardar = {
                id: this.idCounter++, tipo: 'gasto', estado: 'Pendiente', montoPagado: 0
            };
            this.transacciones.push(gastoParaGuardar);
        }

        Object.assign(gastoParaGuardar, { fecha, contactoId, descripcion, referencia, total, items: lineas });

        const cuentaContrapartidaId = pagoTipo === 'credito' ? 210 : parseInt(document.getElementById('gasto-pago-cuenta-banco').value);
        const movimientos = [];
        lineas.forEach(linea => {
            movimientos.push({ cuentaId: linea.cuentaId, debe: linea.monto, haber: 0 });
        });
        movimientos.push({ cuentaId: cuentaContrapartidaId, debe: 0, haber: total });
        
        this.crearAsiento(fecha, descripcion, movimientos, gastoParaGuardar.id);
        
        await this.saveAll();
        
        this.isFormDirty = false;
        this.closeModal();
        this.irModulo('gastos');
        this.showToast(`Gasto ${isEditing ? 'actualizado' : 'guardado'} con éxito.`, 'success');

    } catch (error) {
        this.showToast(error.message, 'error');
    } finally {
        this.toggleButtonLoading(submitButton, false);
    }
},
    anularGasto(gastoId) {
        const gasto = this.findById(this.transacciones, gastoId);
        if (!gasto) {
            this.showToast('Error: Gasto no encontrado.', 'error');
            return;
        }
        if (gasto.montoPagado > 0) {
            this.showToast('No se puede anular un gasto que ya tiene pagos registrados.', 'error');
            return;
        }

        this.showConfirm(
            `¿Seguro que deseas anular el gasto "${gasto.descripcion}"? Esta acción creará un asiento contable reverso y es irreversible.`,
            () => {
                // 1. Encontrar el asiento original
                const asientoOriginal = this.asientos.find(a => a.transaccionId === gasto.id);
                if (!asientoOriginal) {
                    this.showToast('Error: No se encontró el asiento contable original para anular.', 'error');
                    return;
                }

                // 2. Crear los movimientos reversos
                const movimientosReversos = asientoOriginal.movimientos.map(mov => ({
                    cuentaId: mov.cuentaId,
                    debe: mov.haber, // Se invierten debe y haber
                    haber: mov.debe
                }));

                // 3. Crear el asiento de anulación
                const asientoReverso = this.crearAsiento(
                    this.getTodayDate(),
                    `Anulación de Gasto: ${gasto.descripcion}`,
                    movimientosReversos
                );

                if (asientoReverso) {
                    // 4. Actualizar el estado del gasto
                    gasto.estado = 'Anulado';
                    this.saveAll();
                    this.irModulo('cxp');
                    this.showToast('Gasto anulado correctamente.', 'success');
                }
            }
        );
    },
    anularTransaccionPorId(transaccionId) {
        const transaccion = this.findById(this.transacciones, transaccionId);
        if (!transaccion) {
            this.showToast('Error: Transacción no encontrada.', 'error');
            return;
        }

        const tipo = transaccion.tipo;
        
        if (tipo === 'gasto') {
            this.anularGasto(transaccionId);
        } else if (tipo === 'compra_inventario') {
            this.anularCompra(transaccionId);
        } else {
            this.showToast(`La anulación para el tipo '${tipo}' no está implementada.`, 'error');
        }
    },
    exportarGastosCSV() {
        const filters = {
            search: document.getElementById('gastos-search')?.value,
            startDate: document.getElementById('gastos-start-date')?.value,
            endDate: document.getElementById('gastos-end-date')?.value
        };
        let gastos = this.transacciones.filter(t => t.tipo === 'gasto');
        if (filters.search) {
            const term = filters.search.toLowerCase();
            gastos = gastos.filter(g => {
                const proveedor = this.findById(this.contactos, g.contactoId);
                return g.id.toString().includes(term) || g.descripcion.toLowerCase().includes(term) || (proveedor && proveedor.nombre.toLowerCase().includes(term));
            });
        }
        if (filters.startDate) gastos = gastos.filter(g => g.fecha >= filters.startDate);
        if (filters.endDate) gastos = gastos.filter(g => g.fecha <= filters.endDate);

        const dataParaExportar = gastos.map(g => {
            const proveedor = this.findById(this.contactos, g.contactoId);
            return {
                'ID_Gasto': g.id,
                'Fecha': g.fecha,
                'Proveedor': proveedor?.nombre || 'N/A',
                'Descripcion': g.descripcion,
                'Total': g.total,
                'Estado': g.estado || 'Pendiente'
            };
        });
        this.exportarA_CSV(`gastos_${this.getTodayDate()}.csv`, dataParaExportar);
    },
    renderOrdenesDeCompra(params = {}) {
    document.getElementById('page-actions-header').innerHTML = `
        <button class="conta-btn" onclick="ContaApp.abrirModalOrdenDeCompra()">+ Nueva Orden de Compra</button>
    `;

    const ordenes = this.transacciones.filter(t => t.tipo === 'orden_compra');
    let contentHTML;

    if (ordenes.length === 0) {
        contentHTML = this.generarEstadoVacioHTML(
            'fa-file-signature',
            'Aún no tienes Órdenes de Compra',
            'Crea tu primera orden de compra para un proveedor. Luego podrás convertirla en un gasto registrado.',
            '+ Crear Primera Orden de Compra',
            "ContaApp.abrirModalOrdenDeCompra()"
        );
    } else {
        const { currentPage, perPage } = this.getPaginationState('gastos-oc');
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        
        ordenes.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        const itemsParaMostrar = ordenes.slice(startIndex, endIndex);

        let tableHTML = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra"><thead><tr>
            <th class="conta-table-th"># Orden</th>
            <th class="conta-table-th">Fecha</th>
            <th class="conta-table-th">Proveedor</th>
            <th class="conta-table-th text-right">Total</th>
            <th class="conta-table-th">Estado</th>
            <th class="conta-table-th text-center">Acciones</th>
        </tr></thead><tbody>`;

        itemsParaMostrar.forEach(oc => {
            const proveedor = this.findById(this.contactos, oc.contactoId);
            let estadoClass = '';
            switch (oc.estado) {
                case 'Recibido Total': estadoClass = 'tag-success'; break;
                case 'Recibido Parcial': estadoClass = 'tag-accent'; break;
                case 'Anulada': estadoClass = 'tag-anulada'; break;
                default: estadoClass = 'tag-neutral'; // Pendiente
            }

            let accionesHTML = '';
            if (oc.estado === 'Pendiente' || oc.estado === 'Recibido Parcial') {
                accionesHTML += `<button class="conta-btn conta-btn-small" onclick="ContaApp.convertirOCaGasto(${oc.id})">Registrar Gasto</button>`;
            }
            if (oc.estado !== 'Anulada' && oc.estado !== 'Recibido Total') {
                accionesHTML += `<button class="conta-btn-icon delete ml-2" title="Anular Orden" onclick="ContaApp.anularOrdenDeCompra(${oc.id})"><i class="fa-solid fa-ban"></i></button>`;
            }

            tableHTML += `<tr>
                <td class="conta-table-td font-mono">${oc.numeroOrden || oc.id}</td>
                <td class="conta-table-td">${oc.fecha}</td>
                <td class="conta-table-td">${proveedor?.nombre || 'N/A'}</td>
                <td class="conta-table-td text-right font-mono">${this.formatCurrency(oc.total)}</td>
                <td class="conta-table-td"><span class="tag ${estadoClass}">${oc.estado}</span></td>
                <td class="conta-table-td text-center">${accionesHTML}</td>
            </tr>`;
        });
        tableHTML += `</tbody></table></div>`;
        contentHTML = tableHTML;
        this.renderPaginationControls('gastos-oc', ordenes.length);
    }
    
    document.getElementById('gastos-contenido').innerHTML = contentHTML;
},
abrirModalOrdenDeCompra(ocIdDuplicar = null) {
    const ocOriginal = ocIdDuplicar ? this.findById(this.transacciones, ocIdDuplicar) : null;

    const proximoNumeroOC = this.generarSiguienteNumeroDeOC();

    this.isFormDirty = false;
    const modalHTML = `
        <h3 class="conta-title mb-4">${ocOriginal ? 'Duplicar' : 'Nueva'} Orden de Compra</h3>
        <form onsubmit="ContaApp.guardarOrdenDeCompra(event)" oninput="ContaApp.isFormDirty = true;" class="modal-form">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label>Proveedor</label>
                     <div class="flex items-center gap-2">
                        <input list="proveedores-datalist-oc" id="oc-proveedor-input" class="w-full conta-input" placeholder="Escribe para buscar..." required>
                        <datalist id="proveedores-datalist-oc">
                            ${this.contactos.filter(c => c.tipo === 'proveedor').map(c => `<option value="${c.nombre}" data-id="${c.id}"></option>`).join('')}
                        </datalist>
                        <input type="hidden" id="oc-proveedor-id">
                        <button type="button" class="conta-btn conta-btn-small" onclick="ContaApp.abrirSubModalNuevoContacto('proveedor', 'oc-proveedor-input')">+</button>
                    </div>
                </div>
                <div><label>Fecha</label><input type="date" id="oc-fecha" value="${this.getTodayDate()}" class="w-full conta-input" required></div>
                <div><label>Orden #</label><input type="text" id="oc-numero" value="${proximoNumeroOC}" class="w-full conta-input bg-gray-100 dark:bg-gray-700" readonly></div>
            </div>
            
            <div class="conta-card p-2 md:p-4 mt-4">
                <h4 class="font-bold mb-2 text-sm">Detalle de la Orden</h4>
                <div id="oc-items-container" class="space-y-3"></div>
                <button type="button" class="conta-btn conta-btn-small conta-btn-accent mt-2" onclick="ContaApp.agregarItemOC()">+ Agregar Línea</button>
            </div>
             <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-start">
                <div>
                    <label>Notas / Términos</label>
                    <textarea id="oc-notas" rows="3" class="w-full conta-input" placeholder="Ej: Entrega en 5 días hábiles..."></textarea>
                </div>
                 <div class="space-y-2 text-right">
                    <div class="flex justify-between font-bold text-xl"><span class="text-[var(--color-text-primary)]">Total:</span> <span id="oc-total">${this.formatCurrency(0)}</span></div>
                </div>
            </div>
            <div class="flex justify-end gap-2 mt-8"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button type="submit" class="conta-btn">Guardar Orden</button></div>
        </form>
    `;
    this.showModal(modalHTML, '4xl');
    this.setupDatalistListener('oc-proveedor-input', 'oc-proveedor-id', 'proveedores-datalist-oc');

    if (ocOriginal) {
        // Lógica para duplicar (la implementaremos más adelante si es necesario)
    } else {
        this.agregarItemOC();
    }
},

generarSiguienteNumeroDeOC() {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const ano = String(hoy.getFullYear()).slice(-2);
    const periodo = `${mes}${ano}`;

    const ocsDelPeriodo = this.transacciones.filter(t => 
        t.tipo === 'orden_compra' && 
        t.numeroOrden && 
        t.numeroOrden.startsWith(`OC-${periodo}`)
    );

    let maxNumero = 0;
    ocsDelPeriodo.forEach(oc => {
        const numero = parseInt(oc.numeroOrden.split('-')[2]);
        if (numero > maxNumero) maxNumero = numero;
    });

    const siguienteNumero = String(maxNumero + 1).padStart(3, '0');
    return `OC-${periodo}-${siguienteNumero}`;
},

agregarItemOC() {
    const container = document.getElementById('oc-items-container');
    
    // ===== INICIO DE LA CORRECCIÓN =====
    // Se ajusta el filtro para incluir únicamente las cuentas de Inventario para Reventa (13001) y Materias Primas (13002).
    const cuentasInventarioOptions = this.planDeCuentas
        .filter(c => c.id === 13001 || c.id === 13002)
        .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
        .map(c => `<option value="${c.id}">${c.codigo} - ${c.nombre}</option>`)
        .join('');
    // ===== FIN DE LA CORRECCIÓN =====

    const itemHTML = `
        <div class="grid grid-cols-12 gap-2 items-center dynamic-row oc-item-row">
            <div class="oc-item-inputs-container col-span-11 grid grid-cols-10 gap-2 items-center">
                 <select class="col-span-7 conta-input" onchange="ContaApp.handleOCItemChange(this)">${cuentasInventarioOptions}</select>
                 <input type="number" step="0.01" min="0" placeholder="Monto" class="col-span-3 conta-input text-right oc-item-monto" oninput="ContaApp.actualizarTotalesOC()">
            </div>
            <button type="button" class="col-span-1 conta-btn-icon delete" onclick="this.closest('.oc-item-row').remove(); ContaApp.actualizarTotalesOC();">🗑️</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', itemHTML);
},
// Esta función es un placeholder por si en el futuro queremos una lógica más compleja como en gastos.
handleOCItemChange(selectElement) {
    this.actualizarTotalesOC();
},

actualizarTotalesOC() {
    let total = 0;
    document.querySelectorAll('.oc-item-row').forEach(row => {
        const monto = parseFloat(row.querySelector('.oc-item-monto')?.value) || 0;
        total += monto;
    });
    document.getElementById('oc-total').textContent = this.formatCurrency(total);
},
guardarOrdenDeCompra(e) {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    this.toggleButtonLoading(submitButton, true);

    try {
        const proveedorId = parseInt(document.getElementById('oc-proveedor-id').value);
        if (!proveedorId) {
            throw new Error('Por favor, selecciona un proveedor válido de la lista.');
        }

        const items = [];
        let total = 0;
        document.querySelectorAll('.oc-item-row').forEach(row => {
            const cuentaId = parseInt(row.querySelector('select').value);
            const monto = parseFloat(row.querySelector('.oc-item-monto').value) || 0;
            
            if (cuentaId && monto > 0) {
                items.push({
                    cuentaId: cuentaId,
                    monto: monto
                });
                total += monto;
            }
        });

        if (items.length === 0) {
            throw new Error('Debes agregar al menos una línea con un monto válido.');
        }

        const nuevaOC = {
            id: this.idCounter++,
            tipo: 'orden_compra', // Nuevo tipo de transacción
            numeroOrden: document.getElementById('oc-numero').value,
            fecha: document.getElementById('oc-fecha').value,
            contactoId: proveedorId,
            notas: document.getElementById('oc-notas').value,
            items: items,
            total: total,
            estado: 'Pendiente' // Estados posibles: Pendiente, Recibido Parcial, Recibido Total, Anulada
        };

        this.transacciones.push(nuevaOC);

        this.isFormDirty = false;
        this.saveAll();
        this.closeModal();
        this.irModulo('gastos', { submodulo: 'ordenes-compra' });
        this.showToast('Orden de Compra creada con éxito.', 'success');

    } catch (error) {
        console.error("Error al guardar la Orden de Compra:", error);
        this.showToast(error.message, 'error');
    } finally {
        this.toggleButtonLoading(submitButton, false);
    }
},
convertirOCaGasto(ocId) {
    const oc = this.findById(this.transacciones, ocId);
    if (!oc) {
        this.showToast('Error: No se encontró la Orden de Compra.', 'error');
        return;
    }

    // Abrimos el modal de Gasto, que ya conocemos
    this.abrirModalGasto();

    // Pequeña espera para asegurar que el modal se ha renderizado completamente en el DOM
    setTimeout(() => {
        // Rellenamos los campos de la cabecera del modal de Gasto
        const proveedor = this.findById(this.contactos, oc.contactoId);
        if (proveedor) {
            document.getElementById('gasto-proveedor-input').value = proveedor.nombre;
            document.getElementById('gasto-proveedor-id').value = proveedor.id;
        }
        document.getElementById('gasto-fecha').value = this.getTodayDate(); // Usamos la fecha actual para el gasto
        document.getElementById('gasto-descripcion').value = `Basado en Orden de Compra #${oc.numeroOrden || oc.id}`;

        // Marcamos la OC de origen en un campo oculto para vincularla al guardar
        const form = document.querySelector('.modal-form');
        let ocIdInput = form.querySelector('#gasto-oc-origen-id');
        if (!ocIdInput) {
            ocIdInput = document.createElement('input');
            ocIdInput.type = 'hidden';
            ocIdInput.id = 'gasto-oc-origen-id';
            form.appendChild(ocIdInput);
        }
        ocIdInput.value = oc.id;
        
        // Limpiamos los ítems de ejemplo y rellenamos con los de la OC
        const itemsContainer = document.getElementById('gasto-items-container');
        itemsContainer.innerHTML = ''; // Borramos la línea por defecto

        oc.items.forEach(item => {
            this.agregarItemGasto();
            const nuevaFila = itemsContainer.lastChild;
            
            // Seleccionamos la cuenta de gasto/inventario correcta
            const cuentaSelect = nuevaFila.querySelector('.gasto-item-cuenta');
            cuentaSelect.value = item.cuentaId;

            // IMPORTANTE: Disparamos el evento 'change' para que la lógica de la fila se actualice
            // (por si la cuenta es "Inventario" y necesita mostrar campos diferentes)
            const event = new Event('change', { bubbles: true });
            cuentaSelect.dispatchEvent(event);

            // Rellenamos el monto. La lógica de OC simplificada no maneja stock, solo montos.
            // La gestión de stock (si aplica) se hará al guardar el gasto.
            const montoInput = nuevaFila.querySelector('.gasto-item-monto');
            if (montoInput) {
                montoInput.value = item.monto.toFixed(2);
            }
        });

        // Finalmente, actualizamos los totales del modal
        this.actualizarTotalesGasto();
        
    }, 100); // El timeout de 100ms da tiempo suficiente para la renderización
},
anularOrdenDeCompra(ocId) {
    const oc = this.findById(this.transacciones, ocId);
    if (!oc) return;

    this.showConfirm(
        `¿Seguro que deseas anular la Orden de Compra #${oc.numeroOrden}? Esta acción no se puede deshacer.`,
        () => {
            oc.estado = 'Anulada';
            this.saveAll();
            this.irModulo('gastos', { submodulo: 'ordenes-compra' });
            this.showToast('Orden de Compra anulada.', 'success');
        }
    );
},
abrirSubModalNuevoProducto(origen) {
        // Determinamos qué selector de productos necesitamos actualizar después de crear
        const selectorId = origen === 'gasto' ? '.gasto-item-producto-id' : '.venta-item-id';
        // Buscamos el último selector en el modal principal, que será el de la fila activa
        const selectToUpdate = Array.from(document.querySelectorAll(selectorId)).pop();
        if (!selectToUpdate) {
            this.showToast('Error: No se encontró el selector de producto a actualizar.', 'error');
            return;
        }
        // Le asignamos un ID único si no lo tiene, para poder referenciarlo
        if (!selectToUpdate.id) {
            selectToUpdate.id = `producto-selector-on-the-fly-${Date.now()}`;
        }

        const subModal = document.createElement('div');
        subModal.id = 'sub-modal-bg';
        subModal.onclick = () => document.body.removeChild(subModal); // Permite cerrar haciendo clic fuera
        
        const subModalContent = document.createElement('div');
        subModalContent.className = 'p-6 rounded-lg shadow-xl w-full max-w-md modal-content';
        subModalContent.onclick = e => e.stopPropagation(); // Evita que el clic dentro cierre el modal

        subModalContent.innerHTML = `
            <h3 class="conta-title mb-4">Nuevo Producto Rápido</h3>
            <form onsubmit="event.preventDefault(); ContaApp.guardarNuevoProductoDesdeSubModal(event, '${selectToUpdate.id}')" class="space-y-4 modal-form">
                <div>
                    <label>Nombre del Producto</label>
                    <input type="text" id="sub-prod-nombre" class="w-full p-2 mt-1" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label>Precio de Venta</label>
                        <input type="number" step="0.01" id="sub-prod-precio" class="w-full p-2 mt-1" required>
                    </div>
                    <div>
                        <label>Costo Inicial</label>
                        <input type="number" step="0.01" id="sub-prod-costo" class="w-full p-2 mt-1" value="0">
                    </div>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="document.body.removeChild(document.getElementById('sub-modal-bg'))">Cancelar</button>
                    <button type="submit" class="conta-btn">Guardar Producto</button>
                </div>
            </form>
        `;
        subModal.appendChild(subModalContent);
        document.body.appendChild(subModal);
        document.getElementById('sub-prod-nombre').focus();
    },

    guardarNuevoProductoDesdeSubModal(e, selectIdToUpdate) {
        const data = {
            nombre: document.getElementById('sub-prod-nombre').value,
            precio: parseFloat(document.getElementById('sub-prod-precio').value),
            costo: parseFloat(document.getElementById('sub-prod-costo').value) || 0,
        };

        const nuevoProducto = {
            id: this.idCounter++,
            nombre: data.nombre,
            tipo: 'producto',
            stock: 0, // El stock se añadirá en la propia compra
            stockMinimo: 0,
            costo: data.costo,
            precio: data.precio,
            cuentaIngresoId: 40101
        };

        this.productos.push(nuevoProducto);
        this.saveAll();

        // Actualizar TODOS los selectores de productos en el modal principal para que
        // el nuevo producto aparezca en todas las filas.
        const todosLosSelectores = document.querySelectorAll('.gasto-item-producto-id, .venta-item-id');
        todosLosSelectores.forEach(select => {
            const option = document.createElement('option');
            option.value = nuevoProducto.id;
            option.text = nuevoProducto.nombre;
            option.dataset.precio = nuevoProducto.precio; // Para el modal de ventas
            select.add(option);
        });

        // Seleccionar automáticamente el producto recién creado en la fila activa.
        const selectActivo = document.getElementById(selectIdToUpdate);
        if (selectActivo) {
            selectActivo.value = nuevoProducto.id;
            // Disparamos un evento 'change' para que cualquier lógica asociada se ejecute (como actualizar precios)
            selectActivo.dispatchEvent(new Event('change', { bubbles: true }));
        }

        this.showToast('Producto creado y seleccionado.', 'success');
        document.body.removeChild(document.getElementById('sub-modal-bg'));
    },
    ordenarGastosPor(columna) {
    if (this.gastosSortState.column === columna) {
        this.gastosSortState.order = this.gastosSortState.order === 'asc' ? 'desc' : 'asc';
    } else {
        this.gastosSortState.column = columna;
        this.gastosSortState.order = 'asc';
    }
    this.irModulo('gastos');
},
});