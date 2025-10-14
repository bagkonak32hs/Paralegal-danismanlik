// Mobil menü toggle
const menuToggle = document.getElementById('menu-toggle');
const navLinks = document.getElementById('nav-links');

menuToggle.addEventListener('click', () => {
  navLinks.classList.toggle('show');
});

// Scroll animasyonu (Hakkımızda resmi)
const aboutImg = document.querySelector(".about img");

window.addEventListener("scroll", () => {
  const rect = aboutImg.getBoundingClientRect();
  if (rect.top < window.innerHeight - 100) {
    aboutImg.classList.add("visible");
  }
});
function syncHeaderHeight() {
  const header = document.querySelector('.navbar');
  if (!header) return;
  const h = header.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--header-height', `${Math.ceil(h)}px`);
}

// Sayfa yüklendiğinde ve pencere boyutu değiştiğinde güncelle
window.addEventListener('load', syncHeaderHeight);
window.addEventListener('resize', syncHeaderHeight);

// Ayrıca DOM değişiklikleri (menü açma/kapanma) varsa yeniden hesaplamak iyi olur:
const observer = new MutationObserver(syncHeaderHeight);
const header = document.querySelector('.navbar');
if (header) observer.observe(header, { childList: true, subtree: true, attributes: true });

document.addEventListener("DOMContentLoaded", function () {
  const aboutImg = document.getElementById("aboutlogo");
  if (aboutImg) {
    aboutImg.classList.add("visible");
  }
});

document.addEventListener("DOMContentLoaded", () => {
    const logo = document.querySelector(".navbar .logo img");
    logo.style.opacity = 0;
    logo.style.transform = "translateY(-30px)";

    setTimeout(() => {
        logo.style.transition = "transform 0.8s ease, opacity 0.8s ease";
        logo.style.opacity = 1;
        logo.style.transform = "translateY(0)";
    }, 100); // Küçük gecikme
});
// Menü toggle JS

document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menu-toggle");
  const navLinks = document.getElementById("nav-links");

  menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("active");
    menuToggle.classList.toggle("active");
  });
});
    
function testForm() {
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const message = document.getElementById('message').value;

  // console’a da yazdır (isteğe bağlı)
  console.log({name, email, message});

  // Başarı mesajını göster
  const msg = document.getElementById('form-msg');
  msg.style.display = 'block';

  // Formun sayfayı yenilemesini engelle
  return false;}

  