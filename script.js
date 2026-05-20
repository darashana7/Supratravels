// ── API base URL ─────────────────────────────────────────────────────────────
// In production this points to your Render backend.
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://supratravels.onrender.com';

// ── Static fallback data (shown if API is unavailable) ───────────────────────
const FALLBACK_CONTACT = {
    phone: '+91 96860 20017',
    whatsapp: '919686020017',
    email: 'info@supratravels.in',
    address: 'Main Road, Hosadurga, Karnataka - 577527'
};

const FALLBACK_TRIPS = [
    { _id: 'f1', title: 'Bangalore to Hosadurga', location: 'Hosadurga, Karnataka', image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80', price: 450, duration: '5h 30m', badge: 'DAILY' },
    { _id: 'f2', title: 'Bangalore to Chitradurga', location: 'Chitradurga, Karnataka', image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80', price: 550, duration: '6h 15m', badge: 'AC Sleeper' },
    { _id: 'f3', title: 'Hosadurga to Bangalore', location: 'Bangalore, Karnataka', image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80', price: 450, duration: '5h 30m', badge: 'DAILY' },
    { _id: 'f4', title: 'Bangalore to Davangere', location: 'Davangere, Karnataka', image: 'https://images.unsplash.com/photo-1562620669-9839e5571477?auto=format&fit=crop&w=800&q=80', price: 600, duration: '6h 45m', badge: 'Express' }
];

const TESTIMONIALS = [
    { name: 'Ramesh Kumar', avatar: 'RK', rating: 5, text: 'Excellent service! The bus was clean, AC worked perfectly, and we reached on time. Highly recommend!', trip: 'Bangalore to Hosadurga' },
    { name: 'Priya Sharma', avatar: 'PS', rating: 5, text: 'Booking was so easy and the seats were very comfortable. Will definitely travel with Supra again.', trip: 'Bangalore to Chitradurga' },
    { name: 'Manjunath G', avatar: 'MG', rating: 5, text: 'Been using Supra for my weekly travel between Bangalore and Hosadurga. Never disappointed!', trip: 'Hosadurga to Bangalore' }
];

// ── 3D GLOBE GLOBAL STATE ───────────────────────────────────────────────────
let scene, camera, renderer, globeGroup;
let isRotatingGlobe = true;
let globeRotateTimeout;
let routeLines = [];

// Geographically accurate coordinates for operational Karnataka hubs
const HUB_COORDS = {
    'Bangalore': { lat: 12.9716, lon: 77.5946 },
    'Tumkur': { lat: 13.3379, lon: 77.1173 },
    'Hiriyur': { lat: 13.9456, lon: 76.6189 },
    'Hosadurga': { lat: 13.7947, lon: 76.2893 },
    'Chitradurga': { lat: 14.2251, lon: 76.4005 },
    'Davangere': { lat: 14.4644, lon: 75.9218 }
};

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
        { x: 730, y: 180, r: 65 }, { x: 750, y: 220, r: 55 }, { x: 690, y: 200, r: 40 }, // India / Asia Focus
        { x: 530, y: 140, r: 40 }, { x: 560, y: 110, r: 35 }, // Europe
        { x: 540, y: 300, r: 70 }, { x: 560, y: 380, r: 45 }, // Africa
        { x: 230, y: 150, r: 65 }, { x: 280, y: 180, r: 40 }, // N. America
        { x: 300, y: 380, r: 55 }, { x: 330, y: 440, r: 35 }, // S. America
        { x: 880, y: 370, r: 45 }, { x: 910, y: 390, r: 35 }  // Australia
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

// Draw a glowing 3D Bezier curve arc representing travel routes
function draw3DRouteArc(startKey, endKey) {
    const start = HUB_COORDS[startKey];
    const end = HUB_COORDS[endKey];
    if (!start || !end) return null;
    
    const r = 12.0; // Radius matches earth sphere core
    const startVec = latLonToVector3(start.lat, start.lon, r);
    const endVec = latLonToVector3(end.lat, end.lon, r);
    
    // Calculate control midpoint raised above the surface
    const midPoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
    const distance = startVec.distanceTo(endVec);
    
    // In Karnataka coordinates are close, so we blow up the arc height factor slightly for visibility
    const arcHeight = r + distance * 1.5; 
    midPoint.normalize().multiplyScalar(arcHeight);
    
    const curve = new THREE.QuadraticBezierCurve3(startVec, midPoint, endVec);
    const points = curve.getPoints(50);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    
    const lineMat = new THREE.LineBasicMaterial({
        color: 0x2563eb, // Default tech blue
        linewidth: 3,
        transparent: true,
        opacity: 0.6
    });
    
    const line = new THREE.Line(lineGeo, lineMat);
    globeGroup.add(line);
    
    return { line, startKey, endKey, lineMat };
}

// Center the globe on a specific route and highlight its arc
function focusRoute(startKey, endKey) {
    if (!globeGroup) return;
    isRotatingGlobe = false;
    
    const start = HUB_COORDS[startKey];
    const end = HUB_COORDS[endKey];
    if (!start || !end) return;
    
    // Target coordinate is the midpoint of the route
    const midLat = (start.lat + end.lat) / 2;
    const midLon = (start.lon + end.lon) / 2;
    
    // Convert geographic coordinate to Euler angles
    const targetY = -(midLon * Math.PI / 180) - Math.PI / 2;
    const targetX = (midLat * Math.PI / 180);
    
    gsap.killTweensOf(globeGroup.rotation);
    
    // Rotate globe to midpoint
    gsap.to(globeGroup.rotation, {
        x: targetX,
        y: targetY,
        duration: 1.4,
        ease: 'power2.out'
    });
    
    // Highlight matching route line and dim others
    routeLines.forEach(rl => {
        if ((rl.startKey === startKey && rl.endKey === endKey) || (rl.startKey === endKey && rl.endKey === startKey)) {
            rl.lineMat.color.setHex(0xf97316); // Highlight Orange
            rl.lineMat.opacity = 1.0;
        } else {
            rl.lineMat.color.setHex(0x2563eb); // Reset to Blue
            rl.lineMat.opacity = 0.25;
        }
    });
}

// Reset route line highlights
function resetRouteHighlights() {
    routeLines.forEach(rl => {
        rl.lineMat.color.setHex(0x2563eb);
        rl.lineMat.opacity = 0.6;
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
    if (waFloat) waFloat.href = `https://wa.me/${contact.whatsapp}?text=Hi,%20I%20would%20like%20to%20book%20a%20seat!`;

    const waCtaLink = document.querySelector('.cta-wa');
    if (waCtaLink) waCtaLink.href = `https://wa.me/${contact.whatsapp}`;

    // ── Initialize 3D Globe ───────────────────────────────────────────────
    if (typeof THREE !== 'undefined') {
        try {
            init3DGlobe(trips);
        } catch (e) {
            console.error('Error rendering 3D Globe:', e);
        }
    } else {
        console.warn('Three.js is not loaded. High-fidelity CSS fallback remains active.');
    }


    // ── Render Packages/Routes ────────────────────────────────────────────
    const container = document.getElementById('packages-container');
    if (container) {
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
                        <span class="person">/seat</span>
                    </div>
                </div>
                <div class="card-content">
                    <div class="rating">
                        ${'<i class="fa-solid fa-star"></i>'.repeat(5)}
                    </div>
                    <h3>${trip.title}</h3>
                    <p class="location"><i class="fa-solid fa-route"></i> ${trip.location}</p>
                    <div class="card-features">
                        <span><i class="fa-regular fa-clock"></i> ${trip.duration}</span>
                        <span><i class="fa-solid fa-couch"></i> AC Sleeper</span>
                        <span><i class="fa-solid fa-location-arrow"></i> Daily Service</span>
                    </div>
                    <div class="card-actions">
                        <a href="#contact" class="btn btn-outline">View Details</a>
                        <a href="#contact" class="btn btn-primary">Book Now</a>
                    </div>
                </div>
            `;
            
            // Highlight route paths on card hover
            card.addEventListener('mouseenter', () => {
                let startNode = 'Bangalore';
                let endNode = 'Hosadurga';
                
                const titleLower = trip.title.toLowerCase();
                if (titleLower.includes('bangalore') && titleLower.includes('hosadurga')) {
                    startNode = 'Bangalore'; endNode = 'Hosadurga';
                } else if (titleLower.includes('bangalore') && titleLower.includes('chitradurga')) {
                    startNode = 'Bangalore'; endNode = 'Chitradurga';
                } else if (titleLower.includes('hosadurga') && titleLower.includes('bangalore')) {
                    startNode = 'Hosadurga'; endNode = 'Bangalore';
                } else if (titleLower.includes('bangalore') && titleLower.includes('davangere')) {
                    startNode = 'Bangalore'; endNode = 'Davangere';
                }
                
                focusRoute(startNode, endNode);
            });
            
            card.addEventListener('mouseleave', () => {
                resetRouteHighlights();
                clearTimeout(globeRotateTimeout);
                globeRotateTimeout = setTimeout(() => {
                    isRotatingGlobe = true;
                }, 3000);
            });

            container.appendChild(card);
        });
    }

    // Wire 3D tilt effects
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
function init3DGlobe() {
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
    
    // Setup Scene
    scene = new THREE.Scene();
    
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;
    
    // Setup camera centered closer to Karnataka region for focus
    camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(4, 9, 26); // Angle targeting southern India
    camera.lookAt(0, 0, 0);
    
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
        color: 0x2563eb,
        wireframe: true,
        transparent: true,
        opacity: 0.08
    });
    const wireMesh = new THREE.Mesh(earthGeo, wireMat);
    wireMesh.scale.setScalar(1.015);
    globeGroup.add(wireMesh);
    
    // Add Glowing Hub Pins for all Karnataka stations
    Object.keys(HUB_COORDS).forEach(key => {
        const coords = HUB_COORDS[key];
        const pinPos = latLonToVector3(coords.lat, coords.lon, 12.0);
        
        const pinGroup = new THREE.Group();
        pinGroup.position.copy(pinPos);
        
        // Orient pin pointing outwards from center
        const direction = pinPos.clone().normalize();
        const up = new THREE.Vector3(0, 1, 0);
        pinGroup.quaternion.setFromUnitVectors(up, direction);
        
        // Pin Base Circle Ring
        const ringGeo = new THREE.RingGeometry(0.1, 0.25, 12);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xf97316,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        pinGroup.add(ringMesh);
        
        // Orange glowing indicator tip
        const glowGeo = new THREE.SphereGeometry(0.2, 8, 8);
        glowGeo.translate(0, 0.25, 0);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xf97316,
            transparent: true,
            opacity: 0.95
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        pinGroup.add(glowMesh);
        
        globeGroup.add(pinGroup);
    });
    
    // Draw 3D Route Lines connecting operational paths
    routeLines = [
        draw3DRouteArc('Bangalore', 'Tumkur'),
        draw3DRouteArc('Tumkur', 'Hiriyur'),
        draw3DRouteArc('Hiriyur', 'Hosadurga'),
        draw3DRouteArc('Hiriyur', 'Chitradurga'),
        draw3DRouteArc('Chitradurga', 'Davangere')
    ].filter(Boolean);
    
    // Lights Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight1.position.set(5, 10, 20);
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0x2563eb, 0.7); // Rim light
    directionalLight2.position.set(-15, 10, -10);
    scene.add(directionalLight2);
    
    // Initial Earth Rotation to point to Karnataka, India on startup
    const india = HUB_COORDS['Bangalore'];
    const targetY = -(india.lon * Math.PI / 180) - Math.PI / 2;
    const targetX = (india.lat * Math.PI / 180);
    globeGroup.rotation.set(targetX, targetY, 0);
    
    // Render loop animation
    function animateGlobe() {
        requestAnimationFrame(animateGlobe);
        
        if (isRotatingGlobe) {
            globeGroup.rotation.y += 0.0018; // Very slow drift
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
