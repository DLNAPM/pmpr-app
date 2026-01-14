import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { GoogleGenAI } from "@google/genai";
import { PlayIcon, ArrowTopRightOnSquareIcon, VideoCameraIcon } from './Icons';

// Add PlayIcon and VideoCameraIcon to Icons.tsx or declare here if needed
// Assuming they will be added to Icons.tsx

interface HelpSectionProps {
  title: string;
  children: React.ReactNode;
}

const HelpSection: React.FC<HelpSectionProps> = ({ title, children }) => (
  <div>
    <h3 className="text-lg font-semibold text-blue-800 mb-2">{title}</h3>
    <div className="space-y-2 text-gray-700">{children}</div>
  </div>
);

// Global types for Veo API
// Fix: Use the expected AIStudio type name and match Window property modifiers to avoid declaration conflicts.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio: AIStudio;
  }
}

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Preparing video generator...");

  const loadingMessages = [
    "Analyzing property management workflows...",
    "Designing 3D dashboard animations...",
    "Rendering real-time financial charts...",
    "Generating digital wallet visualizations...",
    "Compiling cinematic presentation...",
    "Finalizing promotional tutorial..."
  ];

  useEffect(() => {
    let interval: any;
    if (isVideoLoading) {
      let idx = 0;
      interval = setInterval(() => {
        setLoadingMessage(loadingMessages[idx % loadingMessages.length]);
        idx++;
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isVideoLoading]);

  const handleWatchPromo = async () => {
    try {
      // Step 1: Check/Select API Key (Mandatory for Veo)
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        // Proceeding assuming selection was successful per race condition rules
      }

      setIsVideoLoading(true);
      setLoadingMessage("Connecting to Veo video engine...");

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Step 2: Trigger Video Generation
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: 'A sleek, professional 3D animation of a modern real estate property management dashboard. Financial graphs grow upwards, 3D building models float elegantly, and gold coins move into a sleek digital wallet. Cinematic lighting, 4k, professional motion graphics aesthetic.',
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '16:9'
        }
      });

      // Step 3: Polling for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const fetchUrl = `${downloadLink}&key=${process.env.API_KEY}`;
        setVideoUrl(fetchUrl);
      } else {
        throw new Error("Video generation failed.");
      }
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("entity was not found")) {
        alert("Project not found. Please select a valid paid project key.");
        await window.aistudio.openSelectKey();
      } else {
        alert("Generation failed. Please ensure you have a valid paid API key selected.");
      }
    } finally {
      setIsVideoLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="About PMPR App">
      <div className="space-y-6">
        
        {/* PROMOTIONAL VIDEO SECTION */}
        <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800">
          {!videoUrl && !isVideoLoading ? (
            <div className="relative aspect-video flex flex-col items-center justify-center bg-slate-800 group cursor-pointer" onClick={handleWatchPromo}>
               <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
               <div className="z-10 bg-blue-600 p-6 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300">
                 <PlayIcon className="w-10 h-10 text-white fill-current" />
               </div>
               <div className="z-10 mt-6 text-center">
                  <p className="text-white font-bold text-xl uppercase tracking-tighter">Watch Promotional Presentation</p>
                  <p className="text-slate-400 text-sm font-medium mt-1">Generated by Google Veo 3.1 AI</p>
               </div>
               <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-white/10 backdrop-blur px-2.5 py-1 rounded-md">
                 <VideoCameraIcon className="w-3.5 h-3.5 text-blue-400" />
                 <span className="text-[10px] text-white font-bold tracking-widest uppercase">4K Cinematic</span>
               </div>
            </div>
          ) : isVideoLoading ? (
            <div className="aspect-video flex flex-col items-center justify-center p-12 text-center bg-slate-900">
               <div className="relative w-20 h-20">
                  <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
               </div>
               <h4 className="text-white font-bold text-lg mt-8">{loadingMessage}</h4>
               <p className="text-slate-500 text-xs mt-3 max-w-xs leading-relaxed">
                 Generative video takes about 1-2 minutes to render. This presentation is created dynamically using Google AI.
               </p>
            </div>
          ) : (
            <div className="relative group">
              <video 
                src={videoUrl!} 
                controls 
                autoPlay 
                className="w-full aspect-video"
              />
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <a 
                  href={videoUrl!} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur text-white text-xs font-bold rounded-lg hover:bg-black/80 transition-all border border-white/20"
                  title="Enlarge & Open Outside App"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  <span>Enlarge Video</span>
                </a>
              </div>
            </div>
          )}
        </div>

        <HelpSection title="What is this App?">
          <p>
            The Property Management Payment Recording (PMPR) App is a comprehensive tool designed to help landlords and property managers
            easily track properties, tenants, monthly payments, and repair requests with powerful analytics and collaboration features.
          </p>
        </HelpSection>

        <HelpSection title="Core Features">
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Dashboard:</strong> Get a quick overview of your all-time finances, monthly collection rates, property health scores, and quick actions to add new data.
            </li>
            <li>
              <strong>Properties:</strong> Add and manage properties with multiple tenants, track lease information, and specify which utilities to monitor.
            </li>
            <li>
              <strong>Payments:</strong> Record monthly payments for rent and utilities with detailed notes. Export professional PDF or Excel reports per property.
            </li>
            <li>
              <strong>Repairs:</strong> Log maintenance requests, track their status and cost, and assign contractors.
            </li>
             <li>
              <strong>Contractors:</strong> Maintain a detailed database of your trusted contractors for easy assignment to repair jobs. Import and export your list.
            </li>
            <li>
              <strong>Reporting:</strong> A powerful tool to filter and view all your financial data. Search by date, property, or type, and use the reconcile tool to clean up duplicates.
            </li>
             <li>
              <strong>Notifications:</strong> A built-in messaging system. New users can request access from their landlord, and owners receive alerts for these requests.
            </li>
          </ul>
        </HelpSection>

        <HelpSection title="Collaboration & Sharing (For Google Users)">
            <p>
                <strong>For Property Owners:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Click the "Share" icon in the header to open the sharing menu.</li>
                <li>Select one or more properties you wish to share.</li>
                <li>Enter the Google email of the person you want to share with and grant them read-only access.</li>
            </ul>
             <p className="mt-2">
                <strong>For Viewers (Shared Users):</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 pl-4">
                <li>When you log in, your view will seamlessly include both your own properties and any properties shared with you.</li>
                <li>Shared properties will be clearly marked in <strong>Read-Only</strong> mode.</li>
            </ul>
        </HelpSection>

        <HelpSection title="Guest vs. Google Sign-In">
          <p>
            <strong>Continue as Guest:</strong> Data is saved locally in your browser.
          </p>
          <p>
            <strong>Sign in with Google:</strong> Data is saved securely in the cloud. Access your properties from any device and enable sharing features.
          </p>
        </HelpSection>

        <div className="pt-4 text-center">
            <button onClick={onClose} className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                Got it!
            </button>
        </div>
      </div>
    </Modal>
  );
};

export default HelpModal;