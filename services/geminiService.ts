import { GoogleGenAI, Type } from "@google/genai";
import type { InsightData, KeyInsight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    skillDistribution: {
      type: Type.OBJECT,
      properties: {
        technical: {
          type: Type.NUMBER,
          description: "Percentage of technical skills required (0-100).",
        },
        soft: {
          type: Type.NUMBER,
          description: "Percentage of soft skills required (0-100).",
        },
      },
      required: ["technical", "soft"],
    },
    keyInsights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          icon: {
            type: Type.STRING,
            enum: ["skills", "leadership", "tenure", "expertise"],
            description: "An icon name: 'skills', 'leadership', 'tenure', or 'expertise'. The array must contain one object for each icon type."
          },
          text: {
            type: Type.STRING,
            description: "A detailed list of insights. Each point should be on a new line, starting with an asterisk and a space ('* ').",
          },
        },
        required: ["icon", "text"],
      },
    },
  },
  required: ["skillDistribution", "keyInsights"],
};


export async function generateInsights(
  jobTitle: string,
  jobLevel: string
): Promise<InsightData> {
  const prompt = `
    Analyze the current job market for a ${jobLevel} ${jobTitle}.
    Provide a detailed analysis covering the following areas:
    1.  **Skill Distribution**: Estimate the percentage split between technical skills and soft skills. The sum must be 100.
    2.  **Key Insights**: Generate exactly four key insights, one for each of the following categories. For each insight, provide the corresponding icon name and detailed text. Format all text answers as a bulleted list string, with each point on a new line starting with an asterisk and a space ('* ').Please write it in this format for each line: e.g, 99% of this job title require SQL, 80% of this job title require python.
        - For icon 'skills': What are the key technical and soft skills? 
        - For icon 'leadership': What are the expectations regarding leadership and initiative?
        - For icon 'tenure': What is the typical employee tenure for this role before promotion or moving to another company?
        - For icon 'expertise': What are the core technical and theoretical knowledge requirements and what is the industry demand?

    Format the entire output as a single JSON object that strictly adheres to the provided schema. Do not include any markdown formatting like \`\`\`json. The 'keyInsights' array must contain exactly four objects, one for each icon type.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text.trim();
    const data = JSON.parse(jsonText);

    if (!data.skillDistribution || !data.keyInsights || data.keyInsights.length < 4) {
        throw new Error("Invalid data structure received from API.");
    }
    
    const insightTitles: { [key: string]: string } = {
        skills: "Skill Requirements",
        leadership: "Leadership Experience",
        tenure: "Employee Tenure",
        expertise: "Required Expertise"
    };

    // FIX: Explicitly type the Map to ensure `insightsMap.get()` returns a correctly typed object.
    // This allows TypeScript to narrow the type after the null check, resolving the "Spread types may only be created from object types" error.
    const insightsMap = new Map<KeyInsight['icon'], Omit<KeyInsight, 'title'>>(
        data.keyInsights.map((k: Omit<KeyInsight, 'title'>) => [k.icon, k])
    );

    const orderedIcons: Array<KeyInsight['icon']> = ['skills', 'leadership', 'tenure', 'expertise'];
    
    const orderedInsights = orderedIcons.map(icon => {
        const insight = insightsMap.get(icon);
        if (!insight) return null;
        return {
            ...insight,
            title: insightTitles[icon] // Manually assign the title
        };
    }).filter(Boolean) as KeyInsight[];
    
    if (orderedInsights.length < 4) {
         throw new Error("API did not return all required key insights.");
    }
    data.keyInsights = orderedInsights;


    const total = data.skillDistribution.technical + data.skillDistribution.soft;
    if (total > 0 && total !== 100) {
        data.skillDistribution.technical = Math.round((data.skillDistribution.technical / total) * 100);
        data.skillDistribution.soft = 100 - data.skillDistribution.technical;
    } else if (total === 0) {
         data.skillDistribution.technical = 50;
         data.skillDistribution.soft = 50;
    }

    return data as InsightData;
  } catch (error) {
    console.error("Error generating insights:", error);
    throw new Error(
      "Failed to generate insights. The AI model may be temporarily unavailable. Please try again later."
    );
  }
}
