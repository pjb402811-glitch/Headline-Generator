import { GoogleGenAI, Type, Part } from "@google/genai";
import type { UserInput, HeadlineResult, Headline } from "../types";
import { HEADLINE_TYPES } from "../constants";

const generateHeadlinesPrompt = (userInput: UserInput): string => `
당신은 대한민국 정부 부처 및 공공기관의 경영평가 보고서 작성을 전문으로 하는 AI 카피라이터입니다.
아래에 제공된 상세 정보를 바탕으로, 각 16가지 유형별로 창의적이고 설득력 있는 보고서 제목(헤드라인)을 **각각 3개씩, 총 48개**를 생성해주세요.

**상세 정보:**
- 주요 고객 (내부): ${userInput.internalCustomer}
- 주요 고객 (외부): ${userInput.externalCustomer}
- 개선 배경 (As-Is): ${userInput.existingProblems}
- 구체적인 목표: ${userInput.goals}
- 핵심 활동: ${userInput.coreActivity}
- 혁신 수단: ${userInput.innovativeMeans}
- 추진 과정 특징: ${userInput.processCharacteristics}
- 기관의 성과 (To-Be): ${userInput.organizationalPerformance}
- 고객 체감 성과 (To-Be): ${userInput.customerPerformance}

**생성할 제목 유형 (총 16개):**
${HEADLINE_TYPES.join(", ")}

**출력 형식:**
- 각 제목은 'title'과 'strategy' 두 가지 필드를 포함해야 합니다.
- 'strategy' 필드에는 해당 제목이 어떤 카피라이팅 전략을 사용하여 작성되었는지 간략하게 설명해주세요.
- 전체 결과는 반드시 아래의 JSON 스키마를 엄격히 준수하는 JSON 배열 형식으로 반환해야 합니다. 각 배열 요소는 하나의 제목 유형에 대한 결과를 담고 있으며, 'type'과 'headlines' 필드를 가져야 합니다.
`;

const headlineSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "생성된 보고서 제목",
    },
    strategy: {
      type: Type.STRING,
      description: "제목 생성에 사용된 카피라이팅 전략 또는 근거",
    },
  },
  required: ["title", "strategy"],
};

const resultSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        description: `제목의 유형. 다음 중 하나: ${HEADLINE_TYPES.join(", ")}`,
      },
      headlines: {
        type: Type.ARRAY,
        items: headlineSchema,
      },
    },
    required: ["type", "headlines"],
  },
};

export const generateHeadlines = async (
  userInput: UserInput
): Promise<HeadlineResult[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const prompt = generateHeadlinesPrompt(userInput);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: resultSchema,
        temperature: 0.8,
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
        throw new Error("AI가 유효한 JSON 응답을 생성하지 못했습니다.");
    }
    return JSON.parse(jsonText.trim()) as HeadlineResult[];
  } catch (error) {
    console.error("Error generating headlines:", error);
    if (error instanceof Error) {
      throw new Error(`AI 제목 생성에 실패했습니다: ${error.message}`);
    }
    throw new Error("AI 제목 생성 중 알 수 없는 오류가 발생했습니다.");
  }
};

const writeDraftPrompt = (
  userInput: UserInput,
  selectedHeadline: Headline
): string => {
  const sampleReportContext = (userInput.sampleReportText || userInput.sampleFile)
    ? `
**첨부된 모범 답안 샘플 보고서 (참고용)**
위 샘플 보고서를 최고 수준의 모범 답안으로 참고하여, 아래 상세 정보를 바탕으로 **샘플과 비슷한 스타일, 논리 구조, 전문성을 갖춘** 보고서 초안을 작성해주세요.
`
    : `당신은 대한민국 정부 부처 및 공공기관의 경영평가 보고서 작성을 전문으로 하는 AI 컨설턴트입니다.
아래에 제공된 상세 정보와 선택된 제목을 바탕으로, 각 항목별 보고서 초안을 **개조식(bullet point)**으로 작성해주세요.`;

  return `
${sampleReportContext}

**선택된 제목:** ${selectedHeadline.title}
**제목 생성 전략:** ${selectedHeadline.strategy}

**상세 정보:**
- 주요 고객 (내부): ${userInput.internalCustomer}
- 주요 고객 (외부): ${userInput.externalCustomer}
- 개선 배경 (As-Is): ${userInput.existingProblems}
- 구체적인 목표: ${userInput.goals}
- 핵심 활동: ${userInput.coreActivity}
- 혁신 수단: ${userInput.innovativeMeans}
- 추진 과정 특징: ${userInput.processCharacteristics}
- 기관의 성과 (To-Be): ${userInput.organizationalPerformance}
- 고객 체감 성과 (To-Be): ${userInput.customerPerformance}

**작성 가이드라인:**
1.  각 항목('추진배경', '주요 내용', '기관의 성과', '고객 체감 성과')에 대해, **완전한 서술형 문장이 아닌, 핵심 내용을 담은 간결한 개조식(bullet point) 형태**로 요약해주세요.
2.  내용은 **"문제점 → 개선 활동 → 정량/정성적 성과"**의 논리 구조가 드러나도록 작성하고, 가능한 한 구체적인 데이터를 포함해주세요. (예: "기존 ActiveX 기반 시스템의 낮은 접근성(문제점)을 Non-ActiveX 기술로 전면 개편하여(개선) 모바일 이용률 45% 달성(성과)")
3.  각 항목의 핵심 내용을 가장 효과적으로 표현할 수 있는 **도표나 그림(예: 막대그래프, 순서도, 표 등)을 구체적으로 제안**해주세요.
4.  도표/그림 제안은 반드시 \`> 📊 **도표/그림 제안**\` 형식으로 시작하며, **유형, 제목, 설명**을 포함해야 합니다.
5.  전체 내용은 마크다운(Markdown) 형식으로 구조화하여 명료하게 전달해주세요.
`;
};

export const writeDraft = async (
  userInput: UserInput,
  selectedHeadline: Headline
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const prompt = writeDraftPrompt(userInput, selectedHeadline);

  try {
    const parts: Part[] = [{ text: prompt }];

    // Handle .txt file content for backward compatibility and simplicity
    if (userInput.sampleReportText) {
      parts.push({
        inlineData: {
          mimeType: 'text/plain',
          data: btoa(unescape(encodeURIComponent(userInput.sampleReportText)))
        }
      });
    } 
    // Handle file uploads (PDF, DOCX, etc.)
    else if (userInput.sampleFile) {
       parts.push({
        inlineData: {
          mimeType: userInput.sampleFile.mimeType,
          data: userInput.sampleFile.data,
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: { parts },
      config: {
        temperature: 0.7,
      },
    });

    return response.text ?? '';
  } catch (error) {
    console.error("Error writing draft:", error);
    if (error instanceof Error) {
      throw new Error(`초안 작성에 실패했습니다: ${error.message}`);
    }
    throw new Error("초안 작성 중 알 수 없는 오류가 발생했습니다.");
  }
};

const regenerateMoreHeadlinesPrompt = (userInput: UserInput, existingResults: HeadlineResult[]): string => {
  const existingTitlesText = existingResults
    .map(result => `### ${result.type}\n${result.headlines.map(h => `- ${h.title}`).join('\n')}`)
    .join('\n\n');

  return `
당신은 대한민국 정부 부처 및 공공기관의 경영평가 보고서 작성을 전문으로 하는 AI 카피라이터입니다.
아래에 제공된 상세 정보와 **이미 생성된 제목 목록**을 참고하여, 각 16가지 유형별로 **새롭고 독창적인** 보고서 제목(헤드라인)을 **추가로 3개씩, 총 48개**를 생성해주세요.

**상세 정보:**
- 주요 고객 (내부): ${userInput.internalCustomer}
- 주요 고객 (외부): ${userInput.externalCustomer}
- 개선 배경 (As-Is): ${userInput.existingProblems}
- 구체적인 목표: ${userInput.goals}
- 핵심 활동: ${userInput.coreActivity}
- 혁신 수단: ${userInput.innovativeMeans}
- 추진 과정 특징: ${userInput.processCharacteristics}
- 기관의 성과 (To-Be): ${userInput.organizationalPerformance}
- 고객 체감 성과 (To-Be): ${userInput.customerPerformance}

**이미 생성된 제목 목록 (이 제목들과는 다르게 생성해주세요):**
---
${existingTitlesText}
---

**생성할 제목 유형 (총 16개):**
${HEADLINE_TYPES.join(", ")}

**출력 형식:**
- 각 제목은 'title'과 'strategy' 두 가지 필드를 포함해야 합니다.
- 'strategy' 필드에는 해당 제목이 어떤 카피라이팅 전략을 사용하여 작성되었는지 간략하게 설명해주세요.
- 전체 결과는 반드시 아래의 JSON 스키마를 엄격히 준수하는 JSON 배열 형식으로 반환해야 합니다. 각 배열 요소는 하나의 제목 유형에 대한 결과를 담고 있으며, 'type'과 'headlines' 필드를 가져야 합니다.
`;
};

export const regenerateMoreHeadlines = async (
  userInput: UserInput,
  existingResults: HeadlineResult[]
): Promise<HeadlineResult[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const prompt = regenerateMoreHeadlinesPrompt(userInput, existingResults);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: resultSchema,
        temperature: 0.9,
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("AI가 유효한 JSON 응답을 생성하지 못했습니다.");
    }
    return JSON.parse(jsonText.trim()) as HeadlineResult[];
  } catch (error) {
    console.error("Error regenerating more headlines:", error);
    if (error instanceof Error) {
      throw new Error(`AI 제목 추가 생성에 실패했습니다: ${error.message}`);
    }
    throw new Error("AI 제목 추가 생성 중 알 수 없는 오류가 발생했습니다.");
  }
};


const regenerateDraftPrompt = (
  userInput: UserInput,
  selectedHeadline: Headline,
  previousDraft: string,
  feedback: string
): string => {
  const sampleReportContext = (userInput.sampleReportText || userInput.sampleFile)
    ? `
**첨부된 모범 답안 샘플 보고서 (참고용)**
아래 '기존 초안'을 '사용자 의견'에 따라 수정해주세요. 수정 시, 첨부된 샘플 보고서의 스타일, 논리 구조, 전문성을 계속 참고해야 합니다.
`
    : `당신은 대한민국 정부 부처 및 공공기관의 경영평가 보고서 작성을 전문으로 하는 AI 컨설턴트입니다.
아래 '기존 초안'을 '사용자 의견'에 따라 수정해주세요.`;

  return `
${sampleReportContext}

**기존 초안:**
---
${previousDraft}
---

**사용자 의견:**
"${feedback}"

**수정 가이드라인:**
1.  사용자의 의견을 명확히 반영하여 기존 초안을 개선해주세요.
2.  기존의 개조식(bullet point) 형식과 논리 구조("문제점 → 개선 활동 → 성과")를 유지해주세요.
3.  의견과 관련 없는 부분은 변경하지 마세요.
4.  기존 초안에 있던 도표/그림 제안은 유지하거나, 의견에 맞게 수정 또는 추가할 수 있습니다. 도표/그림 제안은 \`> 📊 **도표/그림 제안**\` 형식을 따라야 합니다.
5.  수정된 전체 보고서 초안을 마크다운(Markdown) 형식으로 반환해주세요.

**참고용 상세 정보:**
- 선택된 제목: ${selectedHeadline.title}
- 개선 배경 (As-Is): ${userInput.existingProblems}
- 구체적인 목표: ${userInput.goals}
- 핵심 활동: ${userInput.coreActivity}
- 혁신 수단: ${userInput.innovativeMeans}
- 추진 과정 특징: ${userInput.processCharacteristics}
- 기관의 성과 (To-Be): ${userInput.organizationalPerformance}
- 고객 체감 성과 (To-Be): ${userInput.customerPerformance}
`;
};

export const regenerateDraft = async (
  userInput: UserInput,
  selectedHeadline: Headline,
  previousDraft: string,
  feedback: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const prompt = regenerateDraftPrompt(userInput, selectedHeadline, previousDraft, feedback);

  try {
    const parts: Part[] = [{ text: prompt }];

    if (userInput.sampleReportText) {
      parts.push({
        inlineData: {
          mimeType: 'text/plain',
          data: btoa(unescape(encodeURIComponent(userInput.sampleReportText)))
        }
      });
    } else if (userInput.sampleFile) {
       parts.push({
        inlineData: {
          mimeType: userInput.sampleFile.mimeType,
          data: userInput.sampleFile.data,
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: { parts },
      config: {
        temperature: 0.5,
      },
    });

    return response.text ?? '';
  } catch (error) {
    console.error("Error regenerating draft:", error);
    if (error instanceof Error) {
      throw new Error(`초안 재작성에 실패했습니다: ${error.message}`);
    }
    throw new Error("초안 재작성 중 알 수 없는 오류가 발생했습니다.");
  }
};