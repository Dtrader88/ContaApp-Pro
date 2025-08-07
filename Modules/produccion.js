
Object.assign(ContaApp, {

    renderProduccion(params = {}) {
        const submodulo = params.submodulo || 'ordenes-produccion';

        let html = `
            <div class="flex gap-2 mb-4 border-b border-[var(--color-border-accent)] flex-wrap">
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'ordenes-produccion' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('produccion', {submodulo: 'ordenes-produccion'})">Órdenes de Producción</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'produccion-terminada' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('produccion', {submodulo: 'produccion-terminada'})">Producción Terminada para Venta</button>
            </div>
            <div id="produccion-contenido"></div>
        `;
        document.getElementById('produccion').innerHTML = html;

        if (submodulo === 'ordenes-produccion') {
            this.renderProduccion_TabOrdenes(params);
        } else if (submodulo === 'produccion-terminada') {
            this.renderProduccion_TabTerminada(params);
        }
    },
    renderProduccion_TabOrdenes(params = {}) {
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
        const { currentPage, perPage } = this.getPaginationState('produccion');
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;

        const ordenesOrdenadas = ordenes.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)); // El sort por ID numérico ya no es fiable
        const itemsParaMostrar = ordenesOrdenadas.slice(startIndex, endIndex);
        
        let tableRows = '';
        itemsParaMostrar.forEach(orden => {
            const productoFinal = this.findById(this.productos, orden.productoTerminadoId);
            let estadoTag;
            let accionesHTML;

            // --- INICIO DE LA CORRECCIÓN ---
            // Se han añadido comillas simples ('') alrededor de ${orden.id} en todas las llamadas onclick.
            if (orden.estado === 'Pendiente') {
                estadoTag = `<span class="tag tag-warning">Pendiente</span>`;
                accionesHTML = `
                    <button class="conta-btn conta-btn-small conta-btn-success" title="Completar Producción" onclick="ContaApp.completarOrdenProduccion('${orden.id}')"><i class="fa-solid fa-play"></i> Completar</button>
                    <button class="conta-btn-icon edit" title="Editar Orden" onclick="ContaApp.abrirModalOrdenProduccion('${orden.id}')"><i class="fa-solid fa-pencil"></i></button>
                    <button class="conta-btn-icon delete" title="Cancelar Orden" onclick="ContaApp.cancelarOrdenProduccion('${orden.id}')"><i class="fa-solid fa-ban"></i></button>
                `;
            } else { // Completada
                estadoTag = `<span class="tag tag-success">Completada</span>`;
                accionesHTML = `
                    <button class="conta-btn-icon" title="Ver Detalle" onclick="ContaApp.abrirModalDetalleOrdenProduccion('${orden.id}')"><i class="fa-solid fa-eye"></i></button>
                    <button class="conta-btn-icon edit" title="Duplicar Orden" onclick="ContaApp.abrirModalOrdenProduccion(null, '${orden.id}')"><i class="fa-solid fa-copy"></i></button>
                `;
            }
            // --- FIN DE LA CORRECCIÓN ---

            tableRows += `
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

        html = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra">
            <thead>
                <tr>
                    <th class="conta-table-th">Fecha</th>
                    <th class="conta-table-th">Orden #</th>
                    <th class="conta-table-th">Descripción</th>
                    <th class="conta-table-th">Producto Final</th>
                    <th class="conta-table-th text-right">Cantidad</th>
                    <th class="conta-table-th text-right">Costo Proyectado</th>
                    <th class="conta-table-th">Estado</th>
                    <th class="conta-table-th text-center">Acciones</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody></table></div>`;
        
        this.renderPaginationControls('produccion', ordenes.length);
    }
    
    document.getElementById('produccion-contenido').innerHTML = html;
},
    abrirModalOrdenProduccion(id = null, duplicarId = null) {
    const ordenOriginal = duplicarId ? this.findById(this.ordenesProduccion, duplicarId) : (id ? this.findById(this.ordenesProduccion, id) : {});
    const isEditing = id !== null && !duplicarId;
    const isDuplicating = duplicarId !== null;

    // --- INICIO DE LA CORRECCIÓN ---
    // Filtramos para que solo se puedan seleccionar productos de la categoría "Productos Terminados" (ID 13004).
    const productosTerminadosOptions = this.productos
        .filter(p => p.cuentaInventarioId === 13004) 
        .map(p => `<option value="${p.nombre}" data-id="${p.id}"></option>`)
        .join('');
    // --- FIN DE LA CORRECCIÓN ---
    
    // Opciones para la nueva unidad de medida
    const unidadesOptions = this.unidadesMedida
        .map(u => `<option value="${u.id}">${u.nombre}</option>`)
        .join('');

    const formSubmitAction = `ContaApp.guardarOrdenProduccion(event, ${isDuplicating ? null : id})`;

    const modalHTML = `
        <h3 class="conta-title mb-4">${isEditing ? 'Editar' : (isDuplicating ? 'Duplicar' : 'Nueva')} Orden de Producción</h3>
        <form onsubmit="${formSubmitAction}" class="space-y-4 modal-form">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label>Nombre/Descripción de la Orden</label><input type="text" id="op-descripcion" class="w-full conta-input mt-1" placeholder="Ej: Señalética de PVC 10x10" value="${ordenOriginal.descripcion || ''}" required></div>
                <div><label>Fecha de Producción</label><input type="date" id="op-fecha" value="${isDuplicating ? this.getTodayDate() : (ordenOriginal.fecha || this.getTodayDate())}" class="w-full conta-input mt-1" required></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div class="md:col-span-1">
                    <label>Producto Final a Fabricar</label>
                    <div class="flex items-center gap-2 mt-1">
                        <input list="productos-terminados-datalist-op" id="op-producto-terminado-input" class="w-full conta-input" placeholder="Selecciona o crea un producto..." required>
                        <datalist id="productos-terminados-datalist-op">${productosTerminadosOptions}</datalist>
                        <input type="hidden" id="op-producto-terminado-id">
                        <button type="button" class="conta-btn conta-btn-small" onclick="ContaApp.abrirSubModalNuevoProducto('produccion')">+</button>
                    </div>
                </div>
                <div>
                    <label>Unidad de Medida (para nuevos)</label>
                    <select id="op-producto-unidad-medida" class="w-full conta-input mt-1">${unidadesOptions}</select>
                </div>
                <div>
                    <label>Cantidad a Producir</label>
                    <input type="number" id="op-cantidad-producir" class="w-full conta-input mt-1" value="${ordenOriginal.cantidadProducida || 1}" min="1" required>
                </div>
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
        .filter(p => p.cuentaInventarioId === 13002) 
        .map(p => {
            const unidad = this.findById(this.unidadesMedida, p.unidadMedidaId);
            // Agregamos la unidad al nombre para mayor claridad
            const nombreMostrado = unidad ? `${p.nombre} (${unidad.nombre})` : p.nombre;
            return `<option value="${p.id}" ${componente.productoId === p.id ? 'selected' : ''}>${nombreMostrado}</option>`;
        })
        .join('');

    // --- INICIO DE LA CORRECCIÓN: Diseño de fila simplificado ---
    // Se eliminan los campos de unidad y costo.
    const itemHTML = `
        <div class="grid grid-cols-12 gap-4 items-center dynamic-row">
            <div class="col-span-8">
                <select class="w-full conta-input op-componente-id" required>
                    <option value="">-- Selecciona una materia prima --</option>
                    ${materiasPrimasOptions}
                </select>
            </div>
            <div class="col-span-3">
                 <input type="number" step="any" class="w-full conta-input text-right op-componente-cantidad" placeholder="Cantidad a usar" value="${componente.cantidad || ''}" required>
            </div>
            <button type="button" class="col-span-1 conta-btn-icon delete" onclick="this.closest('.dynamic-row').remove()">🗑️</button>
        </div>
    `;
    // --- FIN DE LA CORRECCIÓN ---

    container.insertAdjacentHTML('beforeend', itemHTML);
},

    async guardarOrdenProduccion(e, id = null) {
    e.preventDefault();
    const isEditing = id !== null;
    const submitButton = e.target.querySelector('button[type="submit"]');
    this.toggleButtonLoading(submitButton, true);

    try {
        const descripcion = document.getElementById('op-descripcion').value;
        const fecha = document.getElementById('op-fecha').value;
        let productoTerminadoId = document.getElementById('op-producto-terminado-id').value;
        const productoFinalNombre = document.getElementById('op-producto-terminado-input').value.trim();
        const cantidadProducida = parseFloat(document.getElementById('op-cantidad-producir').value);
        const unidadMedidaId = parseInt(document.getElementById('op-producto-unidad-medida').value);

        let productoFueCreado = false;
        if (!productoTerminadoId) {
            if (!productoFinalNombre) throw new Error('Debes especificar el nombre del producto final a fabricar.');
            
            let productoExistente = this.productos.find(p => p.nombre.toLowerCase() === productoFinalNombre.toLowerCase());
            if (productoExistente) {
                productoTerminadoId = productoExistente.id;
            } else {
                const nuevoProducto = {
                    id: this.generarUUID(),
                    nombre: productoFinalNombre,
                    tipo: 'producto',
                    stock: 0, costo: 0, precio: 0,
                    unidadMedidaId: unidadMedidaId,
                    cuentaIngresoId: 41002,
                    cuentaInventarioId: 13004
                };
                this.productos.push(nuevoProducto);
                productoTerminadoId = nuevoProducto.id;
                productoFueCreado = true;
                this.showToast(`Producto "${productoFinalNombre}" creado en el inventario.`, 'info');
            }
        }

        const componentes = [];
        document.querySelectorAll('#op-componentes-container .dynamic-row').forEach(row => {
            // --- INICIO DE LA CORRECCIÓN ---
            // Se elimina parseInt para que acepte tanto IDs numéricos antiguos como UUIDs de texto nuevos.
            const productoId = row.querySelector('.op-componente-id').value;
            // --- FIN DE LA CORRECCIÓN ---
            const cantidad = parseFloat(row.querySelector('.op-componente-cantidad').value);
            if (productoId && cantidad > 0) {
                componentes.push({ productoId, cantidad });
            }
        });

        if (!productoTerminadoId || componentes.length === 0 || !cantidadProducida || cantidadProducida <= 0) {
            throw new Error('Debes completar todos los campos de la orden con valores válidos.');
        }
        
        let costoTotalProyectado = 0;
        for (const comp of componentes) {
            const materiaPrima = this.findById(this.productos, comp.productoId);
            costoTotalProyectado += (materiaPrima.costo || 0) * comp.cantidad;
        }

        if (isEditing) {
            const ordenExistente = this.findById(this.ordenesProduccion, id);
            if (ordenExistente) {
                Object.assign(ordenExistente, {
                    descripcion, fecha, productoTerminadoId, cantidadProducida, 
                    productoFinalNombre, componentes, costoTotal: costoTotalProyectado
                });
            }
        } else {
            const nuevaOrden = {
                id: this.generarUUID(),
                numero: `OP-${this.generarUUID().substring(0, 8)}`,
                descripcion, fecha, productoTerminadoId, cantidadProducida, productoFinalNombre,
                componentes,
                costoTotal: costoTotalProyectado,
                estado: 'Pendiente'
            };
            this.ordenesProduccion.push(nuevaOrden);
        }
        
        await this.saveAll();

        this.closeModal();
        this.irModulo('produccion');
        this.showToast(`Orden de Producción ${isEditing ? 'actualizada' : 'planificada'} con éxito.`, 'success');

    } catch(error) {
        this.showToast(error.message, 'error');
        console.error("Error al guardar la orden de producción:", error);
    } finally {
        this.toggleButtonLoading(submitButton, false);
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
        async () => {
            try {
                let costoRealProduccion = 0;
                const componentesConsumidos = [];

                for (const comp of orden.componentes) {
                    const materiaPrima = this.findById(this.productos, comp.productoId);
                    if (!materiaPrima || materiaPrima.stock < comp.cantidad) {
                        throw new Error(`Stock insuficiente para "${materiaPrima?.nombre || 'un componente'}". Necesitas ${comp.cantidad}, tienes ${materiaPrima?.stock || 0}.`);
                    }
                    const costoConsumo = materiaPrima.costo * comp.cantidad;
                    costoRealProduccion += costoConsumo;
                    componentesConsumidos.push({
                        productoId: comp.productoId,
                        cantidad: comp.cantidad,
                        costo: materiaPrima.costo
                    });
                }

                // Disminuir stock de materias primas
                componentesConsumidos.forEach(comp => {
                    const materiaPrima = this.findById(this.productos, comp.productoId);
                    materiaPrima.stock -= comp.cantidad;
                });

                // Actualizar producto terminado
                const productoTerminado = this.findById(this.productos, orden.productoTerminadoId);
                const valorStockActualPT = (productoTerminado.stock || 0) * (productoTerminado.costo || 0);
                const nuevoStockPT = (productoTerminado.stock || 0) + orden.cantidadProducida;
                productoTerminado.costo = nuevoStockPT > 0 ? (valorStockActualPT + costoRealProduccion) / nuevoStockPT : (costoRealProduccion / orden.cantidadProducida);
                productoTerminado.stock = nuevoStockPT;
                
                // Actualizar la orden
                orden.costoTotal = costoRealProduccion;
                orden.estado = 'Completada';
                orden.fechaCompletada = this.getTodayDate();

                // Crear transacción de SALIDA para las materias primas
                const transaccionSalida = {
                    id: this.generarUUID(),
                    tipo: 'salida_produccion',
                    fecha: orden.fechaCompletada,
                    descripcion: `Consumo de material para OP #${orden.numero}`,
                    items: componentesConsumidos,
                    total: costoRealProduccion,
                    ordenId: orden.id
                };
                this.transacciones.push(transaccionSalida);

                // --- INICIO DE LA CORRECCIÓN CLAVE ---
                // Crear transacción de ENTRADA para el producto terminado
                const transaccionEntrada = {
                    id: this.generarUUID(),
                    tipo: 'entrada_produccion', // Nuevo tipo de transacción
                    fecha: orden.fechaCompletada,
                    descripcion: `Producción terminada de OP #${orden.numero}`,
                    items: [{ // El "item" es el producto terminado
                        productoId: productoTerminado.id,
                        cantidad: orden.cantidadProducida,
                        costoUnitario: productoTerminado.costo
                    }],
                    total: costoRealProduccion,
                    ordenId: orden.id
                };
                this.transacciones.push(transaccionEntrada);
                // --- FIN DE LA CORRECCIÓN CLAVE ---

                // Crear el asiento contable de producción
                const cuentaProductosTerminadosId = 13004;
                const movimientos = [{ cuentaId: cuentaProductosTerminadosId, debe: costoRealProduccion, haber: 0 }];
                componentesConsumidos.forEach(comp => {
                    const materiaPrima = this.findById(this.productos, comp.productoId);
                    const costoComponente = comp.costo * comp.cantidad;
                    movimientos.push({ cuentaId: materiaPrima.cuentaInventarioId, debe: 0, haber: costoComponente });
                });
                const asiento = this.crearAsiento(
                    orden.fechaCompletada, 
                    `Completar OP #${orden.numero}: ${orden.descripcion}`,
                    movimientos,
                    orden.id
                );

                if (!asiento) {
                    throw new Error("No se pudo crear el asiento contable de producción.");
                }
                
                await this.saveAll();
                this.irModulo('produccion');
                this.showToast('Orden de Producción completada con éxito.', 'success');

            } catch(error) {
                this.showToast(`Error al anular la orden: ${error.message}`, 'error');
                console.error("Error al completar la orden:", error);
            }
        }
    );
},

        renderProduccion_TabTerminada(params = {}) {
    document.getElementById('page-actions-header').innerHTML = `
        <button class="conta-btn conta-btn-success" onclick="ContaApp.facturarProduccionSeleccionada()">
            <i class="fa-solid fa-file-invoice-dollar me-2"></i>Facturar Selección
        </button>
    `;

    const productosTerminados = this.productos.filter(p => 
        p.cuentaInventarioId === 13004
    );

    let html;
    if (productosTerminados.length === 0) {
        html = this.generarEstadoVacioHTML(
            'fa-box-open',
            'No hay productos terminados',
            'Completa una Orden de Producción para que los productos fabricados aparezcan aquí.',
            'Ir a Órdenes de Producción',
            "ContaApp.irModulo('produccion', {submodulo: 'ordenes-produccion'})"
        );
    } else {
        const { currentPage, perPage } = this.getPaginationState('produccion-terminada');
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        const itemsParaMostrar = productosTerminados.slice(startIndex, endIndex);
        
        let tableRows = '';
        itemsParaMostrar.forEach(producto => {
            const unidad = this.findById(this.unidadesMedida, producto.unidadMedidaId);
            tableRows += `
                <tr>
                    <td class="conta-table-td text-center"><input type="checkbox" class="prod-terminada-check" data-producto-id="${producto.id}"></td>
                    <td class="conta-table-td font-bold">${producto.nombre}</td>
                    <td class="conta-table-td">${unidad ? unidad.nombre : 'N/A'}</td>
                    <td class="conta-table-td text-right font-mono">${producto.stock}</td>
                    <td class="conta-table-td text-right font-mono">${this.formatCurrency(producto.costo)}</td>
                </tr>
            `;
        });

        html = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra">
            <thead>
                <tr>
                    <th class="conta-table-th w-10"><input type="checkbox" onchange="ContaApp.toggleAllCheckboxes(this, 'prod-terminada-check')"></th>
                    <th class="conta-table-th">Producto Fabricado</th>
                    <th class="conta-table-th">Unidad de Medida</th>
                    <th class="conta-table-th text-right">Stock Disponible</th>
                    <th class="conta-table-th text-right">Costo Unitario</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody></table></div>`;
        
        this.renderPaginationControls('produccion-terminada', productosTerminados.length);
    }
    
    document.getElementById('produccion-contenido').innerHTML = html;
},

    actualizarPrecioProducto(productoId, nuevoPrecio) {
        const producto = this.findById(this.productos, productoId);
        if (producto) {
            producto.precio = parseFloat(nuevoPrecio) || 0;
            this.saveAll();
            this.showToast(`Precio de "${producto.nombre}" actualizado.`, 'info');
        }
    },

        facturarProduccionSeleccionada() {
    const itemsParaFacturar = [];
    document.querySelectorAll('.prod-terminada-check:checked').forEach(checkbox => {
        // --- INICIO DE LA CORRECCIÓN ---
        // Se elimina parseInt para manejar correctamente los UUIDs de texto.
        const productoId = checkbox.dataset.productoId;
        // --- FIN DE LA CORRECCIÓN ---
        
        const producto = this.findById(this.productos, productoId);
        if (producto) {
            itemsParaFacturar.push({
                itemType: 'producto',
                productoId: producto.id,
                cantidad: 1, // Por defecto se añade 1, se puede cambiar en el modal de venta
                precio: producto.precio || 0,
                costo: producto.costo
            });
        }
    });

    if (itemsParaFacturar.length === 0) {
        this.showToast('Debes seleccionar al menos un producto para facturar.', 'error');
        return;
    }

    // Usamos la variable temporal para pasar los datos...
    this.tempItemsParaVenta = itemsParaFacturar;
    // ...y navegamos al módulo de ventas con la instrucción de crear un nuevo documento.
    this.irModulo('ventas', { action: 'new' });
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
                <button class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cerrar</button>
            </div>
        `;
        this.showModal(modalHTML, '3xl');
    },
});