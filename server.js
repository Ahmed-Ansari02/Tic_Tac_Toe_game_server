const { Console } = require("console");
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 5000;
const app = express();
const httpserver = createServer(app);
const io = new Server(httpserver, {
  cors: {
    origin: "*",
  },
});

let available_players = [];

app.get("/", (req, res) => {
  res.send("<h1>Hello</h1>");
});

io.on("connection", (Socket) => {
  let synchronised_board_state;
  let winner = null;
  let curr_player = "X";
  let assigned_room;
  Socket.emit("available_players", available_players);

  Socket.on("disconnect", () => {
    console.log(Socket.id + " disconneted ");
    available_players = available_players.filter(
      (value) => value.room_id !== Socket.id
    );
    console.log(available_players);
    io.to(assigned_room).emit("Ready", false);
    io.emit("available_players", available_players);
  });
  Socket.on("board_state_update", (board_state) => {
    if (io.sockets.adapter.rooms.get(assigned_room).size === 2) {
      synchronised_board_state = board_state;
      console.log(synchronised_board_state)
      curr_player=curr_player === "X" ? "O" : "X";
      io.to(assigned_room).emit(
        "sync_board_state",
        synchronised_board_state,
        curr_player
      );
      console.log(curr_player)

      return;
    }
    Socket.emit("sync_board_state", "wait for players");
  });
  Socket.on("update_players", (player_name, room_id, symbol) => {
    if (available_players.length !== 0) {
      console.log(room_id);
      Socket.join(room_id);
    }

    if (io.sockets.adapter.rooms.get(room_id).size === 2) {
      available_players = available_players.filter(
        (value) => value.room_id !== room_id
      );
      Socket.rooms.forEach((element) => {
        assigned_room = element;
      });
      io.to(assigned_room).emit("Ready", true, assigned_room);
      return;
    }
    available_players.push({
      room_id: Socket.id,
      name: player_name,
      symbol: symbol,
    });
    Socket.rooms.forEach((element) => {
      assigned_room = element;
      console.log("in room " + element);
    });

    Socket.broadcast.emit("available_players", available_players);
  });
});

httpserver.listen(PORT, () => {
  console.log(`Listening on PORT ${PORT}`);
});
