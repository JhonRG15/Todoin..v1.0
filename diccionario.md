# 📖 Diccionario de Código — To Do In?... v1.0

> Documento de referencia que describe todas las funciones, métodos, variables globales, endpoints API y estructuras utilizadas en el proyecto.

---

## 📁 Estructura del Proyecto

| Archivo | Descripción |
|---|---|
| `index.html` | Página principal con la estructura HTML, modales y carga de scripts |
| `style.css` | Estilos CSS del proyecto (glassmorphism, modales, botones, layout) |
| `app.js` | Lógica del frontend: mapa, sesión, modales, CRUD de marcadores y sistema de amigos |
| `server.js` | Servidor Express con todos los endpoints REST de la API |
| `db.js` | Módulo de conexión a la base de datos Azure SQL Server |
| `create_table.js` | Script de migración para crear la tabla `amigos` en la base de datos |
| `mapStyles.js` | Arreglo de estilos personalizados (tema oscuro) para Google Maps |
| `package.json` | Manifiesto del proyecto Node.js con dependencias y scripts |
| `.env` | (No versionado) Variables de entorno con credenciales de Azure SQL |

---

## 🗄️ db.js — Módulo de Base de Datos

### Variables

| Variable | Tipo | Descripción |
|---|---|---|
| `sql` | Módulo `mssql` | Instancia del cliente SQL Server importado desde el paquete `mssql` |
| `config` | `Object` | Objeto de configuración con credenciales para la conexión a Azure SQL. Lee las variables de entorno: `AZURE_SQL_SERVER`, `AZURE_SQL_DATABASE`, `AZURE_SQL_USER`, `AZURE_SQL_PASSWORD` |

### Funciones

| Función | Tipo | Parámetros | Retorna | Descripción |
|---|---|---|---|---|
| `connectDB()` | `async` | Ninguno | `void` | Establece la conexión con la base de datos Azure SQL usando la configuración definida en `config`. Imprime en consola si la conexión fue exitosa o fallida |
| `checkConnection()` | `async` | Ninguno | `boolean` | Ejecuta una consulta simple (`SELECT 1`) para verificar que la conexión a la base de datos está activa. Retorna `true` si la conexión es válida, `false` en caso contrario |

### Exportaciones (`module.exports`)

| Elemento | Descripción |
|---|---|
| `sql` | Objeto del módulo `mssql` para crear consultas parametrizadas en otros archivos |
| `connectDB` | Función para iniciar la conexión a la base de datos |
| `checkConnection` | Función para verificar el estado de la conexión |

---

## 🖥️ server.js — Servidor Backend (Express)

### Variables de Configuración

| Variable | Tipo | Descripción |
|---|---|---|
| `app` | `Express` | Instancia principal de la aplicación Express |
| `PORT` | `number` | Puerto del servidor. Toma el valor de la variable de entorno `PORT` o `3000` por defecto |

### Middleware

| Middleware | Descripción |
|---|---|
| `cors()` | Habilita las peticiones de origen cruzado (Cross-Origin Resource Sharing) |
| `express.json()` | Parsea automáticamente el cuerpo de las peticiones con formato JSON |

### Rutas de Archivos Estáticos

| Ruta | Método | Archivo Servido | Descripción |
|---|---|---|---|
| `/` | GET | `index.html` | Sirve la página principal de la aplicación |
| `/style.css` | GET | `style.css` | Sirve la hoja de estilos CSS |
| `/app.js` | GET | `app.js` | Sirve el script principal del frontend |
| `/mapStyles.js` | GET | `mapStyles.js` | Sirve los estilos personalizados del mapa |

### Endpoints de la API REST

#### 🔹 Estado del Servidor

| Endpoint | Método | Parámetros | Respuesta Exitosa | Descripción |
|---|---|---|---|---|
| `/api/status` | GET | Ninguno | `{ status, db_connected }` | Verifica que el servidor esté corriendo y que la conexión a la base de datos esté activa |

#### 🔹 Usuarios — Autenticación

| Endpoint | Método | Parámetros (Body) | Respuesta Exitosa | Código | Descripción |
|---|---|---|---|---|---|
| `/api/usuarios` | POST | `nombre`, `correo`, `contrasena` | `{ message }` | 201 | Registra un nuevo usuario. Verifica que el correo no exista previamente. Hashea la contraseña con SHA-256 antes de almacenarla |
| `/api/login` | POST | `correo`, `contrasena` | `{ message, usuario: { id_usuario, nombre, correo } }` | 200 | Autentica un usuario existente. Compara el hash SHA-256 de la contraseña ingresada con el almacenado en la base de datos. No retorna el hash por seguridad |

#### 🔹 Categorías

| Endpoint | Método | Parámetros | Respuesta Exitosa | Código | Descripción |
|---|---|---|---|---|---|
| `/api/categorias` | GET | Ninguno | `[{ id_categoria, nombre_categoria, icono }]` | 200 | Obtiene todas las categorías disponibles para clasificar marcadores |

#### 🔹 Marcadores (CRUD completo)

| Endpoint | Método | Parámetros | Respuesta Exitosa | Código | Descripción |
|---|---|---|---|---|---|
| `/api/marcadores` | GET | Query: `id_usuario` | `[{ id_marcador, titulo, descripcion, latitud, longitud, fecha_creacion, id_categoria, nombre_categoria, icono }]` | 200 | Obtiene todos los marcadores de un usuario, incluyendo la información de su categoría mediante un JOIN |
| `/api/marcadores` | POST | Body: `titulo`, `descripcion`, `latitud`, `longitud`, `id_usuario`, `id_categoria` | `{ message, id_marcador }` | 201 | Crea un nuevo marcador en la ubicación especificada. Usa `OUTPUT inserted.id_marcador` para devolver el ID generado |
| `/api/marcadores/:id` | PUT | Params: `id` / Body: `titulo`, `descripcion`, `id_categoria`, `id_usuario` | `{ message }` | 200 | Actualiza título, descripción y categoría de un marcador. Solo permite la edición si el marcador pertenece al usuario autenticado |
| `/api/marcadores/:id` | DELETE | Params: `id` / Query o Body: `id_usuario` | `{ message }` | 200 | Elimina un marcador. Verifica que el marcador pertenezca al usuario antes de eliminarlo |

#### 🔹 Amigos — Sistema Social

| Endpoint | Método | Parámetros | Respuesta Exitosa | Código | Descripción |
|---|---|---|---|---|---|
| `/api/usuarios/buscar` | GET | Query: `query`, `id_usuario` | `[{ id_usuario, nombre, correo }]` | 200 | Busca usuarios por nombre o correo usando `LIKE`. Excluye al usuario actual y a quienes ya tienen una relación de amistad (pendiente o aceptada) |
| `/api/amigos/solicitar` | POST | Body: `id_usuario_envia`, `id_usuario_recibe` | `{ message }` | 201 | Envía una solicitud de amistad. Inserta un registro con estado `'pendiente'` en la tabla `amigos` |
| `/api/amigos/solicitudes` | GET | Query: `id_usuario` | `[{ id_solicitud, id_usuario_envia, nombre, correo, fecha_creacion }]` | 200 | Obtiene las solicitudes de amistad pendientes recibidas por el usuario. Incluye datos del remitente mediante un JOIN |
| `/api/amigos/responder` | PUT | Body: `id_solicitud`, `accion` (`'aceptar'` o `'rechazar'`) | `{ message }` | 200 | Responde a una solicitud de amistad. Si se acepta, cambia el estado a `'aceptada'`. Si se rechaza, elimina el registro de la tabla |
| `/api/amigos` | GET | Query: `id_usuario` | `[{ id_usuario, nombre, correo }]` | 200 | Obtiene la lista de amigos aceptados del usuario. Busca en ambas direcciones de la relación (enviada o recibida) |
| `/api/amigos/marcadores` | GET | Query: `id_usuario`, `id_amigo` | `[{ id_marcador, titulo, ... }]` | 200 | Obtiene los marcadores de un amigo. Primero verifica que la relación de amistad exista y esté aceptada. Si no hay amistad, retorna 403 (Prohibido) |

---

## 🗺️ app.js — Lógica del Frontend

### Variables Globales

| Variable | Tipo | Valor Inicial | Descripción |
|---|---|---|---|
| `map` | `google.maps.Map` | `undefined` | Instancia del mapa de Google Maps |
| `markersOnMap` | `Array` | `[]` | Arreglo que almacena los objetos `google.maps.Marker` actualmente visibles en el mapa |
| `currentSessionUser` | `Object \| null` | `null` | Datos del usuario autenticado (`{ id_usuario, nombre, correo }`). `null` si no hay sesión activa |
| `isViewingFriendMap` | `boolean` | `false` | Bandera que indica si el usuario está viendo el mapa de un amigo. Cuando es `true`, se impide la creación de nuevos marcadores |
| `pendingMarkerLocation` | `Object \| null` | `null` | Almacena temporalmente las coordenadas `{ lat, lng }` del clic en el mapa antes de que el usuario confirme la creación del marcador |
| `categories` | `Array` | `[]` | Arreglo con las categorías obtenidas del servidor (`{ id_categoria, nombre_categoria, icono }`) |

### Funciones Globales (Ámbito `window`)

| Función | Parámetros | Retorna | Descripción |
|---|---|---|---|
| `showCustomAlert(message, title?)` | `message`: string — Texto del mensaje. `title`: string (opcional, por defecto `"Notificación"`) — Título del modal | `void` | Muestra un modal personalizado tipo alerta con el mensaje y título especificados. Reemplaza todos los `alert()` nativos del navegador |
| `initMap()` | Ninguno | `void` | Función callback de Google Maps. Inicializa el mapa centrado en Bogotá (4.6097, -74.0817), aplica estilos oscuros personalizados, registra el evento de clic para crear marcadores, carga las categorías y los marcadores del usuario si ya hay sesión activa |
| `openCreateMarkerModal()` | Ninguno | `void` | Abre el modal de creación de marcador, reinicia el formulario y oculta mensajes de retroalimentación previos |
| `openEditMarkerModal(markerData)` | `markerData`: Object — Datos del marcador desde la BD (`{ id_marcador, titulo, id_categoria, descripcion }`) | `void` | Abre el modal de edición de marcador y pre-llena los campos del formulario con los datos del marcador seleccionado |
| `respondRequest(id_solicitud, accion)` | `id_solicitud`: number — ID de la solicitud. `accion`: string (`'aceptar'` o `'rechazar'`) | `void` (async) | Envía una petición PUT a `/api/amigos/responder` para aceptar o rechazar una solicitud de amistad. Recarga ambas listas (solicitudes y amigos) tras responder |
| `sendFriendRequest(id_recibe)` | `id_recibe`: number — ID del usuario destinatario | `void` (async) | Envía una solicitud de amistad al usuario especificado mediante POST a `/api/amigos/solicitar`. Refresca la búsqueda tras enviar |
| `viewFriendMap(id_amigo, nombre_amigo)` | `id_amigo`: number — ID del amigo. `nombre_amigo`: string — Nombre del amigo | `void` (async) | Cierra modales, obtiene los marcadores del amigo vía API, los dibuja en el mapa con ícono azul diferenciado, activa `isViewingFriendMap = true`, y agrega un botón "Volver a Mi Mapa" para restaurar los marcadores propios |

### Funciones de API y Estado del Mapa

| Función | Parámetros | Retorna | Descripción |
|---|---|---|---|
| `fetchCategories()` | Ninguno | `void` (async) | Hace una petición GET a `/api/categorias`, almacena el resultado en la variable global `categories` y llama a `populateCategorySelects()` para llenar los selectores del formulario |
| `populateCategorySelects()` | Ninguno | `void` | Genera las opciones `<option>` HTML a partir del arreglo `categories` y las inyecta en los selectores de categoría de los formularios de creación y edición de marcadores |
| `fetchUserMarkers(id_usuario)` | `id_usuario`: number — ID del usuario | `void` (async) | Restablece `isViewingFriendMap = false`, hace una petición GET a `/api/marcadores` y llama a `drawMarkersOnMap()` con los datos recibidos |
| `drawMarkersOnMap(markersData)` | `markersData`: Array — Arreglo de objetos marcador desde la API | `void` | Limpia los marcadores existentes, crea nuevos `google.maps.Marker` con animación DROP para cada dato, almacena la referencia de datos de la BD en `marker.dbData`, registra un evento click para abrir el modal de edición, y actualiza el contador |
| `clearMarkersFromMap()` | Ninguno | `void` | Elimina todos los marcadores visibles del mapa llamando `setMap(null)` en cada uno, vacía el arreglo `markersOnMap` y actualiza el contador |
| `updateMarkerCount()` | Ninguno | `void` | Actualiza el texto del elemento `#marker-count` con la cantidad de marcadores actualmente en el mapa |

### Funciones de Interfaz de Usuario (dentro de `DOMContentLoaded`)

| Función | Parámetros | Retorna | Descripción |
|---|---|---|---|
| `openRegisterModal()` | Ninguno | `void` | Abre el modal de registro de usuario, reinicia el formulario y oculta mensajes previos |
| `openLoginModal()` | Ninguno | `void` | Abre el modal de inicio de sesión, reinicia el formulario y oculta mensajes previos |
| `openFriendsModal()` | Ninguno | `void` | Abre el modal de amigos y dispara la carga de la lista de amigos y solicitudes pendientes |
| `closeAllModals()` | Ninguno | `void` | Oculta todos los modales de la aplicación (registro, login, crear marcador, editar marcador, amigos, alerta personalizada) y restablece `pendingMarkerLocation = null` |
| `showFeedback(id, message, type)` | `id`: string — ID del elemento de mensaje. `message`: string — Texto a mostrar. `type`: string (`'success'` o `'error'`) | `void` | Muestra un mensaje de retroalimentación dentro de un formulario, asignando la clase CSS correspondiente al tipo (éxito o error) |
| `hideFeedback(id)` | `id`: string — ID del elemento de mensaje | `void` | Oculta un mensaje de retroalimentación añadiendo la clase `hidden` |
| `setLoading(btn, isLoading, loadText)` | `btn`: HTMLElement — Botón a modificar. `isLoading`: boolean — Estado de carga. `loadText`: string — Texto a mostrar | `void` | Alterna el estado de carga de un botón: deshabilita/habilita el botón, muestra/oculta el spinner animado y cambia el texto del botón |
| `checkActiveSession()` | Ninguno | `void` | Verifica si hay una sesión activa almacenada en `localStorage` con la clave `"currentUser"`. Si existe, restaura la sesión parseando el JSON y actualiza la interfaz. Si los datos son inválidos, limpia el almacenamiento |
| `updateHeaderUI(user)` | `user`: Object — Datos del usuario (`{ nombre }`) | `void` | Reemplaza el contenido del `nav-container` por la interfaz de usuario autenticado: avatar con inicial, saludo, botón "Mis Amigos" y botón "Cerrar Sesión" |
| `restoreHeaderUI()` | Ninguno | `void` | Restaura el `nav-container` a su estado original con los botones "Registrarse" e "Iniciar Sesión" |
| `logoutUser()` | Ninguno | `void` | Cierra la sesión del usuario: elimina datos de `localStorage`, establece `currentSessionUser = null`, restaura la interfaz del encabezado y limpia los marcadores del mapa |

### Funciones del Sistema de Amigos (dentro de `DOMContentLoaded`)

| Función | Parámetros | Retorna | Descripción |
|---|---|---|---|
| `loadFriends()` | Ninguno | `void` (async) | Obtiene la lista de amigos aceptados del usuario vía GET a `/api/amigos`. Renderiza cada amigo como un `<li>` con nombre, correo y botón "Ver Mapa" |
| `loadFriendRequests()` | Ninguno | `void` (async) | Obtiene las solicitudes de amistad pendientes vía GET a `/api/amigos/solicitudes`. Actualiza el badge numérico de notificaciones y renderiza cada solicitud con botones "Aceptar" y "Rechazar" |

### Eventos Registrados

| Evento | Elemento | Descripción |
|---|---|---|
| `click` en mapa | `map` (Google Maps) | Al hacer clic en el mapa: verifica sesión, verifica que no sea mapa de amigo, guarda coordenadas en `pendingMarkerLocation` y abre el modal de crear marcador |
| `submit` en `#register-form` | Formulario de registro | Valida campos, envía POST a `/api/usuarios`, muestra feedback y cierra modal tras éxito |
| `submit` en `#login-form` | Formulario de login | Valida campos, envía POST a `/api/login`, guarda sesión en localStorage, actualiza UI y carga marcadores |
| `submit` en `#create-marker-form` | Formulario crear marcador | Envía POST a `/api/marcadores` con los datos y coordenadas pendientes, refresca el mapa |
| `submit` en `#edit-marker-form` | Formulario editar marcador | Envía PUT a `/api/marcadores/:id`, refresca el mapa |
| `click` en `#btn-delete-marker` | Botón eliminar marcador | Pide confirmación con `confirm()`, envía DELETE a `/api/marcadores/:id`, refresca el mapa |
| `click` en `.close-btn` | Botones de cerrar modal (×) | Cierra todos los modales |
| `click` en `#btn-close-alert` | Botón "Aceptar" del modal de alerta | Cierra todos los modales |
| `click` en `.modal-overlay` | Fondo oscuro del modal | Cierra todos los modales al hacer clic fuera de la tarjeta |
| `click` en `#nav-container` | Contenedor de navegación | Delegación de eventos: detecta qué botón se presionó (registrar, login, logout, amigos) |
| `click` en `.tab-btn` | Pestañas del modal de amigos | Cambia entre las pestañas "Amigos", "Solicitudes" y "Buscar" |
| `click` en `#btn-search-users` | Botón de búsqueda de usuarios | Ejecuta GET a `/api/usuarios/buscar` y renderiza los resultados |

---

## 🗃️ create_table.js — Script de Migración

### Funciones

| Función | Parámetros | Retorna | Descripción |
|---|---|---|---|
| `run()` | Ninguno | `void` (async) | Conecta a la base de datos y ejecuta un script SQL que crea la tabla `amigos` si no existe. La tabla incluye: `id_solicitud` (PK auto-incremental), `id_usuario_envia`, `id_usuario_recibe`, `estado` (default `'pendiente'`), `fecha_creacion`, llaves foráneas a `usuarios` y una restricción UNIQUE para evitar duplicados |

---

## 🎨 mapStyles.js — Estilos del Mapa

### Variables

| Variable | Tipo | Descripción |
|---|---|---|
| `mapStyles` | `Array<Object>` | Arreglo de objetos de estilo para Google Maps API. Define un tema oscuro personalizado que modifica los colores de: geometría del mapa, etiquetas de texto, localidades administrativas, puntos de interés, parques, carreteras (normales y autopistas), transporte y cuerpos de agua |

---

## 🎨 style.css — Hoja de Estilos

### Variables CSS (Custom Properties)

| Variable | Valor | Uso |
|---|---|---|
| `--primary` | `#6366f1` | Color principal (índigo) para botones y acentos |
| `--primary-hover` | `#4f46e5` | Color al pasar el cursor sobre elementos primarios |
| `--bg-dark` | `#0f172a` | Color de fondo oscuro principal del cuerpo de la página |
| `--text-light` | `#f8fafc` | Color de texto claro principal |
| `--glass` | `rgba(255, 255, 255, 0.05)` | Fondo semi-transparente para efecto glassmorphism |
| `--glass-border` | `rgba(255, 255, 255, 0.1)` | Color de borde semi-transparente para efecto glassmorphism |

### Clases CSS Principales

| Clase | Descripción |
|---|---|
| `.btn-primary` | Botón con fondo degradado índigo, efecto hover con elevación y sombra |
| `.btn-secondary` | Botón con fondo transparente y borde índigo, para acciones secundarias |
| `.btn-submit` | Botón de envío de formularios con degradado, sombra y soporte para loader |
| `.btn-delete` | Botón de eliminación con estilo rojo/peligro |
| `.btn-logout` | Botón de cerrar sesión con estilo rojo suave |
| `.btn-small` | Modificador para botones compactos (en listas de amigos) |
| `.btn-loader` | Spinner animado CSS dentro de botones (rotación infinita) |
| `.modal-overlay` | Capa de fondo oscuro con desenfoque (`backdrop-filter: blur(16px)`) para modales |
| `.modal-overlay.hidden` | Estado oculto del modal con opacidad 0, visibility hidden y sin interacción |
| `.modal-card` | Tarjeta del modal con glassmorphism, bordes redondeados y animación de entrada |
| `.close-btn` | Botón circular de cierre (×) con rotación al hover |
| `.modal-header` | Encabezado del modal con título en degradado y subtítulo |
| `.modal-form` | Contenedor flex-column para los formularios dentro de modales |
| `.form-group` | Grupo de campo del formulario (label + input/select/textarea) |
| `.form-message` | Mensaje de retroalimentación (base) |
| `.form-message.success` | Mensaje de éxito (verde) |
| `.form-message.error` | Mensaje de error (rojo) |
| `.hidden` | Clase utilitaria global que oculta elementos con `display: none !important` |
| `.user-badge` | Badge del usuario autenticado en el header (avatar + nombre) |
| `.user-avatar` | Avatar circular con degradado e inicial del nombre |
| `.friends-card` | Variante de `.modal-card` para el modal de amigos (más ancho) |
| `.friends-tabs` | Contenedor de pestañas del modal de amigos |
| `.tab-btn` | Botón de pestaña individual |
| `.tab-btn.active` | Pestaña activa con color índigo |
| `.tab-content` | Contenido de pestaña (oculto por defecto) |
| `.tab-content.active` | Contenido de pestaña visible |
| `.user-list` | Lista de usuarios/amigos con scroll y scrollbar personalizado |
| `.search-box` | Contenedor de búsqueda con input y botón |
| `.badge` | Indicador numérico rojo para notificaciones |
| `.stats-panel` | Panel de estadísticas superpuesto sobre el mapa |
| `.map-overlay` | Contenedor posicionado absolutamente sobre el mapa |
| `.mt-2` | Clase utilitaria para `margin-top: 0.5rem` |

### Animaciones CSS

| Animación | Descripción |
|---|---|
| `modalAppear` | Entrada del modal: traslación vertical de 20px hacia arriba + escala de 0.95 a 1 + opacidad de 0 a 1 |
| `fadeIn` | Aparición suave: traslación vertical de -5px + opacidad de 0 a 1 |
| `spin` | Rotación infinita de 360° para el spinner de carga |

---

## 🗄️ Esquema de Base de Datos (inferido del código)

### Tabla `usuarios`

| Columna | Tipo | Descripción |
|---|---|---|
| `id_usuario` | INT (PK) | Identificador único del usuario |
| `nombre` | VARCHAR | Nombre completo del usuario |
| `correo` | VARCHAR (UNIQUE) | Correo electrónico del usuario |
| `contraseña_hash` | VARCHAR | Hash SHA-256 de la contraseña |

### Tabla `categorias`

| Columna | Tipo | Descripción |
|---|---|---|
| `id_categoria` | INT (PK) | Identificador único de la categoría |
| `nombre_categoria` | VARCHAR | Nombre descriptivo de la categoría |
| `icono` | VARCHAR | Ícono o identificador visual de la categoría |

### Tabla `marcadores`

| Columna | Tipo | Descripción |
|---|---|---|
| `id_marcador` | INT (PK, IDENTITY) | Identificador único auto-incremental del marcador |
| `titulo` | VARCHAR | Título del marcador / punto de interés |
| `descripcion` | TEXT | Descripción detallada del lugar (opcional) |
| `latitud` | DECIMAL(10,7) | Coordenada de latitud geográfica |
| `longitud` | DECIMAL(10,7) | Coordenada de longitud geográfica |
| `id_usuario` | INT (FK → usuarios) | Usuario propietario del marcador |
| `id_categoria` | INT (FK → categorias) | Categoría asignada al marcador |
| `fecha_creacion` | DATETIME | Fecha y hora de creación del marcador |

### Tabla `amigos`

| Columna | Tipo | Descripción |
|---|---|---|
| `id_solicitud` | INT (PK, IDENTITY) | Identificador único auto-incremental de la solicitud |
| `id_usuario_envia` | INT (FK → usuarios) | ID del usuario que envía la solicitud |
| `id_usuario_recibe` | INT (FK → usuarios) | ID del usuario que recibe la solicitud |
| `estado` | VARCHAR(20) | Estado de la solicitud: `'pendiente'` o `'aceptada'` |
| `fecha_creacion` | DATETIME (DEFAULT GETDATE()) | Fecha y hora en que se creó la solicitud |

> **Restricciones:** `UNIQUE (id_usuario_envia, id_usuario_recibe)` — Evita solicitudes duplicadas entre los mismos usuarios.

---

## 📦 Dependencias del Proyecto (package.json)

| Paquete | Versión | Descripción |
|---|---|---|
| `express` | ^5.2.1 | Framework web para Node.js que estructura el servidor HTTP y gestiona las rutas REST |
| `mssql` | ^12.5.4 | Cliente oficial de SQL Server para Node.js, utilizado para conectar y consultar Azure SQL |
| `dotenv` | ^17.4.2 | Carga variables de entorno desde un archivo `.env` de forma segura |
| `cors` | ^2.8.6 | Middleware que habilita peticiones de origen cruzado (CORS) |

### Scripts de npm

| Script | Comando | Descripción |
|---|---|---|
| `start` | `node server.js` | Inicia el servidor de la aplicación |
