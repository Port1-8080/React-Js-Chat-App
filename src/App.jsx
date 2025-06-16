import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, push, update } from "firebase/database";
import { db, auth } from "./firebase";
import io from "socket.io-client";

import LoginPage from "./components/LoginPage";
import OnlineUsers from "./components/OnlineUsers";
import ChatArea from "./components/ChatArea";

import "./App.css";

const socket = io("http://localhost:5000");

function App() {
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});

  const messageInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (user && user.displayName) {
        socket.emit("set_username", { username: user.displayName });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authUser) return;

    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("typing", ({ from, isTyping }) => {
      setTypingUsers((prev) => ({ ...prev, [from]: isTyping }));
    });

    socket.on("messages_seen_ack", ({ seenFrom }) => {
      setChat((prev) =>
        prev.map((msg) =>
          msg.from === authUser.displayName && msg.to === seenFrom
            ? { ...msg, seen: true }
            : msg
        )
      );
    });

    const messagesRef = ref(db, "messages");
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const counts = {};
      if (data) {
        Object.values(data).forEach((msg) => {
          if (msg.to === authUser.displayName && !msg.seen) {
            counts[msg.from] = (counts[msg.from] || 0) + 1;
          }
        });
      }
      setUnreadCounts(counts);
    });

    return () => {
      socket.off("online_users");
      socket.off("typing");
      socket.off("messages_seen_ack");
    };
  }, [authUser]);

  function sendMessage() {
    if (!message.trim() || !selectedUser) return;

    const timestamp = Date.now();
    const newMessage = {
      from: authUser.displayName,
      to: selectedUser,
      message,
      timestamp,
      delivered: true,
      seen: false
    };

    push(ref(db, "messages"), newMessage);
    setMessage("");
  }

  function handleUserSelect(user) {
    setSelectedUser(user);
    const messagesRef = ref(db, "messages");

    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const filtered = Object.entries(data)
          .filter(([_, msg]) =>
            (msg.from === authUser.displayName && msg.to === user) ||
            (msg.from === user && msg.to === authUser.displayName)
          )
          .map(([key, msg]) => ({ key, ...msg }));

        setChat(filtered);

        filtered.forEach((msg) => {
          if (msg.from === user && msg.to === authUser.displayName && !msg.seen) {
            update(ref(db, `messages/${msg.key}`), { seen: true });
          }
        });

        socket.emit("message_seen", { from: user, to: authUser.displayName });
      } else {
        setChat([]);
      }
    });
  }

  function startEditing(msg) {
    setEditingMessageId(msg.key);
    setEditingMessageText(msg.message);
  }

  function cancelEditing() {
    setEditingMessageId(null);
    setEditingMessageText("");
  }

  function saveEditedMessage() {
    if (!editingMessageText.trim() || !editingMessageId) return;
    const msgRef = ref(db, `messages/${editingMessageId}`);
    update(msgRef, { message: editingMessageText });
    cancelEditing();
  }

  function deleteMessage(msg) {
    const msgRef = ref(db, `messages/${msg.key}`);
    update(msgRef, { message: "[deleted]" });
  }

  function toggleReaction(msg, emoji) {
    const msgRef = ref(db, `messages/${msg.key}`);
    const currentReactions = msg.reactions || {};
    const users = currentReactions[emoji] || [];

    const alreadyReacted = users.includes(authUser.displayName);
    const updatedUsers = alreadyReacted
      ? users.filter((u) => u !== authUser.displayName)
      : [...users, authUser.displayName];

    const updatedReactions = {
      ...currentReactions,
      [emoji]: updatedUsers
    };

    update(msgRef, { reactions: updatedReactions });
  }

  if (!authUser) {
    return <LoginPage onLoginSuccess={(user) => setAuthUser(user)} />;
  }

  return (
    <div className="app">
      <OnlineUsers
        users={onlineUsers}
        onSelectUser={handleUserSelect}
        unreadCounts={unreadCounts}
        currentUser={authUser?.displayName}
      />

      <ChatArea
        selectedUser={selectedUser}
        messages={chat}
        onSend={sendMessage}
        onChangeMessage={setMessage}
        message={message}
        typingUsers={typingUsers}
        onStartEditing={startEditing}
        onDelete={deleteMessage}
        onSaveEdit={saveEditedMessage}
        onCancelEdit={cancelEditing}
        onEditChange={setEditingMessageText}
        editingMessageId={editingMessageId}
        editingMessageText={editingMessageText}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        messageInputRef={messageInputRef}
        emojiPickerRef={emojiPickerRef}
        onReact={toggleReaction}
      />
    </div>
  );
}

export default App;
