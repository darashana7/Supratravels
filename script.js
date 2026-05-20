// ── API base URL ─────────────────────────────────────────────────────────────
// In production this points to your Render backend.
// For local dev, change to 'http://localhost:5000'
const API_BASE = window.SUPRA_API_URL || 'https://supratravels.onrender.com';

// ── Static fallback data (shown if API is unavailable) ───────────────────────
const FALLBACK_CONTACT = {
    phone: '+91 98765 43210',
    whatsapp: '919876543210',
    email: 'info@supratravels.in',
    address: '124 Travel Avenue, Jubilee Hills, Hyderabad – 500033'
};

const FALLBACK_TRIPS = [
    { _id: 'f1', title: 'Kerala Backwaters', location: 'Kerala, India', image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80', price: 15999, duration: '5 Days / 4 Nights', badge: 'Most Popular' },
    { _id: 'f2', title: 'Majestic Kashmir', location: 'J&K, India', image: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80', price: 22499, duration: '6 Days / 5 Nights', badge: '20% OFF' },
    { _id: 'f3', title: 'Goa Beach Escape', location: 'Goa, India', image: 'https://images.unsplash.com/photo-1583183575377-58a8f5b77b8d?auto=format&fit=crop&w=800&q=80', price: 9999, duration: '4 Days / 3 Nights', badge: 'Weekend Deal' },
    { _id: 'f4', title: 'Dubai Extravaganza', location: 'Dubai, UAE', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80', price: 54999, duration: '5 Days / 4 Nights', badge: 'International' },
    { _id: 'f5', title: 'Bali Paradise', location: 'Bali, Indonesia', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80', price: 49999, duration: '7 Days / 6 Nights', badge: 'Best Seller' },
    { _id: 'f6', title: 'Rajasthan Heritage', location: 'Rajasthan, India', image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80', price: 18499, duration: '6 Days / 5 Nights', badge: '' }
];

const TESTIMONIALS = [
    { name: 'Priya Sharma', avatar: 'PS', rating: 5, text: 'Absolutely incredible experience! Supra Travels planned every detail of our Kashmir trip perfectly. The houseboat stay was magical.', trip: 'Kashmir Trip' },
    { name: 'Rahul Mehta', avatar: 'RM', rating: 5, text: 'The Dubai package was beyond our expectations. Seamless coordination, beautiful hotels, and the team was available 24/7. Truly premium.', trip: 'Dubai Package' },
    { name: 'Anjali Nair', avatar: 'AN', rating: 5, text: 'Kerala backwaters trip was a dream come true. The itinerary was crafted with so much care. Supra Travels really understands travellers!', trip: 'Kerala Package' },
    { name: 'Vikram Patel', avatar: 'VP', rating: 5, text: 'Booked the Bali trip for our honeymoon. Every resort, every activity hand-picked for us. Absolutely romantic and stress-free. 10/10!', trip: 'Bali Honeymoon' }
];

// ── 3D GLOBE GLOBAL STATE ───────────────────────────────────────────────────
let scene, camera, renderer, globeGroup;
let isRotatingGlobe = true;
let globeRotateTimeout;

// Map locations to Latitude/Longitude for 3D Earth positioning
const DEST_COORDS = {
    'Kerala Backwaters': { lat: 10.85, lon: 76.27 },
    'Majestic Kashmir': { lat: 34.08, lon: 74.79 },
    'Goa Beach Escape': { lat: 15.29, lon: 74.12 },
    'Dubai Extravaganza': { lat: 25.204, lon: 55.27 },
    'Bali Paradise': { lat: -8.409, lon: 115.18 },
    'Rajasthan Heritage': { lat: 27.02, lon: 74.21 }
};

// Get geographic coordinates for a destination (with deterministic hash fallback)
function getCoordsForTrip(title, location) {
    const t = title.toLowerCase();
    const l = location.toLowerCase();
    
    if (t.includes('kerala') || l.includes('kerala')) return DEST_COORDS['Kerala Backwaters'];
    if (t.includes('kashmir') || l.includes('kashmir') || l.includes('j&k')) return DEST_COORDS['Majestic Kashmir'];
    if (t.includes('goa') || l.includes('goa')) return DEST_COORDS['Goa Beach Escape'];
    if (t.includes('dubai') || l.includes('dubai')) return DEST_COORDS['Dubai Extravaganza'];
    if (t.includes('bali') || l.includes('bali')) return DEST_COORDS['Bali Paradise'];
    if (t.includes('rajasthan') || l.includes('rajasthan')) return DEST_COORDS['Rajasthan Heritage'];
    
    // Deterministic fallback coordinates for any new user packages
    let hash = 0;
    const str = title + location;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const lat = (hash % 50) - 10; // -10 to 40
    const lon = ((hash >> 8) % 110) + 40; // 40 to 150 (focused on EMEA / APAC)
    return { lat, lon };
}

// Convert Lat/Lon coordinates to a Vector3 on the 3D Sphere surface
function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.sin(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);
    return new THREE.Vector3(x, y, z);
}

// Generate a procedural high-tech canvas texture offline-safely
function createProceduralEarthTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Depth space gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#0a1731');
    grad.addColorStop(0.5, '#0c224b');
    grad.addColorStop(1, '#0e2b5e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Latitude/longitude lines
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.22)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 36; i++) {
        const x = (i / 36) * canvas.width;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let j = 0; j <= 18; j++) {
        const y = (j / 18) * canvas.height;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    
    // Stylized orange neon landmasses
    ctx.fillStyle = '#f97316';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ea580c';
    
    const landmasses = [
        { x: 730, y: 180, r: 60 }, { x: 750, y: 220, r: 50 }, { x: 690, y: 200, r: 40 },
        { x: 800, y: 160, r: 45 }, { x: 830, y: 210, r: 35 }, { x: 770, y: 270, r: 25 }, // Asia
        { x: 530, y: 140, r: 40 }, { x: 560, y: 110, r: 35 }, { x: 490, y: 130, r: 30 }, // Europe
        { x: 540, y: 300, r: 70 }, { x: 560, y: 380, r: 45 }, { x: 610, y: 330, r: 35 }, // Africa
        { x: 230, y: 150, r: 65 }, { x: 180, y: 130, r: 45 }, { x: 280, y: 180, r: 40 }, // N. America
        { x: 300, y: 380, r: 55 }, { x: 330, y: 440, r: 35 }, { x: 270, y: 330, r: 30 }, // S. America
        { x: 880, y: 370, r: 45 }, { x: 910, y: 390, r: 35 }, // Australia
        { x: 380, y: 70, r: 40 } // Greenland
    ];
    
    landmasses.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r + 14, 0, Math.PI * 2);
        ctx.stroke();
    });
    
    return new THREE.CanvasTexture(canvas);
}

// Rotate the globe smoothly to target Lat/Lon
function rotateGlobeTo(lat, lon) {
    if (!globeGroup) return;
    
    isRotatingGlobe = false;
    
    // Convert geographic coordinates to Euler angle offsets for Y and X axis rotations
    const targetY = -(lon * Math.PI / 180) - Math.PI / 2;
    const targetX = (lat * Math.PI / 180);
    
    gsap.killTweensOf(globeGroup.rotation);
    gsap.to(globeGroup.rotation, {
        x: targetX,
        y: targetY,
        duration: 1.6,
        ease: 'power2.out'
    });
}

// ── DOM CONTENT LOADED ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

    // ── Load data: try API first, fall back to static ─────────────────────
    let trips = FALLBACK_TRIPS;
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
    document.getElementById('footer-phone').textContent = contact.phone;
    document.getElementById('footer-email').textContent = contact.email;
    document.getElementById('footer-address').textContent = contact.address;
    document.getElementById('cta-phone').textContent = contact.phone;

    const waFloat = document.getElementById('floating-whatsapp');
    waFloat.href = `https://wa.me/${contact.whatsapp}?text=Hi,%20I%20would%20like%20to%20plan%20a%20trip!`;

    const waCtaLink = document.querySelector('.cta-wa');
    if (waCtaLink) waCtaLink.href = `https://wa.me/${contact.whatsapp}`;

    // ── Initialize 3D Globe ───────────────────────────────────────────────
    init3DGlobe(trips);

    // ── Render Packages ───────────────────────────────────────────────────
    const container = document.getElementById('packages-container');
    container.innerHTML = '';

    trips.forEach((trip, i) => {
        const delay = (i % 3) + 1;
        const isDiscount = trip.badge && trip.badge.toUpperCase().includes('OFF');
        const badgeHtml = trip.badge
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
        
        // Dynamic hover alignment with the 3D globe coordinates
        card.addEventListener('mouseenter', () => {
            const coords = getCoordsForTrip(trip.title, trip.location);
            rotateGlobeTo(coords.lat, coords.lon);
        });
        
        card.addEventListener('mouseleave', () => {
            clearTimeout(globeRotateTimeout);
            globeRotateTimeout = setTimeout(() => {
                isRotatingGlobe = true;
            }, 3000);
        });

        container.appendChild(card);
    });

    // Wire tilt effect to cards
    init3DTilt();

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

        let currentSlide = 0;
        const slides = testimonialTrack.querySelectorAll('.testimonial-slide');
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
        const step = target / (2000 / 16);
        let current = 0;
        const timer = setInterval(() => {
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
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    const closeMenu = document.getElementById('close-menu');

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
                btn.textContent = 'Send Request';
                btn.style.background = '';
                btn.disabled = false;
            }, 3000);
        }, 1200);
    });
});

// ── THREE.JS GLOBE BUILDER ───────────────────────────────────────────────────
function init3DGlobe(trips) {
    const container = document.getElementById('hero-3d-container');
    if (!container) return;
    
    // Clear out fallback text or indicators
    container.innerHTML = '';
    
    // Initialize WebGL checking
    try {
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
        if (!gl) throw new Error('WebGL not supported');
    } catch (e) {
        console.warn('WebGL is missing or disabled. Graceful static design is activated.', e.message);
        container.style.display = 'none';
        return;
    }
    
    // Setup Scene, Camera
    scene = new THREE.Scene();
    
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 40;
    
    // Setup Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    
    // Create Globe Group
    globeGroup = new THREE.Group();
    scene.add(globeGroup);
    
    // Earth Sphere Core
    const earthGeo = new THREE.SphereGeometry(12, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
        map: createProceduralEarthTexture(),
        shininess: 30,
        bumpScale: 0.1,
        transparent: true,
        opacity: 0.96
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    globeGroup.add(earthMesh);
    
    // Holographic wireframe overlay shell
    const wireMat = new THREE.MeshBasicMaterial({
        color: 0x2563eb, // blue technological glow wireframe
        wireframe: true,
        transparent: true,
        opacity: 0.08
    });
    const wireMesh = new THREE.Mesh(earthGeo, wireMat);
    wireMesh.scale.setScalar(1.02);
    globeGroup.add(wireMesh);
    
    // Add Glowing Pins for Destinations
    trips.forEach(trip => {
        const coords = getCoordsForTrip(trip.title, trip.location);
        const pinPos = latLonToVector3(coords.lat, coords.lon, 12.0);
        
        const pinGroup = new THREE.Group();
        pinGroup.position.copy(pinPos);
        
        // Orient pin pointing outwards from center
        const direction = pinPos.clone().normalize();
        const up = new THREE.Vector3(0, 1, 0);
        pinGroup.quaternion.setFromUnitVectors(up, direction);
        
        // Blue spike
        const spikeGeo = new THREE.ConeGeometry(0.2, 1.2, 8);
        spikeGeo.translate(0, 0.6, 0); // pivot at base
        const spikeMat = new THREE.MeshBasicMaterial({
            color: 0x2563eb,
            transparent: true,
            opacity: 0.75
        });
        const spikeMesh = new THREE.Mesh(spikeGeo, spikeMat);
        pinGroup.add(spikeMesh);
        
        // Orange glowing indicator tip
        const glowGeo = new THREE.SphereGeometry(0.35, 8, 8);
        glowGeo.translate(0, 1.2, 0);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xf97316,
            transparent: true,
            opacity: 0.95
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        pinGroup.add(glowMesh);
        
        globeGroup.add(pinGroup);
    });
    
    // Lights Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight1.position.set(5, 5, 20);
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0x2563eb, 0.6); // Soft blue rim light
    directionalLight2.position.set(-15, 10, -10);
    scene.add(directionalLight2);
    
    // Render loop animation
    function animateGlobe() {
        requestAnimationFrame(animateGlobe);
        
        if (isRotatingGlobe) {
            globeGroup.rotation.y += 0.0025;
        }
        
        renderer.render(scene, camera);
    }
    
    animateGlobe();
    
    // Resize handler
    window.addEventListener('resize', () => {
        const newW = container.clientWidth;
        const newH = container.clientHeight;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
    });
}

// ── CUSTOM 3D TILT EFFECT ────────────────────────────────────────────────────
function init3DTilt() {
    const tiltElements = document.querySelectorAll('.card, .service-card, .testimonial-card, .about-image');
    
    tiltElements.forEach(el => {
        el.addEventListener('mousemove', e => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const xc = rect.width / 2;
            const yc = rect.height / 2;
            
            // Limit angles to 12 degrees max rotation
            const angleX = ((yc - y) / yc) * 12;
            const angleY = -(((xc - x) / xc) * 12);
            
            el.style.transform = `rotateX(${angleX}deg) rotateY(${angleY}deg) scale3d(1.02, 1.02, 1.02)`;
        });
        
        el.addEventListener('mouseleave', () => {
            el.style.transform = `rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
    });
}
