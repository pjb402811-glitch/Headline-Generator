// FIX: Imported KeyboardEvent from 'react' to fix a TypeScript error.
import { useState, useEffect, KeyboardEvent } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  currentApiKey: string;
}

const ApiKeyModal = ({ isOpen, onClose, onSave, currentApiKey }: ApiKeyModalProps) => {
  const [key, setKey] = useState(currentApiKey);

  useEffect(() => {
    setKey(currentApiKey);
  }, [currentApiKey]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave(key);
    onClose();
  };
  
  // FIX: Used KeyboardEvent type for the event to fix a TypeScript error.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-700 relative"
        onClick={e => e.stopPropagation()} // Prevent closing modal when clicking inside
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Google AI API Key 설정</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-center text-red-400 font-semibold">
            이 앱을 사용하려면 Google AI API Key가 필요합니다.<br/>아래에 입력해주세요
          </p>

          <div>
            <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-300 mb-2">
              Google AI API Key 입력
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L4.257 19.743A1 1 0 012.843 18.33l6.02-6.02A6 6 0 0118 8zm-6-3a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                id="api-key-input"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="***************************************"
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="API Key Input"
                autoFocus
              />
            </div>
            <p className="mt-2 text-xs text-gray-400">
              API Key는 브라우저에만 저장되며, 외부로 전송되지 않습니다.
            </p>
          </div>

          <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
            <h3 className="text-md font-bold text-white mb-3">Google AI API Key 발급방법</h3>
            <ol className="list-decimal list-inside text-gray-300 text-sm space-y-2">
              <li>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a> 페이지로 이동하여 로그인합니다.
              </li>
              <li>'Get API Key' 버튼을 클릭합니다.</li>
              <li>생성된 API Key를 복사합니다.</li>
              <li>복사한 Key를 위 입력창에 붙여넣고 'Key 저장' 버튼을 누릅니다.</li>
            </ol>
          </div>
          
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 rounded-md text-white bg-blue-600 hover:bg-blue-700 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
          >
            Key 저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;