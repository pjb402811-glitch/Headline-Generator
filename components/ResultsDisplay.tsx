import type { HeadlineResult } from '../types';
import CopyButton from './CopyButton';

interface ResultsDisplayProps {
  results: HeadlineResult[];
  onReset: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  error: string | null;
}

const ResultsDisplay = ({ results, onReset, onRegenerate, isRegenerating, error }: ResultsDisplayProps) => {
  const totalHeadlines = results.reduce((acc, curr) => acc + curr.headlines.length, 0);

  const handleSaveAsTxt = () => {
    let content = `경영실적 보고서 제목 생성 결과\n\n`;
    content += `========================================\n\n`;

    results.forEach(result => {
      content += `[${result.type}]\n\n`;
      result.headlines.forEach((headline, index) => {
        content += `${index + 1}. ${headline.title}\n`;
        content += `   - 전략: ${headline.strategy}\n\n`;
      });
      content += `========================================\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'headline_results.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-12">
      <div className="text-center">
         <h2 className="text-2xl sm:text-3xl font-bold text-white">AI 생성 제목 결과</h2>
         <p className="mt-2 text-lg text-gray-400">15가지 유형별로 총 {totalHeadlines}개의 제목이 생성되었습니다.</p>
      </div>

      <div className="space-y-8">
        {results.map((result, index) => (
          <div key={index} className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
            <h3 className="text-xl font-bold text-blue-400 mb-4">{result.type}</h3>
            <ul className="space-y-4">
              {result.headlines.map((headline, headlineIndex) => (
                <li key={headlineIndex} className="p-4 bg-gray-700/50 rounded-md border border-gray-600">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-gray-100">{headline.title}</p>
                    <CopyButton textToCopy={headline.title} />
                  </div>
                  <p className="mt-2 text-sm text-gray-400 pl-1">
                    <span className="font-semibold text-gray-300">전략:</span> {headline.strategy}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      
      {error && (
        <div className="my-4 p-4 bg-red-900/50 border border-red-700 text-red-200 rounded-md text-center">
            <p><strong>오류:</strong> {error}</p>
        </div>
      )}

      <div className="text-center mt-12 flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4">
        <button
          onClick={handleSaveAsTxt}
          className="w-full sm:w-auto px-8 py-3 bg-gray-500 text-white font-bold rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-transform transform hover:scale-105"
        >
          결과를 TXT로 저장
        </button>
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="w-full sm:w-auto px-8 py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isRegenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>생성 중...</span>
            </>
          ) : (
            '결과 내 재검색 (추가 생성)'
          )}
        </button>
        <button
          onClick={onReset}
          disabled={isRegenerating}
          className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105 disabled:bg-gray-600"
        >
          처음부터 새로 만들기
        </button>
      </div>
    </div>
  );
};

export default ResultsDisplay;