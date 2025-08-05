// Archivo: modules/bancos.js

Object.assign(ContaApp, {

    // Módulo Bancos
    renderBancosYTarjetas(params = {}) {
        // La lógica de `if (params.submodulo === 'conciliacion')` ya no es necesaria y se ha eliminado.
        
        this.actualizarSaldosGlobales();
        const cuentasBancarias = this.planDeCuentas.filter(c => c.tipo === 'DETALLE' && c.parentId === 110).sort((a,b) => a.nombre.localeCompare(b.nombre));
        const cuentasTarjeta = this.planDeCuentas.filter(c => c.tipo === 'DETALLE' && c.parentId === 230).sort((a,b) => a.nombre.localeCompare(b.nombre));
        const todasLasCuentas = [...cuentasBancarias, ...cuentasTarjeta];
        
        let cuentaIdSeleccionada = params.cuentaIdFiltrada || (cuentasBancarias.length > 0 ? cuentasBancarias[0].id : (cuentasTarjeta.length > 0 ? cuentasTarjeta[0].id : null));
        const tabActiva = params.tab || 'pending';
    
        // Se elimina el botón "Reconciliar Cuenta" que abría la pantalla antigua
        document.getElementById('page-actions-header').innerHTML = `
            <div class="flex gap-2 flex-wrap">
                <button class="conta-btn" onclick="ContaApp.abrirModalTransferencia()"><i class="fa-solid fa-exchange-alt me-2"></i>Nueva Transferencia</button>
                <button class="conta-btn" onclick="ContaApp.abrirModalPagoTarjeta()"><i class="fa-solid fa-credit-card me-2"></i>Pagar Tarjeta</button>
                <button class="conta-btn conta-btn-accent" onclick="ContaApp.abrirModalImportarBanco(${cuentaIdSeleccionada})"><i class="fa-solid fa-upload me-2"></i>Importar Movimientos</button>
            </div>
        `;
    
        let tarjetasHTML = '';
        if (todasLasCuentas.length > 0) {
            tarjetasHTML = todasLasCuentas.map(c => {
                const transaccionesPendientes = (this.bancoImportado[c.id] || []).filter(t => t.status === 'pending').length;
                const esTarjeta = c.parentId === 230;
                const saldoColor = esTarjeta ? 'conta-text-danger' : (c.saldo >= 0 ? 'conta-text-success' : 'conta-text-danger');
                
                return `
                    <div class="conta-card conta-card-clickable flex-shrink-0 w-64 ${c.id === cuentaIdSeleccionada ? 'active-filter-card' : ''}" onclick="ContaApp.irModulo('bancos', { cuentaIdFiltrada: ${c.id} })">
                        <div class="flex justify-between items-center text-xs">
                            <span>${c.nombre}</span>
                            ${transaccionesPendientes > 0 ? `<span class="bg-[var(--color-primary)] text-white rounded-full h-5 w-5 flex items-center justify-center font-bold">${transaccionesPendientes}</span>` : ''}
                        </div>
                        <p class="font-bold text-xl mt-1 ${saldoColor}">${this.formatCurrency(c.saldo)}</p>
                    </div>`;
            }).join('');
        }
    
        let tablaHTML = '';
        if (cuentaIdSeleccionada) {
            const transaccionesCuenta = (this.bancoImportado[cuentaIdSeleccionada] || []).filter(t => t.status === tabActiva).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
            
            let filasHTML = '';
            if (transaccionesCuenta.length === 0) {
                filasHTML = `<tr><td colspan="4" class="text-center p-8 text-[var(--color-text-secondary)]">No hay transacciones en esta vista.</td></tr>`;
            } else {
                transaccionesCuenta.forEach(t => {
                    const montoClass = t.monto >= 0 ? 'conta-text-success' : 'conta-text-danger';
                    
                    let accionesHTML = '';
                    if (tabActiva === 'pending') {
                        // Si el origen es 'manual', significa que ya está en nuestra contabilidad. Solo necesita confirmarse.
                        if (t.origen === 'manual') {
                            accionesHTML = `<button class="conta-btn conta-btn-small conta-btn-success" onclick="ContaApp.confirmarMovimientoManual('${t.id}', ${cuentaIdSeleccionada})">Confirmar</button>`;
                        } else { // Origen es CSV, flujo original
                            const botonPrincipal = t.monto < 0
                                ? `<button class="conta-btn conta-btn-small conta-btn-danger" onclick="ContaApp.abrirModalCrearDesdeBanco('${t.id}', ${cuentaIdSeleccionada}, 'gasto')">Crear Gasto</button>`
                                : `<button class="conta-btn conta-btn-small conta-btn-success" onclick="ContaApp.abrirModalCrearDesdeBanco('${t.id}', ${cuentaIdSeleccionada}, 'ingreso')">Crear Ingreso</button>`;
                            accionesHTML = `<div class="flex gap-2 justify-center">
                                ${botonPrincipal}
                                <button class="conta-btn conta-btn-small conta-btn-accent" onclick="ContaApp.abrirModalMatch('${t.id}', ${cuentaIdSeleccionada})">Match</button>
                                <button class="conta-btn conta-btn-small" onclick="ContaApp.excluirTransaccionBanco('${t.id}', ${cuentaIdSeleccionada})">Excluir</button>
                            </div>`;
                        }
                    } else {
                        accionesHTML = t.status === 'posted' ? `Conciliada (Asiento #${t.asientoId})` : 'Excluida';
                    }
    
                    filasHTML += `<tr id="banco-trans-${t.id}">
                        <td class="conta-table-td">${t.fecha}</td> 
                        <td class="conta-table-td">${t.descripcion}</td>
                        <td class="conta-table-td text-right font-mono ${montoClass}">${this.formatCurrency(t.monto)}</td>
                        <td class="conta-table-td text-center">${accionesHTML}</td>
                    </tr>`;
                });
            }
    
            tablaHTML = `<div class="mt-6">
                <div class="flex justify-between items-center">
                     <div class="flex border-b border-[var(--color-border-accent)]">
                        <button class="py-2 px-4 text-sm font-semibold ${tabActiva === 'pending' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('bancos', { cuentaIdFiltrada: ${cuentaIdSeleccionada}, tab: 'pending'})">Pendientes</button>
                        <button class="py-2 px-4 text-sm font-semibold ${tabActiva === 'posted' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('bancos', { cuentaIdFiltrada: ${cuentaIdSeleccionada}, tab: 'posted'})">Conciliadas</button>
                        <button class="py-2 px-4 text-sm font-semibold ${tabActiva === 'excluded' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('bancos', { cuentaIdFiltrada: ${cuentaIdSeleccionada}, tab: 'excluded'})">Excluidas</button>
                    </div>
                    ${tabActiva === 'pending' ? `<button class="conta-btn conta-btn-small conta-btn-danger" onclick="ContaApp.limpiarPendientesDeCuenta(${cuentaIdSeleccionada})"><i class="fa-solid fa-broom me-2"></i>Limpiar Pendientes</button>` : ''}
                </div>
                <div class="conta-card rounded-t-none border-t-0 overflow-auto">
                    <table class="min-w-full text-sm conta-table-zebra">
                        <thead><tr>
                            <th class="conta-table-th">Fecha</th>
                            <th class="conta-table-th">Descripción Banco</th>
                            <th class="conta-table-th text-right">Monto</th>
                            <th class="conta-table-th text-center">Acción</th>
                        </tr></thead>
                        <tbody>${filasHTML}</tbody>
                    </table>
                </div>
            </div>`;
        } else {
             tablaHTML = this.generarEstadoVacioHTML('fa-university', 'Sin Cuentas Bancarias', 'Crea tu primera cuenta de banco desde el Plan de Cuentas para empezar.', 'Ir a Plan de Cuentas', "ContaApp.irModulo('plan-de-cuentas')");
        }
    
        const layoutHTML = `<h3 class="conta-subtitle">Cuentas</h3><div class="flex justify-center gap-4 overflow-x-auto pb-4">${tarjetasHTML}</div>${tablaHTML}`;
        document.getElementById('bancos').innerHTML = layoutHTML;
    },
    
    confirmarMovimientoManual(transaccionId, cuentaId) {
        const transaccionBanco = this.bancoImportado[cuentaId].find(t => t.id === transaccionId);
        if (transaccionBanco && transaccionBanco.origen === 'manual') {
            transaccionBanco.status = 'posted'; // Simplemente la movemos a "posteada" (conciliada)
            
            const asiento = this.findById(this.asientos, transaccionBanco.asientoId);
            if (asiento) {
                asiento.esConciliado = true; // Marcamos el asiento contable original como conciliado
            }

            this.saveAll();
            this.irModulo('bancos', { cuentaIdFiltrada: cuentaId });
            this.showToast('Transacción confirmada y conciliada.', 'success');
        }
    },

    guardarTransaccionCategorizada(transaccionId, cuentaId) {
        const fila = document.getElementById(`banco-trans-${transaccionId}`);
        const select = fila.querySelector('select');
        const cuentaContrapartidaId = parseInt(select.value);

        if (!cuentaContrapartidaId) {
            this.showToast('Debes seleccionar una categoría para añadir la transacción.', 'error');
            return;
        }

        const transaccionBanco = this.bancoImportado[cuentaId].find(t => t.id === transaccionId);
        if (!transaccionBanco) return;

        const cuentaContrapartida = this.findById(this.planDeCuentas, cuentaContrapartidaId);
        const montoAbsoluto = Math.abs(transaccionBanco.monto);
        let movimientos;
        if (transaccionBanco.monto > 0) {
            movimientos = [
                { cuentaId: cuentaId, debe: montoAbsoluto, haber: 0 },
                { cuentaId: cuentaContrapartidaId, debe: 0, haber: montoAbsoluto }
            ];
        } else {
            movimientos = [
                { cuentaId: cuentaContrapartidaId, debe: montoAbsoluto, haber: 0 },
                { cuentaId: cuentaId, debe: 0, haber: montoAbsoluto }
            ];
        }

        const asiento = this.crearAsiento(transaccionBanco.fecha, `Conciliado: ${transaccionBanco.descripcion}`, movimientos);

        if (asiento) {
            transaccionBanco.status = 'posted';
            transaccionBanco.asientoId = asiento.id;
            transaccionBanco.categoriaNombre = cuentaContrapartida.nombre;
            this.saveAll();
            this.irModulo('bancos', { cuentaIdFiltrada: cuentaId });
            this.showToast('Transacción añadida y conciliada.', 'success');
        }
    },

    abrirModalMatch(transaccionId, cuentaId) {
        const transaccionBanco = this.bancoImportado[cuentaId].find(t => t.id === transaccionId);
        if (!transaccionBanco) return;

        const montoAbsoluto = Math.abs(transaccionBanco.monto);
        const esSalidaDeDinero = transaccionBanco.monto < 0;

        const posiblesMatches = [];

        if (esSalidaDeDinero) {
            this.transacciones
                .filter(t => t.tipo === 'gasto' && (t.estado === 'Pendiente' || t.estado === 'Parcial'))
                .forEach(gasto => {
                    const saldoPendiente = gasto.total - (gasto.montoPagado || 0);
                    if (Math.abs(saldoPendiente - montoAbsoluto) < 0.01) {
                        posiblesMatches.push({
                            id: `gasto-${gasto.id}`, tipo: 'gasto', fecha: gasto.fecha,
                            descripcion: `Gasto #${gasto.id}: ${this.findById(this.contactos, gasto.contactoId)?.nombre} - ${gasto.descripcion}`,
                            monto: saldoPendiente, transaccion: gasto
                        });
                    }
                });
        }

        const fechaTransaccion = new Date(transaccionBanco.fecha);
        const fechaLimiteInferior = new Date(fechaTransaccion.getTime() - 30 * 86400000).toISOString().slice(0, 10);
        const fechaLimiteSuperior = new Date(fechaTransaccion.getTime() + 30 * 86400000).toISOString().slice(0, 10);

        this.asientos.filter(a => {
            const esSaldoInicial = a.descripcion.toLowerCase().includes('saldo inicial');
            return !a.esConciliado && !esSaldoInicial && 
                   a.fecha >= fechaLimiteInferior && a.fecha <= fechaLimiteSuperior &&
                   a.movimientos.some(m => m.cuentaId === cuentaId && (Math.abs(m.debe - montoAbsoluto) < 0.01 || Math.abs(m.haber - montoAbsoluto) < 0.01));
        }).forEach(asiento => {
            if (!posiblesMatches.some(m => m.tipo === 'gasto' && m.transaccion.id === asiento.transaccionId)) {
                const montoAsiento = asiento.movimientos.find(m => m.cuentaId === cuentaId).debe || asiento.movimientos.find(m => m.cuentaId === cuentaId).haber;
                posiblesMatches.push({
                    id: `asiento-${asiento.id}`, tipo: 'asiento', fecha: asiento.fecha,
                    descripcion: `Asiento #${asiento.id}: ${asiento.descripcion}`,
                    monto: montoAsiento, transaccion: asiento
                });
            }
        });
        
        let matchesHTML = '';
        if (posiblesMatches.length > 0) {
            matchesHTML = posiblesMatches.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).map(match => `
                <label class="block p-3 border rounded-lg hover:bg-[var(--color-bg-accent)] cursor-pointer">
                    <div class="flex justify-between items-center">
                        <div>
                            <input type="radio" name="match-seleccion" value="${match.id}" class="mr-3">
                            <span class="font-semibold">${match.descripcion}</span>
                            <span class="text-sm text-[var(--color-text-secondary)]">(${match.fecha})</span>
                        </div>
                        <span class="font-mono">${this.formatCurrency(match.monto)}</span>
                    </div>
                </label>
            `).join('');
        } else {
            matchesHTML = `<p class="text-center text-[var(--color-text-secondary)] p-4">No se encontraron facturas pendientes o asientos que coincidan con este monto.</p>`;
        }

        const modalHTML = `
            <h3 class="conta-title mb-4">Hacer Match de Transacción</h3>
            <div class="conta-card-accent mb-6">
                <div class="flex justify-between">
                    <span>${transaccionBanco.fecha} - ${transaccionBanco.descripcion}</span>
                    <span class="font-bold font-mono">${this.formatCurrency(transaccionBanco.monto)}</span>
                </div>
            </div>
            <div class="space-y-2 max-h-80 overflow-y-auto pr-2">${matchesHTML}</div>
            <div class="flex justify-end gap-2 mt-8">
                <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                <button type="button" class="conta-btn" ${posiblesMatches.length === 0 ? 'disabled' : ''} onclick="ContaApp.confirmarMatch('${transaccionId}', ${cuentaId})">Confirmar Match</button>
            </div>`;
        this.showModal(modalHTML, '3xl');
    },

    excluirTransaccionBanco(transaccionId, cuentaId) {
        const transaccionBanco = this.bancoImportado[cuentaId].find(t => t.id === transaccionId);
        if (transaccionBanco) {
            this.showConfirm('¿Seguro que deseas excluir esta transacción? No se creará ningún asiento contable.', () => {
                transaccionBanco.status = 'excluded';
                this.saveAll();
                this.irModulo('bancos', { cuentaIdFiltrada: cuentaId });
                this.showToast('Transacción excluida.', 'info');
            });
        }
    },

    confirmarMatch(transaccionBancoId, cuentaBancoId) {
        const radioSeleccionado = document.querySelector('input[name="match-seleccion"]:checked');
        if (!radioSeleccionado) {
            this.showToast('Por favor, selecciona una transacción para hacer match.', 'error');
            return;
        }
    
        const matchId = radioSeleccionado.value;
        const [tipoMatch, id] = matchId.split('-');
        const transaccionBanco = this.bancoImportado[cuentaBancoId].find(t => t.id === transaccionBancoId);
    
        if (!transaccionBanco) return;
    
        if (tipoMatch === 'asiento') {
            const asiento = this.findById(this.asientos, parseInt(id));
            if (asiento) {
                asiento.esConciliado = true;
                transaccionBanco.status = 'posted';
                transaccionBanco.categoriaNombre = `Match: Asiento #${asiento.id}`;
                transaccionBanco.asientoId = asiento.id;
            }
        } else if (tipoMatch === 'gasto') {
            const gasto = this.findById(this.transacciones, parseInt(id));
            if (gasto) {
                const pago = {
                    id: this.idCounter++,
                    tipo: 'pago_proveedor',
                    fecha: transaccionBanco.fecha,
                    contactoId: gasto.contactoId,
                    monto: Math.abs(transaccionBanco.monto),
                    cuentaOrigenId: cuentaBancoId,
                    gastoId: gasto.id,
                    comentario: `Conciliado con movimiento bancario: ${transaccionBanco.descripcion}`
                };
                this.transacciones.push(pago);
    
                this.crearAsiento(transaccionBanco.fecha, `Pago Gasto #${gasto.id}`, [
                    { cuentaId: 210, debe: pago.monto, haber: 0 },
                    { cuentaId: cuentaBancoId, debe: 0, haber: pago.monto }
                ], pago.id);
    
                gasto.montoPagado = (gasto.montoPagado || 0) + pago.monto;
                if (gasto.montoPagado >= gasto.total - 0.01) {
                    gasto.estado = 'Pagado';
                } else {
                    gasto.estado = 'Parcial';
                }
    
                transaccionBanco.status = 'posted';
                transaccionBanco.categoriaNombre = `Match: Gasto #${gasto.id}`;
                transaccionBanco.asientoId = pago.id;
            }
        }
    
        this.saveAll();
        this.closeModal();
        this.irModulo('bancos', { cuentaIdFiltrada: cuentaBancoId });
        this.showToast('Match realizado y transacción registrada con éxito.', 'success');
    },

    async guardarTransferencia(e) {
        e.preventDefault();
        const origenId = parseInt(document.getElementById('transfer-origen').value);
        const destinoId = parseInt(document.getElementById('transfer-destino').value);
        const monto = parseFloat(document.getElementById('transfer-monto').value);
        const fecha = document.getElementById('transfer-fecha').value;

        if (origenId === destinoId) {
            this.showToast('La cuenta de origen y destino no pueden ser la misma.', 'error');
            return;
        }
        
        const origenCuenta = this.findById(this.planDeCuentas, origenId);
        const destinoCuenta = this.findById(this.planDeCuentas, destinoId);
        const descripcion = `Transferencia de ${origenCuenta.nombre} a ${destinoCuenta.nombre}`;

        const asiento = this.crearAsiento(fecha, descripcion, [
            { cuentaId: destinoId, debe: monto, haber: 0 },
            { cuentaId: origenId, debe: 0, haber: monto }
        ]);

        if (asiento) {
            this._registrarMovimientoBancarioPendiente(origenId, fecha, `Envío a ${destinoCuenta.nombre}`, -monto, asiento.id);
            this._registrarMovimientoBancarioPendiente(destinoId, fecha, `Recepción de ${origenCuenta.nombre}`, monto, asiento.id);
            
            await this.saveAll();
            this.closeModal();
            this.irModulo('bancos');
            this.showToast('Transferencia realizada con éxito.', 'success');
        }
    },

    abrirModalImportarBanco(cuentaId) {
        if (!cuentaId) {
            this.showToast('Por favor, crea o selecciona una cuenta bancaria primero.', 'error');
            return;
        }
        const cuenta = this.findById(this.planDeCuentas, cuentaId);
        const modalHTML = `
            <h3 class="conta-title mb-4">Importar Movimientos a: ${cuenta.nombre}</h3>
            <p class="text-[var(--color-text-secondary)] text-sm mb-6">
                Paso 1 de 2: Selecciona el archivo CSV descargado de tu banco.
            </p>
            <div>
                <input type="hidden" id="import-cuenta-id" value="${cuentaId}">
                <label for="import-csv-file" class="text-sm font-medium">Estado de Cuenta (.csv)</label>
                <input type="file" id="import-csv-file" class="w-full conta-input mt-1" accept=".csv" 
                       onchange="ContaApp.procesarArchivoParaMapeo(event)" required>
            </div>
            <div class="flex justify-end gap-2 mt-8">
                <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
            </div>
        `;
        this.showModal(modalHTML, '2xl');
    },

    procesarArchivoParaMapeo(event) {
        const fileInput = event.target;
        const file = fileInput.files[0];
        const cuentaId = parseInt(document.getElementById('import-cuenta-id').value);
    
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvText = e.target.result;
                const lineas = csvText.split('\n').filter(linea => linea.trim() !== '');
    
                if (lineas.length < 2) {
                    throw new Error('El archivo CSV está vacío o no tiene suficientes datos.');
                }
                
                const cabecera = lineas[0].split(',');
                const primerasFilas = lineas.slice(1, 4).map(fila => fila.split(',')); 
                
                this.tempCsvData = {
                    cuentaId: cuentaId,
                    csvText: csvText
                };
    
                this.abrirModalMapeoColumnas(cabecera, primerasFilas);
    
            } catch (error) {
                console.error("Error al procesar el archivo CSV:", error);
                this.showToast(error.message, 'error');
            }
        };
        reader.onerror = () => {
            this.showToast('Error al leer el archivo.', 'error');
        };
        reader.readAsText(file);
    },
    abrirModalMapeoColumnas(cabecera, primerasFilas) {
        const opcionesColumnas = cabecera.map((col, index) => 
            `<option value="${index}">${col.trim()} (Columna ${index + 1})</option>`
        ).join('');
    
        let tablaPreviewHTML = `<table class="w-full text-xs text-left my-4 border">
            <thead class="bg-[var(--color-bg-accent)]"><tr>`;
        cabecera.forEach(col => tablaPreviewHTML += `<th class="p-2 border-b">${col.trim()}</th>`);
        tablaPreviewHTML += `</tr></thead><tbody>`;
        primerasFilas.forEach(fila => {
            tablaPreviewHTML += `<tr>`;
            fila.forEach(celda => tablaPreviewHTML += `<td class="p-2 border-t">${celda.trim()}</td>`);
            tablaPreviewHTML += `</tr>`;
        });
        tablaPreviewHTML += `</tbody></table>`;
    
        const modalHTML = `
            <h3 class="conta-title mb-4">Mapear Columnas del CSV</h3>
            <p class="text-[var(--color-text-secondary)] text-sm mb-2">
                Paso 2 de 2: Indica qué columna de tu archivo corresponde a cada campo requerido.
            </p>
            ${tablaPreviewHTML}
    
            <form onsubmit="ContaApp.finalizarImportacionConMapeo(event)" class="space-y-4 modal-form">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label for="map-fecha">Columna de Fecha</label>
                        <select id="map-fecha" class="w-full conta-input mt-1" required>${opcionesColumnas}</select>
                    </div>
                    <div>
                        <label for="map-descripcion">Columna de Descripción</label>
                        <select id="map-descripcion" class="w-full conta-input mt-1" required>${opcionesColumnas}</select>
                    </div>
                    <div>
                        <label for="map-monto">Columna de Monto</label>
                        <select id="map-monto" class="w-full conta-input mt-1" required>${opcionesColumnas}</select>
                    </div>
                </div>
                <div class="flex justify-end gap-2 mt-8">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button type="submit" class="conta-btn">Procesar Archivo</button>
                </div>
            </form>
        `;
    
        this.showModal(modalHTML, '3xl');
    
        document.getElementById('map-fecha').value = cabecera.findIndex(c => c.toLowerCase().includes('fecha') || c.toLowerCase().includes('date'));
        document.getElementById('map-descripcion').value = cabecera.findIndex(c => c.toLowerCase().includes('descrip') || c.toLowerCase().includes('concept'));
        document.getElementById('map-monto').value = cabecera.findIndex(c => c.toLowerCase().includes('monto') || c.toLowerCase().includes('amount') || c.toLowerCase().includes('valor'));
    },
    finalizarImportacionConMapeo(event) {
        event.preventDefault();
        try {
            const fechaIndex = parseInt(document.getElementById('map-fecha').value);
            const descIndex = parseInt(document.getElementById('map-descripcion').value);
            const montoIndex = parseInt(document.getElementById('map-monto').value);
    
            const { cuentaId, csvText } = this.tempCsvData;
            if (!csvText) throw new Error("No se encontraron datos del archivo para procesar.");
    
            const lineas = csvText.split(/\r\n?|\n/).filter(linea => linea.trim() !== '');
            lineas.shift();
    
            const datosNuevos = lineas.map((linea, index) => {
                const columnas = (linea.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [])
                                 .map(col => col.trim().replace(/^"|"$/g, ''));
    
                if (columnas.length <= Math.max(fechaIndex, descIndex, montoIndex)) {
                    console.warn(`Omitiendo línea ${index + 2}: número de columnas incorrecto.`, linea);
                    return null;
                }
    
                const montoCrudo = columnas[montoIndex].replace(/[^0-9.-]+/g,"");
                const monto = parseFloat(montoCrudo);
                
                if (isNaN(monto)) {
                     console.warn(`Omitiendo línea ${index + 2}: monto no válido.`, linea);
                    return null;
                }
    
                return {
                    id: `banco-${cuentaId}-${Date.now()}-${index}`,
                    fecha: columnas[fechaIndex].replace(/"/g, ''),
                    descripcion: columnas[descIndex],
                    monto: monto,
                    status: 'pending'
                };
            }).filter(Boolean);
    
            if (datosNuevos.length === 0 && lineas.length > 0) {
                throw new Error("El mapeo no produjo transacciones válidas. Revisa las columnas seleccionadas y el formato del CSV.");
            }
    
            const transaccionesActuales = this.bancoImportado[cuentaId] || [];
            const transaccionesFiltradas = datosNuevos.filter(nueva => 
                !transaccionesActuales.some(existente => 
                    existente.fecha === nueva.fecha && 
                    existente.descripcion === nueva.descripcion && 
                    existente.monto === nueva.monto
                )
            );
    
            const totalEnArchivo = datosNuevos.length;
            const totalNuevas = transaccionesFiltradas.length;
            const totalOmitidas = totalEnArchivo - totalNuevas;
    
            let mensajeExito = `${totalNuevas} nueva(s) transaccion(es) importada(s).`;
            if (totalOmitidas > 0) {
                mensajeExito += ` ${totalOmitidas} fueron omitidas por ser duplicados.`;
            }
    
            this.bancoImportado[cuentaId] = [...transaccionesActuales, ...transaccionesFiltradas];
            delete this.tempCsvData; 
    
            this.saveAll();
            this.closeModal();
            this.showToast(mensajeExito, 'success');
            this.irModulo('bancos', { cuentaIdFiltrada: cuentaId });
    
        } catch (error) {
            console.error("Error al finalizar la importación:", error);
            this.showToast(error.message, 'error');
        }
    },
    abrirModalTransferencia() {
        const cuentasEfectivoOptions = this.planDeCuentas
            .filter(c => c.tipo === 'DETALLE' && c.parentId === 110)
            .map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');

        if (this.planDeCuentas.filter(c => c.tipo === 'DETALLE' && c.parentId === 110).length < 2) {
            this.showToast('Necesitas al menos dos cuentas de efectivo para realizar una transferencia.', 'error');
            return;
        }
        
        const modalHTML = `<h3 class="conta-title mb-4">Transferencia entre Cuentas</h3>
        <form onsubmit="ContaApp.guardarTransferencia(event)" class="space-y-4 modal-form">
            <div><label>Desde (Cuenta Origen)</label><select id="transfer-origen" class="w-full p-2 mt-1" required>${cuentasEfectivoOptions}</select></div>
            <div><label>Hacia (Cuenta Destino)</label><select id="transfer-destino" class="w-full p-2 mt-1" required>${cuentasEfectivoOptions}</select></div>
            <div><label>Monto</label><input type="number" step="0.01" min="0.01" id="transfer-monto" class="w-full p-2 mt-1" required></div>
            <div><label>Fecha</label><input type="date" id="transfer-fecha" value="${this.getTodayDate()}" class="w-full p-2 mt-1" required></div>
            <div class="flex justify-end gap-2 mt-6"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button type="submit" class="conta-btn">Confirmar Transferencia</button></div>
        </form>`;
        this.showModal(modalHTML, 'xl');
    },

    async guardarPagoTarjeta(e) {
        e.preventDefault();
        const origenId = parseInt(document.getElementById('pago-tarjeta-origen').value);
        const destinoId = parseInt(document.getElementById('pago-tarjeta-destino').value);
        const monto = parseFloat(document.getElementById('pago-tarjeta-monto').value);
        const fecha = document.getElementById('pago-tarjeta-fecha').value;
        const tarjetaCuenta = this.findById(this.planDeCuentas, destinoId);
        const bancoCuenta = this.findById(this.planDeCuentas, origenId);
        const descripcion = `Pago a Tarjeta de Crédito ${tarjetaCuenta.nombre}`;

        const nuevoAsiento = {
            id: this.idCounter, fecha: fecha,
            descripcion: descripcion,
            movimientos: [
                { cuentaId: destinoId, debe: monto, haber: 0 },
                { cuentaId: origenId, debe: 0, haber: monto }
            ]
        };
        const asientosCopia = [...this.asientos, nuevoAsiento];

        try {
            this._registrarMovimientoBancarioPendiente(origenId, fecha, `Pago a T.C. ${tarjetaCuenta.nombre}`, -monto, nuevoAsiento.id);
            this._registrarMovimientoBancarioPendiente(destinoId, fecha, `Pago recibido de ${bancoCuenta.nombre}`, monto, nuevoAsiento.id);
            
            await this.repository.actualizarMultiplesDatos({
                asientos: asientosCopia,
                idCounter: this.idCounter + 1,
                bancoImportado: this.bancoImportado
            });

            this.asientos.push(nuevoAsiento);
            this.idCounter++;
            this.actualizarSaldosGlobales();

            this.closeModal();
            this.irModulo('bancos');
            this.showToast('Pago de tarjeta registrado con éxito.', 'success');
        } catch (error) {
            console.error("Error al guardar pago de tarjeta:", error);
            this.showToast(`Error al guardar: ${error.message}`, 'error');
        }
    },
    exportarVistaBancoCSV(cuentaId, tabActiva) {
        if (!cuentaId) {
            this.showToast('No hay una cuenta seleccionada para exportar.', 'error');
            return;
        }
        const cuenta = this.findById(this.planDeCuentas, cuentaId);
        const transacciones = (this.bancoImportado[cuentaId] || []).filter(t => t.status === tabActiva);

        if (transacciones.length === 0) {
            this.showToast('No hay transacciones en esta vista para exportar.', 'info');
            return;
        }

        const dataParaExportar = transacciones.map(t => ({
            'Fecha': t.fecha,
            'Descripcion_Banco': t.descripcion,
            'Monto': t.monto,
            'Estado': t.status,
            'Categoria_ContaApp': t.categoriaNombre || 'N/A',
            'Asiento_ID_Relacionado': t.asientoId || 'N/A'
        }));

        const nombreArchivo = `banco_${cuenta.nombre}_${tabActiva}_${this.getTodayDate()}.csv`;
        this.exportarA_CSV(nombreArchivo, dataParaExportar);
    },
    iniciarProcesoDeConciliacion(event) {
    event.preventDefault();
    const cuentaId = parseInt(document.getElementById('conciliacion-cuenta').value);
    const fechaFin = document.getElementById('conciliacion-fecha-extracto').value;
    const saldoExtracto = parseFloat(document.getElementById('conciliacion-saldo-final-extracto').value);

    if (isNaN(saldoExtracto)) {
        this.showToast('El saldo final del extracto debe ser un número válido.', 'error');
        return;
    }

    this.closeModal();
    this.irModulo('bancos', {
        submodulo: 'conciliacion',
        cuentaId: cuentaId,
        fechaFin: fechaFin,
        saldoExtracto: saldoExtracto
    });
},

limpiarPendientesDeCuenta(cuentaId) {
    if (!cuentaId) return;

    this.showConfirm(
        '¿Seguro que deseas eliminar todas las transacciones pendientes de esta cuenta? Esta acción no se puede deshacer y es útil si quieres volver a importar un estado de cuenta desde cero.',
        () => {
            if (this.bancoImportado[cuentaId]) {
                this.bancoImportado[cuentaId] = this.bancoImportado[cuentaId].filter(t => t.status !== 'pending');
                this.saveAll();
                this.showToast('Transacciones pendientes eliminadas.', 'success');
                this.irModulo('bancos', { cuentaIdFiltrada: cuentaId });
            } else {
                this.showToast('No hay transacciones que limpiar.', 'info');
            }
        }
    );
},
abrirModalCrearDesdeBanco(transaccionId, cuentaId, tipo) {
    const transaccionBanco = this.bancoImportado[cuentaId].find(t => t.id === transaccionId);
    if (!transaccionBanco) return;

    const esGasto = tipo === 'gasto';
    const titulo = esGasto ? 'Crear Gasto desde Movimiento Bancario' : 'Crear Ingreso desde Movimiento Bancario';
    const codigoFiltro = esGasto ? '6' : '4'; // 6 para Gastos, 4 para Ingresos
    
    const cuentasOptions = this.planDeCuentas
        .filter(c => c.tipo === 'DETALLE' && c.codigo.startsWith(codigoFiltro))
        .sort((a, b) => a.codigo.localeCompare(b.codigo))
        .map(c => `<option value="${c.id}">${c.codigo} - ${c.nombre}</option>`)
        .join('');

    const modalHTML = `
        <h3 class="conta-title mb-4">${titulo}</h3>
        <div class="conta-card-accent mb-4">
            <div class="flex justify-between text-sm">
                <span>${transaccionBanco.fecha} - ${transaccionBanco.descripcion}</span>
                <span class="font-bold font-mono">${this.formatCurrency(transaccionBanco.monto)}</span>
            </div>
        </div>
        <form onsubmit="ContaApp.guardarTransaccionDesdeBanco(event, '${transaccionId}', ${cuentaId}, '${tipo}')" class="space-y-4 modal-form">
            <div>
                <label for="banco-contrapartida">Seleccionar Cuenta de ${esGasto ? 'Gasto' : 'Ingreso'}</label>
                <select id="banco-contrapartida" class="w-full conta-input mt-1" required>
                    <option value="">-- Elige una categoría --</option>
                    ${cuentasOptions}
                </select>
            </div>
            <div class="flex justify-end gap-2 mt-6">
                <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                <button type="submit" class="conta-btn">Confirmar y Conciliar</button>
            </div>
        </form>
    `;
    this.showModal(modalHTML, '2xl');
},

guardarTransaccionDesdeBanco(event, transaccionId, cuentaId, tipo) {
    event.preventDefault();
    const transaccionBanco = this.bancoImportado[cuentaId].find(t => t.id === transaccionId);
    const cuentaContrapartidaId = parseInt(document.getElementById('banco-contrapartida').value);

    if (!transaccionBanco || !cuentaContrapartidaId) {
        this.showToast('Faltan datos para procesar la transacción.', 'error');
        return;
    }

    const esGasto = tipo === 'gasto';
    const montoAbsoluto = Math.abs(transaccionBanco.monto);
    const cuentaContrapartida = this.findById(this.planDeCuentas, cuentaContrapartidaId);

    // Creamos el asiento contable
    const movimientos = esGasto
        ? [ // Gasto: DEBE a Gasto, HABER a Banco
            { cuentaId: cuentaContrapartidaId, debe: montoAbsoluto, haber: 0 },
            { cuentaId: cuentaId, debe: 0, haber: montoAbsoluto }
        ]
        : [ // Ingreso: DEBE a Banco, HABER a Ingreso
            { cuentaId: cuentaId, debe: montoAbsoluto, haber: 0 },
            { cuentaId: cuentaContrapartidaId, debe: 0, haber: montoAbsoluto }
        ];

    const asiento = this.crearAsiento(transaccionBanco.fecha, `Conciliado: ${transaccionBanco.descripcion}`, movimientos);
    
    if (asiento) {
        if (esGasto) {
            const nuevoGasto = {
                id: this.idCounter++,
                tipo: 'gasto',
                fecha: transaccionBanco.fecha,
                descripcion: transaccionBanco.descripcion,
                total: montoAbsoluto,
                estado: 'Pagado',
                items: [{ cuentaId: cuentaContrapartidaId, monto: montoAbsoluto }],
                montoPagado: montoAbsoluto
            };
            this.transacciones.push(nuevoGasto);
            asiento.transaccionId = nuevoGasto.id; 
        }
        
        transaccionBanco.status = 'posted';
        transaccionBanco.asientoId = asiento.id;
        transaccionBanco.categoriaNombre = cuentaContrapartida.nombre;
        
        this.saveAll();
        this.closeModal();
        this.irModulo('bancos', { cuentaIdFiltrada: cuentaId });
        this.showToast('Transacción registrada y conciliada con éxito.', 'success');
    }
},

});