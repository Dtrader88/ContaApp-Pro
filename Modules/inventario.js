Object.assign(ContaApp, {

    filtrarInventario() {
        const search = document.getElementById('inventario-search').value;
        this.irModulo('inventario', { search });
    },
    renderInventario(params = {}) {
        const submodulo = params.submodulo || 'lista';

        let html = `
            <div class="flex gap-2 mb-4 border-b border-[var(--color-border-accent)] flex-wrap">
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'lista' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('inventario', {submodulo: 'lista'})">Lista de Productos</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'reporte' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('inventario', {submodulo: 'reporte'})">Reporte de Valor</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'kardex' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('inventario', {submodulo: 'kardex'})">Kardex por Producto</button>
            </div>
            <div id="inventario-contenido"></div>
        `;
        document.getElementById('inventario').innerHTML = html;

        if (submodulo === 'lista') {
            this.renderInventarioLista(params);
        } else if (submodulo === 'reporte') {
            this.renderInventarioReporteVista();
        } else if (submodulo === 'kardex') {
            this.renderInventario_TabKardex(params);
        }
    },
    renderInventarioLista(params = {}) {
        document.getElementById('page-actions-header').innerHTML = `
            <div class="flex gap-2 flex-wrap">
                <button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarInventarioCSV()"><i class="fa-solid fa-file-csv me-2"></i>Exportar CSV</button>
                <button class="conta-btn" onclick="ContaApp.abrirModalProducto()">+ Nuevo Producto/Servicio</button>
            </div>`;
        
        let productosFiltrados = this.productos;
        if (params.search) {
            const term = params.search.toLowerCase();
            productosFiltrados = this.productos.filter(p => p.nombre.toLowerCase().includes(term));
        }

        let html = `
            <div class="conta-card p-3 mb-4">
                <form onsubmit="event.preventDefault(); ContaApp.filtrarInventario();" class="flex items-end gap-3">
                    <div>
                        <label class="text-xs font-semibold">Buscar por Nombre</label>
                        <input type="search" id="inventario-search" class="conta-input w-full md:w-80" value="${params.search || ''}" placeholder="Escribe para filtrar...">
                    </div>
                    <button type="submit" class="conta-btn">Buscar</button>
                </form>
            </div>`;
            
        if (productosFiltrados.length === 0) {
            // Se comprueba si hay un término de búsqueda para mostrar el mensaje adecuado
            if (params.search) {
                html += `<div class="conta-card text-center p-8 text-[var(--color-text-secondary)]">
                            <i class="fa-solid fa-filter-circle-xmark fa-3x mb-4 opacity-50"></i>
                            <h3 class="font-bold text-lg">Sin Resultados</h3>
                            <p>No se encontraron productos que coincidan con "${params.search}".</p>
                         </div>`;
            } else {
                // Este es el estado vacío original si no hay productos en absoluto
                html += this.generarEstadoVacioHTML('fa-boxes-stacked', 'Tu inventario está vacío', 'Añade tu primer producto o servicio para empezar a gestionar tu stock y ventas.', '+ Crear Producto', "ContaApp.abrirModalProducto()");
            }
        } else {
            let tableRowsHTML = '';
            productosFiltrados.sort((a,b) => a.nombre.localeCompare(b.nombre)).forEach(p => {
                const isLowStock = p.tipo === 'producto' && p.stockMinimo > 0 && p.stock <= p.stockMinimo;
                const rowClass = isLowStock ? 'low-stock-row' : '';
                const stockDisplay = p.tipo === 'producto' ? p.stock : 'N/A';
                const lowStockIcon = isLowStock ? `<i class="fa-solid fa-triangle-exclamation text-[var(--color-danger)] ml-2" title="Stock bajo (Mínimo: ${p.stockMinimo})"></i>` : '';

                tableRowsHTML += `<tr class="${rowClass}">
                    <td class="conta-table-td font-bold">${p.nombre} ${lowStockIcon}</td>
                    <td class="conta-table-td">${p.tipo}</td>
                    <td class="conta-table-td text-right font-mono">${stockDisplay}</td>
                    <td class="conta-table-td text-right font-mono">${this.formatCurrency(p.precio)}</td>
                    <td class="conta-table-td text-right font-mono">${this.formatCurrency(p.costo)}</td>
                    <td class="conta-table-td text-center">
                        <button class="conta-btn-icon edit" title="Editar" onclick="ContaApp.abrirModalProducto(${p.id})"><i class="fa-solid fa-pencil"></i></button>
                        ${p.tipo === 'producto' ? `<button class="conta-btn conta-btn-small conta-btn-accent ml-2" title="Ajustar Stock" onclick="ContaApp.abrirModalAjusteInventario(${p.id})">Ajustar</button>` : ''}
                    </td>
                </tr>`;
            });
            html += `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra"><thead><tr>
                <th class="conta-table-th">Nombre</th><th class="conta-table-th">Tipo</th>
                <th class="conta-table-th text-right">Stock</th><th class="conta-table-th text-right">Precio Venta</th><th class="conta-table-th text-right">Costo</th>
                <th class="conta-table-th text-center">Acciones</th>
            </tr></thead><tbody>${tableRowsHTML}</tbody></table></div>`;
        }
        document.getElementById('inventario-contenido').innerHTML = html;
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
    renderInventario_TabKardex(params = {}) {
        const productosOptions = this.productos
            .filter(p => p.tipo === 'producto')
            .sort((a,b) => a.nombre.localeCompare(b.nombre))
            .map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');

        let html = `<div class="conta-card mb-6">
            <form onsubmit="event.preventDefault(); ContaApp.generarReporteKardex()" class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div class="md:col-span-2">
                    <label for="kardex-producto" class="text-sm font-medium">Producto</label>
                    <select id="kardex-producto" class="w-full conta-input mt-1" required>${productosOptions}</select>
                </div>
                <div>
                    <label for="kardex-fecha-inicio" class="text-sm font-medium">Desde</label>
                    <input type="date" id="kardex-fecha-inicio" class="w-full conta-input mt-1">
                </div>
                <div>
                    <label for="kardex-fecha-fin" class="text-sm font-medium">Hasta</label>
                    <input type="date" id="kardex-fecha-fin" class="w-full conta-input mt-1" value="${this.getTodayDate()}">
                </div>
                <button type="submit" class="conta-btn w-full md:w-auto">Generar Reporte</button>
            </form>
        </div>
        <div id="kardex-resultado"></div>`;
        document.getElementById('inventario-contenido').innerHTML = html;
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
        
        const unidadesOptions = this.unidadesMedida
            .map(u => `<option value="${u.id}" ${producto.unidadMedidaId === u.id ? 'selected' : ''}>${u.nombre}</option>`)
            .join('');

        const modalHTML = `<h3 class="conta-title mb-4">${id ? 'Editar' : 'Nuevo'} Producto/Servicio</h3>
        <form onsubmit="ContaApp.guardarProducto(event, ${id})" class="space-y-4 modal-form">
             <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label>Nombre</label><input type="text" id="prod-nombre" class="w-full p-2 mt-1" value="${producto.nombre || ''}" required></div>
                <div><label>Tipo</label><select id="prod-tipo" class="w-full p-2 mt-1" required>
                    <option value="producto" ${producto.tipo === 'producto' ? 'selected' : ''}>Producto (con stock)</option>
                    <option value="servicio" ${producto.tipo === 'servicio' ? 'selected' : ''}>Servicio</option>
                </select></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div><label>Unidad de Medida</label><select id="prod-unidad" class="w-full p-2 mt-1">${unidadesOptions}</select></div>
                <div><label>Stock Inicial</label><input type="number" id="prod-stock" class="w-full p-2 mt-1" value="${producto.stock || 0}" ${id ? 'disabled':''}></div>
                <div><label>Stock Mínimo</label><input type="number" id="prod-stock-minimo" class="w-full p-2 mt-1" value="${producto.stockMinimo || 0}"></div>
                <div><label>Costo Unitario</label><input type="number" step="0.01" id="prod-costo" class="w-full p-2 mt-1" value="${producto.costo || 0}"></div>
                <div><label>Precio de Venta</label><input type="number" step="0.01" id="prod-precio" class="w-full p-2 mt-1" value="${producto.precio || 0}" required></div>
            </div>

            <div class="flex justify-end gap-2 mt-6"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button type="submit" class="conta-btn">${id ? 'Guardar Cambios' : 'Crear'}</button></div>
        </form>`;
        this.showModal(modalHTML, '3xl');
    },
    guardarProducto(e, id) {
        e.preventDefault();
        const data = {
            nombre: document.getElementById('prod-nombre').value,
            tipo: document.getElementById('prod-tipo').value,
            unidadMedidaId: parseInt(document.getElementById('prod-unidad').value) || null,
            stock: parseFloat(document.getElementById('prod-stock').value) || 0,
            stockMinimo: parseFloat(document.getElementById('prod-stock-minimo').value) || 0,
            costo: parseFloat(document.getElementById('prod-costo').value) || 0,
            precio: parseFloat(document.getElementById('prod-precio').value) || 0
        };

        if(id) {
            const producto = this.findById(this.productos, id);
            producto.nombre = data.nombre;
            producto.tipo = data.tipo;
            producto.unidadMedidaId = data.unidadMedidaId;
            producto.stockMinimo = data.stockMinimo;
            producto.costo = data.costo;
            producto.precio = data.precio;
        } else {
            const nuevoProducto = { id: this.idCounter++, ...data, cuentaIngresoId: 40101 };
            this.productos.push(nuevoProducto);
            const valorInventario = nuevoProducto.costo * nuevoProducto.stock;
            if (valorInventario > 0) {
                 this.crearAsiento(this.getTodayDate(), `Inventario inicial ${nuevoProducto.nombre}`, [
                    { cuentaId: 13001, debe: valorInventario, haber: 0 },
                    { cuentaId: 310, debe: 0, haber: valorInventario }
                ]);
            }
        }
        this.saveAll();
        this.closeModal();
        this.irModulo('inventario');
        this.showToast(`Producto/Servicio ${id ? 'actualizado' : 'creado'} con éxito.`, 'success');
    },
    abrirModalAjusteInventario(productoId) {
        const producto = this.findById(this.productos, productoId);
        if(!producto || producto.tipo !== 'producto') {
            this.showToast('Solo se puede ajustar el stock de productos.', 'error');
            return;
        }

        const cuentasContrapartidaOptions = this.planDeCuentas
            .filter(c => c.tipo === 'DETALLE' && (c.codigo.startsWith('5') || c.codigo.startsWith('3') || c.codigo.startsWith('1'))) // Gastos, Patrimonio, otros Activos
            .sort((a,b) => a.codigo.localeCompare(b.codigo, undefined, {numeric: true}))
            .map(c => `<option value="${c.id}" ${c.codigo.includes('510.3') ? 'selected' : ''}>${c.codigo} - ${c.nombre}</option>`).join('');

        const modalHTML = `<h3 class="conta-title mb-4">Ajuste de Inventario</h3>
        <p class="mb-2"><strong>Producto:</strong> ${producto.nombre}</p>
        <p class="mb-6 text-[var(--color-text-secondary)]"><strong>Stock Actual:</strong> ${producto.stock} unidades</p>
        <form onsubmit="ContaApp.guardarAjusteInventario(event, ${productoId})" class="space-y-4 modal-form">
            <div>
                <label for="ajuste-tipo">Tipo de Ajuste</label>
                <select id="ajuste-tipo" class="w-full conta-input mt-1">
                    <option value="salida">Salida (Merma / Pérdida)</option>
                    <option value="entrada">Entrada (Compra / Corrección)</option>
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
    guardarAjusteInventario(e, productoId) {
        e.preventDefault();
        const producto = this.findById(this.productos, productoId);
        const tipoAjuste = document.getElementById('ajuste-tipo').value;
        const cantidad = parseFloat(document.getElementById('ajuste-cantidad').value);
        const cuentaContrapartidaId = parseInt(document.getElementById('ajuste-cuenta-contrapartida').value);
        const fecha = document.getElementById('ajuste-fecha').value;

        if (isNaN(cantidad) || cantidad <= 0) {
            this.showToast('La cantidad a ajustar debe ser un número positivo.', 'error');
            return;
        }
        
        if (tipoAjuste === 'salida' && cantidad > producto.stock) {
            this.showToast('La cantidad a dar de baja no puede ser mayor al stock actual.', 'error');
            return;
        }

        const valorAjuste = cantidad * producto.costo;
        let descripcionAsiento, movimientos;

        if (tipoAjuste === 'entrada') {
            producto.stock += cantidad;
            descripcionAsiento = `Ajuste de entrada de inventario: ${cantidad} x ${producto.nombre}`;
            movimientos = [
                { cuentaId: 130, debe: valorAjuste, haber: 0 }, // DEBE a Inventario
                { cuentaId: cuentaContrapartidaId, debe: 0, haber: valorAjuste } // HABER a la contrapartida (ej. Compras, Capital)
            ];
        } else { // Salida
            producto.stock -= cantidad;
            descripcionAsiento = `Ajuste de salida (merma) de inventario: ${cantidad} x ${producto.nombre}`;
            movimientos = [
                { cuentaId: cuentaContrapartidaId, debe: valorAjuste, haber: 0 }, // DEBE a la contrapartida (ej. Gasto por Merma)
                { cuentaId: 130, debe: 0, haber: valorAjuste } // HABER a Inventario
            ];
        }
        
        // Crear la transacción para el historial (Kardex)
        const transaccionAjuste = {
            id: this.idCounter++,
            tipo: 'ajuste_inventario',
            fecha,
            productoId,
            cantidad,
            costo: producto.costo,
            tipoAjuste, // 'entrada' o 'salida'
            descripcion: descripcionAsiento
        };
        this.transacciones.push(transaccionAjuste);

        const asiento = this.crearAsiento(fecha, descripcionAsiento, movimientos, transaccionAjuste.id);

        if (asiento) {
            this.saveAll();
            this.closeModal();
            this.irModulo('inventario');
            this.showToast('Ajuste de inventario registrado con éxito.', 'success');
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

        // Determinamos qué selector de productos necesitamos actualizar
        if (origen === 'gasto') {
            selectorQuery = '.gasto-item-producto-id';
        } else if (origen === 'venta') {
            selectorQuery = '.venta-item-id';
        } else if (origen === 'compra') {
            selectorQuery = '.compra-item-producto-id';
        } else if (origen === 'produccion') {
            selectorQuery = '#bom-producto-terminado-input';
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
            id: this.idCounter++, nombre: data.nombre, tipo: 'producto',
            stock: 0, stockMinimo: 0, costo: data.costo, precio: data.precio,
            cuentaIngresoId: 40101
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
});