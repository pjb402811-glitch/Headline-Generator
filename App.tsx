import { useState, useMemo, useCallback, ChangeEvent, FormEvent, useEffect, Fragment } from 'react';
import type { UserInput, HeadlineResult, AppView, Headline, DraftStyle } from './types';
import {
  NATIONAL_OBJECTIVES,
  STRATEGIC_INITIATIVES,
  NATIONAL_TASKS_BY_INITIATIVE,
  EVALUATION_CATEGORIES,
  EVALUATION_INDICATORS_BY_CATEGORY,
  DETAILED_INDICATORS_BY_INDICATOR,
  DRAFT_STYLES,
} from './constants';
import { generateHeadlines, writeDraft, regenerateDraft, regenerateMoreHeadlines, changeDraftStyle } from './services/geminiService';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import ResultsDisplay from './components/ResultsDisplay';
import Feedback from './components/Feedback';
import CopyButton from './components/CopyButton';
import ApiKeyModal from './components/ApiKeyModal';

const initialUserInput: UserInput = {
  nationalObjective: '',
  strategicInitiative: '',
  nationalTask: '',
  evaluationCategory: '',
  evaluationIndicator: '',
  evaluationDetailIndicator: '',
  coreActivity: '',
  innovativeMeans: '',
  existingProblems: '',
  goals: '',
  processCharacteristics: '',
  internalCustomer: '',
  externalCustomer: '',
  organizationalPerformance: '',
  customerPerformance: '',
  sampleReportText: '',
  sampleFile: undefined,
};

const sampleUserInput: UserInput = {
  nationalObjective: "4. 기본이 튼튼한 사회",
  strategicInitiative: "4-1. 생명과 안전이 우선인 사회",
  nationalTask: "[72. 국민안전 보장을 위한 재난안전관리체계 확립]",
  evaluationCategory: "[기관평가] 주요사업",
  evaluationIndicator: "2. 철도시설 현대화사업",
  evaluationDetailIndicator: "(1) 안전시설 확충을 통한 철도시설 사고 방지",
  coreActivity: "IoT 센서 기반 '실시간 철도시설 모니터링 시스템(KR-RMS)' 구축 및 운영. 전국 2,000km 구간의 선로, 전력, 신호 설비에 진동, 온도, 전압 센서 5만개 설치. 수집된 빅데이터를 AI로 분석하여 이상 징후 사전 예측 및 선제적 유지보수 시행.",
  innovativeMeans: "기존의 인력 중심 주기적 점검 방식에서 탈피, 데이터 기반의 '예지보전(Predictive Maintenance)' 체계로 전면 전환. 디지털 트윈 기술을 도입하여 가상 환경에서 설비 고장 시뮬레이션 및 최적 대응 훈련 시행.",
  existingProblems: "노후화된 철도시설 증가로 인한 안전사고 발생 가능성 상존. 인력에 의존하는 순회 점검 방식은 잠재적 결함 발견에 한계가 있었고, 점검 인력의 피로도 및 인적 오류(Human Error) 발생 우려가 높았음.",
  goals: "철도시설 장애 발생률 전년 대비 30% 감축 (정량). 이상 징후 사전 예측 정확도 95% 달성 (정량). 점검 관련 인적 오류 'Zero'화 (정성). 국민이 체감하는 철도 안전 신뢰도 10% 향상 (정성).",
  processCharacteristics: "국내 중소기업과 협력하여 IoT 센서 국산화 성공. KT와의 협업을 통해 5G 통신망을 활용한 실시간 데이터 전송 체계 구축. 내부적으로 '데이터 분석 전문가' 양성 과정을 신설하여 직원 역량 강화.",
  internalCustomer: "시설 유지보수 담당 부서, 현장 점검 인력, 관제 센터",
  externalCustomer: "철도 이용 국민 전체, 열차 운행사(코레일, SR 등)",
  organizationalPerformance: "시설 장애로 인한 열차 운행 지연 시간 25% 감소. 연간 유지보수 비용 15% 절감. 점검 인력의 업무 강도 완화 및 안전사고 예방.",
  customerPerformance: "열차 정시성 99.8% 달성. 국민의 철도 이용 만족도 조사에서 '안전성' 부문 점수 8.5점 기록 (전년 대비 1.2점 상승).",
  sampleReportText: '',
  sampleFile: undefined,
};


const SelectField = ({ label, name, value, onChange, options, disabled = false }: { label: string; name: string; value: string; onChange: (e: ChangeEvent<HTMLSelectElement>) => void; options: string[]; disabled?: boolean; }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <select id={name} name={name} value={value} onChange={onChange} disabled={disabled} className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white disabled:bg-gray-800 disabled:cursor-not-allowed">
            <option value="">{label} 선택</option>
            {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
    </div>
);

const TextAreaField = ({ label, name, value, onChange, placeholder }: { label: string; name: string; value: string; onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void; placeholder: string; }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-300">{label}</label>
        <textarea id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} rows={4} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white placeholder-gray-400"></textarea>
    </div>
);

const FileInputField = ({ label, onChange, fileName }: { label: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void; fileName: string; }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <p className="text-xs text-gray-400 mb-2">벤치마킹 하고 싶은 우수 보고서를 넣으면 그걸 참고해서 AI가 결과를 만들어 냅니다.<br/>파일 용량은 10MB 이하로 첨부해주세요.</p>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
            <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-400">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-700 rounded-md font-medium text-blue-400 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 focus-within:ring-blue-500 px-2">
                        <span>파일 업로드</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={onChange} accept=".txt,.pdf,.docx" />
                    </label>
                    <p className="pl-1">또는 파일을 끌어오세요</p>
                </div>
                <p className="text-xs text-gray-500">.txt, .pdf, .docx 파일만 가능</p>
                {fileName && <p className="text-sm text-green-400 mt-2">{fileName}</p>}
            </div>
        </div>
    </div>
);


const IntroForm = ({ onSubmit, isLoading }: { onSubmit: (data: UserInput) => void; isLoading: boolean; }) => {
  const [userInput, setUserInput] = useState<UserInput>(initialUserInput);
  const [currentTab, setCurrentTab] = useState(1);

  const TABS = [
    { id: 1, name: '국정과제 정보' },
    { id: 2, name: '경영평가 지표 정보' },
    { id: 3, name: '기초 내용 입력' },
  ];

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserInput(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('파일 용량이 10MB를 초과할 수 없습니다.');
        e.target.value = ''; // Clear the file input
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (file.type === 'text/plain') {
            const text = event.target?.result as string;
            setUserInput(prev => ({ ...prev, sampleReportText: text, sampleFile: { name: file.name, mimeType: file.type, data: '' }}));
        } else {
            const base64Data = dataUrl.split(',')[1];
            setUserInput(prev => ({ 
                ...prev, 
                sampleReportText: '', 
                sampleFile: {
                    name: file.name,
                    mimeType: file.type,
                    data: base64Data,
                }
            }));
        }
      };
      if (file.type === 'text/plain') {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    }
  };
  
  const strategicInitiatives = useMemo(() => {
    if (!userInput.nationalObjective) return [];
    return STRATEGIC_INITIATIVES.filter(item => item.startsWith(userInput.nationalObjective.split('.')[0]));
  }, [userInput.nationalObjective]);

  const nationalTasks = useMemo(() => {
    return NATIONAL_TASKS_BY_INITIATIVE[userInput.strategicInitiative] || [];
  }, [userInput.strategicInitiative]);

  const evaluationIndicators = useMemo(() => {
    return EVALUATION_INDICATORS_BY_CATEGORY[userInput.evaluationCategory] || [];
  }, [userInput.evaluationCategory]);

  const detailedIndicators = useMemo(() => {
    return DETAILED_INDICATORS_BY_INDICATOR[userInput.evaluationIndicator] || [];
  }, [userInput.evaluationIndicator]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(userInput);
  };

  const handleGenerateSample = () => {
    setUserInput(sampleUserInput);
    onSubmit(sampleUserInput);
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">경평 실적보고서 아이템 제목&amp;초안 생성기</h2>
        <p className="mt-4 text-lg text-gray-300">핵심 내용을 입력하고 전문가급 제목과 보고서 초안을 즉시 받아보세요.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-8 bg-gray-800 p-8 rounded-lg border border-gray-700 shadow-lg">
        
        {/* Visual Tab Headers */}
        <div className="mb-8">
            <div className="flex items-center justify-between">
                {TABS.map((tab, index) => (
                    <Fragment key={tab.id}>
                        <div className="flex flex-col items-center text-center">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                    currentTab >= tab.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-400'
                                }`}
                            >
                                {tab.id}
                            </div>
                            <p className={`mt-2 text-xs sm:text-sm font-medium ${currentTab >= tab.id ? 'text-blue-300' : 'text-gray-500'}`}>{tab.name}</p>
                        </div>
                        {index < TABS.length - 1 && <div className="flex-1 border-t-2 border-gray-700 mx-2 sm:mx-4 mt-[-1.25rem]"></div>}
                    </Fragment>
                ))}
            </div>
        </div>

        {/* Tab 1: 국정과제 정보 */}
        <div className={`${currentTab === 1 ? '' : 'hidden'}`}>
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white border-b border-gray-600 pb-2">Step 1: 국정과제 정보</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SelectField label="국정 목표" name="nationalObjective" value={userInput.nationalObjective} onChange={handleInputChange} options={NATIONAL_OBJECTIVES} />
                    <SelectField label="전략 과제" name="strategicInitiative" value={userInput.strategicInitiative} onChange={handleInputChange} options={strategicInitiatives} disabled={!userInput.nationalObjective} />
                    <SelectField label="국정 과제" name="nationalTask" value={userInput.nationalTask} onChange={handleInputChange} options={nationalTasks} disabled={!userInput.strategicInitiative} />
                </div>
            </div>
        </div>

        {/* Tab 2: 경영평가 지표 정보 */}
        <div className={`${currentTab === 2 ? '' : 'hidden'}`}>
            <div className="space-y-6">
                 <h3 className="text-xl font-semibold text-white border-b border-gray-600 pb-2">Step 2: 경영평가 지표 정보</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SelectField label="경영평가 지표 (범주)" name="evaluationCategory" value={userInput.evaluationCategory} onChange={handleInputChange} options={EVALUATION_CATEGORIES} />
                    <SelectField label="경영평가 지표 (지표)" name="evaluationIndicator" value={userInput.evaluationIndicator} onChange={handleInputChange} options={evaluationIndicators} disabled={!userInput.evaluationCategory} />
                    <SelectField label="경영평가 지표 (세부지표)" name="evaluationDetailIndicator" value={userInput.evaluationDetailIndicator} onChange={handleInputChange} options={detailedIndicators} disabled={!userInput.evaluationIndicator} />
                </div>
            </div>
        </div>

        {/* Tab 3: 실적보고서 아이템별 기초 내용 입력 */}
        <div className={`${currentTab === 3 ? '' : 'hidden'}`}>
             <div className="space-y-8">
                <h3 className="text-xl font-semibold text-white border-b border-gray-600 pb-2">Step 3: 실적보고서 아이템별 기초 내용 입력</h3>

                <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-blue-400">1) 추진배경 및 주요 고객</h4>
                    <div className="space-y-6 pl-4">
                        <TextAreaField label="① 기존의 문제점 또는 한계 (As-Is)" name="existingProblems" value={userInput.existingProblems} onChange={handleInputChange} placeholder="이 사업/활동을 시작하기 전의 상황이나 문제점을 작성해주세요." />
                        <TextAreaField label="② 달성하고자 한 목표 (Goal)" name="goals" value={userInput.goals} onChange={handleInputChange} placeholder="활동을 통해 무엇을 이루려고 했는지 정량적/정성적 목표를 작성해주세요." />
                        <TextAreaField label="③ 주요 고객 (내부)" name="internalCustomer" value={userInput.internalCustomer} onChange={handleInputChange} placeholder="활동의 영향을 받는 내부 고객을 작성해주세요. (예: OO부서, 전 직원)" />
                        <TextAreaField label="④ 주요 고객 (외부)" name="externalCustomer" value={userInput.externalCustomer} onChange={handleInputChange} placeholder="활동의 영향을 받는 외부 고객을 작성해주세요. (예: 국민, OO기업, 지역주민)" />
                    </div>
                </div>

                <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-blue-400">2) 핵심 활동 및 혁신 수단</h4>
                    <div className="space-y-6 pl-4">
                        <TextAreaField label="① 핵심 활동 (Action)" name="coreActivity" value={userInput.coreActivity} onChange={handleInputChange} placeholder="목표 달성을 위해 수행한 가장 중요한 활동을 구체적으로 작성해주세요." />
                        <TextAreaField label="② 혁신적인 수단 또는 방식 (Innovative)" name="innovativeMeans" value={userInput.innovativeMeans} onChange={handleInputChange} placeholder="기존 방식과 다르게 시도한 창의적인 방법이나 기술을 작성해주세요." />
                        <TextAreaField label="③ 추진과정의 특징" name="processCharacteristics" value={userInput.processCharacteristics} onChange={handleInputChange} placeholder="협업, 갈등 해결, 자원 활용 등 과정상의 특징적인 노력을 작성해주세요." />
                    </div>
                </div>
                
                <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-blue-400">3) 주요 성과</h4>
                    <div className="space-y-6 pl-4">
                        <TextAreaField label="① 기관의 성과" name="organizationalPerformance" value={userInput.organizationalPerformance} onChange={handleInputChange} placeholder="활동 결과로 나타난 기관 내부의 긍정적 변화를 작성해주세요. (예: 업무 효율 20% 향상)" />
                        <TextAreaField label="② 고객이 체감하는 성과" name="customerPerformance" value={userInput.customerPerformance} onChange={handleInputChange} placeholder="고객이 직접적으로 느끼는 혜택이나 만족도 변화를 작성해주세요. (예: 민원 처리 시간 3일 단축)" />
                    </div>
                </div>
                
                <div className="pt-5 border-t border-gray-700">
                    <FileInputField 
                      label="(선택) 우수 보고서 샘플 첨부 (.txt, .pdf, .docx)" 
                      onChange={handleFileChange} 
                      fileName={userInput.sampleFile?.name || ''}
                    />
                </div>
            </div>
        </div>
        
        {/* Navigation Buttons */}
        <div className="pt-8 mt-8 border-t border-gray-700">
            <div className="flex justify-between">
                {currentTab > 1 ? (
                     <button type="button" onClick={() => setCurrentTab(currentTab - 1)} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 transition-colors">
                        이전 단계
                     </button>
                ) : <div />}
                
                {currentTab < TABS.length && (
                     <button type="button" onClick={() => setCurrentTab(currentTab + 1)} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors">
                        다음 단계
                     </button>
                )}
            </div>

            {currentTab === TABS.length && (
                <div className="pt-8 flex flex-col sm:flex-row justify-center gap-4">
                    <button type="submit" disabled={isLoading} className="w-full sm:flex-1 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-500 disabled:cursor-wait">
                        {isLoading ? '생성 중...' : '내가 입력한 내용으로 생성'}
                    </button>
                    <button type="button" onClick={handleGenerateSample} disabled={isLoading} className="w-full sm:flex-1 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-500 disabled:cursor-wait">
                        {isLoading ? '생성 중...' : '샘플로 생성해보기'}
                    </button>
                </div>
            )}
        </div>
      </form>
    </div>
  );
};

const DraftDisplay = ({ draft, onBack, onReset, feedbackText, onFeedbackChange, onRegenerateDraft, isRegeneratingDraft, error,
  draftStyles, currentDraftType, onChangeStyle, isChangingStyle
}: {
  draft: string;
  onBack: () => void;
  onReset: () => void;
  feedbackText: string;
  onFeedbackChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onRegenerateDraft: () => void;
  isRegeneratingDraft: boolean;
  error: string | null;
  draftStyles: { id: DraftStyle; name: string }[];
  currentDraftType: DraftStyle;
  onChangeStyle: (style: DraftStyle) => void;
  isChangingStyle: DraftStyle | null;
}) => {
  const formatDraft = (text: string) => {
    if (!text) return '';
    return text.split('\n').map(line => {
      if (line.startsWith('【') && line.endsWith('】')) {
        return `<h2 class="!text-3xl !font-bold !text-white !mb-2">${line}</h2>`;
      }
      if (line.startsWith('<') && line.endsWith('>')) {
        return `<h3 class="!text-xl !text-blue-300 !mb-6">${line}</h3>`;
      }
      return line;
    }).join('<br/>');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
         <h2 className="text-3xl font-bold text-white">AI 생성 보고서 초안</h2>
         <div className="mt-4 inline-flex rounded-md shadow-sm" role="group">
            {draftStyles.map(style => (
              <button
                key={style.id}
                type="button"
                onClick={() => onChangeStyle(style.id)}
                disabled={!!isChangingStyle}
                className={`px-4 py-2 text-sm font-medium border transition-colors duration-200 ${
                  currentDraftType === style.id 
                    ? 'bg-blue-600 text-white border-blue-700 z-10' 
                    : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                } ${
                  isChangingStyle === style.id ? 'opacity-50 cursor-wait' : ''
                } first:rounded-l-lg last:rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isChangingStyle === style.id ? '변환 중...' : style.name}
              </button>
            ))}
         </div>
      </div>

      <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 shadow-lg relative prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white prose-strong:text-blue-400 prose-ul:list-disc prose-li:marker:text-blue-500">
        {isChangingStyle && !draft ? (
            <LoadingSpinner message="새로운 스타일로 초안을 재작성하고 있습니다..." />
        ) : (
           <div dangerouslySetInnerHTML={{ __html: formatDraft(draft) }}></div>
        )}
        <div className="absolute top-4 right-4">
            <CopyButton textToCopy={draft} />
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <div>
          <label htmlFor="feedback" className="block text-lg font-medium text-gray-200 mb-2">
            의견 제시
          </label>
          <textarea
            id="feedback"
            name="feedback"
            rows={4}
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white placeholder-gray-400"
            placeholder="초안에 대한 의견이나 수정 요청사항을 입력해주세요. (예: 탄소 절감 효과를 더 극적으로 강조해줘)"
            value={feedbackText}
            onChange={onFeedbackChange}
          />
        </div>

        {error && (
          <div className="my-2 p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-md text-center">
              <p><strong>오류:</strong> {error}</p>
          </div>
        )}

        <div className="flex justify-center">
            <button
              onClick={onRegenerateDraft}
              disabled={isRegeneratingDraft}
              className="w-full md:w-1/2 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-500 disabled:cursor-wait"
            >
              {isRegeneratingDraft ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>의견 반영하여 다시 생성 중...</span>
                  </>
              ) : '의견 반영하여 다시 생성'}
            </button>
        </div>
      </div>

      <div className="text-center mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
        <button
          onClick={onBack}
          className="w-full sm:w-auto px-8 py-3 bg-gray-500 text-white font-bold rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
        >
          제목 선택으로 돌아가기
        </button>
        <button
          onClick={onReset}
          className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          처음부터 새로 만들기
        </button>
      </div>
    </div>
  )
}

function App() {
  const [view, setView] = useState<AppView>('intro');
  const [userInput, setUserInput] = useState<UserInput>(initialUserInput);
  const [results, setResults] = useState<HeadlineResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [selectedHeadline, setSelectedHeadline] = useState<Headline | null>(null);
  const [isApiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isRegeneratingDraft, setIsRegeneratingDraft] = useState(false);

  const [drafts, setDrafts] = useState<Partial<Record<DraftStyle, string>>>({});
  const [currentDraftType, setCurrentDraftType] = useState<DraftStyle>('개조식 요약형');
  const [isChangingStyle, setIsChangingStyle] = useState<DraftStyle | null>(null);
  
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }
  }, []);

  const getApiKey = useCallback(() => {
      return localStorage.getItem('googleApiKey');
  }, []);

  const handleOpenSettings = () => {
      setApiKeyModalOpen(true);
  };
  
  const handleSaveApiKey = (key: string) => {
      localStorage.setItem('googleApiKey', key);
      setApiKeyModalOpen(false);
  };

  const callApi = useCallback(async (currentInput: UserInput) => {
    setIsLoading(true);
    setView('loading');
    setError(null);

    const apiKey = getApiKey();
    if (!apiKey) {
        setError("API 키가 설정되지 않았습니다. 우측 상단 설정 아이콘을 클릭하여 API 키를 입력해주세요.");
        setIsLoading(false);
        setView('intro');
        setApiKeyModalOpen(true);
        return;
    }

    try {
      const headlineResults = await generateHeadlines(currentInput, apiKey);
      setResults(headlineResults);
      setView('results');
    } catch (e: any) {
      setError(e.message || '알 수 없는 오류가 발생했습니다.');
      setView('error');
    } finally {
      setIsLoading(false);
      setIsRegenerating(false);
    }
  }, [getApiKey]);

  const handleSubmit = useCallback((data: UserInput) => {
    setUserInput(data);
    callApi(data);
  }, [callApi]);

  const handleRegenerate = useCallback(async () => {
    setIsRegenerating(true);
    setError(null);

    const apiKey = getApiKey();
    if (!apiKey) {
        setError("API 키가 설정되지 않았습니다. 우측 상단 설정 아이콘을 클릭하여 API 키를 입력해주세요.");
        setIsRegenerating(false);
        setApiKeyModalOpen(true);
        return;
    }

    try {
      const newHeadlineResults = await regenerateMoreHeadlines(userInput, results, apiKey);
      
      const mergedResults = results.map(existingResult => {
        const newResultForType = newHeadlineResults.find(
          newResult => newResult.type === existingResult.type
        );
        if (newResultForType) {
          const existingTitles = new Set(existingResult.headlines.map(h => h.title));
          const uniqueNewHeadlines = newResultForType.headlines.filter(h => !existingTitles.has(h.title));
          
          return {
            ...existingResult,
            headlines: [...existingResult.headlines, ...uniqueNewHeadlines],
          };
        }
        return existingResult;
      });

      setResults(mergedResults);
    } catch (e: any) {
      setError(e.message || '추가 제목 생성 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsRegenerating(false);
    }
  }, [userInput, results, getApiKey]);

  const handleReset = () => {
    setUserInput(initialUserInput);
    setResults([]);
    setError(null);
    setView('intro');
    setSelectedHeadline(null);
    setDraftContent('');
    setDrafts({});
    setCurrentDraftType('개조식 요약형');
    setIsChangingStyle(null);
  };
  
  const handleWriteDraft = async () => {
    if (!selectedHeadline) {
      setError("초안을 작성할 제목을 선택해주세요.");
      return;
    }
    setIsDrafting(true);
    setView('drafting');
    setError(null);
    
    const apiKey = getApiKey();
    if (!apiKey) {
        setError("API 키가 설정되지 않았습니다. 우측 상단 설정 아이콘을 클릭하여 API 키를 입력해주세요.");
        setIsDrafting(false);
        setView('results');
        setApiKeyModalOpen(true);
        return;
    }
    
    try {
      const draft = await writeDraft(userInput, selectedHeadline, apiKey);
      setDrafts({ '개조식 요약형': draft });
      setCurrentDraftType('개조식 요약형');
      setDraftContent(draft);
      setView('draft');
    } catch (e: any) {
      setError(e.message || '초안 작성 중 오류가 발생했습니다.');
      setView('results'); // Go back to results on error
    } finally {
      setIsDrafting(false);
    }
  };

  const handleFeedbackChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setFeedbackText(e.target.value);
    if (error) {
      setError(null);
    }
  };

  const handleRegenerateDraft = async () => {
    if (!selectedHeadline || !feedbackText.trim()) {
      setError("의견을 입력해주세요.");
      return;
    }
    setIsRegeneratingDraft(true);
    setError(null);
    
    const apiKey = getApiKey();
     if (!apiKey) {
        setError("API 키가 설정되지 않았습니다. 우측 상단 설정 아이콘을 클릭하여 API 키를 입력해주세요.");
        setIsRegeneratingDraft(false);
        setApiKeyModalOpen(true);
        return;
    }
  
    try {
      const newDraft = await regenerateDraft(draftContent, feedbackText, apiKey);
      setDrafts(prev => ({ ...prev, [currentDraftType]: newDraft }));
      setDraftContent(newDraft);
      setFeedbackText(''); 
    } catch (e: any) {
      setError(e.message || '초안 재작성 중 오류가 발생했습니다.');
    } finally {
      setIsRegeneratingDraft(false);
    }
  };

  const handleChangeDraftStyle = async (styleId: DraftStyle) => {
    if (styleId === currentDraftType) return;

    if (drafts[styleId]) {
      setCurrentDraftType(styleId);
      setDraftContent(drafts[styleId] as string);
      return;
    }

    setIsChangingStyle(styleId);
    setError(null);
    setCurrentDraftType(styleId);
    
    const apiKey = getApiKey();
    if (!apiKey) {
        setError("API 키가 설정되지 않았습니다. 우측 상단 설정 아이콘을 클릭하여 API 키를 입력해주세요.");
        setIsChangingStyle(null);
        setCurrentDraftType('개조식 요약형');
        setDraftContent(drafts['개조식 요약형'] || '');
        setApiKeyModalOpen(true);
        return;
    }
    
    try {
      const originalDraft = drafts['개조식 요약형'];
      if (!originalDraft) throw new Error("원본 초안을 찾을 수 없습니다.");
      
      const newDraft = await changeDraftStyle(originalDraft, styleId, apiKey);
      setDrafts(prev => ({ ...prev, [styleId]: newDraft }));
      setDraftContent(newDraft);
    } catch (e: any) {
      setError(e.message || '초안 스타일 변경 중 오류가 발생했습니다.');
      setCurrentDraftType('개조식 요약형');
      setDraftContent(drafts['개조식 요약형'] || '');
    } finally {
      setIsChangingStyle(null);
    }
  };


  const renderContent = () => {
    switch (view) {
      case 'loading':
        return <LoadingSpinner message="AI가 제목을 생성하고 있습니다. 잠시만 기다려주세요..." />;
      case 'drafting':
        return <LoadingSpinner message="AI가 보고서 초안을 작성하고 있습니다. 잠시만 기다려주세요..." />;
      case 'results':
        return (
          <>
            <ResultsDisplay 
              results={results} 
              onReset={handleReset} 
              onRegenerate={handleRegenerate}
              isRegenerating={isRegenerating}
              error={error}
              selectedHeadline={selectedHeadline}
              onSelectHeadline={setSelectedHeadline}
              onWriteDraft={handleWriteDraft}
              isDrafting={isDrafting}
            />
            <Feedback />
          </>
        );
      case 'draft':
        return <DraftDisplay 
                  draft={drafts[currentDraftType] ?? ''} 
                  onBack={() => setView('results')} 
                  onReset={handleReset}
                  feedbackText={feedbackText}
                  onFeedbackChange={handleFeedbackChange}
                  onRegenerateDraft={handleRegenerateDraft}
                  isRegeneratingDraft={isRegeneratingDraft}
                  error={error}
                  draftStyles={DRAFT_STYLES}
                  currentDraftType={currentDraftType}
                  onChangeStyle={handleChangeDraftStyle}
                  isChangingStyle={isChangingStyle}
                />;
      case 'error':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-400">오류 발생</h2>
            <p className="mt-2 text-gray-300">{error}</p>
            <button
              onClick={handleReset}
              className="mt-6 px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700"
            >
              다시 시도하기
            </button>
          </div>
        );
      case 'intro':
      default:
        return <IntroForm onSubmit={handleSubmit} isLoading={isLoading} />;
    }
  };

  return (
    <>
      <Header onOpenSettings={handleOpenSettings} />
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {renderContent()}
        </div>
      </main>
      <ApiKeyModal 
        isOpen={isApiKeyModalOpen} 
        onClose={() => setApiKeyModalOpen(false)}
        onSave={handleSaveApiKey}
        currentApiKey={getApiKey() || ''}
      />
    </>
  );
}

export default App;