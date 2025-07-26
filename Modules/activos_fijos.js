// Archivo: modules/activos_fijos.js

Object.assign(ContaApp, {

    renderActivosFijos(params = {}) {
        // Definimos las acciones que aparecerán en la cabecera de la página
        document.getElementById('page-actions-header').innerHTML = `
            <div class="flex gap-2 flex-wrap">
                <button class="conta-btn" onclick="ContaApp.abrirModalActivoFijo()">+ Nuevo Activo Fijo</button>
            </div>`;

        let html;
        if (this.activosFijos.length === 0) {
            html = this.generarEstadoVacioHTML(
                'fa-building-columns',
                'Aún no tienes activos registrados',
                'Añade tu primer activo fijo, como una computadora o mobiliario, para empezar a gestionar su depreciación.',
                '+ Registrar Primer Activo',
                "ContaApp.abrirModalActivoFijo()"
            );
        } else {
            // Futuro: Aquí construiremos la tabla con la lista de activos.
            // Por ahora, dejamos un mensaje temporal.
            html = `<div class="conta-card">Tabla de activos fijos aparecerá aquí.</div>`;
        }
        
        // Asignamos el HTML generado al contenedor del módulo
        document.getElementById('activos-fijos').innerHTML = html;
    },

});