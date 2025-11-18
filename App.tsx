import React, { useState, useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register ChartDataLabels plugin
Chart.register(ChartDataLabels);

// --- 1. Inlined Constants (normally in src/constants.ts) ---
const JOB_TITLES = [
    "Business Analyst",
    "Data Analyst",
    "Software Engineer",
    "Product Manager",
    "Marketing Specialist",
    "Financial Analyst",
    "Human Resources Generalist",
    "Operations Manager",
    "UI/UX Designer",
    "Cybersecurity Analyst",
    "Management Consultant",
    "Investment Banking Analyst"
];

const JOB_LEVELS = [
    "Fresher",
    "Junior",
    "Mid-Level",
    "Senior",
    "Lead",
    "Principal",
    "Director",
    "VP",
    "Executive"
];

// --- 2. Inlined Icon Components (normally in src/components/icons.tsx) ---
const LeadershipIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M10 20v-2a3 3 0 013-3h4a3 3 0 013 3v2M3 8a4 4 0 014-4h12a4 4 0 014 4v2.5M3 18v-2a3 3 0 013-3h4a3 3 0 013 3v2M12 12a3 3 0 100-6 3 3 0 000 6z"></path>
    </svg>
);

const TenureIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
    </svg>
);

const ExpertiseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
    </svg>
);

const ChartIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path>
    </svg>
);

const SkillsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
    </svg>
);

// --- 3. Updated Type Definitions (inlined, normally in src/types.ts) ---
interface SkillDistribution {
    technical_percentage: number;
    soft_percentage: number;
}

// Your API returns an array of strings for each insight category.
// We'll map these to a structure similar to your original `KeyInsight` for the UI rendering.
interface RawInsightCategory {
    title: string;
    icon: 'skills' | 'leadership' | 'tenure' | 'expertise';
    data: string[]; // This will hold the array of strings from the API
}

interface InsightData {
    job_title: string;
    career_level: string;
    skill_distribution: SkillDistribution;
    skill_requirements: string[];
    leadership_experience: string[];
    employee_tenure: string[];
    required_expertise: string[];
}

// --- 4. Inlined API Service (normally in src/services/apiService.ts) ---
async function getJobInsights(jobTitle: string, careerLevel: string): Promise<InsightData> {
    const API_BASE_URL = 'http://127.0.0.1:8000'; // Your API base URL

    try {
        const response = await fetch(`${API_BASE_URL}/insights`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                job_title: jobTitle,
                career_level: careerLevel,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `API error: ${response.statusText}`);
        }

        const data: InsightData = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching job insights:", error);
        throw error;
    }
}

// --- 5. Main App Component ---
const App: React.FC = () => {
    const [jobTitle, setJobTitle] = useState<string>(JOB_TITLES[0]);
    const [jobLevel, setJobLevel] = useState<string>(JOB_LEVELS[0]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [insights, setInsights] = useState<InsightData | null>(null);

    const chartRef = useRef<Chart | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Map for dynamic icon rendering based on the 'icon' string
    const iconMap: { [key: string]: React.FC } = {
        skills: SkillsIcon,
        leadership: LeadershipIcon,
        tenure: TenureIcon,
        expertise: ExpertiseIcon,
        chart: ChartIcon, // Added ChartIcon to the map if you want to use it dynamically
    };

    useEffect(() => {
        if (insights && canvasRef.current) {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                chartRef.current = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: ['Technical Skills', 'Soft Skills'],
                        datasets: [{
                            data: [insights.skill_distribution.technical_percentage, insights.skill_distribution.soft_percentage],
                            backgroundColor: ['rgba(56, 189, 248, 0.8)', 'rgba(113, 113, 122, 0.7)'],
                            borderColor: ['#0f172a', '#0f172a'],
                            borderWidth: 2,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: '#cbd5e1',
                                    font: { size: 14 }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context: { label: any; raw: any; }) => `${context.label}: ${context.raw}%`
                                }
                            },
                            datalabels: {
                                color: '#ffffff',
                                font: {
                                    weight: 'bold',
                                    size: 16,
                                },
                                formatter: (value: any) => `${value}%`
                            }
                        }
                    }
                });
            }
        }
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [insights]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setInsights(null);

        try {
            const data = await getJobInsights(jobTitle, jobLevel);
            setInsights(data);
        } catch (err: any) {
            console.error("Failed to fetch insights:", err);
            setError(err.message || 'Failed to fetch job insights. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Prepare insights for rendering in the same structured way as before
    const formattedKeyInsights: RawInsightCategory[] = insights ? [
        { title: "Skill Requirements", icon: "skills", data: insights.skill_requirements },
        { title: "Leadership Experience", icon: "leadership", data: insights.leadership_experience },
        { title: "Employee Tenure", icon: "tenure", data: insights.employee_tenure },
        { title: "Required Expertise", icon: "expertise", data: insights.required_expertise },
    ] : [];

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <header className="text-center mb-10">
                <div className="flex justify-center items-center gap-4 mb-4">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 14.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 15c-2.488 0-4.5-2.013-4.5-4.5s2.012-4.5 4.5-4.5c.334 0 .66.042.98.123m-12.96 8.754A4.502 4.502 0 017.5 15c-2.488 0-4.5-2.013-4.5-4.5S5.012 6 7.5 6c1.554 0 2.94.788 3.75 2"></path>
                    </svg>
                     <h1 className="text-3xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">
                        AI Job Market Insights for College Graduate
                     </h1>
                </div>
                <p className="text-slate-400 text-lg">
                    Leverage AI to get data-driven insights on skill requirements for your dream job.
                    
                </p>
            </header>

            <main>
                <div className="bg-slate-800/50 p-6 md:p-8 rounded-xl shadow-lg border border-slate-700">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="jobTitle" className="block text-sm font-medium text-slate-300 mb-2">Job Title</label>
                                <select 
                                    id="jobTitle" 
                                    name="jobTitle" 
                                    value={jobTitle}
                                    onChange={(e: { target: { value: any; }; }) => setJobTitle(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:opacity-50"
                                >
                                    {JOB_TITLES.map(title => <option key={title} value={title}>{title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="jobLevel" className="block text-sm font-medium text-slate-300 mb-2">Career Level</label>
                                <select 
                                    id="jobLevel" 
                                    name="jobLevel" 
                                    value={jobLevel}
                                    onChange={(e: { target: { value: any; }; }) => setJobLevel(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition disabled:opacity-50"
                                >
                                    {JOB_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                                </select>
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full flex justify-center items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                            </svg>
                            <span>{isLoading ? 'Generating...' : 'Generate Insights'}</span>
                        </button>
                    </form>
                </div>

                <div className="mt-10">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center p-8 space-y-4">
                            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-cyan-500"></div>
                            <p className="text-slate-400 text-lg">Analyzing job market data...</p>
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg text-center animate-fade-in">
                           {error}
                        </div>
                    )}
                    {!isLoading && !insights && !error && (
                        <div className="text-center text-slate-500 p-8 border-2 border-dashed border-slate-700 rounded-lg">
                            <p>Select a job title and level to generate your personalized market analysis.</p>
                        </div>
                    )}
                    {insights && (
                        <div className="animate-fade-in">
                             <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700 flex flex-col items-center mb-8">
                                 <div className="flex items-center gap-4 mb-4">
                                     <div className="bg-slate-700 p-3 rounded-full">
                                         {/* Using ChartIcon directly or from map if preferred */}
                                         <ChartIcon />
                                     </div>
                                     <h3 className="text-lg font-bold text-slate-200">Skill Distribution</h3>
                                 </div>
                                 <div className="relative w-full max-w-xs mx-auto">
                                     <canvas ref={canvasRef}></canvas>
                                 </div>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {formattedKeyInsights.map((insight: RawInsightCategory) => {
                                    const IconComponent = iconMap[insight.icon];
                                    // No need to split by '*' anymore, as the API returns an array of strings directly
                                    const points = insight.data; 

                                    return (
                                        <div key={insight.title} className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700 flex flex-col">
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="bg-slate-700 p-3 rounded-full">
                                                    <IconComponent />
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-200">{insight.title}</h3>
                                            </div>
                                            <ul className="text-slate-400 list-disc list-inside space-y-2 pl-2 flex-grow">
                                                {points.map((point: string, index: number) => <li key={index}>{point}</li>)}
                                            </ul>
                                        </div>
                                    );
                                })}
                             </div>
                        </div>
                    )}
                </div>
            </main>
           

<footer className="bg-white rounded-lg shadow-sm m-4 dark:bg-gray-800">
    <div className="w-full mx-auto max-w-screen-xl p-4 md:flex md:items-center md:justify-between">
      <span className="text-sm text-gray-500 sm:text-center dark:text-gray-400">© 2025 <a href="https://ai-job-insight-sigma.vercel.app/" className="hover:underline">ETAMU BUSA 521 Group 1</a>. All Rights Reserved.
    </span>
    <ul className="flex flex-wrap items-center mt-3 text-sm font-medium text-gray-500 dark:text-gray-400 sm:mt-0">
        <li>
            <a href="#" className="hover:underline me-4 md:me-6">About</a>
        </li>
        <li>
            <a href="#" className="hover:underline me-4 md:me-6">Privacy Policy</a>
        </li>
        <li>
            <a href="#" className="hover:underline me-4 md:me-6">Licensing</a>
        </li>
        <li>
            <a href="#" className="hover:underline">Contact</a>
        </li>
    </ul>
    </div>
</footer>

        </div>
    );
};

export default App;