const handleRegister = () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        errorMessageDiv.textContent = '';

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Al registrarse con éxito, simplemente redirigimos.
                // init.js se encargará de crear el perfil y el workspace.
                console.log("Usuario creado en Authentication. Redirigiendo...");
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