
Object.assign(ContaApp, {

    renderProduccion(params = {}) {
        document.getElementById('page-actions-header').innerHTML = `
            <button class.conta-btn" onclick="ContaApp.abrirModalOrdenProduccion()">+ Nueva Orden de Producción</button>
        `;

        let html;
        const ordenes = this.ordenesProduccion || [];

        if (ordenes.length === 0) {
            html = this.generarEstadoVacioHTML(
                'fa-cogs',
                'Aún no tienes Órdenes de Producción',
                'Crea tu primera orden para registrar la fabricación de un producto terminado a partir de tus materias primas.',
                '+ Crear Primera Orden',
                "ContaApp.abrirModalOrdenProduccion()"
            );
        } else {
            // Futuro: Aquí construiremos la tabla con la lista de órdenes.
            html = `<div class="conta-card">Tabla de Órdenes de Producción aparecerá aquí.</div>`;
        }
        
        document.getElementById('produccion').innerHTML = html;
    },

    abrirModalOrdenProduccion(id = null) {
        const orden = id ? this.findById(this.ordenesProduccion, id) : {};
        const isEditing = id !== null; // En el futuro, lo usaremos para editar y duplicar

        const productosTerminadosOptions = this.productos
            .filter(p => p.tipo === 'producto')
            .map(p => `<option value="${p.nombre}" data-id="${p.id}"></option>`)
            .join('');

        const modalHTML = `
            <h3 class="conta-title mb-4">${isEditing ? 'Editar' : 'Nueva'} Orden de Producción</h3>
            <form onsubmit="ContaApp.guardarOrdenProduccion(event, ${id})" class="space-y-4 modal-form">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label>Nombre/Descripción de la Orden</label>
                        <input type="text" id="op-descripcion" class="w-full conta-input mt-1" placeholder="Ej: Señalética de PVC 10x10" value="${orden.descripcion || ''}" required>
                    </div>
                    <div>
                        <label>Fecha de Producción</label>
                        <input type="date" id="op-fecha" value="${orden.fecha || this.getTodayDate()}" class="w-full conta-input mt-1" required>
                    </div>
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
                    <div>
                        <label>Cantidad a Producir</label>
                        <input type="number" id="op-cantidad-producir" class="w-full conta-input mt-1" value="${orden.cantidadProducida || 1}" min="1" required>
                    </div>
                </div>

                <div class="conta-card p-4">
                    <h4 class="font-bold mb-2">Materias Primas a Utilizar</h4>
                    <div id="op-componentes-container" class="space-y-3"></div>
                    <button type="button" class="conta-btn conta-btn-small conta-btn-accent mt-2" onclick="ContaApp.agregarComponenteOP()">+ Agregar Materia Prima</button>
                </div>
                
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button type="submit" class="conta-btn">${isEditing ? 'Guardar Cambios' : 'Crear Orden'}</button>
                </div>
            </form>
        `;
        this.showModal(modalHTML, '4xl');
        this.setupDatalistListener('op-producto-terminado-input', 'op-producto-terminado-id', 'productos-terminados-datalist-op');
        
        if (!isEditing) {
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
                    <select class="w-full conta-input op-componente-id" required>
                        <option value="">-- Selecciona una materia prima --</option>
                        ${materiasPrimasOptions}
                    </select>
                </div>
                <div class="col-span-3">
                     <input type="number" step="any" class="w-full conta-input text-right op-componente-cantidad" placeholder="Cantidad" value="${componente.cantidad || ''}" required>
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
            const data = {
                descripcion: document.getElementById('op-descripcion').value,
                fecha: document.getElementById('op-fecha').value,
                productoTerminadoId: parseInt(document.getElementById('op-producto-terminado-id').value),
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

            if (!data.productoTerminadoId || componentes.length === 0 || !data.cantidadProducida) {
                throw new Error('Debes completar todos los campos de la orden.');
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

});