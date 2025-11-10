import { useState, useMemo, useCallback, ChangeEvent, FormEvent } from 'react';
import type { UserInput, HeadlineResult, AppView, Headline } from './types';
import {
  NATIONAL_OBJECTIVES,
  STRATEGIC_INITIATIVES,
  NATIONAL_TASKS_BY_INITIATIVE,
  EVALUATION_CATEGORIES,
  EVALUATION_INDICATORS_BY_CATEGORY,
  DETAILED_INDICATORS_BY_INDICATOR,
} from './constants';
import { generateHeadlines, writeDraft } from './services/geminiService';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import ResultsDisplay from './components/ResultsDisplay';
import Feedback from './components/Feedback';
import CopyButton from './components/CopyButton';

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
};

const IntroForm = ({ onSubmit, isLoading }: { onSubmit: (data: UserInput) => void; isLoading: boolean; }) => {
  const [userInput, setUserInput] = useState<UserInput>(initialUserInput);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserInput(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setUserInput(prev => ({ ...prev, sampleReportText: text }));
      };
      reader.readAsText(file);
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
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">보고서 제목, AI로 10초만에 완성</h2>
        <p className="mt-4 text-lg text-gray-300">핵심 내용을 입력하고 15가지 유형의 전문가급 제목을 즉시 받아보세요.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-8 bg-gray-800 p-8 rounded-lg border border-gray-700 shadow-lg">
        {/* Section 1 */}
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white border-b border-gray-600 pb-2">1. 국정과제 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SelectField label="국정 목표" name="nationalObjective" value={userInput.nationalObjective} onChange={handleInputChange} options={NATIONAL_OBJECTIVES} />
                <SelectField label="전략 과제" name="strategicInitiative" value={userInput.strategicInitiative} onChange={handleInputChange} options={strategicInitiatives} disabled={!userInput.nationalObjective} />
                <SelectField label="국정 과제" name="nationalTask" value={userInput.nationalTask} onChange={handleInputChange} options={nationalTasks} disabled={!userInput.strategicInitiative} />
            </div>
        </div>

        {/* Section 2 */}
        <div className="space-y-6">
             <h3 className="text-xl font-semibold text-white border-b border-gray-600 pb-2">2. 경영평가 지표 정보</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SelectField label="경영평가 지표 (범주)" name="evaluationCategory" value={userInput.evaluationCategory} onChange={handleInputChange} options={EVALUATION_CATEGORIES} />
                <SelectField label="경영평가 지표 (지표)" name="evaluationIndicator" value={userInput.evaluationIndicator} onChange={handleInputChange} options={evaluationIndicators} disabled={!userInput.evaluationCategory} />
                <SelectField label="경영평가 지표 (세부지표)" name="evaluationDetailIndicator" value={userInput.evaluationDetailIndicator} onChange={handleInputChange} options={detailedIndicators} disabled={!userInput.evaluationIndicator} />
            </div>
        </div>
        
        {/* Section 3 wrapper */}
        <div className="space-y-8 pt-4 border-t border-gray-700">
            <h3 className="text-xl font-semibold text-white border-b border-gray-600 pb-2">3. 실적보고서 아이템별 기초 내용 입력</h3>
            
            <FileInputField 
              label="💡 (선택) 우수 보고서 샘플 첨부 (.txt)" 
              onChange={handleFileChange} 
              fileName={userInput.sampleReportText ? '파일 첨부됨' : ''}
            />

            {/* Subsection 3-1 */}
            <div className="space-y-6">
                <h4 className="text-lg font-semibold text-blue-400">1) 추진배경 및 주요 고객</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4">
                    <TextAreaField label="① 기존의 문제점 또는 한계 (As-Is)" name="existingProblems" value={userInput.existingProblems} onChange={handleInputChange} placeholder="이 사업/활동을 시작하기 전의 상황이나 문제점을 작성해주세요." />
                    <TextAreaField label="② 달성하고자 한 목표 (Goal)" name="goals" value={userInput.goals} onChange={handleInputChange} placeholder="활동을 통해 무엇을 이루려고 했는지 정량적/정성적 목표를 작성해주세요." />
                    <