// Archivo: init.js

import { FirebaseRepository } from './repository.js';

window.onload = () => {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      console.log("Usuario autenticado:", user.email);

      try {
        const db = firebase.firestore();
        const userProfileRef = db.collection("usuarios").doc(user.uid);
        let userProfileDoc = await userProfileRef.get();

        // Si no hay perfil, créalo (primer usuario => admin y dueñ@ del workspace)
        if (!userProfileDoc.exists) {
          console.log("Perfil no encontrado, creando uno nuevo...");
          const workspaceId = user.uid;

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
        
        const onlineRepository = new FirebaseRepository(user.uid);

        // Inicializa la app (sin navegar aún)
        await ContaApp.init(onlineRepository, userProfile);

        // --- Migración stock -> stockPorSucursal (idempotente) ---
        if (!ContaApp.empresa.stockModelMigrated) {
          console.log("Iniciando migración del modelo de stock a 'stockPorSucursal'...");
          let seHicieronCambios = false;

          if (!ContaApp.empresa.sucursales) {
            ContaApp.empresa.sucursales = [];
          }

          let sucursalPrincipalId;
          if (ContaApp.empresa.sucursales.length === 0) {
            const nuevaSucursal = { id: ContaApp.generarUUID(), nombre: 'Sucursal Principal' };
            ContaApp.empresa.sucursales.push(nuevaSucursal);
            sucursalPrincipalId = nuevaSucursal.id;
            seHicieronCambios = true;
          } else {
            sucursalPrincipalId = ContaApp.empresa.sucursales[0].id;
          }

          (ContaApp.productos || []).forEach(producto => {
            if (producto.hasOwnProperty('stock') && !producto.hasOwnProperty('stockPorSucursal')) {
              producto.stockPorSucursal = { [sucursalPrincipalId]: producto.stock };
              delete producto.stock;
              seHicieronCambios = true;
            }
          });

          if (seHicieronCambios) {
            ContaApp.empresa.stockModelMigrated = true;
            await ContaApp.saveAll();
            ContaApp.showToast('Modelo de datos de stock actualizado.', 'success', 2000);
          } else {
            ContaApp.empresa.stockModelMigrated = true;
            await ContaApp.saveAll();
          }
        }
        // --- Fin migración ---

        // --- INICIO DE LA MODIFICACIÓN ---
        // Establecer el contexto de la sucursal para la sesión del usuario.
        // Si el usuario tiene una sucursal asignada, la usamos.
        // Si no, usamos la sucursal principal de la empresa.
        const sucursalPrincipalId = (ContaApp.empresa.sucursales && ContaApp.empresa.sucursales.length > 0) ? ContaApp.empresa.sucursales[0].id : null;
        const sucursalActivaId = userProfile.sucursalId || sucursalPrincipalId;
        if (sucursalActivaId) {
            ContaApp.setSucursalContexto(sucursalActivaId);
        } else {
            console.warn("No se pudo determinar una sucursal activa para el contexto.");
        }
        // --- FIN DE LA MODIFICACIÓN ---
        
        // Navegación post-init
        if (ContaApp.empresa && ContaApp.empresa.nombre === "Tu Empresa") {
          ContaApp.abrirAsistenteApertura();
        } else {
          ContaApp.actualizarSaldosGlobales?.();
          ContaApp.actualizarPerfilEmpresa?.();
          await ContaApp.irModulo('dashboard');
        }

        // Mostrar app y ocultar login
        document.getElementById('app-root')?.classList.remove('hidden');
        document.getElementById('login-root')?.classList.add('hidden');
        
      } catch (error) {
        console.error("Error crítico en la inicialización:", error);
        ContaApp.showToast('No se pudo iniciar la aplicación. Revisa la consola.', 'error', 4000);
      }
    } else {
      console.log("Usuario no autenticado. Mostrando login.");
      document.getElementById('app-root')?.classList.add('hidden');
      document.getElementById('login-root')?.classList.remove('hidden');

      if (window.location.pathname.indexOf('login.html') === -1) {
        window.location.href = 'login.html';
      }
    }
  });
};