'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface Message {
  id: string;
  text?: string;
  image?: string;
  sender: { id: string; name: string; image: string };
  timestamp: number;
}

interface User {
  id: string;
  name: string;
  image: string;
}

export default function Chat() {
  /* ----------- STATE ---------- */
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<User>({
    id: '',
    name: '',
    image: '/default-user.png',
  });
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'ocean'>('light');

  /* ---------- REFS ----------- */
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  /* -------- MESSAGES POLLING ---------- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get('/api/messages');
        setMessages(data.messages);
      } catch (err) {
        console.error('Xabarlar yuklanmadi:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  /* -------- HYDRATE USER & THEME -------- */
  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR himoyasi

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsLoginOpen(false);
    }

    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'ocean' | null;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  /* ---------- THEME PERSISTENCE ---------- */
  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  /* ---------- AUTO‑SCROLL ---------- */
  useEffect(() => {
    if (!messagesEndRef.current || !messagesContainerRef.current) return;

    const el = messagesContainerRef.current;
    const atBottom = el.scrollHeight - el.scrollTop === el.clientHeight;
    if (atBottom) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ---------- CLEAN UP IMAGE URL ---------- */
  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(URL.createObjectURL(image));
    };
  }, [image]);

  /* ---------- HELPERS ---------- */
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

  const handleImageIconClick = () => {
    fileInputRef.current?.click();
  };

  const toggleTheme = () =>
    setTheme((prev) => (prev === 'light' ? 'dark' : prev === 'dark' ? 'ocean' : 'light'));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ---------- USER LOGIN ---------- */
  const handleUserSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.name || !image) return;

    const userId = localStorage.getItem('userId') || Math.random().toString(36).slice(2);
    localStorage.setItem('userId', userId);

    const imageData = await fileToBase64(image);
    const updatedUser = { id: userId, name: user.name, image: imageData };

    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setIsLoginOpen(false);
    setImage(null);
  };

  /* ---------- SEND MESSAGE ---------- */
  const sendMessage = async () => {
    if (!user.id || (!message.trim() && !image)) return;

    try {
      let imageData: string | undefined;
      if (image) imageData = await fileToBase64(image);

      const newMessage: Message = {
        id: Math.random().toString(),
        text: message || undefined,
        image: imageData,
        sender: user,
        timestamp: Date.now(),
      };

      await axios.post('/api/messages', { type: 'message', data: newMessage });
      setMessage('');
      setImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Xabar yuborishda xato:', error);
    }
  };

  /* ---------- RENDER ---------- */
  return (
    <div className="chat-container">
      {/* ---------------- LOGIN MODAL -------------- */}
      {isLoginOpen && (
        <div className="modal-backdrop">
          <form onSubmit={handleUserSettings} className="login-modal">
            <h2>Xush kelibsiz!</h2>

            <input
              type="text"
              value={user.name}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
              className="login-input"
              placeholder="Ismingizni kiriting"
              required
            />

            <div className="image-upload">
              <button type="button" onClick={handleImageIconClick} className="image-upload-btn">
                {/* ikon */}
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828L17 10.828M7 17H5a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v2m-1 11h2a2 2 0 002-2V9m-7 7v3m4-3v3"
                  />
                </svg>
              </button>
              <span>Rasm yuklash (majburiy)</span>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
                className="hidden"
                ref={fileInputRef}
                required
              />

              {image ? (
                <img src={URL.createObjectURL(image)} alt="Tanlangan rasm" className="preview-img" />
              ) : (
                <p className="error-message">Iltimos, rasm yuklang!</p>
              )}
            </div>

            <button type="submit" className="login-btn" disabled={!image}>
              Davom etish
            </button>
          </form>
        </div>
      )}

      {/* ---------------- MAIN CHAT -------------- */}
      {!isLoginOpen && (
        <>
          {/* HEADER */}
          <div className="header">
            <div className="user-info">
              <img src={user.image} alt="Profil" className="profile-img" />
              <span>{user.name}</span>
            </div>

            <button onClick={toggleTheme} className="theme-toggle">
              {/* …uchta tema ikonlari — o‘zgarmagan */}
              {theme === 'light' && (
                <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2m0 16v2m-6.56-4.44l1.77 1.77m10.62-10.62l1.77 1.77M1 12h2m16 0h2m-4.44 6.56l1.77 1.77m-10.62-10.62l1.77 1.77" />
                </svg>
              )}
              {theme === 'dark' && (
                <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                </svg>
              )}
              {theme === 'ocean' && (
                <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                </svg>
              )}
            </button>
          </div>

          {/* MESSAGES */}
          <div className="messages" ref={messagesContainerRef}>
            {messages.map((msg) => (
              <div key={msg.id} className="message-wrapper" style={{ animation: 'slideIn 0.5s ease-out' }}>
                <div className="message-header">
                  <img src={msg.sender.image} alt={msg.sender.name} className="message-avatar" />
                  <div>
                    <span className="sender-name">{msg.sender.name}</span>
                    <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className={msg.sender.id === user.id ? 'message own' : 'message'}>
                  {msg.text && <p>{msg.text}</p>}
                  {msg.image && <img src={msg.image} alt="Yuklangan rasm" className="message-img" />}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT AREA */}
          <div className="input-area">
            {image && <img src={URL.createObjectURL(image)} alt="Tanlangan rasm" className="input-preview-img" />}
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="message-input"
              placeholder="Xabar yozing..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />

            <button type="button" onClick={handleImageIconClick} className="icon-btn">
              {/* rasm ikon */}
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828L17 10.828M7 17H5a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v2m-1 11h2a2 2 0 002-2V9m-7 7v3m4-3v3"
                />
              </svg>
            </button>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="hidden"
              ref={fileInputRef}
            />

            <button onClick={sendMessage} className="send-btn">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>

          {/* SCROLL‑DOWN BUTTON */}
          <button
            className="scroll-to-bottom"
            onClick={scrollToBottom}
            style={{
              display:
                messagesContainerRef.current &&
                messagesContainerRef.current.scrollTop + messagesContainerRef.current.clientHeight <
                  messagesContainerRef.current.scrollHeight - 100
                  ? 'block'
                  : 'none',
            }}
          >
            <svg
              className="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="18 15 12 21 6 15"></polyline>
              <polyline points="18 9 12 15 6 9"></polyline>
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
