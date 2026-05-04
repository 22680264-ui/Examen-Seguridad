const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const app = express();

// --- TU CONEXIÓN ORIGINAL ---
const mongoURI = "mongodb+srv://ExamenBitacoras:160224@examenbitacoras.d5hrfds.mongodb.net/?appName=ExamenBitacoras";

mongoose.connect(mongoURI)
    .then(() => console.log("Conectado a MongoDB Cloud"))
    .catch(err => console.error("Error de conexión:", err));

// Esquemas
const User = mongoose.model('User', { 
    username: { type: String, unique: true }, 
    password: String, 
    rol: String 
});

const Log = mongoose.model('Log', { 
    tipo: String, 
    usuario: String, 
    sessionID: String, 
    fecha: { type: Date, default: Date.now } 
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname)); 

app.use(session({
    secret: 'token-muy-secreto',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI }),
    cookie: { maxAge: 1000 * 60 * 30 } 
}));

// --- REGISTRO (CONECTADO A MODAL) ---
app.post('/registro', async (req, res) => {
    try {
        const { username, password, rol } = req.body;
        await new User({ username, password, rol }).save();
        res.status(200).send("OK");
    } catch (err) {
        res.status(400).send("Error");
    }
});

// --- BITÁCORAS 1 Y 2: LOGIN ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const u = await User.findOne({ username, password });

    if (u) {
        req.session.username = u.username;
        req.session.rol = u.rol;
        // BITÁCORA 1: ACCESO CORRECTO
        await new Log({ tipo: 'ACCESO_CORRECTO', usuario: username, sessionID: req.sessionID }).save();
        
        if (u.rol === 'admin') res.redirect('/admin.html');
        else res.redirect('/usuario.html');
    } else {
        // BITÁCORA 2: ACCESO FALLIDO
        await new Log({ tipo: 'ACCESO_FALLIDO', usuario: username || 'Desconocido' }).save();
        res.redirect('/error.html');
    }
});

// --- BITÁCORA 3: CIERRE DE SESIÓN ---
app.get('/logout', async (req, res) => {
    const usuarioQueSale = req.session.username || 'Anónimo';
    await new Log({ tipo: 'CIERRE_SESION', usuario: usuarioQueSale, sessionID: req.sessionID }).save();
    req.session.destroy();
    res.redirect('/');
});

// API para la tabla de admin.html
app.get('/api/logs', async (req, res) => {
    const logs = await Log.find().sort({ fecha: -1 });
    res.json(logs);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));