// Archivo: modules/produccion.js

Object.assign(ContaApp, {

    renderProduccion(params = {}) {
        const submodulo = params.submodulo || 'listas-materiales';

        let html = `
            <div class="flex gap-2 mb-4 border-b border-[var(--color-border-accent)] flex-wrap">
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'listas-materiales' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('produccion', {submodulo: 'listas-materiales'})">Listas de Materiales (BOM)</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'ordenes-produccion' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('produccion', {submodulo: 'ordenes-produccion'})">Órdenes de Producción</button>
            </div>
            <div id="produccion-contenido"></div>
        `;
        document.getElementById('produccion').innerHTML = html;

        if (submodulo === 'listas-materiales') {
            this.renderProduccion_TabListasMateriales(params);
        } else if (submodulo === 'ordenes-produccion') {
            this.renderProduccion_TabOrdenes(params);
        }
    },
      renderProduccion_TabListasMateriales(params = {}) {
        document.getElementById('page-actions-header').innerHTML = `
            <button class="conta-btn" onclick="ContaApp.abrirModalListaMateriales()">+ Nueva Lista de Materiales</button>
        `;

        let html;
        if (this.listasMateriales.length === 0) {
            html = this.generarEstadoVacioHTML(
                'fa-clipboard-list',
                'Aún no tienes Listas de Materiales',
                'Crea tu primera "receta" para definir qué materias primas se necesitan para fabricar un producto terminado.',
                '+ Crear Primera Lista',
                "ContaApp.abrirModalListaMateriales()"
            );
        } else {
            html = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra">
                <thead>
                    <tr>
                        <th class="conta-table-th">Producto Terminado</th>
                        <th class="conta-table-th"># de Componentes</th>
                        <th class="conta-table-th text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody>`;

            this.listasMateriales.forEach(lista => {
                const productoTerminado = this.findById(this.productos, lista.productoTerminadoId);
                html += `
                    <tr>
                        <td class="conta-table-td font-bold">${productoTerminado ? productoTerminado.nombre : 'Producto no encontrado'}</td>
                        <td class="conta-table-td">${lista.componentes.length}</td>
                        <td class="conta-table-td text-center">
                            <button class="conta-btn-icon edit" title="Editar" onclick="ContaApp.abrirModalListaMateriales(${lista.id})"><i class="fa-solid fa-pencil"></i></button>
                            <button class="conta-btn-icon delete" title="Eliminar" onclick="ContaApp.eliminarListaMateriales(${lista.id})"><i class="fa-solid fa-trash-can"></i></button>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
        }
        
        document.getElementById('produccion-contenido').innerHTML = html;
    },

    renderProduccion_TabOrdenes(params = {}) {
        document.getElementById('page-actions-header').innerHTML = `
            <button class="conta-btn">+ Nueva Orden de Producción</button>
        `;
        // Marcador de posición para la futura funcionalidad
        document.getElementById('produccion-contenido').innerHTML = this.generarEstadoVacioHTML(
            'fa-cogs',
            'Órdenes de Producción',
            'Esta sección está en construcción. Aquí podrás gestionar la fabricación de tus productos.',
            'Volver',
            "ContaApp.irModulo('produccion')"
        );
    },
    abrirModalListaMateriales(id = null) {
        const lista = id ? this.findById(this.listasMateriales, id) : {};
        const isEditing = id !== null;

        // Opciones para el producto que vamos a FABRICAR
        const productosTerminadosOptions = this.productos
            .filter(p => p.tipo === 'producto') // Asumimos que cualquier producto puede ser terminado
            .map(p => `<option value="${p.id}" ${lista.productoTerminadoId === p.id ? 'selected' : ''}>${p.nombre}</option>`)
            .join('');
            
        // Opciones para los INGREDIENTES (materias primas)
        const materiasPrimasOptions = this.productos
            .filter(p => p.tipo === 'producto') // Asumimos que cualquier producto puede ser materia prima
            .map(p => `<option value="${p.id}">${p.nombre}</option>`)
            .join('');

        const modalHTML = `
            <h3 class="conta-title mb-4">${isEditing ? 'Editar' : 'Nueva'} Lista de Materiales (BOM)</h3>
            <form onsubmit="ContaApp.guardarListaMateriales(event, ${id})" class="space-y-4 modal-form">
                
                <div>
                    <label>Producto a Fabricar</label>
                    <select id="bom-producto-terminado" class="w-full conta-input mt-1" required>
                        <option value="">-- Selecciona un producto --</option>
                        ${productosTerminadosOptions}
                    </select>
                </div>

                <div class="conta-card p-4">
                    <h4 class="font-bold mb-2">Componentes (Materias Primas)</h4>
                    <div id="bom-componentes-container" class="space-y-3"></div>
                    <button type="button" class="conta-btn conta-btn-small conta-btn-accent mt-2" onclick="ContaApp.agregarComponenteBOM()">+ Agregar Componente</button>
                </div>
                
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button type="submit" class="conta-btn">${isEditing ? 'Guardar Cambios' : 'Crear Lista'}</button>
                </div>
            </form>
        `;
        this.showModal(modalHTML, '3xl');

        // Si estamos editando, poblamos los componentes existentes
        if (isEditing) {
            lista.componentes.forEach(comp => this.agregarComponenteBOM(comp));
        } else {
            this.agregarComponenteBOM(); // Añadir una primera línea vacía
        }
    },

    agregarComponenteBOM(componente = {}) {
        const container = document.getElementById('bom-componentes-container');
        const materiasPrimasOptions = this.productos
            .filter(p => p.tipo === 'producto')
            .map(p => `<option value="${p.id}" ${componente.productoId === p.id ? 'selected' : ''}>${p.nombre}</option>`)
            .join('');

        const itemHTML = `
            <div class="grid grid-cols-12 gap-2 items-center dynamic-row">
                <div class="col-span-8">
                    <select class="w-full conta-input bom-componente-id" required>
                        <option value="">-- Selecciona una materia prima --</option>
                        ${materiasPrimasOptions}
                    </select>
                </div>
                <div class="col-span-3">
                     <input type="number" step="any" class="w-full conta-input text-right bom-componente-cantidad" placeholder="Cantidad" value="${componente.cantidad || ''}" required>
                </div>
                <button type="button" class="col-span-1 conta-btn-icon delete" onclick="this.closest('.dynamic-row').remove()">🗑️</button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHTML);
    },
});