import { GoogleGenAI, Type } from "@google/genai";
import type { UserInput, HeadlineResult } from '../types';
import { HEADLINE_TYPES } from '../constants';

export async function generateHeadlines(apiKey: string, userInput: UserInput, attachments: { mimeType: string; data: string; name: string; }[]): Promise<HeadlineResult[]> {
  if (!apiKey) {
    throw new Error('Google AI API Key가 설정되지 않았습니다. 설정에서 Key를 입력해주세요.');
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey });

    const textPrompt = `
    You are a 'Headline Strategist', an expert AI assistant for public institution report writers in South Korea. Your goal is to generate fresh, persuasive, and clear headlines for management evaluation committee reports.
    
    The user will provide the following key pieces of information:
    1. National Objective (국정 목표), Strategic Initiative (추진전략), National Task (국정과제)
    2. Management Evaluation Manual Index:
       - Evaluation Category (평가범주): ${userInput.evaluationCategory}
       - Evaluation Indicator (지표): ${userInput.evaluationIndicator}
       - Detailed Indicator (세부지표): ${userInput.evaluationDetailIndicator}
    3. Core Activity (핵심 활동)
    4. Innovative Means (혁신 수단)
    5. Organizational Performance (기관의 성과)
    6. Beneficiary Performance (수혜자 체감성과)
    
    If reference files are attached, please use the information within them to generate more accurate and relevant headlines reflecting the latest data and policies.

    Based on this input, your task is to generate exactly 45 headlines. These headlines must be categorized into 15 specific types, with 3 unique headlines for each type. The 15 types are: ${HEADLINE_TYPES.join(', ')}.

    For EACH of the 45 headlines, you must also provide a concise and clear explanation in Korean of the evaluation factors it emphasizes and the strategic intent behind it. This explanation should help the user understand why the headline is effective.

    The final output MUST be a JSON object that strictly adheres to the provided schema. Do not include any text outside of the JSON structure.

    User Input:
    - National Objective: ${userInput.nationalObjective}
    - Strategic Initiative: ${userInput.strategicInitiative}
    - National Task: ${userInput.nationalTask}
    - Evaluation Category: ${userInput.evaluationCategory}
    - Evaluation Indicator: ${userInput.evaluationIndicator}
    - Detailed Indicator: ${userInput.evaluationDetailIndicator}
    - Core Activity: ${userInput.coreActivity}
    - Innovative Means: ${userInput.innovativeMeans}
    - Organizational Performance: ${userInput.organizationalPerformance}
    - Beneficiary Performance: ${userInput.beneficiaryPerformance}

    Generate the 45 headlines now.
    `;
    
    const parts: any[] = [{ text: textPrompt }];
    if (attachments && attachments.length > 0) {
      attachments.forEach(attachment => {
        parts.push({
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.data,
          },
        });
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description: `The Korean type of the headline (one of: ${HEADLINE_TYPES.join(', ')})`,
              },
              headlines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: 'The generated headline in Korean.',
                    },
                    strategy: {
                      type: Type.STRING,
                      description: 'The explanation in Korean of the strategy and emphasized evaluation factors.',
                    },
                  },
                  required: ["title", "strategy"],
                },
              },
            },
            required: ["type", "headlines"],
          },
        },
      },
    });
    
    if (!response.text) {
      throw new Error("API 응답에서 텍스트를 찾을 수 없습니다. 잠시 후 다시 시도해주세요.");
    }

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);

    if (!Array.isArray(result) || result.length === 0) {
      throw new Error("API returned an empty or invalid result.");
    }

    return result as HeadlineResult[];
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
          throw new Error('Google AI API Key가 잘못되었거나 설정되지 않았습니다. 설정을 확인해주세요.');
        }
        throw new Error(`제목 생성 실패: ${error.message}`);
    }
    throw new Error("제목 생성에 실패했습니다. 입력값을 확인하고 다시 시도해주세요.");
  }
}