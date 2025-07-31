const ContaApp = {
    // Propiedades del estado de la aplicación
    repository: null, 
    empresa: {},
    idCounter: 1000,
    navigationHistory: [],
    isFormDirty: false,
    moduleFilters: {},
    planDeCuentas: [],
    asientos: [],
    transacciones: [],
    contactos: [],
    productos: [],
    recurrentes: [],
    activosFijos: [],
    listasMateriales: [],
    ordenesProduccion: [],
    unidadesMedida: [],
    tempItemsParaVenta: [],
    bancoImportado: {},
    paginationState: {},
    
    // --- LÍNEA AÑADIDA PARA SOLUCIONAR EL ERROR ---
    aperturaData: {
        currentStep: 1,
        empresa: {},
        fechaApertura: '',
        bancos: [],
        inventario: [],
        cxc: [],
        cxp: [],
        tarjetas: [],
        anticipos: []
    },
    // --- FIN DE LA LÍNEA AÑADIDA ---

    charts: { financialPerformance: null, topExpenses: null, cxcPie: null },
    themes: ['fresco', 'infinito'],
    ventasSortState: {
        column: 'fecha',
        order: 'desc'
    },  

            // Inicialización de la aplicación
    // Inicialización de la aplicación
            async init(repository, userProfile) { 
    this.repository = repository;
    this.currentUser = userProfile;

    this.initTheme();
    this.initGlobalSearch();

    const dataString = await this.repository.loadAll();

    this.loadAll(dataString); 

    // --- INICIO DE LA CORRECCIÓN ---
    // Esta sección asignará una categoría por defecto a los productos que no la tengan.
    let seHicieronCambios = false;
    this.productos.forEach(producto => {
        // Si un producto no tiene categoría de inventario...
        if (!producto.cuentaInventarioId && producto.tipo === 'producto') {
            // ...le asignamos "Productos para Reventa" (ID 13001) por defecto.
            producto.cuentaInventarioId = 13001; 
            seHicieronCambios = true;
        }
    });

    // Si actualizamos algún producto, guardamos los cambios para que sea permanente.
    if (seHicieronCambios) {
        console.log("Actualizando productos antiguos con categoría de inventario por defecto...");
        this.saveAll();
    }
    // --- FIN DE LA CORRECCIÓN ---

    // El resto de la función continúa igual.
    if (!dataString || Object.keys(JSON.parse(dataString)).length === 0) {
        this.abrirAsistenteApertura();
    } else {
        this.actualizarSaldosGlobales();
        this.actualizarPerfilEmpresa();
        // --- CAMBIO CLAVE AQUÍ ---
        // Le decimos a la función init que "espere" a que el módulo del dashboard se cargue.
        await this.irModulo('dashboard');
    }
},

      
    // === ASISTENTE DE APERTURA MEJORADO ===
    abrirAsistenteApertura() {
        this.aperturaData.currentStep = 1; // Reiniciar el paso
        const today = this.getTodayDate();
        const modalHTML = `
            <div class="modal-form">
                <div id="wizard-container">
                    <div class="wizard-progress-bar">
                        <div id="step-indicator-1" class="wizard-progress-step active"><div class="step-circle">1</div><div class="step-label">Empresa</div></div>
                        <div id="step-indicator-2" class="wizard-progress-step"><div class="step-circle">2</div><div class="step-label">Bancos</div></div>
                        <div id="step-indicator-3" class="wizard-progress-step"><div class="step-circle">3</div><div class="step-label">Inventario</div></div>
                        <div id="step-indicator-4" class="wizard-progress-step"><div class="step-circle">4</div><div class="step-label">CxC</div></div>
                        <div id="step-indicator-5" class="wizard-progress-step"><div class="step-circle">5</div><div class="step-label">Tarjetas</div></div>
                        <div id="step-indicator-6" class="wizard-progress-step"><div class="step-circle">6</div><div class="step-label">Anticipos</div></div>
                        <div id="step-indicator-7" class="wizard-progress-step"><div class="step-circle">7</div><div class="step-label">CxP</div></div>
                        <div id="step-indicator-8" class="wizard-progress-step"><div class="step-circle">✓</div><div class="step-label">Resumen</div></div>
                    </div>

                    <!-- Paso 1: Empresa -->
                    <div id="wizard-step-1" class="wizard-step active">
                        <h3 class="conta-title text-center">¡Bienvenido a ContaApp Pro!</h3>
                        <p class="text-[var(--color-text-secondary)] mb-6 text-center">Comencemos configurando tu empresa y la fecha de inicio de tus operaciones en el sistema.</p>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label>Nombre de la Empresa</label><input type="text" id="apertura-nombre-empresa" class="w-full p-2 mt-1" required></div>
                            <div><label>Fecha de Apertura</label><input type="date" id="apertura-fecha" value="${today}" class="w-full p-2 mt-1" required></div>
                        </div>
                    </div>

                    <!-- Paso 2: Bancos -->
                    <div id="wizard-step-2" class="wizard-step">
                        <h3 class="conta-title text-center">Saldos Bancarios Iniciales</h3>
                        <p class="text-[var(--color-text-secondary)] mb-6 text-center">Añade cada una de tus cuentas bancarias con su saldo a la fecha de apertura.</p>
                        <div id="apertura-bancos-container" class="space-y-2 mb-4 max-h-64 overflow-y-auto p-2"></div>
                        <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.agregarFilaApertura('banco')">+ Añadir Banco</button>
                    </div>

                    <!-- Paso 3: Inventario -->
                    <div id="wizard-step-3" class="wizard-step">
                        <h3 class="conta-title text-center">Inventario Inicial</h3>
                        <p class="text-[var(--color-text-secondary)] mb-6 text-center">Registra cada producto o servicio con su costo y stock inicial.</p>
                        <div id="apertura-inventario-container" class="space-y-3 mb-4 max-h-64 overflow-y-auto p-2"></div>
                        <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.agregarFilaApertura('inventario')">+ Añadir Producto/Servicio</button>
                    </div>

                    <!-- Paso 4: Cuentas por Cobrar -->
                    <div id="wizard-step-4" class="wizard-step">
                        <h3 class="conta-title text-center">Cuentas por Cobrar Iniciales</h3>
                        <p class="text-[var(--color-text-secondary)] mb-6 text-center">Registra las facturas que tus clientes te deben.</p>
                        <div id="apertura-cxc-container" class="space-y-3 mb-4 max-h-64 overflow-y-auto p-2"></div>
                        <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.agregarFilaApertura('cxc')">+ Añadir Factura por Cobrar</button>
                    </div>

                    <!-- NUEVO Paso 5: Tarjetas de Crédito -->
                    <div id="wizard-step-5" class="wizard-step">
                        <h3 class="conta-title text-center">Saldos de Tarjetas de Crédito</h3>
                        <p class="text-[var(--color-text-secondary)] mb-6 text-center">Añade cada una de tus tarjetas con su saldo deudor a la fecha de apertura.</p>
                        <div id="apertura-tarjetas-container" class="space-y-2 mb-4 max-h-64 overflow-y-auto p-2"></div>
                        <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.agregarFilaApertura('tarjeta')">+ Añadir Tarjeta</button>
                    </div>

                    <!-- NUEVO Paso 6: Anticipos de Clientes -->
                    <div id="wizard-step-6" class="wizard-step">
                        <h3 class="conta-title text-center">Anticipos de Clientes Iniciales</h3>
                        <p class="text-[var(--color-text-secondary)] mb-6 text-center">Registra los anticipos que has recibido de tus clientes y que aún no has aplicado a facturas.</p>
                        <div id="apertura-anticipos-container" class="space-y-3 mb-4 max-h-64 overflow-y-auto p-2"></div>
                        <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.agregarFilaApertura('anticipo')">+ Añadir Anticipo</button>
                    </div>
                    
                    <!-- Paso 7: Cuentas por Pagar -->
                    <div id="wizard-step-7" class="wizard-step">
                        <h3 class="conta-title text-center">Cuentas por Pagar Iniciales</h3>
                        <p class="text-[var(--color-text-secondary)] mb-6 text-center">Registra las facturas que debes a tus proveedores.</p>
                        <div id="apertura-cxp-container" class="space-y-3 mb-4 max-h-64 overflow-y-auto p-2"></div>
                        <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.agregarFilaApertura('cxp')">+ Añadir Factura por Pagar</button>
                    </div>

                    <!-- Paso 8: Resumen -->
                    <div id="wizard-step-8" class="wizard-step">
                        <h3 class="conta-title text-center">Resumen de Apertura</h3>
                        <p class="text-[var(--color-text-secondary)] mb-6 text-center">Por favor, confirma que la información es correcta antes de finalizar.</p>
                        <div id="apertura-resumen-container" class="max-h-80 overflow-y-auto p-2 text-sm"></div>
                    </div>
                </div>
                
                <div class="flex justify-between mt-8">
                    <button id="wizard-btn-prev" class="conta-btn conta-btn-accent" onclick="ContaApp.irAPaso(ContaApp.aperturaData.currentStep - 1)" disabled>Anterior</button>
                    <button id="wizard-btn-next" class="conta-btn" onclick="ContaApp.irAPaso(ContaApp.aperturaData.currentStep + 1)">Siguiente</button>
                    <button id="wizard-btn-finish" class="conta-btn conta-btn-success hidden" onclick="ContaApp.guardarAperturaCompleta()">Finalizar Configuración</button>
                </div>
            </div>
        `;
        document.getElementById('modal-content').className = `p-6 rounded-lg shadow-xl w-full max-w-5xl modal-content`;
        document.getElementById('modal-content').innerHTML = modalHTML;
        document.getElementById('modal-bg').classList.remove('hidden');
        document.getElementById('modal-bg').classList.add('flex');
        document.getElementById('modal-bg').onclick = null; // Evitar que se cierre

        this.agregarFilaApertura('banco');
    },
    irAPaso(paso) {
        const totalPasos = 8;
        if (paso > this.aperturaData.currentStep) { // Avanzando
            if (!this.recolectarDatosPaso(this.aperturaData.currentStep)) return;
        }
        if (paso < 1) return;
        
        this.aperturaData.currentStep = paso;
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
        document.querySelector(`#wizard-step-${paso}`).classList.add('active');
        
        document.querySelectorAll('.wizard-progress-step').forEach(el => el.classList.remove('active'));
        for(let i=1; i<=paso; i++) {
             document.querySelector(`#step-indicator-${i}`).classList.add('active');
        }

        document.getElementById('wizard-btn-prev').disabled = (paso === 1);
        document.getElementById('wizard-btn-next').style.display = (paso === totalPasos) ? 'none' : 'inline-block';
        document.getElementById('wizard-btn-finish').style.display = (paso === totalPasos) ? 'inline-block' : 'none';

        if(paso === totalPasos) this.generarResumenApertura();
    },
    agregarFilaApertura(tipo) {
    const timestamp = Date.now();
    let html = '';
    if (tipo === 'banco') {
        const container = document.getElementById('apertura-bancos-container');
        html = `<div id="row-${timestamp}" class="dynamic-row grid grid-cols-12 gap-2 items-center">
            <div class="col-span-6 input-with-icon-container">
                <i class="fa-solid fa-building-columns input-icon"></i>
                <input type="text" placeholder="Nombre del Banco" class="w-full p-2 apertura-banco-nombre">
            </div>
            <div class="col-span-5 input-with-icon-container">
                <i class="fa-solid fa-dollar-sign input-icon"></i>
                <input type="number" step="0.01" placeholder="0.00" class="w-full p-2 text-right apertura-banco-saldo">
            </div>
            <button class="col-span-1 conta-btn-icon delete" onclick="document.getElementById('row-${timestamp}').remove()">🗑️</button>
        </div>`;
        container.insertAdjacentHTML('beforeend', html);
    } else if (tipo === 'inventario') {
        const container = document.getElementById('apertura-inventario-container');
        const categoriasInventarioOptions = this.planDeCuentas
            .filter(c => c.parentId === 130)
            .map(c => `<option value="${c.id}">${c.nombre}</option>`)
            .join('');
        
        // --- INICIO DE LA MEJORA: Opciones para el selector de Unidad de Medida ---
        const unidadesOptions = this.unidadesMedida
            .map(u => `<option value="${u.id}">${u.nombre}</option>`)
            .join('');
        // --- FIN DE LA MEJORA ---

        // CORRECCIÓN: Se reajustó la grilla para incluir el nuevo campo "Unidad".
        html = `<div id="row-${timestamp}" class="dynamic-row grid grid-cols-12 gap-2 items-center">
            <div class="col-span-2">
                <input type="text" placeholder="Nombre Producto" class="w-full p-2 apertura-inv-nombre">
            </div>
            <div class="col-span-2">
                <select class="w-full p-2 apertura-inv-categoria">${categoriasInventarioOptions}</select>
            </div>
            <div class="col-span-1">
                <input type="number" step="1" placeholder="Stock" class="w-full p-2 text-right apertura-inv-stock">
            </div>
            <div class="col-span-2">
                <select class="w-full p-2 apertura-inv-unidad">${unidadesOptions}</select>
            </div>
            <div class="col-span-2">
                <input type="number" step="0.01" placeholder="Costo Unit." class="w-full p-2 text-right apertura-inv-costo">
            </div>
            <div class="col-span-2">
                <input type="number" step="0.01" placeholder="Precio Venta" class="w-full p-2 text-right apertura-inv-precio">
            </div>
            <button class="col-span-1 conta-btn-icon delete" onclick="document.getElementById('row-${timestamp}').remove()">🗑️</button>
        </div>`;
        container.insertAdjacentHTML('beforeend', html);
    } else if (tipo === 'cxc' || tipo === 'cxp') {
        const container = document.getElementById(`apertura-${tipo}-container`);
        const contactoTipo = tipo === 'cxc' ? 'Cliente' : 'Proveedor';
        html = `<div id="row-${timestamp}" class="dynamic-row grid grid-cols-12 gap-2 items-center">
            <input type="text" placeholder="Nombre ${contactoTipo}" class="col-span-4 p-2 apertura-${tipo}-contacto">
            <input type="text" placeholder="# Factura" class="col-span-3 p-2 apertura-${tipo}-ref">
            <input type="date" value="${this.getTodayDate()}" class="col-span-3 p-2 apertura-${tipo}-fecha">
            <input type="number" step="0.01" placeholder="Monto" class="col-span-1 p-2 text-right apertura-${tipo}-monto">
            <button class="col-span-1 conta-btn-icon delete" onclick="document.getElementById('row-${timestamp}').remove()">🗑️</button>
        </div>`;
         container.insertAdjacentHTML('beforeend', html);
    } else if (tipo === 'tarjeta') {
        const container = document.getElementById('apertura-tarjetas-container');
        html = `<div id="row-${timestamp}" class="dynamic-row grid grid-cols-12 gap-2 items-center">
            <input type="text" placeholder="Nombre de la Tarjeta (ej: Visa Banco X)" class="col-span-6 p-2 apertura-tarjeta-nombre">
            <input type="number" step="0.01" placeholder="Saldo Deudor" class="col-span-5 p-2 text-right apertura-tarjeta-saldo">
            <button class="col-span-1 conta-btn-icon delete" onclick="document.getElementById('row-${timestamp}').remove()">🗑️</button>
        </div>`;
        container.insertAdjacentHTML('beforeend', html);
    } else if (tipo === 'anticipo') {
        const container = document.getElementById('apertura-anticipos-container');
        html = `<div id="row-${timestamp}" class="dynamic-row grid grid-cols-12 gap-2 items-center">
            <input type="text" placeholder="Nombre del Cliente" class="col-span-6 p-2 apertura-anticipo-contacto">
            <input type="number" step="0.01" placeholder="Monto del Anticipo" class="col-span-5 p-2 text-right apertura-anticipo-monto">
            <button class="col-span-1 conta-btn-icon delete" onclick="document.getElementById('row-${timestamp}').remove()">🗑️</button>
        </div>`;
        container.insertAdjacentHTML('beforeend', html);
    }
},
    recolectarDatosPaso(paso) {
    if(paso === 1) {
        const nombre = document.getElementById('apertura-nombre-empresa').value;
        if(!nombre) { this.showToast('El nombre de la empresa es obligatorio.', 'error'); return false; }
        this.aperturaData.empresa.nombre = nombre;
        this.aperturaData.fechaApertura = document.getElementById('apertura-fecha').value;
    } else if (paso === 2) {
        this.aperturaData.bancos = [];
        document.querySelectorAll('#apertura-bancos-container .dynamic-row').forEach(row => {
            const nombre = row.querySelector('.apertura-banco-nombre').value;
            const saldo = parseFloat(row.querySelector('.apertura-banco-saldo').value);
            if(nombre && saldo > 0) this.aperturaData.bancos.push({ nombre, saldo });
        });
    } else if (paso === 3) {
        // --- INICIO DE LA CORRECCIÓN ---
        this.aperturaData.inventario = []; // Limpiamos el array antes de recolectar
        document.querySelectorAll('#apertura-inventario-container .dynamic-row').forEach(row => {
            const nombre = row.querySelector('.apertura-inv-nombre')?.value;
            const categoriaId = parseInt(row.querySelector('.apertura-inv-categoria')?.value);
            const stock = parseFloat(row.querySelector('.apertura-inv-stock')?.value) || 0;
            const unidadMedidaId = parseInt(row.querySelector('.apertura-inv-unidad')?.value);
            const costo = parseFloat(row.querySelector('.apertura-inv-costo')?.value) || 0;
            const precio = parseFloat(row.querySelector('.apertura-inv-precio')?.value) || 0;
            
            // CORRECCIÓN: Se eliminó 'precio > 0' de la condición para ser más flexible.
            // Ahora solo se necesita un nombre, una categoría y una unidad para guardar el producto.
            if (nombre && categoriaId && unidadMedidaId) {
                this.aperturaData.inventario.push({ nombre, categoriaId, stock, unidadMedidaId, costo, precio });
            }
        });
        console.log("Datos de inventario recolectados:", this.aperturaData.inventario);
        // --- FIN DE LA CORRECCIÓN ---
    } else if (paso === 4) {
        this.aperturaData.cxc = [];
        document.querySelectorAll('#apertura-cxc-container .dynamic-row').forEach(row => {
            const contacto = row.querySelector('.apertura-cxc-contacto').value;
            const ref = row.querySelector('.apertura-cxc-ref').value;
            const fecha = row.querySelector('.apertura-cxc-fecha').value;
            const monto = parseFloat(row.querySelector('.apertura-cxc-monto').value);
            if(contacto && monto > 0) this.aperturaData.cxc.push({ contacto, ref, fecha, monto });
        });
    } else if (paso === 5) {
        this.aperturaData.tarjetas = [];
        document.querySelectorAll('#apertura-tarjetas-container .dynamic-row').forEach(row => {
            const nombre = row.querySelector('.apertura-tarjeta-nombre').value;
            const saldo = parseFloat(row.querySelector('.apertura-tarjeta-saldo').value);
            if(nombre && saldo > 0) this.aperturaData.tarjetas.push({ nombre, saldo });
        });
    } else if (paso === 6) {
        this.aperturaData.anticipos = [];
        document.querySelectorAll('#apertura-anticipos-container .dynamic-row').forEach(row => {
            const contacto = row.querySelector('.apertura-anticipo-contacto').value;
            const monto = parseFloat(row.querySelector('.apertura-anticipo-monto').value);
            if(contacto && monto > 0) this.aperturaData.anticipos.push({ contacto, monto });
        });
    } else if (paso === 7) {
        this.aperturaData.cxp = [];
        document.querySelectorAll('#apertura-cxp-container .dynamic-row').forEach(row => {
            const contacto = row.querySelector('.apertura-cxp-contacto').value;
            const ref = row.querySelector('.apertura-cxp-ref').value;
            const fecha = row.querySelector('.apertura-cxp-fecha').value;
            const monto = parseFloat(row.querySelector('.apertura-cxp-monto').value);
            if(contacto && monto > 0) this.aperturaData.cxp.push({ contacto, ref, fecha, monto });
        });
    }
    return true;
},
    generarResumenApertura() {
        const { empresa, fechaApertura, bancos, inventario, cxc, cxp, tarjetas, anticipos } = this.aperturaData;
        let html = `<p><strong>Empresa:</strong> ${empresa.nombre}</p><p><strong>Fecha de Apertura:</strong> ${fechaApertura}</p>`;
        
        html += `<h4 class="font-bold mt-4">Bancos (${bancos.length})</h4>` + bancos.map(b => `<div>${b.nombre}: ${this.formatCurrency(b.saldo)}</div>`).join('');
        html += `<h4 class="font-bold mt-4">Inventario (${inventario.length})</h4>` + inventario.map(i => `<div>${i.nombre} (Stock: ${i.stock}, Costo: ${this.formatCurrency(i.costo)})</div>`).join('');
        html += `<h4 class="font-bold mt-4">Cuentas por Cobrar (${cxc.length})</h4>` + cxc.map(c => `<div>${c.contacto} (${c.ref}): ${this.formatCurrency(c.monto)}</div>`).join('');
        html += `<h4 class="font-bold mt-4">Tarjetas de Crédito (${tarjetas.length})</h4>` + tarjetas.map(t => `<div>${t.nombre}: ${this.formatCurrency(t.saldo)}</div>`).join('');
        html += `<h4 class="font-bold mt-4">Anticipos de Clientes (${anticipos.length})</h4>` + anticipos.map(a => `<div>${a.contacto}: ${this.formatCurrency(a.monto)}</div>`).join('');
        html += `<h4 class="font-bold mt-4">Cuentas por Pagar (${cxp.length})</h4>` + cxp.map(c => `<div>${c.contacto} (${c.ref}): ${this.formatCurrency(c.monto)}</div>`).join('');

        document.getElementById('apertura-resumen-container').innerHTML = html;
    },
        guardarAperturaCompleta() {
    console.log("Iniciando guardado de apertura...");
    try {
        const { fechaApertura, bancos, inventario, cxc, cxp, tarjetas, anticipos } = this.aperturaData;
        
        // --- SECCIÓN DE BANCOS ---
        try {
            console.log("Procesando Bancos...", bancos);
            const cuentaBancoPadre = this.planDeCuentas.find(c => c.id === 110);
            if (!cuentaBancoPadre) throw new Error("Cuenta padre de Bancos (110) no encontrada.");
            bancos.forEach(banco => {
                const newAccount = { id: this.idCounter++, codigo: `${cuentaBancoPadre.codigo}.${this.planDeCuentas.filter(c=>c.parentId === 110).length + 1}`, nombre: banco.nombre, tipo: 'DETALLE', parentId: 110 };
                this.planDeCuentas.push(newAccount);
                this.crearAsiento(fechaApertura, `Saldo inicial ${banco.nombre}`, [{ cuentaId: newAccount.id, debe: banco.saldo, haber: 0 }, { cuentaId: 330, debe: 0, haber: banco.saldo }]);
            });
            console.log("Bancos procesados con éxito.");
        } catch(e) {
            console.error("ERROR EN LA SECCIÓN DE BANCOS:", e);
            this.showToast(`Error procesando bancos: ${e.message}`, 'error');
            return; // Detener ejecución si falla
        }

        // --- SECCIÓN DE INVENTARIO (PUNTO CRÍTICO) ---
        try {
            console.log("Procesando Inventario...", inventario);
            if (inventario && inventario.length > 0) {
                inventario.forEach(item => {
                    console.log("Procesando item:", item.nombre);
                    let cuentaIngresoIdAsociada;
                    if (item.categoriaId === 13004) {
                        cuentaIngresoIdAsociada = 41002;
                    } else {
                        cuentaIngresoIdAsociada = 41001;
                    }

                    const nuevoProducto = {
                        ...item,
                        id: this.idCounter++,
                        tipo: 'producto',
                        cuentaIngresoId: cuentaIngresoIdAsociada,
                        cuentaInventarioId: item.categoriaId
                    };
                    
                    this.productos.push(nuevoProducto);
                    console.log("Producto pusheado:", nuevoProducto.nombre);

                    const valorInventario = item.costo * item.stock;
                    if (valorInventario > 0) {
                        this.crearAsiento(fechaApertura, `Inventario inicial ${item.nombre}`, [
                            { cuentaId: item.categoriaId, debe: valorInventario, haber: 0 },
                            { cuentaId: 330, debe: 0, haber: valorInventario }
                        ]);
                    }
                });
            }
            console.log("Inventario procesado con éxito.");
        } catch(e) {
            console.error("ERROR EN LA SECCIÓN DE INVENTARIO:", e);
            this.showToast(`Error procesando inventario: ${e.message}`, 'error');
            return;
        }

        // --- Guardado Final ---
        console.log("Todos los pasos previos completados. Llamando a saveAll()...");
        console.log("Estado final de this.productos antes de guardar:", JSON.stringify(this.productos));
        
        this.saveAll();
        
        this.showToast('¡Configuración completada! Bienvenido.', 'success');
        this.closeModal();
        this.irModulo('dashboard');

    } catch (error) {
        console.error("Error crítico durante guardarAperturaCompleta:", error);
        this.showToast(`Error de configuración: ${error.message}`, 'error');
    }
},
irAtras() {
    if (this.navigationHistory.length <= 1) {
        return;
    }

    // Eliminamos el estado actual
    const currentState = this.navigationHistory.pop();
    // Obtenemos el estado al que queremos volver
    const previousState = this.navigationHistory[this.navigationHistory.length - 1];

    // **LA CLAVE DE LA SOLUCIÓN:**
    // Si el estado del que venimos tenía un filtro de búsqueda,
    // y el estado al que vamos no lo tiene, reseteamos los filtros guardados
    // para ese módulo para evitar que se reapliquen.
    const cameFromSearch = currentState.params.hasOwnProperty('search');
    const goingToGeneric = !previousState.params.hasOwnProperty('search');

    if (cameFromSearch && goingToGeneric) {
        this.moduleFilters[currentState.mod] = {}; // Limpiamos el filtro guardado
    }

    // Procedemos con la navegación hacia atrás como antes
    this.irModulo(previousState.mod, previousState.params, true);
},
        async irModulo(mod, params = {}, isBackNavigation = false) {
        // --- INICIO DE LA MEJORA: Limpiar la paginación al cambiar de módulo ---
        const paginationContainer = document.getElementById('pagination-container');
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
        }
        // --- FIN DE LA MEJORA ---

        if (!this.licencia || !this.licencia.modulosActivos) {
            console.warn(`Intento de navegar al módulo '${mod}' antes de que la licencia esté cargada. Abortando.`);
            return;
        }

        const mapaLicencias = {
            'inventario': 'INVENTARIO_BASE',
            'bancos': 'FINANZAS_AVANZADO',
            'cierre-periodo': 'CONTABILIDAD_AVANZADO',
            'activos-fijos': 'ACTIVOS_AVANZADOS',
            'produccion': 'PRODUCCION',
        };

        const licenciaRequerida = mapaLicencias[mod];
        
        if (licenciaRequerida && !this.licencia.modulosActivos.includes(licenciaRequerida)) {
            const elToShow = document.getElementById(mod);
            if (elToShow) {
                elToShow.innerHTML = this.generarEstadoVacioHTML(
                    'fa-lock', 'Módulo Bloqueado',
                    `Esta funcionalidad no está incluida en tu paquete "${this.licencia.paquete}".`,
                    'Volver al Dashboard', "ContaApp.irModulo('dashboard')"
                );
                elToShow.style.display = "block";
            }
            this.showToast(`El módulo '${mod}' requiere un paquete superior.`, 'error');
            return;
        }

        const hasNewFilterParams = Object.keys(params).some(k => ['search', 'startDate', 'endDate', 'estado'].includes(k));
        if (!hasNewFilterParams && this.moduleFilters[mod]) {
            params = { ...this.moduleFilters[mod], ...params };
        } else {
            this.moduleFilters[mod] = params;
        }

        if (this.isFormDirty) {
            this.showConfirm("Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?", () => {
                this.isFormDirty = false;
                this.irModulo(mod, params);
            });
            return;
        }

        if (!isBackNavigation) {
            const lastState = this.navigationHistory[this.navigationHistory.length - 1];
            if (!lastState || lastState.mod !== mod || JSON.stringify(lastState.params) !== JSON.stringify(params)) {
                this.navigationHistory.push({ mod, params });
            }
        }
        
        const backButton = document.getElementById('back-button');
        if (backButton) { backButton.disabled = this.navigationHistory.length <= 1; }

        const loader = document.getElementById('module-loader');
        const contentArea = document.getElementById('content-area');
        loader.classList.remove('hidden');
        contentArea.style.opacity = '0.5';

        try {
            document.querySelectorAll('#content-area > div').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.conta-nav-link').forEach(el => el.classList.remove('active'));
            
            const elToShow = document.getElementById(mod);
            if (elToShow) {
                elToShow.style.display = "block";
            }
            
            const navLink = document.getElementById("nav-" + mod);
            if (navLink) navLink.classList.add("active");

            const moduleTitle = navLink ? navLink.innerText.trim() : mod.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            if (!params.clienteId && !params.proveedorId && !params.activoId) {
                document.getElementById('page-title-header').innerText = moduleTitle;
            }
            document.title = `${this.empresa.nombre} - ${moduleTitle}`;
            document.getElementById('page-actions-header').innerHTML = '';
            
            const moduleRenderers = {
                'dashboard': this.renderDashboard,
                'ventas': this.renderVentas,
                'gastos': this.renderGastos,
                'compras': this.renderCompras,
                'cxc': (p) => p.clienteId ? this.renderCXCDetalleCliente(p.clienteId, p) : this.renderCXC(p),
                'cxp': (p) => p.proveedorId ? this.renderCXPDetalleProveedor(p.proveedorId, p) : this.renderCXP(p),
                'inventario': this.renderInventario,
                'plan-de-cuentas': this.renderPlanDeCuentas,
                'diario-general': this.renderDiarioGeneral,
                'cierre-periodo': this.renderCierrePeriodo,
                'bancos': this.renderBancosYTarjetas,
                'reportes': this.renderReportes,
                'activos-fijos': this.renderActivosFijos,
                'produccion': this.renderProduccion,
                'config': this.renderConfig
            };
            
            if (moduleRenderers[mod]) {
                await moduleRenderers[mod].call(this, params); // Espera a que el renderizado termine
            }

            if (params.action === 'new' && mod === 'ventas') {
                setTimeout(() => this.abrirModalVenta(params.clienteId, params.anticipoId), 100);
            }

        } catch (e) {
            console.error(`Error al renderizar el módulo ${mod}:`, e);
            this.showToast(`Error al cargar el módulo ${mod}`, 'error');
        } finally {
            loader.classList.add('hidden');
            contentArea.style.opacity = '1';
        }
    },

    // Utilidades (Modales, Toast, Formato)
    showModal(content, size = '2xl') {
        const modalContent = document.getElementById('modal-content');
        modalContent.className = `p-6 rounded-lg shadow-xl w-full max-w-${size} modal-content`;
        modalContent.innerHTML = content;
        document.getElementById('modal-bg').classList.remove('hidden');
        document.getElementById('modal-bg').classList.add('flex');
    },
    closeModal() {
        // --- INICIO DE LA MEJORA ---
        // Comprueba si el formulario tiene cambios antes de cerrar
        if (this.isFormDirty) {
            this.showConfirm(
                "Tienes cambios sin guardar. ¿Estás seguro de que quieres cerrar y descartarlos?",
                () => {
                    // Si el usuario confirma, reseteamos el estado y cerramos el modal a la fuerza
                    this.isFormDirty = false;
                    document.getElementById('modal-bg').classList.add('hidden');
                    document.getElementById('modal-bg').classList.remove('flex');
                }
            );
            return; // Detenemos el cierre inmediato del modal
        }
        // --- FIN DE LA MEJORA ---

        // Si el formulario no está "sucio", simplemente cerramos el modal
        document.getElementById('modal-bg').classList.add('hidden');
        document.getElementById('modal-bg').classList.remove('flex');
    },
    getTodayDate() { return new Date().toISOString().slice(0,10); 
    },
    getVencimientoStatus(fechaVencimiento, estadoFactura) {
        if (estadoFactura === 'Pagada' || estadoFactura === 'Anulada') {
            return { text: estadoFactura, class: estadoFactura === 'Pagada' ? 'tag-success' : 'tag-anulada' };
        }

        if (!fechaVencimiento) {
            return { text: 'Pendiente', class: 'tag-warning' };
        }

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const vencimiento = new Date(fechaVencimiento + 'T00:00:00');
        const diffTime = vencimiento.getTime() - hoy.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { text: `Vencida hace ${Math.abs(diffDays)} días`, class: 'tag-danger' };
        }
        if (diffDays === 0) {
            return { text: 'Vence Hoy', class: 'tag-danger' };
        }
        if (diffDays <= 7) {
            return { text: `Vence en ${diffDays} días`, class: 'tag-accent' };
        }
        return { text: 'Al día', class: 'tag-neutral' };
    },
    getCreditosDisponiblesPorCliente(clienteId) {
        const creditos = this.transacciones.filter(t => 
            t.contactoId === clienteId &&
            (t.tipo === 'nota_credito' || t.tipo === 'anticipo')
        );

        if (creditos.length === 0) {
            return 0;
        }

        const totalCreditoDisponible = creditos.reduce((sum, credito) => {
            const saldoCredito = (credito.total || 0) - (credito.montoAplicado || 0);
            return sum + saldoCredito;
        }, 0);

        return totalCreditoDisponible;
    },

    formatCurrency(value) { return Number(value).toLocaleString('en-US', {style: 'currency', currency: 'USD', minimumFractionDigits: 2}); },
    findById(array, id) { return array.find(item => item.id === parseInt(id)); },
    getThemeColor(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); },
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    },
    showConfirm(message, onConfirm) {
    const confirmContent = `
        <h3 class="conta-title mb-4">Confirmación</h3>
        <p class="text-[var(--color-text-secondary)] mb-6">${message}</p>
        <div class="flex justify-end gap-2">
            <button id="confirm-cancel-btn" class="conta-btn conta-btn-accent">Cancelar</button>
            <button id="confirm-ok-btn" class="conta-btn conta-btn-danger">Confirmar</button>
        </div>
    `;
    this.showModal(confirmContent, 'md');
    document.getElementById('confirm-ok-btn').onclick = () => {
        // Primero se ejecuta la acción que nos pasaron
        onConfirm();
        // LUEGO, nos aseguramos de que el modal se cierre (ESTA ES LA LÍNEA CORREGIDA)
        this.closeModal(); 
    };
    document.getElementById('confirm-cancel-btn').onclick = () => this.closeModal();
},
    generarEstadoVacioHTML(icono, titulo, mensaje, textoBtn, accionBtn) {
        return `
            <div class="text-center p-12 conta-card">
                <div class="text-[var(--color-primary)] opacity-50 mb-4">
                    <i class="fa-solid ${icono} fa-5x"></i>
                </div>
                <h2 class="text-xl font-bold text-[var(--color-text-primary)]">${titulo}</h2>
                <p class="text-[var(--color-text-secondary)] mt-2 mb-6">${mensaje}</p>
                <button class="conta-btn conta-btn-accent" onclick="${accionBtn}">${textoBtn}</button>
            </div>
        `;
    },toggleButtonLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            // Guardamos el texto original para poder restaurarlo después
            button.dataset.originalHtml = button.innerHTML;
            button.innerHTML = '<div class="spinner"></div>';
        } else {
            button.disabled = false;
            // Restauramos el contenido original del botón
            button.innerHTML = button.dataset.originalHtml;
        }
    },generarSiguienteNumeroDeFactura() {
        const hoy = new Date();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const ano = String(hoy.getFullYear()).slice(-2);
        const periodo = `${mes}${ano}`; // ej: "0725"

        const facturasDelPeriodo = this.transacciones.filter(t => 
            t.tipo === 'venta' && 
            t.numeroFactura && 
            t.numeroFactura.endsWith(`-${periodo}`)
        );

        let maxNumero = 0;
        facturasDelPeriodo.forEach(f => {
            const numero = parseInt(f.numeroFactura.split('-')[0]);
            if (numero > maxNumero) {
                maxNumero = numero;
            }
        });

        const siguienteNumero = String(maxNumero + 1).padStart(3, '0');
        return `${siguienteNumero}-${periodo}`;
    },
        setupDatalistListener(inputId, hiddenId, datalistId) {
        const input = document.getElementById(inputId);
        const hiddenInput = document.getElementById(hiddenId);
        const datalist = document.getElementById(datalistId);

        if (!input || !hiddenInput || !datalist) return;

        input.addEventListener('input', () => {
            const inputValue = input.value;
            let found = false;
            for (let i = 0; i < datalist.options.length; i++) {
                if (datalist.options[i].value === inputValue) {
                    hiddenInput.value = datalist.options[i].getAttribute('data-id');
                    found = true;
                    break;
                }
            }
            if (!found) {
                hiddenInput.value = ''; // Limpiar el ID si no hay una coincidencia exacta
            }
        });
    },

    // Gestión de Datos (LocalStorage)
        saveAll(){
        const dataToSave = {
            empresa: this.empresa,
            licencia: this.licencia,
            idCounter: this.idCounter,
            planDeCuentas: this.planDeCuentas.map(({saldo, ...rest}) => rest),
            asientos: this.asientos,
            transacciones: this.transacciones,
            contactos: this.contactos,
            productos: this.productos,
            recurrentes: this.recurrentes,
            activosFijos: this.activosFijos,
            listasMateriales: this.listasMateriales,
            ordenesProduccion: this.ordenesProduccion,
            unidadesMedida: this.unidadesMedida,
            bancoImportado: this.bancoImportado
        };
        this.repository.saveAll(dataToSave);
    },
        // CAMBIO CLAVE: la función ahora recibe los datos como argumento
        loadAll(dataString){
    const defaultData = {
        empresa: {
            nombre: "Tu Empresa", logo: 'images/logo.png', direccion: '123 Calle Ficticia',
            telefono: '+1 (555) 123-4567', email: 'contacto@tuempresa.com',
            taxId: 'J-12345678-9', taxRate: 16,
            presupuestos: {},
            dashboardWidgets: ['ingresos', 'gastos', 'resultadoNeto', 'bancos'],
            dashboardContentWidgets: {
                order: ['financialPerformance', 'activity-feed', 'topExpenses', 'quick-actions'],
                settings: {
                    financialPerformance: { timeRange: 'last6months', visible: true },
                    'activity-feed': { visible: true },
                    topExpenses: { timeRange: 'currentMonth', visible: true },
                    'quick-actions': { visible: true }
                }
            },
            dashboardLayout: 'grid',
            pdfTemplate: 'clasica',
            pdfColor: '#1877f2',
            periodosContables: {} // <-- AÑADIDO
        },
        licencia: {
            cliente: "Usuario Principal",
            paquete: "Profesional",
            modulosActivos: [
                "VENTAS", "GASTOS", "CXC", "CXP",
                "PLAN_DE_CUENTAS", "DIARIO_GENERAL",
                "CONFIGURACION", "INVENTARIO_BASE", "FINANZAS_AVANZADO",
                "CONTABILIDAD_AVANZADO", "REPORTES_AVANZADOS", "ACTIVOS_AVANZADOS",
                "PRODUCCION", "NOMINAS"
            ]
        },
        idCounter: 1000,
        planDeCuentas: this.getPlanDeCuentasDefault(),
        asientos: [],
        transacciones: [],
        contactos: [],
        productos: [],
        recurrentes: [],
        activosFijos: [],
        listasMateriales: [],
        ordenesProduccion: [],
        unidadesMedida: [
            { id: 1, nombre: 'Unidad' },
            { id: 2, nombre: 'Caja' },
            { id: 3, nombre: 'Kg' },
            { id: 4, nombre: 'Litro' },
            { id: 5, nombre: 'Metro' }
        ],
        bancoImportado: {}
    };

    if (dataString) {
        const data = JSON.parse(dataString);
        this.empresa = { ...defaultData.empresa, ...data.empresa };
        this.licencia = data.licencia || defaultData.licencia;
        this.idCounter = data.idCounter || defaultData.idCounter;
        
        this.planDeCuentas = data.planDeCuentas || defaultData.planDeCuentas;
        this.asientos = data.asientos || defaultData.asientos;
        this.transacciones = data.transacciones || defaultData.transacciones;
        this.contactos = data.contactos || defaultData.contactos;
        this.productos = data.productos || defaultData.productos;
        this.recurrentes = data.recurrentes || defaultData.recurrentes;
        this.activosFijos = data.activosFijos || [];
        this.listasMateriales = data.listasMateriales || [];
        this.ordenesProduccion = data.ordenesProduccion || [];
        this.unidadesMedida = data.unidadesMedida || defaultData.unidadesMedida;
        this.bancoImportado = data.bancoImportado || defaultData.bancoImportado;

        this.verificarYActualizarPlanDeCuentas();

        if (!this.empresa.presupuestos) this.empresa.presupuestos = {};
        if (!this.empresa.dashboardWidgets) this.empresa.dashboardWidgets = defaultData.empresa.dashboardWidgets;
        if (!this.empresa.dashboardContentWidgets || !this.empresa.dashboardContentWidgets.order) {
            this.empresa.dashboardContentWidgets = defaultData.empresa.dashboardContentWidgets;
        }
        if (!this.empresa.dashboardLayout) this.empresa.dashboardLayout = defaultData.empresa.dashboardLayout;
        // <-- AÑADIDO
        if (!this.empresa.periodosContables) this.empresa.periodosContables = {};
    } else {
        Object.assign(this, defaultData);
    }
},
verificarYActualizarPlanDeCuentas() {
        console.log("--- INICIANDO verificarYActualizarPlanDeCuentas ---");
        const planPorDefecto = this.getPlanDeCuentasDefault();
        let planActualizado = false;

        console.log(`Comparando ${this.planDeCuentas.length} cuentas del usuario contra ${planPorDefecto.length} cuentas por defecto.`);

        planPorDefecto.forEach(cuentaDefault => {
            const existeEnPlanActual = this.planDeCuentas.some(c => c.id === cuentaDefault.id);
            if (!existeEnPlanActual) {
                console.log(`%c[AÑADIENDO CUENTA] ID: ${cuentaDefault.id}, Nombre: ${cuentaDefault.nombre}`, 'color: #28a745; font-weight: bold;');
                this.planDeCuentas.push(cuentaDefault);
                planActualizado = true;
            }
        });

        if (planActualizado) {
            console.log("%cEl plan de cuentas fue modificado. Disparando guardado...", 'color: #ffc107; font-weight: bold;');
            this.saveAll();
        } else {
            console.log("El plan de cuentas del usuario ya estaba actualizado. No se realizaron cambios.");
        }
        console.log("--- FINALIZANDO verificarYActualizarPlanDeCuentas ---");
    },
   forzarActualizacionPlanDeCuentas() {
        this.showConfirm(
            'Esto reemplazará las cuentas por defecto con la última versión del código, pero mantendrá las cuentas que hayas creado manualmente. ¿Deseas continuar?',
            () => {
                const planPorDefecto = this.getPlanDeCuentasDefault();
                // Nos quedamos con las cuentas que el usuario creó (ej. bancos, tarjetas, etc.)
                const cuentasManuales = this.planDeCuentas.filter(c => {
                    // Una forma simple de identificar cuentas manuales es si su ID no está en el plan por defecto
                    return !planPorDefecto.some(def => def.id === c.id);
                });
                
                console.log(`Se conservarán ${cuentasManuales.length} cuentas manuales.`);
                
                // El nuevo plan de cuentas será el por defecto MÁS las cuentas manuales del usuario
                this.planDeCuentas = [...planPorDefecto, ...cuentasManuales];
                
                this.saveAll();
                this.showToast('¡Plan de Cuentas forzado a la última versión! Recargando...', 'success');
                setTimeout(() => window.location.reload(), 1500);
            }
        );
    }, 
    actualizarPerfilEmpresa(){ 
        document.querySelector("#side-logo").src = this.empresa.logo || 'images/logo.png'; 
        document.querySelector(".conta-nav-title").innerText = this.empresa.nombre || 'ContaApp Pro'; 
    },
    
    // Lógica Contable Principal
            getPlanDeCuentasDefault() {
    return [
        // 100: ACTIVOS (Sin cambios)
        { id: 100, codigo: '100', nombre: 'ACTIVOS', tipo: 'TITULO', parentId: null },
        { id: 110, codigo: '110', nombre: 'Efectivo y Equivalentes', tipo: 'CONTROL', parentId: 100 },
        { id: 11001, codigo: '110.1', nombre: 'Caja General', tipo: 'DETALLE', parentId: 110 },
        { id: 120, codigo: '120', nombre: 'Cuentas por Cobrar', tipo: 'DETALLE', parentId: 100 },
        { id: 130, codigo: '130', nombre: 'Inventarios', tipo: 'CONTROL', parentId: 100 },
        { id: 13001, codigo: '130.1', nombre: 'Inventario de Mercancía para Reventa', tipo: 'DETALLE', parentId: 130 },
        { id: 13002, codigo: '130.2', nombre: 'Inventario de Materias Primas', tipo: 'DETALLE', parentId: 130 },
        { id: 13003, codigo: '130.3', nombre: 'Inventario de Productos en Proceso', tipo: 'DETALLE', parentId: 130 },
        { id: 13004, codigo: '130.4', nombre: 'Inventario de Productos Terminados', tipo: 'DETALLE', parentId: 130 },
        { id: 140, codigo: '140', nombre: 'IVA Crédito Fiscal', tipo: 'DETALLE', parentId: 100 },
        { id: 150, codigo: '150', nombre: 'Propiedad, Planta y Equipo', tipo: 'CONTROL', parentId: 100 },
        { id: 15001, codigo: '150.1', nombre: 'Mobiliario y Equipo de Oficina', tipo: 'DETALLE', parentId: 150 },
        { id: 159, codigo: '159', nombre: 'Depreciación Acumulada', tipo: 'CONTROL', parentId: 100 },
        { id: 15901, codigo: '159.1', nombre: 'Dep. Acum. Mobiliario y Equipo', tipo: 'DETALLE', parentId: 159 },

        // 200: PASIVOS (Sin cambios)
        { id: 200, codigo: '200', nombre: 'PASIVOS', tipo: 'TITULO', parentId: null },
        { id: 210, codigo: '210', nombre: 'Cuentas por Pagar', tipo: 'DETALLE', parentId: 200 },
        { id: 220, codigo: '220', nombre: 'Anticipos de Clientes', tipo: 'DETALLE', parentId: 200 },
        { id: 230, codigo: '230', nombre: 'Tarjetas de Crédito', tipo: 'CONTROL', parentId: 200 },
        { id: 23001, codigo: '230.1', nombre: 'Tarjeta de Crédito Principal', tipo: 'DETALLE', parentId: 230 },
        { id: 240, codigo: '240', nombre: 'IVA Débito Fiscal', tipo: 'DETALLE', parentId: 200 },

        // 300: PATRIMONIO (Sin cambios)
        { id: 300, codigo: '300', nombre: 'PATRIMONIO', tipo: 'TITULO', parentId: null },
        { id: 310, codigo: '310', nombre: 'Capital Social', tipo: 'DETALLE', parentId: 300 },
        { id: 320, codigo: '320', nombre: 'Resultados Acumulados', tipo: 'DETALLE', parentId: 300 },
        { id: 330, codigo: '330', nombre: 'Utilidades de Apertura', tipo: 'DETALLE', parentId: 300 },
        
        // 400: INGRESOS (Reestructurado)
        { id: 400, codigo: '400', nombre: 'INGRESOS', tipo: 'TITULO', parentId: null },
        { id: 410, codigo: '410', nombre: 'Ingresos por Venta de Productos', tipo: 'CONTROL', parentId: 400 },
        { id: 41001, codigo: '410.1', nombre: 'Venta de Mercancía para Reventa', tipo: 'DETALLE', parentId: 410 },
        { id: 41002, codigo: '410.2', nombre: 'Venta de Productos Terminados', tipo: 'DETALLE', parentId: 410 },
        { id: 420, codigo: '420', nombre: 'Ingresos por Venta de Servicios', tipo: 'CONTROL', parentId: 400 },
        { id: 42001, codigo: '420.1', nombre: 'Servicios Generales', tipo: 'DETALLE', parentId: 420 },
        { id: 430, codigo: '430', nombre: 'Otros Ingresos', tipo: 'CONTROL', parentId: 400 },
        { id: 43001, codigo: '430.1', nombre: 'Ganancia en Venta de Activos', tipo: 'DETALLE', parentId: 430 },
        { id: 490, codigo: '490', nombre: 'Descuentos y Devoluciones en Venta', tipo: 'DETALLE', parentId: 400 },

        // 500: COSTOS (Nuevo grupo principal)
        { id: 500, codigo: '500', nombre: 'COSTOS', tipo: 'TITULO', parentId: null },
        { id: 510, codigo: '510', nombre: 'Costo de Ventas', tipo: 'DETALLE', parentId: 500 },

        // 600: GASTOS (Nuevo grupo principal, antes era parte del 500)
        { id: 600, codigo: '600', nombre: 'GASTOS', tipo: 'TITULO', parentId: null },
        { id: 610, codigo: '610', nombre: 'Gastos Administrativos y Operativos', tipo: 'CONTROL', parentId: 600 },
        { id: 61001, codigo: '610.1', nombre: 'Sueldos y Salarios', tipo: 'DETALLE', parentId: 610 },
        { id: 61002, codigo: '610.2', nombre: 'Alquiler', tipo: 'DETALLE', parentId: 610 },
        { id: 61003, codigo: '610.3', nombre: 'Merma de Inventario', tipo: 'DETALLE', parentId: 610 },
        { id: 61004, codigo: '610.4', nombre: 'Gasto por Depreciación', tipo: 'DETALLE', parentId: 610 },
        { id: 620, codigo: '620', nombre: 'Pérdida en Venta/Baja de Activos', tipo: 'DETALLE', parentId: 600 }
    ];
},
    getFechaContable(fechaTransaccion) {
    const periodosCerrados = this.empresa.periodosContables || {};
    const periodoTransaccion = fechaTransaccion.substring(0, 7); // "YYYY-MM"

    if (periodosCerrados[periodoTransaccion] !== 'cerrado') {
        // El período está abierto, usamos la fecha original
        return fechaTransaccion;
    }

    // El período está cerrado, debemos encontrar el siguiente mes abierto
    const ultimoPeriodoCerrado = Object.keys(periodosCerrados)
        .filter(p => periodosCerrados[p] === 'cerrado')
        .sort()
        .pop();
    
    if (!ultimoPeriodoCerrado) {
         return fechaTransaccion; // No debería ocurrir si el chequeo inicial pasó, pero es una salvaguarda
    }
    
    const [anio, mes] = ultimoPeriodoCerrado.split('-').map(Number);
    // Creamos la fecha del primer día del mes SIGUIENTE al último cerrado
    const primerDiaMesAbierto = new Date(anio, mes, 1); // El mes en JS es 0-11, así que mes '01' se vuelve Feb, etc.
    
    return primerDiaMesAbierto.toISOString().slice(0, 10);
},
getPeriodoContableActual() {
    const periodosCerrados = this.empresa.periodosContables || {};
    const anioActual = new Date().getFullYear();

    const ultimoPeriodoCerrado = Object.keys(periodosCerrados)
        .filter(p => periodosCerrados[p] === 'cerrado')
        .sort()
        .pop(); // Obtiene el último período cerrado, ej: "2025-07"

    if (!ultimoPeriodoCerrado) {
        // Si no hay ningún período cerrado, el período actual es Enero del año en curso.
        return {
            actual: `${anioActual}-01`,
            anterior: null // No hay período anterior para reabrir
        };
    }

    const [anio, mes] = ultimoPeriodoCerrado.split('-').map(Number);
    // El nuevo período actual es el mes siguiente al último cerrado.
    const fechaSiguiente = new Date(anio, mes, 1); // JS Date: mes 11 es Dic. mes 12 pasa al siguiente año.
    
    return {
        actual: `${fechaSiguiente.getFullYear()}-${String(fechaSiguiente.getMonth() + 1).padStart(2, '0')}`,
        anterior: ultimoPeriodoCerrado
    };
},
    crearAsiento(fecha, descripcion, movimientos, transaccionId) {
    // El parámetro 'fecha' ahora siempre es la FECHA DE LA TRANSACCIÓN ORIGINAL

    // Comprobación de cierre ANUAL (irreversible)
    if (this.empresa.ultimoCierre && fecha <= this.empresa.ultimoCierre) {
        this.showToast(`Error: El período hasta ${this.empresa.ultimoCierre} está cerrado. No se pueden registrar transacciones en o antes de esta fecha.`, 'error');
        return null;
    }
    
    // Nueva lógica para obtener la fecha contable correcta respetando cierres MENSUALES
    const fechaContable = this.getFechaContable(fecha);
    let descripcionFinal = descripcion;
    
    // Si la fecha contable es diferente a la de la transacción, lo indicamos en la descripción
    if (fechaContable !== fecha) {
        descripcionFinal = `(Fecha Orig: ${fecha}) ${descripcion}`;
        this.showToast(`El asiento se registrará el ${fechaContable} porque el período original está cerrado.`, 'info');
    }

    const totalDebe = movimientos.reduce((sum, t) => sum + t.debe, 0);
    const totalHaber = movimientos.reduce((sum, t) => sum + t.haber, 0);
    if (Math.abs(totalDebe - totalHaber) > 0.01) {
        console.error("Asiento descuadrado:", { totalDebe, totalHaber, movimientos });
        this.showToast(`Error: Asiento descuadrado. Debe=${this.formatCurrency(totalDebe)}, Haber=${this.formatCurrency(totalHaber)}`, 'error');
        return null;
    }

    // Usamos la fechaContable para crear el asiento
    const asiento = { id: this.idCounter++, fecha: fechaContable, descripcion: descripcionFinal, movimientos, transaccionId };
    this.asientos.push(asiento);
    this.actualizarSaldosGlobales();
    return asiento;
},
    actualizarSaldosGlobales() {
        const planConSaldos = this.getSaldosPorPeriodo();
        this.planDeCuentas.forEach(cuenta => {
            const cuentaConSaldo = planConSaldos.find(c => c.id === cuenta.id);
            cuenta.saldo = cuentaConSaldo ? cuentaConSaldo.saldo : 0;
        });
    },
    getSaldosPorPeriodo(fechaFin = null, fechaInicio = null) {
    const planCopia = JSON.parse(JSON.stringify(this.planDeCuentas));
    planCopia.forEach(c => c.saldo = 0);
    
    const asientosFiltrados = this.asientos.filter(a => {
        if (fechaFin && a.fecha > fechaFin) return false;
        if (fechaInicio && a.fecha < fechaInicio) return false;
        return true;
    });

    asientosFiltrados.forEach(asiento => {
        asiento.movimientos.forEach(mov => {
            const cuenta = planCopia.find(c => c.id === mov.cuentaId);
            if (cuenta) {
                // --- INICIO DE LA CORRECCIÓN ---
                // Se añade el grupo '6' (Gastos) a la lista de cuentas de naturaleza deudora.
                const esDeudora = ['1', '5', '6'].includes(cuenta.codigo[0]);
                // --- FIN DE LA CORRECCIÓN ---
                cuenta.saldo += esDeudora ? (mov.debe - mov.haber) : (mov.haber - mov.debe);
            }
        });
    });

    const cuentasPorProcesar = planCopia.filter(c => c.tipo !== 'DETALLE').sort((a,b) => b.codigo.length - a.codigo.length);
    cuentasPorProcesar.forEach(c => c.saldo = 0); 
    
    planCopia.filter(c => c.tipo === 'DETALLE').forEach(cuentaHija => {
        let parentId = cuentaHija.parentId;
        while(parentId !== null) {
            const cuentaPadre = planCopia.find(p => p.id === parentId);
            if(cuentaPadre) {
                cuentaPadre.saldo += cuentaHija.saldo;
                parentId = cuentaPadre.parentId;
            } else {
                parentId = null;
            }
        }
    });

    return planCopia;
},
    filtrarLista(modulo) {
        const searchInput = document.getElementById(`${modulo}-search`);
        const startDateInput = document.getElementById(`${modulo}-start-date`);
        const endDateInput = document.getElementById(`${modulo}-end-date`);
        // Leemos también el filtro de estado, si existe
        const estadoInput = document.getElementById(`${modulo}-estado`);

        const params = {};
        if (searchInput) params.search = searchInput.value;
        if (startDateInput) params.startDate = startDateInput.value;
        if (endDateInput) params.endDate = endDateInput.value;
        if (estadoInput) params.estado = estadoInput.value;
        
        // --- INICIO DE LA MEJORA ---
        // Guardamos los filtros actuales en el estado global
        this.moduleFilters[modulo] = params;
        // --- FIN DE LA MEJORA ---

        this.irModulo(modulo, params);
    },
        filtrarDashboard() {
        const startDate = document.getElementById('dashboard-start-date').value;
        const endDate = document.getElementById('dashboard-end-date').value;
        this.irModulo('dashboard', { startDate, endDate });
    },
         
    abrirModalPersonalizarDashboard() {
        const widgetDefinitions = {
            ingresos: 'Ingresos del Período',
            gastos: 'Gastos del Período',
            resultadoNeto: 'Resultado Neto',
            bancos: 'Saldo en Bancos',
            cxc: 'Cuentas por Cobrar',
            cxp: 'Cuentas por Pagar',
            inventario: 'Valor de Inventario'
        };
        const selectedWidgets = this.empresa.dashboardWidgets || [];

        const checkboxesHTML = Object.entries(widgetDefinitions).map(([id, title]) => `
            <div class="flex items-center">
                <input type="checkbox" id="widget-${id}" value="${id}" class="h-4 w-4 widget-checkbox" ${selectedWidgets.includes(id) ? 'checked' : ''}>
                <label for="widget-${id}" class="ml-3 text-sm">${title}</label>
            </div>
        `).join('');

        const modalHTML = `
            <h3 class="conta-title mb-4">Personalizar Dashboard</h3>
            <p class="text-[var(--color-text-secondary)] mb-6">Selecciona los indicadores que deseas ver en tu panel principal.</p>
            <form onsubmit="ContaApp.guardarPersonalizacionDashboard(event)">
                <div class="grid grid-cols-2 gap-4">
                    ${checkboxesHTML}
                </div>
                <div class="flex justify-end gap-2 mt-8">
                    <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                    <button type="submit" class="conta-btn">Guardar Cambios</button>
                </div>
            </form>
        `;
        this.showModal(modalHTML, 'xl');
    },
    guardarPersonalizacionDashboard(e) {
        e.preventDefault();
        const selectedWidgets = [];
        document.querySelectorAll('.widget-checkbox:checked').forEach(checkbox => {
            selectedWidgets.push(checkbox.value);
        });

        this.empresa.dashboardWidgets = selectedWidgets;
        this.saveAll();
        this.closeModal();
        this.renderDashboard();
        this.showToast('Dashboard actualizado.', 'success');
    },
          
    renderCXCPieChart(agingData) {
        if (this.charts.cxcPie) {
            this.charts.cxcPie.destroy();
        }
        const ctx = document.getElementById('cxc-pie-chart')?.getContext('2d');
        if (!ctx) return;

        const labels = agingData.contactos.map(c => c.contacto.nombre);
        const data = agingData.contactos.map(c => c.total);

        // Paleta de colores atractiva
        const themeColors = [
            this.getThemeColor('--color-primary'),
            this.getThemeColor('--color-accent'),
            this.getThemeColor('--color-success'),
            '#F9C851', // Un amarillo cálido
            '#5AC8FA', // Un azul cielo
            '#AF52DE', // Un púrpura
        ];

        this.charts.cxcPie = new Chart(ctx, {
            type: 'doughnut', // 'doughnut' es como un 'pie' pero con un agujero en el centro, más moderno
            data: {
                labels: labels,
                datasets: [{
                    label: 'Saldo Pendiente',
                    data: data,
                    backgroundColor: themeColors,
                    borderColor: this.getThemeColor('--color-bg-secondary'), // Borde del color de fondo para separar las rebanadas
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: this.getThemeColor('--color-text-secondary'),
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : 0;
                                return `${label}: ${this.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },
    
    // Módulo: Temas y UI
    initTheme() {
        const savedTheme = localStorage.getItem("conta_theme") || 'fresco';
        this.aplicarTema(savedTheme);
        this.renderThemeSwitcher(savedTheme);
    },
    // ===============================================
    // BÚSQUEDA GLOBAL
    // ===============================================
    initGlobalSearch() {
        const input = document.getElementById('global-search-input');
        if (!input) return;

        input.addEventListener('input', () => this.performGlobalSearch());
        input.addEventListener('focus', () => this.performGlobalSearch()); // Mostrar resultados si ya hay texto
        
        // Cierra los resultados si se hace clic fuera
        document.addEventListener('click', (e) => {
            const searchContainer = input.parentElement;
            if (!searchContainer.contains(e.target)) {
                this.hideGlobalSearchResults();
            }
        });
    },

    performGlobalSearch() {
        const input = document.getElementById('global-search-input');
        const term = input.value.toLowerCase().trim();
        
        if (term.length < 2) {
            this.hideGlobalSearchResults();
            return;
        }

        // --- INICIO DE LA CORRECCIÓN ---
        // Se cambió el método para detectar si la búsqueda es puramente numérica.
        const isNumericSearch = /^[0-9.-]+$/.test(term) && !isNaN(parseFloat(term));
        const numericTerm = isNumericSearch ? parseFloat(term) : NaN;
        // --- FIN DE LA CORRECCIÓN ---

        const results = {
            ventas: [],
            gastos: [],
            clientes: [],
            productos: [],
            cuentas: []
        };

        // Buscar Ventas por #, cliente o monto
        this.transacciones.filter(t => t.tipo === 'venta').forEach(venta => {
            const cliente = this.findById(this.contactos, venta.contactoId);
            if (venta.numeroFactura?.toLowerCase().includes(term) || 
                cliente?.nombre.toLowerCase().includes(term) ||
                (isNumericSearch && Math.abs(venta.total - numericTerm) < 0.01)) {
                results.ventas.push(venta);
            }
        });

        // Buscar Gastos por descripción, proveedor o monto
        this.transacciones.filter(t => t.tipo === 'gasto').forEach(gasto => {
            const proveedor = this.findById(this.contactos, gasto.contactoId);
            if (gasto.descripcion.toLowerCase().includes(term) || 
                proveedor?.nombre.toLowerCase().includes(term) ||
                (isNumericSearch && Math.abs(gasto.total - numericTerm) < 0.01)) {
                results.gastos.push(gasto);
            }
        });

        // Buscar Clientes (solo por texto)
        if (!isNumericSearch) {
            this.contactos.filter(c => c.tipo === 'cliente').forEach(cliente => {
                if (cliente.nombre.toLowerCase().includes(term)) {
                    results.clientes.push(cliente);
                }
            });
        }

        // Buscar Productos (solo por texto)
        if (!isNumericSearch) {
            this.productos.forEach(producto => {
                if (producto.nombre.toLowerCase().includes(term)) {
                    results.productos.push(producto);
                }
            });
        }
        
        // Buscar Cuentas (solo por texto)
        if (!isNumericSearch) {
            this.planDeCuentas.filter(c => c.tipo === 'DETALLE').forEach(cuenta => {
                if(cuenta.nombre.toLowerCase().includes(term) || cuenta.codigo.includes(term)) {
                    results.cuentas.push(cuenta);
                }
            });
        }

        this.displayGlobalSearchResults(results);
    },

    displayGlobalSearchResults(results) {
    const container = document.getElementById('global-search-results');
    const term = document.getElementById('global-search-input').value.trim();
    let html = '';

    // --- INICIO DE LA MEJORA: Función auxiliar para resaltar ---
    const highlightMatch = (text) => {
        if (!term || !text) return text;
        const regex = new RegExp(`(${term})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    };
    // --- FIN DE LA MEJORA ---

    if (results.cuentas.length > 0) {
        html += `<div class="search-result-group"><h4>Cuentas Contables</h4>`;
        results.cuentas.slice(0, 5).forEach(c => {
            html += `<div class="search-result-item" onclick="ContaApp.irACuentaDesdeBusqueda(${c.id})">
                <div class="result-icon"><i class="fa-solid fa-book"></i></div>
                <div class="result-text">
                    <div class="main">${highlightMatch(c.nombre)}</div>
                    <div class="sub">Código: ${highlightMatch(c.codigo)}</div>
                </div>
            </div>`;
        });
        html += `</div>`;
    }

    if (results.ventas.length > 0) {
        html += `<div class="search-result-group"><h4>Ventas</h4>`;
        results.ventas.slice(0, 5).forEach(v => {
            const cliente = this.findById(this.contactos, v.contactoId);
            html += `<div class="search-result-item" onclick="ContaApp.irAVentaDesdeBusqueda(${v.id})">
                <div class="result-icon"><i class="fa-solid fa-file-invoice-dollar"></i></div>
                <div class="result-text">
                    <div class="main">Factura #${highlightMatch(v.numeroFactura || v.id.toString())}</div>
                    <div class="sub">${highlightMatch(cliente?.nombre || 'N/A')} - ${this.formatCurrency(v.total)}</div>
                </div>
            </div>`;
        });
        html += `</div>`;
    }

    if (results.gastos.length > 0) {
        html += `<div class="search-result-group"><h4>Gastos</h4>`;
        results.gastos.slice(0, 5).forEach(g => {
            const proveedor = this.findById(this.contactos, g.contactoId);
            html += `<div class="search-result-item" onclick="ContaApp.irAGastoDesdeBusqueda(${g.id})">
                <div class="result-icon"><i class="fa-solid fa-receipt"></i></div>
                <div class="result-text">
                    <div class="main">${highlightMatch(g.descripcion)}</div>
                    <div class="sub">${highlightMatch(proveedor?.nombre || 'N/A')} - ${this.formatCurrency(g.total)}</div>
                </div>
            </div>`;
        });
        html += `</div>`;
    }
    
    if (results.clientes.length > 0) {
        html += `<div class="search-result-group"><h4>Clientes</h4>`;
        results.clientes.slice(0, 5).forEach(c => {
            html += `<div class="search-result-item" onclick="ContaApp.irAContactoDesdeBusqueda(${c.id})">
                <div class="result-icon"><i class="fa-solid fa-user-tie"></i></div>
                <div class="result-text">
                    <div class="main">${highlightMatch(c.nombre)}</div>
                    <div class="sub">${highlightMatch(c.email || 'Cliente')}</div>
                </div>
            </div>`;
        });
        html += `</div>`;
    }

    if (results.productos.length > 0) {
        html += `<div class="search-result-group"><h4>Productos y Servicios</h4>`;
        results.productos.slice(0, 5).forEach(p => {
            html += `<div class="search-result-item" onclick="ContaApp.irAProductoDesdeBusqueda(${p.id})">
                <div class="result-icon"><i class="fa-solid fa-box"></i></div>
                <div class="result-text">
                    <div class="main">${highlightMatch(p.nombre)}</div>
                    <div class="sub">Stock: ${p.stock !== undefined ? p.stock : 'N/A'} - Precio: ${this.formatCurrency(p.precio)}</div>
                </div>
            </div>`;
        });
        html += `</div>`;
    }

    if (html === '') {
        html = `<p class="text-center text-[var(--color-text-secondary)] p-4">No se encontraron resultados.</p>`;
    }

    container.innerHTML = html;
    container.classList.remove('hidden');
},

    hideGlobalSearchResults() {
        const container = document.getElementById('global-search-results');
        container.classList.add('hidden');
        container.innerHTML = '';
    },

    // Funciones de navegación desde la búsqueda
    irAVentaDesdeBusqueda(ventaId) {
        this.abrirVistaPreviaFactura(ventaId);
        this.hideGlobalSearchResults();
        document.getElementById('global-search-input').value = '';
    },
    irAGastoDesdeBusqueda(gastoId) {
        this.abrirModalHistorialGasto(gastoId);
        this.hideGlobalSearchResults();
        document.getElementById('global-search-input').value = '';
    },
    irAContactoDesdeBusqueda(contactoId) {
        const contacto = this.findById(this.contactos, contactoId);
        const modulo = contacto.tipo === 'cliente' ? 'cxc' : 'cxp';
        const param = contacto.tipo === 'cliente' ? { clienteId: contactoId } : { proveedorId: contactoId };
        this.irModulo(modulo, param);
        this.hideGlobalSearchResults();
        document.getElementById('global-search-input').value = '';
    },
    irAProductoDesdeBusqueda(productoId) {
        const producto = this.findById(this.productos, productoId);
        this.irModulo('inventario', { search: producto.nombre });
        this.hideGlobalSearchResults();
        document.getElementById('global-search-input').value = '';
    },
    irACuentaDesdeBusqueda(cuentaId) {
        this.irModulo('reportes', { submodulo: 'mayor', cuentaId: cuentaId });
        this.hideGlobalSearchResults();
        document.getElementById('global-search-input').value = '';
    },
    aplicarTema(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        if (document.getElementById('dashboard')?.style.display !== 'none') {
             setTimeout(() => this.renderDashboardCharts(), 50);
        }
    },
    cambiarTema() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'fresco';
        const currentIndex = this.themes.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % this.themes.length;
        const newTheme = this.themes[nextIndex];
        
        localStorage.setItem("conta_theme", newTheme);
        this.aplicarTema(newTheme);
        this.renderThemeSwitcher(newTheme);
    },
    renderThemeSwitcher(currentTheme) {
        const sunIcon = `<svg class="theme-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`;
        const moonIcon = `<svg class="theme-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`;
        
        const iconToShow = currentTheme === 'infinito' ? sunIcon : moonIcon;
        document.getElementById('theme-switcher').innerHTML = `<div onclick="ContaApp.cambiarTema()">${iconToShow}</div>`;
    },
        
    exportarA_CSV(nombreArchivo, dataArray) {
        if (dataArray.length === 0) {
            this.showToast('No hay datos para exportar.', 'info');
            return;
        }

        const headers = Object.keys(dataArray[0]);
        const csvRows = [headers.join(',')];

        dataArray.forEach(row => {
            const values = headers.map(header => {
                let cell = row[header] === null || row[header] === undefined ? '' : String(row[header]);
                // Escapar comillas dobles dentro de una celda
                cell = cell.replace(/"/g, '""');
                // Si la celda contiene comas, comillas o saltos de línea, envolverla en comillas dobles
                if (/[",\n]/.test(cell)) {
                    cell = `"${cell}"`;
                }
                return cell;
            });
            csvRows.push(values.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', nombreArchivo);
        a.style.visibility = 'hidden';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.showToast('Exportación completada.', 'success');
    },
    getPaginationState(module) {
        if (!this.paginationState[module]) {
            // Se cambia el valor por defecto a 20 líneas por página.
            this.paginationState[module] = { currentPage: 1, perPage: 20 };
        }
        return this.paginationState[module];
    },

    changeItemsPerPage(module, perPageValue) {
        const state = this.getPaginationState(module);
        state.perPage = parseInt(perPageValue);
        state.currentPage = 1; // Reset to first page
        this.irModulo(module, this.moduleFilters[module]);
    },

    goToPage(module, page) {
        const state = this.getPaginationState(module);
        state.currentPage = page;
        this.irModulo(module, this.moduleFilters[module]);
    },

    renderPaginationControls(module, totalItems) {
        const container = document.getElementById('pagination-container');
        if (!container) return;

        // --- INICIO DE LA CORRECCIÓN ---
        // La barra se muestra siempre que haya al menos 1 item, sin importar el número de páginas.
        if (totalItems === 0) {
            container.innerHTML = ''; // Limpia el contenedor si no hay items.
            return;
        }
        // --- FIN DE LA CORRECCIÓN ---

        const { currentPage, perPage } = this.getPaginationState(module);
        const totalPages = Math.ceil(totalItems / perPage);

        let pageButtonsHTML = '';
        if (totalPages > 1) {
            const maxButtons = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
            let endPage = Math.min(totalPages, startPage + maxButtons - 1);

            if (endPage - startPage + 1 < maxButtons) {
                startPage = Math.max(1, endPage - maxButtons + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                const isActive = i === currentPage;
                pageButtonsHTML += `<button class="pagination-btn ${isActive ? 'active' : ''}" onclick="ContaApp.goToPage('${module}', ${i})">${i}</button>`;
            }
        } else {
            // Si solo hay una página, muestra el número 1 como activo y deshabilitado.
            pageButtonsHTML += `<button class="pagination-btn active" disabled>1</button>`;
        }

        container.innerHTML = `
            <div class="pagination-controls">
                <div class="text-sm font-semibold">
                    Página ${currentPage} de ${totalPages} (${totalItems} en total)
                </div>
                <div class="flex items-center gap-1">
                    <button class="pagination-btn" onclick="ContaApp.goToPage('${module}', ${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>« Ant</button>
                    ${pageButtonsHTML}
                    <button class="pagination-btn" onclick="ContaApp.goToPage('${module}', ${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Sig »</button>
                </div>
            </div>
        `;
    },
};
