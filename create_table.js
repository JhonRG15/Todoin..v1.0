const { sql, connectDB } = require('./db');

async function run() {
    await connectDB();
    try {
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='amigos' and xtype='U')
            BEGIN
                CREATE TABLE amigos (
                    id_solicitud INT IDENTITY(1,1) PRIMARY KEY,
                    id_usuario_envia INT NOT NULL,
                    id_usuario_recibe INT NOT NULL,
                    estado VARCHAR(20) DEFAULT 'pendiente',
                    fecha_creacion DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_UsuarioEnvia FOREIGN KEY (id_usuario_envia) REFERENCES usuarios(id_usuario),
                    CONSTRAINT FK_UsuarioRecibe FOREIGN KEY (id_usuario_recibe) REFERENCES usuarios(id_usuario),
                    CONSTRAINT UQ_Amistad UNIQUE (id_usuario_envia, id_usuario_recibe)
                );
            END
        `);
    } catch (e) {
        console.error('Error al crear tabla:', e.message);
    }
    process.exit(0);
}
run();
