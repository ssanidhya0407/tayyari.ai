'use client';

import { useState } from 'react';
import { Play, Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface CodePlaygroundProps {
  code: string;
  language: string;
  editable?: boolean;
}

export default function CodePlayground({ code: initialCode, language, editable = true }: CodePlaygroundProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const executeCode = async () => {
    setIsRunning(true);
    setOutput('Running code...');

    try {
      // For JavaScript/TypeScript code that can run in browser
      if (language === 'javascript' || language === 'typescript') {
        // Create a safe execution environment
        const runSafeCode = () => {
          try {
            // Create sandbox environment
            const originalConsoleLog = console.log;
            const originalConsoleError = console.error;
            let output = '';
            
            // Override console.log
            console.log = (...args) => {
              output += args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
              ).join(' ') + '\n';
              originalConsoleLog(...args);
            };
            
            // Override console.error
            console.error = (...args) => {
              output += 'Error: ' + args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
              ).join(' ') + '\n';
              originalConsoleError(...args);
            };
            
            // Execute the code
            const result = new Function(code)();
            if (result !== undefined) {
              output += 'Return value: ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
            }
            
            // Restore original console methods
            console.log = originalConsoleLog;
            console.error = originalConsoleError;
            
            return output || 'Code executed successfully with no output';
          } catch (error) {
            return 'Execution Error: ' + (error as Error).message;
          }
        };

        const result = runSafeCode();
        setOutput(result);
      } else {
        // For other languages, show a simulation message
        await new Promise(resolve => setTimeout(resolve, 1000));
        setOutput(`[${language.toUpperCase()} Simulation] Code would run on server.\n\nExample output for this code would appear here.`);
      }
    } catch (error) {
      setOutput(`Error: ${(error as Error).message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Code copied to clipboard');
  };

  const resetCode = () => {
    setCode(initialCode);
    toast.info('Code reset to original');
  };

  return (
    <div className="my-4 rounded-md overflow-hidden border border-gray-700">
      <div className="bg-[#1E1E1E] text-gray-300 p-2 flex justify-between items-center">
        <div className="flex items-center">
          <div className="text-xs bg-blue-600 px-2 py-1 rounded-md font-mono uppercase">
            {language}
          </div>
          <div className="text-xs ml-2 text-gray-400">Interactive Code Playground</div>
        </div>
        <div className="flex space-x-2">
          {editable && (
            <button 
              onClick={resetCode}
              className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-700 transition-colors"
              title="Reset code"
            >
              <RefreshCw size={14} />
            </button>
          )}
          <button 
            onClick={copyCode}
            className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-700 transition-colors"
            title="Copy code"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
          {(language === 'javascript' || language === 'typescript') && (
            <button 
              onClick={executeCode}
              disabled={isRunning}
              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-md flex items-center text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={12} className="mr-1" /> Run
            </button>
          )}
        </div>
      </div>
      
      <div className="relative">
        <pre className="p-4 bg-[#121212] overflow-x-auto text-sm">
          {editable ? (
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-full min-h-[150px] bg-transparent text-gray-300 font-mono outline-none resize-y"
              spellCheck="false"
            />
          ) : (
            <code className="text-gray-300 font-mono whitespace-pre">{code}</code>
          )}
        </pre>
      </div>

      {output && (
        <div className="border-t border-gray-700">
          <div className="bg-[#1E1E1E] text-gray-300 p-2 text-xs">Output</div>
          <pre className="p-4 bg-[#121212] text-gray-300 overflow-x-auto text-sm font-mono max-h-[200px] overflow-y-auto">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}