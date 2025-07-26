
Object.assign(ContaApp, {

    renderProduccion(params = {}) {
        document.getElementById('page-actions-header').innerHTML = `
            <button class="conta-btn" onclick="ContaApp.abrirModalOrdenProduccion()">+ Nueva Orden de Producción</button>
        `;

        let html;
        const ordenes = this.ordenesProduccion || [];

        if (ordenes.length === 0) {
            html = this.generarEstadoVacioHTML(
                'fa-cogs', 'Aún no tienes Órdenes de Producción',
                'Crea tu primera orden para registrar la fabricación de un producto terminado.',
                '+ Crear Primera Orden', "ContaApp.abrirModalOrdenProduccion()"
            );
        } else {
            html = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra">
                <thead>
                    <tr>
                        <th class="conta-table-th">Fecha</th>
                        <th class="conta-table-th">Orden #</th>
                        <th class="conta-table-th">Descripción</th>
                        <th class="conta-table-th">Producto Final</th>
                        <th class="conta-table-th text-right">Cantidad</th>
                        <th class="conta-table-th text-right">Costo Total</th>
                        <th class="conta-table-th text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody>`;
            
            ordenes.sort((a,b) => new Date(b.fecha) - new Date(a.fecha) || b.id - a.id).forEach(orden => {
                const productoFinal = this.findById(this.productos, orden.productoTerminadoId);
                html += `
                    <tr>
                        <td class="conta-table-td">${orden.fecha}</td>
                        <td class="conta-table-td font-mono">OP-${orden.id}</td>
                        <td class="conta-table-td">${orden.descripcion}</td>
                        <td class="conta-table-td font-bold">${productoFinal?.nombre || 'N/A'}</td>
                        <td class="conta-table-td text-right font-mono">${orden.cantidadProducida}</td>
                        <td class="conta-table-td text-right font-mono">${this.formatCurrency(orden.costoTotal)}</td>
                        <td class="conta-table-td text-center">
                            <button class="conta-btn-icon" title="Ver Detalle" onclick="ContaApp.abrirModalDetalleOrdenProduccion(${orden.id})"><i class="fa-solid fa-eye"></i></button>
                            <button class="conta-btn-icon edit" title="Duplicar Orden" onclick="ContaApp.abrirModalOrdenProduccion(null, ${orden.id})"><i class="fa-solid fa-copy"></i></button>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
        }
        
        document.getElementById('produccion').innerHTML = html;
    },

    abrirModalOrdenProduccion(id = null, duplicarId = null) {
        const ordenOriginal = duplicarId ? this.findById(this.ordenesProduccion, duplicarId) : (id ? this.findById(this.ordenesProduccion, id) : {});
        const isEditing = id !== null && !duplicarId;
        const isDuplicating = duplicarId !== null;

        const productosTerminadosOptions = this.productos
            .filter(p => p.tipo === 'producto')
            .map(p => `<option value="${p.nombre}" data-id="${p.id}"></option>`)
            .join('');

        const modalHTML = `
            <h3 class="conta-title mb-4">${isEditing ? 'Editar' : (isDuplicating ? 'Duplicar' : 'Nueva')} Orden de Producción</h3>
            <form onsubmit="ContaApp.guardarOrdenProduccion(event, ${id})" class="space-y-4 modal-form">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label>Nombre/Descripción de la Orden</label><input type="text" id="op-descripcion" class="w-full conta-input mt-1" placeholder="Ej: Señalética de PVC 10x10" value="${ordenOriginal.descripcion || ''}" required></div>
                    <div><label>Fecha de Producción</label><input type="date" id="op-fecha" value="${this.getTodayDate()}" class="w-full conta-input mt-1" required></div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label>Producto Final a Fabricar</label>
                        <div class="flex items-center gap-2 mt-1">
                            <input list="productos-terminados-datalist-op" id="op-producto-terminado-input" class="w-full conta-input" placeholder="Selecciona o crea un producto..." required>
                            <datalist id="productos-terminados-datalist-op">${productosTerminadosOptions}</datalist>
                            <input type="hidden" id="op-producto-terminado-id">
                            <button type="button" class="conta-btn conta-btn-small" onclick="ContaApp.abrirSubModalNuevoProducto('produccion')">+</button>
                        </div>
                    </div>
                    <div><label>Cantidad a Producir</label><input type="number" id="op-cantidad-producir" class="w-full conta-input mt-1" value="${ordenOriginal.cantidadProducida || 1}" min="1" required></div>
                </div>
                <div class="conta-card p-4"><h4 class="font-bold mb-2">Materias Primas a Utilizar</h4><div id="op-componentes-container" class="space-y-3"></div><button type="button" class="conta-btn conta-btn-small conta-btn-accent mt-2" onclick="ContaApp.agregarComponenteOP()">+ Agregar Materia Prima</button></div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button type="submit" class="conta-btn">${isEditing ? 'Guardar Cambios' : 'Crear Orden'}</button>
                </div>
            </form>
        `;
        this.showModal(modalHTML, '4xl');
        this.setupDatalistListener('op-producto-terminado-input', 'op-producto-terminado-id', 'productos-terminados-datalist-op');
        
        if (isEditing || isDuplicating) {
            const productoTerminado = this.findById(this.productos, ordenOriginal.productoTerminadoId);
            if (productoTerminado) {
                document.getElementById('op-producto-terminado-input').value = productoTerminado.nombre;
                document.getElementById('op-producto-terminado-id').value = productoTerminado.id;
            }
            ordenOriginal.componentes.forEach(comp => this.agregarComponenteOP(comp));
        } else {
            this.agregarComponenteOP();
        }
    },

    agregarComponenteOP(componente = {}) {
        const container = document.getElementById('op-componentes-container');
        const materiasPrimasOptions = this.productos
            .filter(p => p.tipo === 'producto')
            .map(p => `<option value="${p.id}" ${componente.productoId === p.id ? 'selected' : ''}>${p.nombre}</option>`)
            .join('');

        const itemHTML = `
            <div class="grid grid-cols-12 gap-2 items-center dynamic-row">
                <div class="col-span-8">
                    <select name="op-componente-id" class="w-full conta-input op-componente-id" required>
                        <option value="">-- Selecciona una materia prima --</option>
                        ${materiasPrimasOptions}
                    </select>
                </div>
                <div class="col-span-3">
                     <input type="number" step="any" name="op-componente-cantidad" class="w-full conta-input text-right op-componente-cantidad" placeholder="Cantidad" value="${componente.cantidad || ''}" required>
                </div>
                <button type="button" class="col-span-1 conta-btn-icon delete" onclick="this.closest('.dynamic-row').remove()">🗑️</button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHTML);
    },

    guardarOrdenProduccion(e, id = null) {
        e.preventDefault();
        const isEditing = id !== null;

        try {
            const productoTerminadoNombre = document.getElementById('op-producto-terminado-input').value;
            const productoTerminadoEncontrado = this.productos.find(p => p.nombre.toLowerCase() === productoTerminadoNombre.toLowerCase());
            
            const data = {
                descripcion: document.getElementById('op-descripcion').value,
                fecha: document.getElementById('op-fecha').value,
                productoTerminadoId: productoTerminadoEncontrado ? productoTerminadoEncontrado.id : null,
                cantidadProducida: parseFloat(document.getElementById('op-cantidad-producir').value)
            };

            const componentes = [];
            document.querySelectorAll('#op-componentes-container .dynamic-row').forEach(row => {
                const productoId = parseInt(row.querySelector('.op-componente-id').value);
                const cantidad = parseFloat(row.querySelector('.op-componente-cantidad').value);
                if (productoId && cantidad > 0) {
                    componentes.push({ productoId, cantidad });
                }
            });

            if (!data.productoTerminadoId || componentes.length === 0 || !data.cantidadProducida || data.cantidadProducida <= 0) {
                throw new Error('Debes completar todos los campos de la orden con valores válidos.');
            }

            let costoTotalProduccion = 0;
            for (const comp of componentes) {
                const materiaPrima = this.findById(this.productos, comp.productoId);
                if (!materiaPrima || materiaPrima.stock < comp.cantidad) {
                    throw new Error(`Stock insuficiente para "${materiaPrima.nombre}". Necesitas ${comp.cantidad}, tienes ${materiaPrima.stock}.`);
                }
                costoTotalProduccion += materiaPrima.costo * comp.cantidad;
            }

            componentes.forEach(comp => {
                const materiaPrima = this.findById(this.productos, comp.productoId);
                materiaPrima.stock -= comp.cantidad;
            });

            const productoTerminado = this.findById(this.productos, data.productoTerminadoId);
            const costoUnitarioProduccion = costoTotalProduccion / data.cantidadProducida;

            const valorStockActualPT = (productoTerminado.stock || 0) * (productoTerminado.costo || 0);
            const nuevoStockPT = (productoTerminado.stock || 0) + data.cantidadProducida;
            
            productoTerminado.costo = nuevoStockPT > 0 ? (valorStockActualPT + costoTotalProduccion) / nuevoStockPT : costoUnitarioProduccion;
            productoTerminado.stock = nuevoStockPT;
            
            const nuevaOrden = {
                id: this.idCounter++,
                ...data,
                componentes,
                costoTotal: costoTotalProduccion,
                estado: 'Completada'
            };
            this.ordenesProduccion.push(nuevaOrden);

            const cuentaMP = 13002;
            const cuentaPT = 13004;
            const asiento = this.crearAsiento(data.fecha, `Orden de Producción #${nuevaOrden.id}: ${data.descripcion}`,
                [
                    { cuentaId: cuentaPT, debe: costoTotalProduccion, haber: 0 },
                    { cuentaId: cuentaMP, debe: 0, haber: costoTotalProduccion }
                ],
                nuevaOrden.id
            );

            if (asiento) {
                this.saveAll();
                this.closeModal();
                this.irModulo('produccion');
                this.showToast('Orden de Producción registrada con éxito.', 'success');
            }
        } catch(error) {
            this.showToast(error.message, 'error');
            console.error("Error al guardar la orden de producción:", error);
        }
    },
    abrirModalDetalleOrdenProduccion(ordenId) {
        const orden = this.findById(this.ordenesProduccion, ordenId);
        if (!orden) return;
        const productoFinal = this.findById(this.productos, orden.productoTerminadoId);

        let componentesHTML = '';
        orden.componentes.forEach(comp => {
            const materiaPrima = this.findById(this.productos, comp.productoId);
            const costoComponente = materiaPrima.costo * comp.cantidad;
            componentesHTML += `
                <tr class="border-t">
                    <td class="py-2 px-3">${materiaPrima?.nombre || 'N/A'}</td>
                    <td class="py-2 px-3 text-center">${comp.cantidad}</td>
                    <td class="py-2 px-3 text-right font-mono">${this.formatCurrency(materiaPrima.costo)}</td>
                    <td class="py-2 px-3 text-right font-mono font-bold">${this.formatCurrency(costoComponente)}</td>
                </tr>
            `;
        });
        
        const modalHTML = `
            <h3 class="conta-title mb-2">Detalle de Orden de Producción #${orden.id}</h3>
            <p class="text-[var(--color-text-secondary)] text-sm mb-4">${orden.descripcion}</p>
            <p><strong>Producto Fabricado:</strong> ${productoFinal?.nombre}</p>
            <p class="mb-4"><strong>Fecha:</strong> ${orden.fecha}</p>
            <div class="conta-card !p-0">
                <table class="w-full text-sm">
                    <thead><tr>
                        <th class="conta-table-th">Materia Prima</th>
                        <th class="conta-table-th text-center">Cantidad Usada</th>
                        <th class="conta-table-th text-right">Costo Unit.</th>
                        <th class="conta-table-th text-right">Costo Total</th>
                    </tr></thead>
                    <tbody>${componentesHTML}</tbody>
                    <tfoot class="bg-[var(--color-bg-accent)] font-bold">
                        <tr>
                            <td class="conta-table-td text-right" colspan="3">COSTO TOTAL DE PRODUCCIÓN</td>
                            <td class="conta-table-td text-right font-mono">${this.formatCurrency(orden.costoTotal)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div class="flex justify-end gap-2 mt-8">
                <button class="conta-btn" onclick="ContaApp.abrirModalVerAsientos(${orden.id})">Ver Asiento</button>
                <button class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cerrar</button>
            </div>
        `;
        this.showModal(modalHTML, '3xl');
    },
});