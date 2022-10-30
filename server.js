const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const PORT = process.env.PORT || 5000;
const app = express();
const httpserver = createServer(app);
const io = new Server(httpserver, {
  cors: {
    origin: "https://tic-tac-toe-game-react.vercel.app", //CORS set so that only vercel domain is allowed access to the backend.
  },
});

function calculate_winner(arr) {
  //function to determine the winner by vertically, horizontally and diagonally examining the board.

  for (let i = 0; i < 3; i++) {
    //Determining if any player has won the game horizontally.
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
    //Determining if any player has won the game vertically.
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
    //Determining if any player has won the game diagonally.
    console.log("winner (diagonally)" + arr[0]);
    return arr[0];
  }

  if (arr[2] === arr[4] && arr[2] === arr[6] && arr[2] !== null) {
    console.log("winner (diagonally)" + arr[2]);
    return arr[2];
  }
}

let available_players = []; //Array to store Available players.
let board_states = {}; //Object that stores board state for each pair of players.

io.on("connection", (Socket) => {
  let winner = null;
  let symbol;
  let assigned_room;

  Socket.emit("available_players", available_players);

  Socket.on("disconnect", () => {
    //if  one of the player disconnects, broadcast to connected players that game state is not ready and needs to be reset.

    console.log(Socket.id + " disconneted ");
    Socket.to(assigned_room).emit("Reset", true);
    delete board_states[assigned_room]; //Delete board state associated with the leaving player.
    available_players = available_players.filter(
      (value) => value.room_id !== Socket.id
    );
    console.log(available_players, board_states);
    io.to(assigned_room).emit("Ready", false);
    io.emit("available_players", available_players);
  });

  Socket.on("board_state_update", (id) => {
    //Handling chnages to the unified board state.

    if (io.sockets.adapter.rooms.get(assigned_room).size === 2) {
      board_states[assigned_room].board[id] = symbol;
      winner = calculate_winner(board_states[assigned_room].board); //check if there is a winner and then broadcast winner and their total wins so far to connected players.
      if (winner) {
        board_states[assigned_room]["winnings"][symbol] =
          board_states[assigned_room]["winnings"][symbol] + 1;
        io.to(assigned_room).emit(
          "score_count",
          board_states[assigned_room]["winnings"]
        );
      }
      io.to(assigned_room).emit(
        //sync board state between all connected players
        "sync_board_state",
        board_states[assigned_room].board,
        winner,
        symbol
      );
      console.log(board_states, winner, symbol);

      return;
    }
    Socket.emit("sync_board_state", "wait for players");
  });

  Socket.on("rematch_req", () => {
    //Handling a rematch request by resetting the board and starting a new game

    board_states[assigned_room].board = new Array(9).fill(null);
    winner = false;
    io.to(assigned_room).emit(
      "sync_board_state",
      board_states[assigned_room].board,
      winner,
      symbol
    );
  });

  Socket.on("update_players", (player_name, room_id, symbol_selected) => {
    //Handling new players joining the game.

    if (available_players.length !== 0) {
      //if no players is in the player list, assign player to his own room using their socket id.
      Socket.join(room_id);
    }

    if (io.sockets.adapter.rooms.get(room_id).size === 2) {
      //if new player chooses to play with an existing player, remove existing player from list of available players.
      available_players = available_players.filter(
        (value) => value.room_id !== room_id
      );
      Socket.broadcast.emit("available_players", available_players); //broadcast available player list to connected players.
      Socket.rooms.forEach((element) => {
        assigned_room = element;
      });
      symbol = symbol_selected;
      Socket.to(assigned_room).emit("competitor_name", player_name);
      io.to(assigned_room).emit("Ready", true);
      io.to(assigned_room).emit(
        "score_count",
        board_states[assigned_room]["winnings"]
      );
      return;
    }

    available_players.push({
      //add new player to available player array.
      room_id: Socket.id,
      name: player_name,
      symbol: symbol_selected,
    });
    symbol = symbol_selected;

    Socket.rooms.forEach((element) => {
      //for each assigned room create an empty board array and an object tracking X and O wins.
      assigned_room = element;
      board_states[assigned_room] = {
        board: new Array(9).fill(null),
        winnings: { X: 0, O: 0 },
      };
      console.log("in room " + assigned_room);
    });

    Socket.broadcast.emit("available_players", available_players);
    console.log(board_states);
  });
});

httpserver.listen(PORT, () => {
  console.log(`Listening on PORT ${PORT}`);
});
