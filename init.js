// Archivo: init.js

window.onload = () => {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log("Usuario autenticado:", user.email);

            const db = firebase.firestore();
            const userProfileRef = db.collection("usuarios").doc(user.uid);
            
            try {
                const userProfileDoc = await userProfileRef.get();

                if (!userProfileDoc.exists) {
                    console.error("El perfil de este usuario no existe.");
                    firebase.auth().signOut();
                    return; 
                }

                const userProfileData = userProfileDoc.data();
                
                // --- INICIO DE LA CORRECCIÓN ---
                // Preparamos el objeto con la información del usuario
                const userProfile = {
                    uid: user.uid,
                    email: user.email,
                    rol: userProfileData.rol,
                    workspaceId: userProfileData.workspaceId
                };

                const onlineRepository = new FirebaseRepository(userProfile.workspaceId);

                // Pasamos tanto el repositorio como el perfil del usuario a la app
                await ContaApp.init(onlineRepository, userProfile);
                // --- FIN DE LA CORRECCIÓN ---

            } catch (error) {
                console.error("Error al obtener el perfil del usuario:", error);
                if (window.location.pathname.indexOf('login.html') === -1) {
                    window.location.href = 'login.html';
                }
            }

        } else {
            console.log("Usuario no autenticado. Redirigiendo a login...");
            if (window.location.pathname.indexOf('login.html') === -1) {
                window.location.href = 'login.html';
            }
        }
    });
};