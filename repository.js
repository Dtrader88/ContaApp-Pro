class LocalStorageRepository {
    loadAll() {
        console.log("Cargando datos desde: LocalStorage...");
        return localStorage.getItem("conta_app_data");
    }
    saveAll(dataToSave) {
        console.log("Guardando datos en: LocalStorage...");
        localStorage.setItem("conta_app_data", JSON.stringify(dataToSave));
    }
}

class FirebaseRepository {
    constructor(workspaceId) {
        if (!workspaceId) {
            throw new Error("Se requiere un ID de workspace para inicializar FirebaseRepository.");
        }
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.workspaceId = workspaceId;
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

    async loadAll() {
        console.log(`Cargando datos desde Firestore para el workspace: ${this.workspaceId}`);
        const docRef = this.db.collection("workspaces").doc(this.workspaceId);
        try {
            const doc = await docRef.get();
            return doc.exists ? JSON.stringify(doc.data()) : null;
        } catch (error) {
            console.error("Error al cargar datos de Firestore:", error);
            return null;
        }
    }

    async saveAll(dataToSave) {
        console.log(`Guardando datos en Firestore para el workspace: ${this.workspaceId}`);
        const sanitizedData = this._sanitizeData(dataToSave);
        const docRef = this.db.collection("workspaces").doc(this.workspaceId);
        try {
            await docRef.set(sanitizedData);
            console.log("¡Datos guardados en Firestore con éxito!");
        } catch (error) {
            console.error("Error al guardar datos en Firestore:", error);
        }
    }
}

class SQLiteRepository {
    loadAll() {
        console.error("SQLiteRepository.loadAll() no está implementado.");
        return null; 
    }
    saveAll(dataToSave) {
        console.error("SQLiteRepository.saveAll() no está implementado.");
    }
}