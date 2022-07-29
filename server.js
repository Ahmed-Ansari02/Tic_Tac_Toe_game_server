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
let available_players= []

app.get("/", (req, res) => {
  res.send("<h1>Hello</h1>");
});

io.on("connection", (Socket) => {
  io.emit("available_players", available_players)
  console.log(Socket.id + " connected");
  Socket.on("disconnect",()=>{
    console.log(Socket.id + " disconneted")

    available_players= available_players.filter((value)=>value.id!==Socket.id)
    io.emit("available_players", available_players)
  })
  Socket.on("board_state_update", (board_state)=>{
   // console.log(board_state, Socket.id)
    synchronised_board_state=board_state
    console.log(synchronised_board_state)
    Socket.broadcast.emit("sync_board_state", synchronised_board_state)
  })
  Socket.on("update_players", (player_name, room_id, symbol)=>{
    
    available_players.push({room_id: Socket.id, name:player_name, symbol:symbol})
    console.log(room_id)
    Socket.join(available_players.filter(value=>value.room_id===room_id))
    Socket.broadcast.emit("available_players", available_players)
  })
});

httpserver.listen(PORT, () => {
  console.log(`Listening on PORT ${PORT}`);
});
