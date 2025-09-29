'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadedFile {
  name: string;
  size: number;
  url: string;
}

export default function PDFUploader() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFiles(droppedFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  // Process and upload files
  const handleFiles = async (selectedFiles: File[]) => {
    // Filter only PDF files
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      toast.error('Only PDF files are allowed');
      return;
    }

    if (pdfFiles.length !== selectedFiles.length) {
      toast.warning('Some files were skipped (only PDFs allowed)');
    }

    setUploading(true);

    for (const file of pdfFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        // Replace with your actual upload endpoint
        const response = await fetch('http://localhost:5000/upload-pdf', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          
          const uploadedFile: UploadedFile = {
            name: file.name,
            size: file.size,
            url: result.fileUrl || '#'
          };

          setFiles(prev => [...prev, uploadedFile]);
          
          toast.success(`${file.name} uploaded successfully!`, {
            icon: <CheckCircle className="text-green-500" size={20} />
          });
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
  };

  // Remove uploaded file
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    toast.info('File removed');
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          dragActive
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-gray-600 bg-gray-800/30'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Hidden file input */}
        <input
          type="file"
          multiple
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />

        {/* Upload UI */}
        <div className="pointer-events-none">
          <Upload 
            className={`mx-auto mb-4 ${
              dragActive ? 'text-purple-400' : 'text-gray-400'
            }`} 
            size={48} 
          />
          
          <h3 className="text-lg font-medium text-white mb-2">
            {dragActive ? 'Drop your PDFs here!' : 'Upload PDF Files'}
          </h3>
          
          <p className="text-gray-400 text-sm mb-4">
            Drag and drop your PDF files here, or click to browse
          </p>
          
          <div className="flex justify-center">
            <button
              type="button"
              disabled={uploading}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {uploading ? 'Uploading...' : 'Choose Files'}
            </button>
          </div>
        </div>

        {/* Loading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <div className="flex items-center space-x-2 text-white">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <span>Processing files...</span>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Files List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6"
          >
            <h4 className="text-white font-medium mb-4 flex items-center">
              <FileText className="mr-2" size={20} />
              Uploaded Files ({files.length})
            </h4>
            
            <div className="space-y-2">
              {files.map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 flex items-center justify-between border border-gray-700/50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="text-red-400" size={20} />
                    </div>
                    
                    <div>
                      <p className="text-white font-medium text-sm">{file.name}</p>
                      <p className="text-gray-400 text-xs">{formatFileSize(file.size)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <CheckCircle className="text-green-400" size={20} />
                    <button
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-400 transition-colors p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 flex space-x-4 justify-center"
        >
          <button
            onClick={() => {
              // Navigate to chat with uploaded files
              const fileNames = files.map(f => f.name).join(', ');
              window.location.href = `/learn/chat?prompt=Analyze these uploaded PDFs: ${fileNames}`;
            }}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all hover:scale-105"
          >
            Start Learning with PDFs
          </button>
          
          <button
            onClick={() => setFiles([])}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Clear All
          </button>
        </motion.div>
      )}
    </div>
  );
}
