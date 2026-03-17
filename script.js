// ── API base URL ─────────────────────────────────────────────────────────────
// In production this points to your Render backend.
// For local dev, change to 'http://localhost:5000'
const API_BASE = window.SUPRA_API_URL || 'https://supratravels-api.onrender.com';

// ── Static fallback data (shown if API is unavailable) ───────────────────────
const FALLBACK_CONTACT = {
    phone:    '+91 98765 43210',
    whatsapp: '919876543210',
    email:    'info@supratravels.in',
    address:  '124 Travel Avenue, Jubilee Hills, Hyderabad – 500033'
};

const FALLBACK_TRIPS = [
    { _id:'f1', title:'Kerala Backwaters',  location:'Kerala, India',      image:'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80', price:15999, duration:'5 Days / 4 Nights', badge:'Most Popular' },
    { _id:'f2', title:'Majestic Kashmir',   location:'J&K, India',         image:'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80', price:22499, duration:'6 Days / 5 Nights', badge:'20% OFF' },
    { _id:'f3', title:'Goa Beach Escape',   location:'Goa, India',         image:'https://images.unsplash.com/photo-1583183575377-58a8f5b77b8d?auto=format&fit=crop&w=800&q=80', price:9999,  duration:'4 Days / 3 Nights', badge:'Weekend Deal' },
    { _id:'f4', title:'Dubai Extravaganza', location:'Dubai, UAE',         image:'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80', price:54999, duration:'5 Days / 4 Nights', badge:'International' },
    { _id:'f5', title:'Bali Paradise',      location:'Bali, Indonesia',    image:'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80', price:49999, duration:'7 Days / 6 Nights', badge:'Best Seller' },
    { _id:'f6', title:'Rajasthan Heritage', location:'Rajasthan, India',   image:'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80', price:18499, duration:'6 Days / 5 Nights', badge:'' }
];

const TESTIMONIALS = [
    { name:'Priya Sharma',  avatar:'PS', rating:5, text:'Absolutely incredible experience! Supra Travels planned every detail of our Kashmir trip perfectly. The houseboat stay was magical.', trip:'Kashmir Trip' },
    { name:'Rahul Mehta',   avatar:'RM', rating:5, text:'The Dubai package was beyond our expectations. Seamless coordination, beautiful hotels, and the team was available 24/7. Truly premium.', trip:'Dubai Package' },
    { name:'Anjali Nair',   avatar:'AN', rating:5, text:'Kerala backwaters trip was a dream come true. The itinerary was crafted with so much care. Supra Travels really understands travellers!', trip:'Kerala Package' },
    { name:'Vikram Patel',  avatar:'VP', rating:5, text:'Booked the Bali trip for our honeymoon. Every resort, every activity hand-picked for us. Absolutely romantic and stress-free. 10/10!', trip:'Bali Honeymoon' }
];

document.addEventListener('DOMContentLoaded', async () => {

    // ── Load data: try API first, fall back to static ─────────────────────
    let trips   = FALLBACK_TRIPS;
    let contact = FALLBACK_CONTACT;

    try {
        const [tripsRes, contactRes] = await Promise.all([
            fetch(`${API_BASE}/api/trips`),
            fetch(`${API_BASE}/api/config/contact`)
        ]);

        if (tripsRes.ok) {
            const apiTrips = await tripsRes.json();
            if (Array.isArray(apiTrips) && apiTrips.length > 0) trips = apiTrips;
        }
        if (contactRes.ok) contact = await contactRes.json();

        // Also load settings for hero text overrides
        const settingsRes = await fetch(`${API_BASE}/api/config/settings`);
        if (settingsRes.ok) {
            const settings = await settingsRes.json();
            if (settings.heroSubtext)
                document.getElementById('hero-subtext').textContent = settings.heroSubtext;
            if (settings.aboutText)
                document.getElementById('about-text').textContent = settings.aboutText;
        }
    } catch (e) {
        console.warn('API unavailable, using fallback data:', e.message);
    }

    // ── Apply contact info ────────────────────────────────────────────────
    document.getElementById('footer-phone').textContent   = contact.phone;
    document.getElementById('footer-email').textContent   = contact.email;
    document.getElementById('footer-address').textContent = contact.address;
    document.getElementById('cta-phone').textContent      = contact.phone;

    const waFloat = document.getElementById('floating-whatsapp');
    waFloat.href = `https://wa.me/${contact.whatsapp}?text=Hi,%20I%20would%20like%20to%20plan%20a%20trip!`;

    const waCtaLink = document.querySelector('.cta-wa');
    if (waCtaLink) waCtaLink.href = `https://wa.me/${contact.whatsapp}`;

    // ── Render Packages ───────────────────────────────────────────────────
    const container = document.getElementById('packages-container');
    container.innerHTML = '';

    trips.forEach((trip, i) => {
        const delay      = (i % 3) + 1;
        const isDiscount = trip.badge && trip.badge.toUpperCase().includes('OFF');
        const badgeHtml  = trip.badge
            ? `<div class="badge ${isDiscount ? 'discount' : ''}">${trip.badge}</div>` : '';

        const card = document.createElement('div');
        card.className = `card package-card reveal delay-${delay} active`;
        card.innerHTML = `
            <div class="card-img">
                <img src="${trip.image}" alt="${trip.title}" loading="lazy">
                ${badgeHtml}
                <div class="price-tag">
                    <span class="price">₹${Number(trip.price).toLocaleString()}</span>
                    <span class="person">/person</span>
                </div>
            </div>
            <div class="card-content">
                <div class="rating">
                    ${'<i class="fa-solid fa-star"></i>'.repeat(5)}
                </div>
                <h3>${trip.title}</h3>
                <p class="location"><i class="fa-solid fa-location-dot"></i> ${trip.location}</p>
                <div class="card-features">
                    <span><i class="fa-regular fa-clock"></i> ${trip.duration}</span>
                    <span><i class="fa-solid fa-bed"></i> Hotels</span>
                    <span><i class="fa-solid fa-car"></i> Transport</span>
                </div>
                <div class="card-actions">
                    <a href="#contact" class="btn btn-outline">View Details</a>
                    <a href="#contact" class="btn btn-primary">Book Now</a>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    // ── Render Testimonials ───────────────────────────────────────────────
    const testimonialTrack = document.getElementById('testimonial-track');
    if (testimonialTrack) {
        TESTIMONIALS.forEach(t => {
            const stars = '<i class="fa-solid fa-star"></i>'.repeat(t.rating);
            const slide = document.createElement('div');
            slide.className = 'testimonial-slide';
            slide.innerHTML = `
                <div class="testimonial-card glass-panel">
                    <div class="quote-icon"><i class="fa-solid fa-quote-left"></i></div>
                    <p class="testimonial-text">${t.text}</p>
                    <div class="testimonial-footer">
                        <div class="testimonial-avatar">${t.avatar}</div>
                        <div class="testimonial-info">
                            <h4>${t.name}</h4>
                            <span class="trip-tag">${t.trip}</span>
                            <div class="rating">${stars}</div>
                        </div>
                    </div>
                </div>
            `;
            testimonialTrack.appendChild(slide);
        });

        let currentSlide  = 0;
        const slides      = testimonialTrack.querySelectorAll('.testimonial-slide');
        const dotsContainer = document.getElementById('testimonial-dots');

        slides.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = `dot ${i === 0 ? 'active' : ''}`;
            dot.setAttribute('aria-label', `Testimonial ${i + 1}`);
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        });

        function goToSlide(n) {
            currentSlide = (n + slides.length) % slides.length;
            testimonialTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
            dotsContainer.querySelectorAll('.dot').forEach((d, i) =>
                d.classList.toggle('active', i === currentSlide)
            );
        }

        document.getElementById('prev-btn').addEventListener('click', () => goToSlide(currentSlide - 1));
        document.getElementById('next-btn').addEventListener('click', () => goToSlide(currentSlide + 1));
        setInterval(() => goToSlide(currentSlide + 1), 5000);
    }

    // ── Counter Animation ─────────────────────────────────────────────────
    function animateCounter(el) {
        const target = +el.getAttribute('data-target');
        const step   = target / (2000 / 16);
        let current  = 0;
        const timer  = setInterval(() => {
            current += step;
            if (current >= target) {
                el.textContent = target.toLocaleString() + (el.dataset.suffix || '');
                clearInterval(timer);
            } else {
                el.textContent = Math.floor(current).toLocaleString() + (el.dataset.suffix || '');
            }
        }, 16);
    }

    // ── Navbar scroll ─────────────────────────────────────────────────────
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
        revealOnScroll();
    });

    function revealOnScroll() {
        const wh = window.innerHeight;
        document.querySelectorAll('.reveal, .reveal-up').forEach(el => {
            if (el.getBoundingClientRect().top < wh - 100) el.classList.add('active');
        });
        document.querySelectorAll('.stat-number:not(.counted)').forEach(el => {
            if (el.getBoundingClientRect().top < wh - 50) {
                el.classList.add('counted');
                animateCounter(el);
            }
        });
    }

    setTimeout(() => {
        document.querySelectorAll('.hero .reveal-up').forEach(el => el.classList.add('active'));
        revealOnScroll();
    }, 120);

    // ── Mobile Menu ───────────────────────────────────────────────────────
    const hamburger  = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    const closeMenu  = document.getElementById('close-menu');

    if (hamburger && mobileMenu && closeMenu) {
        hamburger.addEventListener('click', () => {
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
        closeMenu.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
        mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = 'auto';
        }));
    }

    // ── Contact Form ──────────────────────────────────────────────────────
    document.getElementById('inquiry-form')?.addEventListener('submit', e => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.textContent = '✓ Sending…';
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = '✓ Request Sent!';
            btn.style.background = '#16a34a';
            e.target.reset();
            setTimeout(() => {
                btn.textContent    = 'Send Request';
                btn.style.background = '';
                btn.disabled = false;
            }, 3000);
        }, 1200);
    });
});
