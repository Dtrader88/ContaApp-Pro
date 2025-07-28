class FirebaseRepository {
    constructor(userId) {
        if (!userId) throw new Error("Se requiere un ID de usuario para el repositorio.");
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.userId = userId;
        this.workspaceId = null; // Lo obtendremos al cargar
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
            // Si no tenemos un workspaceId, intentamos obtenerlo de nuevo.
            // Esto es crucial para la primera acción de guardado de un nuevo usuario.
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
}