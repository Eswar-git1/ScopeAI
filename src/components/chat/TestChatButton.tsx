"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

// SIMPLE TEST VERSION - This should ALWAYS show
export function TestChatButton() {
  const [clicked, setClicked] = useState(false);

  console.log("🧪 TestChatButton rendered!");

  return (
    <>
      <button
        onClick={() => {
          setClicked(!clicked);
          console.log("✅ Chat button clicked!");
          alert("Chat button works! FloatingChatPanel will go here.");
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-[9999]"
        style={{ position: "fixed", zIndex: 9999 }}
      >
        <Sparkles className="w-6 h-6 text-white" />
      </button>

      {clicked && (
        <div className="fixed bottom-24 right-6 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 z-[9999]">
          <p className="text-sm">✅ Chat component is working!</p>
          <p className="text-xs text-gray-500 mt-2">
            Now we just need to connect the real chat.
          </p>
        </div>
      )}
    </>
  );
}
