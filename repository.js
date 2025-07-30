/* global firebase */

export class FirebaseRepository {
    constructor(userId) {
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
        }
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

    async guardarContacto(contactoData) {
        console.log(`Guardando contacto en Firestore...`);
        const workspaceId = await this._getWorkspaceId();
        if (!workspaceId) throw new Error("Workspace no encontrado.");
        
        const contactoRef = this.db.collection("workspaces").doc(workspaceId);
        
        try {
            await contactoRef.update({
                contactos: firebase.firestore.FieldValue.arrayUnion(contactoData)
            });
            console.log("Contacto añadido con éxito.");
        } catch (error) {
            console.error("Error al añadir contacto:", error);
            if (error.code === 'not-found' || error.message.includes("No document to update")) {
                 await contactoRef.set({ contactos: [contactoData] }, { merge: true });
                 console.log("Campo 'contactos' creado y contacto añadido.");
            } else {
                throw error;
            }
        }
    }

    async actualizarContacto(contactoActualizado) {
        console.log(`Actualizando contacto en Firestore...`);
        const workspaceId = await this._getWorkspaceId();
        if (!workspaceId) throw new Error("Workspace no encontrado.");
        
        const docRef = this.db.collection("workspaces").doc(workspaceId);
        const doc = await docRef.get();
        if (!doc.exists) throw new Error("Documento del workspace no encontrado.");

        const data = doc.data();
        const contactos = data.contactos || [];
        const index = contactos.findIndex(c => c.id === contactoActualizado.id);

        if (index > -1) {
            contactos[index] = contactoActualizado;
            await docRef.update({ contactos: contactos });
            console.log("Contacto actualizado con éxito.");
        } else {
            throw new Error("No se encontró el contacto a actualizar.");
        }
    }

    async eliminarContacto(contactoId) {
        console.log(`Eliminando contacto de Firestore...`);
        const workspaceId = await this._getWorkspaceId();
        if (!workspaceId) throw new Error("Workspace no encontrado.");

        const docRef = this.db.collection("workspaces").doc(workspaceId);
        const doc = await docRef.get();
        if (!doc.exists) throw new Error("Documento del workspace no encontrado.");

        const data = doc.data();
        let contactos = data.contactos || [];
        const contactoAEliminar = contactos.find(c => c.id === contactoId);

        if (contactoAEliminar) {
            await docRef.update({
                contactos: firebase.firestore.FieldValue.arrayRemove(contactoAEliminar)
            });
            console.log("Contacto eliminado con éxito.");
        } else {
            console.warn("Se intentó eliminar un contacto que ya no existía en Firestore.");
        }
    }

    async guardarProducto(productoData) {
        console.log(`Guardando producto en Firestore...`);
        const workspaceId = await this._getWorkspaceId();
        if (!workspaceId) throw new Error("Workspace no encontrado.");
        
        const productoRef = this.db.collection("workspaces").doc(workspaceId);
        
        try {
            await productoRef.update({
                productos: firebase.firestore.FieldValue.arrayUnion(productoData)
            });
            console.log("Producto añadido con éxito.");
        } catch (error) {
            console.error("Error al añadir producto:", error);
            if (error.code === 'not-found' || error.message.includes("No document to update")) {
                 await productoRef.set({ productos: [productoData] }, { merge: true });
                 console.log("Campo 'productos' creado y producto añadido.");
            } else {
                throw error;
            }
        }
    }

    async actualizarProducto(productoActualizado) {
        console.log(`Actualizando producto en Firestore...`);
        const workspaceId = await this._getWorkspaceId();
        if (!workspaceId) throw new Error("Workspace no encontrado.");
        
        const docRef = this.db.collection("workspaces").doc(workspaceId);
        const doc = await docRef.get();
        if (!doc.exists) throw new Error("Documento del workspace no encontrado.");

        const data = doc.data();
        const productos = data.productos || [];
        const index = productos.findIndex(p => p.id === productoActualizado.id);

        if (index > -1) {
            productos[index] = productoActualizado;
            await docRef.update({ productos: productos });
            console.log("Producto actualizado con éxito.");
        } else {
            throw new Error("No se encontró el producto a actualizar.");
        }
    }

    async actualizarMultiplesDatos(datosParaActualizar) {
        console.log(`Actualizando múltiples datos en Firestore...`);
        const workspaceId = await this._getWorkspaceId();
        if (!workspaceId) throw new Error("Workspace no encontrado.");

        const docRef = this.db.collection("workspaces").doc(workspaceId);

        try {
            await docRef.set(datosParaActualizar, { merge: true });
            console.log("Múltiples datos actualizados con éxito.");
        } catch (error) {
            console.error("Error al actualizar múltiples datos:", error);
            throw error;
        }
    }

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
            // --- INICIO DE LA CORRECCIÓN ---
            // Se añade (asiento.movimientos || []) para evitar errores si un asiento no tiene movimientos.
            (asiento.movimientos || []).forEach(mov => {
            // --- FIN DE LA CORRECCIÓN ---
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
}