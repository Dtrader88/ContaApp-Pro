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

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                console.log("Usuario creado en Authentication con UID:", user.uid);

                const workspaceRef = db.collection("workspaces").doc(user.uid);
                const userProfileRef = db.collection("usuarios").doc(user.uid);

                const batch = db.batch();
                batch.set(workspaceRef, {}); // Creamos el documento del workspace vacío
                batch.set(userProfileRef, {
                    email: user.email,
                    rol: "administrador",
                    workspaceId: user.uid
                });
                return batch.commit();
            })
            .then(() => {
                console.log("Workspace y perfil creados. Redirigiendo...");
                window.location.href = 'index.html';
            })
            .catch((error) => {
                if (error.code === 'auth/email-already-in-use') {
                    errorMessageDiv.textContent = 'Error: El correo ya está en uso.';
                } else if (error.code === 'auth/weak-password') {
                    errorMessageDiv.textContent = 'Error: La contraseña debe tener al menos 6 caracteres.';
                } else {
                    errorMessageDiv.textContent = 'Error al registrar el usuario.';
                }
                console.error("Error de registro:", error);
            });
    };
    // Asignar los eventos a los botones
    loginButton.addEventListener('click', handleLogin);
    registerButton.addEventListener('click', handleRegister);
});