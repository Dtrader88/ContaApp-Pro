/* global firebase */

export class DataRepository {
    constructor() {
        if (this.constructor === DataRepository) {
            throw new Error("La clase DataRepository no puede ser instanciada directamente. Es una clase abstracta.");
        }
    }

    /**
     * Carga todos los datos iniciales de la aplicación.
     * @returns {Promise<string|null>} Una promesa que resuelve a un string JSON con los datos, o null si no hay datos.
     */
    async loadAll() {
        throw new Error("El método 'loadAll' debe ser implementado por la clase hija.");
    }

    /**
     * Guarda el estado completo de la aplicación.
     * @param {object} dataToSave - El objeto completo de datos de la aplicación a guardar.
     * @returns {Promise<void>}
     */
    async saveAll(dataToSave) {
        throw new Error("El método 'saveAll' debe ser implementado por la clase hija.");
    }
    
    /**
     * Actualiza campos específicos del documento principal del workspace.
     * Esencial para la transición a una API, donde las actualizaciones son más granulares.
     * @param {object} datosParaActualizar - Un objeto con los campos a actualizar (ej. { productos: [...], asientos: [...] }).
     * @returns {Promise<void>}
     */
    async actualizarMultiplesDatos(datosParaActualizar) {
        throw new Error("El método 'actualizarMultiplesDatos' debe ser implementado por la clase hija.");
    }
}


/**
 * Implementación del Repositorio de Datos que utiliza Firebase Firestore como backend.
 */
export class FirebaseRepository extends DataRepository {
    constructor(userId) {
        super(); // Llama al constructor de la clase padre
        if (!userId) throw new Error("Se requiere un ID de usuario para el repositorio.");
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.userId = userId;
        this.workspaceId = null;
    }

    async _getWorkspaceId() {
        if (this.workspaceId) return this.workspaceId;
        
        const userProfileRef = this.db.collection("usuarios").doc(this.userId);
        const doc = await userProfileRef.get();
        if (doc.exists) {
            this.workspaceId = doc.data().workspaceId;
            return this.workspaceId;
        }
        console.warn("No se pudo encontrar el perfil del usuario para obtener el workspaceId.");
        return null;
    }

    async loadAll() {
        console.log("Cargando datos desde: Firestore...");
        const workspaceId = await this._getWorkspaceId();
        if (!workspaceId) {
            console.log("No se encontró workspaceId para este usuario. Se asumirá que es un usuario nuevo.");
            return null;
        }

        const docRef = this.db.collection("workspaces").doc(workspaceId);
        try {
            const doc = await docRef.get();
            return doc.exists ? JSON.stringify(doc.data()) : null;
        } catch (error) {
            console.error("Error al cargar datos de Firestore:", error);
            return null;
        }
    }

    async saveAll(dataToSave) {
        console.log("Guardando datos en: Firestore...");
        if (!this.workspaceId) {
            await this._getWorkspaceId();
            if (!this.workspaceId) {
                throw new Error("No se puede guardar: workspaceId no encontrado o no asignado.");
            }
        }
        const sanitizedData = this._sanitizeData(dataToSave);
        const docRef = this.db.collection("workspaces").doc(this.workspaceId);
        try {
            await docRef.set(sanitizedData);
            console.log("¡Datos guardados en Firestore con éxito!");
        } catch (error) {
            console.error("Error al guardar datos en Firestore:", error);
            throw error;
        }
    }
    
    async actualizarMultiplesDatos(datosParaActualizar) {
    console.log(`Actualizando múltiples datos en Firestore...`, datosParaActualizar);
    const workspaceId = await this._getWorkspaceId();
    if (!workspaceId) throw new Error("Workspace no encontrado.");

    const docRef = this.db.collection("workspaces").doc(workspaceId);

    try {
        // --- INICIO DE LA CORRECIÓN ---
        // Sanitizamos los datos antes de enviarlos para eliminar cualquier valor 'undefined'.
        const datosSanitizados = this._sanitizeData(datosParaActualizar);
        // --- FIN DE LA CORRECCIÓN ---

        // Usamos .set con merge:true que es equivalente a un update, pero con los datos ya limpios.
        await docRef.set(datosSanitizados, { merge: true });
        console.log("Múltiples datos actualizados con éxito.");
    } catch (error) {
        console.error("Error al actualizar múltiples datos:", error);
        throw error;
    }
}
    async getPaginatedTransactions(params) {
        const { page = 1, perPage = 20, filters = {}, sort = { column: 'fecha', order: 'desc' } } = params;
        console.log("Solicitando transacciones paginadas con:", params);

        const workspaceId = await this._getWorkspaceId();
        if (!workspaceId) return { data: [], totalItems: 0 };
        
        const docRef = this.db.collection("workspaces").doc(workspaceId);
        const doc = await docRef.get();
        if (!doc.exists) return { data: [], totalItems: 0 };
        
        let allTransactions = doc.data().transacciones || [];
        
        let filteredData = allTransactions.filter(t => {
            if (filters.tipos && !filters.tipos.includes(t.tipo)) {
                return false;
            }
            if (filters.startDate && t.fecha < filters.startDate) {
                return false;
            }
            if (filters.endDate && t.fecha > filters.endDate) {
                return false;
            }
            if (filters.clienteId && t.contactoId !== parseInt(filters.clienteId)) {
                return false;
            }
            if (filters.estado && filters.estado !== 'Todas' && (t.estado || 'Pendiente') !== filters.estado) {
                return false;
            }
            if (filters.minTotal && t.total < parseFloat(filters.minTotal)) {
                return false;
            }
            if (filters.maxTotal && t.total > parseFloat(filters.maxTotal)) {
                return false;
            }
            if (filters.itemId) {
                const [tipo, id] = filters.itemId.split('-');
                const itemIdNum = parseInt(id);
                const itemEncontrado = (t.items || []).some(item => 
                    (tipo === 'P' && item.itemType === 'producto' && item.productoId === itemIdNum) ||
                    (tipo === 'S' && item.itemType === 'servicio' && item.cuentaId === itemIdNum)
                );
                if (!itemEncontrado) return false;
            }
            
            // ===== INICIO DE LÓGICA DE BÚSQUEDA MEJORADA =====
            if (filters.search) {
                const term = filters.search.toLowerCase();
                const contacto = ContaApp.findById(doc.data().contactos || [], t.contactoId);
                const numeroDoc = t.numeroFactura || t.numeroNota || t.id.toString() || '';
                
                const matchesContacto = contacto && contacto.nombre.toLowerCase().includes(term);
                const matchesNumero = numeroDoc.toLowerCase().includes(term);
                const matchesDescripcion = t.descripcion && t.descripcion.toLowerCase().includes(term);

                if (!matchesContacto && !matchesNumero && !matchesDescripcion) return false;
            }
            // ===== FIN DE LÓGICA DE BÚSQUEDA MEJORADA =====

            return true;
        });

        const totalItems = filteredData.length;

        filteredData.sort((a, b) => {
            let valA, valB;
            if (sort.column === 'contacto') { // Genérico para cliente o proveedor
                valA = ContaApp.findById(doc.data().contactos || [], a.contactoId)?.nombre || '';
                valB = ContaApp.findById(doc.data().contactos || [], b.contactoId)?.nombre || '';
            } else {
                valA = a[sort.column];
                valB = b[sort.column];
            }
            if (typeof valA === 'string') {
                return sort.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else {
                return sort.order === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
            }
        });
        
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        const paginatedData = filteredData.slice(startIndex, endIndex);

        return { data: paginatedData, totalItems };
    }
    async getFullData() {
        console.log("Cargando datos completos bajo demanda para un módulo...");
        const workspaceId = await this._getWorkspaceId();
        if (!workspaceId) {
            console.log("No se encontró workspaceId para este usuario.");
            return null;
        }

        const docRef = this.db.collection("workspaces").doc(workspaceId);
        try {
            const doc = await docRef.get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error("Error al cargar datos completos de Firestore:", error);
            return null;
        }
    }
    async getPaginatedAsientos(params) {
    const { page = 1, perPage = 20, filters = {}, sort = { column: 'fecha', order: 'desc' } } = params;
    console.log("Solicitando asientos paginados con:", params);

    const workspaceId = await this._getWorkspaceId();
    if (!workspaceId) return { data: [], totalItems: 0 };
    
    const docRef = this.db.collection("workspaces").doc(workspaceId);
    const doc = await docRef.get();
    if (!doc.exists) return { data: [], totalItems: 0 };
    
    let allAsientos = doc.data().asientos || [];
    
    let filteredData = allAsientos.filter(a => {
        if (filters.startDate && a.fecha < filters.startDate) {
            return false;
        }
        if (filters.endDate && a.fecha > filters.endDate) {
            return false;
        }
        if (filters.search) {
            const term = filters.search.toLowerCase();
            const matchesId = a.id.toString().includes(term);
            const matchesDescripcion = a.descripcion.toLowerCase().includes(term);
            if (!matchesId && !matchesDescripcion) return false;
        }
        return true;
    });

    const totalItems = filteredData.length;

    filteredData.sort((a, b) => {
        const valA = a[sort.column];
        const valB = b[sort.column];
        const safeA = valA === null || valA === undefined ? '' : valA;
        const safeB = valB === null || valB === undefined ? '' : valB;

        // --- INICIO DE LA CORRECCIÓN ---
        // Lógica de comparación primaria
        let primaryCompare = 0;
        if (typeof safeA === 'string' || typeof safeB === 'string') {
            primaryCompare = String(safeA).localeCompare(String(safeB));
        } else {
            primaryCompare = safeA - safeB;
        }

        // Aplicar orden ascendente o descendente a la comparación primaria
        const orderedCompare = sort.order === 'asc' ? primaryCompare : -primaryCompare;

        // Si la comparación primaria da un resultado (no son iguales), lo retornamos
        if (orderedCompare !== 0) {
            return orderedCompare;
        }

        // Criterio de desempate: Siempre ordenar por timestamp descendente
        // Se añade un fallback por si asientos muy antiguos no tienen timestamp
        return (b.timestamp || '1970-01-01').localeCompare(a.timestamp || '1970-01-01');
        // --- FIN DE LA CORRECCIÓN ---
    });
    
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return { data: paginatedData, totalItems };
}
    // NOTA: getDatosDashboard se mantiene aquí por ahora, ya que contiene lógica de negocio
    // que eventualmente vivirá en el backend, no en el repositorio genérico.
    async getDatosDashboard() {
        console.log("Obteniendo datos para el Dashboard desde Firestore...");
        const workspaceId = await this._getWorkspaceId();
        if (!workspaceId) throw new Error("Workspace no encontrado.");

        const docRef = this.db.collection("workspaces").doc(workspaceId);
        const doc = await docRef.get();
        if (!doc.exists) return null;

        const data = doc.data();
        const asientos = data.asientos || [];
        const planDeCuentas = data.planDeCuentas || [];

        const hoy = new Date();
        const finPeriodoActual = hoy.toISOString().slice(0, 10);
        const inicioPeriodoActual = new Date(new Date().setDate(hoy.getDate() - 30)).toISOString().slice(0, 10);
        const finPeriodoAnterior = new Date(new Date().setDate(hoy.getDate() - 31)).toISOString().slice(0, 10);
        const inicioPeriodoAnterior = new Date(new Date().setDate(hoy.getDate() - 60)).toISOString().slice(0, 10);

        const getSaldosPorCodigo = (fechaFin, fechaInicio) => {
            const saldos = {};
            planDeCuentas.forEach(c => saldos[c.id] = 0);

            const asientosFiltrados = asientos.filter(a => a.fecha >= fechaInicio && a.fecha <= fechaFin);
            asientosFiltrados.forEach(asiento => {
                (asiento.movimientos || []).forEach(mov => {
                    const cuenta = planDeCuentas.find(c => c.id === mov.cuentaId);
                    if (cuenta) {
                        const esDeudora = ['1', '5', '6'].includes(String(cuenta.codigo)[0]);
                        saldos[cuenta.id] += esDeudora ? (mov.debe - mov.haber) : (mov.haber - mov.debe);
                    }
                });
            });
            return saldos;
        };
        
        const saldosActual = getSaldosPorCodigo(finPeriodoActual, inicioPeriodoActual);
        const saldosAnterior = getSaldosPorCodigo(finPeriodoAnterior, inicioPeriodoAnterior);

        const sumaPorGrupo = (saldos, grupo) => {
            return planDeCuentas.filter(c => String(c.codigo).startsWith(grupo))
                .reduce((sum, c) => sum + (saldos[c.id] || 0), 0);
        };
        
        const ingresosPeriodo = sumaPorGrupo(saldosActual, '4');
        const gastosPeriodo = sumaPorGrupo(saldosActual, '6');
        const ingresosPeriodoAnterior = sumaPorGrupo(saldosAnterior, '4');
        const gastosPeriodoAnterior = sumaPorGrupo(saldosAnterior, '6');

        return { 
            ingresosPeriodo, 
            gastosPeriodo,
            ingresosPeriodoAnterior,
            gastosPeriodoAnterior
        };
    }
    generarUUID() {
    return crypto.randomUUID();
}

    _sanitizeData(data) {
        if (data === undefined) return null;
        if (data === null || typeof data !== 'object') return data;
        if (Array.isArray(data)) return data.map(item => this._sanitizeData(item));
        const sanitizedObject = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                sanitizedObject[key] = this._sanitizeData(data[key]);
            }
        }
        return sanitizedObject;
    }
}