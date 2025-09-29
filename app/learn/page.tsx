"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Upload, Loader2, Sparkles, FileText, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Navbar from "@/components/custom/navbar";
import { UploadClient } from "@uploadcare/upload-client";
import { useRouter } from "next/navigation";
import PDFUploader from '../components/PDFUploader'; 


const client = new UploadClient({
  publicKey: process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY!,
});

const fadeInUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.7,
    ease: [0.22, 1, 0.36, 1],
  },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.98 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

type RecentChat = {
  id: number;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  color: string;
  progress: number;
};

const RECENT_COLORS = [
  "from-purple-600/5 to-blue-600/5",
  "from-blue-600/5 to-cyan-600/5",
  "from-green-600/5 to-emerald-600/5",
];
const RECENT_ICONS = ["🧠", "⚛️", "📈"];

function getTimeAgo(ts: number) {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60 * 1000) return "just now";
  if (diff < 3600 * 1000) return `${Math.floor(diff / (60 * 1000))} min ago`;
  if (diff < 24 * 3600 * 1000) return `${Math.floor(diff / (3600 * 1000))} hour ago`;
  return `${Math.floor(diff / (24 * 3600 * 1000))} days ago`;
}

export default function UploadModule() {
  const router = useRouter();
  const [showAllConversations, setShowAllConversations] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; url: string }[]
  >([]);

  // --- Recent Chat State ---
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);

  useEffect(() => {
    const LOCALSTORAGE_KEY = "tayyari-chat-messages-v2";
    function extractRecentChats(): RecentChat[] {
      try {
        const raw = localStorage.getItem(LOCALSTORAGE_KEY);
        if (!raw) return [];
        const messages = JSON.parse(raw) as any[];
        const pairs: { user: any; ai: any }[] = [];
        let i = 0;
        while (i < messages.length) {
          if (messages[i].sender === "user") {
            const userMsg = messages[i];
            const aiMsg = messages[i + 1] && messages[i + 1].sender === "ai" ? messages[i + 1] : null;
            pairs.push({ user: userMsg, ai: aiMsg });
            i += aiMsg ? 2 : 1;
          } else {
            i++;
          }
        }
        return pairs
          .slice(-3)
          .reverse()
          .map((pair, idx) => {
            const title =
              pair.user.content?.substring(0, 48) +
              (pair.user.content.length > 48 ? "..." : "");
            let description = "";
            if (pair.ai?.content) {
              const headingMatch = pair.ai.content.match(/(?:^|\n)##\s*(.*)/);
              if (headingMatch) {
                description = headingMatch[1];
              } else {
                description =
                  pair.ai.content
                    .replace(/[#>*_\-\n]/g, " ")
                    .substring(0, 60) + "...";
              }
            }
            const timestamp = getTimeAgo(pair.user.id);
            return {
              id: pair.user.id,
              title: title || "Untitled",
              description: description || "No summary available",
              timestamp,
              icon: RECENT_ICONS[idx % RECENT_ICONS.length],
              color: RECENT_COLORS[idx % RECENT_COLORS.length],
              progress: 100,
            };
          });
      } catch {
        return [];
      }
    }
    setRecentChats(extractRecentChats());
    const onStorage = () => setRecentChats(extractRecentChats());
    window.addEventListener("storage", onStorage);
    const interval = setInterval(() => setRecentChats(extractRecentChats()), 2000);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showAllConversations) {
        setShowAllConversations(false);
      }
    };
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [showAllConversations]);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const hasValidFile = Array.from(e.dataTransfer.items).some(
      (item) =>
        item.type === "application/pdf" ||
        (item.kind === "file" && item.type.includes("pdf"))
    );
    setIsDragging(hasValidFile);
    if (!hasValidFile) {
      e.dataTransfer.dropEffect = "none";
    }
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  };

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await handleFiles(files);
    }
  };

  const validateFiles = (files: File[]) => {
    const validFiles: File[] = [];
    const invalidFiles: File[] = [];
    files.forEach(file => {
      if (file.type === "application/pdf") {
        validFiles.push(file);
      } else {
        invalidFiles.push(file);
      }
    });
    return { validFiles, invalidFiles };
  };

  const handleFiles = async (files: File[]) => {
    const { validFiles, invalidFiles } = validateFiles(files);
    if (invalidFiles.length > 0) {
      toast.error("Only PDF files are allowed");
      return;
    }
    if (validFiles.length === 0) {
      return;
    }
    setUploading(true);
    setProgress(0);
    const uploadedData: { name: string; url: string }[] = [];
    for (const file of files) {
      try {
        const { cdnUrl } = await client.uploadFile(file);
        uploadedData.push({ name: file.name, url: cdnUrl });
        toast.success(`${file.name} uploaded successfully`, {
          icon: <Sparkles className="w-4 h-4" />,
        });
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setUploadedFiles((prev) => [...prev, ...uploadedData]);
    setUploading(false);
    setProgress(0);
  };

  const handleSubmit = async () => {
    if (!notes.trim() && uploadedFiles.length === 0) {
      toast.error("Please add some notes or upload content");
      return;
    }
    if (notes.trim()) {
      router.push(`/learn/chat?prompt=${encodeURIComponent(notes.trim())}`);
    } else {
      router.push("/learn/chat");
    }
    setUploading(true);
    setProgress(0);
    try {
      const payload = {
        notes: notes,
        files: uploadedFiles.map((file) => file.url),
      };
      localStorage.setItem("chatPayload", JSON.stringify(payload));
      await fetch("http://127.0.0.1:5000/process-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Error details:", error);
    }
    setUploading(false);
    setProgress(0);
    setNotes("");
  };

  return (
    <>
      <Navbar loggedIn={true} />

      {/* <AnimatePresence> */}
         {showAllConversations && (
  <div 
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={() => setShowAllConversations(false)}
  >
    <div 
      className="bg-gray-900 rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto border border-gray-700"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">All Conversations</h2>
        <button
          onClick={() => setShowAllConversations(false)}
          className="text-gray-400 hover:text-white text-2xl"
        >
          ×
        </button>
      </div>

      {recentChats.length === 0 && (
        <p className="text-center text-gray-400 py-8">No conversations yet.</p>
      )}

      <div className="space-y-4">
        {recentChats.map((conv) => (
  <div 
    key={conv.id} 
    className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500/50 transition-colors cursor-pointer group"
    onClick={() => {
      const prompt = conv.title.replace('...', '');
      setShowAllConversations(false);
      router.push(`/learn/chat?prompt=${encodeURIComponent(prompt)}`);
    }}
  >
            <div className="flex items-start space-x-3">
              <div className="text-2xl group-hover:scale-110 transition-transform">{conv.icon}</div>
              <div className="flex-1">
                <h3 className="text-white font-semibold group-hover:text-purple-300 transition-colors">
                  {conv.title}
                </h3>
                <p className="text-sm text-gray-400 mt-1">{conv.timestamp}</p>
                <p className="text-gray-300 text-sm mt-2">{conv.description}</p>
                
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{conv.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full group-hover:from-purple-400 group-hover:to-blue-400 transition-colors" 
                      style={{ width: `${conv.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}

      {/* Main Content */}
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pt-24">
        <div className="container mx-auto px-4 py-8 pt-30">
          {/* Title Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              What would you like to{" "}
              <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                learn?
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              For example: &#39;Explain quantum computing basics&#39; or &#39;Help me understand machine learning concepts&#39;
            </p>
          </div>

          {/* Input Section */}
          <div className="max-w-4xl mx-auto mb-8">
            <div
              className={`relative border-2 border-dashed rounded-2xl p-8 transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-gray-600 hover:border-gray-500"
              }`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ask me anything or describe what you want to learn..."
                className="w-full bg-transparent text-white placeholder-gray-400 text-lg resize-none focus:outline-none min-h-[120px]"
                rows={4}
              />

              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20 rounded-2xl">
                  <p className="text-blue-400 font-semibold text-xl">Drop your files here</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <label className="flex-1">
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={onFileSelect}
                  className="hidden"
                />
                <PDFUploader />

              </label>

              <button
                onClick={handleSubmit}
                disabled={uploading || (!notes.trim() && uploadedFiles.length === 0)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-3 px-6 rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>Let&#39;s explore</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="max-w-4xl mx-auto mb-8">
              <h3 className="text-lg font-semibold mb-4 text-white">Uploaded Files:</h3>
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center space-x-3 bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <FileText className="text-blue-400" size={20} />
                    <span className="text-gray-300">{file.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Learning Section */}
          {recentChats.length > 0 && (
  <div className="max-w-4xl mx-auto mb-8">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-white">Recent Learning</h2>
      <button
        onClick={() => setShowAllConversations(true)}
        className="text-purple-400 hover:text-purple-300 transition-colors"
      >
        View All
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {recentChats.map((conv) => (
  <motion.div 
    key={conv.id}
    className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50 hover:border-purple-500/50 transition-colors cursor-pointer group"
    onClick={() => {
      // Navigate to chat with the original prompt
      const prompt = conv.title.replace('...', ''); // Remove truncation
      router.push(`/learn/chat?prompt=${encodeURIComponent(prompt)}`);
    }}
    whileHover={{ y: -2, scale: 1.02 }}
    transition={{ duration: 0.2 }}
        >
          <div className="flex items-start space-x-3">
            <div className="text-2xl group-hover:scale-110 transition-transform">
              {conv.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold truncate group-hover:text-purple-300 transition-colors">
                {conv.title}
              </h3>
              <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                {conv.timestamp}
              </p>
              <p className="text-xs text-gray-500 mt-1 group-hover:text-purple-400 transition-colors">
  Click to continue learning →
</p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-3">
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-1 rounded-full group-hover:from-purple-400 group-hover:to-blue-400 transition-colors" 
                style={{ width: `${conv.progress}%` }}
              ></div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
)}

<div className="max-w-4xl mx-auto mt-8 mb-6 relative z-10">
  <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
    <div className="flex justify-between items-center mb-3">
      <span className="text-sm font-medium text-slate-300">Learning Progress</span>
      <span className="text-sm font-medium text-purple-400">Level 1 - 45%</span>
    </div>
    
    {/* Professional Progress Bar */}
    <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
      <div 
        className="h-3 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full transition-all duration-500 ease-out relative"
        style={{ width: '45%' }}
      >
        {/* Animated shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
      </div>
    </div>
    
    {/* Progress Details */}
    <div className="mt-3 flex justify-between text-xs text-slate-400">
      <span>45 XP earned</span>
      <span>55 XP to Level 2</span>
    </div>
  </div>
</div>
        </div>
      </div>
    </>
  );
}