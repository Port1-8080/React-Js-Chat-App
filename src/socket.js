// src/socket.js
import { io } from "socket.io-client";

const socket = io("https://react-js-chat-app-1.onrender.com", {
  transports: ["websocket"],
});

export default socket;
