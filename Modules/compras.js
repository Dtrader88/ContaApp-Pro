// Archivo: modules/compras.js

Object.assign(ContaApp, {

    renderCompras(params = {}) {
        document.getElementById('page-actions-header').innerHTML = `<button class="conta-btn" onclick="ContaApp.abrirModalNuevaCompra()">+ Nueva Compra</button>`;

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
                        <th class="conta-table-th">Descripción</th>
                        <th class="conta-table-th text-right">Total</th>
                        <th class="conta-table-th">Estado</th>
                        <th class="conta-table-th text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody>`;
            
            compras.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).forEach(compra => {
                const proveedor = this.findById(this.contactos, compra.contactoId);
                const isAnulada = compra.estado === 'Anulada';
                
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

                html += `
                    <tr class="${rowClass}">
                        <td class="conta-table-td">${compra.fecha}</td>
                        <td class="conta-table-td font-mono">${compra.referencia || 'N/A'}</td>
                        <td class="conta-table-td font-bold">${proveedor?.nombre || 'N/A'}</td>
                        <td class="conta-table-td">${compra.descripcion}</td>
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
        const tipoSeleccionado = document.querySelector('input[name="compra-tipo"]:checked').value;
        const container = document.getElementById('compra-modal-content');
        const guardarBtn = document.getElementById('guardar-compra-btn');
        let html = '';

        const proveedoresDatalist = this.contactos.filter(c => c.tipo === 'proveedor').map(c => `<option value="${c.nombre}" data-id="${c.id}"></option>`).join('');
        const cuentasPagoOptions = this.planDeCuentas
            .filter(c => c.parentId === 110 && c.tipo === 'DETALLE')
            .map(c => `<option value="${c.id}">${c.nombre}</option>`)
            .join('');

        const infoComunHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div class="md:col-span-1">
                    <label>Proveedor</label>
                    <div class="flex items-center gap-2">
                        <input list="proveedores-datalist-compra" id="compra-proveedor-input" class="w-full conta-input mt-1" placeholder="Buscar proveedor..." required>
                        <datalist id="proveedores-datalist-compra">${proveedoresDatalist}</datalist>
                        <input type="hidden" id="compra-proveedor-id">
                        <button type="button" class="conta-btn conta-btn-small" onclick="ContaApp.abrirSubModalNuevoContacto('proveedor', 'compra-proveedor-input')">+</button>
                    </div>
                </div>
                <div>
                    <label>Fecha de Compra</label>
                    <input type="date" id="compra-fecha" value="${this.getTodayDate()}" class="w-full conta-input mt-1" required>
                </div>
                <div>
                    <label>Factura/Referencia del Proveedor</label>
                    <input type="text" id="compra-referencia" class="w-full conta-input mt-1" placeholder="Ej: F-12345">
                </div>
            </div>
        `;

        if (tipoSeleccionado === 'reventa' || tipoSeleccionado === 'materia_prima') {
            const cuentaInventarioId = tipoSeleccionado === 'reventa' ? 13001 : 13002;
            const cuenta = this.findById(this.planDeCuentas, cuentaInventarioId);
            
            html = `
                ${infoComunHTML}
                <div class="mb-4">
                    <label>Descripción de la Compra</label>
                    <input type="text" id="compra-descripcion" class="w-full conta-input mt-1" placeholder="Ej: Compra semanal de insumos">
                </div>
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
                        
                        <div class="mt-4">
                            <label>Adjuntar Comprobante (Opcional, máx 1MB)</label>
                            <input type="file" id="compra-comprobante" class="w-full conta-input mt-1" accept="image/*,.pdf">
                        </div>
                    </div>
                    <div class="space-y-2 text-right">
                        <div class="flex justify-between font-bold text-xl"><span class="text-[var(--color-text-primary)]">Total:</span> <span id="compra-total">${this.formatCurrency(0)}</span></div>
                    </div>
                </div>`;
            guardarBtn.textContent = 'Registrar Compra';
            guardarBtn.style.display = '';
        } else if (tipoSeleccionado === 'activo_fijo') {
            html = `
                <div class="text-center p-8 conta-card-accent">
                    <p class="font-semibold">Serás redirigido al formulario especializado para registrar la compra de un activo fijo.</p>
                </div>
            `;
            guardarBtn.textContent = 'Continuar a Activos Fijos';
            guardarBtn.style.display = '';
        }

        container.innerHTML = html;
        if (document.getElementById('compra-proveedor-input')) {
            this.setupDatalistListener('compra-proveedor-input', 'compra-proveedor-id', 'proveedores-datalist-compra');
        }
        if (tipoSeleccionado === 'reventa' || tipoSeleccionado === 'materia_prima') {
            this.agregarItemCompra();
        }
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
                    <select class="w-full conta-input compra-item-producto-id" onchange="ContaApp.actualizarUnidadMedidaCompra(this)">${productosOptions}</select>
                    <button type="button" class="conta-btn conta-btn-small" onclick="ContaApp.abrirSubModalNuevoProducto('compra')">+</button>
                </div>
                <input type="number" min="1" class="col-span-2 conta-input text-right compra-item-cantidad" placeholder="Cant." oninput="ContaApp.actualizarTotalesCompra()">
                <div class="col-span-2">
                    <input type="text" class="w-full conta-input bg-gray-100 dark:bg-gray-700 compra-item-unidad-display" readonly>
                </div>
                <input type="number" step="0.01" min="0" class="col-span-1 conta-input text-right compra-item-costo" placeholder="Costo" oninput="ContaApp.actualizarTotalesCompra()">
                <button type="button" class="col-span-1 conta-btn-icon delete" onclick="this.closest('.compra-item-row').remove(); ContaApp.actualizarTotalesCompra();">🗑️</button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHTML);
        
        const nuevaFila = container.querySelector('.compra-item-row:last-child');
        if (nuevaFila) {
            this.actualizarUnidadMedidaCompra(nuevaFila.querySelector('.compra-item-producto-id'));
        }
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
    actualizarUnidadMedidaCompra(selectProducto) {
        const fila = selectProducto.closest('.compra-item-row');
        const productoId = parseInt(selectProducto.value);
        const producto = this.findById(this.productos, productoId);
        const selectUnidad = fila.querySelector('.compra-item-unidad-id');
        if (producto && selectUnidad) {
            selectUnidad.value = producto.unidadMedidaId || 1;
        }
    },

    abrirSubModalNuevaUnidad(button) {
        const selectToUpdate = button.previousElementSibling;
        if (!selectToUpdate.id) {
            selectToUpdate.id = `unidad-selector-on-the-fly-${Date.now()}`;
        }

        const subModal = document.createElement('div');
        subModal.id = 'sub-modal-bg';
        subModal.onclick = () => document.body.removeChild(subModal);
        
        const subModalContent = document.createElement('div');
        subModalContent.className = 'p-6 rounded-lg shadow-xl w-full max-w-sm modal-content';
        subModalContent.onclick = e => e.stopPropagation();

        subModalContent.innerHTML = `
            <h3 class="conta-title mb-4">Nueva Unidad de Medida</h3>
            <form onsubmit="event.preventDefault(); ContaApp.guardarNuevaUnidadDesdeSubModal(event, '${selectToUpdate.id}')" class="space-y-4 modal-form">
                <div>
                    <label>Nombre de la Unidad</label>
                    <input type="text" id="sub-unidad-nombre" class="w-full p-2 mt-1" placeholder="Ej: Paquete, Rollo, m²" required>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="document.body.removeChild(document.getElementById('sub-modal-bg'))">Cancelar</button>
                    <button type="submit" class="conta-btn">Guardar</button>
                </div>
            </form>
        `;
        subModal.appendChild(subModalContent);
        document.body.appendChild(subModal);
        document.getElementById('sub-unidad-nombre').focus();
    },

    guardarNuevaUnidadDesdeSubModal(e, selectIdToUpdate) {
        const nombre = document.getElementById('sub-unidad-nombre').value;
        if (!nombre) return;

        const nuevaUnidad = {
            id: this.idCounter++,
            nombre: nombre
        };
        this.unidadesMedida.push(nuevaUnidad);
        this.saveAll();

        const todosLosSelectores = document.querySelectorAll('.compra-item-unidad-id');
        todosLosSelectores.forEach(select => {
            const option = document.createElement('option');
            option.value = nuevaUnidad.id;
            option.text = nuevaUnidad.nombre;
            select.add(option);
        });

        const selectActivo = document.getElementById(selectIdToUpdate);
        if (selectActivo) {
            selectActivo.value = nuevaUnidad.id;
        }

        this.showToast('Unidad de medida creada y seleccionada.', 'success');
        document.body.removeChild(document.getElementById('sub-modal-bg'));
    },
    async guardarCompra(e) {
        e.preventDefault();
        const tipoSeleccionado = document.querySelector('input[name="compra-tipo"]:checked').value;
        const submitButton = document.getElementById('guardar-compra-btn');
        this.toggleButtonLoading(submitButton, true);

        try {
            if (tipoSeleccionado === 'reventa' || tipoSeleccionado === 'materia_prima') {
                const proveedorId = parseInt(document.getElementById('compra-proveedor-id').value);

                // --- INICIO DE LA VALIDACIÓN MEJORADA ---
                if (!proveedorId || isNaN(proveedorId)) {
                    throw new Error('Debe seleccionar un proveedor válido de la lista.');
                }
                // --- FIN DE LA VALIDACIÓN MEJORADA ---

                const fecha = document.getElementById('compra-fecha').value;
                const referencia = document.getElementById('compra-referencia').value;
                const descripcion = document.getElementById('compra-descripcion').value;
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
                        const valorTotalStockActual = (producto.stock || 0) * (producto.costo || 0);
                        const valorCompra = item.cantidad * item.costoUnitario;
                        const nuevoStock = (producto.stock || 0) + item.cantidad;

                        producto.costo = nuevoStock > 0 ? (valorTotalStockActual + valorCompra) / nuevoStock : item.costoUnitario;
                        producto.stock = nuevoStock;
                    }
                });
                
                const descripcionFinal = descripcion || `Compra de inventario s/f #${referencia || 'N/A'}`;
                
                const nuevaCompra = {
                    id: this.idCounter++, tipo: 'compra_inventario',
                    fecha, contactoId: proveedorId, referencia, descripcion: descripcionFinal,
                    items, total: totalCompra, comprobanteDataUrl
                };
                this.transacciones.push(nuevaCompra);

                const asiento = this.crearAsiento(fecha, descripcionFinal,
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
                        const valorTotalStockActual = producto.stock * producto.costo;
                        const nuevoStock = producto.stock - itemCompra.cantidad;

                        if (nuevoStock < 0) {
                            console.error(`Error de anulación: el stock de '${producto.nombre}' sería negativo.`);
                        }
                        
                        producto.costo = nuevoStock > 0 ? (valorTotalStockActual - valorCompraARevertir) / nuevoStock : 0;
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
                    this.crearAsiento(this.getTodayDate(), `Anulación de Compra s/f #${compra.referencia || compra.id}`, movimientosReversos);
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