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

let synchronised_board_state;
let winner = null

app.get("/", (req, res) => {
  res.send("<h1>Hello</h1>");
});

io.on("connection", (Socket) => {
  console.log(Socket.id + " connected");
  Socket.on("disconnect",()=>{
    console.log(Socket.id + " disconneted")
  })
  Socket.on("board_state_update", (board_state)=>{
    console.log(board_state)
    synchronised_board_state=board_state
    Socket.broadcast.emit("sync_board_state", synchronised_board_state)
  })
});

httpserver.listen(PORT, () => {
  console.log(`Listening on PORT ${PORT}`);
});
