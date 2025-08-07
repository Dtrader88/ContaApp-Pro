// Archivo: login.js

document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const errorMessageDiv = document.getElementById('error-message');

    // Función para manejar el inicio de sesión
    const handleLogin = () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        errorMessageDiv.textContent = ''; // Limpiar errores

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Inicio de sesión exitoso, redirigir a la app principal
                window.location.href = 'index.html';
            })
            .catch((error) => {
                errorMessageDiv.textContent = 'Error: Credenciales incorrectas.';
                console.error("Error de inicio de sesión:", error);
            });
    };

    // Función para manejar el registro
    const handleRegister = () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    errorMessageDiv.textContent = '';
    const db = firebase.firestore();

    // ID temporal que habríamos creado en la invitación
    const tempUserId = "temp_" + btoa(email).replace(/=/g, "");
    const tempUserProfileRef = db.collection("usuarios").doc(tempUserId);

    tempUserProfileRef.get().then(doc => {
        if (doc.exists) {
            // --- FLUJO DE USUARIO INVITADO ---
            const userData = doc.data();
            console.log("Usuario invitado encontrado. Actualizando perfil...");
            
            return auth.createUserWithEmailAndPassword(email, password).then(userCredential => {
                const user = userCredential.user;
                const finalUserProfileRef = db.collection("usuarios").doc(user.uid);

                const batch = db.batch();
                // Copiamos los datos del perfil temporal al perfil final con el UID real
                batch.set(finalUserProfileRef, {
                    ...userData,
                    estado: 'activo' // Cambiamos el estado a activo
                });
                // Eliminamos el perfil temporal
                batch.delete(tempUserProfileRef);
                
                return batch.commit();
            });
        } else {
            // --- FLUJO DE NUEVO ADMINISTRADOR (el primer usuario) ---
            return auth.createUserWithEmailAndPassword(email, password).then(userCredential => {
                const user = userCredential.user;
                console.log("Usuario creado en Authentication con UID:", user.uid);

                const workspaceRef = db.collection("workspaces").doc(user.uid);
                const userProfileRef = db.collection("usuarios").doc(user.uid);

                const batch = db.batch();
                batch.set(workspaceRef, {});
                batch.set(userProfileRef, {
                    email: user.email,
                    rol: "administrador",
                    workspaceId: user.uid,
                    centroDeCostoId: null,
                    estado: 'activo'
                });
                return batch.commit();
            });
        }
    }).then(() => {
        console.log("Perfil de usuario listo. Redirigiendo...");
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error("Error de registro detallado:", error);
        let detailedMessage = `Error: ${error.message} (código: ${error.code})`;
        errorMessageDiv.textContent = detailedMessage;
    });
};
    // Asignar los eventos a los botones
    loginButton.addEventListener('click', handleLogin);
    registerButton.addEventListener('click', handleRegister);
});