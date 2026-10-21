import { useEffect, useRef, useState } from "react";
import api from "../api";

function Chat({ requestId, userId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const boxRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function fetchMessages() {
      try {
        const res = await api.get(`/requests/${requestId}/messages`);
        if (active) setMessages(res.data);
      } catch {
        if (active) setError("Could not load messages");
      }
    }

    fetchMessages();
    const timer = setInterval(fetchMessages, 4000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [requestId]);

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const res = await api.post(`/requests/${requestId}/messages`, {
        text: text.trim(),
      });
      setMessages((prev) => [...prev, res.data]);
      setText("");
      setError("");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Could not send message");
    }
  }

  return (
    <div className="section">
      <h2>Chat</h2>
      <div className="chat-box" ref={boxRef}>
        {messages.length === 0 && (
          <p className="meta">No messages yet. Say hello!</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`bubble ${m.sender_id === userId ? "mine" : "theirs"}`}
          >
            <p>{m.text}</p>
            <span className="time">
              {new Date(m.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <form className="chat-form" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          maxLength={2000}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default Chat;