// Archivo: modules/activos_fijos.js

Object.assign(ContaApp, {

    renderActivosFijos(params = {}) {
        // Definimos las acciones que aparecerán en la cabecera de la página
        document.getElementById('page-actions-header').innerHTML = `
            <div class="flex gap-2 flex-wrap">
                <button class="conta-btn" onclick="ContaApp.abrirModalActivoFijo()">+ Nuevo Activo Fijo</button>
            </div>`;

        let html;
        if (this.activosFijos.length === 0) {
            html = this.generarEstadoVacioHTML(
                'fa-building-columns',
                'Aún no tienes activos registrados',
                'Añade tu primer activo fijo, como una computadora o mobiliario, para empezar a gestionar su depreciación.',
                '+ Registrar Primer Activo',
                "ContaApp.abrirModalActivoFijo()"
            );
        } else {
            // Futuro: Aquí construiremos la tabla con la lista de activos.
            // Por ahora, dejamos un mensaje temporal.
            html = `<div class="conta-card">Tabla de activos fijos aparecerá aquí.</div>`;
        }
        
        // Asignamos el HTML generado al contenedor del módulo
        document.getElementById('activos-fijos').innerHTML = html;
    },
abrirModalActivoFijo(id = null) {
        // Por ahora, solo manejaremos la creación. La edición (id) la implementaremos después.
        const activo = id ? this.findById(this.activosFijos, id) : {};

        // Creamos las opciones para el <select> de las cuentas de activo fijo
        const cuentasActivoOptions = this.planDeCuentas
            .filter(c => c.parentId === 150 && c.tipo === 'DETALLE') // Solo subcuentas de "Propiedad, Planta y Equipo"
            .map(c => `<option value="${c.id}">${c.codigo} - ${c.nombre}</option>`)
            .join('');

        // Creamos las opciones para el <select> de la fuente de pago
        const cuentasPagoOptions = this.planDeCuentas
            .filter(c => (c.parentId === 110 || c.id === 210) && c.tipo === 'DETALLE') // Bancos o Cuentas por Pagar
            .map(c => `<option value="${c.id}">${c.nombre}</option>`)
            .join('');

        const modalHTML = `
            <h3 class="conta-title mb-4">${id ? 'Editar' : 'Registrar Nuevo'} Activo Fijo</h3>
            <form onsubmit="ContaApp.guardarActivoFijo(event, ${id})" class="space-y-4 modal-form">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label>Nombre del Activo</label>
                        <input type="text" id="activo-nombre" class="w-full conta-input mt-1" value="${activo.nombre || ''}" required>
                    </div>
                    <div>
                        <label>Cuenta Contable del Activo</label>
                        <select id="activo-cuenta-id" class="w-full conta-input mt-1" required>${cuentasActivoOptions}</select>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label>Fecha de Compra</label>
                        <input type="date" id="activo-fecha-compra" class="w-full conta-input mt-1" value="${activo.fechaCompra || this.getTodayDate()}" required>
                    </div>
                    <div>
                        <label>Proveedor (Opcional)</label>
                        <input list="proveedores-datalist-activo" id="activo-proveedor-input" class="w-full conta-input mt-1" placeholder="Escribe para buscar...">
                        <datalist id="proveedores-datalist-activo">
                            ${this.contactos.filter(c => c.tipo === 'proveedor').map(c => `<option value="${c.nombre}" data-id="${c.id}"></option>`).join('')}
                        </datalist>
                        <input type="hidden" id="activo-proveedor-id">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label>Costo de Adquisición</label>
                        <input type="number" step="0.01" id="activo-costo" class="w-full conta-input mt-1" value="${activo.costo || ''}" required>
                    </div>
                    <div>
                        <label>Vida Útil (en meses)</label>
                        <input type="number" id="activo-vida-util" class="w-full conta-input mt-1" value="${activo.vidaUtil || ''}" placeholder="Ej: 36" required>
                    </div>
                     <div>
                        <label>Valor Residual</label>
                        <input type="number" step="0.01" id="activo-valor-residual" class="w-full conta-input mt-1" value="${activo.valorResidual || 0}" required>
                    </div>
                </div>

                <div>
                    <label>Forma de Pago</label>
                    <select id="activo-pago-id" class="w-full conta-input mt-1" required>
                        <option value="210">A crédito (Cuentas por Pagar)</option>
                        ${cuentasPagoOptions}
                    </select>
                </div>
                
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button type="submit" class="conta-btn">${id ? 'Guardar Cambios' : 'Registrar Activo'}</button>
                </div>
            </form>
        `;
        this.showModal(modalHTML, '4xl');
        this.setupDatalistListener('activo-proveedor-input', 'activo-proveedor-id', 'proveedores-datalist-activo');
    },
    guardarActivoFijo(e, id = null) {
        e.preventDefault();

        // 1. Recolectar datos del formulario
        const data = {
            nombre: document.getElementById('activo-nombre').value,
            cuentaId: parseInt(document.getElementById('activo-cuenta-id').value),
            fechaCompra: document.getElementById('activo-fecha-compra').value,
            proveedorId: parseInt(document.getElementById('activo-proveedor-id').value) || null,
            costo: parseFloat(document.getElementById('activo-costo').value),
            vidaUtil: parseInt(document.getElementById('activo-vida-util').value),
            valorResidual: parseFloat(document.getElementById('activo-valor-residual').value),
            cuentaPagoId: parseInt(document.getElementById('activo-pago-id').value)
        };

        // 2. Validaciones
        if (isNaN(data.costo) || isNaN(data.vidaUtil) || isNaN(data.valorResidual)) {
            this.showToast('Costo, Vida Útil y Valor Residual deben ser números válidos.', 'error');
            return;
        }

        if (data.costo <= data.valorResidual) {
            this.showToast('El costo debe ser mayor que el valor residual.', 'error');
            return;
        }

        // 3. Crear el objeto del activo
        const nuevoActivo = {
            id: this.idCounter++,
            ...data,
            depreciacionAcumulada: 0,
            mesesDepreciados: 0,
            estado: 'Activo' // Otros estados podrían ser 'Vendido', 'Dado de Baja'
        };
        this.activosFijos.push(nuevoActivo);

        // 4. Crear el asiento contable de la compra
        const cuentaActivo = this.findById(this.planDeCuentas, data.cuentaId);
        const asiento = this.crearAsiento(
            data.fechaCompra,
            `Compra de activo fijo: ${data.nombre}`,
            [
                { cuentaId: data.cuentaId, debe: data.costo, haber: 0 }, // DEBE: Aumenta el activo
                { cuentaId: data.cuentaPagoId, debe: 0, haber: data.costo } // HABER: Disminuye banco o aumenta Cuentas por Pagar
            ]
        );

        // 5. Finalizar
        if (asiento) {
            this.saveAll();
            this.closeModal();
            this.irModulo('activos-fijos');
            this.showToast('Activo fijo registrado con éxito.', 'success');
        }
    },
});