document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    const backButtons = document.querySelectorAll('.back-button');

    function showPage(pageId) {
        pages.forEach(page => {
            if (page.id === pageId) {
                page.classList.add('active');
            } else {
                page.classList.remove('active');
            }
        });
    }

    // navegación desde los links del menú
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            const pageId = event.currentTarget.dataset.page;
            if (pageId) {
                showPage(pageId);
            }
        });
    });

    // navegación con los botones de "Volver"
    backButtons.forEach(button => {
        button.addEventListener('click', () => {
            showPage('home');
        });
    });

    // mostrar home al inicio
    showPage('home');
});
