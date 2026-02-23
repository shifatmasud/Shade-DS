/// <reference types="vite/client" />
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import { GoogleGenAI, Type } from "@google/genai";
import { MetaButtonProps } from '../../types/index.tsx';
import { PaperPlaneTilt, Robot, User, X, Copy, Check } from 'phosphor-react';
import CustomScrollbar from '../Core/CustomScrollbar.tsx';

const coreComponents = import.meta.glob('../Core/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const packageComponents = import.meta.glob('../Package/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const themeFile = import.meta.glob('../../Theme.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const typesFile = import.meta.glob('../../types/index.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

let contextString = "Design Tokens & Theme Code:\n";
for (const path in themeFile) {
  contextString += themeFile[path] + "\n\n";
}
contextString += "Types:\n";
for (const path in typesFile) {
  contextString += typesFile[path] + "\n\n";
}
contextString += "Core Components Code:\n";
for (const path in coreComponents) {
  contextString += `--- ${path} ---\n${coreComponents[path]}\n\n`;
}
contextString += "Package Components Code:\n";
for (const path in packageComponents) {
  contextString += `--- ${path} ---\n${packageComponents[path]}\n\n`;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface AIPanelProps {
  appState: MetaButtonProps;
  onUpdateState: (updates: Partial<MetaButtonProps>) => void;
  apiKey: string;
}

const AIPanel: React.FC<AIPanelProps> = ({ appState, onUpdateState, apiKey }) => {
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hello! I'm your AI agent. I can help you evolve this prototype. I have access to the internal state and can even generate custom components. What's on your mind?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      if (!apiKey) {
        setMessages(prev => [...prev, { role: 'model', text: "Please set your Gemini API key in the Control Panel's Agent section." }]);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const updateStateFunctionDeclaration = {
        name: "updateAppState",
        parameters: {
          type: Type.OBJECT,
          description: "Update the application state properties.",
          properties: {
            componentType: { type: Type.STRING, enum: ['button', 'card', 'custom'], description: "The type of component to render." },
            label: { type: Type.STRING, description: "The label or title of the component." },
            variant: { type: Type.STRING, description: "The variant (primary, secondary, tertiary, outline)." },
            size: { type: Type.STRING, description: "The size (S, M, L)." },
            icon: { type: Type.STRING, description: "The Phosphor icon name." },
            customRadius: { type: Type.STRING, description: "The corner radius (e.g., '20px')." },
            customFill: { type: Type.STRING, description: "The background color hex code." },
            customColor: { type: Type.STRING, description: "The text color hex code." },
            customCode: { type: Type.STRING, description: "React/JSX code for a custom component. Only use when componentType is 'custom'." },
            disabled: { type: Type.BOOLEAN, description: "Whether the component is disabled." },
          },
        },
      };

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: `Current App State (Internal Code): ${JSON.stringify(appState, null, 2)}` }] },
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: `You are a world-class senior design engineer agent. You can read and write the application internal state. Use the updateAppState tool to change component properties or create entirely new components using 'customCode'. When using 'customCode', provide a valid React component body or JSX. Be extremely concise and minimalist. Your goal is to make the prototype feel alive and high-fidelity.\n\n**IMPORTANT**: You MUST use the design tokens and component structure from the provided context. Do not invent new styles. Always provide a chat response to the user explaining the changes you've made. Your tone should be helpful, encouraging, and a little playful. You are a design partner, not just a tool.\n\nHere is the codebase context you can use to generate components:\n${contextString}`,
          tools: [{ functionDeclarations: [updateStateFunctionDeclaration] }],
        },
      });

      const functionCalls = response.functionCalls;
      let stateUpdateMessage = "State updated successfully.";
      if (functionCalls) {
        for (const call of functionCalls) {
          if (call.name === 'updateAppState') {
            onUpdateState(call.args as Partial<MetaButtonProps>);
            stateUpdateMessage = `Updated state: ${Object.entries(call.args).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
          }
        }
      }

      const chatResponse = response.text ? response.text.trim() : '';
      if (chatResponse) {
        setMessages(prev => [...prev, { role: 'model', text: chatResponse }]);
      } else if (functionCalls) {
        setMessages(prev => [...prev, { role: 'model', text: stateUpdateMessage }]);
      }
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <CustomScrollbar>
          <div
            ref={scrollRef}
            style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: '4px',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: theme.Color.Base.Content[3],
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                }}>
                  {msg.role === 'user' ? <><User size={10} /> You</> : <><Robot size={10} /> Agent</>}
                </div>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  backgroundColor: msg.role === 'user' ? theme.Color.Base.Surface[3] : theme.Color.Base.Surface[2],
                  color: theme.Color.Base.Content[1],
                  fontSize: '12px',
                  lineHeight: '1.4',
                  maxWidth: '90%',
                  position: 'relative',
                  userSelect: 'text',
                }}>
                  {msg.text}
                </div>
                <button
                  onClick={() => handleCopy(msg.text, i)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: theme.Color.Base.Content[3],
                    opacity: 0.5,
                    padding: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '10px',
                    marginTop: '-2px',
                  }}
                >
                  {copiedIndex === i ? <><Check size={10} color={theme.Color.Success.Content[1]} /> Copied</> : <><Copy size={10} /> Copy</>}
                </button>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', gap: '6px', padding: '4px' }}>
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: theme.Color.Base.Content[3] }} />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: theme.Color.Base.Content[3] }} />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: theme.Color.Base.Content[3] }} />
              </div>
            )}
          </div>
        </CustomScrollbar>
      </div>

      {/* Input */}
      <div style={{
        padding: '12px',
        borderTop: `1px solid ${theme.Color.Base.Surface[3]}`,
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
      }}>
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Evolve prototype..."
          style={{
            flex: 1,
            backgroundColor: theme.Color.Base.Surface[2],
            border: `1px solid ${theme.Color.Base.Surface[3]}`,
            borderRadius: '10px',
            padding: '8px 12px',
            color: theme.Color.Base.Content[1],
            fontSize: '12px',
            outline: 'none',
            resize: 'none',
            maxHeight: '150px',
            lineHeight: '1.4',
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            backgroundColor: theme.Color.Base.Content[1],
            color: theme.Color.Base.Surface[1],
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isLoading || !input.trim() ? 0.5 : 1,
            flexShrink: 0,
            marginBottom: '2px',
          }}
        >
          <PaperPlaneTilt size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
};

export default AIPanel;
