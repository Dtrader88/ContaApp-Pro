window.onload = () => {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // Usuario ha iniciado sesión.
            console.log("Usuario autenticado:", user.email);
            
            try {
                const db = firebase.firestore();
                const userProfileRef = db.collection("usuarios").doc(user.uid);
                let userProfileDoc = await userProfileRef.get();

                // Si el perfil no existe (primer login después del registro), lo creamos.
                if (!userProfileDoc.exists) {
                    console.log("Perfil no encontrado, creando uno nuevo...");
                    const workspaceId = user.uid; // Usaremos el UID como ID del workspace.
                    const newProfileData = {
                        email: user.email,
                        rol: "administrador",
                        workspaceId: workspaceId
                    };
                    
                    const workspaceRef = db.collection("workspaces").doc(workspaceId);
                    
                    const batch = db.batch();
                    batch.set(userProfileRef, newProfileData);
                    batch.set(workspaceRef, {}); // Creamos el documento del workspace vacío.
                    await batch.commit();
                    
                    userProfileDoc = await userProfileRef.get(); // Re-leemos el perfil recién creado.
                }

                const userProfileData = userProfileDoc.data();
                const userProfile = {
                    uid: user.uid,
                    email: user.email,
                    rol: userProfileData.rol,
                    workspaceId: userProfileData.workspaceId
                };

                const onlineRepository = new FirebaseRepository(userProfile.workspaceId);
                await ContaApp.init(onlineRepository, userProfile);

            } catch (error) {
                console.error("Error crítico en el proceso de inicialización:", error);
                firebase.auth().signOut();
            }

        } else {
            // No hay usuario. Redirigir a la página de login.
            console.log("Usuario no autenticado. Redirigiendo a login...");
            if (window.location.pathname.indexOf('login.html') === -1) {
                window.location.href = 'login.html';
            }
        }
    });
};