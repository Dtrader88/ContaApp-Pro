// Archivo: modules/produccion.js

Object.assign(ContaApp, {

    renderProduccion(params = {}) {
        // Por ahora, solo mostraremos un mensaje temporal.
        // Más adelante, aquí irá la lógica de las pestañas.
        const html = `
            <div class="conta-card text-center p-8">
                <h2 class="text-xl font-bold">Módulo de Producción</h2>
                <p class="text-[var(--color-text-secondary)] mt-2">Esta sección está en construcción.</p>
            </div>
        `;
        
        document.getElementById('produccion').innerHTML = html;
    },

});