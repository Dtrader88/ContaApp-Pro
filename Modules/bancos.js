// Archivo: modules/bancos.js

Object.assign(ContaApp, {

    // Módulo Bancos
       renderBancosYTarjetas(params = {}) {
    if (params.submodulo === 'conciliacion') {
        this.renderConciliacionBancaria(params);
        return;
    }
    
    this.actualizarSaldosGlobales();
    const cuentasBancarias = this.planDeCuentas.filter(c => c.tipo === 'DETALLE' && c.parentId === 110).sort((a,b) => a.nombre.localeCompare(b.nombre));
    const cuentasTarjeta = this.planDeCuentas.filter(c => c.tipo === 'DETALLE' && c.parentId === 230).sort((a,b) => a.nombre.localeCompare(b.nombre));
    const todasLasCuentas = [...cuentasBancarias, ...cuentasTarjeta];
    
    let cuentaIdSeleccionada = params.cuentaIdFiltrada || (cuentasBancarias.length > 0 ? cuentasBancarias[0].id : (cuentasTarjeta.length > 0 ? cuentasTarjeta[0].id : null));
    const tabActiva = params.tab || 'pending';

    document.getElementById('page-actions-header').innerHTML = `
        <div class="flex gap-2 flex-wrap">
            <button class="conta-btn" onclick="ContaApp.abrirModalTransferencia()"><i class="fa-solid fa-exchange-alt me-2"></i>Nueva Transferencia</button>
            <button class="conta-btn" onclick="ContaApp.abrirModalPagoTarjeta()"><i class="fa-solid fa-credit-card me-2"></i>Pagar Tarjeta</button>
            <button class="conta-btn conta-btn-accent" onclick="ContaApp.abrirModalImportarBanco(${cuentaIdSeleccionada})"><i class="fa-solid fa-upload me-2"></i>Importar Movimientos</button>
            <button class="conta-btn conta-btn-accent" onclick="ContaApp.abrirModalIniciarConciliacion()"><i class="fa-solid fa-check-double me-2"></i>Reconciliar Cuenta</button>
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
            filasHTML = `<tr><td colspan="6" class="text-center p-8 text-[var(--color-text-secondary)]">No hay transacciones en esta vista.</td></tr>`;
        } else {
            transaccionesCuenta.forEach(t => {
                const montoClass = t.monto >= 0 ? 'conta-text-success' : 'conta-text-danger';
                
                // --- INICIO DE LA MEJORA: Botones de Acción Condicionales ---
                let accionesHTML = '';
                if (tabActiva === 'pending') {
                    // Si el monto es negativo, es un Gasto. Si es positivo, es un Ingreso.
                    const botonPrincipal = t.monto < 0
                        ? `<button class="conta-btn conta-btn-small conta-btn-danger" onclick="ContaApp.abrirModalCrearDesdeBanco('${t.id}', ${cuentaIdSeleccionada}, 'gasto')">Crear Gasto</button>`
                        : `<button class="conta-btn conta-btn-small conta-btn-success" onclick="ContaApp.abrirModalCrearDesdeBanco('${t.id}', ${cuentaIdSeleccionada}, 'ingreso')">Crear Ingreso</button>`;

                    accionesHTML = `<div class="flex gap-2 justify-center">
                        ${botonPrincipal}
                        <button class="conta-btn conta-btn-small conta-btn-accent" onclick="ContaApp.abrirModalMatch('${t.id}', ${cuentaIdSeleccionada})">Match</button>
                        <button class="conta-btn conta-btn-small" onclick="ContaApp.excluirTransaccionBanco('${t.id}', ${cuentaIdSeleccionada})">Excluir</button>
                    </div>`;
                } else {
                    accionesHTML = t.status === 'posted' ? `Conciliada (Asiento #${t.asientoId})` : 'Excluida';
                }
                // --- FIN DE LA MEJORA ---

                filasHTML += `<tr id="banco-trans-${t.id}">
                    <td class="conta-table-td"><input type="checkbox"></td> 
                    <td class="conta-table-td">${t.fecha}</td> 
                    <td class="conta-table-td">${t.descripcion}</td>
                    <td class="conta-table-td text-right font-mono ${montoClass}">${this.formatCurrency(t.monto)}</td>
                    <td class="conta-table-td text-center">${accionesHTML}</td>
                </tr>`;
            });
        }

        tablaHTML = `<div class="mt-6">
            <div class="flex border-b border-[var(--color-border-accent)]">
                <button class="py-2 px-4 text-sm font-semibold ${tabActiva === 'pending' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('bancos', { cuentaIdFiltrada: ${cuentaIdSeleccionada}, tab: 'pending'})">Pendientes</button>
                <button class="py-2 px-4 text-sm font-semibold ${tabActiva === 'posted' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('bancos', { cuentaIdFiltrada: ${cuentaIdSeleccionada}, tab: 'posted'})">Conciliadas</button>
                <button class="py-2 px-4 text-sm font-semibold ${tabActiva === 'excluded' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('bancos', { cuentaIdFiltrada: ${cuentaIdSeleccionada}, tab: 'excluded'})">Excluidas</button>
            </div>
            <div class="conta-card rounded-t-none border-t-0 overflow-auto">
                <table class="min-w-full text-sm conta-table-zebra">
                    <thead><tr>
                        <th class="conta-table-th"><input type="checkbox"></th>
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
abrirModalIniciarConciliacion() {
    const cuentasBancariasOptions = this.planDeCuentas
        .filter(c => c.tipo === 'DETALLE' && c.parentId === 110) // Solo cuentas de banco
        .map(c => `<option value="${c.id}">${c.nombre}</option>`)
        .join('');

    if (!cuentasBancariasOptions) {
        this.showToast('No hay cuentas bancarias para reconciliar.', 'error');
        return;
    }

    const modalHTML = `
        <h3 class="conta-title mb-4">Iniciar Conciliación Bancaria</h3>
        <form onsubmit="ContaApp.iniciarProcesoDeConciliacion(event)" class="space-y-4 modal-form">
            <div>
                <label for="conciliacion-cuenta">Cuenta Bancaria</label>
                <select id="conciliacion-cuenta" class="w-full conta-input mt-1" required>
                    ${cuentasBancariasOptions}
                </select>
            </div>
            <div>
                <label for="conciliacion-fecha-extracto">Fecha de Cierre del Extracto</label>
                <input type="date" id="conciliacion-fecha-extracto" value="${this.getTodayDate()}" class="w-full conta-input mt-1" required>
            </div>
            <div>
                <label for="conciliacion-saldo-final-extracto">Saldo Final según Extracto</label>
                <input type="number" step="0.01" id="conciliacion-saldo-final-extracto" class="w-full conta-input mt-1" required placeholder="0.00">
            </div>
            <div class="flex justify-end gap-2 mt-6">
                <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                <button type="submit" class="conta-btn">Iniciar</button>
            </div>
        </form>
    `;
    this.showModal(modalHTML, 'xl');
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
        // Si el monto es positivo, es un ingreso. El banco (activo) aumenta por el DEBE.
        // Si el monto es negativo, es un egreso. El banco (activo) disminuye por el HABER.
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

    // CASO 1: Es una salida de dinero (pago desde banco O cargo a tarjeta)
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

    // Lógica de respaldo: Buscar asientos manuales genéricos
    const fechaTransaccion = new Date(transaccionBanco.fecha);
    const fechaLimiteInferior = new Date(fechaTransaccion.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const fechaLimiteSuperior = new Date(fechaTransaccion.getTime() + 30 * 86400000).toISOString().slice(0, 10);

    this.asientos.filter(a => {
        // --- INICIO DE LA LÓGICA CORREGIDA ---
        const esSaldoInicial = a.descripcion.toLowerCase().includes('saldo inicial');
        return !a.esConciliado && !esSaldoInicial && // Ignorar saldos iniciales
               a.fecha >= fechaLimiteInferior && a.fecha <= fechaLimiteSuperior &&
               a.movimientos.some(m => m.cuentaId === cuentaId && (Math.abs(m.debe - montoAbsoluto) < 0.01 || Math.abs(m.haber - montoAbsoluto) < 0.01));
        // --- FIN DE LA LÓGICA CORREGIDA ---
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
        // Lógica original para asientos genéricos
        const asiento = this.findById(this.asientos, parseInt(id));
        if (asiento) {
            asiento.esConciliado = true; // Marcamos el asiento como conciliado
            transaccionBanco.status = 'posted';
            transaccionBanco.categoriaNombre = `Match: Asiento #${asiento.id}`;
            transaccionBanco.asientoId = asiento.id;
        }
    } else if (tipoMatch === 'gasto') {
        // Nueva lógica para facturas de gastos
        const gasto = this.findById(this.transacciones, parseInt(id));
        if (gasto) {
            // Creamos una nueva transacción de tipo "pago_proveedor" para saldar la cuenta
            const pago = {
                id: this.idCounter++,
                tipo: 'pago_proveedor',
                fecha: transaccionBanco.fecha,
                contactoId: gasto.contactoId,
                monto: Math.abs(transaccionBanco.monto),
                cuentaOrigenId: cuentaBancoId, // La cuenta que estamos conciliando
                gastoId: gasto.id,
                comentario: `Conciliado con movimiento bancario: ${transaccionBanco.descripcion}`
            };
            this.transacciones.push(pago);

            // Creamos el asiento contable correspondiente al pago
            this.crearAsiento(transaccionBanco.fecha, `Pago Gasto #${gasto.id}`, [
                { cuentaId: 210, debe: pago.monto, haber: 0 }, // Cuentas por Pagar (DEBE)
                { cuentaId: cuentaBancoId, debe: 0, haber: pago.monto } // Banco (HABER)
            ], pago.id);

            // Actualizamos el estado del gasto original
            gasto.montoPagado = (gasto.montoPagado || 0) + pago.monto;
            if (gasto.montoPagado >= gasto.total - 0.01) {
                gasto.estado = 'Pagado';
            } else {
                gasto.estado = 'Parcial';
            }

            // Marcamos la transacción del banco como posteada
            transaccionBanco.status = 'posted';
            transaccionBanco.categoriaNombre = `Match: Gasto #${gasto.id}`;
            transaccionBanco.asientoId = pago.id; // Vinculamos al nuevo asiento de pago
        }
    }

    this.saveAll();
    this.closeModal();
    this.irModulo('bancos', { cuentaIdFiltrada: cuentaBancoId });
    this.showToast('Match realizado y transacción registrada con éxito.', 'success');
},
    iniciarCargaConciliacion(event) {
        event.preventDefault();
        const cuentaId = parseInt(document.getElementById('conciliacion-cuenta-id').value);
        const fileInput = document.getElementById('conciliacion-csv-file');
        const file = fileInput.files[0];

        if (!file) {
            this.showToast('Por favor, selecciona un archivo CSV.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.procesarCSVConciliacion(e.target.result, cuentaId);
            } catch (error) {
                console.error("Error al procesar el archivo CSV:", error);
                this.showToast(error.message || 'El formato del CSV es incorrecto.', 'error');
            }
        };
        reader.onerror = () => {
            this.showToast('Error al leer el archivo.', 'error');
        };
        reader.readAsText(file);
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

        // --- INICIO DE LA REFACTORIZACIÓN ---
        // 1. Preparamos el nuevo asiento.
        const nuevoAsiento = { 
            id: this.idCounter, fecha: fecha, 
            descripcion: `Transferencia de ${origenCuenta.nombre} a ${destinoCuenta.nombre}`,
            movimientos: [
                { cuentaId: destinoId, debe: monto, haber: 0 },
                { cuentaId: origenId, debe: 0, haber: monto }
            ]
        };
        const asientosCopia = [...this.asientos, nuevoAsiento];

        try {
            // 2. Intentamos guardar en el repositorio PRIMERO.
            await this.repository.actualizarMultiplesDatos({
                asientos: asientosCopia,
                idCounter: this.idCounter + 1
            });
            
            // 3. SOLO SI tiene éxito, actualizamos el estado local.
            this.asientos.push(nuevoAsiento);
            this.idCounter++;
            this.actualizarSaldosGlobales();

            this.closeModal();
            this.irModulo('bancos');
            this.showToast('Transferencia realizada con éxito.', 'success');
        } catch (error) {
            console.error("Error al guardar transferencia:", error);
            this.showToast(`Error al guardar: ${error.message}`, 'error');
        }
        // --- FIN DE LA REFACTORIZACIÓN ---
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
            
            // Guardamos el texto completo del CSV en una propiedad temporal para usarlo después
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
    // Crear opciones para los <select>
    const opcionesColumnas = cabecera.map((col, index) => 
        `<option value="${index}">${col.trim()} (Columna ${index + 1})</option>`
    ).join('');

    // Crear una vista previa de la tabla para el usuario
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

    // Intentar pre-seleccionar columnas comunes
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

        // --- LÓGICA DEL MENSAJE MEJORADA ---
        const totalEnArchivo = datosNuevos.length;
        const totalNuevas = transaccionesFiltradas.length;
        const totalOmitidas = totalEnArchivo - totalNuevas;

        let mensajeExito = `${totalNuevas} nueva(s) transaccion(es) importada(s).`;
        if (totalOmitidas > 0) {
            mensajeExito += ` ${totalOmitidas} fueron omitidas por ser duplicados.`;
        }
        // --- FIN DE LA LÓGICA DEL MENSAJE ---

        this.bancoImportado[cuentaId] = [...transaccionesActuales, ...transaccionesFiltradas];
        delete this.tempCsvData; 

        this.saveAll();
        this.closeModal();
        this.showToast(mensajeExito, 'success'); // Usamos el nuevo mensaje
        this.irModulo('bancos', { cuentaIdFiltrada: cuentaId });

    } catch (error) {
        console.error("Error al finalizar la importación:", error);
        this.showToast(error.message, 'error');
    }
},
    abrirModalTransferencia() {
        const cuentasEfectivoOptions = this.planDeCuentas
            .filter(c => c.tipo === 'DETALLE' && c.parentId === 110) // Solo cuentas de "Efectivo y Equivalentes"
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

    guardarTransferencia(e) {
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

        const asiento = this.crearAsiento(fecha, `Transferencia de ${origenCuenta.nombre} a ${destinoCuenta.nombre}`, [
            { cuentaId: destinoId, debe: monto, haber: 0 },
            { cuentaId: origenId, debe: 0, haber: monto }
        ]);

        if (asiento) {
            this.saveAll();
            this.closeModal();
            this.irModulo('bancos');
            this.showToast('Transferencia realizada con éxito.', 'success');
        }
    },

    abrirModalPagoTarjeta() {
        const cuentasBancoOptions = this.planDeCuentas
            .filter(c => c.tipo === 'DETALLE' && c.parentId === 110)
            .map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        const cuentasTarjetaOptions = this.planDeCuentas
            .filter(c => c.tipo === 'DETALLE' && c.parentId === 230)
            .map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');

        if (!cuentasBancoOptions || !cuentasTarjetaOptions) {
            this.showToast('Necesitas al menos una cuenta de banco y una tarjeta de crédito.', 'error');
            return;
        }
        
        const modalHTML = `<h3 class="conta-title mb-4">Pagar Tarjeta de Crédito</h3>
        <form onsubmit="ContaApp.guardarPagoTarjeta(event)" class="space-y-4 modal-form">
            <div><label>Pagar desde (Cuenta de Banco)</label><select id="pago-tarjeta-origen" class="w-full p-2 mt-1" required>${cuentasBancoOptions}</select></div>
            <div><label>Pagar a (Tarjeta de Crédito)</label><select id="pago-tarjeta-destino" class="w-full p-2 mt-1" required>${cuentasTarjetaOptions}</select></div>
            <div><label>Monto</label><input type="number" step="0.01" min="0.01" id="pago-tarjeta-monto" class="w-full p-2 mt-1" required></div>
            <div><label>Fecha</label><input type="date" id="pago-tarjeta-fecha" value="${this.getTodayDate()}" class="w-full p-2 mt-1" required></div>
            <div class="flex justify-end gap-2 mt-6"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button type="submit" class="conta-btn">Confirmar Pago</button></div>
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

        // --- INICIO DE LA REFACTORIZACIÓN ---
        const nuevoAsiento = {
            id: this.idCounter, fecha: fecha,
            descripcion: `Pago a Tarjeta de Crédito ${tarjetaCuenta.nombre}`,
            movimientos: [
                { cuentaId: destinoId, debe: monto, haber: 0 },
                { cuentaId: origenId, debe: 0, haber: monto }
            ]
        };
        const asientosCopia = [...this.asientos, nuevoAsiento];

        try {
            await this.repository.actualizarMultiplesDatos({
                asientos: asientosCopia,
                idCounter: this.idCounter + 1
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
        // --- FIN DE LA REFACTORIZACIÓN ---
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

renderConciliacionBancaria(params) {
    const { cuentaId, fechaFin, saldoExtracto } = params;
    const cuenta = this.findById(this.planDeCuentas, cuentaId);

    document.getElementById('page-title-header').innerText = `Conciliación: ${cuenta.nombre}`;
    document.getElementById('page-actions-header').innerHTML = `
        <button class="conta-btn conta-btn-danger" onclick="ContaApp.irModulo('bancos')">
            <i class="fa-solid fa-times me-2"></i>Cancelar Conciliación
        </button>
    `;

    const saldoEnLibros = this.getSaldosPorPeriodo(fechaFin).find(c => c.id === cuentaId)?.saldo || 0;
    
    // --- CAMBIO 1: AÑADIMOS EL ÍNDICE DEL MOVIMIENTO ---
    const movimientosPendientes = this.asientos
        .flatMap(a => a.movimientos.map((m, index) => ({ ...m, asiento: a, movIndex: index })))
        .filter(m => m.cuentaId === cuentaId && !m.reconciliacionId && m.asiento.fecha <= fechaFin);

    const chequesYPagos = movimientosPendientes.filter(m => m.haber > 0);
    const depositosYCreditos = movimientosPendientes.filter(m => m.debe > 0);

    const totalDebitosPendientes = chequesYPagos.reduce((sum, mov) => sum + mov.haber, 0);
    const totalCreditosPendientes = depositosYCreditos.reduce((sum, mov) => sum + mov.debe, 0);

    const renderTablaMovimientos = (titulo, movimientos, tipo) => {
        let filas = '';
        if (movimientos.length > 0) {
            filas = movimientos.map(mov => {
                const monto = tipo === 'credito' ? mov.debe : -mov.haber;
                return `
                <tr class="border-t">
                    <!-- --- CAMBIO 2: AÑADIMOS IDENTIFICADORES MÁS PRECISOS --- -->
                    <td class="p-2"><input type="checkbox" class="conciliacion-check" data-asiento-id="${mov.asiento.id}" data-mov-index="${mov.movIndex}" data-monto="${monto}" onchange="ContaApp.actualizarResumenConciliacion()"></td>
                    <td class="p-2">${mov.asiento.fecha}</td>
                    <td class="p-2">${mov.asiento.descripcion}</td>
                    <td class="p-2 text-right font-mono">${this.formatCurrency(mov.debe || mov.haber)}</td>
                </tr>
            `}).join('');
        } else {
            filas = '<tr><td colspan="4" class="p-4 text-center text-[var(--color-text-secondary)]">No hay transacciones pendientes en esta categoría.</td></tr>';
        }
        return `
            <div class="conta-card">
                <h4 class="conta-subtitle !border-b-2 !border-[var(--color-primary)]">${titulo}</h4>
                <div class="max-h-80 overflow-y-auto">
                    <table class="w-full text-sm">
                        <thead><tr>
                            <th class="p-2 w-10"></th>
                            <th class="p-2 text-left">Fecha</th>
                            <th class="p-2 text-left">Descripción</th>
                            <th class="p-2 text-right">Monto</th>
                        </tr></thead>
                        <tbody>${filas}</tbody>
                    </table>
                </div>
            </div>
        `;
    };
    
    const html = `
        <div id="conciliacion-container" 
             data-cuenta-id="${cuentaId}"
             data-fecha-fin="${fechaFin}"
             data-saldo-extracto="${saldoExtracto}" 
             data-saldo-libros="${saldoEnLibros}"
             data-total-debitos-pendientes="${totalDebitosPendientes}"
             data-total-creditos-pendientes="${totalCreditosPendientes}">
            <div class="conta-card mb-6" id="conciliacion-resumen">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <div>
                        <div class="text-sm text-[var(--color-text-secondary)]">Saldo Extracto Bancario</div>
                        <p class="font-bold text-lg" id="resumen-saldo-extracto">${this.formatCurrency(saldoExtracto)}</p>
                    </div>
                    <div>
                        <div class="text-sm text-[var(--color-text-secondary)]">Pagos y Débitos Conciliados</div>
                        <p class="font-bold text-lg" id="resumen-debitos-conciliados">${this.formatCurrency(0)}</p>
                    </div>
                    <div>
                        <div class="text-sm text-[var(--color-text-secondary)]">Depósitos y Créditos Conciliados</div>
                        <p class="font-bold text-lg" id="resumen-creditos-conciliados">${this.formatCurrency(0)}</p>
                    </div>
                    <div>
                        <div class="text-sm text-[var(--color-text-secondary)]">Saldo en Libros</div>
                        <p class="font-bold text-lg" id="resumen-saldo-libros">${this.formatCurrency(saldoEnLibros)}</p>
                    </div>
                </div>
                <div class="mt-4 pt-4 border-t-2 border-dashed flex justify-between items-center">
                    <button class="conta-btn conta-btn-success" id="btn-finalizar-conciliacion" onclick="ContaApp.finalizarConciliacion()" disabled>Finalizar Conciliación</button>
                    <div>
                        <span class="text-sm font-semibold">Diferencia:</span>
                        <span class="font-bold text-xl ml-2" id="resumen-diferencia">${this.formatCurrency(saldoEnLibros - saldoExtracto)}</span>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                ${renderTablaMovimientos('Cheques, Pagos y otros Débitos', chequesYPagos, 'debito')}
                ${renderTablaMovimientos('Depósitos, Créditos y otras Entradas', depositosYCreditos, 'credito')}
            </div>
        </div>
    `;
    
    document.getElementById('bancos').innerHTML = html;
    this.actualizarResumenConciliacion();
},
actualizarResumenConciliacion() {
    const container = document.getElementById('conciliacion-container');
    if (!container) return;

    // Leer los valores base guardados en el contenedor
    const saldoExtracto = parseFloat(container.dataset.saldoExtracto);
    const saldoEnLibros = parseFloat(container.dataset.saldoLibros);
    const totalDebitosPendientes = parseFloat(container.dataset.totalDebitosPendientes);
    const totalCreditosPendientes = parseFloat(container.dataset.totalCreditosPendientes);

    let creditosMarcados = 0;
    let debitosMarcados = 0;

    // Sumar los montos de los items que el usuario ha marcado
    document.querySelectorAll('.conciliacion-check:checked').forEach(checkbox => {
        const monto = parseFloat(checkbox.dataset.monto);
        if (monto > 0) {
            creditosMarcados += monto;
        } else {
            debitosMarcados += Math.abs(monto);
        }
    });

    // Calcular los items que NO están marcados (los que realmente están pendientes)
    const creditosNoConciliados = totalCreditosPendientes - creditosMarcados;
    const debitosNoConciliados = totalDebitosPendientes - debitosMarcados;

    // La fórmula correcta: El saldo en libros ajustado por los items pendientes debe ser igual al saldo del extracto
    const saldoLibrosAjustado = saldoEnLibros - debitosNoConciliados + creditosNoConciliados;
    const diferencia = saldoLibrosAjustado - saldoExtracto;

    // Actualizar la UI
    document.getElementById('resumen-creditos-conciliados').textContent = this.formatCurrency(creditosMarcados);
    document.getElementById('resumen-debitos-conciliados').textContent = this.formatCurrency(debitosMarcados);
    
    const diferenciaEl = document.getElementById('resumen-diferencia');
    diferenciaEl.textContent = this.formatCurrency(diferencia);

    const btnFinalizar = document.getElementById('btn-finalizar-conciliacion');

    // La conciliación está lista cuando la diferencia es cero
    if (Math.abs(diferencia) < 0.01) {
        diferenciaEl.className = 'font-bold text-xl ml-2 conta-text-success';
        btnFinalizar.disabled = false;
    } else {
        diferenciaEl.className = 'font-bold text-xl ml-2 conta-text-danger';
        btnFinalizar.disabled = true;
    }
},
finalizarConciliacion() {
    const container = document.getElementById('conciliacion-container');
    if (!container) return;

    const fechaFin = container.dataset.fechaFin;
    const cuentaId = parseInt(container.dataset.cuentaId);
    const btnFinalizar = document.getElementById('btn-finalizar-conciliacion');

    if (btnFinalizar.disabled) {
        this.showToast('La diferencia debe ser cero para poder finalizar.', 'error');
        return;
    }

    this.showConfirm(
        `¿Está seguro de que desea finalizar la conciliación para esta cuenta al ${fechaFin}? Las transacciones marcadas se considerarán conciliadas y no aparecerán en futuras conciliaciones.`,
        () => {
            const reconciliacionId = `REC-${cuentaId}-${Date.now()}`;
            const checkboxesMarcados = document.querySelectorAll('.conciliacion-check:checked');
            let movimientosMarcados = 0;

            checkboxesMarcados.forEach(checkbox => {
                const asientoId = parseInt(checkbox.dataset.asientoId);
                const movIndex = parseInt(checkbox.dataset.movIndex);

                const asiento = this.findById(this.asientos, asientoId);
                if (asiento && asiento.movimientos[movIndex]) {
                    // Marcamos el movimiento específico como conciliado
                    asiento.movimientos[movIndex].reconciliacionId = reconciliacionId;
                    movimientosMarcados++;
                }
            });

            this.saveAll();
            this.showToast(`${movimientosMarcados} transacciones han sido conciliadas con éxito.`, 'success');
            this.irModulo('bancos'); // Volver a la vista principal de bancos
        }
    );
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
    const codigoFiltro = esGasto ? '5' : '4'; // 5 para Gastos, 4 para Ingresos
    
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
        // Si es un gasto, también creamos una transacción de 'gasto' para consistencia en los reportes de gastos
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
            asiento.transaccionId = nuevoGasto.id; // Vinculamos el asiento al nuevo gasto
        }
        
        // Actualizamos el estado de la transacción importada
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