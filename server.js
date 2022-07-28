const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 5000;
const app = express();
const httpserver = createServer(app);
const io = new Server(httpserver, {
  cors: {
    origin: "*"
  },
});

app.get("/", (req, res) => {
  res.send("<h1>Hello</h1>");
});

io.on("connection", (Socket) => {
  console.log(Socket.id + " connected");
  Socket.on("disconnect",()=>{
    console.log(Socket.id + " disconneted")
  })
});

httpserver.listen(PORT, () => {
  console.log(`Listening on PORT ${PORT}`);
});
