// Importa la instancia de conexión y cliente SQL desde db.js
const { sql, connectDB } = require('./db');

/**
 * Función principal para crear la tabla de amigos/solicitudes de amistad.
 */
async function run() {
    // Inicializa la conexión con Azure SQL Server
    await connectDB();
    try {
        // Ejecuta la consulta para crear la tabla 'amigos' únicamente si no existe
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='amigos' and xtype='U')
            BEGIN
                CREATE TABLE amigos (
                    id_solicitud INT IDENTITY(1,1) PRIMARY KEY, -- Identificador único de la solicitud
                    id_usuario_envia INT NOT NULL,               -- ID del usuario que envía la solicitud
                    id_usuario_recibe INT NOT NULL,              -- ID del usuario que recibe la solicitud
                    estado VARCHAR(20) DEFAULT 'pendiente',      -- Estado (pendiente, aceptada, rechazada)
                    fecha_creacion DATETIME DEFAULT GETDATE(),   -- Fecha de creación del registro
                    -- Llave foránea hacia la tabla de usuarios (remitente)
                    CONSTRAINT FK_UsuarioEnvia FOREIGN KEY (id_usuario_envia) REFERENCES usuarios(id_usuario),
                    -- Llave foránea hacia la tabla de usuarios (destinatario)
                    CONSTRAINT FK_UsuarioRecibe FOREIGN KEY (id_usuario_recibe) REFERENCES usuarios(id_usuario),
                    -- Restricción única para evitar solicitudes duplicadas entre los mismos dos usuarios
                    CONSTRAINT UQ_Amistad UNIQUE (id_usuario_envia, id_usuario_recibe)
                );
            END
        `);
        console.log('✅ Verificación y creación de tabla amigos exitosa.');
    } catch (e) {
        console.error('Error al crear tabla:', e.message);
    }
    // Finaliza la ejecución del proceso
    process.exit(0);
}

// Ejecuta la migración
run();
