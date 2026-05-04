const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');

const app = express();


const mongoURI = "mongodb+srv://ExamenBitacoras:160224@examenbitacoras.d5hrfds.mongodb.net/?appName=ExamenBitacoras";

mongoose.connect(mongoURI)
    .then(() => console.log("Conectado a MongoDB Cloud"))
    .catch(err => console.error("Error de conexión:", err));

// Esquemas de MongoDB
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
app.use(express.static('public')); 
app.use(session({
    secret: 'token-muy-secreto',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI }),
    cookie: { maxAge: 1000 * 60 * 30 } 
}));


app.post('/registro', async (req, res) => {
    const { user, pass, rol } = req.body;
    await new User({ username: user, password: pass, rol }).save();
    res.send('Registrado. <a href="/">Regresar al login</a>');
});

app.post('/login', async (req, res) => {
    const { user, pass } = req.body;
    const u = await User.findOne({ username: user, password: pass });

    if (u) {
        req.session.username = u.username;
        req.session.rol = u.rol;
        // BITÁCORA 1: ACCESO CORRECTO
        await new Log({ tipo: 'ACCESO_CORRECTO', usuario: user, sessionID: req.sessionID }).save();
        
        if (u.rol === 'admin') res.redirect('/admin.html');
        else res.redirect('/user.html');
    } else {
        // BITÁCORA 2: ACCESO FALLIDO
        await new Log({ tipo: 'ACCESO_FALLIDO', usuario: user }).save();
        res.send('Error de acceso. <a href="/">Reintentar</a>');
    }
});

app.get('/logout', async (req, res) => {
    const user = req.session.username;
    // BITÁCORA 3: CIERRE DE SESIÓN
    await new Log({ tipo: 'CIERRE_SESION', usuario: user }).save();
    req.session.destroy();
    res.redirect('/');
});

app.get('/obtener-logs', async (req, res) => {
    const logs = await Log.find().sort({ fecha: -1 });
    res.json(logs);
});

app.listen(process.env.PORT || 3000, () => console.log("Servidor Online"));