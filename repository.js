// Archivo: repository.js

/**
 * Repositorio para la versión web actual que usa el almacenamiento local del navegador.
 */
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

/**
 * Repositorio para la versión online (SaaS) usando Firebase.
 */
class FirebaseRepository {
    constructor() {
        this.db = firebase.firestore();
        this.auth = firebase.auth();
    }

    /**
     * Función de ayuda privada para limpiar datos antes de enviarlos a Firestore.
     * @param {any} data El objeto o array a limpiar.
     * @returns {any} Los datos limpios.
     */
    _sanitizeData(data) {
        if (data === undefined) {
            return null;
        }
        if (data === null || typeof data !== 'object') {
            return data;
        }
        if (Array.isArray(data)) {
            return data.map(item => this._sanitizeData(item));
        }
        const sanitizedObject = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                sanitizedObject[key] = this._sanitizeData(data[key]);
            }
        }
        return sanitizedObject;
    }

    async loadAll() {
        console.log("Cargando datos desde: Firestore...");
        const user = this.auth.currentUser;
        if (!user) {
            console.warn("Intento de carga sin usuario autenticado.");
            return null;
        }
        const docRef = this.db.collection("workspaces").doc(user.uid);
        try {
            const doc = await docRef.get();
            if (doc.exists) {
                return JSON.stringify(doc.data());
            } else {
                console.log("No se encontraron datos para este usuario. Se crearán al guardar.");
                return null;
            }
        } catch (error) {
            console.error("Error al cargar datos de Firestore:", error);
            return null;
        }
    }

    async saveAll(dataToSave) {
        console.log("Guardando datos en: Firestore...");
        const user = this.auth.currentUser;
        if (!user) {
            console.error("Intento de guardado sin usuario autenticado.");
            return;
        }
        
        const sanitizedData = this._sanitizeData(dataToSave);

        const docRef = this.db.collection("workspaces").doc(user.uid);
        try {
            await docRef.set(sanitizedData);
            console.log("¡Datos guardados en Firestore con éxito!");
        } catch (error) {
            console.error("Error al guardar datos en Firestore:", error);
        }
    }
}

/**
 * ESQUELETO FUTURO: Repositorio para la versión de escritorio (Offline) usando SQLite.
 */
class SQLiteRepository {
    loadAll() {
        console.error("SQLiteRepository.loadAll() no está implementado.");
        return null; 
    }

    saveAll(dataToSave) {
        console.error("SQLiteRepository.saveAll() no está implementado.");
    }
}