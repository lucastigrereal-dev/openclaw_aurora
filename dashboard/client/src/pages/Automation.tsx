import { motion } from 'framer-motion';
import { MessageCircle, Send, Paperclip, Mic } from 'lucide-react';
import { useState } from 'react';

export default function Automation() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Olá! Sou o KRONOS. Como posso ajudar?' },
    { role: 'user', text: 'Cria um fluxo para follow-up pós-procedimento' },
    { role: 'assistant', text: 'Entendi. Vou criar um fluxo automático que...' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { role: 'user', text: input }]);
      setInput('');
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'Processando sua solicitação...' },
        ]);
      }, 500);
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-200px)] flex flex-col">
      {/* Chat */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-lg p-6 neon-border flex-1 overflow-y-auto"
      >
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-foreground'
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-lg p-4 neon-border"
      >
        <div className="flex gap-3">
          <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <Paperclip size={20} />
          </button>
          <input
            type="text"
            placeholder="Descreva a automação desejada..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-transparent outline-none"
          />
          <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <Mic size={20} />
          </button>
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
