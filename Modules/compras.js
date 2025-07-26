// Archivo: modules/compras.js

Object.assign(ContaApp, {

    renderCompras(params = {}) {
        document.getElementById('page-actions-header').innerHTML = `<button class="conta-btn" onclick="ContaApp.abrirModalNuevaCompra()">+ Nueva Compra</button>`;

        // Obtenemos TODAS las compras, incluidas las anuladas
        const compras = this.transacciones.filter(t => t.tipo === 'compra_inventario');
        
        let html;
        if (compras.length === 0) {
            html = this.generarEstadoVacioHTML(
                'fa-shopping-basket', 'Aún no tienes compras de inventario',
                'Usa este módulo para registrar la compra de mercancía para reventa o materias primas.',
                '+ Registrar Primera Compra', "ContaApp.abrirModalNuevaCompra()"
            );
        } else {
            html = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra">
                <thead>
                    <tr>
                        <th class="conta-table-th">Fecha</th>
                        <th class="conta-table-th">Referencia #</th>
                        <th class="conta-table-th">Proveedor</th>
                        <th class="conta-table-th text-right">Total</th>
                        <th class="conta-table-th">Estado</th>
                        <th class="conta-table-th text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody>`;
            
            compras.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach(compra => {
                const proveedor = this.findById(this.contactos, compra.contactoId);
                const isAnulada = compra.estado === 'Anulada';
                
                // --- INICIO DE LA MEJORA VISUAL ---
                const rowClass = isAnulada ? 'opacity-50' : '';
                const estadoTag = isAnulada ? `<span class="tag tag-anulada">Anulada</span>` : `<span class="tag tag-success">Completada</span>`;

                let accionesHTML = `
                    <button class="conta-btn-icon" title="Ver Detalle" onclick="ContaApp.abrirModalDetalleCompra(${compra.id})"><i class="fa-solid fa-eye"></i></button>
                `;
                if (compra.comprobanteDataUrl) {
                    accionesHTML += `<button class="conta-btn-icon" title="Ver Comprobante Adjunto" onclick="ContaApp.abrirVistaPreviaComprobanteCompra(${compra.id})"><i class="fa-solid fa-paperclip"></i></button>`;
                }
                if (!isAnulada) {
                    accionesHTML += `<button class="conta-btn-icon delete" title="Anular Compra" onclick="ContaApp.anularCompra(${compra.id})"><i class="fa-solid fa-ban"></i></button>`;
                }
                // --- FIN DE LA MEJORA VISUAL ---

                html += `
                    <tr class="${rowClass}">
                        <td class="conta-table-td">${compra.fecha}</td>
                        <td class="conta-table-td font-mono">${compra.referencia || 'N/A'}</td>
                        <td class="conta-table-td font-bold">${proveedor?.nombre || 'N/A'}</td>
                        <td class="conta-table-td text-right font-mono">${this.formatCurrency(compra.total)}</td>
                        <td class="conta-table-td">${estadoTag}</td>
                        <td class="conta-table-td text-center">${accionesHTML}</td>
                    </tr>
                `;
            });
            html += `</tbody></table></div>`;
        }
        
        document.getElementById('compras').innerHTML = html;
    },

    abrirModalNuevaCompra() {
        const modalHTML = `
            <h3 class="conta-title mb-4">Registrar Nueva Compra</h3>
            <form onsubmit="ContaApp.guardarCompra(event)" class="modal-form">
                
                <div class="conta-card p-4 mb-4">
                    <label class="font-semibold">Paso 1: ¿Qué tipo de bien estás comprando?</label>
                    <div class="flex flex-wrap gap-x-6 gap-y-2 mt-2" onchange="ContaApp._renderCompraModalContent()">
                        <label class="flex items-center cursor-pointer">
                            <input type="radio" name="compra-tipo" value="reventa" class="h-4 w-4" checked>
                            <span class="ml-2">Inventario para Reventa</span>
                        </label>
                        <label class="flex items-center cursor-pointer">
                            <input type="radio" name="compra-tipo" value="materia_prima" class="h-4 w-4">
                            <span class="ml-2">Materias Primas (Producción)</span>
                        </label>
                        <label class="flex items-center cursor-pointer">
                            <input type="radio" name="compra-tipo" value="activo_fijo" class="h-4 w-4">
                            <span class="ml-2">Activo Fijo</span>
                        </label>
                    </div>
                </div>

                <!-- El contenido dinámico del formulario se renderizará aquí -->
                <div id="compra-modal-content"></div>
                
                <div class="flex justify-end gap-2 mt-8">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button type="submit" id="guardar-compra-btn" class="conta-btn">Continuar</button>
                </div>
            </form>
        `;

        this.showModal(modalHTML, '5xl');
        // Renderizar el contenido inicial basado en la opción por defecto (reventa)
        this._renderCompraModalContent();
    },
    _renderCompraModalContent() {
        // ... (código existente de la función sin cambios hasta el final de infoComunHTML) ...
        const infoComunHTML = `...`;

        if (tipoSeleccionado === 'reventa' || tipoSeleccionado === 'materia_prima') {
            const cuentaInventarioId = tipoSeleccionado === 'reventa' ? 13001 : 13002;
            const cuenta = this.findById(this.planDeCuentas, cuentaInventarioId);
            
            html = `
                ${infoComunHTML}
                <input type="hidden" id="compra-cuenta-inventario-id" value="${cuentaInventarioId}">
                <p class="text-sm text-[var(--color-text-secondary)] mb-4">Registrando compra en la cuenta: <strong>${cuenta.codigo} - ${cuenta.nombre}</strong></p>
                
                <div class="conta-card p-4">
                    <h4 class="font-bold mb-2">Ítems de la Compra</h4>
                    <div id="compra-items-container" class="space-y-3"></div>
                    <button type="button" class="conta-btn conta-btn-small conta-btn-accent mt-2" onclick="ContaApp.agregarItemCompra()">+ Agregar Ítem</button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-start">
                    <div>
                        <label>Forma de Pago</label>
                        <select id="compra-pago-id" class="w-full conta-input mt-1" required>
                            <option value="210">A crédito (Genera Cta. por Pagar)</option>
                            <optgroup label="De Contado desde:">${cuentasPagoOptions}</optgroup>
                        </select>
                        
                        <!-- INICIO DE LA MEJORA -->
                        <div class="mt-4">
                            <label>Adjuntar Comprobante (Opcional, máx 1MB)</label>
                            <input type="file" id="compra-comprobante" class="w-full conta-input mt-1" accept="image/*,.pdf">
                        </div>
                        <!-- FIN DE LA MEJORA -->
                    </div>
                    <div class="space-y-2 text-right">
                        <div class="flex justify-between font-bold text-xl"><span class="text-[var(--color-text-primary)]">Total:</span> <span id="compra-total">${this.formatCurrency(0)}</span></div>
                    </div>
                </div>`;
            guardarBtn.textContent = 'Registrar Compra';
            guardarBtn.style.display = '';
        } else if (tipoSeleccionado === 'activo_fijo') {
            html = `...`; // Sin cambios aquí
        }
        // ... (resto de la función sin cambios) ...
    },
    agregarItemCompra() {
        const container = document.getElementById('compra-items-container');
        const productosOptions = this.productos
            .filter(p => p.tipo === 'producto')
            .map(p => `<option value="${p.id}">${p.nombre}</option>`)
            .join('');

        const itemHTML = `
            <div class="grid grid-cols-12 gap-2 items-center dynamic-row compra-item-row">
                <div class="col-span-6 flex items-center gap-2">
                    <select class="w-full conta-input compra-item-producto-id">${productosOptions}</select>
                    <button type="button" class="conta-btn conta-btn-small" onclick="ContaApp.abrirSubModalNuevoProducto('compra')">+</button>
                </div>
                <input type="number" min="1" class="col-span-2 conta-input text-right compra-item-cantidad" placeholder="Cant." oninput="ContaApp.actualizarTotalesCompra()">
                <input type="number" step="0.01" min="0" class="col-span-3 conta-input text-right compra-item-costo" placeholder="Costo Unit." oninput="ContaApp.actualizarTotalesCompra()">
                <button type="button" class="col-span-1 conta-btn-icon delete" onclick="this.closest('.compra-item-row').remove(); ContaApp.actualizarTotalesCompra();">🗑️</button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHTML);
    },

    actualizarTotalesCompra() {
        let total = 0;
        document.querySelectorAll('.compra-item-row').forEach(row => {
            const cantidad = parseFloat(row.querySelector('.compra-item-cantidad').value) || 0;
            const costo = parseFloat(row.querySelector('.compra-item-costo').value) || 0;
            total += cantidad * costo;
        });
        document.getElementById('compra-total').textContent = this.formatCurrency(total);
    },

    async guardarCompra(e) {
        e.preventDefault();
        const tipoSeleccionado = document.querySelector('input[name="compra-tipo"]:checked').value;
        const submitButton = document.getElementById('guardar-compra-btn');
        this.toggleButtonLoading(submitButton, true);

        try {
            if (tipoSeleccionado === 'reventa' || tipoSeleccionado === 'materia_prima') {
                const proveedorId = parseInt(document.getElementById('compra-proveedor-id').value);
                const fecha = document.getElementById('compra-fecha').value;
                const referencia = document.getElementById('compra-referencia').value;
                const cuentaInventarioId = parseInt(document.getElementById('compra-cuenta-inventario-id').value);
                const cuentaPagoId = parseInt(document.getElementById('compra-pago-id').value);
                const archivo = document.getElementById('compra-comprobante').files[0];
                let comprobanteDataUrl = null;

                if (archivo) {
                    if (archivo.size > 1024 * 1024) { throw new Error('El archivo es demasiado grande (máx 1MB).'); }
                    comprobanteDataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = error => reject(error);
                        reader.readAsDataURL(archivo);
                    });
                }

                if (!proveedorId) { throw new Error('Debe seleccionar un proveedor válido.'); }
                
                const items = [];
                let totalCompra = 0;
                document.querySelectorAll('.compra-item-row').forEach(row => {
                    const productoId = parseInt(row.querySelector('.compra-item-producto-id').value);
                    const cantidad = parseFloat(row.querySelector('.compra-item-cantidad').value);
                    const costoUnitario = parseFloat(row.querySelector('.compra-item-costo').value);

                    if (productoId && cantidad > 0 && costoUnitario >= 0) {
                        items.push({ productoId, cantidad, costoUnitario });
                        totalCompra += cantidad * costoUnitario;
                    }
                });

                if (items.length === 0) { throw new Error('Debe añadir al menos un ítem a la compra.'); }

                items.forEach(item => {
                    const producto = this.findById(this.productos, item.productoId);
                    if (producto) {
                        const valorStockActual = (producto.stock || 0) * (producto.costo || 0);
                        const valorCompra = item.cantidad * item.costoUnitario;
                        const nuevoStock = (producto.stock || 0) + item.cantidad;
                        producto.costo = nuevoStock > 0 ? (valorStockActual + valorCompra) / nuevoStock : item.costoUnitario;
                        producto.stock = nuevoStock;
                    }
                });
                
                const descripcion = `Compra de inventario s/f #${referencia || 'N/A'}`;
                
                const nuevaCompra = {
                    id: this.idCounter++, tipo: 'compra_inventario',
                    fecha, contactoId: proveedorId, referencia, descripcion,
                    items, total: totalCompra, comprobanteDataUrl // <-- Propiedad añadida
                };
                this.transacciones.push(nuevaCompra);

                const asiento = this.crearAsiento(fecha, descripcion,
                    [{ cuentaId: cuentaInventarioId, debe: totalCompra, haber: 0 }, { cuentaId: cuentaPagoId, debe: 0, haber: totalCompra }],
                    nuevaCompra.id
                );
                
                if (asiento) {
                    this.saveAll();
                    this.closeModal();
                    this.irModulo('compras');
                    this.showToast('Compra de inventario registrada con éxito.', 'success');
                }

            } else if (tipoSeleccionado === 'activo_fijo') {
                this.closeModal();
                this.abrirModalActivoFijo();
            }
        } catch (error) {
            this.showToast(error.message, 'error');
            console.error("Error al guardar la compra:", error);
        } finally {
            this.toggleButtonLoading(submitButton, false);
        }
    },
    abrirModalDetalleCompra(compraId) {
        const compra = this.findById(this.transacciones, compraId);
        if (!compra) return;
        const proveedor = this.findById(this.contactos, compra.contactoId);

        let itemsHTML = '';
        compra.items.forEach(item => {
            const producto = this.findById(this.productos, item.productoId);
            itemsHTML += `
                <tr class="border-t">
                    <td class="py-2 px-3">${producto?.nombre || 'Producto no encontrado'}</td>
                    <td class="py-2 px-3 text-center">${item.cantidad}</td>
                    <td class="py-2 px-3 text-right font-mono">${this.formatCurrency(item.costoUnitario)}</td>
                    <td class="py-2 px-3 text-right font-mono font-bold">${this.formatCurrency(item.cantidad * item.costoUnitario)}</td>
                </tr>
            `;
        });
        
        const modalHTML = `
            <h3 class="conta-title mb-2">Detalle de Compra</h3>
            <p class="text-[var(--color-text-secondary)] text-sm mb-4">Referencia del Proveedor: ${compra.referencia || 'N/A'}</p>
            <p><strong>Proveedor:</strong> ${proveedor?.nombre}</p>
            <p class="mb-4"><strong>Fecha:</strong> ${compra.fecha}</p>
            <div class="conta-card !p-0">
                <table class="w-full text-sm">
                    <thead><tr>
                        <th class="conta-table-th">Producto</th>
                        <th class="conta-table-th text-center">Cantidad</th>
                        <th class="conta-table-th text-right">Costo Unit.</th>
                        <th class="conta-table-th text-right">Total</th>
                    </tr></thead>
                    <tbody>${itemsHTML}</tbody>
                    <tfoot class="bg-[var(--color-bg-accent)] font-bold">
                        <tr>
                            <td class="conta-table-td text-right" colspan="3">TOTAL COMPRA</td>
                            <td class="conta-table-td text-right font-mono">${this.formatCurrency(compra.total)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div class="flex justify-end gap-2 mt-8">
                <button class="conta-btn" onclick="ContaApp.abrirModalVerAsientos(${compra.id})">Ver Asiento</button>
                <button class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cerrar</button>
            </div>
        `;
        this.showModal(modalHTML, '3xl');
    },

    anularCompra(compraId) {
        this.showConfirm(
            '¿Seguro que deseas anular esta compra? Esta acción revertirá el asiento contable y ajustará el stock del inventario. No se puede deshacer.',
            () => {
                const compra = this.findById(this.transacciones, compraId);
                if (!compra || compra.estado === 'Anulada') {
                    this.showToast('Esta compra ya ha sido anulada o no se encontró.', 'error');
                    return;
                }

                compra.items.forEach(itemCompra => {
                    const producto = this.findById(this.productos, itemCompra.productoId);
                    if (producto) {
                        const valorCompraARevertir = itemCompra.cantidad * itemCompra.costoUnitario;
                        const valorStockTotalActual = producto.stock * producto.costo;
                        const nuevoStock = producto.stock - itemCompra.cantidad;

                        if (nuevoStock < 0) {
                            console.error(`Error de anulación: el stock de '${producto.nombre}' sería negativo.`);
                        }
                        
                        producto.costo = nuevoStock > 0 ? (valorStockTotalActual - valorCompraARevertir) / nuevoStock : 0;
                        producto.stock = nuevoStock;
                    }
                });

                const asientoOriginal = this.asientos.find(a => a.transaccionId === compra.id);
                if (asientoOriginal) {
                    const movimientosReversos = asientoOriginal.movimientos.map(mov => ({
                        cuentaId: mov.cuentaId,
                        debe: mov.haber,
                        haber: mov.debe
                    }));
                    this.crearAsiento(this.getTodayDate(), `Anulación de Compra s/f #${compra.referencia}`, movimientosReversos);
                }
                
                compra.estado = 'Anulada';
                this.saveAll();
                this.irModulo('compras');
                this.showToast('La compra ha sido anulada con éxito.', 'success');
            }
        );
    },
    abrirVistaPreviaComprobanteCompra(compraId) {
        const compra = this.findById(this.transacciones, compraId);
        if (!compra || !compra.comprobanteDataUrl) {
            this.showToast('Esta compra no tiene un comprobante adjunto.', 'error');
            return;
        }

        const esPDF = compra.comprobanteDataUrl.startsWith('data:application/pdf');
        
        let contentHTML;
        if (esPDF) {
            contentHTML = `<iframe src="${compra.comprobanteDataUrl}" width="100%" height="600px" style="border: none;"></iframe>`;
        } else {
            contentHTML = `<img src="${compra.comprobanteDataUrl}" alt="Comprobante de Compra" class="max-w-full max-h-[80vh] mx-auto">`;
        }

        const modalHTML = `
            <h3 class="conta-title mb-4">Comprobante de la Compra (Ref: ${compra.referencia || compra.id})</h3>
            <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                ${contentHTML}
            </div>
            <div class="flex justify-end mt-6">
                <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cerrar</button>
            </div>
        `;
        this.showModal(modalHTML, '4xl');
    },
});