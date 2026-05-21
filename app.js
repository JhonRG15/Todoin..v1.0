let map;
let markersOnMap = []; // Array of Google Maps marker objects
let currentSessionUser = null;

// Temporary variable to hold map click location before marker is created
let pendingMarkerLocation = null;
let categories = [];

// ==========================================
// GOOGLE MAPS INIT & LOGIC
// ==========================================
function initMap() {
    console.log("Initializing Map...");
    const defaultLocation = { lat: 4.6097, lng: -74.0817 }; // Bogotá

    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultLocation,
        zoom: 12,
        styles: typeof mapStyles !== 'undefined' ? mapStyles : [],
        disableDefaultUI: false,
        zoomControl: true,
    });

    map.addListener("click", (event) => {
        if (!currentSessionUser) {
            alert("Debes iniciar sesión para crear marcadores.");
            return;
        }
        pendingMarkerLocation = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
        };
        openCreateMarkerModal();
    });

    console.log("Map ready!");
    
    // Load categories immediately
    fetchCategories();

    // If user is already logged in on map load, fetch markers
    if (currentSessionUser) {
        fetchUserMarkers(currentSessionUser.id_usuario);
    }
}
window.initMap = initMap;

// ==========================================
// API CALLS & MARKER STATE
// ==========================================
async function fetchCategories() {
    try {
        const response = await fetch("/api/categorias");
        if (response.ok) {
            categories = await response.json();
            populateCategorySelects();
        }
    } catch (e) {
        console.error("Error fetching categories:", e);
    }
}

function populateCategorySelects() {
    const createSelect = document.getElementById("marker-category");
    const editSelect = document.getElementById("edit-marker-category");
    
    let html = '<option value="" disabled selected>Selecciona una categoría</option>';
    categories.forEach(cat => {
        html += `<option value="${cat.id_categoria}">${cat.nombre_categoria}</option>`;
    });

    if (createSelect) createSelect.innerHTML = html;
    if (editSelect) editSelect.innerHTML = html;
}

async function fetchUserMarkers(id_usuario) {
    try {
        const response = await fetch(`/api/marcadores?id_usuario=${id_usuario}`);
        if (response.ok) {
            const markers = await response.json();
            drawMarkersOnMap(markers);
        }
    } catch (e) {
        console.error("Error fetching markers:", e);
    }
}

function drawMarkersOnMap(markersData) {
    clearMarkersFromMap();

    markersData.forEach(data => {
        const marker = new google.maps.Marker({
            position: { lat: data.latitud, lng: data.longitud },
            map: map,
            animation: google.maps.Animation.DROP,
            title: data.titulo
        });

        // Store db data in marker object for easy access
        marker.dbData = data;

        marker.addListener("click", () => {
            if (!currentSessionUser) return;
            openEditMarkerModal(marker.dbData);
        });

        markersOnMap.push(marker);
    });

    updateMarkerCount();
}

function clearMarkersFromMap() {
    markersOnMap.forEach(m => m.setMap(null));
    markersOnMap = [];
    updateMarkerCount();
}

function updateMarkerCount() {
    const countElement = document.getElementById("marker-count");
    if (countElement) {
        countElement.innerText = `${markersOnMap.length} marcadores registrados`;
    }
}

// ==========================================
// MODAL & SESSION UI LOGIC
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // --- Elements ---
    const navContainer = document.getElementById("nav-container");

    const registerModal = document.getElementById("register-modal");
    const registerForm = document.getElementById("register-form");
    const btnSubmitRegister = document.getElementById("btn-submit-register");

    const loginModal = document.getElementById("login-modal");
    const loginForm = document.getElementById("login-form");
    const btnSubmitLogin = document.getElementById("btn-submit-login");

    const createMarkerModal = document.getElementById("create-marker-modal");
    const createMarkerForm = document.getElementById("create-marker-form");
    const btnSubmitMarker = document.getElementById("btn-submit-marker");

    const editMarkerModal = document.getElementById("edit-marker-modal");
    const editMarkerForm = document.getElementById("edit-marker-form");
    const btnSubmitEdit = document.getElementById("btn-submit-edit");
    const btnDeleteMarker = document.getElementById("btn-delete-marker");

    // --- Modal Toggles ---
    window.openCreateMarkerModal = () => {
        if (createMarkerModal) {
            createMarkerModal.classList.remove("hidden");
            if (createMarkerForm) createMarkerForm.reset();
            hideFeedback("create-marker-message");
        }
    };

    window.openEditMarkerModal = (markerData) => {
        if (editMarkerModal) {
            editMarkerModal.classList.remove("hidden");
            hideFeedback("edit-marker-message");
            
            // Populate form
            document.getElementById("edit-marker-id").value = markerData.id_marcador;
            document.getElementById("edit-marker-title").value = markerData.titulo;
            document.getElementById("edit-marker-category").value = markerData.id_categoria;
            document.getElementById("edit-marker-desc").value = markerData.descripcion || "";
        }
    };

    function openRegisterModal() {
        if (registerModal) {
            registerModal.classList.remove("hidden");
            if (registerForm) registerForm.reset();
            hideFeedback("register-message");
        }
    }

    function openLoginModal() {
        if (loginModal) {
            loginModal.classList.remove("hidden");
            if (loginForm) loginForm.reset();
            hideFeedback("login-message");
        }
    }

    const friendsModal = document.getElementById("friends-modal");

    function openFriendsModal() {
        if (friendsModal) {
            friendsModal.classList.remove("hidden");
            loadFriends();
            loadFriendRequests();
        }
    }

    function closeAllModals() {
        if (registerModal) registerModal.classList.add("hidden");
        if (loginModal) loginModal.classList.add("hidden");
        if (createMarkerModal) createMarkerModal.classList.add("hidden");
        if (editMarkerModal) editMarkerModal.classList.add("hidden");
        if (friendsModal) friendsModal.classList.add("hidden");
        pendingMarkerLocation = null;
    }

    // --- Close Modal Listeners ---
    document.querySelectorAll(".close-btn").forEach(btn => {
        btn.addEventListener("click", closeAllModals);
    });

    window.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal-overlay")) {
            closeAllModals();
        }
    });

    // --- Navigation Event Delegation ---
    if (navContainer) {
        navContainer.addEventListener("click", (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;
            if (btn.id === "btn-register") openRegisterModal();
            else if (btn.id === "btn-login") openLoginModal();
            else if (btn.id === "btn-logout") logoutUser();
            else if (btn.id === "btn-friends") openFriendsModal();
        });
    }

    // --- Forms Handling ---
    
    // Register
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nombre = document.getElementById("reg-nombre").value.trim();
            const correo = document.getElementById("reg-correo").value.trim();
            const contrasena = document.getElementById("reg-contrasena").value;

            if (!nombre || !correo || !contrasena) return showFeedback("register-message", "Por favor, llena todos los campos.", "error");
            if (contrasena.length < 6) return showFeedback("register-message", "La contraseña debe tener al menos 6 caracteres.", "error");

            setLoading(btnSubmitRegister, true, "Registrando...");
            try {
                const res = await fetch("/api/usuarios", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nombre, correo, contrasena })
                });
                const data = await res.json();
                if (res.ok) {
                    showFeedback("register-message", "¡Registro exitoso!", "success");
                    registerForm.reset();
                    setTimeout(closeAllModals, 2000);
                } else showFeedback("register-message", data.error, "error");
            } catch (err) {
                showFeedback("register-message", "Error de conexión.", "error");
            } finally {
                setLoading(btnSubmitRegister, false, "Registrarse");
            }
        });
    }

    // Login
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const correo = document.getElementById("login-correo").value.trim();
            const contrasena = document.getElementById("login-contrasena").value;

            if (!correo || !contrasena) return showFeedback("login-message", "Campos incompletos.", "error");

            setLoading(btnSubmitLogin, true, "Iniciando...");
            try {
                const res = await fetch("/api/login", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ correo, contrasena })
                });
                const data = await res.json();
                if (res.ok) {
                    showFeedback("login-message", "¡Inicio de sesión exitoso!", "success");
                    loginForm.reset();
                    
                    localStorage.setItem("currentUser", JSON.stringify(data.usuario));
                    currentSessionUser = data.usuario;
                    updateHeaderUI(data.usuario);
                    
                    // Fetch markers immediately
                    fetchUserMarkers(currentSessionUser.id_usuario);
                    
                    setTimeout(closeAllModals, 2000);
                } else showFeedback("login-message", data.error, "error");
            } catch (err) {
                showFeedback("login-message", "Error de conexión.", "error");
            } finally {
                setLoading(btnSubmitLogin, false, "Iniciar Sesión");
            }
        });
    }

    // Create Marker
    if (createMarkerForm) {
        createMarkerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!currentSessionUser || !pendingMarkerLocation) return;

            const titulo = document.getElementById("marker-title").value.trim();
            const id_categoria = document.getElementById("marker-category").value;
            const descripcion = document.getElementById("marker-desc").value.trim();

            if (!titulo || !id_categoria) return showFeedback("create-marker-message", "Faltan campos obligatorios.", "error");

            setLoading(btnSubmitMarker, true, "Guardando...");
            try {
                const res = await fetch("/api/marcadores", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        titulo, descripcion, id_categoria, 
                        latitud: pendingMarkerLocation.lat, 
                        longitud: pendingMarkerLocation.lng,
                        id_usuario: currentSessionUser.id_usuario
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    showFeedback("create-marker-message", "¡Marcador guardado!", "success");
                    fetchUserMarkers(currentSessionUser.id_usuario); // Refresh map
                    setTimeout(closeAllModals, 1500);
                } else showFeedback("create-marker-message", data.error, "error");
            } catch (err) {
                showFeedback("create-marker-message", "Error de conexión.", "error");
            } finally {
                setLoading(btnSubmitMarker, false, "Guardar Marcador");
            }
        });
    }

    // Edit Marker
    if (editMarkerForm) {
        editMarkerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!currentSessionUser) return;

            const id_marcador = document.getElementById("edit-marker-id").value;
            const titulo = document.getElementById("edit-marker-title").value.trim();
            const id_categoria = document.getElementById("edit-marker-category").value;
            const descripcion = document.getElementById("edit-marker-desc").value.trim();

            if (!titulo || !id_categoria) return showFeedback("edit-marker-message", "Faltan campos obligatorios.", "error");

            setLoading(btnSubmitEdit, true, "Actualizando...");
            try {
                const res = await fetch(`/api/marcadores/${id_marcador}`, {
                    method: "PUT", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        titulo, descripcion, id_categoria, 
                        id_usuario: currentSessionUser.id_usuario
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    showFeedback("edit-marker-message", "¡Actualizado!", "success");
                    fetchUserMarkers(currentSessionUser.id_usuario);
                    setTimeout(closeAllModals, 1500);
                } else showFeedback("edit-marker-message", data.error, "error");
            } catch (err) {
                showFeedback("edit-marker-message", "Error de conexión.", "error");
            } finally {
                setLoading(btnSubmitEdit, false, "Actualizar Marcador");
            }
        });
    }

    // Delete Marker
    if (btnDeleteMarker) {
        btnDeleteMarker.addEventListener("click", async () => {
            if (!currentSessionUser || !confirm("¿Seguro que deseas eliminar este marcador?")) return;
            
            const id_marcador = document.getElementById("edit-marker-id").value;
            const originalText = btnDeleteMarker.innerText;
            btnDeleteMarker.innerText = "Eliminando...";
            btnDeleteMarker.disabled = true;

            try {
                const res = await fetch(`/api/marcadores/${id_marcador}?id_usuario=${currentSessionUser.id_usuario}`, {
                    method: "DELETE"
                });
                const data = await res.json();
                if (res.ok) {
                    showFeedback("edit-marker-message", "¡Marcador eliminado!", "success");
                    fetchUserMarkers(currentSessionUser.id_usuario);
                    setTimeout(closeAllModals, 1500);
                } else showFeedback("edit-marker-message", data.error, "error");
            } catch (err) {
                showFeedback("edit-marker-message", "Error de conexión.", "error");
            } finally {
                btnDeleteMarker.innerText = originalText;
                btnDeleteMarker.disabled = false;
            }
        });
    }

    // --- Helpers ---
    function showFeedback(id, message, type) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = message;
        el.className = `form-message ${type}`;
        el.classList.remove("hidden");
    }

    function hideFeedback(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    }

    function setLoading(btn, isLoading, loadText) {
        if (!btn) return;
        const textSpan = btn.querySelector("span");
        const loader = btn.querySelector(".btn-loader");
        btn.disabled = isLoading;
        if (loader) {
            if (isLoading) loader.classList.remove("hidden");
            else loader.classList.add("hidden");
        }
        if (textSpan) textSpan.textContent = loadText;
    }

    // --- Session Init ---
    function checkActiveSession() {
        const cachedUser = localStorage.getItem("currentUser");
        if (cachedUser) {
            try {
                currentSessionUser = JSON.parse(cachedUser);
                updateHeaderUI(currentSessionUser);
                // Note: fetchUserMarkers is also called in initMap if it loads after this.
                if (map) fetchUserMarkers(currentSessionUser.id_usuario); 
            } catch (e) {
                localStorage.removeItem("currentUser");
                currentSessionUser = null;
                restoreHeaderUI();
            }
        } else {
            restoreHeaderUI();
        }
    }

    function updateHeaderUI(user) {
        if (navContainer) {
            navContainer.innerHTML = `
                <div class="user-badge">
                    <div class="user-avatar">${user.nombre.charAt(0)}</div>
                    <span>Hola, ${user.nombre}</span>
                </div>
                <button id="btn-friends" class="btn-secondary">Mis Amigos</button>
                <button id="btn-logout" class="btn-logout">Cerrar Sesión</button>
            `;
        }
    }

    function restoreHeaderUI() {
        if (navContainer) {
            navContainer.innerHTML = `
                <button id="btn-register" class="btn-secondary">Registrarse</button>
                <button id="btn-login" class="btn-primary">Iniciar Sesión</button>
            `;
        }
    }

    function logoutUser() {
        localStorage.removeItem("currentUser");
        currentSessionUser = null;
        restoreHeaderUI();
        clearMarkersFromMap();
    }

    // ==========================================
    // FRIENDS LOGIC
    // ==========================================

    // Tab Switching
    document.querySelectorAll('.friends-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.friends-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.friends-card .tab-content').forEach(c => c.classList.remove('active'));
            
            e.target.classList.add('active');
            const targetTab = e.target.getAttribute('data-tab');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // Load Friends
    async function loadFriends() {
        if (!currentSessionUser) return;
        const list = document.getElementById('friends-list');
        list.innerHTML = '<p>Cargando amigos...</p>';
        try {
            const res = await fetch(`/api/amigos?id_usuario=${currentSessionUser.id_usuario}`);
            if (res.ok) {
                const amigos = await res.json();
                if (amigos.length === 0) {
                    list.innerHTML = '<p>Aún no tienes amigos agregados.</p>';
                } else {
                    list.innerHTML = amigos.map(a => `
                        <li>
                            <span>${a.nombre} (${a.correo})</span>
                            <button class="btn-primary btn-small" onclick="viewFriendMap(${a.id_usuario}, '${a.nombre}')">Ver Mapa</button>
                        </li>
                    `).join('');
                }
            }
        } catch (e) {
            list.innerHTML = '<p>Error al cargar amigos.</p>';
        }
    }

    // Load Friend Requests
    async function loadFriendRequests() {
        if (!currentSessionUser) return;
        const list = document.getElementById('requests-list');
        const badge = document.getElementById('solicitudes-badge');
        list.innerHTML = '<p>Cargando solicitudes...</p>';
        try {
            const res = await fetch(`/api/amigos/solicitudes?id_usuario=${currentSessionUser.id_usuario}`);
            if (res.ok) {
                const reqs = await res.json();
                if (reqs.length === 0) {
                    list.innerHTML = '<p>No tienes solicitudes pendientes.</p>';
                    if (badge) badge.classList.add('hidden');
                } else {
                    if (badge) {
                        badge.textContent = reqs.length;
                        badge.classList.remove('hidden');
                    }
                    list.innerHTML = reqs.map(r => `
                        <li>
                            <span>${r.nombre} te envió una solicitud</span>
                            <div class="action-btns">
                                <button class="btn-primary btn-small" onclick="respondRequest(${r.id_solicitud}, 'aceptar')">Aceptar</button>
                                <button class="btn-secondary btn-small" onclick="respondRequest(${r.id_solicitud}, 'rechazar')">Rechazar</button>
                            </div>
                        </li>
                    `).join('');
                }
            }
        } catch (e) {
            list.innerHTML = '<p>Error al cargar solicitudes.</p>';
        }
    }

    // Respond to Request
    window.respondRequest = async (id_solicitud, accion) => {
        try {
            const res = await fetch('/api/amigos/responder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_solicitud, accion })
            });
            if (res.ok) {
                alert(accion === 'aceptar' ? 'Solicitud aceptada' : 'Solicitud rechazada');
                loadFriendRequests();
                loadFriends();
            }
        } catch (e) {
            console.error(e);
            alert('Error al procesar solicitud');
        }
    };

    // Search Users
    const searchInput = document.getElementById('search-users-input');
    const searchBtn = document.getElementById('btn-search-users');
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', async () => {
            const query = searchInput.value.trim();
            if (!query) return;
            const list = document.getElementById('search-results-list');
            list.innerHTML = '<p>Buscando...</p>';
            try {
                const res = await fetch(`/api/usuarios/buscar?query=${query}&id_usuario=${currentSessionUser.id_usuario}`);
                if (res.ok) {
                    const users = await res.json();
                    if (users.length === 0) {
                        list.innerHTML = '<p>No se encontraron usuarios.</p>';
                    } else {
                        list.innerHTML = users.map(u => `
                            <li>
                                <span>${u.nombre} (${u.correo})</span>
                                <button class="btn-secondary btn-small" onclick="sendFriendRequest(${u.id_usuario})">Agregar</button>
                            </li>
                        `).join('');
                    }
                }
            } catch (e) {
                list.innerHTML = '<p>Error en la búsqueda.</p>';
            }
        });
    }

    // Send Friend Request
    window.sendFriendRequest = async (id_recibe) => {
        try {
            const res = await fetch('/api/amigos/solicitar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_usuario_envia: currentSessionUser.id_usuario, id_usuario_recibe: id_recibe })
            });
            if (res.ok) {
                alert('Solicitud enviada correctamente');
                // Refresh search to remove them from list
                if(searchBtn) searchBtn.click();
            } else {
                const data = await res.json();
                alert(data.error || 'Error enviando solicitud');
            }
        } catch (e) {
            console.error(e);
            alert('Error de red enviando solicitud');
        }
    };

    // View Friend Map
    window.viewFriendMap = async (id_amigo, nombre_amigo) => {
        closeAllModals();
        const countElement = document.getElementById("marker-count");
        if (countElement) countElement.innerText = `Cargando mapa de ${nombre_amigo}...`;
        
        try {
            const res = await fetch(`/api/amigos/marcadores?id_usuario=${currentSessionUser.id_usuario}&id_amigo=${id_amigo}`);
            if (res.ok) {
                const markers = await res.json();
                
                // Clear existing markers
                clearMarkersFromMap();
                
                // Draw friend markers (different color/style if you like)
                markers.forEach(data => {
                    const marker = new google.maps.Marker({
                        position: { lat: data.latitud, lng: data.longitud },
                        map: map,
                        animation: google.maps.Animation.DROP,
                        title: data.titulo,
                        icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' // Distinguish friend markers
                    });

                    // Cannot edit friend's marker
                    marker.addListener("click", () => {
                        alert(`Marcador de ${nombre_amigo}:\n${data.titulo}\n${data.descripcion || ''}`);
                    });

                    markersOnMap.push(marker);
                });

                if (countElement) {
                    countElement.innerText = `Viendo ${markers.length} marcadores de ${nombre_amigo}.`;
                }

                // Add a button to restore my markers
                const panel = document.querySelector(".stats-panel");
                if (panel && !document.getElementById("btn-restore-map")) {
                    const restoreBtn = document.createElement("button");
                    restoreBtn.id = "btn-restore-map";
                    restoreBtn.className = "btn-primary btn-small mt-2";
                    restoreBtn.style.marginTop = "10px";
                    restoreBtn.style.width = "100%";
                    restoreBtn.innerText = "Volver a Mi Mapa";
                    restoreBtn.onclick = () => {
                        fetchUserMarkers(currentSessionUser.id_usuario);
                        restoreBtn.remove();
                    };
                    panel.appendChild(restoreBtn);
                }

            } else {
                alert('No se pudieron cargar los marcadores de tu amigo.');
                fetchUserMarkers(currentSessionUser.id_usuario);
            }
        } catch (e) {
            console.error(e);
            alert('Error al cargar mapa del amigo.');
        }
    };

    checkActiveSession();
});
