document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    function showPage(pageId) {
        pages.forEach(page => {
            // Agrega la clase 'active' solo a la página seleccionada
            page.classList.toggle('active', page.id === pageId);
        });
    }

    // Maneja clicks en los botones de navegación
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            const pageId = event.currentTarget.dataset.page;
            if (pageId) showPage(pageId);
        });
    });

    // Muestra la página de inicio al cargar
    showPage('home');
});
