// Variables globales de la aplicación
let map;                             // Instancia de Google Maps
let markersOnMap = [];               // Arreglo de marcadores de Google Maps cargados en pantalla
let currentSessionUser = null;       // Datos del usuario con sesión activa
let isViewingFriendMap = false;      // Bandera para controlar si se está visualizando el mapa de un amigo (deshabilita la creación de marcadores)

// Variable temporal para almacenar las coordenadas del último clic en el mapa antes de crear el marcador
let pendingMarkerLocation = null;
let categories = [];                 // Listado de categorías disponibles de marcadores

/**
 * Muestra un modal de alerta personalizado reemplazando al alert() del navegador.
 * @param {string} message Mensaje a mostrar en la alerta.
 * @param {string} title Título del modal de la alerta (opcional).
 */
function showCustomAlert(message, title = "Notificación") {
    const alertModal = document.getElementById("custom-alert-modal");
    const alertTitle = document.getElementById("custom-alert-title");
    const alertMessage = document.getElementById("custom-alert-message");
    
    if (alertModal && alertMessage) {
        if (alertTitle) alertTitle.textContent = title;
        alertMessage.textContent = message;
        alertModal.classList.remove("hidden");
    }
}
window.showCustomAlert = showCustomAlert;

// ==========================================
// GOOGLE MAPS INIT & LOGIC
// ==========================================
// ==========================================
// INICIALIZACIÓN Y CONFIGURACIÓN DE GOOGLE MAPS
// ==========================================
function initMap() {
    console.log("Initializing Map...");
    const defaultLocation = { lat: 4.6097, lng: -74.0817 }; // Ubicación por defecto: Bogotá

    // Creación de la instancia del mapa con estilos oscuros y controles desactivados/activados
    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultLocation,
        zoom: 12,
        styles: typeof mapStyles !== 'undefined' ? mapStyles : [],
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false
    });

    // Evento de clic en el mapa para ubicar un marcador
    map.addListener("click", (event) => {
        // Bloqueo si el usuario no ha iniciado sesión
        if (!currentSessionUser) {
            showCustomAlert("Debes iniciar sesión para crear marcadores.");
            return;
        }
        // Bloqueo si se está visualizando el mapa de un amigo (solo lectura)
        if (isViewingFriendMap) {
            showCustomAlert("No puedes añadir marcadores en el mapa de un amigo.");
            return;
        }
        // Almacenar coordenadas de forma temporal y abrir formulario modal para completar datos
        pendingMarkerLocation = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
        };
        openCreateMarkerModal();
    });

    console.log("Map ready!");
    
    // Carga de categorías iniciales
    fetchCategories();

    // Si la sesión del usuario persistía activa al cargar el mapa, renderizar sus marcadores
    if (currentSessionUser) {
        fetchUserMarkers(currentSessionUser.id_usuario);
    }
}
window.initMap = initMap;

// ==========================================
// API CALLS & MARKER STATE
// ==========================================
// ==========================================
// SERVICIOS API Y LÓGICA DE MARCADORES
// ==========================================

/**
 * Obtiene todas las categorías desde la API e inicializa los desplegables de formularios.
 */
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

/**
 * Llenar dinámicamente los selectores dropdown de categoría en modales de creación y edición.
 */
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

/**
 * Consulta y renderiza en el mapa los marcadores pertenecientes al usuario autenticado.
 * @param {number} id_usuario ID de base de datos del usuario.
 */
async function fetchUserMarkers(id_usuario) {
    isViewingFriendMap = false; // Asegura que el usuario regrese a su mapa interactivo
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

/**
 * Limpia los marcadores del mapa y dibuja nuevos a partir de una lista.
 * @param {Array} markersData Datos de marcadores obtenidos de la base de datos.
 */
function drawMarkersOnMap(markersData) {
    clearMarkersFromMap();

    markersData.forEach(data => {
        const marker = new google.maps.Marker({
            position: { lat: data.latitud, lng: data.longitud },
            map: map,
            animation: google.maps.Animation.DROP,
            title: data.titulo
        });

        // Guardar referencia directa de los datos en el objeto del marcador
        marker.dbData = data;

        // Abrir ventana de edición al hacer clic sobre el marcador
        marker.addListener("click", () => {
            if (!currentSessionUser) return;
            openEditMarkerModal(marker.dbData);
        });

        markersOnMap.push(marker);
    });

    updateMarkerCount();
}

/**
 * Remueve físicamente todos los marcadores del visor de Google Maps.
 */
function clearMarkersFromMap() {
    markersOnMap.forEach(m => m.setMap(null));
    markersOnMap = [];
    updateMarkerCount();
}

/**
 * Actualiza la interfaz del contador flotante que indica cuántos marcadores se visualizan.
 */
function updateMarkerCount() {
    const countElement = document.getElementById("marker-count");
    if (countElement) {
        countElement.innerText = `${markersOnMap.length} marcadores registrados`;
    }
}

// ==========================================
// MODAL & SESSION UI LOGIC
// ==========================================
// ==========================================
// LÓGICA DE INTERFAZ, INICIO DE DOM Y MODALES
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // --- Selección de Elementos del DOM ---
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

    // --- Controladores para Abrir Modales ---
    
    // Abre el modal para crear un marcador nuevo
    window.openCreateMarkerModal = () => {
        if (createMarkerModal) {
            createMarkerModal.classList.remove("hidden");
            if (createMarkerForm) createMarkerForm.reset();
            hideFeedback("create-marker-message");
        }
    };

    // Abre el modal para editar o borrar un marcador existente
    window.openEditMarkerModal = (markerData) => {
        if (editMarkerModal) {
            editMarkerModal.classList.remove("hidden");
            hideFeedback("edit-marker-message");
            
            // Cargar los valores actuales del marcador seleccionado en el formulario
            document.getElementById("edit-marker-id").value = markerData.id_marcador;
            document.getElementById("edit-marker-title").value = markerData.titulo;
            document.getElementById("edit-marker-category").value = markerData.id_categoria;
            document.getElementById("edit-marker-desc").value = markerData.descripcion || "";
        }
    };

    // Abre el modal de registro de usuario
    function openRegisterModal() {
        if (registerModal) {
            registerModal.classList.remove("hidden");
            if (registerForm) registerForm.reset();
            hideFeedback("register-message");
        }
    }

    // Abre el modal de inicio de sesión
    function openLoginModal() {
        if (loginModal) {
            loginModal.classList.remove("hidden");
            if (loginForm) loginForm.reset();
            hideFeedback("login-message");
        }
    }

    const friendsModal = document.getElementById("friends-modal");

    // Abre el panel modal de amigos y actualiza las listas pendientes y aceptadas
    function openFriendsModal() {
        if (friendsModal) {
            friendsModal.classList.remove("hidden");
            loadFriends();
            loadFriendRequests();
        }
    }

    // Cierra todos los modales de la pantalla y reinicia variables temporales
    function closeAllModals() {
        if (registerModal) registerModal.classList.add("hidden");
        if (loginModal) loginModal.classList.add("hidden");
        if (createMarkerModal) createMarkerModal.classList.add("hidden");
        if (editMarkerModal) editMarkerModal.classList.add("hidden");
        if (friendsModal) friendsModal.classList.add("hidden");
        const customAlertModal = document.getElementById("custom-alert-modal");
        if (customAlertModal) customAlertModal.classList.add("hidden");
        pendingMarkerLocation = null;
    }

    // --- Escuchadores de eventos para cerrar modales ---
    document.querySelectorAll(".close-btn").forEach(btn => {
        btn.addEventListener("click", closeAllModals);
    });

    const btnCloseAlert = document.getElementById("btn-close-alert");
    if (btnCloseAlert) {
        btnCloseAlert.addEventListener("click", closeAllModals);
    }

    // Cerrar el modal activo si el usuario hace clic en el área oscura exterior
    window.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal-overlay")) {
            closeAllModals();
        }
    });

    // --- Delegación de eventos en el panel de navegación ---
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

    // --- Procesamiento de Formularios de Usuario ---
    
    // Envío del Formulario de Registro
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nombre = document.getElementById("reg-nombre").value.trim();
            const correo = document.getElementById("reg-correo").value.trim();
            const contrasena = document.getElementById("reg-contrasena").value;

            // Validación del lado del cliente
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

    // Envío del Formulario de Inicio de Sesión
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
                    
                    // Almacenar el estado de la sesión localmente
                    localStorage.setItem("currentUser", JSON.stringify(data.usuario));
                    currentSessionUser = data.usuario;
                    updateHeaderUI(data.usuario);
                    
                    // Consultar los marcadores del usuario inmediatamente
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

    // --- Gestión de Marcadores ---
    
    // Envío del Formulario para crear Marcadores
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
                    fetchUserMarkers(currentSessionUser.id_usuario); // Refrescar mapa
                    setTimeout(closeAllModals, 1500);
                } else showFeedback("create-marker-message", data.error, "error");
            } catch (err) {
                showFeedback("create-marker-message", "Error de conexión.", "error");
            } finally {
                setLoading(btnSubmitMarker, false, "Guardar Marcador");
            }
        });
    }

    // Envío del Formulario para actualizar Marcadores
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

    // Botón para eliminar un marcador
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

    // --- Funciones de utilidad auxiliares ---

    // Muestra alertas y mensajes dentro de los formularios (Feedback visual)
    function showFeedback(id, message, type) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = message;
        el.className = `form-message ${type}`;
        el.classList.remove("hidden");
    }

    // Oculta alertas internas en formularios
    function hideFeedback(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    }

    // Configura el spinner de carga en botones para prevenir clics duplicados
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

    // --- Control de Sesión Persistente ---

    // Comprueba si hay una sesión almacenada en el LocalStorage
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

    // Cambia la barra superior para mostrar el estado logueado del usuario
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

    // Restablece los botones de inicio de sesión si no hay cuenta activa
    function restoreHeaderUI() {
        if (navContainer) {
            navContainer.innerHTML = `
                <button id="btn-register" class="btn-secondary">Registrarse</button>
                <button id="btn-login" class="btn-primary">Iniciar Sesión</button>
            `;
        }
    }

    // Cierra la sesión activa y limpia los marcadores del mapa
    function logoutUser() {
        localStorage.removeItem("currentUser");
        currentSessionUser = null;
        restoreHeaderUI();
        clearMarkersFromMap();
    }

    // ==========================================
    // LÓGICA DE SISTEMA SOCIAL (AMIGOS)
    // ==========================================

    // Navegación interna por pestañas en el panel de amigos (Amigos / Solicitudes / Buscar)
    document.querySelectorAll('.friends-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.friends-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.friends-card .tab-content').forEach(c => c.classList.remove('active'));
            
            e.target.classList.add('active');
            const targetTab = e.target.getAttribute('data-tab');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // Carga del listado de amigos aceptados
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

    // Carga de solicitudes de amistad pendientes y actualización de badges numéricos
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

    // Responder (Aceptar o Rechazar) a solicitudes de amistad
    window.respondRequest = async (id_solicitud, accion) => {
        try {
            const res = await fetch('/api/amigos/responder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_solicitud, accion })
            });
            if (res.ok) {
                showCustomAlert(accion === 'aceptar' ? 'Solicitud aceptada' : 'Solicitud rechazada');
                loadFriendRequests();
                loadFriends();
            }
        } catch (e) {
            console.error(e);
            showCustomAlert('Error al procesar solicitud');
        }
    };

    // Buscar usuarios en la red social
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

    // Enviar solicitud de amistad
    window.sendFriendRequest = async (id_recibe) => {
        try {
            const res = await fetch('/api/amigos/solicitar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_usuario_envia: currentSessionUser.id_usuario, id_usuario_recibe: id_recibe })
            });
            if (res.ok) {
                showCustomAlert('Solicitud enviada correctamente');
                // Forzar refresco de búsqueda para remover al usuario del listado actual
                if(searchBtn) searchBtn.click();
            } else {
                const data = await res.json();
                showCustomAlert(data.error || 'Error enviando solicitud');
            }
        } catch (e) {
            console.error(e);
            showCustomAlert('Error de red enviando solicitud');
        }
    };

    // Visualizar el mapa de un amigo
    window.viewFriendMap = async (id_amigo, nombre_amigo) => {
        closeAllModals();
        const countElement = document.getElementById("marker-count");
        if (countElement) countElement.innerText = `Cargando mapa de ${nombre_amigo}...`;
        
        try {
            const res = await fetch(`/api/amigos/marcadores?id_usuario=${currentSessionUser.id_usuario}&id_amigo=${id_amigo}`);
            if (res.ok) {
                isViewingFriendMap = true; // Activa el bloqueo de inserción/edición de marcadores
                const markers = await res.json();
                
                // Limpiar marcadores propios activos
                clearMarkersFromMap();
                
                // Dibujar marcadores del amigo con un marcador de color azul para distinguirlos
                markers.forEach(data => {
                    const marker = new google.maps.Marker({
                        position: { lat: data.latitud, lng: data.longitud },
                        map: map,
                        animation: google.maps.Animation.DROP,
                        title: data.titulo,
                        icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' // Ícono azul distintivo
                    });

                    // Clic solo muestra los datos (modo lectura)
                    marker.addListener("click", () => {
                        showCustomAlert(`Marcador de ${nombre_amigo}:\nTitulo: ${data.titulo}\nDescripción: ${data.descripcion || ''}`);
                    });

                    markersOnMap.push(marker);
                });

                if (countElement) {
                    countElement.innerText = `Viendo ${markers.length} marcadores de ${nombre_amigo}.`;
                }

                // Generar botón dinámico para regresar a mi mapa propio
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
                showCustomAlert('No se pudieron cargar los marcadores de tu amigo.');
                fetchUserMarkers(currentSessionUser.id_usuario);
            }
        } catch (e) {
            console.error(e);
            showCustomAlert('Error al cargar mapa del amigo.');
        }
    };

    // Comprobar la sesión activa al arrancar
    checkActiveSession();
});
