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
        errorMessageDiv.textContent = '';
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                window.location.href = 'index.html';
            })
            .catch((error) => {
                errorMessageDiv.textContent = 'Error: ' + error.message;
            });
    };

    // Función para manejar el registro
    const handleRegister = () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        errorMessageDiv.textContent = '';
        const db = firebase.firestore();

        // Verificar si es el primer usuario en toda la app
        db.collection("usuarios").limit(1).get().then(snapshot => {
            if (!snapshot.empty) {
                // --- FLUJO DE NUEVO INVITADO ---
                // No se permite el auto-registro si ya existen usuarios.
                // Esta lógica se manejará desde la app (invitación).
                errorMessageDiv.textContent = 'El auto-registro no está habilitado. Un administrador debe crear su usuario.';
                // En un futuro, aquí iría el flujo para registrarse con token de invitación.
                return Promise.reject("Auto-registro deshabilitado.");
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
                        sucursalId: null, // El administrador principal no pertenece a una sucursal
                        estado: 'activo'
                    });
                    return batch.commit();
                });
            }
        }).then(() => {
            console.log("Perfil de usuario listo. Redirigiendo...");
            window.location.href = 'index.html';
        }).catch((error) => {
            if (error !== "Auto-registro deshabilitado.") {
                console.error("Error de registro detallado:", error);
                let detailedMessage = `Error: ${error.message} (código: ${error.code})`;
                errorMessageDiv.textContent = detailedMessage;
            }
        });
    };

    // Asignar los eventos a los botones
    loginButton.addEventListener('click', handleLogin);
    registerButton.addEventListener('click', handleRegister);
});