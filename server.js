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

function calculate_winner(arr) {
  for (let i = 0; i < 3; i++) {
    let index = 3 * i;
    if (!arr[index]) {
      continue;
    }
    if (arr[index] === arr[index + 1] && arr[index] === arr[index + 2]) {
      console.log("winner is (horizontally)" + arr[index]);
      return arr[index];
    }
  }
  for (let i = 0; i < 3; i++) {
    let index = i;
    if (!arr[index]) {
      continue;
    }
    if (arr[index] === arr[index + 3] && arr[index] === arr[index + 6]) {
      console.log("winner is (vertically)" + arr[index]);
      return arr[index];
    }
  }
  if (arr[0] === arr[4] && arr[0] === arr[8] && arr[0] !== null) {
    console.log("winner (diagonally)" + arr[0]);
    return arr[0];
  }

  if (arr[2] === arr[4] && arr[2] === arr[6] && arr[2] !== null) {
    console.log("winner (diagonally)" + arr[2]);
    return arr[2];
  }
}

let available_players = [];
let board_states = {};

app.get("/", (req, res) => {
  res.send("<h1>Hello</h1>");
});

io.on("connection", (Socket) => {
  let winner = null;
  let symbol;
  let assigned_room;

  Socket.emit("available_players", available_players);

  Socket.on("disconnect", () => {
    console.log(Socket.id + " disconneted ");
    Socket.broadcast.emit("Reset", true);
    delete board_states[assigned_room];
    available_players = available_players.filter(
      (value) => value.room_id !== Socket.id
    );
    console.log(available_players,board_states);
    io.to(assigned_room).emit("Ready", false);
    io.emit("available_players", available_players);
  });

  Socket.on("board_state_update", (id) => {
    if (io.sockets.adapter.rooms.get(assigned_room).size === 2) {
      board_states[assigned_room][id] = symbol;
      winner = calculate_winner(board_states[assigned_room]);
      io.to(assigned_room).emit(
        "sync_board_state",
        board_states[assigned_room],
        winner,
        symbol
      );
      console.log(board_states, winner, symbol);

      return;
    }
    Socket.emit("sync_board_state", "wait for players");
  });

  Socket.on("update_players", (player_name, room_id, symbol_selected) => {
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
      symbol = symbol_selected;
      io.to(assigned_room).emit("Ready", true);
      return;
    }
    available_players.push({
      room_id: Socket.id,
      name: player_name,
      symbol: symbol_selected,
    });
    symbol = symbol_selected;

    Socket.rooms.forEach((element) => {
      assigned_room = element;
      board_states[assigned_room] = new Array(9).fill(null);
      console.log("in room " + assigned_room);
    });

    Socket.broadcast.emit("available_players", available_players);
    console.log(board_states);
  });
});

httpserver.listen(PORT, () => {
  console.log(`Listening on PORT ${PORT}`);
});
