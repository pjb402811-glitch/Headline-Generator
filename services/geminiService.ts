import { GoogleGenAI, Type, Part } from "@google/genai";
import type { UserInput, HeadlineResult, Headline, DraftStyle } from "../types";
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
첨부된 모범 답안 샘플 보고서 (참고용)
위 샘플 보고서를 최고 수준의 모범 답안으로 참고하여, 아래 상세 정보를 바탕으로 샘플과 비슷한 스타일, 논리 구조, 전문성을 갖춘 보고서 초안을 작성해주세요.
`
    : `당신은 대한민국 정부 부처 및 공공기관의 경영평가 보고서 작성을 전문으로 하는 AI 컨설턴트입니다.
아래에 제공된 상세 정보와 선택된 제목을 바탕으로, 보고서 초안을 작성해주세요.`;

  return `
${sampleReportContext}

상세 정보:
- 선택된 제목 (주제목): ${selectedHeadline.title}
- 제목 생성 전략: ${selectedHeadline.strategy}
- 주요 고객 (내부): ${userInput.internalCustomer}
- 주요 고객 (외부): ${userInput.externalCustomer}
- 개선 배경 (As-Is): ${userInput.existingProblems}
- 구체적인 목표: ${userInput.goals}
- 핵심 활동: ${userInput.coreActivity}
- 혁신 수단: ${userInput.innovativeMeans}
- 추진 과정 특징: ${userInput.processCharacteristics}
- 기관의 성과 (To-Be): ${userInput.organizationalPerformance}
- 고객 체감 성과 (To-Be): ${userInput.customerPerformance}

작성 가이드라인:
1.  보고서 초안의 가독성을 높이기 위해, 아래의 번호와 기호 체계를 엄격하게 준수하여 작성해주세요. (Markdown의 '#', '**' 등은 사용하지 마세요.)
2.  주제목: "【 주제목 】" 형식으로, 이미 제공된 '선택된 제목 (주제목)'을 괄호 안에 넣어 사용합니다. (예: 【 스마트 재난관리로 멈춤 없는 고속도로 구현 】)
3.  부제목: 주제목 아래에, "< 부제목 >" 형식으로 전체 내용을 함축하는 1~2줄의 설득력 있는 부제목을 생성합니다. (예: < IoT, AI 기반 예측적 재난대응 체계 구축으로 국민 안전 확보 및 운행 안정성 제고 >)
4.  내용: "1. 추진배경", "2. 주요 내용", "3. 주요 성과"와 같이 번호가 매겨진 항목으로 구분합니다.
5.  각 항목의 세부 내용은 'ㅇ' 또는 ' - ' 기호를 사용하여 간결한 개조식(bullet point) 형태로 요약합니다.
6.  내용은 "문제점 → 개선 활동 → 정량/정성적 성과"의 논리 구조가 드러나도록 작성하고, 가능한 한 구체적인 데이터를 포함해주세요.
7.  문장 종결 방식: 문장은 '~했습니다'와 같은 서술형 어미 대신, '~함, ~음, ~추진, ~시행, ~구축, ~강화' 등과 같이 명사형으로 간결하게 종결하여 보고서의 전문성을 높여주세요.
8.  각 항목("1. 추진배경", "2. 주요 내용", "3. 주요 성과")별로 핵심 내용을 효과적으로 시각화할 수 있는 도표나 그림(예: 문제점 분석도, As-Is vs. To-Be 비교표, 성과 그래프 등)을 구체적으로 제안해주세요.
9.  도표/그림 제안은 반드시 \`[도표/그림 제안]\` 형식으로 시작하며, 유형, 제목, 설명을 포함해야 합니다.

출력 지침:
절대 서론, 인사말, 또는 "네, AI 컨설턴트로서..." 와 같은 불필요한 내용은 포함하지 말고, 보고서 초안 내용만 바로 생성해주세요.
`;
};

export const writeDraft = async (
  userInput: UserInput,
  selectedHeadline: Headline
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const prompt = writeDraftPrompt(userInput, selectedHeadline);

  const parts: Part[] = [{ text: prompt }];

  if (userInput.sampleFile && userInput.sampleFile.data) {
    parts.unshift({
      inlineData: {
        mimeType: userInput.sampleFile.mimeType,
        data: userInput.sampleFile.data,
      },
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        temperature: 0.7,
      },
    });

    const draft = response.text;
    if (!draft) {
      throw new Error("AI가 유효한 초안을 생성하지 못했습니다.");
    }
    return draft.trim();
  } catch (error) {
    console.error("Error writing draft:", error);
    if (error instanceof Error) {
        throw new Error(`AI 초안 작성에 실패했습니다: ${error.message}`);
    }
    throw new Error("AI 초안 작성 중 알 수 없는 오류가 발생했습니다.");
  }
};

const regenerateDraftPrompt = (
  userInput: UserInput,
  selectedHeadline: Headline,
  previousDraft: string,
  feedback: string
): string => `
당신은 대한민국 정부 부처 및 공공기관의 경영평가 보고서 작성을 전문으로 하는 AI 컨설턴트입니다.
아래에 제공된 기존 보고서 초안과 사용자의 피드백을 바탕으로 초안을 수정해주세요.

기존 보고서 초안:
---
${previousDraft}
---

사용자 피드백:
"${feedback}"

작성 가이드라인:
1.  사용자의 피드백을 **최대한 충실하게** 반영하여 내용을 수정하거나 보강해주세요.
2.  보고서의 전체적인 논리 구조("문제점 → 개선 활동 → 성과")와 전문적인 톤앤매너는 유지해주세요.
3.  수정된 초안도 기존과 동일한 번호 및 기호 체계(【】, <>, 1., ㅇ 등)를 엄격히 준수해야 합니다.
4.  문장 종결 방식은 '~함, ~음, ~추진' 등 명사형으로 간결하게 유지해주세요.
5.  수정된 내용에 맞춰, 필요하다면 새로운 [도표/그림 제안]을 추가하거나 기존 제안을 수정해주세요.
6.  마크다운 형식 ('#', '**' 등)은 절대 사용하지 마세요.

출력 지침:
절대 서론, 인사말, 또는 "네, AI 컨설턴트로서..." 와 같은 불필요한 내용은 포함하지 말고, 수정된 보고서 초안 내용만 바로 생성해주세요.
`;

export const regenerateDraft = async (
  userInput: UserInput,
  selectedHeadline: Headline,
  previousDraft: string,
  feedback: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const prompt = regenerateDraftPrompt(
    userInput,
    selectedHeadline,
    previousDraft,
    feedback
  );
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    const newDraft = response.text;
    if (!newDraft) {
      throw new Error("AI가 유효한 수정 초안을 생성하지 못했습니다.");
    }
    return newDraft.trim();
  } catch (error) {
    console.error("Error regenerating draft:", error);
    if (error instanceof Error) {
        throw new Error(`AI 초안 재작성에 실패했습니다: ${error.message}`);
    }
    throw new Error("AI 초안 재작성 중 알 수 없는 오류가 발생했습니다.");
  }
};

const regenerateMoreHeadlinesPrompt = (userInput: UserInput, existingResults: HeadlineResult[]): string => {
  const existingTitles = existingResults.flatMap(result => result.headlines.map(h => h.title)).join(', ');

  return `
당신은 대한민국 정부 부처 및 공공기관의 경영평가 보고서 작성을 전문으로 하는 AI 카피라이터입니다.
아래에 제공된 상세 정보를 바탕으로, 각 16가지 유형별로 창의적이고 설득력 있는 보고서 제목(헤드라인)을 **각각 1개씩 추가**로 생성해주세요.

**중요: 이미 생성된 다음 제목들과는 다른 내용으로 생성해야 합니다:**
${existingTitles}

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
- 전체 결과는 반드시 아래의 JSON 스키마를 엄격히 준수하는 JSON 배열 형식으로 반환해야 합니다. 각 배열 요소는 하나의 제목 유형에 대한 결과를 담고 있으며, 'type'과 'headlines' 필드를 가져야 합니다. headlines 배열에는 **하나의 제목만** 포함되어야 합니다.
`;
};

const singleHeadlineResultSchema = {
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
        maxItems: 1,
        minItems: 1,
      },
    },
    required: ["type", "headlines"],
  },
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
        responseSchema: singleHeadlineResultSchema,
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
      throw new Error(`AI 추가 제목 생성에 실패했습니다: ${error.message}`);
    }
    throw new Error("AI 추가 제목 생성 중 알 수 없는 오류가 발생했습니다.");
  }
};

const changeDraftStylePrompt = (originalDraft: string, styleId: DraftStyle): string => {
  let styleDescription = '';
  switch (styleId) {
    case '스토리텔링형':
      styleDescription = `
**변경 스타일: 스토리텔링형**
- 기존 초안을 바탕으로 문제 제기(어려움), 극복 과정(노력과 혁신), 성공적인 결과(성과)가 명확히 드러나는 이야기 형식으로 재구성합니다.
- 각 단락이 자연스럽게 연결되어 설득력 있는 스토리를 전달해야 합니다.
- **중요:** 문장은 '~했습니다'와 같은 서술형이 아닌, '~함, ~음, ~추진' 등 명사형으로 간결하게 종결하여 보고서의 전문성을 유지해야 합니다.
- 번호 체계는 원본 초안의 개조식 스타일을 그대로 유지합니다.
`;
      break;
    case '성과 강조형':
      styleDescription = `
**변경 스타일: 성과 강조형**
- 보고서의 구조를 "3. 주요 성과" 항목이 가장 먼저 오도록 변경합니다. (성과 → 배경 → 내용 순서)
- 가장 핵심적이고 인상적인 성과를 부각하여 보고서의 도입부를 구성합니다.
- 나머지 내용(추진배경, 주요 내용)은 성과를 뒷받침하는 근거로 재구성합니다.
- **중요:** 문장은 '~했습니다'와 같은 서술형이 아닌, '~함, ~음, ~추진' 등 명사형으로 간결하게 종결하여 보고서의 전문성을 유지해야 합니다.
- 번호 체계는 원본 초안의 개조식 스타일을 그대로 유지합니다.
`;
      break;
    default:
      styleDescription = '기존 스타일을 유지합니다.';
      break;
  }

  return `
당신은 대한민국 정부 부처 및 공공기관의 경영평가 보고서 작성을 전문으로 하는 AI 컨설턴트입니다.
아래에 제공된 기존 보고서 초안을 지시된 스타일로 재작성해주세요.

**기존 보고서 초안:**
---
${originalDraft}
---

**재작성 지시:**
${styleDescription}

**공통 가이드라인:**
- 보고서의 핵심 내용, 데이터, 논리 구조는 유지해야 합니다.
- 원본의 번호 및 기호 체계(【】, <>, 1., ㅇ 등)를 최대한 유지하되, 스타일 변경에 따라 자연스럽게 수정될 수 있습니다.
- 마크다운 형식 ('#', '**' 등)은 절대 사용하지 마세요.

출력 지침:
절대 서론, 인사말, 또는 "네, 알겠습니다." 와 같은 불필요한 내용은 포함하지 말고, 재작성된 보고서 초안 내용만 바로 생성해주세요.
`;
};

export const changeDraftStyle = async (
  originalDraft: string,
  styleId: DraftStyle
): Promise<string> => {
  if (styleId === '개조식 요약형') return originalDraft;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const prompt = changeDraftStylePrompt(originalDraft, styleId);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.6,
      },
    });

    const newDraft = response.text;
    if (!newDraft) {
      throw new Error("AI가 유효한 스타일 변경 초안을 생성하지 못했습니다.");
    }
    return newDraft.trim();
  } catch (error) {
    console.error("Error changing draft style:", error);
    if (error instanceof Error) {
      throw new Error(`AI 초안 스타일 변경에 실패했습니다: ${error.message}`);
    }
    throw new Error("AI 초안 스타일 변경 중 알 수 없는 오류가 발생했습니다.");
  }
};