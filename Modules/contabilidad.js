// Archivo: modules/contabilidad.js

Object.assign(ContaApp, {

// Módulo: Cierre del Período
        renderCierrePeriodo() {
        const lastYear = new Date().getFullYear() - 1;
        const html = `
            <div class="conta-card">
                <h3 class="conta-subtitle">Proceso de Cierre Contable</h3>
                <p class="text-[var(--color-text-secondary)] mb-4">
                    Este proceso saldará (pondrá en cero) todas las cuentas de Ingresos y Gastos para el período especificado.
                    La ganancia o pérdida neta resultante se transferirá a la cuenta "Resultados Acumulados" en el Patrimonio.
                    Esta acción es irreversible y solo debe realizarse una vez por período fiscal.
                </p>
                <div class="flex flex-wrap items-end gap-4 mt-6">
                    <div>
                        <label for="cierre-fecha-fin" class="text-sm font-medium">Fecha de Cierre del Período</label>
                        <input type="date" id="cierre-fecha-fin" class="p-2 border rounded w-full conta-input" value="${lastYear}-12-31">
                    </div>
                    <button class="conta-btn" onclick="ContaApp.iniciarProcesoCierre()">Calcular Resultados del Período</button>
                </div>
                <div id="cierre-resultado" class="mt-6"></div>
            </div>
        `;
        document.getElementById('cierre-periodo').innerHTML = html;
    },
    iniciarProcesoCierre() {
        const fechaFin = document.getElementById('cierre-fecha-fin').value;
        if (!fechaFin) {
            this.showToast('Por favor, especifique una fecha de cierre.', 'error');
            return;
        }

        const fechaInicio = fechaFin.substring(0, 4) + '-01-01';
        const planSaldosPeriodo = this.getSaldosPorPeriodo(fechaFin, fechaInicio);
        const totalIngresos = planSaldosPeriodo.find(c => c.codigo === '400')?.saldo || 0;
        const totalGastos = planSaldosPeriodo.find(c => c.codigo === '500')?.saldo || 0;
        const resultadoNeto = totalIngresos - totalGastos;

        const resultadoHtml = `
            <div class="conta-card bg-[var(--color-bg-accent)]">
                <h4 class="font-bold text-lg mb-4">Resultados para el período hasta ${fechaFin}</h4>
                <div class="space-y-2 font-mono">
                    <div class="flex justify-between"><span>Total Ingresos:</span> <span style="color: var(--color-success);">${this.formatCurrency(totalIngresos)}</span></div>
                    <div class="flex justify-between"><span>Total Gastos:</span> <span style="color: var(--color-danger);">${this.formatCurrency(totalGastos)}</span></div>
                    <div class="flex justify-between font-bold text-lg border-t border-[var(--color-border-accent)] pt-2 mt-2">
                        <span>Resultado Neto del Período:</span>
                        <span style="color: var(${resultadoNeto >= 0 ? '--color-success' : '--color-danger'});">${this.formatCurrency(resultadoNeto)}</span>
                    </div>
                </div>
                <div class="text-center mt-6">
                    <button class="conta-btn conta-btn-danger" onclick="ContaApp.ejecutarCierreContable('${fechaFin}', ${totalIngresos}, ${totalGastos})">Confirmar y Ejecutar Cierre</button>
                </div>
            </div>
        `;
        document.getElementById('cierre-resultado').innerHTML = resultadoHtml;
    },
    ejecutarCierreContable(fechaFin, totalIngresos, totalGastos) {
        this.showConfirm(
            '¿Está absolutamente seguro? Esta acción creará el asiento de cierre para el período y no se puede deshacer.',
            () => {
                const fechaInicio = fechaFin.substring(0, 4) + '-01-01';
                const planSaldosPeriodo = this.getSaldosPorPeriodo(fechaFin, fechaInicio);
                const resultadoNeto = totalIngresos - totalGastos;
                
                const cuentaResultadosAcumulados = this.planDeCuentas.find(c => c.codigo === '320');
                if (!cuentaResultadosAcumulados) {
                    this.showToast('Error: No se encontró la cuenta "Resultados Acumulados" (código 320).', 'error');
                    return;
                }

                const movimientos = [];
                planSaldosPeriodo.filter(c => c.tipo === 'DETALLE' && c.codigo.startsWith('4') && c.saldo !== 0).forEach(cuentaIngreso => {
                    movimientos.push({ cuentaId: cuentaIngreso.id, debe: cuentaIngreso.saldo, haber: 0 });
                });
                planSaldosPeriodo.filter(c => c.tipo === 'DETALLE' && c.codigo.startsWith('5') && c.saldo !== 0).forEach(cuentaGasto => {
                    movimientos.push({ cuentaId: cuentaGasto.id, debe: 0, haber: cuentaGasto.saldo });
                });

                if (resultadoNeto >= 0) {
                    movimientos.push({ cuentaId: cuentaResultadosAcumulados.id, debe: 0, haber: resultadoNeto });
                } else {
                    movimientos.push({ cuentaId: cuentaResultadosAcumulados.id, debe: Math.abs(resultadoNeto), haber: 0 });
                }

                const asientoCierre = this.crearAsiento(fechaFin, `Asiento de cierre para el período fiscal ${fechaFin.substring(0, 4)}`, movimientos, null);
                if (asientoCierre) {
                    // INICIO DE MEJORA: Guardar la fecha del último cierre
                    this.empresa.ultimoCierre = fechaFin;
                    // FIN DE MEJORA
                    this.saveAll();
                    this.showToast('¡Cierre de período completado con éxito!', 'success');
                    document.getElementById('cierre-resultado').innerHTML = `<div class="text-center p-4" style="color: var(--color-success);">El período ha sido cerrado. Asiento de cierre #${asientoCierre.id} ha sido creado.</div>`;
                }
            }
        );
    },
    
    // Módulo: Plan de Cuentas
    renderPlanDeCuentas() {
        document.getElementById('page-actions-header').innerHTML = `
            <div class="flex gap-2 flex-wrap">
                <button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarPlanDeCuentasCSV()"><i class="fa-solid fa-file-csv me-2"></i>Exportar CSV</button>
                <button class="conta-btn" onclick="ContaApp.abrirModalNuevaCuenta()">+ Crear Cuenta</button>
            </div>`;
        this.actualizarSaldosGlobales();
        let html = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra"><thead><tr>
    <th class="conta-table-th">Código</th><th class="conta-table-th">Nombre</th><th class="conta-table-th">Tipo</th>
    <th class="conta-table-th text-right">Saldo</th><th class="conta-table-th text-center">Acciones</th>
    </tr></thead><tbody>`;
        const renderRows = (parentId, level = 0) => {
            this.planDeCuentas.filter(c => c.parentId === parentId).sort((a,b) => a.codigo.localeCompare(b.codigo, undefined, {numeric: true}))
                .forEach(c => {
                    const isControlOrTitle = c.tipo === 'CONTROL' || c.tipo === 'TITULO';
                    
                    let iconHTML = '';
                    switch (c.tipo) {
                        case 'TITULO':
                            iconHTML = '<i class="fa-solid fa-folder-open fa-fw cuenta-icon-titulo"></i>';
                            break;
                        case 'CONTROL':
                            iconHTML = '<i class="fa-solid fa-folder fa-fw cuenta-icon-control"></i>';
                            break;
                        case 'DETALLE':
                            iconHTML = '<i class="fa-solid fa-file-lines fa-fw cuenta-icon-detalle"></i>';
                            break;
                    }

                    html += `<tr class="${c.tipo === 'TITULO' ? 'bg-[var(--color-bg-accent)]' : ''}">
                        <td class="conta-table-td ${isControlOrTitle ? 'font-bold' : ''}" style="padding-left: ${1 + level * 1.5}rem;">${c.codigo}</td>
                        <td class="conta-table-td ${isControlOrTitle ? 'font-bold' : ''}">${iconHTML} ${c.nombre}</td>
                        <td class="conta-table-td text-xs text-[var(--color-text-secondary)]">${c.tipo}</td>
                        <td class="conta-table-td text-right font-mono ${isControlOrTitle ? 'font-bold' : ''}">${this.formatCurrency(c.saldo)}</td>
                        <td class="conta-table-td text-center">
                            <div class="flex justify-center items-center gap-3">
                                <button title="Editar" class="conta-btn-icon edit" onclick="ContaApp.abrirModalEditarCuenta(${c.id})">✏️</button>
                                <button title="Eliminar" class="conta-btn-icon delete" onclick="ContaApp.eliminarCuenta(${c.id})">🗑️</button>
                            </div>
                        </td>
                    </tr>`;
                    if (isControlOrTitle) renderRows(c.id, level + 1);
                });
        };
        renderRows(null);
        html += `</tbody></table></div>`;
        document.getElementById('plan-de-cuentas').innerHTML = html;
    },
    abrirModalNuevaCuenta(parentId = null) {
        let parentOptions = this.planDeCuentas.filter(c => c.tipo === 'CONTROL' || c.tipo === 'TITULO').map(p => `<option value="${p.id}" ${parentId === p.id ? 'selected':''}>${p.codigo} - ${p.nombre}</option>`).join('');
        const modalHTML = `<h3 class="conta-title mb-4">Crear Nueva Cuenta</h3>
        <form onsubmit="ContaApp.guardarNuevaCuenta(event)" class="space-y-4 modal-form">
            <div><label for="cuenta-padre" class="block text-sm font-medium text-[var(--color-text-secondary)]">Cuenta Padre</label>
                <select id="cuenta-padre" class="w-full p-2 mt-1" onchange="ContaApp.sugerirCodigoCuenta()" required>${parentOptions}</select>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label for="cuenta-codigo" class="block text-sm font-medium text-[var(--color-text-secondary)]">Código</label><input type="text" id="cuenta-codigo" class="w-full p-2 mt-1" required></div>
                <div><label for="cuenta-nombre" class="block text-sm font-medium text-[var(--color-text-secondary)]">Nombre de la Cuenta</label><input type="text" id="cuenta-nombre" class="w-full p-2 mt-1" required></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label for="cuenta-tipo" class="block text-sm font-medium text-[var(--color-text-secondary)]">Tipo de Cuenta</label>
                    <select id="cuenta-tipo" class="w-full p-2 mt-1" required><option value="DETALLE">Detalle</option><option value="CONTROL">Control</option></select>
                </div>
                <div><label for="cuenta-saldo-inicial" class="block text-sm font-medium text-[var(--color-text-secondary)]">Saldo Inicial</label><input type="number" step="0.01" id="cuenta-saldo-inicial" class="w-full p-2 mt-1" value="0"></div>
            </div>
            <div class="flex justify-end gap-2 mt-6"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button type="submit" class="conta-btn">Crear Cuenta</button></div>
        </form>`;
        this.showModal(modalHTML);
        this.sugerirCodigoCuenta();
    },
    sugerirCodigoCuenta() {
        const parentId = parseInt(document.getElementById('cuenta-padre').value);
        const parentAccount = this.findById(this.planDeCuentas, parentId);
        const children = this.planDeCuentas.filter(c => c.parentId === parentId);
        let nextNum = 1;
        if (children.length > 0) {
            const lastChild = children.sort((a,b) => {
                const aNum = parseInt(a.codigo.split('.').pop());
                const bNum = parseInt(b.codigo.split('.').pop());
                return aNum - bNum;
            }).pop();
            if (lastChild) {
                const lastNum = parseInt(lastChild.codigo.split('.').pop());
                if (!isNaN(lastNum)) nextNum = lastNum + 1;
            }
        }
        document.getElementById('cuenta-codigo').value = `${parentAccount.codigo}.${nextNum}`;
    },
    guardarNuevaCuenta(e) {
        e.preventDefault();
        const parentId = parseInt(document.getElementById('cuenta-padre').value);
        const codigo = document.getElementById('cuenta-codigo').value;
        const nombre = document.getElementById('cuenta-nombre').value;
        const tipo = document.getElementById('cuenta-tipo').value;
        const saldoInicial = parseFloat(document.getElementById('cuenta-saldo-inicial').value) || 0;

        if (this.planDeCuentas.some(c => c.codigo === codigo)) {
            this.showToast('Error: El código de cuenta ya existe.', 'error');
            return;
        }

        const newAccount = { id: this.idCounter++, codigo, nombre, tipo, parentId };
        this.planDeCuentas.push(newAccount);
        
        if (saldoInicial !== 0) {
            const cuentaCapital = this.planDeCuentas.find(c => c.codigo === '310');
            const esDeudora = ['1', '5'].includes(codigo[0]);
            const movimientos = esDeudora 
                ? [{ cuentaId: newAccount.id, debe: saldoInicial, haber: 0 }, { cuentaId: cuentaCapital.id, debe: 0, haber: saldoInicial }]
                : [{ cuentaId: newAccount.id, debe: 0, haber: saldoInicial }, { cuentaId: cuentaCapital.id, debe: saldoInicial, haber: 0 }];
            
            const primerDiaDelAno = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0,10);
            this.crearAsiento(primerDiaDelAno, `Saldo inicial para ${nombre}`, movimientos, null);
        }

        this.saveAll();
        this.closeModal();
        this.irModulo('plan-de-cuentas');
        this.showToast('Cuenta creada con éxito.', 'success');
    },
    abrirModalEditarCuenta(accountId) {
        const cuenta = this.findById(this.planDeCuentas, accountId);
        if (!cuenta) return;
        const modalHTML = `<h3 class="conta-title mb-4">Editar Cuenta</h3>
        <form onsubmit="ContaApp.guardarEdicionCuenta(event, ${accountId})" class="space-y-4 modal-form">
            <div><label class="block text-sm font-medium text-[var(--color-text-secondary)]">Código (No editable)</label><input type="text" class="w-full p-2 mt-1" value="${cuenta.codigo}" readonly></div>
            <div><label for="cuenta-nombre-edit" class="block text-sm font-medium text-[var(--color-text-secondary)]">Nombre de la Cuenta</label><input type="text" id="cuenta-nombre-edit" class="w-full p-2 mt-1" value="${cuenta.nombre}" required></div>
            <div class="flex justify-end gap-2 mt-6"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button type="submit" class="conta-btn">Guardar Cambios</button></div>
        </form>`;
        this.showModal(modalHTML);
    },
    guardarEdicionCuenta(e, accountId) {
        e.preventDefault();
        const cuenta = this.findById(this.planDeCuentas, accountId);
        if (cuenta) {
            cuenta.nombre = document.getElementById('cuenta-nombre-edit').value;
            this.saveAll();
            this.closeModal();
            this.irModulo('plan-de-cuentas');
            this.showToast('Cuenta actualizada.', 'success');
        }
    },
    eliminarCuenta(cuentaId) {
        const tieneTransacciones = this.asientos.some(a => a.movimientos.some(m => m.cuentaId === cuentaId));
        if (tieneTransacciones) {
            this.showToast('No se puede eliminar, la cuenta tiene transacciones.', 'error');
            return;
        }
        const tieneHijos = this.planDeCuentas.some(c => c.parentId === cuentaId);
         if (tieneHijos) {
            this.showToast('No se puede eliminar, la cuenta tiene subcuentas.', 'error');
            return;
        }
        this.showConfirm('¿Está seguro de que desea eliminar esta cuenta? Esta acción no se puede deshacer.', () => {
            this.planDeCuentas = this.planDeCuentas.filter(c => c.id !== cuentaId);
            this.saveAll();
            this.irModulo('plan-de-cuentas');
            this.showToast('Cuenta eliminada.', 'success');
        });
    },

    // Módulo: Diario General
                    renderDiarioGeneral(filters = {}) {
        document.getElementById('page-actions-header').innerHTML = `<div class="flex flex-wrap gap-2">
            <button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarDiarioCSV()"><i class="fa-solid fa-file-csv me-2"></i>Exportar CSV</button>
            <button class="conta-btn conta-btn-accent" onclick="ContaApp.abrirModalReclasificarApertura()">Reclasificar Saldo</button>
            <button class="conta-btn" onclick="ContaApp.abrirModalAsientoManual()">+ Asiento Manual</button>
        </div>`;
        
        let asientos = [...this.asientos];

        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            asientos = asientos.filter(a => a.descripcion.toLowerCase().includes(searchTerm) || a.id.toString().includes(searchTerm));
        }
        if (filters.startDate) asientos = asientos.filter(a => a.fecha >= filters.startDate);
        if (filters.endDate) asientos = asientos.filter(a => a.fecha <= filters.endDate);
        
        let html = `<div class="conta-card p-3 mb-4">
            <form onsubmit="event.preventDefault(); ContaApp.filtrarLista('diario-general');" class="flex flex-wrap items-end gap-3">
                <div>
                    <label class="text-xs font-semibold">Buscar por Descripción o #</label>
                    <input type="search" id="diario-general-search" class="conta-input md:w-72" value="${filters.search || ''}">
                </div>
                <div>
                    <label class="text-xs font-semibold">Desde</label>
                    <input type="date" id="diario-general-start-date" class="conta-input" value="${filters.startDate || ''}">
                </div>
                <div>
                    <label class="text-xs font-semibold">Hasta</label>
                    <input type="date" id="diario-general-end-date" class="conta-input" value="${filters.endDate || ''}">
                </div>
                <button type="submit" class="conta-btn">Filtrar</button>
            </form>
        </div>`;

        if (asientos.length === 0) {
            html += `<div class="conta-card text-center p-8 text-[var(--color-text-secondary)]">No hay asientos que coincidan con los filtros.</div>`;
        } else {
            asientos.sort((a,b) => new Date(b.fecha) - new Date(b.fecha) || b.id - a.id).forEach(asiento => {
                html += `<div class="conta-card mb-4">
                    <div class="flex justify-between items-center border-b border-[var(--color-border-accent)] pb-2 mb-2">
                        <div>
                            <span class="font-bold">Asiento #${asiento.id}</span> 
                            <span class="text-sm text-[var(--color-text-secondary)]">(${asiento.fecha})</span>
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="text-sm">${asiento.descripcion}</div>
                            ${!asiento.transaccionId ? `
                                <button class="conta-btn-icon edit" title="Editar Asiento Manual" onclick="ContaApp.abrirModalEditarAsiento(${asiento.id})"><i class="fa-solid fa-pencil"></i></button>
                            ` : ''}
                        </div>
                    </div>
<table class="min-w-full text-sm conta-table-zebra"><thead><tr>
    <th class="conta-table-th">Código</th><th class="conta-table-th">Cuenta</th>
    <th class="conta-table-th text-right">Debe</th><th class="conta-table-th text-right">Haber</th>
</tr></thead><tbody>`;
                asiento.movimientos.forEach(mov => {
                    const cuenta = this.findById(this.planDeCuentas, mov.cuentaId);
                    html += `<tr>
                        <td class="conta-table-td font-mono">${cuenta?.codigo || 'N/A'}</td>
                        <td class="conta-table-td">${cuenta?.nombre || 'N/A'}</td>
                        <td class="conta-table-td text-right font-mono">${mov.debe > 0 ? this.formatCurrency(mov.debe) : ''}</td>
                        <td class="conta-table-td text-right font-mono">${mov.haber > 0 ? this.formatCurrency(mov.haber) : ''}</td>
                    </tr>`;
                });
                html += `</tbody></table></div>`;
            });
        }
        document.getElementById('diario-general').innerHTML = html;
        if(filters.search) document.getElementById('diario-general-search').value = filters.search;
        if(filters.startDate) document.getElementById('diario-general-start-date').value = filters.startDate;
        if(filters.endDate) document.getElementById('diario-general-end-date').value = filters.endDate;
    },
    abrirModalAsientoManual() {
        const cuentasOptions = this.planDeCuentas.filter(c => c.tipo === 'DETALLE')
            .sort((a,b) => a.codigo.localeCompare(b.codigo, undefined, {numeric: true}))
            .map(c => `<option value="${c.id}">${c.codigo} - ${c.nombre}</option>`).join('');

        const modalHTML = `<h3 class="conta-title mb-4">Asiento Contable Manual</h3>
        <form onsubmit="ContaApp.guardarAsientoManual(event)" class="space-y-4 modal-form">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label for="asiento-fecha">Fecha</label><input type="date" id="asiento-fecha" value="${this.getTodayDate()}" class="w-full p-2 mt-1" required></div>
                <div><label for="asiento-descripcion">Descripción</label><input type="text" id="asiento-descripcion" class="w-full p-2 mt-1" required></div>
            </div>
            <div class="conta-card !p-4 mt-4">
                <h4 class="font-bold mb-2">Movimientos</h4>
                <div id="asiento-movimientos-container"></div>
                <button type="button" class="conta-btn conta-btn-small mt-2" onclick="ContaApp.agregarMovimientoAsiento()">+ Agregar Movimiento</button>
            </div>
            <div class="flex justify-end gap-4 font-bold text-lg">
                <div id="asiento-total-debe">Debe: ${this.formatCurrency(0)}</div>
                <div id="asiento-total-haber">Haber: ${this.formatCurrency(0)}</div>
            </div>
            <div id="asiento-error" class="text-center font-bold conta-text-danger"></div>
            <div class="flex justify-end gap-2 mt-6"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button type="submit" class="conta-btn">Guardar Asiento</button></div>
        </form>`;
        this.showModal(modalHTML, '4xl');
        this.agregarMovimientoAsiento();
        this.agregarMovimientoAsiento();
    },
        abrirModalEditarAsiento(asientoId) {
        const asiento = this.findById(this.asientos, asientoId);
        if (!asiento) return;

        const cuentasOptions = this.planDeCuentas.filter(c => c.tipo === 'DETALLE')
            .sort((a,b) => a.codigo.localeCompare(b.codigo, undefined, {numeric: true}))
            .map(c => `<option value="${c.id}">${c.codigo} - ${c.nombre}</option>`).join('');

        let movimientosHTML = '';
        asiento.movimientos.forEach(mov => {
            movimientosHTML += `<div class="grid grid-cols-12 gap-2 items-center mb-2">
                <select class="col-span-6 p-2 asiento-mov-cuenta">
                    ${this.planDeCuentas.filter(c => c.tipo === 'DETALLE').sort((a,b) => a.codigo.localeCompare(b.codigo, undefined, {numeric: true})).map(c => `<option value="${c.id}" ${c.id === mov.cuentaId ? 'selected' : ''}>${c.codigo} - ${c.nombre}</option>`).join('')}
                </select>
                <input type="number" step="0.01" placeholder="Debe" class="col-span-3 p-2 text-right asiento-mov-debe" value="${mov.debe || ''}" oninput="ContaApp.actualizarTotalesAsiento()">
                <input type="number" step="0.01" placeholder="Haber" class="col-span-3 p-2 text-right asiento-mov-haber" value="${mov.haber || ''}" oninput="ContaApp.actualizarTotalesAsiento()">
            </div>`;
        });

        const modalHTML = `<h3 class="conta-title mb-4">Editar Asiento Manual #${asiento.id}</h3>
        <form onsubmit="ContaApp.guardarAsientoManual(event, ${asientoId})" class="space-y-4 modal-form">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label for="asiento-fecha">Fecha</label><input type="date" id="asiento-fecha" value="${asiento.fecha}" class="w-full p-2 mt-1" required></div>
                <div><label for="asiento-descripcion">Descripción</label><input type="text" id="asiento-descripcion" value="${asiento.descripcion}" class="w-full p-2 mt-1" required></div>
            </div>
            <div class="conta-card !p-4 mt-4">
                <h4 class="font-bold mb-2">Movimientos</h4>
                <div id="asiento-movimientos-container">${movimientosHTML}</div>
                <button type="button" class="conta-btn conta-btn-small mt-2" onclick="ContaApp.agregarMovimientoAsiento()">+ Agregar Movimiento</button>
            </div>
            <div class="flex justify-end gap-4 font-bold text-lg">
                <div id="asiento-total-debe">Debe: ${this.formatCurrency(0)}</div>
                <div id="asiento-total-haber">Haber: ${this.formatCurrency(0)}</div>
            </div>
            <div id="asiento-error" class="text-center font-bold conta-text-danger"></div>
            <div class="flex justify-end gap-2 mt-6"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button type="submit" class="conta-btn">Guardar Cambios</button></div>
        </form>`;
        this.showModal(modalHTML, '4xl');
        this.actualizarTotalesAsiento(); // Para calcular los totales iniciales
    },
    agregarMovimientoAsiento() {
        const container = document.getElementById('asiento-movimientos-container');
        const index = container.children.length;
        const cuentasOptions = this.planDeCuentas.filter(c => c.tipo === 'DETALLE')
            .sort((a,b) => a.codigo.localeCompare(b.codigo, undefined, {numeric: true}))
            .map(c => `<option value="${c.id}">${c.codigo} - ${c.nombre}</option>`).join('');
        const movHTML = `<div class="grid grid-cols-12 gap-2 items-center mb-2" data-index="${index}">
            <select class="col-span-6 p-2 asiento-mov-cuenta">${cuentasOptions}</select>
            <input type="number" step="0.01" placeholder="Debe" class="col-span-3 p-2 text-right asiento-mov-debe" oninput="ContaApp.actualizarTotalesAsiento()">
            <input type="number" step="0.01" placeholder="Haber" class="col-span-3 p-2 text-right asiento-mov-haber" oninput="ContaApp.actualizarTotalesAsiento()">
        </div>`;
        container.insertAdjacentHTML('beforeend', movHTML);
    },
            actualizarTotalesAsiento() {
        let totalDebe = 0, totalHaber = 0;
        const rows = document.querySelectorAll('#asiento-movimientos-container > div');

        rows.forEach((row, index) => {
            const debeInput = row.querySelector('.asiento-mov-debe');
            const haberInput = row.querySelector('.asiento-mov-haber');

            // ===== INICIO DE LA MEJORA: Autocompletado al salir del campo =====
            const handleAutocomplete = (event) => {
                const sourceInput = event.target;
                const value = parseFloat(sourceInput.value) || 0;
                
                if (rows.length === 2 && value > 0) {
                    if (index === 0) { // Si estamos en la primera fila
                        const targetInput = sourceInput.classList.contains('asiento-mov-debe') ? rows[1].querySelector('.asiento-mov-haber') : rows[1].querySelector('.asiento-mov-debe');
                        const otherInput = sourceInput.classList.contains('asiento-mov-debe') ? rows[1].querySelector('.asiento-mov-debe') : rows[1].querySelector('.asiento-mov-haber');
                        if (!targetInput.value && !otherInput.value) {
                             targetInput.value = value.toFixed(2);
                        }
                    }
                }
                 // Disparar un nuevo cálculo de totales para reflejar el cambio
                this.actualizarTotalesAsiento();
            };

            // Removemos listeners antiguos para evitar duplicados
            debeInput.removeEventListener('change', handleAutocomplete);
            haberInput.removeEventListener('change', handleAutocomplete);
            // Añadimos el nuevo listener al evento 'change'
            debeInput.addEventListener('change', handleAutocomplete);
            haberInput.addEventListener('change', handleAutocomplete);

            // Limpieza simple al escribir
            debeInput.oninput = () => { if(debeInput.value) haberInput.value = ''; this.actualizarTotalesAsiento(); };
            haberInput.oninput = () => { if(haberInput.value) debeInput.value = ''; this.actualizarTotalesAsiento(); };
            // ===== FIN DE LA MEJORA =====

            totalDebe += parseFloat(debeInput.value) || 0;
            totalHaber += parseFloat(haberInput.value) || 0;
        });
        
        document.getElementById('asiento-total-debe').innerText = `Debe: ${this.formatCurrency(totalDebe)}`;
        document.getElementById('asiento-total-haber').innerText = `Haber: ${this.formatCurrency(totalHaber)}`;
        const errorDiv = document.getElementById('asiento-error');

        if (Math.abs(totalDebe - totalHaber) > 0.01 && (totalDebe > 0 || totalHaber > 0)) {
            errorDiv.innerText = "¡Asiento Descuadrado!";
        } else {
            errorDiv.innerText = "";
        }
    },
    guardarAsientoManual(e, asientoId = null) {
        e.preventDefault();
        const fecha = document.getElementById('asiento-fecha').value;
        const descripcion = document.getElementById('asiento-descripcion').value;
        
        // INICIO DE MEJORA: Validar fecha también al editar
        if (this.empresa.ultimoCierre && fecha <= this.empresa.ultimoCierre) {
            this.showToast(`Error: El período hasta ${this.empresa.ultimoCierre} está cerrado. No se puede editar la transacción a esta fecha.`, 'error');
            return;
        }
        // FIN DE MEJORA

        const movimientos = [];
        let totalDebe = 0;
        let totalHaber = 0;

        document.querySelectorAll('#asiento-movimientos-container > div').forEach(row => {
            const cuentaId = parseInt(row.querySelector('.asiento-mov-cuenta').value);
            const debe = parseFloat(row.querySelector('.asiento-mov-debe').value) || 0;
            const haber = parseFloat(row.querySelector('.asiento-mov-haber').value) || 0;
            if (cuentaId && (debe > 0 || haber > 0)) {
                movimientos.push({ cuentaId, debe, haber });
                totalDebe += debe;
                totalHaber += haber;
            }
        });

        if (Math.abs(totalDebe - totalHaber) > 0.01) {
            this.showToast('El asiento está descuadrado. No se puede guardar.', 'error');
            return;
        }
        
        if (movimientos.length < 2) {
            this.showToast('Un asiento debe tener al menos dos movimientos.', 'error');
            return;
        }
        
        if (asientoId) {
            const asientoExistente = this.findById(this.asientos, asientoId);
            if (asientoExistente) {
                asientoExistente.fecha = fecha;
                asientoExistente.descripcion = descripcion;
                asientoExistente.movimientos = movimientos;
                
                this.actualizarSaldosGlobales();
                this.saveAll();
                this.closeModal();
                this.irModulo('diario-general');
                this.showToast(`Asiento #${asientoId} actualizado con éxito.`, 'success');
            }
        } else {
            if (this.crearAsiento(fecha, descripcion, movimientos, null)) {
                this.saveAll();
                this.closeModal();
                this.irModulo('diario-general');
                this.showToast('Asiento manual guardado.', 'success');
            }
        }
    },

    abrirModalReclasificarApertura() {
        this.actualizarSaldosGlobales();
        const cuentaApertura = this.planDeCuentas.find(c => c.id === 330);
        
        if (!cuentaApertura || Math.abs(cuentaApertura.saldo) < 0.01) {
            this.showToast('No hay saldo en Utilidades de Apertura para reclasificar.', 'info');
            return;
        }

        const saldoAReclasificar = cuentaApertura.saldo;
        const cuentasPatrimonioOptions = this.planDeCuentas
            .filter(c => c.tipo === 'DETALLE' && c.codigo.startsWith('3') && c.id !== 330)
            .sort((a,b) => a.codigo.localeCompare(b.codigo, undefined, {numeric: true}))
            .map(c => `<option value="${c.id}">${c.codigo} - ${c.nombre}</option>`).join('');

        const modalHTML = `
            <h3 class="conta-title mb-4">Reclasificar Saldo de Apertura</h3>
            <p class="text-[var(--color-text-secondary)] mb-2">
                El saldo actual en "Utilidades de Apertura" es de 
                <strong style="color: var(${saldoAReclasificar >= 0 ? '--color-success' : '--color-danger'});">${this.formatCurrency(saldoAReclasificar)}</strong>.
            </p>
            <p class="text-sm text-[var(--color-text-secondary)] mb-6">
                Esta herramienta transferirá este saldo a una cuenta de patrimonio permanente, dejando la cuenta de apertura en cero.
            </p>
            <form onsubmit="ContaApp.guardarReclasificacionApertura(event, ${saldoAReclasificar})" class="space-y-4 modal-form">
                <div>
                    <label for="reclasificar-destino" class="block text-sm font-medium">Transferir saldo a:</label>
                    <select id="reclasificar-destino" class="w-full p-2 mt-1" required>
                        ${cuentasPatrimonioOptions}
                    </select>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button type="submit" class="conta-btn">Confirmar Reclasificación</button>
                </div>
            </form>
        `;
        this.showModal(modalHTML, 'xl');
    },

    guardarReclasificacionApertura(e, saldoAReclasificar) {
        e.preventDefault();
        const cuentaDestinoId = parseInt(document.getElementById('reclasificar-destino').value);
        const cuentaDestino = this.findById(this.planDeCuentas, cuentaDestinoId);
        const cuentaAperturaId = 330;
        
        const movimientos = [];
        const montoAbsoluto = Math.abs(saldoAReclasificar);
        
        if (saldoAReclasificar > 0) {
            movimientos.push({ cuentaId: cuentaAperturaId, debe: montoAbsoluto, haber: 0 });
            movimientos.push({ cuentaId: cuentaDestinoId, debe: 0, haber: montoAbsoluto });
        } else {
            movimientos.push({ cuentaId: cuentaAperturaId, debe: 0, haber: montoAbsoluto });
            movimientos.push({ cuentaId: cuentaDestinoId, debe: montoAbsoluto, haber: 0 });
        }
        
        const asiento = this.crearAsiento(this.getTodayDate(), `Reclasificación de saldo de apertura a ${cuentaDestino.nombre}`, movimientos, null);
        if (asiento) {
            this.saveAll();
            this.closeModal();
            this.irModulo('diario-general');
            this.showToast('Saldo de apertura reclasificado con éxito.', 'success');
        }
    },    
exportarDiarioCSV() {
        const filters = {
            search: document.getElementById('diario-general-search')?.value,
            startDate: document.getElementById('diario-general-start-date')?.value,
            endDate: document.getElementById('diario-general-end-date')?.value
        };
        let asientos = [...this.asientos];
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            asientos = asientos.filter(a => a.descripcion.toLowerCase().includes(searchTerm) || a.id.toString().includes(searchTerm));
        }
        if (filters.startDate) asientos = asientos.filter(a => a.fecha >= filters.startDate);
        if (filters.endDate) asientos = asientos.filter(a => a.fecha <= filters.endDate);

        const dataParaExportar = asientos.flatMap(asiento => 
            asiento.movimientos.map(mov => {
                const cuenta = this.findById(this.planDeCuentas, mov.cuentaId);
                return {
                    'Asiento_ID': asiento.id,
                    'Fecha': asiento.fecha,
                    'Descripcion_Asiento': asiento.descripcion,
                    'Codigo_Cuenta': cuenta?.codigo || 'N/A',
                    'Nombre_Cuenta': cuenta?.nombre || 'N/A',
                    'Debe': mov.debe,
                    'Haber': mov.haber
                };
            })
        );
        this.exportarA_CSV(`diario_general_${this.getTodayDate()}.csv`, dataParaExportar);
    },
        exportarPlanDeCuentasCSV() {
        this.actualizarSaldosGlobales();
        const dataParaExportar = this.planDeCuentas
            .sort((a,b) => a.codigo.localeCompare(b.codigo, undefined, {numeric: true}))
            .map(c => {
                const padre = this.findById(this.planDeCuentas, c.parentId);
                return {
                    'Codigo': c.codigo,
                    'Nombre': c.nombre,
                    'Tipo': c.tipo,
                    'Codigo_Padre': padre?.codigo || '',
                    'Nombre_Padre': padre?.nombre || '',
                    'Saldo_Actual': c.saldo
                };
            });
        this.exportarA_CSV(`plan_de_cuentas_${this.getTodayDate()}.csv`, dataParaExportar);
    },
});