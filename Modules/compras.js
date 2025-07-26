// Archivo: modules/compras.js

Object.assign(ContaApp, {

    renderCompras(params = {}) {
        // Acciones de la cabecera
        document.getElementById('page-actions-header').innerHTML = `
            <button class="conta-btn" onclick="ContaApp.abrirModalNuevaCompra()">+ Nueva Compra</button>
        `;

        // Lógica para mostrar la lista de compras (que estará vacía al principio)
        const compras = this.transacciones.filter(t => t.tipo === 'compra_inventario');
        
        let html;
        if (compras.length === 0) {
            html = this.generarEstadoVacioHTML(
                'fa-shopping-basket',
                'Aún no tienes compras de inventario',
                'Usa este módulo para registrar la compra de mercancía para reventa o materias primas para producción.',
                '+ Registrar Primera Compra',
                "ContaApp.abrirModalNuevaCompra()"
            );
        } else {
            // Futuro: Aquí construiremos la tabla con la lista de compras.
            html = `<div class="conta-card">Tabla de compras aparecerá aquí.</div>`;
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

        // Información común para todas las compras de inventario
        const infoComunHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
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
            </div>
        `;

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
        // Si estamos en un formulario de compra, configuramos el listener del proveedor
        if (document.getElementById('compra-proveedor-input')) {
            this.setupDatalistListener('compra-proveedor-input', 'compra-proveedor-id', 'proveedores-datalist-compra');
        }
        // Si es una compra de inventario, añadimos la primera línea de ítems
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

    guardarCompra(e) {
        e.preventDefault();
        const tipoSeleccionado = document.querySelector('input[name="compra-tipo"]:checked').value;
        const submitButton = document.getElementById('guardar-compra-btn');
        this.toggleButtonLoading(submitButton, true);

        try {
            if (tipoSeleccionado === 'reventa' || tipoSeleccionado === 'materia_prima') {
                // Lógica para guardar Compra de Inventario
                const proveedorId = parseInt(document.getElementById('compra-proveedor-id').value);
                const fecha = document.getElementById('compra-fecha').value;
                const cuentaInventarioId = parseInt(document.getElementById('compra-cuenta-inventario-id').value);
                const cuentaPagoId = parseInt(document.getElementById('compra-pago-id').value);

                if (!proveedorId) {
                    throw new Error('Debe seleccionar un proveedor válido.');
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

                if (items.length === 0) {
                    throw new Error('Debe añadir al menos un ítem a la compra.');
                }

                // Actualizar el stock y el costo promedio de cada producto
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
                
                const descripcion = `Compra de inventario #${this.idCounter + 1}`;
                
                // Crear la transacción de la compra
                const nuevaCompra = {
                    id: this.idCounter++,
                    tipo: 'compra_inventario',
                    fecha: fecha,
                    contactoId: proveedorId,
                    descripcion: descripcion,
                    items: items,
                    total: totalCompra
                };
                this.transacciones.push(nuevaCompra);

                // Crear el asiento contable
                const asiento = this.crearAsiento(
                    fecha,
                    descripcion,
                    [
                        { cuentaId: cuentaInventarioId, debe: totalCompra, haber: 0 },
                        { cuentaId: cuentaPagoId, debe: 0, haber: totalCompra }
                    ],
                    nuevaCompra.id
                );
                
                if (asiento) {
                    this.saveAll();
                    this.closeModal();
                    this.irModulo('compras');
                    this.showToast('Compra de inventario registrada con éxito.', 'success');
                }

            } else if (tipoSeleccionado === 'activo_fijo') {
                // Lógica para redirigir a Activos Fijos
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
});