import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const TOKEN = process.env.TOKEN;
const PHONE_ID = process.env.PHONE_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// 🔗 Verificación del webhook (Meta)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 📤 Enviar mensaje
async function enviarMensaje(to, text) {
  await axios.post(
    `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      text: { body: text }
    },
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}

// 🧠 Memoria simple
const sesiones = {};

const preguntas = [
  "¿Qué vehículo es? (marca, modelo, año)",
  "¿Cuántos litros necesitas?",
  "¿En qué ciudad estás?",
  "¿Qué tipo de cliente eres?\n1) Taller\n2) Refaccionaria\n3) Flotilla\n4) Usuario final"
];

// 📥 Recibir mensajes
app.post("/webhook", async (req, res) => {
  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return res.sendStatus(200);

  const from = msg.from;
  const texto = msg.text?.body || "";

  if (!sesiones[from]) {
    sesiones[from] = { paso: 0, datos: {} };
    await enviarMensaje(from, "Hola 👋 Soy el asistente de Prodisa. ¿Te ayudo con aceites, filtros o químicos?");
    await enviarMensaje(from, preguntas[0]);
    return res.sendStatus(200);
  }

  let sesion = sesiones[from];

  if (sesion.paso < preguntas.length) {
    sesion.datos[sesion.paso] = texto;
    sesion.paso++;

    if (sesion.paso < preguntas.length) {
      await enviarMensaje(from, preguntas[sesion.paso]);
    } else {
      await enviarMensaje(from, "🔧 Te recomiendo: Raloy 5W-30 Sintético");
      await enviarMensaje(from, "¿Quieres que te comunique con un asesor?");
    }
    return res.sendStatus(200);
  }

  if (texto.toLowerCase().includes("si")) {
    await enviarMensaje(from, "Te conecto con un asesor 👨‍🔧");
    console.log("CLIENTE LISTO:", sesion.datos);
    return res.sendStatus(200);
  }

  await enviarMensaje(from, "¿Quieres otra recomendación o analizar una imagen?");
  res.sendStatus(200);
});

// 🚀 Puerto dinámico (Render)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Bot listo en puerto", PORT));
