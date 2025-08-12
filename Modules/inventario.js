Object.assign(ContaApp, {

    filtrarInventario(cuentaInventarioId) {
    const search = document.getElementById('inventario-search').value;
    const params = { search };
    this.moduleFilters['inventario'] = { ...this.moduleFilters['inventario'], ...params };
    this.renderInventarioLista(params, cuentaInventarioId);
},
getSucursalesActivas() {
    const s = Array.isArray(this.empresa?.sucursales) ? this.empresa.sucursales : [];
    if (s.length > 0) return s;

    const cc = Array.isArray(this.empresa?.centrosDeCosto) ? this.empresa.centrosDeCosto : [];
    return cc.map(c => ({ id: String(c.id), nombre: c.nombre }));
},
    renderInventario(params = {}) {
    // Si se pasa un ID de producto, renderizamos la vista de Kardex
    if (params.productoId) {
        this.renderInventario_Kardex(params.productoId);
        return;
    }
    
    // Asignamos un submodulo por defecto si no viene uno
    const submodulo = params.submodulo || 'reventa';

    // Creamos la estructura de pestañas
    const tabs = [
        { id: 'reventa', nombre: 'Productos para Reventa', cuentaId: 13001 },
        { id: 'materia-prima', nombre: 'Materias Primas', cuentaId: 13002 },
        { id: 'terminados', nombre: 'Productos Terminados', cuentaId: 13004 }
    ];

    let tabsHTML = tabs.map(tab => `
        <button class="py-2 px-4 text-sm font-semibold ${submodulo === tab.id ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('inventario', {submodulo: '${tab.id}'})">
            ${tab.nombre}
        </button>
    `).join('');

    let html = `
        <div class="flex gap-2 mb-4 border-b border-[var(--color-border-accent)] flex-wrap">${tabsHTML}</div>
        <div id="inventario-contenido"></div>
    `;
    document.getElementById('inventario').innerHTML = html;

    // Buscamos la cuentaId correspondiente al submodulo activo para pasársela a la función que renderiza la lista
    const cuentaIdActiva = tabs.find(tab => tab.id === submodulo).cuentaId;
    this.renderInventarioLista(params, cuentaIdActiva);
},
      renderInventarioLista(params = {}, cuentaInventarioId) {
    // Header de acciones
    document.getElementById('page-actions-header').innerHTML = `
        <div class="flex gap-2 flex-wrap">
            <button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarInventarioCSV()"><i class="fa-solid fa-file-csv me-2"></i>Exportar CSV</button>
            <button id="transfer-btn" class="conta-btn conta-btn-primary" onclick="ContaApp.abrirModalTransferenciaInventario()" disabled><i class="fa-solid fa-right-left me-2"></i>Transferir Selección</button>
            <button class="conta-btn" onclick="ContaApp.abrirModalProducto()">+ Nuevo Producto/Servicio</button>
        </div>`;

    // Filtro de búsqueda
    let productosFiltrados = (this.productos || []).filter(p => p.cuentaInventarioId === cuentaInventarioId);
    if (params.search) {
        const term = params.search.toLowerCase();
        productosFiltrados = productosFiltrados.filter(p => (p.nombre || '').toLowerCase().includes(term));
    }

    let html = `
        <div class="conta-card p-3 mb-4">
            <form onsubmit="event.preventDefault(); ContaApp.filtrarInventario(${cuentaInventarioId});" class="flex items-end gap-3">
                <div>
                    <label class="text-xs font-semibold">Buscar por Nombre</label>
                    <input type="search" id="inventario-search" class="conta-input w-full md:w-80" value="${params.search || ''}" placeholder="Escribe para filtrar...">
                </div>
                <button type="submit" class="conta-btn">BUSCAR</button>
            </form>
        </div>`;

    if (productosFiltrados.length === 0) {
        html += `<div class="conta-card text-center p-8 text-[var(--color-text-secondary)]">
            <i class="fa-solid fa-box-open fa-3x mb-4 opacity-50"></i>
            <h3 class="font-bold text-lg">Sin Productos</h3>
            <p>No se encontraron productos en esta categoría.</p>
        </div>`;
        document.getElementById('inventario-contenido').innerHTML = html;
        this.actualizarEstadoBotonTransferencia();
        return;
    }

    const { currentPage, perPage } = this.getPaginationState('inventario');
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    productosFiltrados.sort((a,b) => (a.nombre || '').localeCompare(b.nombre || ''));
    const itemsParaMostrar = productosFiltrados.slice(startIndex, endIndex);

    let tableRowsHTML = '';
    itemsParaMostrar.forEach(p => {
        const stockTotal = p.tipo === 'producto'
            ? Object.values(p.stockPorSucursal || {}).reduce((s,c) => s + Number(c || 0), 0)
            : 0;
        const unidad = this.findById(this.unidadesMedida, p.unidadMedidaId);
        const unidadDisplay = p.tipo === 'producto' ? (unidad ? unidad.nombre : 'N/A') : 'N/A';

        let desgloseStockHTML = '';
        if (p.tipo === 'producto' && p.stockPorSucursal) {
            const info = Object.entries(p.stockPorSucursal).map(([sid, stk]) => {
                const suc = (this.getSucursalesActivas() || []).find(s => String(s.id) === String(sid));
                return `${suc ? suc.nombre : 'Desconocida'}: ${stk}`;
            }).join('\n');
            desgloseStockHTML = `title="Desglose por Sucursal:\n${info}"`;
        }

        tableRowsHTML += `
        <tr class="hover:bg-[var(--color-bg-accent)]">
            <td class="conta-table-td w-10 text-center" onclick="event.stopPropagation()">
                <input type="checkbox" class="inventario-checkbox" value="${p.id}" onclick="ContaApp.actualizarEstadoBotonTransferencia()">
            </td>
            <td class="conta-table-td font-bold">
                <button class="underline" onclick="ContaApp.irModulo('inventario', { productoId: '${p.id}' })" title="Ver Kardex">${p.nombre || '—'}</button>
            </td>
            <td class="conta-table-td text-right font-mono" ${desgloseStockHTML}>${p.tipo === 'producto' ? stockTotal : 'N/A'}</td>
            <td class="conta-table-td">${unidadDisplay}</td>
            <td class="conta-table-td text-right font-mono">${this.formatCurrency(p.precio || 0)}</td>
            <td class="conta-table-td text-right font-mono">${this.formatCurrency(p.costo || 0)}</td>
            <td class="conta-table-td text-center">
                <button class="conta-btn conta-btn-small" onclick="ContaApp.abrirModalVentaRapida && ContaApp.abrirModalVentaRapida('${p.id}')">Vender</button>
                <button class="conta-btn-icon edit" title="Editar" onclick="ContaApp.abrirModalProducto('${p.id}')"><i class="fa-solid fa-pencil"></i></button>
            </td>
        </tr>`;
    });

    html += `
    <div class="conta-card overflow-auto">
        <table class="min-w-full text-sm conta-table-zebra">
            <thead>
                <tr>
                    <th class="conta-table-th w-10 text-center">
                        <input type="checkbox" onclick="
                            const bodyCbs = document.querySelectorAll('#inventario-contenido tbody input[type=checkbox]');
                            bodyCbs.forEach(cb => cb.checked = this.checked);
                            ContaApp.actualizarEstadoBotonTransferencia();
                        ">
                    </th>
                    <th class="conta-table-th">Nombre</th>
                    <th class="conta-table-th text-right">Stock Total</th>
                    <th class="conta-table-th">Unidad</th>
                    <th class="conta-table-th text-right">Precio Venta</th>
                    <th class="conta-table-th text-right">Costo</th>
                    <th class="conta-table-th text-center">Acciones</th>
                </tr>
            </thead>
            <tbody>${tableRowsHTML}</tbody>
        </table>
    </div>`;

    document.getElementById('inventario-contenido').innerHTML = html;

    // Paginación y reevaluación del botón
    this.renderPaginationControls('inventario', productosFiltrados.length);
    this.actualizarEstadoBotonTransferencia();
},
    renderInventarioReporteVista() {
        document.getElementById('page-actions-header').innerHTML = `
            <div class="flex gap-2">
                <button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarReporteEstilizadoPDF('Reporte de Inventario', 'reporte-inventario-area')"><i class="fa-solid fa-print me-2"></i>Imprimir PDF</button>
            </div>`;

        let totalValorInventario = 0;
        let html = `<div class="conta-card overflow-auto" id="reporte-inventario-area">
            <div class="text-center p-4">
                <h3 class="text-lg font-semibold">Reporte de Valor de Inventario</h3>
                <p class="text-sm text-[var(--color-text-secondary)]">Al ${this.getTodayDate()}</p>
            </div>
            <table class="min-w-full text-sm conta-table-zebra">
                <thead><tr>
                    <th class="conta-table-th">Nombre</th><th class="conta-table-th">Tipo</th>
                    <th class="conta-table-th text-right">Stock</th><th class="conta-table-th text-right">Costo Unit.</th>
                    <th class="conta-table-th text-right">Precio Venta</th><th class="conta-table-th text-right">Valor Total</th>
                </tr></thead><tbody>`;

        this.productos.forEach(p => {
            const valorTotal = p.tipo === 'producto' ? p.stock * p.costo : 0;
            totalValorInventario += valorTotal;
            html += `<tr>
                <td class="conta-table-td font-bold">${p.nombre}</td>
                <td class="conta-table-td">${p.tipo}</td>
                <td class="conta-table-td text-right font-mono">${p.tipo === 'producto' ? p.stock : 'N/A'}</td>
                <td class="conta-table-td text-right font-mono">${this.formatCurrency(p.costo)}</td>
                <td class="conta-table-td text-right font-mono">${this.formatCurrency(p.precio)}</td>
                <td class="conta-table-td text-right font-mono font-bold">${this.formatCurrency(valorTotal)}</td>
            </tr>`;
        });
        
        html += `</tbody>
                 <tfoot class="bg-[var(--color-bg-accent)] font-bold text-lg">
                    <tr>
                        <td colspan="5" class="conta-table-td">Valor Total del Inventario</td>
                        <td class="conta-table-td text-right font-mono">${this.formatCurrency(totalValorInventario)}</td>
                    </tr>
                 </tfoot>
                 </table>
            </div>`;
        document.getElementById('inventario-contenido').innerHTML = html; // <-- CORRECCIÓN AQUÍ
    },
    renderInventario_Kardex(productoId) {
    const producto = this.findById(this.productos, productoId);
    if (!producto) {
        this.showToast('Producto no encontrado.', 'error');
        this.irModulo('inventario');
        return;
    }

    document.getElementById('page-title-header').innerText = `Kardex de: ${producto.nombre}`;
    document.getElementById('page-actions-header').innerHTML = `
        <button class.conta-btn conta-btn-accent" onclick="ContaApp.exportarReporteEstilizadoPDF('Kardex - ${producto.nombre}', 'reporte-kardex-area')">Imprimir PDF</button>
    `;

    let movimientos = [];
    this.transacciones.forEach(t => {
        const fechaMovimiento = t.fechaCompletada || t.fecha;
        // --- INICIO DE LA CORRECCIÓN: Añadir "entrada_produccion" a la lista de tipos válidos ---
        if (['compra_inventario', 'venta', 'ajuste_inventario', 'salida_produccion', 'entrada_produccion'].includes(t.tipo) && t.estado !== 'Anulada') {
            
            if (t.tipo === 'ajuste_inventario' && t.productoId == productoId) {
                const entrada = t.tipoAjuste === 'entrada' ? t.cantidad : 0;
                const salida = t.tipoAjuste === 'salida' ? t.cantidad : 0;
                movimientos.push({ fecha: fechaMovimiento, detalle: t.descripcion, entrada, salida, costoUnitario: t.costo });
            } else if (t.items) {
                (t.items).forEach(item => {
                    if (item.productoId == productoId) {
                        let entrada = 0, salida = 0, detalle = '', costoUnitario = 0;
                        
                        if (t.tipo === 'compra_inventario') {
                            entrada = item.cantidad;
                            detalle = t.descripcion || `Compra s/f #${t.referencia || t.id}`;
                            costoUnitario = item.costoUnitario || item.costo;
                        } else if (t.tipo === 'venta') {
                            salida = item.cantidad;
                            detalle = `Venta s/f #${t.numeroFactura || t.id}`;
                            costoUnitario = item.costo;
                        } else if (t.tipo === 'salida_produccion') {
                            salida = item.cantidad;
                            detalle = t.descripcion;
                            costoUnitario = item.costo;
                        // --- INICIO DE LA CORRECCIÓN: Añadir la lógica para la nueva transacción ---
                        } else if (t.tipo === 'entrada_produccion') {
                            entrada = item.cantidad;
                            detalle = t.descripcion;
                            costoUnitario = item.costoUnitario;
                        }
                        // --- FIN DE LA CORRECCIÓN ---
                        movimientos.push({ fecha: fechaMovimiento, detalle, entrada, salida, costoUnitario });
                    }
                });
            }
        }
    });
    
    movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    let filasHTML = '';
    let saldoCorriente = 0;
    let valorCorriente = 0;
    let costoPromedio = 0;

    movimientos.forEach(mov => {
        const totalEntrada = mov.entrada * mov.costoUnitario;
        const totalSalida = mov.salida * costoPromedio; 
        
        saldoCorriente += mov.entrada - mov.salida;
        valorCorriente += totalEntrada - totalSalida;
        costoPromedio = saldoCorriente > 0 ? valorCorriente / saldoCorriente : 0;
        
        filasHTML += `
            <tr>
                <td class="conta-table-td">${mov.fecha}</td>
                <td class="conta-table-td">${mov.detalle}</td>
                <td class="conta-table-td text-right font-mono">${mov.entrada || ''}</td>
                <td class="conta-table-td text-right font-mono">${mov.salida || ''}</td>
                <td class="conta-table-td text-right font-mono font-bold">${saldoCorriente}</td>
                <td class="conta-table-td text-right font-mono">${this.formatCurrency(mov.costoUnitario)}</td>
                <td class="conta-table-td text-right font-mono">${this.formatCurrency(valorCorriente)}</td>
            </tr>
        `;
    });

    const html = `<div class="conta-card overflow-auto" id="reporte-kardex-area">... (resto del HTML igual) ...</div>`;
    document.getElementById('inventario').innerHTML = html.replace('... (resto del HTML igual) ...', `<table class="min-w-full text-sm conta-table-zebra"><thead><tr><th class="conta-table-th">Fecha</th><th class="conta-table-th">Detalle</th><th class="conta-table-th text-right">Entrada</th><th class="conta-table-th text-right">Salida</th><th class="conta-table-th text-right">Saldo (Stock)</th><th class="conta-table-th text-right">Costo Unitario</th><th class="conta-table-th text-right">Valor Total</th></tr></thead><tbody>${filasHTML}</tbody></table>`);
},

    generarReporteKardex() {
        const productoId = parseInt(document.getElementById('kardex-producto').value);
        const fechaInicio = document.getElementById('kardex-fecha-inicio').value;
        const fechaFin = document.getElementById('kardex-fecha-fin').value || this.getTodayDate();
        const producto = this.findById(this.productos, productoId);

        // 1. Recolectar todos los movimientos relevantes
        let movimientos = [];
        this.transacciones.forEach(t => {
            if (t.fecha > fechaFin) return;

            if (t.tipo === 'venta' && t.estado !== 'Anulada') {
                t.items.forEach(item => {
                    if (item.itemType === 'producto' && item.productoId === productoId) {
                        movimientos.push({
                            fecha: t.fecha,
                            tipo: 'Venta',
                            detalle: `Factura #${t.numeroFactura || t.id}`,
                            entrada: 0,
                            salida: item.cantidad,
                            costoUnitario: item.costo
                        });
                    }
                });
            } else if (t.tipo === 'ajuste_inventario' && t.productoId === productoId) {
                movimientos.push({
                    fecha: t.fecha,
                    tipo: 'Ajuste',
                    detalle: t.descripcion,
                    entrada: t.tipoAjuste === 'entrada' ? t.cantidad : 0,
                    salida: t.tipoAjuste === 'salida' ? t.cantidad : 0,
                    costoUnitario: t.costo
                });
            }
        });

        // 2. Calcular el saldo inicial
        let saldoInicial = 0;
        const productoOriginal = this.productos.find(p => p.id === productoId);
        if (productoOriginal) {
            // Partimos del stock original que se registró al crear el producto
            saldoInicial = productoOriginal.stock; 
            // Y luego restamos todos los movimientos futuros para obtener el stock actual
            movimientos.forEach(mov => {
                saldoInicial = saldoInicial - mov.entrada + mov.salida;
            });
        }
        
        // 3. Filtrar movimientos por fecha y ordenar
        const movimientosPeriodo = movimientos
            .filter(m => !fechaInicio || m.fecha >= fechaInicio)
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        // 4. Construir el HTML del reporte
        let html = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="conta-subtitle !mb-0">Kardex de: ${producto.nombre}</h2>
                <div><button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarReporteEstilizadoPDF('Kardex - ${producto.nombre}', 'reporte-kardex-area')">Imprimir PDF</button></div>
            </div>
            <div class="conta-card overflow-auto" id="reporte-kardex-area">
                <table class="min-w-full text-sm conta-table-zebra">
                    <thead>
                        <tr>
                            <th class="conta-table-th" rowspan="2">Fecha</th>
                            <th class="conta-table-th" rowspan="2">Detalle</th>
                            <th class="conta-table-th text-center" colspan="3">Entradas</th>
                            <th class="conta-table-th text-center" colspan="3">Salidas</th>
                            <th class="conta-table-th text-center" colspan="3">Saldos</th>
                        </tr>
                        <tr>
                            <th class="conta-table-th text-right">Cant.</th><th class="conta-table-th text-right">Costo U.</th><th class="conta-table-th text-right">Total</th>
                            <th class="conta-table-th text-right">Cant.</th><th class="conta-table-th text-right">Costo U.</th><th class="conta-table-th text-right">Total</th>
                            <th class="conta-table-th text-right">Cant.</th><th class="conta-table-th text-right">Costo U.</th><th class="conta-table-th text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="9" class="conta-table-td font-bold">Saldo Anterior</td>
                            <td class="conta-table-td text-right font-mono font-bold">${saldoInicial}</td>
                            <td class="conta-table-td text-right font-mono font-bold">${this.formatCurrency(producto.costo)}</td>
                            <td class="conta-table-td text-right font-mono font-bold">${this.formatCurrency(saldoInicial * producto.costo)}</td>
                        </tr>
        `;

        let saldoCorriente = saldoInicial;
        movimientosPeriodo.forEach(mov => {
            saldoCorriente = saldoCorriente + mov.entrada - mov.salida;
            html += `
                <tr>
                    <td class="conta-table-td">${mov.fecha}</td>
                    <td class="conta-table-td">${mov.detalle}</td>
                    <td class="conta-table-td text-right font-mono">${mov.entrada || ''}</td>
                    <td class="conta-table-td text-right font-mono">${mov.entrada ? this.formatCurrency(mov.costoUnitario) : ''}</td>
                    <td class="conta-table-td text-right font-mono">${mov.entrada ? this.formatCurrency(mov.entrada * mov.costoUnitario) : ''}</td>
                    <td class="conta-table-td text-right font-mono">${mov.salida || ''}</td>
                    <td class="conta-table-td text-right font-mono">${mov.salida ? this.formatCurrency(mov.costoUnitario) : ''}</td>
                    <td class="conta-table-td text-right font-mono">${mov.salida ? this.formatCurrency(mov.salida * mov.costoUnitario) : ''}</td>
                    <td class="conta-table-td text-right font-mono font-bold">${saldoCorriente}</td>
                    <td class="conta-table-td text-right font-mono font-bold">${this.formatCurrency(producto.costo)}</td>
                    <td class="conta-table-td text-right font-mono font-bold">${this.formatCurrency(saldoCorriente * producto.costo)}</td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        document.getElementById('kardex-resultado').innerHTML = html;
    },
    abrirModalProducto(id = null) {
    const producto = id ? this.findById(this.productos, id) : {};
    const isEditing = id !== null;

    const unidadesOptions = this.unidadesMedida
        .map(u => `<option value="${u.id}" ${producto.unidadMedidaId == u.id ? 'selected' : ''}>${u.nombre}</option>`)
        .join('');
    
    const cuentasInventarioOptions = this.planDeCuentas
        .filter(c => c.parentId === 130)
        .map(c => `<option value="${c.id}" ${producto.cuentaInventarioId == c.id ? 'selected' : ''}>${c.nombre}</option>`)
        .join('');
    
    // --- INICIO DE LA MODIFICACIÓN ---
    let stockDetalleHTML = '';
    if (isEditing && producto.tipo === 'producto' && producto.stockPorSucursal) {
        const filasDetalle = Object.entries(producto.stockPorSucursal).map(([sucursalId, stock]) => {
            const sucursal = this.empresa.sucursales.find(s => s.id === sucursalId);
            return `
                <div class="flex justify-between items-center py-1 border-b border-[var(--color-border-accent)]">
                    <span class="text-sm">${sucursal ? sucursal.nombre : 'Sucursal Desconocida'}</span>
                    <span class="font-mono font-bold">${stock}</span>
                </div>`;
        }).join('');

        stockDetalleHTML = `
            <div class="mt-4">
                <label class="font-semibold">Stock Actual por Sucursal</label>
                <div class="p-3 mt-1 rounded-lg bg-[var(--color-bg-accent)]">
                    ${filasDetalle || '<p class="text-sm text-center text-[var(--color-text-secondary)]">Sin stock registrado.</p>'}
                </div>
            </div>`;
    }
    
    const modalHTML = `<h3 class="conta-title mb-4">${id ? 'Editar' : 'Nuevo'} Producto/Servicio</h3>
    <form onsubmit="ContaApp.guardarProducto(event, '${id || ''}')" class="space-y-4 modal-form">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label>Nombre</label><input type="text" id="prod-nombre" class="w-full p-2 mt-1" value="${producto.nombre || ''}" required></div>
            <div><label>Tipo</label><select id="prod-tipo" class="w-full p-2 mt-1" required>
                <option value="producto" ${producto.tipo === 'producto' ? 'selected' : ''}>Producto (con stock)</option>
                <option value="servicio" ${producto.tipo === 'servicio' ? 'selected' : ''}>Servicio</option>
            </select></div>
        </div>

        <div>
            <label>Categoría de Inventario</label>
            <select id="prod-cuenta-inventario" class="w-full p-2 mt-1">${cuentasInventarioOptions}</select>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label>Unidad de Medida</label>
                <select id="prod-unidad" class="w-full p-2 mt-1">${unidadesOptions}</select>
            </div>
            <div><label>Costo Unitario</label><input type="number" step="0.01" id="prod-costo" class="w-full p-2 mt-1" value="${producto.costo || 0}"></div>
            <div><label>Precio de Venta</label><input type="number" step="0.01" id="prod-precio" class="w-full p-2 mt-1" value="${producto.precio || 0}" required></div>
        </div>
        
        ${stockDetalleHTML}

        <div class="flex justify-end gap-2 mt-6"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button type="submit" class="conta-btn">${isEditing ? 'Guardar Cambios' : 'Crear'}</button></div>
    </form>`;
    // --- FIN DE LA MODIFICACIÓN ---

    this.showModal(modalHTML, '4xl');

    if (isEditing) {
        document.getElementById('prod-unidad').value = producto.unidadMedidaId || 1;
        document.getElementById('prod-cuenta-inventario').value = producto.cuentaInventarioId || 13001;
    } else {
        document.getElementById('prod-cuenta-inventario').value = 13001;
    }
},
            async guardarProducto(e, id) {
    e.preventDefault();

    // Lee los datos del formulario del modal
    const data = {
        nombre: document.getElementById('prod-nombre').value,
        tipo: document.getElementById('prod-tipo').value, // 'producto' | 'servicio'
        cuentaInventarioId: parseInt(document.getElementById('prod-cuenta-inventario').value),
        unidadMedidaId: parseInt(document.getElementById('prod-unidad').value) || null,
        stockMinimo: 0,
        costo: parseFloat(document.getElementById('prod-costo').value) || 0,
        precio: parseFloat(document.getElementById('prod-precio').value) || 0,
        // Cuenta de ingresos por defecto (detalle válida)
        cuentaIngresoId: 41001
    };

    try {
        if (id) {
            // EDITAR: actualiza el producto existente sin tocar el stock
            const productoOriginal = this.findById(this.productos, id);
            Object.assign(productoOriginal, data);
            await this.repository.actualizarMultiplesDatos({ productos: this.productos });
        } else {
            // CREAR: usa spread correcto (...data) y NO inicializa stock manual
            const nuevoProducto = {
                id: this.generarUUID(),
                ...data,
                // Importante: modelo nuevo usa stockPorSucursal; empieza vacío
                stockPorSucursal: {}
            };
            this.productos.push(nuevoProducto);
            await this.repository.actualizarMultiplesDatos({ productos: this.productos });
        }

        this.closeModal();
        this.irModulo('inventario');
        this.showToast(`Producto/Servicio ${id ? 'actualizado' : 'creado'} con éxito.`, 'success');
    } catch (error) {
        console.error("Error al guardar producto:", error);
        this.showToast(`Error al guardar: ${error.message}`, 'error');
    }
},
    abrirModalAjusteInventario(productoId) {
    const producto = this.findById(this.productos, productoId);
    if(!producto || producto.tipo !== 'producto') {
        this.showToast('Solo se puede ajustar el stock de productos.', 'error');
        return;
    }

    // --- INICIO DE LA CORRECCIÓN ---
    // Se ha modificado el filtro para incluir las cuentas de GASTO (código '6').
    const cuentasContrapartidaOptions = this.planDeCuentas
        .filter(c => c.tipo === 'DETALLE' && (c.codigo.startsWith('1') || c.codigo.startsWith('3') || c.codigo.startsWith('5') || c.codigo.startsWith('6')))
        .sort((a,b) => a.codigo.localeCompare(b.codigo, undefined, {numeric: true}))
        // Se ha corregido la cuenta preseleccionada a la de "Merma de Inventario" (ID 61003).
        .map(c => `<option value="${c.id}" ${c.id === 61003 ? 'selected' : ''}>${c.codigo} - ${c.nombre}</option>`).join('');
    // --- FIN DE LA CORRECCIÓN ---

    const modalHTML = `<h3 class="conta-title mb-4">Ajuste de Inventario</h3>
    <p class="mb-2"><strong>Producto:</strong> ${producto.nombre}</p>
    <p class="mb-6 text-[var(--color-text-secondary)]"><strong>Stock Actual:</strong> ${producto.stock} unidades</p>
    <form onsubmit="ContaApp.guardarAjusteInventario(event, '${producto.id}')" class="space-y-4 modal-form">
        <div>
            <label for="ajuste-tipo">Tipo de Ajuste</label>
            <select id="ajuste-tipo" class="w-full conta-input mt-1">
                <option value="salida">Salida (Merma / Pérdida)</option>
                <option value="entrada">Entrada (Corrección)</option>
            </select>
        </div>
        <div>
            <label for="ajuste-cantidad">Cantidad a ajustar</label>
            <input type="number" id="ajuste-cantidad" class="w-full conta-input mt-1" min="1" required>
        </div>
        <div>
            <label for="ajuste-cuenta-contrapartida">Cuenta de Contrapartida</label>
            <select id="ajuste-cuenta-contrapartida" class="w-full conta-input mt-1" required>${cuentasContrapartidaOptions}</select>
        </div>
         <div>
            <label for="ajuste-fecha">Fecha del Ajuste</label>
            <input type="date" id="ajuste-fecha" value="${this.getTodayDate()}" class="w-full conta-input mt-1" required>
        </div>
        <div class="flex justify-end gap-2 mt-6">
            <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
            <button type="submit" class="conta-btn">Confirmar Ajuste</button>
        </div>
    </form>`;
    this.showModal(modalHTML, 'xl');
},
            async guardarAjusteInventario(e, productoId) {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    this.toggleButtonLoading(submitButton, true);

    try {
        const producto = this.findById(this.productos, productoId);
        const tipoAjuste = document.getElementById('ajuste-tipo').value;
        const cantidad = parseFloat(document.getElementById('ajuste-cantidad').value);
        const cuentaContrapartidaId = parseInt(document.getElementById('ajuste-cuenta-contrapartida').value);
        const fecha = document.getElementById('ajuste-fecha').value;

        if (isNaN(cantidad) || cantidad <= 0) {
            throw new Error('La cantidad a ajustar debe ser un número positivo.');
        }

        if (tipoAjuste === 'salida' && cantidad > producto.stock) {
            throw new Error('La cantidad a dar de baja no puede ser mayor al stock actual.');
        }

        const valorAjuste = cantidad * producto.costo;
        let descripcionAsiento, movimientos;

        // 1. Modificar el estado local del stock
        if (tipoAjuste === 'entrada') {
            producto.stock += cantidad;
            descripcionAsiento = `Ajuste de entrada de inventario: ${cantidad} x ${producto.nombre}`;
            movimientos = [
                { cuentaId: producto.cuentaInventarioId, debe: valorAjuste, haber: 0 },
                { cuentaId: cuentaContrapartidaId, debe: 0, haber: valorAjuste }
            ];
        } else { // Salida
            producto.stock -= cantidad;
            descripcionAsiento = `Ajuste de salida (merma) de inventario: ${cantidad} x ${producto.nombre}`;
            movimientos = [
                { cuentaId: cuentaContrapartidaId, debe: valorAjuste, haber: 0 },
                { cuentaId: producto.cuentaInventarioId, debe: 0, haber: valorAjuste }
            ];
        }

        // 2. Crear la transacción de ajuste
        const transaccionAjuste = {
            id: this.generarUUID(), // Usando UUID
            tipo: 'ajuste_inventario',
            fecha,
            productoId,
            cantidad,
            costo: producto.costo,
            tipoAjuste,
            descripcion: descripcionAsiento
        };
        this.transacciones.push(transaccionAjuste);

        // 3. Crear el asiento contable (que también se añade a this.asientos)
        const asiento = this.crearAsiento(fecha, descripcionAsiento, movimientos, transaccionAjuste.id);
        
        if (!asiento) {
            // Revertir los cambios locales si la creación del asiento falla
            if (tipoAjuste === 'entrada') {
                producto.stock -= cantidad;
            } else {
                producto.stock += cantidad;
            }
            this.transacciones.pop();
            throw new Error("No se pudo generar el asiento contable para el ajuste.");
        }

        // 4. Guardar todo el estado actualizado de la aplicación
        await this.saveAll();

        this.closeModal();
        this.irModulo('inventario');
        this.showToast('Ajuste de inventario registrado con éxito.', 'success');
    } catch (error) {
        console.error("Error al guardar ajuste de inventario:", error);
        this.showToast(`Error al guardar: ${error.message}`, 'error');
    } finally {
        this.toggleButtonLoading(submitButton, false);
    }
},
    exportarInventarioCSV() {
        const dataParaExportar = this.productos.map(p => ({
            'Nombre': p.nombre,
            'Tipo': p.tipo,
            'Stock': p.tipo === 'producto' ? p.stock : 'N/A',
            'Stock_Minimo': p.tipo === 'producto' ? p.stockMinimo : 'N/A',
            'Costo_Unitario': p.costo,
            'Precio_Venta': p.precio,
            'Valor_Total_Costo': p.tipo === 'producto' ? p.stock * p.costo : 0
        }));
        this.exportarA_CSV(`inventario_${this.getTodayDate()}.csv`, dataParaExportar);
    },
    abrirSubModalNuevoProducto(origen) {
        let selectorQuery;
        let esInput = false;

        if (origen === 'gasto') {
            selectorQuery = '.gasto-item-producto-id';
        } else if (origen === 'venta') {
            selectorQuery = '.venta-item-id';
        } else if (origen === 'compra') {
            selectorQuery = '.compra-item-producto-id';
        } else if (origen === 'produccion') {
            selectorQuery = '#op-producto-terminado-input';
            esInput = true;
        } else {
            this.showToast('Error: Origen de sub-modal desconocido.', 'error');
            return;
        }

        let elementToUpdate;
        if (esInput) {
            elementToUpdate = document.querySelector(selectorQuery);
        } else {
            elementToUpdate = Array.from(document.querySelectorAll(selectorQuery)).pop();
        }
        
        if (!elementToUpdate) {
            this.showToast('Error: No se encontró el elemento a actualizar.', 'error');
            return;
        }

        if (!elementToUpdate.id) {
            elementToUpdate.id = `element-on-the-fly-${Date.now()}`;
        }

        const subModal = document.createElement('div');
        subModal.id = 'sub-modal-bg';
        subModal.onclick = () => document.body.removeChild(subModal);
        
        const subModalContent = document.createElement('div');
        subModalContent.className = 'p-6 rounded-lg shadow-xl w-full max-w-md modal-content';
        subModalContent.onclick = e => e.stopPropagation();

        subModalContent.innerHTML = `
            <h3 class="conta-title mb-4">Nuevo Producto Rápido</h3>
            <form onsubmit="event.preventDefault(); ContaApp.guardarNuevoProductoDesdeSubModal(event, '${elementToUpdate.id}')" class="space-y-4 modal-form">
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

    guardarNuevoProductoDesdeSubModal(e, elementIdToUpdate) {
    const data = {
        nombre: document.getElementById('sub-prod-nombre').value,
        precio: parseFloat(document.getElementById('sub-prod-precio').value),
        costo: parseFloat(document.getElementById('sub-prod-costo').value) || 0,
    };

    const nuevoProducto = {
        id: this.idCounter++,
        nombre: data.nombre,
        tipo: 'producto',
        stock: 0,
        stockMinimo: 0,
        costo: data.costo,
        precio: data.precio,
        // --- INICIO DE LA CORRECCIÓN ---
        // Se asegura de que la cuenta de ingresos sea una cuenta de detalle válida.
        cuentaIngresoId: 41001, 
        // Se añade la categoría de inventario por defecto para consistencia.
        cuentaInventarioId: 13001 
        // --- FIN DE LA CORRECCIÓN ---
    };
    this.productos.push(nuevoProducto);
    this.saveAll();

    const todosLosSelectores = document.querySelectorAll('.gasto-item-producto-id, .venta-item-id, .compra-item-producto-id, #productos-terminados-datalist');
    
    todosLosSelectores.forEach(el => {
        const option = document.createElement('option');
        if (el.tagName === 'DATALIST') {
            option.value = nuevoProducto.nombre;
            option.dataset.id = nuevoProducto.id;
        } else {
            option.value = nuevoProducto.id;
            option.text = nuevoProducto.nombre;
            option.dataset.precio = nuevoProducto.precio;
        }
        el.appendChild(option);
    });

    const elementActivo = document.getElementById(elementIdToUpdate);
    if (elementActivo) {
        if (elementActivo.tagName === 'INPUT') {
            elementActivo.value = nuevoProducto.nombre;
            const hiddenInputId = elementActivo.id.replace('-input', '-id');
            const hiddenInput = document.getElementById(hiddenInputId);
            if(hiddenInput) hiddenInput.value = nuevoProducto.id;
        } else {
            elementActivo.value = nuevoProducto.id;
        }
        elementActivo.dispatchEvent(new Event('change', { bubbles: true }));
    }

    this.showToast('Producto creado y seleccionado.', 'success');
    document.body.removeChild(document.getElementById('sub-modal-bg'));
},
        venderDesdeInventario(productoId) {
        const producto = this.findById(this.productos, productoId);
        if (!producto) {
            this.showToast('Error: Producto no encontrado.', 'error');
            return;
        }

        // Pre-cargamos el producto en la variable temporal
        this.tempItemsParaVenta = [{
            itemType: 'producto',
            productoId: producto.id,
            cantidad: 1,
            precio: producto.precio,
            costo: producto.costo
        }];

        // --- INICIO DE LA MEJORA ---
        // Navegamos al módulo de ventas y le pasamos la instrucción de crear un nuevo documento.
        this.irModulo('ventas', { action: 'new' });
        // --- FIN DE LA MEJORA ---
    },
    // --- INICIO DE CÓDIGO NUEVO ---

/**
 * Activa o desactiva el botón de transferencia basado en la selección y el número de sucursales.
 */
actualizarEstadoBotonTransferencia() {
    const btn = document.getElementById('transfer-btn');
    if (!btn) return;

    // 1) Selección (tolerante: usa la clase si existe; si no, busca checkboxes dentro del área)
    let seleccionados = Array.from(document.querySelectorAll('.inventario-checkbox:checked'));
    if (seleccionados.length === 0) {
        const area = document.getElementById('inventario-contenido') || document;
        seleccionados = Array.from(area.querySelectorAll('tbody input[type="checkbox"]:checked'));
    }

    // 2) Sucursales disponibles (sucursales o centros de costo)
    const sucursales = this.getSucursalesActivas();
    const tieneMasDeUnaSucursal = (sucursales.filter(Boolean).length >= 2);

    // 3) Licencia
    const multiOk = (this.isMultiSucursalActivo && this.isMultiSucursalActivo()) ? true : false;

    // 4) Determinar si puede transferir
    const puedeTransferir = multiOk && tieneMasDeUnaSucursal && seleccionados.length > 0;

    // 5) Aplicar estado + tooltip de motivo
    btn.disabled = !puedeTransferir;
    if (!multiOk) {
        btn.title = 'Disponible en plan Multi-Sucursal. Actualiza tu licencia.';
    } else if (!tieneMasDeUnaSucursal) {
        btn.title = 'Necesitas al menos dos sucursales para transferir.';
    } else if (seleccionados.length === 0) {
        btn.title = 'Selecciona uno o más productos para transferir.';
    } else {
        btn.title = '';
    }

    // Log de apoyo (para debug rápido en consola)
    console.debug('[Transferencia] multiOk:', multiOk, '| sucursales:', sucursales.length, '| seleccionados:', seleccionados.length, '| habilitado:', !btn.disabled);
},
getSucursalesActivas() {
    const s = Array.isArray(this.empresa?.sucursales) ? this.empresa.sucursales : [];
    if (s.length > 0) return s;
    const cc = Array.isArray(this.empresa?.centrosDeCosto) ? this.empresa.centrosDeCosto : [];
    return cc.map(c => ({ id: String(c.id), nombre: c.nombre }));
},
/**
 * Selecciona o deselecciona todos los checkboxes de la lista de inventario.
 * @param {HTMLInputElement} checkboxPrincipal - El checkbox de la cabecera de la tabla.
 */
toggleSeleccionInventario(checkboxPrincipal) {
    const todosLosCheckboxes = document.querySelectorAll('.inventario-checkbox');
    todosLosCheckboxes.forEach(cb => {
        cb.checked = checkboxPrincipal.checked;
    });
    this.actualizarEstadoBotonTransferencia();
},
abrirModalTransferenciaInventario() {
    // Licencia
    if (!(this.isMultiSucursalActivo && this.isMultiSucursalActivo())) {
        this.showToast('Función disponible en plan Multi-Sucursal.', 'error');
        return;
    }

    // Selección
    let seleccionados = Array.from(document.querySelectorAll('.inventario-checkbox:checked'));
    if (seleccionados.length === 0) {
        const area = document.getElementById('inventario-contenido') || document;
        seleccionados = Array.from(area.querySelectorAll('tbody input[type="checkbox"]:checked'));
    }
    if (seleccionados.length === 0) {
        this.showToast('Debes seleccionar al menos un producto para transferir.', 'error');
        return;
    }

    // Sucursales
    const sucursales = this.getSucursalesActivas();
    if (!sucursales || sucursales.length < 2) {
        this.showToast('Necesitas al menos dos sucursales para transferir.', 'error');
        return;
    }

    const sucursalesOptions = sucursales.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
    let itemsHTML = '';
    seleccionados.forEach(cb => {
        const producto = this.findById(this.productos, cb.value);
        if (!producto) return;
        itemsHTML += `
            <div class="transfer-item-row grid grid-cols-12 gap-4 items-center py-2 border-b border-[var(--color-border-accent)]" data-product-id="${producto.id}">
                <div class="col-span-6 font-semibold">${producto.nombre}</div>
                <div class="col-span-3 text-sm text-[var(--color-text-secondary)]">
                    Stock Origen: <span class="stock-origen-display font-mono">--</span>
                </div>
                <div class="col-span-3">
                    <input type="number" min="0" class="w-full conta-input text-right transfer-cantidad" placeholder="0" oninput="ContaApp.validarCantidadTransferencia && ContaApp.validarCantidadTransferencia(this)">
                </div>
            </div>`;
    });

    const modalHTML = `
        <h3 class="conta-title mb-4">Transferir Inventario entre Sucursales</h3>
        <form onsubmit="ContaApp.guardarTransferenciaInventario(event)" class="space-y-4 modal-form">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label>Desde (Sucursal Origen)</label>
                    <select id="transfer-origen" class="w-full conta-input mt-1" required onchange="ContaApp.actualizarStockOrigenTransferencia && ContaApp.actualizarStockOrigenTransferencia()">
                        <option value="">-- Seleccionar Origen --</option>
                        ${sucursalesOptions}
                    </select>
                </div>
                <div>
                    <label>Hacia (Sucursal Destino)</label>
                    <select id="transfer-destino" class="w-full conta-input mt-1" required>
                        <option value="">-- Seleccionar Destino --</option>
                        ${sucursalesOptions}
                    </select>
                </div>
            </div>
            <div class="conta-card p-4 mt-4">
                <h4 class="font-bold mb-2">Productos a Transferir</h4>
                <div id="transfer-items-container">${itemsHTML}</div>
            </div>
            <div class="flex justify-end gap-2 mt-6">
                <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                <button type="submit" class="conta-btn">Confirmar Transferencia</button>
            </div>
        </form>`;
    this.showModal(modalHTML, '4xl');
},

// --- INICIO DE CÓDIGO NUEVO ---

/**
 * Muestra el stock disponible para cada producto en el modal de transferencia
 * cuando el usuario selecciona una sucursal de origen.
 */
actualizarStockOrigenTransferencia() {
    const origenId = document.getElementById('transfer-origen').value;
    if (!origenId) return;

    document.querySelectorAll('.transfer-item-row').forEach(row => {
        const productoId = row.dataset.productId;
        const producto = this.findById(this.productos, productoId);
        const stockOrigen = producto.stockPorSucursal[origenId] || 0;
        
        row.querySelector('.stock-origen-display').textContent = stockOrigen;
        row.querySelector('.transfer-cantidad').max = stockOrigen;
    });
},

/**
 * Valida en tiempo real que la cantidad a transferir no exceda el stock de origen.
 * @param {HTMLInputElement} inputCantidad - El campo de cantidad que se está modificando.
 */
validarCantidadTransferencia(inputCantidad) {
    const maxStock = parseFloat(inputCantidad.max);
    const valorActual = parseFloat(inputCantidad.value);

    if (valorActual > maxStock) {
        inputCantidad.value = maxStock;
        this.showToast('La cantidad a transferir no puede exceder el stock de origen.', 'error');
    }
    if (valorActual < 0) {
        inputCantidad.value = 0;
    }
},

/**
 * Procesa y guarda la transferencia de inventario, actualizando el stock
 * y generando el asiento contable correspondiente.
 */
async guardarTransferenciaInventario(event) {
    event.preventDefault();
    const origenId = document.getElementById('transfer-origen').value;
    const destinoId = document.getElementById('transfer-destino').value;

    if (origenId === destinoId) {
        this.showToast('La sucursal de origen y destino no pueden ser la misma.', 'error');
        return;
    }

    const itemRows = document.querySelectorAll('.transfer-item-row');
    const itemsParaTransferir = [];
    let valorTotalTransferencia = 0;

    for (const row of itemRows) {
        const productoId = row.dataset.productId;
        const cantidadInput = row.querySelector('.transfer-cantidad');
        const cantidad = parseFloat(cantidadInput.value);

        if (cantidad > 0) {
            const producto = this.findById(this.productos, productoId);
            const stockOrigen = producto.stockPorSucursal[origenId] || 0;

            if (cantidad > stockOrigen) {
                this.showToast(`Error: La cantidad de "${producto.nombre}" excede el stock disponible en la sucursal de origen.`, 'error');
                return;
            }
            itemsParaTransferir.push({ producto, cantidad });
            valorTotalTransferencia += producto.costo * cantidad;
        }
    }

    if (itemsParaTransferir.length === 0) {
        this.showToast('Debes especificar la cantidad para al menos un producto.', 'error');
        return;
    }

    // Actualizar el estado del stock en la aplicación
    itemsParaTransferir.forEach(({ producto, cantidad }) => {
        // Restar del origen
        producto.stockPorSucursal[origenId] = (producto.stockPorSucursal[origenId] || 0) - cantidad;
        // Sumar al destino
        producto.stockPorSucursal[destinoId] = (producto.stockPorSucursal[destinoId] || 0) + cantidad;
    });

    // Crear el asiento contable
    const sucursalOrigen = this.empresa.sucursales.find(s => s.id === origenId);
    const sucursalDestino = this.empresa.sucursales.find(s => s.id === destinoId);
    const descripcionAsiento = `Transferencia de inventario de ${sucursalOrigen.nombre} a ${sucursalDestino.nombre}`;
    
    const movimientos = [];
    itemsParaTransferir.forEach(({ producto, cantidad }) => {
        const valorItem = producto.costo * cantidad;
        movimientos.push({
            cuentaId: producto.cuentaInventarioId,
            debe: 0,
            haber: valorItem,
            sucursalId: origenId
        });
        movimientos.push({
            cuentaId: producto.cuentaInventarioId,
            debe: valorItem,
            haber: 0,
            sucursalId: destinoId
        });
    });

    const asiento = this.crearAsiento(this.getTodayDate(), descripcionAsiento, movimientos);
    if (asiento) {
        await this.saveAll();
        this.closeModal();
        this.irModulo('inventario');
        this.showToast('Transferencia realizada con éxito.', 'success');
    }
},

// --- FIN DE CÓDIGO NUEVO ---
});