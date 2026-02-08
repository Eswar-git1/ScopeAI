"use client";

import { motion } from "framer-motion";
import { User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  message: {
    role: "user" | "assistant";
    content: string;
    sources?: any[];
  };
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-purple-600"
            : "bg-gradient-to-br from-purple-600 to-blue-600"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>
      <div
        className={`flex-1 px-4 py-3 rounded-2xl ${
          isUser
            ? "bg-purple-600 text-white"
            : "bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}
