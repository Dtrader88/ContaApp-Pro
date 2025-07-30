// Archivo: modules/config.js

Object.assign(ContaApp, {

// Módulo: Configuración y Gestión de Datos
        renderConfig(params = {}) {
        const submodulo = params.submodulo || 'perfil';

        let html = `
            <div class="flex gap-2 mb-6 border-b border-[var(--color-border-accent)] flex-wrap">
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'perfil' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('config', {submodulo: 'perfil'})">Perfil de la Compañía</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'contactos' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('config', {submodulo: 'contactos'})">Contactos</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'unidades' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('config', {submodulo: 'unidades'})">Unidades de Medida</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'licencia' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('config', {submodulo: 'licencia'})">Licencia y Activación</button>
                <button class="py-2 px-4 text-sm font-semibold ${submodulo === 'personalizacion' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}" onclick="ContaApp.irModulo('config', {submodulo: 'personalizacion'})">Personalización y Datos</button>
            </div>
            <div id="config-contenido"></div>
        `;
        document.getElementById('config').innerHTML = html;
        
        document.getElementById('page-actions-header').innerHTML = '';

        switch (submodulo) {
            case 'perfil': this.renderConfig_Perfil(); break;
            case 'contactos': this.renderContactos('config-contenido'); break;
            case 'unidades': this.renderConfig_Unidades(); break;
            case 'licencia': this.renderConfig_Licencia(); break;
            case 'personalizacion': this.renderConfig_Personalizacion(); break;
            default: this.renderConfig_Perfil();
        }
    },
renderConfig_Licencia() {
        const { cliente, paquete, modulosActivos } = this.licencia || { cliente: 'N/A', paquete: 'N/A', modulosActivos: [] };
        
        const licenciaHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Tarjeta de Información de Licencia -->
                <div class="conta-card">
                    <h3 class="conta-subtitle">Información de la Licencia Actual</h3>
                    <div class="space-y-3 mt-4 text-sm">
                        <div class="flex justify-between">
                            <span class="font-semibold text-[var(--color-text-secondary)]">Licenciado a:</span>
                            <span class="font-mono">${cliente}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="font-semibold text-[var(--color-text-secondary)]">Paquete Activo:</span>
                            <span class="font-mono font-bold text-[var(--color-primary)]">${paquete}</span>
                        </div>
                        <div>
                            <span class="font-semibold text-[var(--color-text-secondary)]">Módulos Activos:</span>
                            <div class="flex flex-wrap gap-2 mt-2">
                                ${modulosActivos.map(m => `<span class="tag tag-neutral">${m.replace(/_/g, ' ')}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tarjeta para Activar Nueva Licencia -->
                <div class="conta-card">
                    <h3 class="conta-subtitle">Activar Nueva Licencia</h3>
                    <p class="text-sm text-[var(--color-text-secondary)] mt-4 mb-4">
                        Si has adquirido un nuevo paquete o un módulo adicional, pega la clave de licencia proporcionada a continuación para activar las nuevas funcionalidades.
                    </p>
                    <form onsubmit="ContaApp.activarLicencia(event)">
                        <div>
                            <label for="licencia-key" class="font-semibold">Clave de Activación</label>
                            <textarea id="licencia-key" rows="4" class="w-full conta-input mt-1" placeholder="Pega aquí tu clave de licencia..."></textarea>
                        </div>
                        <div class="text-right mt-4">
                            <button type="submit" class="conta-btn">Activar</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.getElementById('config-contenido').innerHTML = licenciaHTML;
    },
    activarLicencia(e) {
        e.preventDefault();
        const clave = document.getElementById('licencia-key').value.trim();
        if (!clave) {
            this.showToast('El campo de la clave no puede estar vacío.', 'error');
            return;
        }

        try {
            // Decodificar la clave de Base64 a texto plano (JSON)
            const jsonLicencia = atob(clave);
            // Convertir el texto JSON a un objeto JavaScript
            const nuevaLicencia = JSON.parse(jsonLicencia);

            // Validar que la licencia tiene la estructura mínima esperada
            if (!nuevaLicencia.paquete || !nuevaLicencia.modulosActivos || !Array.isArray(nuevaLicencia.modulosActivos)) {
                throw new Error("Formato de licencia no válido.");
            }
            
            this.showConfirm(`Vas a actualizar tu licencia al paquete "${nuevaLicencia.paquete}". ¿Continuar? La aplicación se recargará.`, () => {
                this.licencia = nuevaLicencia;
                this.saveAll();
                this.showToast('¡Licencia actualizada! Reiniciando...', 'success');
                setTimeout(() => window.location.reload(), 1500);
            });

        } catch (error) {
            console.error("Error al activar licencia:", error);
            this.showToast('La clave de licencia no es válida. Por favor, verifica que la has copiado correctamente.', 'error');
        }
    },
    // Renombramos la antigua función renderConfig
            renderConfig_Perfil() {
        const { nombre, logo, direccion, telefono, email, taxId, taxRate } = this.empresa;
        const configHTML = `
            <div class="conta-card">
                <h3 class="conta-subtitle">Perfil de la Empresa y Fiscal</h3>
                <!-- ===== INICIO DE LA MEJORA: Contenedor para limitar el ancho ===== -->
                <div class="max-w-4xl">
                    <form onsubmit="ContaApp.guardarConfig(event)" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-xs font-semibold">Nombre de la Empresa</label>
                                <input type="text" id="config-nombre" class="w-full conta-input mt-1" value="${nombre || ''}" required>
                            </div>
                            <div>
                                <label class="text-xs font-semibold">ID Fiscal (RIF / NIT)</label>
                                <input type="text" id="config-taxid" class="w-full conta-input mt-1" value="${taxId || ''}">
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-xs font-semibold">URL del Logo</label>
                                <input type="text" id="config-logo" class="w-full conta-input mt-1" value="${logo || ''}">
                            </div>
                            <div>
                                <label class="text-xs font-semibold">Tasa de Impuesto General (%)</label>
                                <input type="number" step="0.01" id="config-taxrate" class="w-full conta-input mt-1" value="${taxRate || 0}">
                            </div>
                        </div>
                        <div>
                            <label class="text-xs font-semibold">Dirección</label>
                            <textarea id="config-direccion" rows="2" class="w-full conta-input mt-1">${direccion || ''}</textarea>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-xs font-semibold">Teléfono</label>
                                <input type="tel" id="config-telefono" class="w-full conta-input mt-1" value="${telefono || ''}">
                            </div>
                            <div>
                                <label class="text-xs font-semibold">Email</label>
                                <input type="email" id="config-email" class="w-full conta-input mt-1" value="${email || ''}">
                            </div>
                        </div>
                        <div class="text-right mt-6">
                            <button type="submit" class="conta-btn">Guardar Cambios</button>
                        </div>
                    </form>
                </div>
                <!-- ===== FIN DE LA MEJORA ===== -->
            </div>
        `;
        document.getElementById('config-contenido').innerHTML = configHTML;
    },
        renderConfig_Personalizacion() {
    const personalizacionHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div class="lg:col-span-2 space-y-6">
                <div class="conta-card">
                    <h3 class="conta-subtitle">Personalización de la Interfaz</h3>
                    <div class="flex justify-between items-center mt-4">
                       <p class="text-[var(--color-text-secondary)] text-sm">Elige qué indicadores (KPIs) y widgets quieres ver en tu dashboard principal.</p>
                       <button class="conta-btn conta-btn-accent w-fit" onclick="ContaApp.abrirModalPersonalizarDashboard()">
                            <i class="fa-solid fa-wand-magic-sparkles me-2"></i>Personalizar
                       </button>
                    </div>
                </div>

                <div class="conta-card">
                     <h3 class="conta-subtitle">Personalización de Documentos (PDF)</h3>
                     <form onsubmit="event.preventDefault(); ContaApp.guardarConfigPersonalizacion()">
                        <div class="flex flex-wrap items-end gap-4">
                            <div class="flex-grow" style="min-width: 200px;">
                                <label for="pdf-template" class="text-sm font-medium">Plantilla de Factura</label>
                                <select id="pdf-template" class="conta-input mt-1">
                                    <option value="clasica" ${this.empresa.pdfTemplate === 'clasica' ? 'selected' : ''}>Clásica</option>
                                    <option value="moderna" ${this.empresa.pdfTemplate === 'moderna' ? 'selected' : ''}>Moderna</option>
                                </select>
                            </div>
                            <div>
                                <label for="pdf-color" class="text-sm font-medium">Color de Acento</label>
                                <input type="color" id="pdf-color" class="h-10 conta-input mt-1" value="${this.empresa.pdfColor || '#1877f2'}">
                            </div>
                            <div class="flex-grow text-right">
                                <button type="submit" class="conta-btn w-fit">Guardar Personalización</button>
                            </div>
                        </div>
                     </form>
                </div>

                <div class="conta-card">
                    <h3 class="conta-subtitle">Copia de Seguridad (JSON)</h3>
                    <p class="text-[var(--color-text-secondary)] text-sm mb-4">Usa esto para guardar una copia exacta de los datos de la app, o para restaurarla en este u otro navegador.</p>
                    <div class="flex flex-col md:flex-row gap-3">
                       <button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarDatos()">Exportar Datos (.json)</button>
                       <button class="conta-btn" onclick="document.getElementById('import-file-input').click()">Importar Datos (.json)</button>
                       <input type="file" id="import-file-input" class="hidden" accept=".json" onchange="ContaApp.importarDatos(event)">
                    </div>
                </div>
            </div>

            <div class="lg:col-span-1 space-y-6">
                <div class="conta-card">
                     <h3 class="conta-subtitle conta-text-danger">Zona de Peligro</h3>
                     <div class="space-y-4 mt-4">
                        <div class="p-3 rounded-lg border border-dashed border-[var(--color-border-accent)]">
                            <p class="text-[var(--color-text-secondary)] text-sm mb-2">Sincroniza tu catálogo de cuentas con la última versión del software. Útil después de una actualización.</p>
                            <button class="conta-btn conta-btn-accent w-fit" onclick="ContaApp.forzarActualizacionPlanDeCuentas()">Forzar Actualización</button>
                        </div>
                        <div class="p-3 rounded-lg border border-dashed border-[var(--color-border-accent)]">
                            <p class="text-[var(--color-text-secondary)] text-sm mb-2">Borrar todos los datos y empezar de cero. Esta acción es irreversible.</p>
                            <button class="conta-btn conta-btn-danger w-fit" onclick="ContaApp.resetearDatos()">Resetear Aplicación</button>
                        </div>
                     </div>
                </div>
            </div>

        </div>
    `;
    document.getElementById('config-contenido').innerHTML = personalizacionHTML;
},
        guardarConfigPersonalizacion() {
        this.empresa.pdfTemplate = document.getElementById('pdf-template').value;
        this.empresa.pdfColor = document.getElementById('pdf-color').value;
        this.saveAll();
        this.showToast("Configuración de documentos guardada.", 'success');
    },
    guardarConfig(e) {
        e.preventDefault();
        this.empresa.nombre = document.getElementById('config-nombre').value;
        this.empresa.taxId = document.getElementById('config-taxid').value;
        this.empresa.logo = document.getElementById('config-logo').value;
        this.empresa.taxRate = parseFloat(document.getElementById('config-taxrate').value) || 0;
        this.empresa.direccion = document.getElementById('config-direccion').value;
        this.empresa.telefono = document.getElementById('config-telefono').value;
        this.empresa.email = document.getElementById('config-email').value;
        this.saveAll();
        this.actualizarPerfilEmpresa();
        this.showToast("Configuración guardada con éxito.", 'success');
    },
    resetearDatos() {
        this.showConfirm(
            "¿ESTÁS SEGURO? Esta acción borrará TODOS tus datos de la nube (transacciones, clientes, etc.) y no se puede deshacer. Serás redirigido a la pantalla de configuración inicial.",
            async () => {
                try {
                    // --- INICIO DE LA CORRECCIÓN ---
                    // Usamos el workspaceId guardado en el objeto del usuario actual
                    if (!this.currentUser || !this.currentUser.workspaceId) {
                        throw new Error("No se pudo identificar el workspace del usuario a borrar.");
                    }
                    const workspaceId = this.currentUser.workspaceId;
                    // --- FIN DE LA CORRECCIÓN ---

                    console.log(`Borrando documento del workspace: ${workspaceId}`);
                    
                    const workspaceRef = firebase.firestore().collection("workspaces").doc(workspaceId);
                    
                    await workspaceRef.delete();
                    
                    this.showToast('Todos los datos han sido eliminados. Recargando...', 'success');
                    
                    await firebase.auth().signOut();
                    window.location.reload();

                } catch (error) {
                    console.error("Error al resetear los datos:", error);
                    this.showToast(`Ocurrió un error al intentar borrar los datos: ${error.message}`, 'error');
                }
            }
        );
    },
    exportarDatos() {
        const data = localStorage.getItem("conta_app_data");
        if (!data) {
            this.showToast("No hay datos para exportar.", 'error');
            return;
        }
        const blob = new Blob([data], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conta_app_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    importarDatos(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.showConfirm("¿ESTÁS SEGURO? Esto sobrescribirá todos los datos actuales con el contenido del archivo de respaldo.", () => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    JSON.parse(data); 
                    localStorage.setItem("conta_app_data", data);
                    this.showToast("Datos importados con éxito. La aplicación se recargará.", 'success');
                    setTimeout(() => window.location.reload(), 2000);
                } catch (error) {
                    this.showToast("Error al importar el archivo. No es un respaldo válido.", 'error');
                    console.error("Error de importación:", error);
                }
            };
            reader.readAsText(file);
        });
        event.target.value = null;
    },
// Módulo: Contactos
            renderContactos(containerId = 'contactos') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (containerId === 'config-contenido') {
             document.getElementById('page-actions-header').innerHTML = `
                <div class="flex gap-2 flex-wrap">
                    <button class="conta-btn conta-btn-accent" onclick="ContaApp.exportarContactosCSV()"><i class="fa-solid fa-file-csv me-2"></i>Exportar CSV</button>
                    <button class="conta-btn" onclick="ContaApp.abrirModalContacto()">+ Nuevo Contacto</button>
                </div>`;
        }
        
        let html;
        if (this.contactos.length === 0) {
            html = this.generarEstadoVacioHTML('fa-users','Aún no tienes contactos','Añade tu primer cliente o proveedor para empezar a organizar tu negocio.','+ Crear Primer Contacto',"ContaApp.abrirModalContacto()");
        } else {
            html = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra"><thead><tr>
                <th class="conta-table-th">Nombre</th><th class="conta-table-th">Tipo</th>
                <th class="conta-table-th">Email</th><th class="conta-table-th">Teléfono</th>
                <th class="conta-table-th text-center">Acciones</th>
                </tr></thead><tbody>`;
            this.contactos.sort((a,b) => a.nombre.localeCompare(b.nombre)).forEach(c => {
                const tipoClass = c.tipo === 'cliente' ? 'tag-cliente' : 'tag-proveedor';
                html += `<tr>
                    <td class="conta-table-td font-bold">${c.nombre}</td>
                    <td class="conta-table-td"><span class="tag ${tipoClass}">${c.tipo}</span></td>
                    <td class="conta-table-td">${c.email || 'N/A'}</td>
                    <td class="conta-table-td">${c.telefono || 'N/A'}</td>
                    <td class="conta-table-td text-center">
                        <button class="conta-btn-icon edit" title="Editar" onclick="ContaApp.abrirModalContacto(${c.id})"><i class="fa-solid fa-pencil"></i></button>
                        <button class="conta-btn-icon delete ml-2" title="Eliminar" onclick="ContaApp.eliminarContacto(${c.id})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;
            });
            html += `</tbody></table></div>`;
        }
        container.innerHTML = html;
    },
    abrirModalContacto(id = null) {
        const contacto = id ? this.findById(this.contactos, id) : {};
        const modalHTML = `<h3 class="conta-title mb-4">${id ? 'Editar' : 'Nuevo'} Contacto</h3>
        <form onsubmit="ContaApp.guardarContacto(event, ${id})" class="space-y-4 modal-form">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label>Nombre</label><input type="text" id="contacto-nombre" class="w-full p-2 mt-1" value="${contacto.nombre || ''}" required></div>
                <div><label>Tipo</label><select id="contacto-tipo" class="w-full p-2 mt-1" required>
                    <option value="cliente" ${contacto.tipo === 'cliente' ? 'selected':''}>Cliente</option>
                    <option value="proveedor" ${contacto.tipo === 'proveedor' ? 'selected':''}>Proveedor</option>
                </select></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
        <label>Email</label>
        <div class="input-with-icon-container mt-1">
            <i class="fa-solid fa-envelope input-icon"></i>
            <input type="email" id="contacto-email" class="w-full p-2" value="${contacto.email || ''}">
        </div>
    </div>
    <div>
        <label>Teléfono</label>
        <div class="input-with-icon-container mt-1">
            <i class="fa-solid fa-phone input-icon"></i>
            <input type="tel" id="contacto-telefono" class="w-full p-2" value="${contacto.telefono || ''}">
        </div>
    </div>
</div>
            <div class="flex justify-end gap-2 mt-6"><button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button><button type="submit" class="conta-btn">${id ? 'Guardar Cambios' : 'Crear Contacto'}</button></div>
        </form>`;
        this.showModal(modalHTML, 'xl');
    },
                async guardarContacto(e, id = null) {
        e.preventDefault();
        const data = {
            nombre: document.getElementById('contacto-nombre').value,
            tipo: document.getElementById('contacto-tipo').value,
            email: document.getElementById('contacto-email').value,
            telefono: document.getElementById('contacto-telefono').value
        };

        try {
            if (id) {
                // --- INICIO DE LA REFACTORIZACIÓN (EDITAR) ---
                // 1. Preparamos el objeto actualizado sin modificar aún el estado local.
                const contactoOriginal = this.findById(this.contactos, id);
                const contactoActualizado = { ...contactoOriginal, ...data };

                // 2. Intentamos guardar en el repositorio PRIMERO.
                await this.repository.actualizarContacto(contactoActualizado);
                
                // 3. SOLO SI tiene éxito, actualizamos el estado local.
                Object.assign(contactoOriginal, data);
                // --- FIN DE LA REFACTORIZACIÓN (EDITAR) ---

            } else {
                // --- INICIO DE LA REFACTORIZACIÓN (CREAR) ---
                // 1. Preparamos el nuevo objeto.
                const nuevoContacto = { id: this.idCounter++, ...data };
                
                // 2. Intentamos guardar en el repositorio PRIMERO.
                await this.repository.guardarContacto(nuevoContacto);

                // 3. SOLO SI tiene éxito, actualizamos el estado local.
                this.contactos.push(nuevoContacto);
                // --- FIN DE LA REFACTORIZACIÓN (CREAR) ---
            }

            // El resto del flujo (UI) se mantiene igual y solo se ejecuta si todo fue bien.
            this.closeModal();
            this.irModulo('config', { submodulo: 'contactos' }); 
            this.showToast(`Contacto ${id ? 'actualizado' : 'creado'} con éxito.`, 'success');

        } catch (error) {
            console.error("Error al guardar contacto:", error);
            this.showToast(`Error al guardar: ${error.message}`, 'error');
            // IMPORTANTE: Si el guardado falla, el estado local no se ha modificado,
            // por lo que la UI se mantiene consistente con la base de datos.
        }
    },
            eliminarContacto(id) {
        const tieneTransacciones = this.transacciones.some(t => t.contactoId === id);

        if (tieneTransacciones) {
            this.showToast('No se puede eliminar. El contacto tiene facturas o gastos asociados.', 'error');
            return;
        }

        this.showConfirm('¿Seguro que deseas eliminar este contacto? Esta acción no se puede deshacer.', async () => {
            try {
                // Primero, eliminamos del repositorio
                await this.repository.eliminarContacto(id);
                
                // Si tiene éxito, actualizamos el estado local
                this.contactos = this.contactos.filter(c => c.id !== id);
                
                this.irModulo('config', { submodulo: 'contactos' });
                this.showToast('Contacto eliminado con éxito.', 'success');
            } catch (error) {
                console.error("Error al eliminar contacto:", error);
                this.showToast(`Error al eliminar: ${error.message}`, 'error');
            }
        });
    },
    abrirSubModalNuevoContacto(tipo, selectIdToUpdate) {
        const subModal = document.createElement('div');
        subModal.id = 'sub-modal-bg';
        subModal.onclick = () => document.body.removeChild(subModal);
        const subModalContent = document.createElement('div');
        subModalContent.className = 'p-6 rounded-lg shadow-xl w-full max-w-md modal-content';
        subModalContent.onclick = e => e.stopPropagation();

        subModalContent.innerHTML = `<h3 class="conta-title mb-4">Nuevo ${tipo === 'cliente' ? 'Cliente' : 'Proveedor'}</h3>
        <form onsubmit="event.preventDefault(); ContaApp.guardarNuevoContactoDesdeSubModal(event, '${tipo}', '${selectIdToUpdate}')" class="space-y-4 modal-form">
            <div><label for="sub-contacto-nombre">Nombre</label><input type="text" id="sub-contacto-nombre" class="w-full p-2 mt-1" required></div>
            <div class="flex justify-end gap-2 mt-6">
                <button type="button" class="conta-btn conta-btn-accent" onclick="document.body.removeChild(document.getElementById('sub-modal-bg'))">Cancelar</button>
                <button type="submit" class="conta-btn">Guardar</button>
            </div>
        </form>`;
        subModal.appendChild(subModalContent);
        document.body.appendChild(subModal);
        document.getElementById('sub-contacto-nombre').focus();
    },
    guardarNuevoContactoDesdeSubModal(e, tipo, inputIdToUpdate) {
        const nombre = document.getElementById('sub-contacto-nombre').value;
        const newContact = { id: this.idCounter++, nombre, tipo };
        this.contactos.push(newContact);
        this.saveAll();

        const input = document.getElementById(inputIdToUpdate);
        const datalistId = input.getAttribute('list');
        const datalist = document.getElementById(datalistId);

        if (datalist) {
             const option = document.createElement('option');
             option.value = newContact.nombre;
             option.setAttribute('data-id', newContact.id);
             datalist.appendChild(option);
        }

        // Actualizamos el valor del input y disparamos el evento para que se actualice el resto del modal
        input.value = newContact.nombre;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        this.showToast('Contacto creado.', 'success');
        document.body.removeChild(document.getElementById('sub-modal-bg'));
    },
    abrirSubModalNuevaCuentaDeServicio(button) {
        this.abrirSubModalNuevaCuenta(button, 410);
    },
    abrirSubModalNuevaCuenta(button, parentId) {
        const selectToUpdate = button.previousElementSibling;
        if(!selectToUpdate.id) selectToUpdate.id = `select-on-the-fly-${Date.now()}`;

        const parentAccount = this.findById(this.planDeCuentas, parentId);
        
        const subModal = document.createElement('div');
        subModal.id = 'sub-modal-bg';
        subModal.onclick = () => document.body.removeChild(subModal);
        const subModalContent = document.createElement('div');
        subModalContent.className = 'p-6 rounded-lg shadow-xl w-full max-w-md modal-content';
        subModalContent.onclick = e => e.stopPropagation();
        
        let nextNum = 1;
        const children = this.planDeCuentas.filter(c => c.parentId === parentId);
         if (children.length > 0) {
            const lastChild = children.sort((a,b) => a.codigo.localeCompare(b.codigo, undefined, {numeric: true})).pop();
            if (lastChild) {
                const lastNum = parseInt(lastChild.codigo.split('.').pop());
                if (!isNaN(lastNum)) nextNum = lastNum + 1;
            }
        }
        const suggestedCode = `${parentAccount.codigo}.${nextNum}`;

        subModalContent.innerHTML = `<h3 class="conta-title mb-4">Nueva Cuenta Detalle</h3>
        <form onsubmit="event.preventDefault(); ContaApp.guardarNuevaCuentaDesdeSubModal(event, '${selectToUpdate.id}', ${parentId})" class="space-y-4 modal-form">
            <p class="text-sm text-[var(--color-text-secondary)]">Se creará bajo: ${parentAccount.codigo} - ${parentAccount.nombre}</p>
            <div><label for="sub-cuenta-nombre">Nombre de la Cuenta</label><input type="text" id="sub-cuenta-nombre" class="w-full p-2 mt-1" required></div>
            <div><label for="sub-cuenta-codigo">Código</label><input type="text" id="sub-cuenta-codigo" class="w-full p-2 mt-1" value="${suggestedCode}" required></div>
            <div class="flex justify-end gap-2 mt-6">
                <button type="button" class="conta-btn conta-btn-accent" onclick="document.body.removeChild(document.getElementById('sub-modal-bg'))">Cancelar</button>
                <button type="submit" class="conta-btn">Guardar</button>
            </div>
        </form>`;
        subModal.appendChild(subModalContent);
        document.body.appendChild(subModal);
        document.getElementById('sub-cuenta-nombre').focus();
    },
    guardarNuevaCuentaDesdeSubModal(e, selectIdToUpdate, parentId) {
        const nombre = document.getElementById('sub-cuenta-nombre').value;
        const codigo = document.getElementById('sub-cuenta-codigo').value;
        if(this.planDeCuentas.some(c=> c.codigo === codigo)) {
            this.showToast('El código de cuenta ya existe', 'error'); return;
        }

        const newAccount = { id: this.idCounter++, codigo, nombre, tipo: 'DETALLE', parentId: parseInt(parentId) };
        this.planDeCuentas.push(newAccount);
        this.saveAll();
        
        const select = document.getElementById(selectIdToUpdate);
        const option = document.createElement('option');
        option.value = newAccount.id;
        option.text = newAccount.nombre;
        select.add(option);
        select.value = newAccount.id;
        
        this.showToast('Cuenta creada con éxito.', 'success');
        document.body.removeChild(document.getElementById('sub-modal-bg'));
    },
    exportarContactosCSV() {
        const dataParaExportar = this.contactos
            .sort((a,b) => a.nombre.localeCompare(b.nombre))
            .map(c => ({
                'Nombre': c.nombre,
                'Tipo': c.tipo,
                'Email': c.email || '',
                'Telefono': c.telefono || ''
            }));
        this.exportarA_CSV(`contactos_${this.getTodayDate()}.csv`, dataParaExportar);
    },
    renderConfig_Unidades() {
        document.getElementById('page-actions-header').innerHTML = `<button class="conta-btn" onclick="ContaApp.abrirModalUnidad()">+ Nueva Unidad</button>`;
        
        let html;
        if (this.unidadesMedida.length === 0) {
            html = this.generarEstadoVacioHTML('fa-ruler', 'Sin Unidades de Medida', 'Añade tus propias unidades de medida para gestionar tu inventario.', '+ Crear Primera Unidad', "ContaApp.abrirModalUnidad()");
        } else {
            html = `<div class="conta-card overflow-auto"><table class="min-w-full text-sm conta-table-zebra">
                <thead><tr>
                    <th class="conta-table-th">Nombre de la Unidad</th>
                    <th class="conta-table-th text-center">Acciones</th>
                </tr></thead>
                <tbody>`;
            this.unidadesMedida.sort((a,b) => a.nombre.localeCompare(b.nombre)).forEach(u => {
                html += `<tr>
                    <td class="conta-table-td font-bold">${u.nombre}</td>
                    <td class="conta-table-td text-center">
                        <button class="conta-btn-icon edit" title="Editar" onclick="ContaApp.abrirModalUnidad(${u.id})"><i class="fa-solid fa-pencil"></i></button>
                        <button class="conta-btn-icon delete ml-2" title="Eliminar" onclick="ContaApp.eliminarUnidad(${u.id})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;
            });
            html += `</tbody></table></div>`;
        }
        document.getElementById('config-contenido').innerHTML = html;
    },

    abrirModalUnidad(id = null) {
        const unidad = id ? this.findById(this.unidadesMedida, id) : {};
        const modalHTML = `<h3 class="conta-title mb-4">${id ? 'Editar' : 'Nueva'} Unidad de Medida</h3>
        <form onsubmit="ContaApp.guardarUnidad(event, ${id})" class="space-y-4 modal-form">
            <div>
                <label>Nombre</label>
                <input type="text" id="unidad-nombre" class="w-full p-2 mt-1" value="${unidad.nombre || ''}" placeholder="Ej: Paquete, Rollo, m²" required>
            </div>
            <div class="flex justify-end gap-2 mt-6">
                <button type="button" class="conta-btn conta-btn-accent" onclick="ContaApp.closeModal()">Cancelar</button>
                <button type="submit" class="conta-btn">${id ? 'Guardar Cambios' : 'Crear Unidad'}</button>
            </div>
        </form>`;
        this.showModal(modalHTML, 'xl');
    },

    guardarUnidad(e, id = null) {
        e.preventDefault();
        const nombre = document.getElementById('unidad-nombre').value;
        if (id) {
            const unidad = this.findById(this.unidadesMedida, id);
            unidad.nombre = nombre;
        } else {
            this.unidadesMedida.push({ id: this.idCounter++, nombre });
        }
        this.saveAll();
        this.closeModal();
        this.irModulo('config', { submodulo: 'unidades' }); 
        this.showToast(`Unidad ${id ? 'actualizada' : 'creada'} con éxito.`, 'success');
    },

    eliminarUnidad(id) {
        const enUso = this.productos.some(p => p.unidadMedidaId === id);
        if (enUso) {
            this.showToast('No se puede eliminar. La unidad está siendo usada por uno o más productos.', 'error');
            return;
        }
        this.showConfirm('¿Seguro que deseas eliminar esta unidad de medida?', () => {
            this.unidadesMedida = this.unidadesMedida.filter(u => u.id !== id);
            this.saveAll();
            this.irModulo('config', { submodulo: 'unidades' });
            this.showToast('Unidad eliminada.', 'success');
        });
    },
});