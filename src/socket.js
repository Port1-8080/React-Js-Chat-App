import { io } from "socket.io-client";

// Use deployed backend URL
const socket = io("https://react-js-chat-app-1.onrender.com", {
  transports: ['websocket'], // optional, but recommended for Render
  withCredentials: true, // if you're using cookies/auth
});

export default socket;
