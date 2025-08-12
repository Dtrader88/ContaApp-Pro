import { FirebaseRepository } from './repository.js';

window.onload = () => {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log("Usuario autenticado:", user.email);

            try {
                const db = firebase.firestore();
                const userProfileRef = db.collection("usuarios").doc(user.uid);
                let userProfileDoc = await userProfileRef.get();

                if (!userProfileDoc.exists) {
                    console.log("Perfil no encontrado, creando uno nuevo...");
                    const workspaceId = user.uid; // El primer usuario es dueño de su workspace
                    const newProfileData = {
                        email: user.email,
                        rol: "administrador",
                        workspaceId: workspaceId,
                        sucursalId: null 
                    };

                    const workspaceRef = db.collection("workspaces").doc(workspaceId);

                    const batch = db.batch();
                    batch.set(userProfileRef, newProfileData);
                    batch.set(workspaceRef, {});
                    await batch.commit();
                    
                    userProfileDoc = await userProfileRef.get();
                }
                
                const userProfileData = userProfileDoc.data();
                const userProfile = {
                    uid: user.uid,
                    email: user.email,
                    rol: userProfileData.rol,
                    workspaceId: userProfileData.workspaceId,
                    sucursalId: userProfileData.sucursalId || null 
                };

                const onlineRepository = new FirebaseRepository(userProfile.workspaceId);
                // Llamamos a init pero aún no navegamos para dar tiempo a la migración
                await ContaApp.init(onlineRepository, userProfile, { navigate: false });
                
                // --- INICIO: Script de Migración del Modelo de Stock ---
                if (!ContaApp.empresa.stockModelMigrated) {
                    console.log("Iniciando migración del modelo de stock a 'stockPorSucursal'...");
                    let seHicieronCambios = false;
                    
                    if (!ContaApp.empresa.sucursales) {
                        ContaApp.empresa.sucursales = [];
                    }

                    let sucursalPrincipalId;
                    if (ContaApp.empresa.sucursales.length === 0) {
                        console.log("No existen sucursales. Creando 'Sucursal Principal' por defecto.");
                        const nuevaSucursal = { id: ContaApp.generarUUID(), nombre: 'Sucursal Principal' };
                        ContaApp.empresa.sucursales.push(nuevaSucursal);
                        sucursalPrincipalId = nuevaSucursal.id;
                        seHicieronCambios = true;
                    } else {
                        sucursalPrincipalId = ContaApp.empresa.sucursales[0].id;
                    }

                    ContaApp.productos.forEach(producto => {
                        // Solo migrar si tiene la propiedad 'stock' y no tiene 'stockPorSucursal'
                        if (producto.hasOwnProperty('stock') && !producto.hasOwnProperty('stockPorSucursal')) {
                            console.log(`Migrando producto: ${producto.nombre} (Stock antiguo: ${producto.stock})`);
                            producto.stockPorSucursal = {
                                [sucursalPrincipalId]: producto.stock
                            };
                            delete producto.stock; // Eliminar la propiedad antigua
                            seHicieronCambios = true;
                        }
                    });

                    if (seHicieronCambios) {
                        ContaApp.empresa.stockModelMigrated = true; // Marcar la migración como completada
                        console.log("Migración completada. Guardando nuevos datos...");
                        await ContaApp.saveAll();
                        ContaApp.showToast('Modelo de datos de stock actualizado.', 'success');
                    } else {
                         // Aunque no hubo cambios, marcamos como migrado para no volver a verificar
                        ContaApp.empresa.stockModelMigrated = true; 
                        await ContaApp.saveAll();
                    }
                }
                // --- FIN: Script de Migración del Modelo de Stock ---

                // Una vez finalizada la posible migración, procedemos con la navegación normal
                if (ContaApp.empresa.nombre === "Tu Empresa") { // Condición para saber si es la primera vez
                    ContaApp.abrirAsistenteApertura();
                } else {
                    ContaApp.actualizarSaldosGlobales();
                    ContaApp.actualizarPerfilEmpresa();
                    await ContaApp.irModulo('dashboard');
                }


            } catch (error) {
                console.error("Error crítico en el proceso de inicialización:", error);
                firebase.auth().signOut();
            }

        } else {
            console.log("Usuario no autenticado. Redirigiendo a login...");
            if (window.location.pathname.indexOf('login.html') === -1) {
                window.location.href = 'login.html';
            }
        }
    });
};