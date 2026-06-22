'use client';
import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

interface Message {
  id: number;
  sender: 'USER' | 'ADMIN';
  body: string;
  isRead: boolean;
  createdAt: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = () =>
    api.get('/messages').then(r => {
      setMessages(r.data.data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }).catch(() => {});

  useEffect(() => {
    fetchMessages();
    const iv = setInterval(fetchMessages, 10000);
    return () => clearInterval(iv);
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await api.post('/messages', { body });
      setBody('');
      fetchMessages();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      <h2 className="text-2xl font-bold text-white mb-2">💬 Messages</h2>
      <p className="text-slate-400 mb-4 text-sm">Chat with the Crypto Bank support team.</p>

      <div className="flex-1 bg-slate-800 rounded-xl overflow-y-auto p-4 space-y-3 mb-4">
        {messages.length === 0 && (
          <p className="text-slate-500 text-center text-sm mt-8">No messages yet. Send us a message!</p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
              msg.sender === 'USER'
                ? 'bg-purple-600 text-white rounded-br-sm'
                : 'bg-slate-700 text-slate-200 rounded-bl-sm'
            }`}>
              <p>{msg.body}</p>
              <p className="text-xs mt-1 opacity-60">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-3">
        <input
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
        />
        <button type="submit" disabled={sending || !body.trim()}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl transition-colors">
          Send
        </button>
      </form>
    </div>
  );
}
