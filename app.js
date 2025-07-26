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
    bancoImportado: {},
    
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
        async init(repository) { 
        this.repository = repository;

        // 1. Inicializar componentes de UI que SIEMPRE deben funcionar.
        this.initTheme();
        this.initGlobalSearch();

        // 2. Obtener los datos UNA SOLA VEZ al inicio, usando el repositorio.
        //    CAMBIO CLAVE: Esperamos a que la promesa de loadAll() se resuelva.
        const dataString = await this.repository.loadAll();

        // 3. Cargar los datos. La función loadAll ahora solo procesa, no lee.
        this.loadAll(dataString); 

        // 4. Decidir qué hacer después de cargar.
        if (!dataString) {
            // -- RUTA PARA PRIMERA EJECUCIÓN O RESETEO --
            this.abrirAsistenteApertura();
        } else {
            // -- RUTA PARA USO NORMAL --
            // Ahora esto se ejecuta DESPUÉS de que los datos han llegado.
            this.actualizarSaldosGlobales();
            this.actualizarPerfilEmpresa();
            this.irModulo('dashboard');
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
            html = `<div id="row-${timestamp}" class="dynamic-row grid grid-cols-12 gap-2 items-center">
    <div class="col-span-4 input-with-icon-container">
        <i class="fa-solid fa-box input-icon"></i>
        <input type="text" placeholder="Nombre Producto/Servicio" class="w-full p-2 apertura-inv-nombre">
    </div>
    <div class="col-span-2 input-with-icon-container">
        <i class="fa-solid fa-boxes-stacked input-icon"></i>
        <input type="number" step="1" placeholder="Stock" class="w-full p-2 text-right apertura-inv-stock">
    </div>
    <div class="col-span-2 input-with-icon-container">
        <i class="fa-solid fa-dollar-sign input-icon"></i>
        <input type="number" step="0.01" placeholder="Costo Unit." class="w-full p-2 text-right apertura-inv-costo">
    </div>
    <div class="col-span-3 input-with-icon-container">
        <i class="fa-solid fa-tag input-icon"></i>
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
            this.aperturaData.inventario = [];
            document.querySelectorAll('#apertura-inventario-container .dynamic-row').forEach(row => {
                const nombre = row.querySelector('.apertura-inv-nombre').value;
                const stock = parseFloat(row.querySelector('.apertura-inv-stock').value) || 0;
                const costo = parseFloat(row.querySelector('.apertura-inv-costo').value) || 0;
                const precio = parseFloat(row.querySelector('.apertura-inv-precio').value) || 0;
                if(nombre && precio > 0) this.aperturaData.inventario.push({ nombre, stock, costo, precio });
            });
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
        console.log("Iniciando guardado de apertura completa...");
        try {
            const { fechaApertura, bancos, inventario, cxc, cxp, tarjetas, anticipos } = this.aperturaData;
            const cuentaAperturaId = 330;
            const cuentaCxcId = 120;
            const cuentaCxpId = 210;
            const cuentaInventarioId = 130;
            const cuentaAnticiposId = 220;

            // 1. Guardar info de empresa
            this.empresa.nombre = this.aperturaData.empresa.nombre;
            this.actualizarPerfilEmpresa();
            console.log("Paso 1: Información de empresa guardada.");

            // 2. Procesar Bancos (Activo)
            const cuentaBancoPadre = this.planDeCuentas.find(c => c.id === 110);
            if (!cuentaBancoPadre) throw new Error("No se encontró la cuenta padre de Bancos (ID 110).");

            bancos.forEach(banco => {
                const newAccount = { id: this.idCounter++, codigo: `${cuentaBancoPadre.codigo}.${this.planDeCuentas.filter(c=>c.parentId === 110).length + 1}`, nombre: banco.nombre, tipo: 'DETALLE', parentId: 110 };
                this.planDeCuentas.push(newAccount);
                this.crearAsiento(fechaApertura, `Saldo inicial ${banco.nombre}`, [
                    { cuentaId: newAccount.id, debe: banco.saldo, haber: 0 },
                    { cuentaId: cuentaAperturaId, debe: 0, haber: banco.saldo }
                ]);
            });
            console.log(`Paso 2: ${bancos.length} cuentas de banco procesadas.`);
            
            // 3. Procesar Inventario (Activo)
            const cuentaIngresosProd = this.planDeCuentas.find(c => c.codigo === '401.1');
            if (!cuentaIngresosProd) throw new Error("No se encontró la cuenta de Ingresos por Venta de Mercancía (401.1).");

            inventario.forEach(item => {
                const nuevoProducto = { ...item, id: this.idCounter++, tipo: item.stock > 0 ? 'producto' : 'servicio', cuentaIngresoId: cuentaIngresosProd.id };
                this.productos.push(nuevoProducto);
                const valorInventario = item.costo * item.stock;
                if (valorInventario > 0) {
                     this.crearAsiento(fechaApertura, `Inventario inicial ${item.nombre}`, [
                        { cuentaId: cuentaInventarioId, debe: valorInventario, haber: 0 },
                        { cuentaId: cuentaAperturaId, debe: 0, haber: valorInventario }
                    ]);
                }
            });
            console.log(`Paso 3: ${inventario.length} productos de inventario procesados.`);
            
            // 4. Procesar CxC (Activo)
            cxc.forEach(factura => {
                let cliente = this.contactos.find(c => c.nombre.toLowerCase() === factura.contacto.toLowerCase() && c.tipo === 'cliente');
                if(!cliente) {
                    cliente = { id: this.idCounter++, nombre: factura.contacto, tipo: 'cliente' };
                    this.contactos.push(cliente);
                }
                const nuevaVenta = { id: this.idCounter++, tipo: 'venta', fecha: factura.fecha, contactoId: cliente.id, items: [], subtotal: factura.monto, impuesto: 0, total: factura.monto, estado: 'Pendiente', refOriginal: factura.ref, montoPagado: 0 };
                this.transacciones.push(nuevaVenta);
                this.crearAsiento(factura.fecha, `Saldo inicial CxC ${cliente.nombre} #${factura.ref}`, [
                    { cuentaId: cuentaCxcId, debe: factura.monto, haber: 0 },
                    { cuentaId: cuentaAperturaId, debe: 0, haber: factura.monto }
                ], nuevaVenta.id);
            });
            console.log(`Paso 4: ${cxc.length} cuentas por cobrar procesadas.`);
            
            // 5. Procesar Tarjetas de Crédito (Pasivo)
            const cuentaTarjetaPadre = this.planDeCuentas.find(c => c.id === 230);
            if (!cuentaTarjetaPadre) throw new Error("No se encontró la cuenta padre de Tarjetas (ID 230).");

            tarjetas.forEach(tarjeta => {
                const newAccount = { id: this.idCounter++, codigo: `${cuentaTarjetaPadre.codigo}.${this.planDeCuentas.filter(c=>c.parentId === 230).length + 1}`, nombre: tarjeta.nombre, tipo: 'DETALLE', parentId: 230 };
                this.planDeCuentas.push(newAccount);
                this.crearAsiento(fechaApertura, `Saldo inicial ${tarjeta.nombre}`, [
                    { cuentaId: cuentaAperturaId, debe: tarjeta.saldo, haber: 0 },
                    { cuentaId: newAccount.id, debe: 0, haber: tarjeta.saldo }
                ]);
            });
            console.log(`Paso 5: ${tarjetas.length} tarjetas de crédito procesadas.`);

            // 6. Procesar Anticipos de Clientes (Pasivo)
            anticipos.forEach(anticipo => {
                let cliente = this.contactos.find(c => c.nombre.toLowerCase() === anticipo.contacto.toLowerCase() && c.tipo === 'cliente');
                if(!cliente) {
                    cliente = { id: this.idCounter++, nombre: anticipo.contacto, tipo: 'cliente' };
                    this.contactos.push(cliente);
                }
                const nuevaTransaccion = { id: this.idCounter++, tipo: 'anticipo', fecha: fechaApertura, contactoId: cliente.id, total: anticipo.monto, refOriginal: 'Saldo Inicial', saldoAplicado: 0 };
                this.transacciones.push(nuevaTransaccion);
                this.crearAsiento(fechaApertura, `Anticipo inicial de ${cliente.nombre}`, [
                    { cuentaId: cuentaAperturaId, debe: anticipo.monto, haber: 0 },
                    { cuentaId: cuentaAnticiposId, debe: 0, haber: anticipo.monto }
                ], nuevaTransaccion.id);
            });
            console.log(`Paso 6: ${anticipos.length} anticipos de clientes procesados.`);

            // 7. Procesar CxP (Pasivo)
            cxp.forEach(factura => {
                let proveedor = this.contactos.find(c => c.nombre.toLowerCase() === factura.contacto.toLowerCase() && c.tipo === 'proveedor');
                if(!proveedor) {
                    proveedor = { id: this.idCounter++, nombre: factura.contacto, tipo: 'proveedor' };
                    this.contactos.push(proveedor);
                }
                const nuevoGasto = { id: this.idCounter++, tipo: 'gasto', fecha: factura.fecha, contactoId: proveedor.id, descripcion: `Saldo inicial Factura #${factura.ref}`, subtotal: factura.monto, impuesto: 0, total: factura.monto, estado: 'Pendiente', montoPagado: 0 };
                this.transacciones.push(nuevoGasto);
                this.crearAsiento(factura.fecha, `Saldo inicial CxP ${proveedor.nombre} #${factura.ref}`, [
                    { cuentaId: cuentaAperturaId, debe: factura.monto, haber: 0 },
                    { cuentaId: cuentaCxpId, debe: 0, haber: factura.monto }
                ], nuevoGasto.id);
            });
            console.log(`Paso 7: ${cxp.length} cuentas por pagar procesadas.`);

            // Finalizar
            console.log("Todos los pasos completados. Llamando a saveAll()...");
            this.saveAll();
            this.showToast('¡Configuración completada! Bienvenido.', 'success');
            document.getElementById('modal-bg').onclick = () => ContaApp.closeModal();
            this.closeModal();
            this.irModulo('dashboard');
        } catch (error) {
            console.error("Error crítico durante guardarAperturaCompleta:", error);
            this.showToast(`Error de configuración: ${error.message}`, 'error');
        }
    },

            irModulo(mod, params = {}) {
        // --- INICIO DE LA MEJORA DE ROBUSTEZ ---
        // Si la licencia aún no se ha cargado, no hacer nada para evitar errores.
        if (!this.licencia) {
            console.warn(`Intento de navegar al módulo '${mod}' antes de que la licencia esté cargada. Abortando.`);
            return;
        }
        // --- FIN DE LA MEJORA DE ROBUSTEZ ---

        // -------------------------------------------------------------------
        // INICIO DEL BLOQUE DE LICENCIA (AHORA ACTIVADO)
        // -------------------------------------------------------------------
        const mapaLicencias = {
            'inventario': 'INVENTARIO_BASE',
            'bancos': 'FINANZAS_AVANZADO',
            'cierre-periodo': 'CONTABILIDAD_AVANZADO',
        };

        const licenciaRequerida = mapaLicencias[mod];
        
        if (licenciaRequerida) {
            const tieneLicencia = this.licencia.modulosActivos.includes(licenciaRequerida);
            
            if (!tieneLicencia) {
                const contentArea = document.getElementById('content-area');
                document.querySelectorAll('#content-area > div').forEach(el => el.style.display = 'none');
                
                const elToShow = document.getElementById(mod);
                if (elToShow) {
                    elToShow.innerHTML = this.generarEstadoVacioHTML(
                        'fa-lock',
                        'Módulo Bloqueado',
                        `Esta funcionalidad no está incluida en tu paquete "${this.licencia.paquete}". Contacta a soporte para actualizar tu plan.`,
                        'Volver al Dashboard',
                        "ContaApp.irModulo('dashboard')"
                    );
                    elToShow.style.display = "block";
                }
                
                this.showToast(`El módulo '${mod}' requiere un paquete superior.`, 'error');
                return;
            }
        }
        // -----------------------------------------------------------------
        // FIN DEL BLOQUE DE LICENCIA (AHORA ACTIVADO)
        // -----------------------------------------------------------------

        const hasNewFilterParams = params.hasOwnProperty('search') || params.hasOwnProperty('startDate') || params.hasOwnProperty('endDate') || params.hasOwnProperty('estado');
        if (!hasNewFilterParams && this.moduleFilters[mod]) {
            params = { ...this.moduleFilters[mod], ...params };
        } else {
            this.moduleFilters[mod] = params;
        }

        if (this.isFormDirty) {
            this.showConfirm(
                "Tienes cambios sin guardar. ¿Estás seguro de que quieres salir y descartarlos?",
                () => {
                    this.isFormDirty = false;
                    this.irModulo(mod, params);
                }
            );
            return;
        }

        const lastState = this.navigationHistory[this.navigationHistory.length - 1];
        if (!lastState || lastState.mod !== mod || JSON.stringify(lastState.params) !== JSON.stringify(params)) {
            this.navigationHistory.push({ mod, params });
        }
        
        const backButton = document.getElementById('back-button');
        if (backButton) {
            backButton.disabled = this.navigationHistory.length <= 1;
        }

        const loader = document.getElementById('module-loader');
        const contentArea = document.getElementById('content-area');
        loader.classList.remove('hidden');
        contentArea.style.opacity = '0';
        
        setTimeout(() => {
            let elToShow;
            try {
                document.querySelectorAll('#content-area > div').forEach(el => el.style.display = 'none');
                document.querySelectorAll('.conta-nav-link').forEach(el => el.classList.remove('active'));
                
                elToShow = document.getElementById(mod);
                if (elToShow) {
                    elToShow.style.display = "block";
                    elToShow.classList.remove('animate-fadeInUp');
                    void elToShow.offsetWidth;
                    elToShow.classList.add('animate-fadeInUp');
                }
                
                const navLink = document.getElementById("nav-" + mod);
                if (navLink) navLink.classList.add("active");

                const moduleTitle = navLink ? navLink.innerText.trim() : mod.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                
                if (!params.clienteId && !params.proveedorId) {
                    document.getElementById('page-title-header').innerText = moduleTitle;
                }
                document.title = `${this.empresa.nombre} - ${moduleTitle}`;
                
                document.getElementById('page-actions-header').innerHTML = '';
                
                const moduleRenderers = {
                    'dashboard': this.renderDashboard,
                    'ventas': this.renderVentas,
                    'cxc': (p) => p.clienteId ? this.renderCXCDetalleCliente(p.clienteId, p) : this.renderCXC(p),
                    'gastos': this.renderGastos,
                    'cxp': (p) => p.proveedorId ? this.renderCXPDetalleProveedor(p.proveedorId, p) : this.renderCXP(p),
                    'inventario': this.renderInventario,
                    'plan-de-cuentas': this.renderPlanDeCuentas,
                    'diario-general': this.renderDiarioGeneral,
                    'cierre-periodo': this.renderCierrePeriodo,
                    'bancos': this.renderBancosYTarjetas,
                    'reportes': this.renderReportes,
                    'config': this.renderConfig
                };
                
                if (moduleRenderers[mod]) {
                    moduleRenderers[mod].call(this, params);
                }

                if (params.action === 'new' && mod === 'ventas' && params.anticipoId) {
                    setTimeout(() => { this.abrirModalVenta(params.clienteId, params.anticipoId); }, 100);
                }
            } catch(e) {
                console.error(`Error al renderizar el módulo ${mod}:`, e);
                this.showToast(`Error al cargar el módulo ${mod}`, 'error');
                if(elToShow) elToShow.innerHTML = `<div class="conta-card conta-text-danger"><h3>Error Crítico</h3><p>Error al cargar el módulo <strong>${mod}</strong>. Revisa la consola para más detalles técnicos.</p><pre class="mt-4 p-2 bg-[var(--color-bg-accent)] rounded text-xs">${e.stack}</pre></div>`;
            } finally {
                loader.classList.add('hidden');
                contentArea.style.opacity = '1';
            }
        }, 50);
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
            activosFijos: this.activosFijos, // <-- LÍNEA AÑADIDA
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
                pdfColor: '#1877f2'
            },
            // --- INICIO DE LA MODIFICACIÓN DE LICENCIA ---
            licencia: {
                cliente: "Usuario Principal",
                paquete: "Profesional", // Nombre del paquete actualizado
                modulosActivos: [
                    "VENTAS", "GASTOS", "CXC", "CXP",
                    "PLAN_DE_CUENTAS", "DIARIO_GENERAL",
                    "CONFIGURACION",
                    // Módulos Avanzados (Paquete Crecimiento / Profesional)
                    "INVENTARIO_BASE",
                    "FINANZAS_AVANZADO",
                    "CONTABILIDAD_AVANZADO",
                    "REPORTES_AVANZADOS",
                    // Módulos Futuros (Paquete ERP)
                    "ACTIVOS_AVANZADOS",
                    "PRODUCCION",
                    "NOMINAS"
                ]
            },
            // --- FIN DE LA MODIFICACIÓN DE LICENCIA ---
            idCounter: 1000,
            planDeCuentas: this.getPlanDeCuentasDefault(),
            asientos: [],
            transacciones: [],
            contactos: [],
            productos: [],
            recurrentes: [],
            activosFijos: [],
            bancoImportado: {}
        };
        
        if (dataString) {
            const data = JSON.parse(dataString);
            this.empresa = { ...defaultData.empresa, ...data.empresa };
            // Aseguramos que si se cargan datos viejos sin licencia, se asigne la por defecto
            this.licencia = data.licencia || defaultData.licencia; 
            this.idCounter = data.idCounter || defaultData.idCounter;
            this.planDeCuentas = (data.planDeCuentas && data.planDeCuentas.length > 0) ? data.planDeCuentas : defaultData.planDeCuentas;
            this.asientos = data.asientos || defaultData.asientos;
            this.transacciones = data.transacciones || defaultData.transacciones;
            this.contactos = data.contactos || defaultData.contactos;
            this.productos = data.productos || defaultData.productos;
            this.recurrentes = data.recurrentes || defaultData.recurrentes;
            this.activosFijos = data.activosFijos || [];
            this.bancoImportado = data.bancoImportado || defaultData.bancoImportado;

            if (!this.empresa.presupuestos) this.empresa.presupuestos = {};
            if (!this.empresa.dashboardWidgets) this.empresa.dashboardWidgets = defaultData.empresa.dashboardWidgets;
            if (!this.empresa.dashboardContentWidgets || !this.empresa.dashboardContentWidgets.order) {
                this.empresa.dashboardContentWidgets = defaultData.empresa.dashboardContentWidgets;
            }
            if (!this.empresa.dashboardLayout) this.empresa.dashboardLayout = defaultData.empresa.dashboardLayout;
        } else {
            Object.assign(this, defaultData);
        }
    },

    actualizarPerfilEmpresa(){ 
        document.querySelector("#side-logo").src = this.empresa.logo || 'images/logo.png'; 
        document.querySelector(".conta-nav-title").innerText = this.empresa.nombre || 'ContaApp Pro'; 
    },
    
    // Lógica Contable Principal
            getPlanDeCuentasDefault() {
        return [
            { id: 100, codigo: '100', nombre: 'ACTIVOS', tipo: 'TITULO', parentId: null },
            { id: 110, codigo: '110', nombre: 'Efectivo y Equivalentes', tipo: 'CONTROL', parentId: 100 },
            { id: 11001, codigo: '110.1', nombre: 'Caja General', tipo: 'DETALLE', parentId: 110 },
            { id: 120, codigo: '120', nombre: 'Cuentas por Cobrar', tipo: 'DETALLE', parentId: 100 },
            { id: 130, codigo: '130', nombre: 'Inventario', tipo: 'DETALLE', parentId: 100 },
            { id: 140, codigo: '140', nombre: 'IVA Crédito Fiscal', tipo: 'DETALLE', parentId: 100 },
            // ===== NUEVAS CUENTAS DE ACTIVOS FIJOS =====
            { id: 150, codigo: '150', nombre: 'Propiedad, Planta y Equipo', tipo: 'CONTROL', parentId: 100 },
            { id: 15001, codigo: '150.1', nombre: 'Mobiliario y Equipo de Oficina', tipo: 'DETALLE', parentId: 150 },
            { id: 159, codigo: '159', nombre: 'Depreciación Acumulada', tipo: 'CONTROL', parentId: 100 },
            { id: 15901, codigo: '159.1', nombre: 'Dep. Acum. Mobiliario y Equipo', tipo: 'DETALLE', parentId: 159 },
            // ===========================================
            { id: 200, codigo: '200', nombre: 'PASIVOS', tipo: 'TITULO', parentId: null },
            { id: 210, codigo: '210', nombre: 'Cuentas por Pagar', tipo: 'DETALLE', parentId: 200 },
            { id: 220, codigo: '220', nombre: 'Anticipos de Clientes', tipo: 'DETALLE', parentId: 200 },
            { id: 230, codigo: '230', nombre: 'Tarjetas de Crédito', tipo: 'CONTROL', parentId: 200 },
            { id: 23001, codigo: '230.1', nombre: 'Tarjeta de Crédito Principal', tipo: 'DETALLE', parentId: 230 },
            { id: 240, codigo: '240', nombre: 'IVA Débito Fiscal', tipo: 'DETALLE', parentId: 200 },
            { id: 300, codigo: '300', nombre: 'PATRIMONIO', tipo: 'TITULO', parentId: null },
            { id: 310, codigo: '310', nombre: 'Capital Social', tipo: 'DETALLE', parentId: 300 },
            { id: 320, codigo: '320', nombre: 'Resultados Acumulados', tipo: 'DETALLE', parentId: 300 },
            { id: 330, codigo: '330', nombre: 'Utilidades de Apertura', tipo: 'DETALLE', parentId: 300 },
            { id: 400, codigo: '400', nombre: 'INGRESOS', tipo: 'TITULO', parentId: null },
            { id: 401, codigo: '401', nombre: 'Ingresos por Venta de Productos', tipo: 'CONTROL', parentId: 400 },
            { id: 40101, codigo: '401.1', nombre: 'Venta de Mercancía', tipo: 'DETALLE', parentId: 401 },
            { id: 410, codigo: '410', nombre: 'Ingresos por Venta de Servicios', tipo: 'CONTROL', parentId: 400 },
            { id: 41001, codigo: '410.1', nombre: 'Servicios Generales', tipo: 'DETALLE', parentId: 410 },
            { id: 420, codigo: '420', nombre: 'Descuentos y Devoluciones en Venta', tipo: 'DETALLE', parentId: 400 },
            { id: 500, codigo: '500', nombre: 'GASTOS', tipo: 'TITULO', parentId: null },
            { id: 501, codigo: '501', nombre: 'Costo de Ventas', tipo: 'DETALLE', parentId: 500 },
            { id: 510, codigo: '510', nombre: 'Gastos Operativos', tipo: 'CONTROL', parentId: 500 },
            { id: 51001, codigo: '510.1', nombre: 'Sueldos y Salarios', tipo: 'DETALLE', parentId: 510 },
            { id: 51002, codigo: '510.2', nombre: 'Alquiler', tipo: 'DETALLE', parentId: 510 },
            { id: 51003, codigo: '510.3', nombre: 'Merma de Inventario', tipo: 'DETALLE', parentId: 510 },
            // ===== NUEVA CUENTA DE GASTO =====
            { id: 51004, codigo: '510.4', nombre: 'Gasto por Depreciación', tipo: 'DETALLE', parentId: 510 },
            // =================================
        ];
    },
    crearAsiento(fecha, descripcion, movimientos, transaccionId) {
        // INICIO DE MEJORA: Bloqueo de períodos cerrados
        if (this.empresa.ultimoCierre && fecha <= this.empresa.ultimoCierre) {
            this.showToast(`Error: El período hasta ${this.empresa.ultimoCierre} está cerrado. No se pueden registrar transacciones en o antes de esta fecha.`, 'error');
            return null;
        }
        // FIN DE MEJORA

        const totalDebe = movimientos.reduce((sum, t) => sum + t.debe, 0);
        const totalHaber = movimientos.reduce((sum, t) => sum + t.haber, 0);
        if (Math.abs(totalDebe - totalHaber) > 0.01) {
            console.error("Asiento descuadrado:", { totalDebe, totalHaber, movimientos });
            this.showToast(`Error: Asiento descuadrado. Debe=${this.formatCurrency(totalDebe)}, Haber=${this.formatCurrency(totalHaber)}`, 'error');
            return null;
        }
        const asiento = { id: this.idCounter++, fecha, descripcion, movimientos, transaccionId };
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
                    const esDeudora = ['1', '5'].includes(cuenta.codigo[0]);
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
        let html = '';

        if (results.cuentas.length > 0) {
            html += `<div class="search-result-group"><h4>Cuentas Contables</h4>`;
            results.cuentas.slice(0, 5).forEach(c => {
                html += `<div class="search-result-item" onclick="ContaApp.irACuentaDesdeBusqueda(${c.id})">
                    <div class="result-icon"><i class="fa-solid fa-book"></i></div>
                    <div class="result-text">
                        <div class="main">${c.nombre}</div>
                        <div class="sub">Código: ${c.codigo}</div>
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
                        <div class="main">Factura #${v.numeroFactura || v.id}</div>
                        <div class="sub">${cliente?.nombre || 'N/A'} - ${this.formatCurrency(v.total)}</div>
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
                        <div class="main">${g.descripcion}</div>
                        <div class="sub">${proveedor?.nombre || 'N/A'} - ${this.formatCurrency(g.total)}</div>
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
                        <div class="main">${c.nombre}</div>
                        <div class="sub">${c.email || 'Cliente'}</div>
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
                        <div class="main">${p.nombre}</div>
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
};
