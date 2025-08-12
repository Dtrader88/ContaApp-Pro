// Archivo: modules/compras.js

Object.assign(ContaApp, {

    async renderCompras(params = {}) {
    document.getElementById('page-actions-header').innerHTML = `<button class="conta-btn" onclick="ContaApp.abrirModalNuevaCompra()">+ Nueva Compra</button>`;

    const { currentPage, perPage } = this.getPaginationState('compras');
    const { column, order } = this.comprasSortState;

    const { data: itemsParaMostrar, totalItems } = await this.repository.getPaginatedTransactions({
        page: currentPage,
        perPage: perPage,
        filters: {
            tipos: ['compra_inventario'],
            // En el futuro, podríamos añadir filtros avanzados aquí
        },
        sort: { column, order }
    });

    let html;
    if (totalItems === 0) {
        html = this.generarEstadoVacioHTML(
            'fa-shopping-basket', 'Aún no tienes compras de inventario',
            'Usa este módulo para registrar la compra de mercancía para reventa o materias primas.',
            '+ Registrar Primera Compra', "ContaApp.abrirModalNuevaCompra()"
        );
    } else {
        const generarEncabezado = (nombreColumna, clave) => {
            let icono = this.comprasSortState.column === clave ? (this.comprasSortState.order === 'asc' ? '<i class="fa-solid fa-arrow-up ml-2"></i>' : '<i class="fa-solid fa-arrow-down ml-2"></i>') : '';
            return `<th class="conta-table-th cursor-pointer" onclick="ContaApp.ordenarComprasPor('${clave}')">${nombreColumna} ${icono}</th>`;
        };

        let tableRows = '';
        itemsParaMostrar.forEach(compra => {
            const proveedor = this.findById(this.contactos, compra.contactoId);
            const isAnulada = compra.estado === 'Anulada';
            
            const rowClass = isAnulada ? 'opacity-50' : '';
            const estadoTag = isAnulada ? `<span class="tag tag-anulada">Anulada</span>` : `<span class="tag tag-success">Completada</span>`;

            let accionesHTML = `
                <button class="conta-btn-icon" title="Ver Detalle" onclick="event.stopPropagation(); ContaApp.abrirModalDetalleCompra(${compra.id})"><i class="fa-solid fa-eye"></i></button>
            `;
            if (compra.comprobanteDataUrl) {
                accionesHTML += `<button class="conta-btn-icon" title="Ver Comprobante Adjunto" onclick="event.stopPropagation(); ContaApp.abrirVistaPreviaComprobanteCompra(${compra.id})"><i class="fa-solid fa-paperclip"></i></button>`;
            }
            if (!isAnulada && this.hasPermission('anular_transaccion')) {
                accionesHTML += `<button class="conta-btn-icon delete" title="Anular Compra" onclick="event.stopPropagation(); ContaApp.anularCompra(${compra.id})"><i class="fa-solid fa-ban"></i></button>`;
            }

            tableRows += `
                <tr class="cursor-pointer ${rowClass}" onclick="ContaApp.abrirModalDetalleCompra(${compra.id})">
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

        html = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra">
            <thead>
                <tr>
                    ${generarEncabezado('Fecha', 'fecha')}
                    ${generarEncabezado('Referencia #', 'referencia')}
                    ${generarEncabezado('Proveedor', 'contacto')}
                    ${generarEncabezado('Descripción', 'descripcion')}
                    ${generarEncabezado('Total', 'total')}
                    ${generarEncabezado('Estado', 'estado')}
                    <th class="conta-table-th text-center">Acciones</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody></table></div>`;
        
        this.renderPaginationControls('compras', totalItems);
    }
    
    document.getElementById('compras').innerHTML = html;
},

    // --- REEMPLAZO COMPLETO ---
abrirModalNuevaCompra() {
    const sucursales = this.empresa.sucursales || [];
    const sucursalesOptions = sucursales.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');

    const cuentasInventarioOptions = this.planDeCuentas
        .filter(c => c.parentId === 130 && c.tipo === 'DETALLE')
        .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
        .map(c => `<option value="${c.id}">${c.codigo} - ${c.nombre}</option>`)
        .join('');

    const cuentasBancoOptions = this.planDeCuentas
        .filter(c => c.parentId === 110 && c.tipo === 'DETALLE')
        .map(c => `<option value="${c.id}">${c.nombre}</option>`)
        .join('');

    const proveedoresOptions = (this.contactos || [])
        .filter(c => c.tipo === 'proveedor')
        .map(c => `<option value="${c.id}">${c.nombre}</option>`)
        .join('');

    const today = this.getTodayDate();

    const modalHTML = `
        <h3 class="conta-title mb-4">Registrar Nueva Compra</h3>
        <form onsubmit="ContaApp.guardarCompra(event)" class="modal-form">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 conta-card mb-4">
                <div>
                    <label>Proveedor</label>
                    <select id="compra-proveedor-id" class="w-full conta-input mt-1" required>
                        <option value="">-- Seleccionar --</option>
                        ${proveedoresOptions}
                    </select>
                </div>
                <div>
                    <label>Fecha</label>
                    <input type="date" id="compra-fecha" class="w-full conta-input mt-1" value="${today}" required>
                </div>
                <div>
                    <label>Referencia #</label>
                    <input type="text" id="compra-referencia" class="w-full conta-input mt-1" placeholder="Opcional">
                </div>

                <!-- Sucursal que recibe -->
                <div>
                    <label>Sucursal que recibe</label>
                    <select id="compra-sucursal-id" class="w-full conta-input mt-1" required>
                        <option value="">-- Seleccionar sucursal --</option>
                        ${sucursalesOptions}
                    </select>
                </div>
            </div>

            <!-- Tipo de compra -->
            <div class="conta-card p-4 mb-4">
                <label class="font-semibold">Paso 1: ¿Qué tipo de bien estás comprando?</label>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <label class="flex items-center cursor-pointer">
                        <input type="radio" name="compra-tipo" value="reventa" class="h-4 w-4" checked>
                        <span class="ml-2">Mercancía para Reventa</span>
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

            <!-- Ítems -->
            <div id="compra-items-card" class="conta-card p-4 mb-4">
                <div class="grid grid-cols-12 gap-2 font-semibold mb-2 text-sm">
                    <div class="col-span-5">Producto</div>
                    <div class="col-span-2 text-right">Cantidad</div>
                    <div class="col-span-2">Unidad</div>
                    <div class="col-span-2 text-right">Costo Unit.</div>
                    <div class="col-span-1 text-center">—</div>
                </div>
                <div id="compra-items-container" class="space-y-2"></div>
                <button type="button" class="conta-btn conta-btn-ghost" onclick="ContaApp._agregarItemCompra()">+ Agregar Ítem</button>
            </div>

            <!-- Pie -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 conta-card">
                <div>
                    <label>Descripción</label>
                    <input type="text" id="compra-descripcion" class="w-full conta-input mt-1" placeholder="Opcional">
                </div>

                <!-- Condición de Pago -->
                <div>
                    <label>Condición de Pago</label>
                    <select id="compra-pago-tipo" class="w-full conta-input mt-1" onchange="ContaApp._togglePagoCompra()">
                        <option value="credito">A Crédito (CxP/210)</option>
                        <option value="contado">De Contado</option>
                    </select>
                </div>

                <!-- Cuenta bancaria (solo contado) -->
                <div id="compra-pago-cuenta-banco-div" style="display:none;">
                    <label>Cuenta Bancaria</label>
                    <select id="compra-pago-id" class="w-full conta-input mt-1">
                        <option value="">-- Seleccionar cuenta --</option>
                        ${cuentasBancoOptions}
                    </select>
                </div>

                <!-- Cuenta de Inventario -->
                <div>
                    <label>Cuenta de Inventario</label>
                    <select id="compra-cuenta-inventario-id" class="w-full conta-input mt-1" required>
                        ${cuentasInventarioOptions}
                    </select>
                </div>

                <!-- Comprobante -->
                <div class="md:col-span-2">
                    <label>Comprobante (opcional)</label>
                    <input type="file" id="compra-comprobante" class="w-full conta-input mt-1" accept="image/*,application/pdf">
                </div>
            </div>

            <div class="flex justify-end gap-2 mt-6">
                <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                <button id="guardar-compra-btn" type="submit" class="conta-btn">Guardar Compra</button>
            </div>
        </form>
    `;
    this.showModal(modalHTML, '4xl');

    // Render inicial de filas + estado inicial del selector de pago
    this._agregarItemCompra();
    this._togglePagoCompra();
},
// ===== INICIO: NUEVA/REEMPLAZO función _agregarItemCompra =====
_agregarItemCompra() {
    // Unidades
    const unidadesOptions = (this.unidadesMedida || [])
        .map(u => `<option value="${u.id}">${u.nombre}</option>`)
        .join('');

    // Productos existentes
    const productosOptions = (this.productos || [])
        .filter(p => p.tipo === 'producto')
        .sort((a,b) => a.nombre.localeCompare(b.nombre))
        .map(p => `<option value="${p.id}">${p.nombre}</option>`)
        .join('');

    const rowId = `compra-row-${this.generarUUID().slice(0,8)}`;

    const rowHTML = `
        <div id="${rowId}" class="grid grid-cols-12 gap-2 items-start compra-item-row">
            <!-- Producto -->
            <div class="col-span-5">
                <select class="w-full conta-input compra-item-producto-id" onchange="ContaApp._onProductoSelectChange(this)">
                    <option value="">-- Seleccionar producto --</option>
                    <option value="__nuevo__">➕ Crear producto nuevo</option>
                    ${productosOptions}
                </select>
                <input type="text" class="w-full conta-input mt-2 compra-item-nuevo-nombre" placeholder="Nombre del nuevo producto" style="display:none;">
            </div>

            <!-- Cantidad -->
            <div class="col-span-2">
                <input type="number" min="0" step="0.0001" class="w-full conta-input text-right compra-item-cantidad" placeholder="0">
            </div>

            <!-- Unidad -->
            <div class="col-span-2">
                <select class="w-full conta-input compra-item-unidad-select">
                    ${unidadesOptions}
                </select>
            </div>

            <!-- Costo unitario -->
            <div class="col-span-2">
                <input type="number" min="0" step="0.0001" class="w-full conta-input text-right compra-item-costo" placeholder="0.00">
            </div>

            <!-- Quitar fila -->
            <button type="button" class="col-span-1 conta-btn conta-btn-ghost" title="Eliminar ítem"
                onclick="this.closest('.compra-item-row').remove()">🗑️</button>
        </div>
    `;

    document.getElementById('compra-items-container').insertAdjacentHTML('beforeend', rowHTML);
},
// ===== FIN: NUEVA/REEMPLAZO función _agregarItemCompra =====

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
    const productosDatalist = this.productos
        .filter(p => p.tipo === 'producto')
        .map(p => `<option value="${p.nombre}" data-id="${p.id}"></option>`)
        .join('');
    // --- INICIO DE LA MEJORA: Opciones para el nuevo selector de unidad ---
    const unidadesOptions = this.unidadesMedida
        .map(u => `<option value="${u.id}">${u.nombre}</option>`)
        .join('');
    // --- FIN DE LA MEJORA ---

    const itemHTML = `
        <div class="grid grid-cols-12 gap-2 items-center dynamic-row compra-item-row">
            <div class="col-span-6 flex items-center gap-2">
                <input list="productos-datalist-compra" class="w-full conta-input compra-item-producto-input" placeholder="Escribe o selecciona un producto..." onchange="ContaApp.handleCompraProductoChange(this)">
                <input type="hidden" class="compra-item-producto-id">
                <datalist id="productos-datalist-compra">${productosDatalist}</datalist>
            </div>
            <input type="number" min="1" class="col-span-2 conta-input text-right compra-item-cantidad" placeholder="Cant." oninput="ContaApp.actualizarTotalesCompra()">
            <div class="col-span-2">
                <select class="w-full conta-input compra-item-unidad-select">${unidadesOptions}</select>
            </div>
            <input type="number" step="0.01" min="0" class="col-span-1 conta-input text-right compra-item-costo" placeholder="Costo" oninput="ContaApp.actualizarTotalesCompra()">
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
        // --- REEMPLAZO COMPLETO ---
async guardarCompra(e) {
    e.preventDefault();
    const submitButton = document.getElementById('guardar-compra-btn');
    this.toggleButtonLoading(submitButton, true);

    try {
        const tipoSeleccionado = document.querySelector('input[name="compra-tipo"]:checked')?.value || 'reventa';
        if (!['reventa','materia_prima','activo_fijo'].includes(tipoSeleccionado)) {
            throw new Error('Selecciona un tipo de compra válido.');
        }
        if (tipoSeleccionado === 'activo_fijo') {
            this.closeModal();
            this.irModulo('activos-fijos', { submodulo: 'nuevo' });
            return;
        }

        const proveedorId = document.getElementById('compra-proveedor-id').value;
        if (!proveedorId) throw new Error('Debe seleccionar un proveedor.');

        const fecha = document.getElementById('compra-fecha').value;
        const referencia = document.getElementById('compra-referencia').value || null;
        const descripcion = document.getElementById('compra-descripcion').value || '';
        const cuentaInventarioId = parseInt(document.getElementById('compra-cuenta-inventario-id').value);
        const sucursalId = document.getElementById('compra-sucursal-id').value;
        if (!sucursalId) throw new Error('Selecciona la sucursal que recibe el inventario.');

        // Pago
        const pagoTipo = document.getElementById('compra-pago-tipo')?.value || 'credito'; // contado | credito
        const cuentaBancoId = parseInt(document.getElementById('compra-pago-id')?.value || 0);
        if (pagoTipo === 'contado' && !cuentaBancoId) throw new Error('Selecciona la cuenta bancaria para pago de contado.');
        const cuentaContrapartidaId = (pagoTipo === 'credito') ? 210 : cuentaBancoId;

        // Comprobante (opcional)
        const archivo = document.getElementById('compra-comprobante')?.files?.[0];
        let comprobanteDataUrl = null;
        if (archivo) {
            if (archivo.size > 1024 * 1024) throw new Error('El archivo es demasiado grande (máx 1MB).');
            comprobanteDataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(archivo);
            });
        }

        // Ítems
        const rows = document.querySelectorAll('.compra-item-row');
        if (!rows.length) throw new Error('Agrega al menos un ítem.');

        const items = [];
        let totalCompra = 0;

        for (const row of rows) {
            let productoId = row.querySelector('.compra-item-producto-id').value;
            const nuevoNombre = row.querySelector('.compra-item-nuevo-nombre')?.value?.trim() || '';
            const cantidad = parseFloat(row.querySelector('.compra-item-cantidad').value) || 0;
            const costoUnitario = parseFloat(row.querySelector('.compra-item-costo').value) || 0;
            const unidadMedidaId = parseInt(row.querySelector('.compra-item-unidad-select').value);

            if (!cantidad || !costoUnitario) continue;

            // Crear producto "rápido" si se eligió ➕
            if (productoId === '__nuevo__') {
                if (!nuevoNombre) throw new Error('Escribe el nombre del producto nuevo en la fila seleccionada.');
                const nuevoProducto = {
                    id: this.generarUUID(),
                    nombre: nuevoNombre,
                    tipo: 'producto',
                    stockPorSucursal: {},
                    stockMinimo: 0,
                    costo: 0,
                    precio: 0,
                    unidadMedidaId,
                    cuentaInventarioId,
                    cuentaIngresoId: 41001
                };
                this.productos.push(nuevoProducto);
                productoId = nuevoProducto.id;
            }

            if (!productoId) throw new Error('Selecciona un producto o crea uno nuevo.');

            const producto = this.findById(this.productos, productoId);
            if (!producto.stockPorSucursal) producto.stockPorSucursal = {};
            const stockActualSucursal = parseFloat(producto.stockPorSucursal[sucursalId] || 0);
            const nuevoStockSucursal = stockActualSucursal + cantidad;
            producto.stockPorSucursal[sucursalId] = nuevoStockSucursal;

            // Costo promedio global
            const stockTotalAnterior = Object.values(producto.stockPorSucursal).reduce((a,b) => a + (parseFloat(b)||0), 0) - cantidad;
            const valorTotalAnterior = stockTotalAnterior * (parseFloat(producto.costo) || 0);
            const valorCompra = cantidad * costoUnitario;
            const nuevoStockTotal = stockTotalAnterior + cantidad;
            producto.costo = nuevoStockTotal > 0 ? (valorTotalAnterior + valorCompra) / nuevoStockTotal : costoUnitario;

            items.push({ productoId, cantidad, costoUnitario, unidadMedidaId });
            totalCompra += (cantidad * costoUnitario);
        }

        if (!items.length) throw new Error('Ingresa cantidades y costos válidos al menos en un ítem.');

        // Transacción
        const compra = {
            id: this.generarUUID(),
            tipo: 'compra_inventario',
            fecha,
            contactoId: proveedorId,
            descripcion: descripcion || `Compra ${referencia || ''}`.trim(),
            referencia,
            total: totalCompra,
            items,
            comprobanteDataUrl,
            sucursalId,
            pagoTipo,
            estado: (pagoTipo === 'credito') ? 'Pendiente' : 'Completada',
            montoPagado: (pagoTipo === 'contado') ? totalCompra : 0
        };
        this.transacciones.push(compra);

        // Asiento por sucursal
        const movimientos = [
            { cuentaId: cuentaInventarioId, debe: totalCompra, haber: 0, sucursalId },
            { cuentaId: cuentaContrapartidaId, debe: 0, haber: totalCompra, sucursalId }
        ];
        const asiento = this.crearAsiento(fecha, `Compra de inventario #${referencia || compra.id}`, movimientos, compra.id);

        // Movimiento bancario (contado)
        if (pagoTipo === 'contado' && asiento) {
            this._registrarMovimientoBancarioPendiente(
                cuentaBancoId, fecha,
                `Pago Compra Inventario #${referencia || compra.id}`,
                -totalCompra, asiento.id
            );
        }

        await this.saveAll();
        this.closeModal();
        this.irModulo('compras');
        this.showToast('Compra registrada. Producto nuevo creado y stock por sucursal actualizado.', 'success');

    } catch (error) {
        console.error('Error al guardar la compra:', error);
        this.showToast(error.message || 'No se pudo guardar la compra.', 'error');
    } finally {
        this.toggleButtonLoading(submitButton, false);
    }
},
// --- FIN REEMPLAZO COMPLETO ---

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
            async () => { // <-- Se convierte la función callback en async
                try {
                    const compra = this.findById(this.transacciones, compraId);
                    if (!compra || compra.estado === 'Anulada') {
                        throw new Error('Esta compra ya ha sido anulada o no se encontró.');
                    }

                    compra.items.forEach(itemCompra => {
                        const producto = this.findById(this.productos, itemCompra.productoId);
                        if (producto) {
                            const valorCompraARevertir = itemCompra.cantidad * itemCompra.costoUnitario;
                            const valorTotalStockActual = producto.stock * producto.costo;
                            const nuevoStock = producto.stock - itemCompra.cantidad;

                            if (nuevoStock < 0) {
                                // NOTA PARA EL BACKEND: Esta validación es crítica en el servidor.
                                throw new Error(`La anulación dejaría el stock de '${producto.nombre}' en negativo.`);
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

                    // --- INICIO DE LA REFACTORIZACIÓN ---
                    await this.repository.actualizarMultiplesDatos({
                        productos: this.productos,
                        transacciones: this.transacciones,
                        asientos: this.asientos
                    });
                    // --- FIN DE LA REFACTORIZACIÓN ---

                    this.irModulo('compras');
                    this.showToast('La compra ha sido anulada con éxito.', 'success');
                } catch (error) {
                    console.error("Error al anular la compra:", error);
                    this.showToast(error.message, 'error');
                }
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
    handleCompraProductoChange(inputEl) {
    const fila = inputEl.closest('.compra-item-row');
    const hiddenInputId = fila.querySelector('.compra-item-producto-id');
    const unidadSelect = fila.querySelector('.compra-item-unidad-select'); // Ahora es un select
    const datalist = document.getElementById('productos-datalist-compra');
    let found = false;

    for (let option of datalist.options) {
        if (option.value === inputEl.value) {
            const productoId = parseInt(option.dataset.id);
            hiddenInputId.value = productoId;
            
            const producto = this.findById(this.productos, productoId);
            if(producto) {
                // Si encontramos un producto existente, seleccionamos su unidad y deshabilitamos el campo
                unidadSelect.value = producto.unidadMedidaId || 1;
                unidadSelect.disabled = true;
            }
            found = true;
            break;
        }
    }
    if (!found) {
        // Si es un producto nuevo, limpiamos el ID oculto y habilitamos el selector de unidad
        hiddenInputId.value = '';
        unidadSelect.disabled = false;
        unidadSelect.value = 1; // Seleccionamos 'Unidad' por defecto
    }
},
ordenarComprasPor(columna) {
    if (this.comprasSortState.column === columna) {
        this.comprasSortState.order = this.comprasSortState.order === 'asc' ? 'desc' : 'asc';
    } else {
        this.comprasSortState.column = columna;
        this.comprasSortState.order = 'asc';
    }
    this.irModulo('compras');
},

});