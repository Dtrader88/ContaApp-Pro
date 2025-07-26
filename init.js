// Archivo: init.js

window.onload = () => {
    // Hacemos la función del listener asíncrona
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // **CASO 1: El usuario SÍ ha iniciado sesión.**
            console.log("Usuario autenticado:", user.email);

            const onlineRepository = new FirebaseRepository();

            // CAMBIO CLAVE: Esperamos a que la inicialización completa de la app termine
            // antes de que el script dé por finalizada su tarea.
            await ContaApp.init(onlineRepository);

        } else {
            // **CASO 2: El usuario NO ha iniciado sesión.**
            console.log("Usuario no autenticado. Redirigiendo a login...");
            if (window.location.pathname.indexOf('login.html') === -1) {
                window.location.href = 'login.html';
            }
        }
    });
};