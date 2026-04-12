// Mobile menu toggle
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Close menu when a link is clicked
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

// Newsletter form handler
function handleSubscribe(event) {
    event.preventDefault();
    const email = event.target.querySelector('input').value;
    alert('Vielen Dank! Sie erhalten unsere PflegeNews bald an: ' + email);
    event.target.reset();
}

// Header scroll effect
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.style.boxShadow = '0 2px 16px rgba(0,0,0,0.08)';
    } else {
        header.style.boxShadow = 'none';
    }
});
