from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import re
from collections import Counter
import os # To handle file paths

app = FastAPI()

# Allow CORS for your UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to your UI's origin in production (e.g., "http://localhost:8000")
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Define Column Mappings ---
# IMPORTANT: These keys MUST EXACTLY match the column headers in your job_dataset.csv
COLUMN_MAPPING = {
    "Title": "job_title",             # Your CSV has "Title"
    "ExperienceLevel": "career_level",# Your CSV has "ExperienceLevel"
    "Skills": "required_skills",      # Your CSV has "Skills"
    "Responsibilities": "job_description", # Your CSV has "Responsibilities" (mapping to generic 'job_description')
    "Keywords": "expertise_areas",    # Your CSV has "Keywords" (mapping to generic 'expertise_areas')
    # Assuming 'Leadership Keywords' and 'Employee Tenure Info' will be extracted from 'Responsibilities' or 'Keywords' if not explicitly present
    # For now, let's derive them or use placeholders if not directly available.
    # The 'job_description' and 'expertise_areas' (from 'Keywords') are rich enough to get most insights.
}

# --- File Path ---
DATA_FILE_PATH = "./data/job_dataset.csv"

# Initialize empty DataFrame globally
df = pd.DataFrame() 

def load_data():
    global df
    try:
        if not os.path.exists(DATA_FILE_PATH):
            print(f"Error: Data file not found at {DATA_FILE_PATH}")
            raise FileNotFoundError(f"Data file not found at {DATA_FILE_PATH}")

        temp_df = pd.read_csv(DATA_FILE_PATH)
        print(f"Original columns loaded: {temp_df.columns.tolist()}")
        
        # Rename columns based on mapping
        columns_to_rename = {k: v for k, v in COLUMN_MAPPING.items() if k in temp_df.columns}
        if columns_to_rename:
            temp_df.rename(columns=columns_to_rename, inplace=True)
            print(f"Columns after renaming: {temp_df.columns.tolist()}")
        else:
            print("Warning: No columns matched for renaming based on COLUMN_MAPPING. Check CSV headers.")

        # Ensure all *internal* required columns exist after renaming.
        # Create 'leadership_keywords' and 'tenure_info' by deriving from 'job_description'
        # if they are not directly mapped.
        required_internal_columns = ["job_title", "career_level", "job_description", "required_skills"]
        for col in required_internal_columns:
            if col not in temp_df.columns:
                print(f"Error: Required internal column '{col}' is missing after mapping. Please adjust COLUMN_MAPPING.")
                raise KeyError(f"Required internal column '{col}' is missing. Check COLUMN_MAPPING and CSV headers.")
            temp_df[col] = temp_df[col].astype(str).fillna('') # Fill NaN with empty string and convert to str

        # Handle 'expertise_areas' (mapped from 'Keywords')
        if "expertise_areas" not in temp_df.columns:
            print("Warning: 'expertise_areas' (from 'Keywords') not found. Adding empty column.")
            temp_df["expertise_areas"] = ''
        temp_df["expertise_areas"] = temp_df["expertise_areas"].astype(str).fillna('')


        # --- Deriving 'leadership_keywords' and 'tenure_info' from other columns ---
        # If 'Leadership Keywords' or 'Employee Tenure Info' are not in the original CSV,
        # we can try to extract/generate them from 'Responsibilities' or 'Keywords'.
        if "leadership_keywords" not in temp_df.columns:
            print("Deriving 'leadership_keywords' from 'job_description' (Responsibilities)...")
            leadership_patterns = r'lead|manage|mentor|guide|collaborate|team|coordinate|supervise|stakeholder|present findings|drive strategic'
            temp_df['leadership_keywords'] = temp_df['job_description'].apply(lambda x: "; ".join(re.findall(leadership_patterns, x, re.IGNORECASE)))
            temp_df['leadership_keywords'] = temp_df['leadership_keywords'].fillna('') # Fill if no matches

        if "tenure_info" not in temp_df.columns:
            print("Deriving 'tenure_info' from 'job_description' (Responsibilities)...")
            tenure_patterns = r'tenure|years of experience|career path|promotion|growth opportunities|learning culture|entry-level'
            temp_df['tenure_info'] = temp_df['job_description'].apply(lambda x: "; ".join(re.findall(tenure_patterns, x, re.IGNORECASE)))
            # Additionally, use YearsOfExperience if available
            if "YearsOfExperience" in COLUMN_MAPPING.keys(): # Check original, not mapped
                 original_years_col = [k for k,v in COLUMN_MAPPING.items() if v == "years_of_experience"]
                 if original_years_col and original_years_col[0] in temp_df.columns:
                    temp_df['tenure_info'] = temp_df.apply(lambda row: row['tenure_info'] + (f"; {row[original_years_col[0]]} years experience" if pd.notna(row[original_years_col[0]]) else ""), axis=1)

            temp_df['tenure_info'] = temp_df['tenure_info'].fillna('') # Fill if no matches


        df = temp_df # Assign to global DataFrame after successful processing
        print(f"Successfully loaded and mapped data from {DATA_FILE_PATH}. DataFrame shape: {df.shape}")

    except FileNotFoundError as e:
        print(e)
        df = pd.DataFrame(columns=list(COLUMN_MAPPING.values()) + ["leadership_keywords", "tenure_info"]) # Ensure all internal columns are present
    except KeyError as e:
        print(f"Critical data loading error: {e}. Please correct your CSV column headers or COLUMN_MAPPING.")
        df = pd.DataFrame(columns=list(COLUMN_MAPPING.values()) + ["leadership_keywords", "tenure_info"])
    except Exception as e:
        print(f"An unexpected error occurred during data loading: {e}")
        df = pd.DataFrame(columns=list(COLUMN_MAPPING.values()) + ["leadership_keywords", "tenure_info"])

# Load data when the application starts
load_data()


class JobRequest(BaseModel):
    job_title: str = 'Business Analyst'
    career_level: str = 'Entry Level'

@app.post("/insights")
async def get_job_insights(request: JobRequest):
    if df.empty:
        load_data() # Attempt to reload
        if df.empty:
            raise HTTPException(status_code=500, detail="Data could not be loaded into DataFrame. Please check the 'data' folder and 'job_dataset.csv' file, and the COLUMN_MAPPING in main.py. Check server console for more details.")

    job_title_input = request.job_title
    career_level_input = request.career_level

    filtered_jobs = df[
        (df['job_title'].str.lower() == job_title_input.lower()) &
        (df['career_level'].str.lower() == career_level_input.lower())
    ]

    if filtered_jobs.empty:
        raise HTTPException(status_code=404, detail=f"No job postings found for '{job_title_input}' at '{career_level_input}' level. Please check job title/level or try different inputs.")

    # Aggregate information from filtered jobs
    all_job_descriptions = ". ".join(filtered_jobs['job_description'].tolist())
    all_required_skills = ", ".join(filtered_jobs['required_skills'].tolist())
    all_leadership_keywords = ", ".join(filtered_jobs['leadership_keywords'].tolist())
    all_tenure_info = ". ".join(filtered_jobs['tenure_info'].tolist())
    all_expertise_areas = ", ".join(filtered_jobs['expertise_areas'].tolist())

    # --- Insight Generation Logic (Deterministic and data-driven) ---

    # 1. Skill Distribution (Technical vs. Soft Skills)
    technical_skill_keywords = [
        'Python', 'R', 'SQL', 'scikit-learn', 'TensorFlow', 'Keras', 'PyTorch', 'Pandas', 'NumPy',
        'Matplotlib', 'Seaborn', 'Excel', 'Tableau', 'Power BI', 'ETL', 'API', 'Git', 'AWS', 'Azure',
        'GCP', 'Spark', 'Hadoop', 'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
        'Statistics', 'Algorithms', 'Data Structures', 'C++', 'Java', 'JavaScript', 'SQL Server',
        'MySQL', 'PostgreSQL', 'MongoDB', 'Data Warehousing', 'Big Data', 'Data Engineering', 'Data Mining',
        'Predictive Modeling', 'Time Series Analysis', 'A/B Testing', 'Experiment Design', 'Reinforcement Learning',
        'Spring Boot', 'REST APIs', 'Object-Oriented Design', 'Web Development', 'Cloud Fundamentals', 'Debugging',
        '.NET', 'C#', 'VB.NET', '.NET Framework', '.NET Core', 'ASP.NET', 'MVC', 'HTML', 'CSS', 'LINQ', 'Visual Studio', 'Unit Testing' # Added from your .NET example
    ]
    soft_skill_keywords = [
        'Communication', 'Problem-Solving', 'Critical Thinking', 'Teamwork', 'Collaboration', 'Leadership',
        'Mentoring', 'Presentation Skills', 'Stakeholder Management', 'Strategic Thinking', 'Adaptability',
        'Creativity', 'Attention to Detail', 'Initiative', 'Agile', 'Project Management', 'Business Acumen',
        'Data Storytelling', 'Client Facing', 'Cross-functional', 'Reporting', 'Market Research', 'User Stories',
        'Product Management', 'JIRA', 'Assist', 'Learn', 'Support', 'Participate', 'Follow best practices', 'Solve issues' # Added from your .NET responsibilities
    ]

    tech_score = 0
    for keyword in technical_skill_keywords:
        tech_score += len(re.findall(r'\b' + re.escape(keyword) + r'\b', all_required_skills, re.IGNORECASE))

    soft_score = 0
    for keyword in soft_skill_keywords:
        soft_score += len(re.findall(r'\b' + re.escape(keyword) + r'\b', all_required_skills, re.IGNORECASE))

    total_score = tech_score + soft_score

    tech_percentage = round((tech_score / total_score * 100)) if total_score > 0 else 50
    soft_percentage = 100 - tech_percentage

    # 2. Skill Requirements
    # Skills are semicolon-separated in your CSV
    raw_skills = [s.strip() for s in all_required_skills.replace(';', ',').split(',') if s.strip()]
    skill_counts = Counter(raw_skills)
    
    skill_requirements_bullets = []
    
    if skill_counts:
        most_common_skills = [skill for skill, count in skill_counts.most_common(3)]
        if most_common_skills:
            skill_requirements_bullets.append(f"Key skills frequently mentioned include: {', '.join(most_common_skills)}.")

        for keyword in ['Python', 'SQL', 'Tableau', 'Power BI', 'Machine Learning', 'Statistics', 'Java', 'REST APIs', 'Agile', 'Excel', 'R', 'C#', '.NET Core', 'ASP.NET', 'MVC']:
            if any(re.search(r'\b' + re.escape(keyword) + r'\b', skill, re.IGNORECASE) for skill in raw_skills):
                 if not any(f"Proficiency in {keyword}" in s for s in skill_requirements_bullets):
                    skill_requirements_bullets.append(f"Proficiency in {keyword} is highly valued for this role.")

        if re.search(r'\bdata analysis\b|\banalytical skills\b|\bproblem-solving\b', all_job_descriptions, re.IGNORECASE):
            skill_requirements_bullets.append("Strong analytical abilities for data interpretation and problem-solving are essential.")
        if re.search(r'\bcommunication\b|\bpresent\b', all_job_descriptions, re.IGNORECASE):
            skill_requirements_bullets.append("Effective communication and presentation skills are crucial for conveying insights to stakeholders.")
        if re.search(r'\bteamwork\b|\bcollaboration\b', all_job_descriptions, re.IGNORECASE):
            skill_requirements_bullets.append("Ability to work effectively in a team-oriented and collaborative environment is often sought.")
    
    if not skill_requirements_bullets:
        skill_requirements_bullets.append(f"Specific skill requirements for {job_title_input} at {career_level_input} level will vary, but a strong analytical and technical foundation is generally expected.")


    # 3. Leadership Experience (Now primarily derived from 'Responsibilities')
    leadership_bullets = []
    
    # Analyze 'all_job_descriptions' for leadership indicators
    if re.search(r'\b(lead|manage|drive strategic)\b', all_job_descriptions, re.IGNORECASE):
        leadership_bullets.append("Opportunities to lead small projects or initiatives and drive strategic decisions may be available.")
    if re.search(r'\b(mentor|support senior|guide|supervise)\b', all_job_descriptions, re.IGNORECASE):
        leadership_bullets.append("Expect to support or mentor junior team members as you gain experience.")
    if re.search(r'\b(collaborate|team|cross-functional|coordinate)\b', all_job_descriptions, re.IGNORECASE):
        leadership_bullets.append("Strong collaboration skills are necessary for working with cross-functional teams and stakeholders.")
    if re.search(r'\b(present findings|report|communicate effectively)\b', all_job_descriptions, re.IGNORECASE):
        leadership_bullets.append("You will be expected to present findings, report progress, and communicate effectively to stakeholders.")
    if re.search(r'\b(assist in|learn and apply|support team|participate in|follow best practices)\b', all_job_descriptions, re.IGNORECASE):
        leadership_bullets.append("Roles often involve assisting in tasks, learning new concepts, and supporting the team in various initiatives, indicating a growth-oriented environment.")


    if not leadership_bullets:
        leadership_bullets.append(f"{career_level_input} {job_title_input} roles typically focus on individual contribution, with increasing opportunities for leadership and mentorship as experience grows.")


    # 4. Employee Tenure (Now primarily derived from 'Responsibilities' and 'YearsOfExperience')
    tenure_bullets = []
    
    # Analyze 'all_job_descriptions' for tenure indicators
    if re.search(r'\b(typical tenure|average tenure)\b', all_job_descriptions, re.IGNORECASE):
        tenure_info_phrases = re.findall(r'\b(typical tenure \d+\.?\d*-\d+\.?\d* years|average tenure \d+\.?\d* years)\b', all_job_descriptions, re.IGNORECASE)
        for phrase in set(tenure_info_phrases): # Add unique phrases
            tenure_bullets.append(phrase)
    
    if re.search(r'\b(promotion|career path|growth opportunities)\b', all_job_descriptions, re.IGNORECASE):
        tenure_bullets.append("Opportunities for promotion or transitioning to specialized roles are common after gaining experience.")
    
    if re.search(r'\b(learning culture|skill development encouraged)\b', all_job_descriptions, re.IGNORECASE):
        tenure_bullets.append("Many companies emphasize a strong learning and development culture for entry-level talent.")

    # Incorporate YearsOfExperience if available
    if 'YearsOfExperience' in filtered_jobs.columns: # Check if YearsOfExperience was in the original CSV and thus in filtered_jobs
        years_experience = filtered_jobs['YearsOfExperience'].astype(str).str.replace('+', '').str.split('-').apply(lambda x: x[0]).unique()
        if years_experience.size > 0:
            tenure_bullets.append(f"Expected experience level is around {', '.join(years_experience)} year(s).")
    
    if not tenure_bullets:
        tenure_bullets.append(f"{career_level_input} {job_title_input} roles often see professionals building foundational skills for 1-3 years.")


    # 5. Required Expertise (Mapped from 'Keywords' in your CSV)
    raw_expertise = [e.strip() for e in all_expertise_areas.replace(';', ',').split(',') if e.strip()] # Keywords are semicolon-separated
    expertise_counts = Counter(raw_expertise)

    expertise_bullets = []
    if expertise_counts:
        most_common_expertise = [exp for exp, count in expertise_counts.most_common(3)]
        if most_common_expertise:
            expertise_bullets.append(f"Core expertise areas include: {', '.join(most_common_expertise)}.")

        for domain in ['Statistical Modeling', 'Machine Learning Concepts', 'Data Visualization', 'Data Cleaning', 'Predictive Analytics',
                       'Business Intelligence', 'Web Development', 'Object-Oriented Design', 'Cloud Computing',
                       'Product Lifecycle Management', 'Market Analysis', 'User Experience Design', '.NET', 'C#', 'ASP.NET MVC', 'Entity Framework']:
            if any(re.search(r'\b' + re.escape(domain) + r'\b', exp, re.IGNORECASE) for exp in raw_expertise):
                if not any(f"A strong foundation in {domain}" in s for s in expertise_bullets):
                    expertise_bullets.append(f"A strong foundation in {domain} is often a key requirement.")

        if re.search(r'\bdata-driven\b|\bdecision making\b|\bproblem-solving\b', all_job_descriptions, re.IGNORECASE):
            expertise_bullets.append("The ability to contribute to data-driven decision making and problem-solving is highly valued.")
    
    if not expertise_bullets:
        expertise_bullets.append(f"General analytical and problem-solving expertise is fundamental for {job_title_input}, with specialized domain knowledge evolving over time.")


    return {
        "job_title": job_title_input,
        "career_level": career_level_input,
        "skill_distribution": {
            "technical_percentage": tech_percentage,
            "soft_percentage": soft_percentage,
        },
        "skill_requirements": skill_requirements_bullets,
        "leadership_experience": leadership_bullets,
        "employee_tenure": tenure_bullets,
        "required_expertise": expertise_bullets,
    }

# Optional: Root endpoint for basic health check
@app.get("/")
async def root():
    if df.empty:
        return {"message": "AI Job Market Insights API is running, but data not loaded. Check server logs for errors."}
    return {"message": "AI Job Market Insights API is running and data is loaded!"}