import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Mic, MicOff, Sparkles } from 'lucide-react';
import { getOpenClawWebSocket } from '@/services/openclawWebSocket';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'aurora';
  timestamp: Date;
}

const proactiveMessages = [
  "💡 Dica: Você sabia que pode arrastar os cards para reorganizar o dashboard?",
  "📊 Relatório: 47 skills executadas na última hora com 100% de sucesso.",
  "🔔 Alerta: Nova integração disponível com o Notion.",
  "⚡ Performance: Latência média de 42ms - dentro do esperado.",
  "🎯 Sugestão: Que tal configurar uma automação para o Telegram?",
];

export function AuroraAvatar() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showProactive, setShowProactive] = useState(false);
  const [proactiveMessage, setProactiveMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const ws = getOpenClawWebSocket();

  // WebSocket connection
  useEffect(() => {
    const unsubConnection = ws.onConnectionChange(setIsConnected);
    const unsubMessage = ws.onMessage((event) => {
      if (event.type === 'notification' && event.metadata?.response) {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: event.metadata!.response,
          sender: 'aurora',
          timestamp: new Date(),
        }]);
      }
    });
    setIsConnected(ws.isConnected());
    return () => { unsubConnection(); unsubMessage(); };
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Proactive messages
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOpen && Math.random() > 0.7) {
        const randomMessage = proactiveMessages[Math.floor(Math.random() * proactiveMessages.length)];
        setProactiveMessage(randomMessage);
        setShowProactive(true);
        setTimeout(() => setShowProactive(false), 5000);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        setMessages([{
          id: '1',
          text: "Olá! Sou a Aurora, sua assistente de IA do cockpit PROMETHEUS. Como posso ajudar você hoje?",
          sender: 'aurora',
          timestamp: new Date(),
        }]);
      }, 500);
    }
  }, [isOpen, messages.length]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputValue;
    setInputValue('');
    setIsTyping(true);

    // Send to WebSocket (OpenClaw Aurora backend)
    if (ws.isConnected()) {
      ws.send({ type: 'chat', id: Date.now().toString(), message: messageText, model: 'ollama' });
    } else {
      // Fallback if not connected
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: '⚠️ Não conectada ao OpenClaw Aurora. Inicie o backend primeiro.',
          sender: 'aurora',
          timestamp: new Date(),
        }]);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Aurora Avatar - Fixed Position */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
      >
        {/* Proactive Message Bubble */}
        <AnimatePresence>
          {showProactive && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              className="absolute bottom-full right-0 mb-4 w-72 p-4 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(20, 30, 60, 0.95) 0%, rgba(10, 15, 40, 0.98) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                boxShadow: '0 0 40px rgba(139, 92, 246, 0.2)',
              }}
            >
              <div className="flex items-start gap-3">
                <Sparkles size={18} className="text-purple-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-white/80">{proactiveMessage}</p>
              </div>
              <div className="absolute -bottom-2 right-8 w-4 h-4 rotate-45"
                style={{
                  background: 'rgba(10, 15, 40, 0.98)',
                  borderRight: '1px solid rgba(139, 92, 246, 0.3)',
                  borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Avatar Button */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-20 h-20 rounded-full overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(34, 211, 238, 0.3) 100%)',
            border: '2px solid rgba(139, 92, 246, 0.5)',
            boxShadow: '0 0 30px rgba(139, 92, 246, 0.4), 0 0 60px rgba(34, 211, 238, 0.2)',
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              '0 0 30px rgba(139, 92, 246, 0.4), 0 0 60px rgba(34, 211, 238, 0.2)',
              '0 0 50px rgba(139, 92, 246, 0.6), 0 0 80px rgba(34, 211, 238, 0.4)',
              '0 0 30px rgba(139, 92, 246, 0.4), 0 0 60px rgba(34, 211, 238, 0.2)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <video
            ref={videoRef}
            src="/assets/aurora-avatar.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Glow ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              border: '2px solid rgba(139, 92, 246, 0.5)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.button>

        {/* Status indicator */}
        <motion.div
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
          style={{
            background: isConnected
              ? 'linear-gradient(135deg, #10b981 0%, #22d3ee 100%)'
              : 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
            border: '2px solid #030308',
          }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-[8px] font-bold text-white">{isConnected ? 'ON' : 'OFF'}</span>
        </motion.div>
      </motion.div>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-32 right-6 w-96 h-[500px] z-50 rounded-3xl overflow-hidden flex flex-col"
            style={{
              background: 'linear-gradient(135deg, rgba(10, 15, 35, 0.98) 0%, rgba(5, 8, 25, 0.99) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              boxShadow: '0 0 60px rgba(139, 92, 246, 0.2), 0 25px 50px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Header */}
            <div 
              className="p-4 flex items-center justify-between"
              style={{
                background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.15) 0%, rgba(34, 211, 238, 0.15) 100%)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-500/50">
                  <video
                    src="/assets/aurora-avatar.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Aurora</h3>
                  <div className="flex items-center gap-1">
                    <motion.div
                      className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`}
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className={`text-xs ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isConnected ? 'Conectada' : 'Desconectada'}
                    </span>
                  </div>
                </div>
              </div>
              <motion.button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={20} className="text-white/60" />
              </motion.button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-purple-600/80 to-cyan-600/80 text-white'
                        : 'bg-white/10 text-white/90'
                    }`}
                    style={{
                      borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
                      borderBottomLeftRadius: msg.sender === 'aurora' ? '4px' : '16px',
                    }}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-[10px] text-white/40 mt-1">
                      {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-white/50"
                >
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-purple-400"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                  <span className="text-xs">Aurora está digitando...</span>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div 
              className="p-4"
              style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
            >
              <div 
                className="flex items-center gap-2 p-2 rounded-2xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <motion.button
                  onClick={() => setIsListening(!isListening)}
                  className={`p-2 rounded-xl ${isListening ? 'bg-red-500/20' : 'hover:bg-white/10'}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {isListening ? (
                    <MicOff size={18} className="text-red-400" />
                  ) : (
                    <Mic size={18} className="text-white/60" />
                  )}
                </motion.button>
                
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
                />
                
                <motion.button
                  onClick={handleSend}
                  className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  disabled={!inputValue.trim()}
                >
                  <Send size={18} className="text-white" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
