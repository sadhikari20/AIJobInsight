export interface SkillDistribution {
  technical: number;
  soft: number;
}

export interface KeyInsight {
  title: string;
  icon: 'skills' | 'leadership' | 'tenure' | 'expertise';
  text: string;
}

export interface InsightData {
  skillDistribution: SkillDistribution;
  keyInsights: KeyInsight[];
}