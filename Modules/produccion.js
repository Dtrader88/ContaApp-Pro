
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
                        <th class="conta-table-th">Estado</th>
                        <th class="conta-table-th text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody>`;
            
            ordenes.sort((a,b) => new Date(b.fecha) - new Date(a.fecha) || b.id - a.id).forEach(orden => {
                const productoFinal = this.findById(this.productos, orden.productoTerminadoId);
                let estadoTag;
                let accionesHTML;

                if (orden.estado === 'Pendiente') {
                    estadoTag = `<span class="tag tag-warning">Pendiente</span>`;
                    accionesHTML = `
                        <button class="conta-btn conta-btn-small conta-btn-success" title="Completar Producción" onclick="ContaApp.completarOrdenProduccion(${orden.id})"><i class="fa-solid fa-play"></i> Completar</button>
                        <button class="conta-btn-icon edit" title="Duplicar Orden" onclick="ContaApp.abrirModalOrdenProduccion(null, ${orden.id})"><i class="fa-solid fa-copy"></i></button>
                    `;
                } else { // Completada
                    estadoTag = `<span class="tag tag-success">Completada</span>`;
                    accionesHTML = `
                        <button class="conta-btn-icon" title="Ver Detalle" onclick="ContaApp.abrirModalDetalleOrdenProduccion(${orden.id})"><i class="fa-solid fa-eye"></i></button>
                        <button class="conta-btn-icon edit" title="Duplicar Orden" onclick="ContaApp.abrirModalOrdenProduccion(null, ${orden.id})"><i class="fa-solid fa-copy"></i></button>
                    `;
                }

                html += `
                    <tr>
                        <td class="conta-table-td">${orden.fecha}</td>
                        <td class="conta-table-td font-mono">${orden.numero}</td>
                        <td class="conta-table-td">${orden.descripcion}</td>
                        <td class="conta-table-td font-bold">${productoFinal?.nombre || 'N/A'}</td>
                        <td class="conta-table-td text-right font-mono">${orden.cantidadProducida}</td>
                        <td class="conta-table-td text-right font-mono">${this.formatCurrency(orden.costoTotal)}</td>
                        <td class="conta-table-td">${estadoTag}</td>
                        <td class="conta-table-td text-center">${accionesHTML}</td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
        }
        
        document.getElementById('produccion').innerHTML = html;
    },

    abrirModalOrdenProduccion(duplicarId = null) {
        const ordenOriginal = duplicarId ? this.findById(this.ordenesProduccion, duplicarId) : {};
        const isDuplicating = duplicarId !== null;

        const proximoNumeroOP = `OP-${(this.ordenesProduccion || []).length + 1001}`;

        const modalHTML = `
            <h3 class="conta-title mb-4">${isDuplicating ? 'Duplicar' : 'Nueva'} Orden de Producción</h3>
            <form onsubmit="ContaApp.guardarOrdenProduccion(event)" class="space-y-4 modal-form">
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label>Número de Orden</label>
                        <input type="text" id="op-numero" class="w-full conta-input mt-1 bg-gray-100 dark:bg-gray-700" value="${proximoNumeroOP}" readonly>
                    </div>
                    <div class="md:col-span-2">
                        <label>Detalle de la Orden</label>
                        <input type="text" id="op-descripcion" class="w-full conta-input mt-1" placeholder="Ej: Señalética de PVC para Cliente X" value="${ordenOriginal.descripcion || ''}" required>
                    </div>
                </div>
                
                <!-- INICIO DE LA CORRECCIÓN: AÑADIDO CAMPO DE FECHA -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="md:col-span-2">
                        <label>Producto Final a Crear</label>
                        <input type="text" id="op-producto-final-nombre" class="w-full conta-input mt-1" placeholder="Ej: Señalética PVC 10x10" value="${ordenOriginal.productoFinalNombre || ''}" required>
                    </div>
                    <div>
                        <label>Fecha de Producción</label>
                        <input type="date" id="op-fecha" value="${ordenOriginal.fecha || this.getTodayDate()}" class="w-full conta-input mt-1" required>
                    </div>
                </div>
                <!-- FIN DE LA CORRECCIÓN -->

                <div class="conta-card p-4">
                    <h4 class="font-bold mb-2">Producto Final y Materias Primas</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label>Cantidad a Producir</label>
                            <input type="number" id="op-cantidad-producir" class="w-full conta-input mt-1" value="${ordenOriginal.cantidadProducida || 1}" min="1" required>
                        </div>
                    </div>
                    <div id="op-componentes-container" class="space-y-3 mt-4"></div>
                    <button type="button" class="conta-btn conta-btn-small conta-btn-accent mt-2" onclick="ContaApp.agregarComponenteOP()">+ Agregar Materia Prima</button>
                </div>
                
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button type="submit" class="conta-btn">Crear Orden</button>
                </div>
            </form>
        `;
        this.showModal(modalHTML, '4xl');
        
        if (isDuplicating && ordenOriginal.componentes) {
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
                <div class="col-span-6">
                    <select class="w-full conta-input op-componente-id" onchange="ContaApp.actualizarUnidadMedidaOP(this)" required>
                        <option value="">-- Selecciona una materia prima --</option>
                        ${materiasPrimasOptions}
                    </select>
                </div>
                <div class="col-span-2">
                     <input type="number" step="any" class="w-full conta-input text-right op-componente-cantidad" placeholder="Cantidad" value="${componente.cantidad || ''}" required>
                </div>
                <div class="col-span-3">
                    <input type="text" class="w-full conta-input bg-gray-100 dark:bg-gray-700 op-componente-unidad-display" readonly>
                </div>
                <button type="button" class="col-span-1 conta-btn-icon delete" onclick="this.closest('.dynamic-row').remove()">🗑️</button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHTML);

        const nuevaFila = container.querySelector('.dynamic-row:last-child');
        if (nuevaFila) {
            this.actualizarUnidadMedidaOP(nuevaFila.querySelector('.op-componente-id'));
        }
    },
    actualizarUnidadMedidaOP(selectProducto) {
        const fila = selectProducto.closest('.dynamic-row');
        const productoId = parseInt(selectProducto.value);
        const producto = this.findById(this.productos, productoId);
        const unidadDisplay = fila.querySelector('.op-componente-unidad-display');

        if (producto) {
            const unidad = this.findById(this.unidadesMedida, producto.unidadMedidaId);
            unidadDisplay.value = unidad ? unidad.nombre : 'N/A';
        } else {
            unidadDisplay.value = '';
        }
    },

    guardarOrdenProduccion(e, id = null) {
        e.preventDefault();
        const isEditing = id !== null;

        try {
            const productoTerminadoNombre = document.getElementById('op-producto-final-nombre').value.trim();
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

            // Calculamos el costo proyectado en el momento de la creación
            let costoTotalProyectado = 0;
            for (const comp of componentes) {
                const materiaPrima = this.findById(this.productos, comp.productoId);
                costoTotalProyectado += (materiaPrima.costo || 0) * comp.cantidad;
            }

            // Crear el registro de la orden en estado "Pendiente"
            const nuevaOrden = {
                id: this.idCounter++,
                numero: `OP-${this.idCounter}`,
                ...data,
                componentes,
                costoTotal: costoTotalProyectado, // Guardamos el costo proyectado
                estado: 'Pendiente' // <-- CAMBIO CLAVE
            };
            this.ordenesProduccion.push(nuevaOrden);

            this.saveAll();
            this.closeModal();
            this.irModulo('produccion');
            this.showToast('Orden de Producción planificada con éxito.', 'success');

        } catch(error) {
            this.showToast(error.message, 'error');
            console.error("Error al guardar la orden de producción:", error);
        }
    },
    completarOrdenProduccion(ordenId) {
        const orden = this.findById(this.ordenesProduccion, ordenId);
        if (!orden) {
            this.showToast('Error: Orden de producción no encontrada.', 'error');
            return;
        }

        this.showConfirm(
            `¿Estás seguro de que deseas completar la Orden #${orden.numero}? Se consumirán las materias primas del inventario y se creará el producto final. Esta acción no se puede deshacer.`,
            () => {
                try {
                    // 1. Validar stock y recalcular costo AHORA, con los costos actuales
                    let costoRealProduccion = 0;
                    for (const comp of orden.componentes) {
                        const materiaPrima = this.findById(this.productos, comp.productoId);
                        if (materiaPrima.stock < comp.cantidad) {
                            throw new Error(`Stock insuficiente para "${materiaPrima.nombre}". Necesitas ${comp.cantidad}, tienes ${materiaPrima.stock}.`);
                        }
                        costoRealProduccion += materiaPrima.costo * comp.cantidad;
                    }

                    // 2. Ejecutar cambios en el inventario
                    orden.componentes.forEach(comp => {
                        const materiaPrima = this.findById(this.productos, comp.productoId);
                        materiaPrima.stock -= comp.cantidad;
                    });

                    const productoTerminado = this.findById(this.productos, orden.productoTerminadoId);
                    const valorStockActualPT = (productoTerminado.stock || 0) * (productoTerminado.costo || 0);
                    const nuevoStockPT = (productoTerminado.stock || 0) + orden.cantidadProducida;
                    productoTerminado.costo = nuevoStockPT > 0 ? (valorStockActualPT + costoRealProduccion) / nuevoStockPT : (costoRealProduccion / orden.cantidadProducida);
                    productoTerminado.stock = nuevoStockPT;
                    
                    // 3. Actualizar la orden
                    orden.costoTotal = costoRealProduccion; // Actualizar con el costo real
                    orden.estado = 'Completada';
                    orden.fechaCompletada = this.getTodayDate(); // Opcional: guardar fecha de finalización

                    // 4. Crear el asiento contable
                    const cuentaMP = 13002;
                    const cuentaPT = 13004;
                    const asiento = this.crearAsiento(orden.fechaCompletada, `Completar OP #${orden.numero}: ${orden.descripcion}`,
                        [
                            { cuentaId: cuentaPT, debe: costoRealProduccion, haber: 0 },
                            { cuentaId: cuentaMP, debe: 0, haber: costoRealProduccion }
                        ],
                        orden.id
                    );

                    if (asiento) {
                        this.saveAll();
                        this.irModulo('produccion');
                        this.showToast('Orden de Producción completada con éxito.', 'success');
                    }
                } catch(error) {
                    this.showToast(error.message, 'error');
                    console.error("Error al completar la orden:", error);
                }
            }
        );
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