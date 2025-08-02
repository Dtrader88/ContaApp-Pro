// Archivo: modules/activos_fijos.js

Object.assign(ContaApp, {

            renderActivosFijos(params = {}) {
        if (params.activoId) {
            this.renderActivosFijos_Kardex(params.activoId);
            return;
        }

        document.getElementById('page-actions-header').innerHTML = `
            <div class="flex gap-2 flex-wrap">
                <button class="conta-btn conta-btn-accent" onclick="ContaApp.ejecutarDepreciacionMensual()"><i class="fa-solid fa-calculator me-2"></i>Depreciación Mensual</button>
                <button class="conta-btn conta-btn-accent" onclick="ContaApp.abrirModalReporteActivos()"><i class="fa-solid fa-file-alt me-2"></i>Generar Reporte</button>
                <button class="conta-btn" onclick="ContaApp.abrirModalActivoFijo()">+ Nueva Compra de Activo</button>
            </div>`;

        let html;
        if (this.activosFijos.length === 0) {
            html = this.generarEstadoVacioHTML('fa-building-columns', 'Aún no tienes activos registrados', 'Registra tu primer activo para empezar a gestionar su depreciación.', '+ Registrar Compra de Activo', "ContaApp.abrirModalActivoFijo()");
        } else {
            const { currentPage, perPage } = this.getPaginationState('activos-fijos');
            const startIndex = (currentPage - 1) * perPage;
            const endIndex = startIndex + perPage;
            
            const activosOrdenados = this.activosFijos.sort((a,b) => new Date(b.fechaCompra) - new Date(a.fechaCompra));
            const itemsParaMostrar = activosOrdenados.slice(startIndex, endIndex);

            let tableRows = '';
            itemsParaMostrar.forEach(activo => {
                const valorEnLibros = activo.costo - activo.depreciacionAcumulada;
                let estadoClass = 'tag-neutral';
                if (activo.estado === 'Activo') estadoClass = 'tag-success';
                if (activo.estado === 'Depreciado') estadoClass = 'tag-accent';
                if (activo.estado === 'Vendido' || activo.estado === 'De Baja') estadoClass = 'tag-anulada';

                tableRows += `
                    <tr class="cursor-pointer hover:bg-[var(--color-bg-accent)]" onclick="ContaApp.irModulo('activos-fijos', { activoId: ${activo.id} })">
                        <td class="conta-table-td font-bold">${activo.nombre}</td>
                        <td class="conta-table-td">${activo.fechaCompra}</td>
                        <td class="conta-table-td text-right font-mono">${this.formatCurrency(activo.costo)}</td>
                        <td class="conta-table-td text-right font-mono">(${this.formatCurrency(activo.depreciacionAcumulada)})</td>
                        <td class="conta-table-td text-right font-mono font-bold">${this.formatCurrency(valorEnLibros)}</td>
                        <td class="conta-table-td"><span class="tag ${estadoClass}">${activo.estado}</span></td>
                        <td class="conta-table-td text-center" onclick="event.stopPropagation()">
                            ${activo.estado === 'Activo' || activo.estado === 'Depreciado' ? `
                                <button class="conta-btn-icon edit" title="Editar Nombre/Proveedor" onclick="ContaApp.abrirModalActivoFijo(${activo.id})"><i class="fa-solid fa-pencil"></i></button>
                                <button class="conta-btn-icon conta-text-primary" title="Registrar Mejora" onclick="ContaApp.abrirModalMejoraActivo(${activo.id})"><i class="fa-solid fa-wrench"></i></button>
                                <button class="conta-btn-icon conta-text-success" title="Vender Activo" onclick="ContaApp.abrirModalVenderActivo(${activo.id})"><i class="fa-solid fa-dollar-sign"></i></button>
                                <button class="conta-btn-icon delete" title="Dar de Baja (Pérdida)" onclick="ContaApp.abrirModalDarDeBaja(${activo.id})"><i class="fa-solid fa-trash-can"></i></button>
                            ` : 'N/A'}
                        </td>
                    </tr>
                `;
            });

            html = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra">
                <thead>
                    <tr>
                        <th class="conta-table-th">Activo</th>
                        <th class="conta-table-th">Fecha Compra</th>
                        <th class="conta-table-th text-right">Costo</th>
                        <th class="conta-table-th text-right">Dep. Acum.</th>
                        <th class="conta-table-th text-right">Valor en Libros</th>
                        <th class="conta-table-th">Estado</th>
                        <th class="conta-table-th text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody></table></div>`;

            this.renderPaginationControls('activos-fijos', this.activosFijos.length);
        }
        
        document.getElementById('activos-fijos').innerHTML = html;
    },   
    renderActivosFijos_Kardex(activoId) {
        const datosKardex = this.getActivoKardexData(activoId);
        if (!datosKardex) {
            this.showToast('No se encontró el activo especificado.', 'error');
            this.irModulo('activos-fijos'); // Volver a la lista
            return;
        }

        document.getElementById('page-title-header').innerText = `Historial de: ${datosKardex.activo.nombre}`;
        document.getElementById('page-actions-header').innerHTML = `
            <button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarReporteEstilizadoPDF('Kardex - ${datosKardex.activo.nombre}', 'reporte-kardex-activo-area')">
                <i class="fa-solid fa-print me-2"></i>Imprimir PDF
            </button>
        `;

        let filasHTML = '';
        datosKardex.movimientos.forEach(mov => {
            const cambioClass = mov.valorCambio >= 0 ? 'conta-text-success' : 'conta-text-danger';
            filasHTML += `
                <tr>
                    <td class="conta-table-td">${mov.fecha}</td>
                    <td class="conta-table-td">${mov.descripcion}</td>
                    <td class="conta-table-td text-right font-mono ${cambioClass}">${this.formatCurrency(mov.valorCambio)}</td>
                    <td class="conta-table-td text-right font-mono font-bold">${this.formatCurrency(mov.valorEnLibros)}</td>
                </tr>
            `;
        });

        const htmlReporte = `
            <div class="conta-card overflow-auto" id="reporte-kardex-activo-area">
                <table class="min-w-full text-sm conta-table-zebra">
                    <thead>
                        <tr>
                            <th class="conta-table-th">Fecha</th>
                            <th class="conta-table-th">Descripción del Evento</th>
                            <th class="conta-table-th text-right">Cambio en Valor</th>
                            <th class="conta-table-th text-right">Valor en Libros Resultante</th>
                        </tr>
                    </thead>
                    <tbody>${filasHTML}</tbody>
                </table>
            </div>
        `;
        document.getElementById('activos-fijos').innerHTML = htmlReporte;
    }, 
    abrirModalActivoFijo(id = null) {
        const activo = id ? this.findById(this.activosFijos, id) : {};
        const isEditing = id !== null;

        // Opciones para las cuentas de Activos Fijos (ej: Mobiliario, Vehículos)
        const cuentasActivoOptions = this.planDeCuentas
            .filter(c => c.parentId === 150 && c.tipo === 'DETALLE')
            .map(c => `<option value="${c.id}" ${activo.cuentaId === c.id ? 'selected' : ''}>${c.codigo} - ${c.nombre}</option>`)
            .join('');

        // Opciones para pagar (Bancos o a Crédito/CxP)
        const cuentasPagoOptions = this.planDeCuentas
            .filter(c => c.parentId === 110 && c.tipo === 'DETALLE') // Solo cuentas de banco
            .map(c => `<option value="${c.id}" ${activo.cuentaPagoId === c.id ? 'selected' : ''}>${c.nombre}</option>`)
            .join('');

        const modalHTML = `
            <h3 class="conta-title mb-4">${isEditing ? 'Editar' : 'Registrar Compra de'} Activo Fijo</h3>
            <form onsubmit="ContaApp.guardarActivoFijo(event, ${id})" class="space-y-4 modal-form">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label>Nombre del Activo</label>
                        <input type="text" id="activo-nombre" class="w-full conta-input mt-1" value="${activo.nombre || ''}" required>
                    </div>
                    <div>
                        <label>Proveedor</label>
                        <div class="flex items-center gap-2">
                            <input list="proveedores-datalist-activo" id="activo-proveedor-input" class="w-full conta-input mt-1" placeholder="Buscar proveedor..." required>
                            <datalist id="proveedores-datalist-activo">${this.contactos.filter(c => c.tipo === 'proveedor').map(c => `<option value="${c.nombre}" data-id="${c.id}"></option>`).join('')}</datalist>
                            <input type="hidden" id="activo-proveedor-id">
                            <button type="button" class="conta-btn conta-btn-small" onclick="ContaApp.abrirSubModalNuevoContacto('proveedor', 'activo-proveedor-input')">+</button>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label>Fecha de Compra</label>
                        <input type="date" id="activo-fecha-compra" class="w-full conta-input mt-1" value="${activo.fechaCompra || this.getTodayDate()}" ${isEditing ? 'disabled' : ''} required>
                    </div>
                    <div>
                        <label>Cuenta Contable del Activo</label>
                        <select id="activo-cuenta-id" class="w-full conta-input mt-1" ${isEditing ? 'disabled' : ''} required>${cuentasActivoOptions}</select>
                    </div>
                </div>
                
                <div class="conta-card p-4">
                    <p class="font-semibold mb-2">Detalles para Depreciación</p>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label>Costo de Adquisición</label>
                            <input type="number" step="0.01" id="activo-costo" class="w-full conta-input mt-1" value="${activo.costo || ''}" ${isEditing ? 'disabled' : ''} required>
                        </div>
                        <div>
                            <label>Vida Útil (en meses)</label>
                            <input type="number" id="activo-vida-util" class="w-full conta-input mt-1" value="${activo.vidaUtil || ''}" ${isEditing ? 'disabled' : ''} placeholder="Ej: 36" required>
                        </div>
                         <div>
                            <label>Valor Residual</label>
                            <input type="number" step="0.01" id="activo-valor-residual" class="w-full conta-input mt-1" value="${activo.valorResidual || 0}" ${isEditing ? 'disabled' : ''} required>
                        </div>
                    </div>
                </div>

                <div>
                    <label>Forma de Pago</label>
                    <select id="activo-pago-id" class="w-full conta-input mt-1" ${isEditing ? 'disabled' : ''} required>
                        <option value="210" ${activo.cuentaPagoId === 210 ? 'selected' : ''}>A crédito (Genera Cta. por Pagar)</option>
                        <optgroup label="De Contado desde:">
                            ${cuentasPagoOptions}
                        </optgroup>
                    </select>
                </div>
                
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button type="submit" class="conta-btn">${isEditing ? 'Guardar Cambios' : 'Registrar Compra'}</button>
                </div>
            </form>
        `;
        this.showModal(modalHTML, '4xl');
        this.setupDatalistListener('activo-proveedor-input', 'activo-proveedor-id', 'proveedores-datalist-activo');

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
            const data = {
                nombre: document.getElementById('activo-nombre').value,
                cuentaId: parseInt(document.getElementById('activo-cuenta-id').value),
                fechaCompra: document.getElementById('activo-fecha-compra').value,
                proveedorId: parseInt(document.getElementById('activo-proveedor-id').value),
                costo: parseFloat(document.getElementById('activo-costo').value),
                vidaUtil: parseInt(document.getElementById('activo-vida-util').value),
                valorResidual: parseFloat(document.getElementById('activo-valor-residual').value),
                cuentaPagoId: parseInt(document.getElementById('activo-pago-id').value)
            };

            if (!data.proveedorId) { this.showToast('Debe seleccionar un proveedor.', 'error'); return; }
            if (isNaN(data.costo) || isNaN(data.vidaUtil) || isNaN(data.valorResidual)) { this.showToast('Costo, Vida Útil y Valor Residual deben ser números.', 'error'); return; }
            if (data.costo <= data.valorResidual) { this.showToast('El costo debe ser mayor que el valor residual.', 'error'); return; }

            const nuevoActivo = { 
                id: this.idCounter++, 
                ...data,
                costoOriginal: data.costo,
                mejoras: [],
                depreciacionAcumulada: 0, 
                mesesDepreciados: 0, 
                estado: 'Activo' 
            };
            this.activosFijos.push(nuevoActivo);

            const asiento = this.crearAsiento(
                data.fechaCompra,
                `Compra de activo fijo: ${data.nombre}`,
                [
                    { cuentaId: data.cuentaId, debe: data.costo, haber: 0 },
                    { cuentaId: data.cuentaPagoId, debe: 0, haber: data.costo }
                ]
            );

            if (asiento) {
                this.saveAll();
                this.closeModal();
                this.irModulo('activos-fijos');
                this.showToast('Compra de activo fijo registrada con éxito.', 'success');
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

            // --- INICIO DE LA CORRECCIÓN ---
            // Se actualiza el ID de la cuenta de Gasto por Depreciación de 51004 a 61004.
            const cuentaGastoDepreciacionId = 61004; // Gasto por Depreciación
            // --- FIN DE LA CORRECCIÓN ---
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
            <p class="mb-2"><strong>Valor en Libros a dar de baja:</strong> ${this.formatCurrency(valorEnLibros)}</p>
            <form onsubmit="ContaApp.guardarBajaActivo(event, ${id})" class="modal-form space-y-4">
                <div>
                    <label>Fecha de la Baja</label>
                    <input type="date" id="baja-fecha" value="${this.getTodayDate()}" class="w-full conta-input mt-1" required>
                </div>
                <div>
                    <label>Motivo de la Baja</label>
                    <input type="text" id="baja-motivo" class="w-full conta-input mt-1" placeholder="Ej: Equipo obsoleto, daño irreparable" required>
                </div>
                <div class="flex justify-end gap-2 mt-8">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button type="submit" class="conta-btn conta-btn-danger">Confirmar Baja</button>
                </div>
            </form>`;
        this.showModal(modalHTML, 'xl');
    },

        guardarBajaActivo(e, id) {
    e.preventDefault();
    const activo = this.findById(this.activosFijos, id);
    const fechaBaja = document.getElementById('baja-fecha').value;
    const motivoBaja = document.getElementById('baja-motivo').value;
    const valorEnLibros = activo.costo - activo.depreciacionAcumulada;

    const cuentaActivoId = activo.cuentaId;
    const cuentaDepAcumuladaId = 15901;
    // --- INICIO DE LA CORRECCIÓN ---
    // Se actualiza el ID de la cuenta de Pérdida en Baja de Activos de 520 a 620.
    const cuentaPerdidaId = 620;
    // --- FIN DE LA CORRECCIÓN ---

    const asiento = this.crearAsiento(
        fechaBaja,
        `Baja de activo fijo: ${activo.nombre} (Motivo: ${motivoBaja})`,
        [
            { cuentaId: cuentaDepAcumuladaId, debe: activo.depreciacionAcumulada, haber: 0 },
            { cuentaId: cuentaPerdidaId, debe: valorEnLibros, haber: 0 },
            { cuentaId: cuentaActivoId, debe: 0, haber: activo.costo }
        ]
    );

    if (asiento) {
        activo.estado = 'De Baja';
        activo.fechaBaja = fechaBaja;
        activo.motivoBaja = motivoBaja; // Guardamos el motivo
        this.saveAll();
        this.closeModal();
        this.irModulo('activos-fijos', { activoId: id });
        this.showToast('Activo dado de baja con éxito.', 'success');
    }
},
        getActivosFijosReportData(fechaInicio, fechaFin) {
        const reporte = {
            lineas: [],
            totales: { saldoInicial: 0, adiciones: 0, depreciacionPeriodo: 0, bajas: 0, saldoFinal: 0 }
        };

        this.activosFijos.forEach(activo => {
            const depreciacionMensual = (activo.costo - activo.valorResidual) / activo.vidaUtil;
            
            // 1. Calcular Saldo Inicial (Valor en Libros al inicio del período)
            const mesesHastaInicio = Math.floor((new Date(fechaInicio) - new Date(activo.fechaCompra)) / (1000 * 60 * 60 * 24 * 30.44));
            const mesesDepreciadosAlInicio = Math.max(0, Math.min(mesesHastaInicio, activo.mesesDepreciados));
            const depAcumuladaInicial = mesesDepreciadosAlInicio * depreciacionMensual;
            const saldoInicial = activo.costo - depAcumuladaInicial;

            // 2. Calcular Adiciones (Nuevas compras en el período)
            const adiciones = (activo.fechaCompra >= fechaInicio && activo.fechaCompra <= fechaFin) ? activo.costo : 0;

            // 3. Calcular Depreciación del Período
            const mesesDepreciadosAlFin = activo.mesesDepreciados; // El estado actual ya es el final
            const depreciacionPeriodo = (mesesDepreciadosAlFin - mesesDepreciadosAlInicio) * depreciacionMensual;
            
            // 4. Calcular Bajas (Valor en libros de activos dados de baja en el período)
            const bajas = (activo.estado === 'De Baja' && activo.fechaBaja >= fechaInicio && activo.fechaBaja <= fechaFin) ? saldoInicial : 0;
            
            // 5. Calcular Saldo Final
            const saldoFinal = (activo.estado !== 'De Baja') ? activo.costo - activo.depreciacionAcumulada : 0;

            reporte.lineas.push({
                nombre: activo.nombre,
                saldoInicial,
                adiciones,
                depreciacionPeriodo,
                bajas,
                saldoFinal
            });
        });

        // Calcular totales
        reporte.totales = reporte.lineas.reduce((acc, linea) => {
            acc.saldoInicial += linea.saldoInicial;
            acc.adiciones += linea.adiciones;
            acc.depreciacionPeriodo += linea.depreciacionPeriodo;
            acc.bajas += linea.bajas;
            acc.saldoFinal += linea.saldoFinal;
            return acc;
        }, { saldoInicial: 0, adiciones: 0, depreciacionPeriodo: 0, bajas: 0, saldoFinal: 0 });

        return reporte;
    },

    filtrarReporteActivos() {
        const fechaInicio = document.getElementById('reporte-activos-inicio').value;
        const fechaFin = document.getElementById('reporte-activos-fin').value;
        this.irModulo('activos-fijos', {
            submodulo: 'reporte',
            fechaInicio,
            fechaFin
        });
    },
    abrirModalReporteActivos() {
        const hoy = new Date();
        const primerDiaAno = new Date(hoy.getFullYear(), 0, 1).toISOString().slice(0, 10);
        
        const modalHTML = `
            <h3 class="conta-title mb-4">Generar Reporte de Activos Fijos</h3>
            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label class="text-sm font-medium">Desde</label>
                        <input type="date" id="reporte-activos-inicio-modal" class="w-full conta-input" value="${primerDiaAno}">
                    </div>
                    <div>
                        <label class="text-sm font-medium">Hasta</label>
                        <input type="date" id="reporte-activos-fin-modal" class="w-full conta-input" value="${this.getTodayDate()}">
                    </div>
                </div>
            </div>
            <div class="flex justify-end gap-2 mt-8">
                <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                <button type="button" class="conta-btn" onclick="ContaApp.mostrarReporteActivosDesdeModal()">Generar y Ver</button>
            </div>
        `;
        this.showModal(modalHTML, '2xl');
    },
    mostrarReporteActivosDesdeModal() {
        const fechaInicio = document.getElementById('reporte-activos-inicio-modal').value;
        const fechaFin = document.getElementById('reporte-activos-fin-modal').value;
        const datosReporte = this.getActivosFijosReportData(fechaInicio, fechaFin);

        let filasHTML = '';
        datosReporte.lineas.forEach(linea => {
            filasHTML += `<tr>...</tr>`; // (El código de la fila es el mismo, lo omito por brevedad)
        });

        // (Reutilizamos la lógica de construcción de tabla que ya teníamos)
        const reporteHTML = `
            <div class="flex justify-between items-center mb-4 no-print">
                <h3 class="conta-title !mb-0">Reporte de Activos Fijos</h3>
                <button class="conta-btn" onclick="ContaApp.exportarReporteEstilizadoPDF('Reporte Activos Fijos', 'reporte-activos-preview-area')">Exportar PDF</button>
            </div>
            <div id="reporte-activos-preview-area" class="conta-card overflow-auto">
                <table class="min-w-full text-sm conta-table-zebra">
                     <thead>
                        <tr>
                            <th class="conta-table-th">Activo</th>
                            <th class="conta-table-th text-right">Valor Inicial</th>
                            <th class="conta-table-th text-right">Adiciones</th>
                            <th class="conta-table-th text-right">Depreciación</th>
                            <th class="conta-table-th text-right">Bajas</th>
                            <th class="conta-table-th text-right">Valor Final</th>
                        </tr>
                    </thead>
                    <tbody>${filasHTML}</tbody>
                    <tfoot class="bg-[var(--color-bg-accent)] font-bold">
                        <tr>
                            <td class="conta-table-td">TOTALES</td>
                            <td class="conta-table-td text-right font-mono">${this.formatCurrency(datosReporte.totales.saldoInicial)}</td>
                            <td class="conta-table-td text-right font-mono">${this.formatCurrency(datosReporte.totales.adiciones)}</td>
                            <td class="conta-table-td text-right font-mono">(${this.formatCurrency(datosReporte.totales.depreciacionPeriodo)})</td>
                            <td class="conta-table-td text-right font-mono">(${this.formatCurrency(datosReporte.totales.bajas)})</td>
                            <td class="conta-table-td text-right font-mono">${this.formatCurrency(datosReporte.totales.saldoFinal)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;

        this.showModal(reporteHTML, '6xl');
    },
        getActivoKardexData(activoId) {
        const activo = this.findById(this.activosFijos, activoId);
        if (!activo) return null;

        let movimientos = [];

        // 1. Calcular el Costo Original real, sea un activo viejo o nuevo.
        const totalMejoras = (activo.mejoras || []).reduce((sum, m) => sum + m.costo, 0);
        const costoOriginalReal = activo.costoOriginal !== undefined ? activo.costoOriginal : (activo.costo - totalMejoras);
        
        // 2. Añadir el movimiento de Compra con el costo correcto.
        movimientos.push({
            fecha: activo.fechaCompra,
            descripcion: 'Compra del Activo (Costo Original)',
            valorCambio: costoOriginalReal,
        });

        // 3. Añadir todas las mejoras como eventos separados.
        (activo.mejoras || []).forEach(mejora => {
            movimientos.push({
                fecha: mejora.fecha,
                descripcion: `Mejora: ${mejora.descripcion}`,
                valorCambio: mejora.costo,
            });
        });
        
        // 4. Calcular y añadir las depreciaciones.
        const depreciacionMensual = (activo.costo - (activo.valorResidual || 0)) / activo.vidaUtil;
        for (let i = 1; i <= activo.mesesDepreciados; i++) {
            const fechaDepreciacion = new Date(activo.fechaCompra);
            fechaDepreciacion.setMonth(fechaDepreciacion.getMonth() + i);
            movimientos.push({
                fecha: fechaDepreciacion.toISOString().slice(0, 10),
                descripcion: `Depreciación Mensual #${i}`,
                valorCambio: -depreciacionMensual
            });
        }
        
        // 5. Añadir la baja o venta, si existe.
        if (activo.estado === 'De Baja' || activo.estado === 'Vendido') {
            const costoTotalReal = costoOriginalReal + totalMejoras;
            const valorEnLibrosEnDisposicion = costoTotalReal - activo.depreciacionAcumulada;
             movimientos.push({
                fecha: activo.fechaBaja,
                descripcion: `Disposición del Activo (${activo.estado})`,
                valorCambio: -valorEnLibrosEnDisposicion
            });
        }

        // 6. Ordenar todos los eventos por fecha para asegurar la cronología.
        movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || (a.esCompra ? -1 : 1));
        
        // 7. Calcular el saldo corriente final.
        let valorEnLibrosCorriente = 0;
        movimientos.forEach(mov => {
            valorEnLibrosCorriente += mov.valorCambio;
            mov.valorEnLibros = valorEnLibrosCorriente;
        });

        return { activo, movimientos };
    },
    abrirModalVenderActivo(id) {
        const activo = this.findById(this.activosFijos, id);
        if (!activo) return;

        const valorEnLibros = activo.costo - activo.depreciacionAcumulada;
        const cuentasBancoOptions = this.planDeCuentas
            .filter(c => c.parentId === 110 && c.tipo === 'DETALLE')
            .map(c => `<option value="${c.id}">${c.nombre}</option>`)
            .join('');

        const modalHTML = `
            <h3 class="conta-title mb-4">Registrar Venta de Activo Fijo</h3>
            <p class="mb-2"><strong>Activo:</strong> ${activo.nombre}</p>
            <p class="mb-6"><strong>Valor en Libros Actual:</strong> ${this.formatCurrency(valorEnLibros)}</p>

            <form onsubmit="ContaApp.guardarVentaActivo(event, ${id})" class="modal-form space-y-4">
                <div>
                    <label>Fecha de la Venta</label>
                    <input type="date" id="venta-activo-fecha" value="${this.getTodayDate()}" class="w-full conta-input mt-1" required>
                </div>
                <div>
                    <label>Precio de Venta</label>
                    <input type="number" step="0.01" id="venta-activo-precio" class="w-full conta-input mt-1" required oninput="ContaApp.calcularGananciaPerdidaVentaActivo(${valorEnLibros})">
                </div>
                <div>
                    <label>Dinero recibido en (Cuenta de Banco)</label>
                    <select id="venta-activo-cuenta-banco" class="w-full conta-input mt-1" required>${cuentasBancoOptions}</select>
                </div>

                <div id="venta-activo-resultado" class="text-center font-bold h-6 mt-4"></div>

                <div class="flex justify-end gap-2 mt-8">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button type="submit" class="conta-btn conta-btn-success">Confirmar Venta</button>
                </div>
            </form>
        `;
        this.showModal(modalHTML, 'xl');
    },

    guardarVentaActivo(e, id) {
        e.preventDefault();
        const activo = this.findById(this.activosFijos, id);
        const fechaVenta = document.getElementById('venta-activo-fecha').value;
        const precioVenta = parseFloat(document.getElementById('venta-activo-precio').value);
        const cuentaBancoId = parseInt(document.getElementById('venta-activo-cuenta-banco').value);

        const valorEnLibros = activo.costo - activo.depreciacionAcumulada;
        const gananciaOPerdida = precioVenta - valorEnLibros;

        // Cuentas involucradas
        const cuentaActivoId = activo.cuentaId;
        const cuentaDepAcumuladaId = 15901;
        const cuentaGananciaId = 430; // Ganancia en Venta de Activos
        const cuentaPerdidaId = 520;  // Pérdida en Venta/Baja de Activos

        const movimientos = [
            { cuentaId: cuentaBancoId, debe: precioVenta, haber: 0 },
            { cuentaId: cuentaDepAcumuladaId, debe: activo.depreciacionAcumulada, haber: 0 },
            { cuentaId: cuentaActivoId, debe: 0, haber: activo.costo }
        ];

        if (gananciaOPerdida > 0) {
            movimientos.push({ cuentaId: cuentaGananciaId, debe: 0, haber: gananciaOPerdida });
        } else if (gananciaOPerdida < 0) {
            movimientos.push({ cuentaId: cuentaPerdidaId, debe: Math.abs(gananciaOPerdida), haber: 0 });
        }

        const asiento = this.crearAsiento(fechaVenta, `Venta de activo fijo: ${activo.nombre}`, movimientos);

        if (asiento) {
            activo.estado = 'Vendido';
            activo.fechaBaja = fechaVenta;
            this.saveAll();
            this.closeModal();
            this.irModulo('activos-fijos', { activoId: id });
            this.showToast('Venta de activo registrada con éxito.', 'success');
        }
    },

    // Pequeña función de ayuda para la UI del modal
    calcularGananciaPerdidaVentaActivo(valorEnLibros) {
        const precioVenta = parseFloat(document.getElementById('venta-activo-precio').value) || 0;
        const resultadoDiv = document.getElementById('venta-activo-resultado');
        const resultado = precioVenta - valorEnLibros;

        if (resultado > 0) {
            resultadoDiv.textContent = `Ganancia en Venta: ${this.formatCurrency(resultado)}`;
            resultadoDiv.className = 'text-center font-bold h-6 mt-4 conta-text-success';
        } else if (resultado < 0) {
            resultadoDiv.textContent = `Pérdida en Venta: ${this.formatCurrency(Math.abs(resultado))}`;
            resultadoDiv.className = 'text-center font-bold h-6 mt-4 conta-text-danger';
        } else {
            resultadoDiv.textContent = 'Sin ganancia ni pérdida';
            resultadoDiv.className = 'text-center font-bold h-6 mt-4 text-[var(--color-text-secondary)]';
        }
    },
    abrirModalMejoraActivo(id) {
        const activo = this.findById(this.activosFijos, id);
        if (!activo) return;

        const cuentasPagoOptions = this.planDeCuentas
            .filter(c => c.parentId === 110 && c.tipo === 'DETALLE')
            .map(c => `<option value="${c.id}">${c.nombre}</option>`)
            .join('');

        const modalHTML = `
            <h3 class="conta-title mb-4">Registrar Mejora (Capitalización)</h3>
            <p class="mb-2"><strong>Activo:</strong> ${activo.nombre}</p>
            <p class="text-[var(--color-text-secondary)] text-sm mb-6">Usa este formulario para registrar costos que aumentan el valor o la vida útil del activo. No lo uses para reparaciones o mantenimientos menores (esos son gastos).</p>

            <form onsubmit="ContaApp.guardarMejoraActivo(event, ${id})" class="modal-form space-y-4">
                <div>
                    <label>Fecha de la Mejora</label>
                    <input type="date" id="mejora-fecha" value="${this.getTodayDate()}" class="w-full conta-input mt-1" required>
                </div>
                <div>
                    <label>Descripción de la Mejora</label>
                    <input type="text" id="mejora-descripcion" class="w-full conta-input mt-1" placeholder="Ej: Cambio de motor, expansión de memoria" required>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label>Costo de la Mejora</label>
                        <input type="number" step="0.01" id="mejora-costo" class="w-full conta-input mt-1" required>
                    </div>
                    <div>
                        <label>Meses de Vida Útil Adicionales</label>
                        <input type="number" id="mejora-vida-util" class="w-full conta-input mt-1" value="0" required>
                    </div>
                </div>
                <div>
                    <label>Forma de Pago</label>
                    <select id="mejora-pago-id" class="w-full conta-input mt-1" required>
                        <option value="210">A crédito (Cuentas por Pagar)</option>
                        <optgroup label="De Contado desde:">${cuentasPagoOptions}</optgroup>
                    </select>
                </div>
                <div class="flex justify-end gap-2 mt-8">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button type="submit" class="conta-btn">Confirmar Mejora</button>
                </div>
            </form>
        `;
        this.showModal(modalHTML, '2xl');
    },

        guardarMejoraActivo(e, id) {
        e.preventDefault();
        const activo = this.findById(this.activosFijos, id);
        const costoMejora = parseFloat(document.getElementById('mejora-costo').value);
        const vidaUtilAdicional = parseInt(document.getElementById('mejora-vida-util').value);
        const fechaMejora = document.getElementById('mejora-fecha').value;
        const cuentaPagoId = parseInt(document.getElementById('mejora-pago-id').value);
        const descripcion = document.getElementById('mejora-descripcion').value;

        if (isNaN(costoMejora) || costoMejora <= 0) {
            this.showToast('El costo de la mejora debe ser un número positivo.', 'error');
            return;
        }

        if (!activo.mejoras) activo.mejoras = [];
        activo.mejoras.push({
            fecha: fechaMejora,
            descripcion: descripcion,
            costo: costoMejora
        });

        activo.costo += costoMejora;
        activo.vidaUtil += vidaUtilAdicional;

        const asiento = this.crearAsiento(
            fechaMejora,
            `Mejora en activo ${activo.nombre}: ${descripcion}`,
            [
                { cuentaId: activo.cuentaId, debe: costoMejora, haber: 0 },
                { cuentaId: cuentaPagoId, debe: 0, haber: costoMejora }
            ]
        );

        if (asiento) {
            this.saveAll();
            this.closeModal();
            this.irModulo('activos-fijos', { activoId: id });
            this.showToast('Mejora capitalizada con éxito.', 'success');
        }
    },
});