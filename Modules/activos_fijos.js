// Archivo: modules/activos_fijos.js

Object.assign(ContaApp, {

            renderActivosFijos(params = {}) {
        const submodulo = params.submodulo || 'lista';

        let html = `
            <div class="flex gap-2 mb-4 border-b border-[var(--color-border-accent)] flex-wrap">
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'lista' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('activos-fijos', {submodulo: 'lista'})">Lista de Activos</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'reporte' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('activos-fijos', {submodulo: 'reporte'})">Reporte de Depreciación</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'kardex' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('activos-fijos', {submodulo: 'kardex'})">Historial por Activo</button>
            </div>
            <div id="activos-fijos-contenido"></div>
        `;
        document.getElementById('activos-fijos').innerHTML = html;

        if (submodulo === 'lista') {
            this.renderActivosFijos_TabLista(params);
        } else if (submodulo === 'reporte') {
            this.renderActivosFijos_TabReporte(params);
        } else if (submodulo === 'kardex') {
            this.renderActivosFijos_TabKardex(params);
        }
    },
        renderActivosFijos_TabLista(params = {}) {
        document.getElementById('page-actions-header').innerHTML = `
            <div class="flex gap-2 flex-wrap">
                <button class="conta-btn conta-btn-accent" onclick="ContaApp.ejecutarDepreciacionMensual()">
                    <i class="fa-solid fa-calculator me-2"></i>Calcular Depreciación del Mes
                </button>
                <button class="conta-btn" onclick="ContaApp.abrirModalActivoFijo()">+ Nuevo Activo Fijo</button>
            </div>`;

        let html;
        if (this.activosFijos.length === 0) {
            html = this.generarEstadoVacioHTML('fa-building-columns', 'Aún no tienes activos registrados', 'Añade tu primer activo fijo para empezar a gestionar su depreciación.', '+ Registrar Primer Activo', "ContaApp.abrirModalActivoFijo()");
        } else {
            html = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra">
                <thead>
                    <tr>
                        <th class="conta-table-th">Activo</th>
                        <th class="conta-table-th">Fecha Compra</th>
                        <th class="conta-table-th text-right">Costo</th>
                        <th class="conta-table-th text-right">Dep. Acum.</th>
                        <th class="conta-table-th text-right">Valor en Libros</th>
                        <th class="conta-table-th text-center">Vida Útil (Meses)</th>
                        <th class="conta-table-th">Estado</th>
                        <th class="conta-table-th text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody>`;

            this.activosFijos.sort((a,b) => new Date(b.fechaCompra) - new Date(a.fechaCompra)).forEach(activo => {
                const valorEnLibros = activo.costo - activo.depreciacionAcumulada;
                let estadoClass = 'tag-neutral';
                if (activo.estado === 'Activo') estadoClass = 'tag-success';
                if (activo.estado === 'Depreciado') estadoClass = 'tag-accent';

                html += `
                    <tr>
                        <td class="conta-table-td font-bold">${activo.nombre}</td>
                        <td class="conta-table-td">${activo.fechaCompra}</td>
                        <td class="conta-table-td text-right font-mono">${this.formatCurrency(activo.costo)}</td>
                        <td class="conta-table-td text-right font-mono">(${this.formatCurrency(activo.depreciacionAcumulada)})</td>
                        <td class="conta-table-td text-right font-mono font-bold">${this.formatCurrency(valorEnLibros)}</td>
                        <td class="conta-table-td text-center">${activo.mesesDepreciados} / ${activo.vidaUtil}</td>
                        <td class="conta-table-td"><span class="tag ${estadoClass}">${activo.estado}</span></td>
                        <td class="conta-table-td text-center">
                            <button class="conta-btn-icon edit" title="Editar" onclick="ContaApp.abrirModalActivoFijo(${activo.id})"><i class="fa-solid fa-pencil"></i></button>
                            <button class="conta-btn-icon delete" title="Dar de Baja" onclick="ContaApp.abrirModalDarDeBaja(${activo.id})"><i class="fa-solid fa-trash-can"></i></button>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
        }
        
        document.getElementById('activos-fijos-contenido').innerHTML = html;
    },
    abrirModalActivoFijo(id = null) {
        const activo = id ? this.findById(this.activosFijos, id) : {};
        const isEditing = id !== null;

        const cuentasActivoOptions = this.planDeCuentas
            .filter(c => c.parentId === 150 && c.tipo === 'DETALLE')
            .map(c => `<option value="${c.id}" ${activo.cuentaId === c.id ? 'selected' : ''}>${c.codigo} - ${c.nombre}</option>`)
            .join('');

        const cuentasPagoOptions = this.planDeCuentas
            .filter(c => (c.parentId === 110 || c.id === 210) && c.tipo === 'DETALLE')
            .map(c => `<option value="${c.id}" ${activo.cuentaPagoId === c.id ? 'selected' : ''}>${c.nombre}</option>`)
            .join('');

        const modalHTML = `
            <h3 class="conta-title mb-4">${isEditing ? 'Editar' : 'Registrar Nuevo'} Activo Fijo</h3>
            <form onsubmit="ContaApp.guardarActivoFijo(event, ${id})" class="space-y-4 modal-form">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label>Nombre del Activo</label><input type="text" id="activo-nombre" class="w-full conta-input mt-1" value="${activo.nombre || ''}" required></div>
                    <div><label>Proveedor (Opcional)</label><input list="proveedores-datalist-activo" id="activo-proveedor-input" class="w-full conta-input mt-1" placeholder="Escribe para buscar..."><input type="hidden" id="activo-proveedor-id"></div>
                </div>
                <div class="conta-card-accent text-sm">
                    <p class="font-bold">Información Contable (No editable)</p>
                    <p>Los valores de compra y vida útil no se pueden modificar después del registro para mantener la integridad de la depreciación. Para corregirlos, se debe dar de baja el activo y crearlo de nuevo.</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label>Fecha de Compra</label><input type="date" id="activo-fecha-compra" class="w-full conta-input mt-1" value="${activo.fechaCompra || this.getTodayDate()}" ${isEditing ? 'disabled' : ''} required></div>
                    <div><label>Costo de Adquisición</label><input type="number" step="0.01" id="activo-costo" class="w-full conta-input mt-1" value="${activo.costo || ''}" ${isEditing ? 'disabled' : ''} required></div>
                    <div><label>Vida Útil (en meses)</label><input type="number" id="activo-vida-util" class="w-full conta-input mt-1" value="${activo.vidaUtil || ''}" ${isEditing ? 'disabled' : ''} required></div>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button type="submit" class="conta-btn">${isEditing ? 'Guardar Cambios' : 'Registrar Activo'}</button>
                </div>
            </form>`;
        this.showModal(modalHTML, '4xl');

        if (isEditing) {
            const proveedor = this.findById(this.contactos, activo.proveedorId);
            if (proveedor) {
                document.getElementById('activo-proveedor-input').value = proveedor.nombre;
                document.getElementById('activo-proveedor-id').value = proveedor.id;
            }
        }
    },
        guardarActivoFijo(e, id = null) {
        e.preventDefault();
        const isEditing = id !== null;

        if (isEditing) {
            // Lógica de Edición (solo campos no contables)
            const activo = this.findById(this.activosFijos, id);
            if (activo) {
                activo.nombre = document.getElementById('activo-nombre').value;
                activo.proveedorId = parseInt(document.getElementById('activo-proveedor-id').value) || null;
                
                this.saveAll();
                this.closeModal();
                this.irModulo('activos-fijos');
                this.showToast('Activo fijo actualizado con éxito.', 'success');
            }
        } else {
            // Lógica de Creación (la que ya teníamos)
            const data = {
                nombre: document.getElementById('activo-nombre').value,
                cuentaId: 15001, // Asumimos Mobiliario y Equipo por ahora
                fechaCompra: document.getElementById('activo-fecha-compra').value,
                proveedorId: parseInt(document.getElementById('activo-proveedor-id').value) || null,
                costo: parseFloat(document.getElementById('activo-costo').value),
                vidaUtil: parseInt(document.getElementById('activo-vida-util').value),
                valorResidual: 0, // Simplificamos, asumimos 0 por ahora
                cuentaPagoId: 210 // Asumimos Cuentas por Pagar
            };

            if (isNaN(data.costo) || isNaN(data.vidaUtil)) { this.showToast('Costo y Vida Útil deben ser números.', 'error'); return; }
            if (data.costo <= 0) { this.showToast('El costo debe ser mayor a cero.', 'error'); return; }

            const nuevoActivo = { id: this.idCounter++, ...data, depreciacionAcumulada: 0, mesesDepreciados: 0, estado: 'Activo' };
            this.activosFijos.push(nuevoActivo);

            const asiento = this.crearAsiento(data.fechaCompra, `Compra de activo fijo: ${data.nombre}`,
                [{ cuentaId: data.cuentaId, debe: data.costo, haber: 0 }, { cuentaId: data.cuentaPagoId, debe: 0, haber: data.costo }]
            );

            if (asiento) {
                this.saveAll();
                this.closeModal();
                this.irModulo('activos-fijos');
                this.showToast('Activo fijo registrado con éxito.', 'success');
            }
        }
    },
    ejecutarDepreciacionMensual() {
        this.showConfirm(
            '¿Deseas registrar la depreciación para el mes actual? Se creará un asiento contable para todos los activos elegibles. Esta acción solo debe realizarse una vez por mes.',
            () => {
                let totalDepreciacionDelMes = 0;
                const hoy = new Date();
                const fechaAsiento = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().slice(0,10); // Último día del mes actual

                const activosADepreciar = this.activosFijos.filter(activo => 
                    activo.estado === 'Activo' && activo.mesesDepreciados < activo.vidaUtil
                );

                if (activosADepreciar.length === 0) {
                    this.showToast('No hay activos elegibles para depreciar este mes.', 'info');
                    return;
                }

                activosADepreciar.forEach(activo => {
                    const montoADepreciar = (activo.costo - activo.valorResidual) / activo.vidaUtil;
                    
                    activo.depreciacionAcumulada += montoADepreciar;
                    activo.mesesDepreciados += 1;
                    totalDepreciacionDelMes += montoADepreciar;

                    if (activo.mesesDepreciados >= activo.vidaUtil) {
                        activo.estado = 'Depreciado';
                    }
                });

                // Crear un único asiento contable consolidado para la depreciación del mes
                const cuentaGastoDepreciacionId = 51004; // Gasto por Depreciación
                const cuentaDepAcumuladaId = 15901; // Dep. Acum. Mobiliario y Equipo
                
                const asiento = this.crearAsiento(
                    fechaAsiento,
                    `Depreciación del mes ${hoy.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}`,
                    [
                        { cuentaId: cuentaGastoDepreciacionId, debe: totalDepreciacionDelMes, haber: 0 },
                        { cuentaId: cuentaDepAcumuladaId, debe: 0, haber: totalDepreciacionDelMes }
                    ]
                );

                if (asiento) {
                    this.saveAll();
                    this.irModulo('activos-fijos');
                    this.showToast('Depreciación mensual registrada con éxito.', 'success');
                }
            }
        );
    },
    abrirModalDarDeBaja(id) {
        const activo = this.findById(this.activosFijos, id);
        if (!activo) return;

        const valorEnLibros = activo.costo - activo.depreciacionAcumulada;

        const modalHTML = `
            <h3 class="conta-title mb-4">Dar de Baja Activo Fijo</h3>
            <p class="mb-2"><strong>Activo:</strong> ${activo.nombre}</p>
            <p class="mb-2"><strong>Valor en Libros Actual:</strong> ${this.formatCurrency(valorEnLibros)}</p>
            <p class="text-[var(--color-text-secondary)] text-sm mb-6">Esta acción registrará una pérdida por el valor en libros restante y cambiará el estado del activo a "De Baja". Esta acción es irreversible.</p>

            <form onsubmit="ContaApp.guardarBajaActivo(event, ${id})" class="modal-form">
                <div>
                    <label>Fecha de la Baja</label>
                    <input type="date" id="baja-fecha" value="${this.getTodayDate()}" class="w-full conta-input mt-1" required>
                </div>
                <div class="flex justify-end gap-2 mt-8">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button type="submit" class="conta-btn conta-btn-danger">Confirmar Baja</button>
                </div>
            </form>
        `;
        this.showModal(modalHTML, 'xl');
    },

    guardarBajaActivo(e, id) {
        e.preventDefault();
        const activo = this.findById(this.activosFijos, id);
        const fechaBaja = document.getElementById('baja-fecha').value;
        const valorEnLibros = activo.costo - activo.depreciacionAcumulada;

        // Cuentas involucradas
        const cuentaActivoId = activo.cuentaId;
        const cuentaDepAcumuladaId = 15901; // Asumimos la de Mobiliario y Equipo
        const cuentaPerdidaId = 51003; // Gasto por Merma de Inventario es una buena aproximación por ahora

        const asiento = this.crearAsiento(
            fechaBaja,
            `Baja de activo fijo: ${activo.nombre}`,
            [
                // 1. DEBITAMOS la depreciación acumulada para saldarla (ponerla en cero)
                { cuentaId: cuentaDepAcumuladaId, debe: activo.depreciacionAcumulada, haber: 0 },
                // 2. DEBITAMOS el gasto por la pérdida del valor restante
                { cuentaId: cuentaPerdidaId, debe: valorEnLibros, haber: 0 },
                // 3. ACREDITAMOS el activo por su costo original para eliminarlo del balance
                { cuentaId: cuentaActivoId, debe: 0, haber: activo.costo }
            ]
        );

        if (asiento) {
            activo.estado = 'De Baja';
            this.saveAll();
            this.closeModal();
            this.irModulo('activos-fijos');
            this.showToast('Activo dado de baja con éxito.', 'success');
        }
    },
        renderActivosFijos_TabReporte(params = {}) {
        document.getElementById('page-actions-header').innerHTML = `
            <button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarReporteEstilizadoPDF('Reporte de Activos Fijos', 'reporte-activos-area')">
                <i class="fa-solid fa-print me-2"></i>Imprimir PDF
            </button>`;

        const hoy = new Date();
        const primerDiaAno = new Date(hoy.getFullYear(), 0, 1).toISOString().slice(0, 10);

        // Aquí irá la lógica para generar los datos del reporte. Por ahora, un mensaje temporal.
        let html = `
            <div class="conta-card" id="reporte-activos-area">
                <h3 class="conta-subtitle">Reporte de Movimiento y Depreciación de Activos Fijos</h3>
                <div class="flex items-end gap-4 mb-6">
                    <div>
                        <label class="text-sm font-medium">Desde</label>
                        <input type="date" id="reporte-activos-inicio" class="w-full conta-input" value="${primerDiaAno}">
                    </div>
                    <div>
                        <label class="text-sm font-medium">Hasta</label>
                        <input type="date" id="reporte-activos-fin" class="w-full conta-input" value="${this.getTodayDate()}">
                    </div>
                    <button class="conta-btn">Generar Reporte</button>
                </div>
                <p class="text-center text-[var(--color-text-secondary)] p-8">El contenido del reporte detallado se implementará aquí.</p>
            </div>
        `;
        document.getElementById('activos-fijos-contenido').innerHTML = html;
    },

    renderActivosFijos_TabKardex(params = {}) {
        document.getElementById('page-actions-header').innerHTML = '';

        // Aquí irá la lógica para el selector de activo y la tabla de historial. Por ahora, un mensaje temporal.
        let html = `
            <div class="conta-card">
                <h3 class="conta-subtitle">Historial de Movimientos por Activo (Kardex)</h3>
                <p class="text-center text-[var(--color-text-secondary)] p-8">La funcionalidad de Kardex de Activos Fijos se implementará aquí.</p>
            </div>
        `;
        document.getElementById('activos-fijos-contenido').innerHTML = html;
    },
});