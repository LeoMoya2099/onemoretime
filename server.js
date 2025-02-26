require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const app = express(); 

// Middleware
app.use(bodyParser.json());
app.use(cors());




// Conexión a MongoDB
// Conexión a MongoDB
const uri = "mongodb+srv://Leonardo_Moya:5Whl9ZlwX43lUe8x@cluster0.a02aj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };

async function conectarMongoDB() {
  try {
    await mongoose.connect(uri, clientOptions);
    console.log("🟢 Conexión exitosa a MongoDB");
  } catch (error) {
    console.error("🔴 Error conectando a MongoDB:", error);
  }
}
conectarMongoDB();

// Esquema de usuario
const UserSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  contraseña: { type: String, required: true },
  balance: { type: Number, default: 0 }
});

const User = mongoose.model('User', UserSchema);

// Ruta para obtener el valor del dólar
app.get("/dolar", async (req, res) => {
  try {
    const API_KEY = "929be70cef5bb0c8b3d28a0c";
    const response = await axios.get(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`);
    
    if (response.data && response.data.conversion_rates && response.data.conversion_rates.MXN) {
      res.json({
        success: true,
        precioDolar: response.data.conversion_rates.MXN,
        fecha: response.data.time_last_update_utc
      });
    } else {
      throw new Error("Datos inválidos de la API");
    }
  } catch (error) {
    console.error("Error obteniendo el precio del dólar:", error);
    res.status(500).json({ success: false, message: "Error al obtener el precio del dólar" });
  }
});

// Rutas de usuario
app.post('/check-balance', async (req, res) => {
  const { email } = req.body;

  try {
    const usuario = await User.findOne({ email });
    if (!usuario) return res.status(404).send({ error: 'Usuario no encontrado' });
    
    res.status(200).send({ balance: usuario.balance });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Error al obtener el saldo' });
  }
});

app.post('/deposit', async (req, res) => {
  const { email, amount } = req.body;

  if (!amount || amount <= 0) return res.status(400).send({ error: 'Cantidad inválida' });

  try {
    const usuario = await User.findOne({ email });
    if (!usuario) return res.status(404).send({ error: 'Usuario no encontrado' });

    usuario.balance += amount;
    await usuario.save();
    res.status(200).send({ message: 'Depósito exitoso', balance: usuario.balance });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Error al depositar dinero' });
  }
});

app.post('/withdraw', async (req, res) => {
  const { email, amount } = req.body;

  if (!amount || amount <= 0) return res.status(400).send({ error: 'Cantidad inválida' });

  try {
    const usuario = await User.findOne({ email });
    if (!usuario) return res.status(404).send({ error: 'Usuario no encontrado' });

    if (usuario.balance < amount) return res.status(400).send({ error: 'Fondos insuficientes' });

    usuario.balance -= amount;
    await usuario.save();
    res.status(200).send({ message: 'Retiro exitoso', balance: usuario.balance });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Error al retirar dinero' });
  }
});

app.post('/registro', async (req, res) => {
  const { nombre, apellido, email, contraseña } = req.body;

  try {
    const nuevoUsuario = new User({ nombre, apellido, email, contraseña });
    await nuevoUsuario.save();
    res.status(201).send({ message: 'Usuario registrado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Error al registrar el usuario' });
  }
});

app.post('/login', async (req, res) => {
  const { email, contraseña } = req.body;

  try {
    const usuario = await User.findOne({ email, contraseña });
    if (usuario) {
      res.status(200).send({ message: 'Inicio de sesión exitoso' });
    } else {
      res.status(401).send({ error: 'Credenciales incorrectas' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Error al iniciar sesión' });
  }
});

app.delete('/usuarios/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const usuarioEliminado = await User.findOneAndDelete({ email });
    if (!usuarioEliminado) return res.status(404).send({ error: 'Usuario no encontrado' });

    res.send({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).send({ error: 'Error interno del servidor' });
  }
});

// Puerto del servidor
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
