// src/types.ts

export interface KeyInsight {
    title: string;
    text: string;
    icon: 'skills' | 'leadership' | 'tenure' | 'expertise';
}

export interface SkillDistribution {
    technical: number;
    soft: number;
}

export interface InsightData {
    jobTitle: string;
    careerLevel: string;
    skillDistribution: SkillDistribution;
    keyInsights: KeyInsight[];
}