import React, { useState, useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { JOB_TITLES, JOB_LEVELS } from './constants';
import { generateInsights } from './services/geminiService';
import type { InsightData, KeyInsight } from './types';
import { LeadershipIcon, TenureIcon, ExpertiseIcon, ChartIcon, SkillsIcon } from './components/icons';

Chart.register(ChartDataLabels);

const iconMap: { [key in KeyInsight['icon']]: React.FC } = {
    skills: SkillsIcon,
    leadership: LeadershipIcon,
    tenure: TenureIcon,
    expertise: ExpertiseIcon,
};

const App: React.FC = () => {
    const [jobTitle, setJobTitle] = useState<string>(JOB_TITLES[0]);
    const [jobLevel, setJobLevel] = useState<string>(JOB_LEVELS[0]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [insights, setInsights] = useState<InsightData | null>(null);

    const chartRef = useRef<Chart | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
                            data: [insights.skillDistribution.technical, insights.skillDistribution.soft],
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
                                    label: (context) => `${context.label}: ${context.raw}%`
                                }
                            },
                            datalabels: {
                                color: '#ffffff',
                                font: {
                                    weight: 'bold',
                                    size: 16,
                                },
                                formatter: (value) => `${value}%`
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
            const data = await generateInsights(jobTitle, jobLevel);
            setInsights(data);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
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
                     <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">
                        AI Job Market Insights for College Graduate
                     </h1>
                </div>
                <p className="text-slate-400 text-lg">
                    Leverage AI to get data-driven insights on skill requirements for your dream job.
                    Note: This is a class project for BUSA 521 developed and maintained by Sujata Adhikari.
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
                                    onChange={(e) => setJobTitle(e.target.value)}
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
                                    onChange={(e) => setJobLevel(e.target.value)}
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
                                         <ChartIcon />
                                     </div>
                                     <h3 className="text-lg font-bold text-slate-200">Skill Distribution</h3>
                                 </div>
                                 <div className="relative w-full max-w-xs mx-auto">
                                     <canvas ref={canvasRef}></canvas>
                                 </div>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {insights.keyInsights.map((insight) => {
                                    const IconComponent = iconMap[insight.icon];
                                    const points = insight.text.split('*').map(s => s.trim()).filter(Boolean);

                                    return (
                                        <div key={insight.title} className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700 flex flex-col">
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="bg-slate-700 p-3 rounded-full">
                                                    <IconComponent />
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-200">{insight.title}</h3>
                                            </div>
                                            <ul className="text-slate-400 list-disc list-inside space-y-2 pl-2 flex-grow">
                                                {points.map((point, index) => <li key={index}>{point}</li>)}
                                            </ul>
                                        </div>
                                    );
                                })}
                             </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;

