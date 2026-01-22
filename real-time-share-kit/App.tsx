
import React, { useState } from 'react';
import { ShareKit } from './components/ShareKit';
import { Monitor, MousePointer2, Type, Layout, Share2, Users } from 'lucide-react';

const SharedCanvas = () => {
  // Application local state
  const [appData, setAppData] = useState({
    text: "Welcome to the real-time shared workspace!",
    color: "#4f46e5",
  });

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAppData(prev => ({ ...prev, text: e.target.value }));
  };

  const handleColorChange = (color: string) => {
    setAppData(prev => ({ ...prev, color }));
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6">
      {/* 
        MINIMAL INTEGRATION: 
        Just drop the ShareKit component and pass your state.
        It handles the PeerJS logic, the Share button UI, and the 2-way sync.
      */}
      <ShareKit 
        data={appData} 
        onDataChange={setAppData} 
        appName="Shared Note" 
      />

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <Monitor size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Shared Note Demo</h2>
              <p className="text-xs text-gray-500">Auto-syncs via PeerJS</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-6 flex gap-4">
             {['#4f46e5', '#ef4444', '#10b981', '#f59e0b', '#000000'].map(c => (
               <button
                 key={c}
                 onClick={() => handleColorChange(c)}
                 className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${appData.color === c ? 'border-gray-400 scale-110' : 'border-transparent'}`}
                 style={{ backgroundColor: c }}
               />
             ))}
          </div>

          <div className="relative">
            <textarea
              value={appData.text}
              onChange={handleTextChange}
              className="w-full h-64 p-6 rounded-xl border-2 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-lg font-medium leading-relaxed bg-white border-indigo-50 focus:border-indigo-200"
              style={{ color: appData.color }}
              placeholder="Start typing to sync..."
            />
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t flex gap-8 overflow-x-auto whitespace-nowrap">
           <div className="flex items-center gap-2 text-sm text-gray-600">
              <MousePointer2 size={16} className="text-gray-400" />
              <span>Direct P2P Link</span>
           </div>
           <div className="flex items-center gap-2 text-sm text-gray-600">
              <Type size={16} className="text-gray-400" />
              <span>Zero-Server Architecture</span>
           </div>
           <div className="flex items-center gap-2 text-sm text-gray-600">
              <Layout size={16} className="text-gray-400" />
              <span>Pluggable UI</span>
           </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard 
          icon={<Share2 size={20} className="text-indigo-600"/>} 
          title="Easy Sharing" 
          desc="Just click the button to get a link. No accounts required." 
        />
        <FeatureCard 
          icon={<Monitor size={20} className="text-blue-600"/>} 
          title="P2P WebRTC" 
          desc="Low latency connections directly between browsers." 
        />
        <FeatureCard 
          icon={<Users size={20} className="text-green-600"/>} 
          title="Real-time Demo" 
          desc="Open the link in another tab or send it to a friend." 
        />
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="mb-3">{icon}</div>
    <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
  </div>
);

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Share2 className="text-white" size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight italic">ShareKit<span className="text-indigo-600">.</span></span>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded uppercase">SDK v1.1</span>
            <a href="#" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">Github</a>
        </div>
      </header>

      <SharedCanvas />
    </div>
  );
};

export default App;
