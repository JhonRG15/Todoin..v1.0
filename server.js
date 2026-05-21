// Importación de módulos requeridos
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config(); // Cargar variables de entorno del archivo .env
const { connectDB, checkConnection } = require('./db');

// Inicialización de la aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Conexión inicial a la base de datos Azure SQL
connectDB();

// Configuración de Middlewares globales
app.use(cors()); // Habilitar peticiones CORS
app.use(express.json()); // Habilitar parseo automático de cuerpos JSON

// Rutas para servir archivos estáticos del frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Página principal
});

app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'style.css')); // Archivo de estilos
});

app.get('/app.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'app.js')); // Lógica JS del cliente
});

app.get('/mapStyles.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'mapStyles.js')); // Estilos personalizados de Google Maps
});

// Endpoint de utilidad para verificar el estado de la base de datos y servidor
app.get('/api/status', async (req, res) => {
    const isConnected = await checkConnection();
    res.json({ status: 'Server is running', db_connected: isConnected });
});

// Endpoint para registrar un nuevo usuario
app.post('/api/usuarios', async (req, res) => {
    const { nombre, correo, contrasena } = req.body;

    // Validación básica de campos obligatorios
    if (!nombre || !correo || !contrasena) {
        return res.status(400).json({ error: 'Todos los campos (nombre, correo, contrasena) son obligatorios.' });
    }

    try {
        const { sql } = require('./db');

        // 1. Verificar si el correo ya existe en la base de datos
        const checkEmailRequest = new sql.Request();
        checkEmailRequest.input('correo', sql.VarChar, correo);
        const emailResult = await checkEmailRequest.query('SELECT id_usuario FROM usuarios WHERE correo = @correo');

        if (emailResult.recordset.length > 0) {
            return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
        }

        // 2. Hashear la contraseña usando la librería nativa crypto (algoritmo SHA-256)
        const crypto = require('crypto');
        const hashedPassword = crypto.createHash('sha256').update(contrasena).digest('hex');

        // 3. Insertar el nuevo registro de usuario en la base de datos
        const insertRequest = new sql.Request();
        insertRequest.input('nombre', sql.VarChar, nombre);
        insertRequest.input('correo', sql.VarChar, correo);
        insertRequest.input('contrasena_hash', sql.VarChar, hashedPassword);

        await insertRequest.query(
            'INSERT INTO usuarios (nombre, correo, contraseña_hash) VALUES (@nombre, @correo, @contrasena_hash)'
        );

        res.status(201).json({ message: 'Usuario creado exitosamente.' });
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ error: 'Hubo un problema al registrar el usuario en el servidor.' });
    }
});

// Endpoint para iniciar sesión
app.post('/api/login', async (req, res) => {
    const { correo, contrasena } = req.body;

    // Validación básica de campos
    if (!correo || !contrasena) {
        return res.status(400).json({ error: 'El correo y la contraseña son obligatorios.' });
    }

    try {
        const { sql } = require('./db');

        // 1. Buscar el usuario por su dirección de correo electrónico
        const findRequest = new sql.Request();
        findRequest.input('correo', sql.VarChar, correo);
        const result = await findRequest.query('SELECT id_usuario, nombre, correo, contraseña_hash FROM usuarios WHERE correo = @correo');

        if (result.recordset.length === 0) {
            // Mensaje de error genérico por razones de seguridad
            return res.status(401).json({ error: 'El correo electrónico o la contraseña son incorrectos.' });
        }

        const user = result.recordset[0];

        // 2. Hashear la contraseña ingresada y compararla con el hash de la BD
        const crypto = require('crypto');
        const hashedPassword = crypto.createHash('sha256').update(contrasena).digest('hex');

        if (hashedPassword !== user.contraseña_hash) {
            return res.status(401).json({ error: 'El correo electrónico o la contraseña son incorrectos.' });
        }

        // 3. Respuesta exitosa omitiendo exponer el hash de la contraseña
        res.status(200).json({
            message: 'Inicio de sesión exitoso.',
            usuario: {
                id_usuario: user.id_usuario,
                nombre: user.nombre,
                correo: user.correo
            }
        });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ error: 'Hubo un problema al iniciar sesión en el servidor.' });
    }
});

// --- ENDPOINTS PARA CATEGORÍAS ---

// Obtener todas las categorías para marcadores
app.get('/api/categorias', async (req, res) => {
    try {
        const { sql } = require('./db');
        const request = new sql.Request();
        const result = await request.query('SELECT id_categoria, nombre_categoria, icono FROM categorias');
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Error fetching categories' });
    }
});

// --- ENDPOINTS PARA MARCADORES (CRUD) ---

// Obtener todos los marcadores creados por un usuario específico
app.get('/api/marcadores', async (req, res) => {
    const { id_usuario } = req.query;
    if (!id_usuario) {
        return res.status(400).json({ error: 'id_usuario is required' });
    }

    try {
        const { sql } = require('./db');
        const request = new sql.Request();
        request.input('id_usuario', sql.Int, id_usuario);
        // Trae los marcadores vinculando la categoría correspondiente
        const result = await request.query(`
            SELECT m.id_marcador, m.titulo, m.descripcion, m.latitud, m.longitud, m.fecha_creacion, m.id_categoria, c.nombre_categoria, c.icono
            FROM marcadores m
            JOIN categorias c ON m.id_categoria = c.id_categoria
            WHERE m.id_usuario = @id_usuario
        `);
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error fetching markers:', error);
        res.status(500).json({ error: 'Error fetching markers' });
    }
});

// Crear un nuevo marcador
app.post('/api/marcadores', async (req, res) => {
    const { titulo, descripcion, latitud, longitud, id_usuario, id_categoria } = req.body;
    if (!titulo || latitud === undefined || longitud === undefined || !id_usuario || !id_categoria) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const { sql } = require('./db');
        const request = new sql.Request();
        request.input('titulo', sql.VarChar, titulo);
        request.input('descripcion', sql.Text, descripcion || null);
        request.input('latitud', sql.Decimal(10, 7), latitud);
        request.input('longitud', sql.Decimal(10, 7), longitud);
        request.input('id_usuario', sql.Int, id_usuario);
        request.input('id_categoria', sql.Int, id_categoria);

        // Inserta y recupera el ID generado
        const result = await request.query(`
            INSERT INTO marcadores (titulo, descripcion, latitud, longitud, id_usuario, id_categoria)
            OUTPUT inserted.id_marcador
            VALUES (@titulo, @descripcion, @latitud, @longitud, @id_usuario, @id_categoria)
        `);

        res.status(201).json({ message: 'Marker created', id_marcador: result.recordset[0].id_marcador });
    } catch (error) {
        console.error('Error creating marker:', error);
        res.status(500).json({ error: 'Error creating marker' });
    }
});

// Actualizar datos de un marcador
app.put('/api/marcadores/:id', async (req, res) => {
    const id_marcador = req.params.id;
    const { titulo, descripcion, id_categoria, id_usuario } = req.body;

    if (!titulo || !id_categoria || !id_usuario) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const { sql } = require('./db');
        const request = new sql.Request();
        request.input('id_marcador', sql.Int, id_marcador);
        request.input('titulo', sql.VarChar, titulo);
        request.input('descripcion', sql.Text, descripcion || null);
        request.input('id_categoria', sql.Int, id_categoria);
        request.input('id_usuario', sql.Int, id_usuario);

        // Actualiza solo si pertenece al usuario que realiza la petición
        const result = await request.query(`
            UPDATE marcadores
            SET titulo = @titulo, descripcion = @descripcion, id_categoria = @id_categoria
            WHERE id_marcador = @id_marcador AND id_usuario = @id_usuario
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Marker not found or unauthorized' });
        }

        res.status(200).json({ message: 'Marker updated' });
    } catch (error) {
        console.error('Error updating marker:', error);
        res.status(500).json({ error: 'Error updating marker' });
    }
});

// Eliminar un marcador
app.delete('/api/marcadores/:id', async (req, res) => {
    const id_marcador = req.params.id;
    const id_usuario = req.query.id_usuario || req.body.id_usuario;

    if (!id_usuario) {
        return res.status(400).json({ error: 'id_usuario is required' });
    }

    try {
        const { sql } = require('./db');
        const request = new sql.Request();
        request.input('id_marcador', sql.Int, id_marcador);
        request.input('id_usuario', sql.Int, id_usuario);

        // Elimina solo si pertenece al usuario solicitante
        const result = await request.query(`
            DELETE FROM marcadores
            WHERE id_marcador = @id_marcador AND id_usuario = @id_usuario
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Marker not found or unauthorized' });
        }

        res.status(200).json({ message: 'Marker deleted' });
    } catch (error) {
        console.error('Error deleting marker:', error);
        res.status(500).json({ error: 'Error deleting marker' });
    }
});

// --- ENDPOINTS PARA EL SISTEMA DE AMIGOS Y SOCIAL ---

// Buscar usuarios para agregar como amigos
app.get('/api/usuarios/buscar', async (req, res) => {
    const { query, id_usuario } = req.query;
    if (!query || !id_usuario) return res.status(400).json({ error: 'Faltan parámetros' });

    try {
        const { sql } = require('./db');
        const request = new sql.Request();
        request.input('query', sql.VarChar, `%${query}%`);
        request.input('id_usuario', sql.Int, id_usuario);

        // Busca usuarios coincidentes excluyendo al propio usuario y a los que ya tienen relación
        const result = await request.query(`
            SELECT id_usuario, nombre, correo 
            FROM usuarios 
            WHERE (nombre LIKE @query OR correo LIKE @query)
              AND id_usuario != @id_usuario
              AND id_usuario NOT IN (
                  SELECT id_usuario_recibe FROM amigos WHERE id_usuario_envia = @id_usuario
                  UNION
                  SELECT id_usuario_envia FROM amigos WHERE id_usuario_recibe = @id_usuario
              )
        `);
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error buscando usuarios:', error);
        res.status(500).json({ error: 'Error buscando usuarios' });
    }
});

// Enviar solicitud de amistad a otro usuario
app.post('/api/amigos/solicitar', async (req, res) => {
    const { id_usuario_envia, id_usuario_recibe } = req.body;
    if (!id_usuario_envia || !id_usuario_recibe) return res.status(400).json({ error: 'Faltan parámetros' });

    try {
        const { sql } = require('./db');
        const request = new sql.Request();
        request.input('envia', sql.Int, id_usuario_envia);
        request.input('recibe', sql.Int, id_usuario_recibe);

        // Inserta la relación con estado 'pendiente'
        await request.query(`
            INSERT INTO amigos (id_usuario_envia, id_usuario_recibe, estado)
            VALUES (@envia, @recibe, 'pendiente')
        `);
        res.status(201).json({ message: 'Solicitud enviada' });
    } catch (error) {
        console.error('Error enviando solicitud:', error);
        res.status(500).json({ error: 'Error enviando solicitud' });
    }
});

// Obtener todas las solicitudes de amistad pendientes recibidas por el usuario
app.get('/api/amigos/solicitudes', async (req, res) => {
    const { id_usuario } = req.query;
    if (!id_usuario) return res.status(400).json({ error: 'Falta id_usuario' });

    try {
        const { sql } = require('./db');
        const request = new sql.Request();
        request.input('id_usuario', sql.Int, id_usuario);

        const result = await request.query(`
            SELECT a.id_solicitud, a.id_usuario_envia, u.nombre, u.correo, a.fecha_creacion
            FROM amigos a
            JOIN usuarios u ON a.id_usuario_envia = u.id_usuario
            WHERE a.id_usuario_recibe = @id_usuario AND a.estado = 'pendiente'
        `);
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo solicitudes:', error);
        res.status(500).json({ error: 'Error obteniendo solicitudes' });
    }
});

// Aceptar o rechazar una solicitud de amistad
app.put('/api/amigos/responder', async (req, res) => {
    const { id_solicitud, accion } = req.body; // accion: 'aceptar' o 'rechazar'
    if (!id_solicitud || !accion) return res.status(400).json({ error: 'Faltan parámetros' });

    try {
        const { sql } = require('./db');
        const request = new sql.Request();
        request.input('id_solicitud', sql.Int, id_solicitud);

        if (accion === 'aceptar') {
            // Actualiza a estado 'aceptada'
            await request.query(`UPDATE amigos SET estado = 'aceptada' WHERE id_solicitud = @id_solicitud`);
            res.status(200).json({ message: 'Solicitud aceptada' });
        } else if (accion === 'rechazar') {
            // Elimina la fila de la relación en caso de rechazo
            await request.query(`DELETE FROM amigos WHERE id_solicitud = @id_solicitud`);
            res.status(200).json({ message: 'Solicitud rechazada' });
        } else {
            res.status(400).json({ error: 'Acción no válida' });
        }
    } catch (error) {
        console.error('Error respondiendo solicitud:', error);
        res.status(500).json({ error: 'Error al responder solicitud' });
    }
});

// Obtener la lista de amigos aceptados de un usuario
app.get('/api/amigos', async (req, res) => {
    const { id_usuario } = req.query;
    if (!id_usuario) return res.status(400).json({ error: 'Falta id_usuario' });

    try {
        const { sql } = require('./db');
        const request = new sql.Request();
        request.input('id_usuario', sql.Int, id_usuario);

        // Busca registros de amistad aceptada donde el usuario participe (como remitente o destinatario)
        const result = await request.query(`
            SELECT u.id_usuario, u.nombre, u.correo
            FROM amigos a
            JOIN usuarios u ON 
                (a.id_usuario_envia = u.id_usuario AND a.id_usuario_recibe = @id_usuario) OR
                (a.id_usuario_recibe = u.id_usuario AND a.id_usuario_envia = @id_usuario)
            WHERE a.estado = 'aceptada'
        `);
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo amigos:', error);
        res.status(500).json({ error: 'Error obteniendo amigos' });
    }
});

// Obtener los marcadores del mapa de un amigo
app.get('/api/amigos/marcadores', async (req, res) => {
    const { id_usuario, id_amigo } = req.query;
    if (!id_usuario || !id_amigo) return res.status(400).json({ error: 'Faltan parámetros' });

    try {
        const { sql } = require('./db');
        const request = new sql.Request();
        request.input('id_usuario', sql.Int, id_usuario);
        request.input('id_amigo', sql.Int, id_amigo);

        // 1. Validar que exista una relación de amistad activa y aceptada
        const checkFriend = await request.query(`
            SELECT 1 FROM amigos 
            WHERE estado = 'aceptada' AND 
            ((id_usuario_envia = @id_usuario AND id_usuario_recibe = @id_amigo) OR 
             (id_usuario_recibe = @id_usuario AND id_usuario_envia = @id_amigo))
        `);

        if (checkFriend.recordset.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para ver estos marcadores' });
        }

        // 2. Si son amigos, retornar los marcadores del amigo solicitado
        const result = await request.query(`
            SELECT m.id_marcador, m.titulo, m.descripcion, m.latitud, m.longitud, m.fecha_creacion, m.id_categoria, c.nombre_categoria, c.icono
            FROM marcadores m
            JOIN categorias c ON m.id_categoria = c.id_categoria
            WHERE m.id_usuario = @id_amigo
        `);
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error fetching friend markers:', error);
        res.status(500).json({ error: 'Error fetching markers' });
    }
});

// Inicialización del servidor Express en el puerto configurado
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
