import { useState, useCallback, useEffect, ChangeEvent, FormEvent } from 'react';
import type { UserInput, HeadlineResult, AppView } from './types';
import {
  NATIONAL_OBJECTIVES,
  STRATEGIC_INITIATIVES,
  NATIONAL_TASKS_BY_INITIATIVE,
  EVALUATION_CATEGORIES,
  EVALUATION_INDICATORS_BY_CATEGORY,
  DETAILED_INDICATORS_BY_INDICATOR
} from './constants';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import ResultsDisplay from './components/ResultsDisplay';
import { generateHeadlines } from './services/geminiService';
import ApiKeyModal from './components/ApiKeyModal';

const initialInput: UserInput = {
  nationalObjective: '',
  strategicInitiative: '',
  nationalTask: '',
  evaluationCategory: '',
  evaluationIndicator: '',
  evaluationDetailIndicator: '',
  coreActivity: '',
  innovativeMeans: '',
  organizationalPerformance: '',
  beneficiaryPerformance: '',
};

interface InputFieldProps {
  id: keyof UserInput;
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  isTextArea?: boolean;
}

const InputField = ({ id, label, placeholder, value, onChange, isTextArea = false }: InputFieldProps) => (
  <div>
    <label htmlFor={id} className="block text-lg font-semibold text-gray-300 mb-1">
      {label}
    </label>
    {isTextArea ? (
      <textarea
        id={id}
        name={id}
        rows={3}
        className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    ) : (
      <input
        type="text"
        id={id}
        name={id}
        className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    )}
  </div>
);

interface SelectFieldProps {
  id: keyof UserInput;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: readonly string[];
  disabled?: boolean;
}

const SelectField = ({ id, label, value, onChange, options, disabled = false }: SelectFieldProps) => (
  <div>
    <label htmlFor={id} className="block text-lg font-medium text-gray-400 mb-1">
      {label}
    </label>
    <select
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="block w-full pl-3 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg disabled:bg-gray-800 disabled:cursor-not-allowed"
    >
      <option value="" disabled>-- 선택 --</option>
      {options.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  </div>
);


function App() {
  const [userInput, setUserInput] = useState<UserInput>(initialInput);
  const [results, setResults] = useState<HeadlineResult[]>([]);
  const [view, setView] = useState<AppView>('intro');
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<{ name: string; mimeType: string; data: string; }[]>([]);
  const [apiKey, setApiKey] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  const [availableTasks, setAvailableTasks] = useState<readonly string[]>([]);
  const [availableIndicators, setAvailableIndicators] = useState<readonly string[]>([]);
  const [availableDetailIndicators, setAvailableDetailIndicators] = useState<readonly string[]>([]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const registerServiceWorker = () => {
        const swUrl = `${location.origin}/sw.js`;
        navigator.serviceWorker.register(swUrl)
          .then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch(err => {
            console.error('ServiceWorker registration failed: ', err);
          });
      };
      window.addEventListener('load', registerServiceWorker);

      return () => {
        window.removeEventListener('load', registerServiceWorker);
      };
    }
  }, []);

  useEffect(() => {
    const storedApiKey = localStorage.getItem('googleApiKey');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    } else {
      setIsModalOpen(true);
    }
  }, []);

  useEffect(() => {
    if (userInput.strategicInitiative && NATIONAL_TASKS_BY_INITIATIVE[userInput.strategicInitiative]) {
      setAvailableTasks(NATIONAL_TASKS_BY_INITIATIVE[userInput.strategicInitiative]);
    } else {
      setAvailableTasks([]);
    }
  }, [userInput.strategicInitiative]);

  useEffect(() => {
    if (userInput.evaluationCategory && EVALUATION_INDICATORS_BY_CATEGORY[userInput.evaluationCategory]) {
        setAvailableIndicators(EVALUATION_INDICATORS_BY_CATEGORY[userInput.evaluationCategory]);
    } else {
        setAvailableIndicators([]);
    }
  }, [userInput.evaluationCategory]);

  useEffect(() => {
    if (userInput.evaluationIndicator && DETAILED_INDICATORS_BY_INDICATOR[userInput.evaluationIndicator]) {
        setAvailableDetailIndicators(DETAILED_INDICATORS_BY_INDICATOR[userInput.evaluationIndicator]);
    } else {
        setAvailableDetailIndicators([]);
    }
  }, [userInput.evaluationIndicator]);


  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserInput(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    const key = name as keyof UserInput;

    setUserInput(prev => {
        const newState = { ...prev, [key]: value };

        if (key === 'strategicInitiative') {
            newState.nationalTask = '';
        } else if (key === 'evaluationCategory') {
            newState.evaluationIndicator = '';
            newState.evaluationDetailIndicator = '';
        } else if (key === 'evaluationIndicator') {
            newState.evaluationDetailIndicator = '';
        }
        
        return newState;
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const filePromises = Array.from(files).map(file => {
        return new Promise<{ name: string; mimeType: string; data: string; }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result as string;
            if (!result) {
                reject(new Error('파일을 읽는 데 실패했습니다.'));
                return;
            }
            const [header, base64Data] = result.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
            resolve({
              name: file.name,
              mimeType: mimeType,
              data: base64Data,
            });
          };
          reader.onerror = () => {
            reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(filePromises)
        .then(newAttachments => {
          setAttachments(prev => [...prev, ...newAttachments]);
        })
        .catch(error => {
          if (error instanceof Error) {
            setError(error.message);
          } else {
            setError('파일을 처리하는 중 알 수 없는 오류가 발생했습니다.');
          }
        });
    }
    e.target.value = '';
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const validateInput = (): boolean => {
    const fields: { key: keyof UserInput, name: string }[] = [
      { key: 'nationalObjective', name: '국정목표' },
      { key: 'strategicInitiative', name: '추진전략' },
      { key: 'nationalTask', name: '국정과제' },
      { key: 'evaluationCategory', name: '평가범주' },
      { key: 'evaluationIndicator', name: '지표' },
      { key: 'coreActivity', name: '핵심 활동' },
      { key: 'innovativeMeans', name: '혁신 수단' },
      { key: 'organizationalPerformance', name: '기관의 성과' },
      { key: 'beneficiaryPerformance', name: '수혜자 체감성과' },
    ];

    for (const field of fields) {
       if (userInput[field.key].trim() === '') {
        if (field.key === 'evaluationDetailIndicator' && availableDetailIndicators.length === 0) {
          continue;
        }
        setError(`'${field.name}' 항목을 선택 또는 입력해주세요.`);
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      setError('Google AI API Key가 설정되지 않았습니다. 설정에서 Key를 입력해주세요.');
      setIsModalOpen(true);
      return;
    }
    if (!validateInput()) {
      return;
    }
    setView('loading');
    setError(null);
    try {
      const generatedResults = await generateHeadlines(apiKey, userInput, attachments);
      setResults(generatedResults);
      setView('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setView('error');
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError(null);
     if (!apiKey) {
      setError('Google AI API Key가 설정되지 않았습니다. 설정에서 Key를 입력해주세요.');
      setIsModalOpen(true);
      setIsRegenerating(false);
      return;
    }
    try {
      const newResults = await generateHeadlines(apiKey, userInput, attachments);
      setResults(prevResults => {
        const mergedResults = JSON.parse(JSON.stringify(prevResults));
        newResults.forEach(newResultGroup => {
          const existingGroup = mergedResults.find((r: HeadlineResult) => r.type === newResultGroup.type);
          if (existingGroup) {
            existingGroup.headlines.push(...newResultGroup.headlines);
          } else {
            mergedResults.push(newResultGroup);
          }
        });
        return mergedResults;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '재생성 중 오류가 발생했습니다.';
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleReset = useCallback(() => {
    setUserInput(initialInput);
    setResults([]);
    setError(null);
    setAttachments([]);
    setView('intro');
  }, []);

  const handleSaveKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('googleApiKey', key);
  };

  const renderContent = () => {
    switch (view) {
      case 'loading':
        return <LoadingSpinner />;
      case 'results':
        return <ResultsDisplay results={results} onReset={handleReset} onRegenerate={handleRegenerate} isRegenerating={isRegenerating} error={error} />;
      case 'error':
        return (
          <div className="text-center p-8 bg-red-900/50 border border-red-700 rounded-lg">
            <h2 className="text-2xl font-bold text-red-200 mb-4">오류 발생</h2>
            <p className="text-red-300 mb-6">{error}</p>
            <button
              onClick={() => setView('intro')}
              className="px-6 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700"
            >
              입력 화면으로 돌아가기
            </button>
          </div>
        );
      case 'intro':
      default:
        return (
          <>
            <div className="text-center mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">보고서 아이템 제목생성을 위해 아래에 정보를 입력해주세요.</h2>
              <p className="mt-2 text-lg text-lime-400">경평 보고서 쓰시는 분들께 도움이 되길 바라며 -Made by 박정범</p>
            </div>
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg">
                  <label className="block text-lg font-semibold text-gray-300 mb-3">
                    1. 관련 국정 목표, 추진전략, 국정과제
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SelectField id="nationalObjective" label="국정목표" options={NATIONAL_OBJECTIVES} value={userInput.nationalObjective} onChange={handleSelectChange} />
                    <SelectField id="strategicInitiative" label="추진전략" options={STRATEGIC_INITIATIVES} value={userInput.strategicInitiative} onChange={handleSelectChange} />
                    <SelectField id="nationalTask" label="국정과제" options={availableTasks} value={userInput.nationalTask} onChange={handleSelectChange} disabled={!userInput.strategicInitiative} />
                  </div>
                </div>
                
                <div className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg">
                  <label className="block text-lg font-semibold text-gray-300 mb-3">
                    2. 경영평가 편람 지표
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SelectField id="evaluationCategory" label="평가범주" options={EVALUATION_CATEGORIES} value={userInput.evaluationCategory} onChange={handleSelectChange} />
                    <SelectField id="evaluationIndicator" label="지표" options={availableIndicators} value={userInput.evaluationIndicator} onChange={handleSelectChange} disabled={!userInput.evaluationCategory} />
                    <SelectField id="evaluationDetailIndicator" label="세부지표" options={availableDetailIndicators} value={userInput.evaluationDetailIndicator} onChange={handleSelectChange} disabled={!userInput.evaluationIndicator || availableDetailIndicators.length === 0} />
                  </div>
                </div>

                <InputField id="coreActivity" label="3. 핵심 활동 (Core Activity)" placeholder="기관이 구체적으로 '무엇'을 했는지 명확히 설명해주세요." value={userInput.coreActivity} onChange={handleInputChange} isTextArea={true} />
                <InputField id="innovativeMeans" label="4. 혁신 수단 (Innovative Means)" placeholder="'어떻게' 그 성과를 달성했는지 사용된 혁신적인 방법이나 기술을 명시해주세요." value={userInput.innovativeMeans} onChange={handleInputChange} />
                
                <div className="space-y-4 rounded-lg border border-gray-600 bg-gray-700/50 p-4">
                  <h3 className="block text-lg font-semibold text-gray-300">
                    5. 기관의 성과와 수혜자 체감성과
                  </h3>
                  <InputField id="organizationalPerformance" label="5-1. 기관의 성과" placeholder="객관적, 정량적 성과를 중심으로 기관이 달성한 것을 설명해주세요." value={userInput.organizationalPerformance} onChange={handleInputChange} isTextArea={true} />
                  <InputField id="beneficiaryPerformance" label="5-2. 수혜자 체감성과" placeholder="그 활동으로 인해 수혜자(국민)에게 '무엇'이 어떻게 좋아졌는지 구체적인 성과를 제시해주세요." value={userInput.beneficiaryPerformance} onChange={handleInputChange} isTextArea={true} />
                </div>
                
                <div className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg">
                  <label className="block text-lg font-semibold text-gray-300 mb-3">
                    6. 첨부파일 (선택사항)
                  </label>
                  <div>
                    <div className="flex items-center space-x-4">
                      <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-gray-600 hover:bg-gray-500">
                        <span>파일 선택</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} multiple accept=".pdf,.txt,.md,.json,.csv,.doc,.docx,.ppt,.pptx" />
                      </label>
                      {attachments.length > 0 && <span className="text-sm text-gray-400">{attachments.length}개 파일 선택됨</span>}
                    </div>
                     {attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                          {attachments.map((file, index) => (
                              <div key={index} className="flex items-center justify-between text-sm text-gray-300 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-600">
                                  <span className="truncate pr-2" title={file.name}>{file.name}</span>
                                  <button type="button" onClick={() => handleRemoveAttachment(index)} className="text-red-400 hover:text-red-300 font-bold ml-2 flex-shrink-0 leading-none" aria-label={`Remove ${file.name}`}>
                                      &times;
                                  </button>
                              </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">최신 정책자료, 보고서 등 참고 파일(.pdf, .docx, .txt 등)을 첨부하면 AI가 내용을 참고하여 제목을 생성합니다.</p>
                </div>


                {error && <p className="text-red-400 text-sm font-semibold text-center mt-2">{error}</p>}
                
                <div className="text-right pt-4">
                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed"
                  >
                    제목 생성하기
                  </button>
                </div>
              </form>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header onOpenSettings={() => setIsModalOpen(true)} />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {renderContent()}
      </main>
      <ApiKeyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveKey}
        currentApiKey={apiKey}
      />
    </div>
  );
}

export default App;