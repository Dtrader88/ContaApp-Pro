// Archivo: modules/reportes.js

Object.assign(ContaApp, {

_getSaldosDetalladosPorCentroCosto(cuentaId, fechaInicio, fechaFin) {
    const saldos = {}; 

    this.asientos
        .filter(a => a.fecha >= fechaInicio && a.fecha <= fechaFin)
        .forEach(asiento => {
            asiento.movimientos.forEach(mov => {
                const cuenta = this.findById(this.planDeCuentas, mov.cuentaId);
                let cuentaCoincide = false;
                
                if (cuenta) {
                    // Verificamos si el movimiento es de la cuenta principal o de una de sus hijas directas
                    if (cuenta.id === cuentaId) {
                        cuentaCoincide = true;
                    } else {
                        // Verificamos si el padre del movimiento es la cuenta que estamos desglosando
                        const cuentaPadre = this.findById(this.planDeCuentas, cuenta.parentId);
                        if (cuentaPadre && cuentaPadre.id === cuentaId) {
                            cuentaCoincide = true;
                        }
                    }
                }

                if (cuentaCoincide && mov.centroDeCostoId) {
                    const centroCosto = this.empresa.centrosDeCosto.find(cc => cc.id === mov.centroDeCostoId);
                    const nombreCentro = centroCosto ? centroCosto.nombre : 'No asignado';
                    
                    if (!saldos[nombreCentro]) {
                        saldos[nombreCentro] = 0;
                    }
                    
                    const esDeudora = ['1', '5', '6'].includes(String(cuenta.codigo)[0]);
                    saldos[nombreCentro] += esDeudora ? (mov.debe - mov.haber) : (mov.haber - mov.debe);
                }
            });
        });
    return Object.entries(saldos).map(([nombre, saldo]) => ({ nombre, saldo })).filter(e => Math.abs(e.saldo) >= 0.01);
},
  // Módulo de Reportes
        renderReportes(params = {}) {
        const submodulo = params.submodulo || 'pnl';
        
        // ===== INICIO DE LA MEJORA: LÓGICA DE LICENCIA PARA REPORTES =====
        const tieneReportesAvanzados = this.licencia.modulosActivos.includes('REPORTES_AVANZADOS'); // Usaremos una nueva clave de licencia
        // ===== FIN DE LA MEJORA =====

        let html = `
        <div class="flex gap-2 mb-6 border-b border-[var(--color-border-accent)] flex-wrap">
            <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'pnl' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('reportes', {submodulo: 'pnl'})">Estado de Resultados</button>
            <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'balance' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('reportes', {submodulo: 'balance'})">Balance General</button>
            
            <!-- ===== INICIO DE LA MEJORA: Botones condicionales ===== -->
            ${tieneReportesAvanzados ? `
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'comprobacion' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('reportes', {submodulo: 'comprobacion'})">Balance de Comprobación</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'mayor' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('reportes', {submodulo: 'mayor'})">Mayor Analítico</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'presupuestos' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('reportes', {submodulo: 'presupuestos'})">Presupuestos</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'flujo-efectivo' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('reportes', {submodulo: 'flujo-efectivo'})">Flujo de Efectivo</button>
            ` : ''}
            <!-- ===== FIN DE LA MEJORA ===== -->
        </div>
        <div id="reporte-contenido"></div>`;
        document.getElementById('reportes').innerHTML = html;
        
        const renderFunc = { 
            'pnl': this.renderEstadoResultados, 
            'balance': this.renderBalanceGeneral, 
            'comprobacion': this.renderBalanceComprobacion,
            'mayor': this.renderMayorAnalitico,
            'presupuestos': this.renderReportes_TabPresupuestos,
            'flujo-efectivo': this.renderFlujoDeEfectivo,
        };

        // ===== INICIO DE LA MEJORA: Protección de acceso directo =====
        const submoduloSolicitado = params.submodulo || 'pnl';
        if (renderFunc[submoduloSolicitado]) {
            // Si el sub-módulo solicitado no es uno de los básicos Y el usuario no tiene la licencia, redirigir.
            const esBasico = ['pnl', 'balance'].includes(submoduloSolicitado);
            if (!esBasico && !tieneReportesAvanzados) {
                this.showToast('Este reporte requiere un paquete superior.', 'error');
                this.irModulo('reportes', { submodulo: 'pnl' }); // Redirigir al primer reporte disponible
                return;
            }
            renderFunc[submoduloSolicitado].call(this, params);
        }
        // ===== FIN DE LA MEJORA =====
    },
                renderEstadoResultados(params = {}) {
    const isComparative = !!params.comparative;
    const hoy = new Date();
    const primerDiaMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fechaInicioA = params.fechaInicioA || primerDiaMesActual.toISOString().slice(0, 10);
    const fechaFinA = params.fechaFinA || hoy.toISOString().slice(0, 10);
    
    const centroDeCostoId = params.centroDeCostoId ? parseInt(params.centroDeCostoId) : null;
    const centrosDeCostoOptions = (this.empresa.centrosDeCosto || [])
        .map(cc => `<option value="${cc.id}" ${centroDeCostoId === cc.id ? 'selected' : ''}>${cc.nombre}</option>`)
        .join('');

    const planSaldosA = this.getSaldosPorPeriodo(fechaFinA, fechaInicioA, centroDeCostoId);

    const planCombinado = JSON.parse(JSON.stringify(this.planDeCuentas.map(({saldo, ...rest}) => rest)));
    planCombinado.forEach(c => {
        c.saldo = planSaldosA.find(s => s.id === c.id)?.saldo || 0;
    });

    const ingresos = planCombinado.find(c => c.codigo === '400');
    const costos = planCombinado.find(c => c.codigo === '500');
    const gastos = planCombinado.find(c => c.codigo === '600');
    const resultadoA = (ingresos?.saldo || 0) - ((costos?.saldo || 0) + (gastos?.saldo || 0));
    
    const centroDeCostoSeleccionado = centroDeCostoId ? this.empresa.centrosDeCosto.find(cc => cc.id === centroDeCostoId) : null;
    const tituloReporte = `Estado de Resultados ${centroDeCostoSeleccionado ? `(${centroDeCostoSeleccionado.nombre})` : ''}`;

    let html = `<div class="conta-card mb-6">
        <form onsubmit="event.preventDefault(); ContaApp.filtrarReporte('pnl')" class="space-y-4">
            <div class="flex flex-wrap items-end gap-4">
                <div class="p-2 border rounded-lg border-dashed border-[var(--color-border-accent)] flex flex-wrap items-end gap-3">
                    <div><label for="periodoA-fecha-inicio" class="text-xs font-semibold">Desde</label><input type="date" id="periodoA-fecha-inicio" class="conta-input" value="${fechaInicioA}"></div>
                    <div><label for="periodoA-fecha-fin" class="text-xs font-semibold">Hasta</label><input type="date" id="periodoA-fecha-fin" class="conta-input" value="${fechaFinA}"></div>
                </div>
                <div>
                    <label for="pnl-centro-costo" class="text-xs font-semibold">Centro de Costo</label>
                    <select id="pnl-centro-costo" class="conta-input">
                        <option value="">-- Todos los Centros --</option>
                        ${centrosDeCostoOptions}
                    </select>
                </div>
                <div class="flex flex-col gap-2">
                     <button type="submit" class="conta-btn w-fit">Generar</button>
                </div>
            </div>
        </form>
    </div>
    <div class="flex justify-between items-center mb-4"><h2 class="conta-subtitle !mb-0">${tituloReporte}</h2>
        <div><button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarReporteEstilizadoPDF('${tituloReporte}', 'reporte-pnl-area')">Vista Previa PDF</button></div>
    </div>
    <div class="conta-card overflow-auto" id="reporte-pnl-area"><table class="min-w-full">
        <thead><tr><th class="conta-table-th">Descripción</th><th class="conta-table-th text-right">Total</th></tr></thead>
        <tbody>`;

    const renderSection = (cuentaId, plan, level = 0) => {
        const cuenta = plan.find(c => c.id === cuentaId);
        if (!cuenta || Math.abs(cuenta.saldo) < 0.01) return;
        
        const isTitleOrControl = cuenta.tipo === 'TITULO' || cuenta.tipo === 'CONTROL';
        const style = isTitleOrControl ? 'font-weight: bold;' : '';

        html += `<tr>
            <td class="py-2" style="padding-left: ${level * 1.5}rem; ${style}">${cuenta.nombre}</td>
            <td class="py-2 text-right font-mono" style="${style}">${this.formatCurrency(cuenta.saldo)}</td>
        </tr>`;

        if (isTitleOrControl && !centroDeCostoId) {
            const desglose = this._getSaldosDetalladosPorCentroCosto(cuenta.id, fechaInicioA, fechaFinA);
            desglose.forEach(item => {
                html += `<tr class="text-sm text-[var(--color-text-secondary)]">
                    <td class="py-1" style="padding-left: ${(level + 1) * 1.5}rem;"><i>${item.nombre}</i></td>
                    <td class="py-1 text-right font-mono"><i>${this.formatCurrency(item.saldo)}</i></td>
                </tr>`;
            });
        }
        
        plan.filter(c => c.parentId === cuentaId).sort((a,b) => a.codigo.localeCompare(b.codigo)).forEach(child => {
            if(isTitleOrControl) {
                renderSection(child.id, plan, level + 1);
            }
        });
    };
    
    if (ingresos) renderSection(ingresos.id, planCombinado);
    if (costos) renderSection(costos.id, planCombinado);
    if (gastos) renderSection(gastos.id, planCombinado);

    html += `<tr class="border-t-2 border-[var(--color-border-accent)] font-bold text-lg">
        <td class="py-2">Resultado Neto</td><td class="py-2 text-right font-mono">${this.formatCurrency(resultadoA)}</td>
    </tr></tbody></table></div>`;
    
    document.getElementById('reporte-contenido').innerHTML = html;
},
    toggleComparativePnl() {
        const isComparativeInput = document.getElementById('pnl-is-comparative');
        const currentlyComparative = isComparativeInput.value === 'true';
        const newComparativeState = !currentlyComparative;

        // Construir los parámetros para recargar el módulo
        const params = {
            submodulo: 'pnl',
            comparative: newComparativeState,
            fechaInicioA: document.getElementById('periodoA-fecha-inicio').value,
            fechaFinA: document.getElementById('periodoA-fecha-fin').value,
        };

        // Si estamos activando la vista comparativa, también pasamos las fechas del período B
        if (newComparativeState) {
            params.fechaInicioB = document.getElementById('periodoB-fecha-inicio').value;
            params.fechaFinB = document.getElementById('periodoB-fecha-fin').value;
        }

        this.irModulo('reportes', params);
    },
        renderBalanceGeneral(params = {}) {
    const fechaFin = params.fechaFin || this.getTodayDate();
    const planConSaldos = this.getSaldosPorPeriodo(fechaFin);

    const activo = planConSaldos.find(c => c.codigo === '100');
    const pasivo = planConSaldos.find(c => c.codigo === '200');
    const patrimonio = planConSaldos.find(c => c.codigo === '300');
    const ingresos = planConSaldos.find(c => c.codigo === '400');
    
    // --- INICIO DE LA CORRECCIÓN ---
    const costos = planConSaldos.find(c => c.codigo === '500');
    const gastos = planConSaldos.find(c => c.codigo === '600');
    // --- FIN DE LA CORRECCIÓN ---

    if (!activo || !pasivo || !patrimonio) {
        document.getElementById('reporte-contenido').innerHTML = `<div class="conta-card text-center conta-text-danger"><p>Error: Cuentas principales de Activo (100), Pasivo (200) y/o Patrimonio (300) no encontradas.</p></div>`;
        return;
    }

    // --- INICIO DE LA CORRECCIÓN ---
    // Ahora se incluyen tanto costos como gastos en el cálculo.
    const resultadoDelPeriodo = (ingresos?.saldo || 0) - ((costos?.saldo || 0) + (gastos?.saldo || 0));
    // --- FIN DE LA CORRECCIÓN ---
    
    const cuentaResultado = { 
        id: 9999,
        codigo: '399', 
        nombre: 'Resultado del Período', 
        tipo: 'DETALLE', 
        parentId: 300, 
        saldo: resultadoDelPeriodo
    };
    planConSaldos.push(cuentaResultado);
    // Asegurarnos de que patrimonio existe antes de sumar
    if (patrimonio) {
        patrimonio.saldo += resultadoDelPeriodo;
    }
    const totalPasivoPatrimonio = (pasivo?.saldo || 0) + (patrimonio?.saldo || 0);

    let html = `<div class="conta-card mb-6">
        <form onsubmit="event.preventDefault(); ContaApp.filtrarReporte('balance')" class="flex flex-wrap gap-4 items-end">
            <div>
                <label for="reporte-fecha-fin" class="text-sm font-medium">Mostrar balance a la fecha:</label>
                <input type="date" id="reporte-fecha-fin" class="p-2 border rounded w-full conta-input" value="${fechaFin}">
            </div>
            <button type="submit" class="conta-btn">Filtrar</button>
        </form>
    </div>
    <div class="flex justify-between items-center mb-4"><h2 class="conta-subtitle !mb-0">Balance General</h2>
        <div><button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarReporteEstilizadoPDF('Balance General', 'reporte-balance-area')">Vista Previa PDF</button></div>
    </div>
    <div class="conta-card" id="reporte-balance-area"><div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div><table class="min-w-full" data-export-title="Activos">`;
    
    const renderSection = (cuentaId, plan, level = 0) => {
        const cuenta = plan.find(c => c.id === cuentaId);
        if (!cuenta) return; // Añadida verificación de seguridad
        const isTitleOrControl = cuenta.tipo === 'TITULO' || cuenta.tipo === 'CONTROL';
         const style = isTitleOrControl ? `color: var(--color-primary); font-weight: bold;` : `color: var(--color-text-primary);`;

        html += `<tr>
            <td class="py-2" style="padding-left: ${level * 1.5}rem; ${style}">${cuenta.nombre}</td>
            <td class="py-2 text-right" style="${style}"><span class="font-mono">${this.formatCurrency(cuenta.saldo)}</span></td>
        </tr>`;
        plan.filter(c => c.parentId === cuentaId).sort((a,b) => a.codigo.localeCompare(b.codigo, undefined, {numeric: true})).forEach(child => renderSection(child.id, plan, level + 1));
    };
    
    if (activo) renderSection(activo.id, planConSaldos);
    html += `<tr class="border-t-2 border-[var(--color-border-accent)]">
        <td class="py-2 font-extrabold text-lg">Total Activos</td>
        <td class="py-2 text-right font-mono font-extrabold text-lg">${this.formatCurrency(activo?.saldo || 0)}</td>
    </tr>`;

    html += `</table></div><div><table class="min-w-full" data-export-title="Pasivo y Patrimonio">`;
    if (pasivo) renderSection(pasivo.id, planConSaldos);
    if (patrimonio) renderSection(patrimonio.id, planConSaldos);
    html += `<tr class="border-t-2 border-[var(--color-border-accent)]">
        <td class="py-2 font-extrabold text-lg">Total Pasivo y Patrimonio</td>
        <td class="py-2 text-right font-mono font-extrabold text-lg">${this.formatCurrency(totalPasivoPatrimonio)}</td>
    </tr>`;

    const diferencia = (activo?.saldo || 0) - totalPasivoPatrimonio;
    if (Math.abs(diferencia) > 0.01) {
         html += `<tr class="border-t-2 border-red-500">
            <td class="py-2 font-bold text-red-600">Descuadre</td>
            <td class="py-2 text-right font-mono font-bold text-red-600">${this.formatCurrency(diferencia)}</td>
        </tr>`;
    }
    
    html +=`</table></div></div></div>`;
    document.getElementById('reporte-contenido').innerHTML = html;
},
        renderMayorAnalitico(params = {}) {
    const cuentasOptions = this.planDeCuentas.filter(c => c.tipo === 'DETALLE')
        .sort((a,b) => a.codigo.localeCompare(b.codigo, undefined, {numeric: true}))
        .map(c => `<option value="${c.id}" ${parseInt(c.id) === parseInt(params.cuentaId) ? 'selected' : ''}>${c.codigo} - ${c.nombre}</option>`).join('');

    // --- MEJORA VISUAL: Se cambia 'grid' por 'flex' para compactar el formulario ---
    let html = `<div class="conta-card mb-6">
        <form onsubmit="event.preventDefault(); ContaApp.generarReporteMayor()" class="flex flex-wrap items-end gap-4">
            <div class="flex-grow" style="min-width: 300px;">
                <label for="mayor-cuenta" class="text-xs font-semibold">Cuenta</label>
                <select id="mayor-cuenta" class="conta-input w-full">${cuentasOptions}</select>
            </div>
            <div>
                <label for="mayor-fecha-inicio" class="text-xs font-semibold">Desde</label>
                <input type="date" id="mayor-fecha-inicio" class="conta-input" value="${params.startDate || ''}">
            </div>
            <div>
                <label for="mayor-fecha-fin" class="text-xs font-semibold">Hasta</label>
                <input type="date" id="mayor-fecha-fin" class="conta-input" value="${params.endDate || this.getTodayDate()}">
            </div>
            <button type="submit" class="conta-btn">Generar Reporte</button>
        </form>
    </div>
    <div id="mayor-resultado"></div>`;
    document.getElementById('reporte-contenido').innerHTML = html;
    
    if (params.cuentaId) {
        this.generarReporteMayor();
    }
},
        generarReporteMayor() {
        const cuentaId = parseInt(document.getElementById('mayor-cuenta').value);
        const fechaInicio = document.getElementById('mayor-fecha-inicio').value;
        const fechaFin = document.getElementById('mayor-fecha-fin').value || this.getTodayDate();
        const cuenta = this.findById(this.planDeCuentas, cuentaId);
        const saldoAnteriorPlan = this.getSaldosPorPeriodo(fechaInicio ? new Date(new Date(fechaInicio).getTime() - 86400000).toISOString().slice(0,10) : null);
        const saldoAnterior = saldoAnteriorPlan.find(c => c.id === cuentaId)?.saldo || 0;
        const movimientos = this.asientos
            .filter(a => (!fechaInicio || a.fecha >= fechaInicio) && a.fecha <= fechaFin)
            .flatMap(a => a.movimientos.map(m => ({...m, fecha: a.fecha, descripcion: a.descripcion, asientoId: a.id, esManual: !a.transaccionId }))) // <-- Añadimos si es manual
            .filter(m => m.cuentaId === cuentaId)
            .sort((a,b) => new Date(a.fecha) - new Date(b.fecha) || a.asientoId - b.asientoId);
            
        let saldoCorriente = saldoAnterior;
        let html = `<div class="flex justify-between items-center mb-4"><h2 class="conta-subtitle !mb-0">Mayor de: ${cuenta.codigo} - ${cuenta.nombre}</h2>
            <div><button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarReporteEstilizadoPDF('Mayor Analítico', 'reporte-mayor-area')">Vista Previa PDF</button></div>
        </div>
        <div class="conta-card" id="reporte-mayor-area"><table class="min-w-full text-sm conta-table-zebra">
            <thead><tr>
                <th class="conta-table-th">Fecha</th><th class="conta-table-th">Descripción</th>
                <th class="conta-table-th text-right">Debe</th><th class="conta-table-th text-right">Haber</th>
                <th class="conta-table-th text-right">Saldo</th>
                <th class="conta-table-th text-center">Asiento</th>
            </tr></thead><tbody>
            <tr><td colspan="5" class="conta-table-td font-bold">Saldo Anterior</td><td class="conta-table-td text-right font-bold font-mono">${this.formatCurrency(saldoAnterior)}</td></tr>`;
        
        const esDeudora = ['1','5'].includes(cuenta.codigo[0]);

        movimientos.forEach(mov => {
            saldoCorriente += esDeudora ? (mov.debe - mov.haber) : (mov.haber - mov.debe);
            html += `<tr>
                <td class="conta-table-td">${mov.fecha}</td>
                <td class="conta-table-td">${mov.descripcion}</td>
                <td class="conta-table-td text-right font-mono">${this.formatCurrency(mov.debe)}</td>
                <td class="conta-table-td text-right font-mono">${this.formatCurrency(mov.haber)}</td>
                <td class="conta-table-td text-right font-mono">${this.formatCurrency(saldoCorriente)}</td>
                <!-- ===== INICIO DE LA MEJORA: Botón para ir al asiento ===== -->
                <td class="conta-table-td text-center">
                    <button class="conta-btn conta-btn-small" onclick="ContaApp.irModulo('diario-general', { search: '${mov.asientoId}' })">
                       #${mov.asientoId} ${mov.esManual ? '<i class="fa-solid fa-pencil ml-2"></i>' : ''}
                    </button>
                </td>
                <!-- ===== FIN DE LA MEJORA ===== -->
            </tr>`;
        });
        html += `<tr class="bg-[var(--color-bg-accent)] font-bold">
            <td colspan="2" class="conta-table-td">Total Movimientos</td>
            <td class="conta-table-td text-right font-mono">${this.formatCurrency(movimientos.reduce((s, m) => s + m.debe, 0))}</td>
            <td class="conta-table-td text-right font-mono">${this.formatCurrency(movimientos.reduce((s, m) => s + m.haber, 0))}</td>
            <td class="conta-table-td text-right font-mono" colspan="2">${this.formatCurrency(saldoCorriente)}</td>
        </tr></tbody></table></div>`;
        document.getElementById('mayor-resultado').innerHTML = html;
    },
    
    filtrarReporte(tipo) {
    if (tipo === 'pnl') {
        // --- INICIO DE LA MODIFICACIÓN ---
        const centroDeCostoId = document.getElementById('pnl-centro-costo').value;
        const fechaInicioA = document.getElementById('periodoA-fecha-inicio').value;
        const fechaFinA = document.getElementById('periodoA-fecha-fin').value;
        
        let params = { 
            submodulo: 'pnl',
            fechaInicioA, 
            fechaFinA,
            centroDeCostoId 
        };
        // --- FIN DE LA MODIFICACIÓN ---
        this.irModulo('reportes', params);

    } else if (tipo === 'balance') {
        const fechaFin = document.getElementById('reporte-fecha-fin').value;
        this.irModulo('reportes', { submodulo: 'balance', fechaFin });
    } else if (tipo === 'comprobacion') {
        const fechaInicio = document.getElementById('comprobacion-fecha-inicio').value;
        const fechaFin = document.getElementById('comprobacion-fecha-fin').value;
        this.irModulo('reportes', { submodulo: 'comprobacion', fechaInicio, fechaFin });
    }
},
    getSaldosYMovimientosPorPeriodo(fechaInicio = null, fechaFin = null) {
        const cuentasResultado = JSON.parse(JSON.stringify(this.planDeCuentas.map(({saldo, ...rest}) => rest)));
        cuentasResultado.forEach(c => {
            c.saldoInicial = 0;
            c.debe = 0;
            c.haber = 0;
            c.saldoFinal = 0;
        });
    
        if (fechaInicio) {
            const fechaSaldoAnterior = new Date(new Date(fechaInicio).getTime() - 86400000).toISOString().slice(0, 10);
            const saldosAnteriores = this.getSaldosPorPeriodo(fechaSaldoAnterior);
            cuentasResultado.forEach(c => {
                const cuentaConSaldo = saldosAnteriores.find(s => s.id === c.id);
                if(cuentaConSaldo) c.saldoInicial = cuentaConSaldo.saldo;
            });
        }
    
        const asientosPeriodo = this.asientos.filter(a => {
            if (fechaFin && a.fecha > fechaFin) return false;
            if (fechaInicio && a.fecha < fechaInicio) return false;
            return true;
        });
    
        asientosPeriodo.forEach(asiento => {
            asiento.movimientos.forEach(mov => {
                const cuenta = cuentasResultado.find(c => c.id === mov.cuentaId);
                if (cuenta) {
                    cuenta.debe += mov.debe;
                    cuenta.haber += mov.haber;
                }
            });
        });
    
        cuentasResultado.forEach(c => {
             const esDeudora = ['1', '5'].includes(c.codigo[0]);
             c.saldoFinal = c.saldoInicial + (esDeudora ? c.debe - c.haber : c.haber - c.debe);
        });

        const cuentasPorProcesar = cuentasResultado.filter(c => c.tipo !== 'DETALLE').sort((a,b) => b.codigo.length - a.codigo.length);
        cuentasPorProcesar.forEach(cuentaPadre => {
             const hijos = cuentasResultado.filter(h => h.parentId === cuentaPadre.id);
             cuentaPadre.saldoInicial = hijos.reduce((sum, h) => sum + h.saldoInicial, 0);
             cuentaPadre.debe = hijos.reduce((sum, h) => sum + h.debe, 0);
             cuentaPadre.haber = hijos.reduce((sum, h) => sum + h.haber, 0);
             cuentaPadre.saldoFinal = hijos.reduce((sum, h) => sum + h.saldoFinal, 0);
        });
    
        return cuentasResultado;
    },
        renderBalanceComprobacion(params = {}) {
        const fechaInicio = params.fechaInicio || null;
        const fechaFin = params.fechaFin || this.getTodayDate();
        const datos = this.getSaldosYMovimientosPorPeriodo(fechaInicio, fechaFin);
        
        let html = `<div class="conta-card mb-6">
            <form onsubmit="event.preventDefault(); ContaApp.filtrarReporte('comprobacion')" class="flex flex-wrap gap-4 items-end">
                <div><label for="comprobacion-fecha-inicio" class="text-sm font-medium">Desde</label><input type="date" id="comprobacion-fecha-inicio" class="p-2 border rounded w-full conta-input" value="${fechaInicio || ''}"></div>
                <div><label for="comprobacion-fecha-fin" class="text-sm font-medium">Hasta</label><input type="date" id="comprobacion-fecha-fin" class="p-2 border rounded w-full conta-input" value="${fechaFin}"></div>
                <button type="submit" class="conta-btn">Filtrar</button>
            </form>
        </div>
        <div class="flex justify-between items-center mb-4"><h2 class="conta-subtitle !mb-0">Balance de Comprobación</h2>
    <div><button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarReporteEstilizadoPDF('Balance de Comprobación', 'reporte-comprobacion-area')">Vista Previa PDF</button></div>
</div>
<div class="conta-card overflow-auto" id="reporte-comprobacion-area"><table class="min-w-full text-sm conta-table-zebra">
<thead>
    <tr>
        <th class="conta-table-th" rowspan="2">Código</th>
                <th class="conta-table-th" rowspan="2">Cuenta</th>
                <th class="conta-table-th text-center" colspan="2">Saldos Iniciales</th>
                <th class="conta-table-th text-center" colspan="2">Movimientos del Período</th>
                <th class="conta-table-th text-center" colspan="2">Saldos Finales</th>
            </tr>
            <tr>
                <th class="conta-table-th text-right">Debe</th><th class="conta-table-th text-right">Haber</th>
                <th class="conta-table-th text-right">Debe</th><th class="conta-table-th text-right">Haber</th>
                <th class="conta-table-th text-right">Debe</th><th class="conta-table-th text-right">Haber</th>
            </tr>
        </thead>
        <tbody>`;

        const renderRows = (parentId, level = 0) => {
            datos.filter(c => c.parentId === parentId).sort((a,b) => a.codigo.localeCompare(b.codigo, undefined, {numeric: true})).forEach(c => {
                const esDeudora = ['1', '5'].includes(c.codigo[0]);
                const isTitleOrControl = c.tipo === 'TITULO' || c.tipo === 'CONTROL';
                const style = isTitleOrControl ? 'font-weight: bold;' : '';
                const clickableClass = c.tipo === 'DETALLE' ? 'cursor-pointer hover:text-[var(--color-accent)]' : '';

                html += `<tr class="${isTitleOrControl ? 'bg-[var(--color-bg-accent)]' : ''}">
                    <td class="conta-table-td" style="padding-left: ${1 + level * 1.5}rem; ${style}">${c.codigo}</td>
                    <td class="conta-table-td ${clickableClass}" style="${style}" onclick="if('${c.tipo}' === 'DETALLE') ContaApp.irModulo('reportes', {submodulo: 'mayor', cuentaId: ${c.id}, startDate: '${fechaInicio || ''}', endDate: '${fechaFin}'});">
                        ${c.nombre}
                    </td>
                    <td class="conta-table-td text-right font-mono" style="${style}">${esDeudora && c.saldoInicial > 0 ? this.formatCurrency(c.saldoInicial) : ''}</td>
                    <td class="conta-table-td text-right font-mono" style="${style}">${!esDeudora && c.saldoInicial > 0 ? this.formatCurrency(c.saldoInicial) : ''}</td>
                    <td class="conta-table-td text-right font-mono" style="${style}">${this.formatCurrency(c.debe)}</td>
                    <td class="conta-table-td text-right font-mono" style="${style}">${this.formatCurrency(c.haber)}</td>
                    <td class="conta-table-td text-right font-mono" style="${style}">${esDeudora && c.saldoFinal > 0 ? this.formatCurrency(c.saldoFinal) : ''}</td>
                    <td class="conta-table-td text-right font-mono" style="${style}">${!esDeudora && c.saldoFinal > 0 ? this.formatCurrency(c.saldoFinal) : ''}</td>
                </tr>`;
                
                if (isTitleOrControl) {
                    renderRows(c.id, level + 1);
                }
            });
        }

        renderRows(null);
        
        const totalActivos = datos.find(c => c.id === 100);
        const totalPasivos = datos.find(c => c.id === 200);
        const totalPatrimonio = datos.find(c => c.id === 300);
        const totalIngresos = datos.find(c => c.id === 400);
        const totalGastos = datos.find(c => c.id === 500);

        const totalDebeInicial = (totalActivos?.saldoInicial || 0) + (totalGastos?.saldoInicial || 0);
        const totalHaberInicial = (totalPasivos?.saldoInicial || 0) + (totalPatrimonio?.saldoInicial || 0) + (totalIngresos?.saldoInicial || 0);
        const totalDebeMov = datos.filter(c=>c.tipo==='TITULO').reduce((s,c)=>s+c.debe, 0)/2;
        const totalHaberMov = datos.filter(c=>c.tipo==='TITULO').reduce((s,c)=>s+c.haber, 0)/2;
        const totalDebeFinal = (totalActivos?.saldoFinal || 0) + (totalGastos?.saldoFinal || 0);
        const totalHaberFinal = (totalPasivos?.saldoFinal || 0) + (totalPatrimonio?.saldoFinal || 0) + (totalIngresos?.saldoFinal || 0);

        html += `<tr class="border-t-4 border-[var(--color-border-accent)] font-bold">
            <td class="conta-table-td" colspan="2">TOTALES</td>
            <td class="conta-table-td text-right font-mono">${this.formatCurrency(totalDebeInicial)}</td>
            <td class="conta-table-td text-right font-mono">${this.formatCurrency(totalHaberInicial)}</td>
            <td class="conta-table-td text-right font-mono">${this.formatCurrency(totalDebeMov)}</td>
            <td class="conta-table-td text-right font-mono">${this.formatCurrency(totalHaberMov)}</td>
            <td class="conta-table-td text-right font-mono">${this.formatCurrency(totalDebeFinal)}</td>
            <td class="conta-table-td text-right font-mono">${this.formatCurrency(totalHaberFinal)}</td>
        </tr>`;

        html += `</tbody></table></div>`;
        document.getElementById('reporte-contenido').innerHTML = html;
    },
    exportarReporteEstilizadoPDF(titulo, areaId) {
        const { jsPDF } = window.jspdf;
        
        const generatePdf = (logoDataUrl = null) => {
            const doc = new jsPDF({orientation: titulo.includes('Comprobación') || titulo.includes('Antigüedad') ? 'landscape' : 'portrait'});
            const pageWidth = doc.internal.pageSize.getWidth();
            let startY = 15;

            const headerColor = this.getThemeColor('--color-primary');
            doc.setFillColor(headerColor.substring(1));
            doc.rect(0, 0, pageWidth, 40, 'F');
            
            if (logoDataUrl) {
                const logoX = pageWidth - 14 - 25;
                doc.addImage(logoDataUrl, 'PNG', logoX, 8, 25, 25);
            }
            
            doc.setTextColor('#FFFFFF');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text(titulo, 14, 22);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(this.empresa.nombre, 14, 30);
            
            startY = 50;

            const contentArea = document.getElementById(areaId);
            const tables = contentArea.querySelectorAll(`table`);

            // Si hay un título dentro del área (como en el aging report), lo añadimos
            const titleEl = contentArea.querySelector('h2');
            const subtitleEl = contentArea.querySelector('h3');
            const dateEl = contentArea.querySelector('p');

            if (subtitleEl) {
                 doc.setFontSize(14);
                 doc.setFont('helvetica', 'bold');
                 doc.setTextColor(this.getThemeColor('--color-text-primary'));
                 doc.text(subtitleEl.innerText, pageWidth / 2, startY, { align: 'center' });
                 startY += 6;
            }
            if (dateEl && dateEl.innerText.includes('Al ')) {
                 doc.setFontSize(10);
                 doc.setFont('helvetica', 'normal');
                 doc.text(dateEl.innerText, pageWidth / 2, startY, { align: 'center' });
                 startY += 10;
            }


            tables.forEach((table, index) => {
                doc.autoTable({ 
                    html: table, 
                    startY: startY, 
                    theme: 'grid', 
                    headStyles: { fillColor: headerColor },
                    didParseCell: (data) => { if (data.cell.raw.classList.contains('text-right')) data.cell.styles.halign = 'right'; } 
                });
                startY = doc.autoTable.previous.finalY + 10;
            });

            return doc;
        };

        const displayPreview = (pdfDoc) => {
            const pdfDataUri = pdfDoc.output('datauristring');
            const previewHTML = `
                <div class="flex justify-between items-center mb-4 no-print">
                    <h3 class="conta-title !mb-0">Vista Previa del Reporte</h3>
                    <div>
                        <button class="conta-btn conta-btn-accent" onclick="window.open('${pdfDataUri}', '_blank')">Abrir en Nueva Pestaña</button>
                        <button class="conta-btn" onclick="this.nextElementSibling.click()">Descargar PDF</button>
                        <a href="${pdfDataUri}" download="${titulo.replace(/ /g, '_')}_${this.empresa.nombre}.pdf" class="hidden"></a>
                        <button class="conta-btn conta-btn-danger" onclick="ContaApp.closeModal()">Cerrar</button>
                    </div>
                </div>
                <iframe src="${pdfDataUri}" width="100%" height="600px" style="border: none;"></iframe>
            `;
            this.showModal(previewHTML, '6xl');
        };

        if (this.empresa.logo) {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                const pdfDoc = generatePdf(dataURL);
                displayPreview(pdfDoc);
            };
            img.onerror = () => {
                this.showToast('No se pudo cargar el logo, exportando sin imagen.', 'error');
                const pdfDoc = generatePdf();
                displayPreview(pdfDoc);
            };
            img.src = this.empresa.logo;
        } else {
            const pdfDoc = generatePdf();
            displayPreview(pdfDoc);
        }
    },
    renderReportes_TabPresupuestos(params = {}) {
        const subtab = params.subtab || 'definir';
        const hoy = new Date();
        const periodoDefault = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
        const periodo = params.periodo || periodoDefault;

        let html = `
            <div class="flex gap-2 mb-4">
                <button class="py-2 px-4 text-sm font-semibold ${subtab === 'definir' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('reportes', {submodulo: 'presupuestos', subtab: 'definir', periodo: document.getElementById('presupuesto-periodo')?.value || '${periodo}'})">Definir Presupuesto</button>
                <button class="py-2 px-4 text-sm font-semibold ${subtab === 'reporte' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('reportes', {submodulo: 'presupuestos', subtab: 'reporte', periodo: document.getElementById('presupuesto-periodo')?.value || '${periodo}'})">Reporte Presupuestal</button>
            </div>
            <div id="presupuestos-contenido"></div>
        `;
        document.getElementById('reporte-contenido').innerHTML = html;

        if (subtab === 'definir') {
            this.renderPresupuestos_TabDefinir(periodo);
        } else if (subtab === 'reporte') {
            this.renderPresupuestos_TabReporte(periodo);
        }
    },

    renderPresupuestos_TabDefinir(periodo) {
        document.getElementById('page-actions-header').innerHTML = '';
        
        const cuentasDeGasto = this.planDeCuentas
            .filter(c => c.tipo === 'DETALLE' && c.codigo.startsWith('5'))
            .sort((a,b) => a.codigo.localeCompare(b.codigo));

        const presupuestoActual = this.empresa.presupuestos ? (this.empresa.presupuestos[periodo] || {}) : {};

        let filasHTML = '';
        cuentasDeGasto.forEach(cuenta => {
            const montoPresupuestado = presupuestoActual[cuenta.id] || '';
            filasHTML += `
                <tr class="border-t border-[var(--color-border-primary)]">
                    <td class="py-2 px-3 font-mono">${cuenta.codigo}</td>
                    <td class="py-2 px-3">${cuenta.nombre}</td>
                    <td class="py-2 px-3">
                        <div class="flex justify-end">
                            <input type="number" step="0.01" class="w-32 conta-input text-right" 
                                   data-cuenta-id="${cuenta.id}" value="${montoPresupuestado}">
                        </div>
                    </td>
                </tr>
            `;
        });

        let html = `
            <div class="conta-card">
                <h3 class="conta-subtitle">Definir Presupuesto de Gastos</h3>
                <form onsubmit="event.preventDefault(); ContaApp.guardarPresupuesto()">
                    <div class="flex items-end gap-4 mb-6">
                        <div>
                            <label for="presupuesto-periodo" class="text-sm font-medium">Período (Mes y Año)</label>
                            <input type="month" id="presupuesto-periodo" class="w-full conta-input mt-1" value="${periodo}" onchange="ContaApp.irModulo('reportes', {submodulo: 'presupuestos', subtab: 'definir', periodo: this.value})">
                        </div>
                    </div>
                    
                    <div class="overflow-auto max-h-[60vh]">
                        <table class="min-w-full text-sm">
                            <thead>
                                <tr>
                                    <th class="conta-table-th">Código</th>
                                    <th class="conta-table-th">Cuenta de Gasto</th>
                                    <th class="conta-table-th text-right">Monto Presupuestado</th>
                                </tr>
                            </thead>
                            <tbody id="presupuesto-tabla-body">
                                ${filasHTML}
                            </tbody>
                        </table>
                    </div>
                    <div class="text-right mt-6">
                        <button type="submit" class="conta-btn">Guardar Presupuesto</button>
                    </div>
                </form>
            </div>
        `;
        document.getElementById('presupuestos-contenido').innerHTML = html;
    },

    renderPresupuestos_TabReporte(periodo) {
        document.getElementById('page-actions-header').innerHTML = `<button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarReporteEstilizadoPDF('Reporte Presupuestal', 'reporte-presupuesto-area')"><i class="fa-solid fa-print me-2"></i>Imprimir PDF</button>`;
        const datosReporte = this.getDatosReportePresupuesto(periodo);

        let filasHTML = '';
        datosReporte.cuentas.forEach(item => {
            const diferenciaClass = item.diferencia >= 0 ? 'conta-text-success' : 'conta-text-danger';
            let ejecucionClass = 'bg-green-500';
            if (item.ejecucion > 80) ejecucionClass = 'bg-yellow-500';
            if (item.ejecucion > 100) ejecucionClass = 'bg-red-500';

            filasHTML += `
                <tr class="border-t border-[var(--color-border-primary)]">
                    <td class="py-2 px-3">${item.cuenta.nombre}</td>
                    <td class="py-2 px-3 text-right font-mono">${this.formatCurrency(item.presupuestado)}</td>
                    <td class="py-2 px-3 text-right font-mono">${this.formatCurrency(item.real)}</td>
                    <td class="py-2 px-3 text-right font-mono ${diferenciaClass}">${this.formatCurrency(item.diferencia)}</td>
                    <td class="py-2 px-3">
                        <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div class="${ejecucionClass} h-2.5 rounded-full" style="width: ${Math.min(item.ejecucion, 100)}%"></div>
                        </div>
                        <span class="text-xs font-semibold">${item.ejecucion.toFixed(1)}%</span>
                    </td>
                </tr>
            `;
        });

        let html = `
            <div class="conta-card" id="reporte-presupuesto-area">
                <h3 class="conta-subtitle">Reporte Presupuestal (Presupuesto vs. Real)</h3>
                <div class="flex items-end gap-4 mb-6">
                    <div>
                        <label for="presupuesto-periodo" class="text-sm font-medium">Período (Mes y Año)</label>
                        <input type="month" id="presupuesto-periodo" class="w-full conta-input mt-1" value="${periodo}" onchange="ContaApp.irModulo('reportes', {submodulo: 'presupuestos', subtab: 'reporte', periodo: this.value})">
                    </div>
                </div>
                
                <div class="overflow-auto">
                    <table class="min-w-full text-sm">
                        <thead>
                            <tr>
                                <th class="conta-table-th">Cuenta de Gasto</th>
                                <th class="conta-table-th text-right">Presupuestado</th>
                                <th class="conta-table-th text-right">Real</th>
                                <th class="conta-table-th text-right">Diferencia</th>
                                <th class="conta-table-th">Ejecución</th>
                            </tr>
                        </thead>
                        <tbody>${filasHTML}</tbody>
                        <tfoot class="bg-[var(--color-bg-accent)] font-bold">
                            <tr>
                                <td class="py-2 px-3">TOTALES</td>
                                <td class="py-2 px-3 text-right font-mono">${this.formatCurrency(datosReporte.totales.presupuestado)}</td>
                                <td class="py-2 px-3 text-right font-mono">${this.formatCurrency(datosReporte.totales.real)}</td>
                                <td class="py-2 px-3 text-right font-mono ${datosReporte.totales.diferencia >= 0 ? 'conta-text-success' : 'conta-text-danger'}">${this.formatCurrency(datosReporte.totales.diferencia)}</td>
                                <td class="py-2 px-3">
                                    <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                        <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${Math.min(datosReporte.totales.ejecucion, 100)}%"></div>
                                    </div>
                                    <span class="text-xs font-semibold">${datosReporte.totales.ejecucion.toFixed(1)}%</span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('presupuestos-contenido').innerHTML = html;
    },

    getDatosReportePresupuesto(periodo) {
        const [year, month] = periodo.split('-');
        const fechaInicio = `${periodo}-01`;
        const fechaFin = new Date(year, month, 0).toISOString().slice(0, 10);

        const presupuesto = this.empresa.presupuestos ? (this.empresa.presupuestos[periodo] || {}) : {};
        const saldosGastos = this.getSaldosPorPeriodo(fechaFin, fechaInicio)
            .filter(c => c.tipo === 'DETALLE' && c.codigo.startsWith('5'));

        const cuentasConDatos = this.planDeCuentas
            .filter(c => c.tipo === 'DETALLE' && c.codigo.startsWith('5'))
            .map(cuenta => {
                const presupuestado = presupuesto[cuenta.id] || 0;
                const real = saldosGastos.find(s => s.id === cuenta.id)?.saldo || 0;
                
                if (presupuestado === 0 && real === 0) return null;

                const diferencia = presupuestado - real;
                const ejecucion = presupuestado > 0 ? (real / presupuestado) * 100 : 0;

                return {
                    cuenta,
                    presupuestado,
                    real,
                    diferencia,
                    ejecucion
                };
            })
            .filter(Boolean)
            .sort((a,b) => a.cuenta.codigo.localeCompare(b.cuenta.codigo));

        const totales = cuentasConDatos.reduce((acc, curr) => {
            acc.presupuestado += curr.presupuestado;
            acc.real += curr.real;
            return acc;
        }, { presupuestado: 0, real: 0 });

        totales.diferencia = totales.presupuestado - totales.real;
        totales.ejecucion = totales.presupuestado > 0 ? (totales.real / totales.presupuestado) * 100 : 0;

        return { cuentas: cuentasConDatos, totales };
    },

    guardarPresupuesto() {
        const periodo = document.getElementById('presupuesto-periodo').value;
        if (!periodo) {
            this.showToast('Por favor, selecciona un período válido.', 'error');
            return;
        }

        if (!this.empresa.presupuestos) {
            this.empresa.presupuestos = {};
        }

        const presupuestoDelPeriodo = {};
        const inputs = document.querySelectorAll('#presupuesto-tabla-body input');
        
        inputs.forEach(input => {
            const cuentaId = input.dataset.cuentaId;
            const monto = parseFloat(input.value);
            if (!isNaN(monto) && monto > 0) {
                presupuestoDelPeriodo[cuentaId] = monto;
            }
        });

        this.empresa.presupuestos[periodo] = presupuestoDelPeriodo;
        this.saveAll();
        this.showToast(`Presupuesto para ${periodo} guardado con éxito.`, 'success');
    },  
getFlujoDeEfectivoData(fechaInicio, fechaFin) {
        // 1. Identificar todas las cuentas de "Efectivo y Equivalentes" (grupo 110)
        const idsCuentasEfectivo = this.planDeCuentas
            .filter(c => c.parentId === 110 && c.tipo === 'DETALLE')
            .map(c => c.id);

        // 2. Calcular saldos iniciales y finales
        const fechaSaldoInicial = new Date(new Date(fechaInicio).getTime() - 86400000).toISOString().slice(0, 10);
        const saldosIniciales = this.getSaldosPorPeriodo(fechaSaldoInicial);
        const saldosFinales = this.getSaldosPorPeriodo(fechaFin);

        const saldoInicialEfectivo = saldosIniciales
            .filter(c => idsCuentasEfectivo.includes(c.id))
            .reduce((sum, c) => sum + c.saldo, 0);

        const saldoFinalEfectivo = saldosFinales
            .filter(c => idsCuentasEfectivo.includes(c.id))
            .reduce((sum, c) => sum + c.saldo, 0);

        // 3. Analizar y clasificar los asientos del período
        const asientosPeriodo = this.asientos.filter(a => a.fecha >= fechaInicio && a.fecha <= fechaFin);
        
        const movimientos = {
            operacion: [],
            inversion: [],
            financiacion: []
        };

        asientosPeriodo.forEach(asiento => {
            const movEfectivo = asiento.movimientos.find(m => idsCuentasEfectivo.includes(m.cuentaId));
            if (!movEfectivo) return; // Si el asiento no toca una cuenta de efectivo, lo ignoramos

            // Determinar si es una entrada (DEBE) o salida (HABER) de efectivo
            const monto = movEfectivo.debe - movEfectivo.haber;

            // Analizar las contrapartidas para clasificar el movimiento
            const contrapartidas = asiento.movimientos.filter(m => !idsCuentasEfectivo.includes(m.cuentaId));

            // Si todas las contrapartidas son también cuentas de efectivo, es una transferencia interna y se ignora
            if (contrapartidas.length === 0) return;

            contrapartidas.forEach(cp => {
                const cuentaCp = this.findById(this.planDeCuentas, cp.cuentaId);
                if (!cuentaCp) return;

                let clasificacion = null;
                const codigo = cuentaCp.codigo;

                // Clasificación basada en el código de la cuenta de contrapartida
                if (['120', '210', '220', '240', '4', '5'].some(c => codigo.startsWith(c))) {
                    clasificacion = 'operacion'; // CxC, CxP, Anticipos, Impuestos, Ingresos, Gastos
                } else if (codigo.startsWith('3')) { // Patrimonio
                    clasificacion = 'financiacion'; // Aportes de capital, etc.
                }
                // NOTA: Cuando se añadan activos fijos (ej: código '150'), se clasificarán como 'inversion'.

                if (clasificacion) {
                    movimientos[clasificacion].push({
                        descripcion: asiento.descripcion,
                        monto: monto > 0 ? cp.haber : cp.debe, // Tomamos el valor de la contrapartida
                        esEntrada: monto > 0
                    });
                }
            });
        });

        // 4. Consolidar y totalizar los resultados
        const consolidar = (actividades) => {
            const entradas = actividades.filter(a => a.esEntrada).reduce((sum, a) => sum + a.monto, 0);
            const salidas = actividades.filter(a => !a.esEntrada).reduce((sum, a) => sum + a.monto, 0);
            return {
                movimientos: actividades,
                totalEntradas: entradas,
                totalSalidas: salidas,
                neto: entradas - salidas
            };
        };

        return {
            saldoInicial: saldoInicialEfectivo,
            saldoFinal: saldoFinalEfectivo,
            operacion: consolidar(movimientos.operacion),
            inversion: consolidar(movimientos.inversion),
            financiacion: consolidar(movimientos.financiacion)
        };
    },
    renderFlujoDeEfectivo(params = {}) {
        const hoy = new Date();
        const primerDiaAno = new Date(hoy.getFullYear(), 0, 1).toISOString().slice(0, 10);
        const fechaInicio = params.fechaInicio || primerDiaAno;
        const fechaFin = params.fechaFin || hoy.toISOString().slice(0, 10);

        const datos = this.getFlujoDeEfectivoData(fechaInicio, fechaFin);

        const renderSection = (titulo, data) => {
            if (data.movimientos.length === 0) return '';
            let html = `<tr class="bg-[var(--color-bg-accent)] font-bold"><td colspan="2" class="py-2 px-3">${titulo}</td></tr>`;
            data.movimientos.forEach(mov => {
                html += `<tr>
                    <td class="py-1 px-6">${mov.descripcion}</td>
                    <td class="py-1 px-3 text-right font-mono">${this.formatCurrency(mov.esEntrada ? mov.monto : -mov.monto)}</td>
                </tr>`;
            });
            html += `<tr class="border-t font-semibold">
                <td class="py-1 px-4 text-right">Flujo Neto por Actividades de ${titulo}</td>
                <td class="py-1 px-3 text-right font-mono border-t">${this.formatCurrency(data.neto)}</td>
            </tr>`;
            return html;
        };

        const flujoNetoTotal = datos.operacion.neto + datos.inversion.neto + datos.financiacion.neto;
        const saldoCalculado = datos.saldoInicial + flujoNetoTotal;

        let html = `
            <div class="conta-card mb-6">
                <form onsubmit="event.preventDefault(); ContaApp.irModulo('reportes', { submodulo: 'flujo-efectivo', fechaInicio: document.getElementById('flujo-fecha-inicio').value, fechaFin: document.getElementById('flujo-fecha-fin').value })" class="flex flex-wrap gap-4 items-end">
                    <div>
                        <label for="flujo-fecha-inicio" class="text-sm font-medium">Desde</label>
                        <input type="date" id="flujo-fecha-inicio" class="w-full conta-input" value="${fechaInicio}">
                    </div>
                    <div>
                        <label for="flujo-fecha-fin" class="text-sm font-medium">Hasta</label>
                        <input type="date" id="flujo-fecha-fin" class="w-full conta-input" value="${fechaFin}">
                    </div>
                    <button type="submit" class="conta-btn">Generar Reporte</button>
                </form>
            </div>
            <div class="flex justify-between items-center mb-4">
                <h2 class="conta-subtitle !mb-0">Estado de Flujo de Efectivo</h2>
                <div>
                    <button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarReporteEstilizadoPDF('Flujo de Efectivo', 'reporte-flujo-area')">Vista Previa PDF</button>
                </div>
            </div>
            <div class="conta-card overflow-auto" id="reporte-flujo-area">
                <table class="min-w-full text-sm">
                    <tbody>
                        <tr>
                            <td class="py-2 px-3 font-bold">Efectivo al inicio del período</td>
                            <td class="py-2 px-3 text-right font-mono font-bold">${this.formatCurrency(datos.saldoInicial)}</td>
                        </tr>
                        ${renderSection('Operación', datos.operacion)}
                        ${renderSection('Inversión', datos.inversion)}
                        ${renderSection('Financiación', datos.financiacion)}
                        <tr class="border-t-2 border-[var(--color-border-accent)] font-bold">
                            <td class="py-2 px-3">Aumento (Disminución) Neto de Efectivo</td>
                            <td class="py-2 px-3 text-right font-mono">${this.formatCurrency(flujoNetoTotal)}</td>
                        </tr>
                        <tr class="font-bold text-lg bg-[var(--color-bg-accent)]">
                            <td class="py-2 px-3">Efectivo al final del período</td>
                            <td class="py-2 px-3 text-right font-mono">${this.formatCurrency(saldoCalculado)}</td>
                        </tr>
                    </tbody>
                </table>
                 <div class="text-right text-xs text-[var(--color-text-secondary)] mt-2">
                    (Saldo en libros al ${fechaFin}: ${this.formatCurrency(datos.saldoFinal)})
                </div>
            </div>
        `;

        document.getElementById('reporte-contenido').innerHTML = html;
    },
});