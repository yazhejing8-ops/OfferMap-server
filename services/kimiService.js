// Kimi API 服务
const KIMI_API_KEY = process.env.KIMI_API_KEY;
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1';

// 岗位JD解析Prompt
const JOB_ANALYSIS_PROMPT = `你是一位资深HR和招聘专家，请分析以下岗位JD，提取关键信息并以JSON格式返回。

要求：
1. 识别岗位的核心技能要求（3-6项）
2. 列出需要掌握的软件/工具
3. 总结主要工作内容
4. 分析这个岗位的难点和挑战
5. 用一句话总结"这个岗位到底要什么"

请严格按以下JSON格式返回（不要包含其他文字）：
{
  "title": "岗位名称",
  "company": "公司名称（如有）",
  "location": "工作地点（如有）",
  "salary": "薪资范围（如有）",
  "coreSkills": ["技能1", "技能2", ...],
  "software": ["软件1", "软件2", ...],
  "keyResponsibilities": ["职责1", "职责2", ...],
  "challenges": ["难点1", "难点2", ...],
  "summary": "一句话总结"
}

岗位JD内容：
`;

// 简历解析Prompt
const RESUME_ANALYSIS_PROMPT = `你是一位资深HR，请分析以下简历内容，提取关键信息并以JSON格式返回。

要求：
1. 提取基本信息（姓名、工作年限、求职意向）
2. 列出核心技能（按熟练度排序）
3. 总结工作经历亮点
4. 识别项目/作品成果（量化数据）
5. 分析潜在优势和可能的短板

请严格按以下JSON格式返回（不要包含其他文字）：
{
  "name": "姓名",
  "experience": "工作年限",
  "intention": "求职意向",
  "coreSkills": ["技能1", "技能2", ...],
  "workHighlights": ["亮点1", "亮点2", ...],
  "achievements": ["成果1", "成果2", ...],
  "potentialStrengths": ["优势1", "优势2", ...],
  "potentialWeaknesses": ["短板1", "短板2", ...]
}

简历内容：
`;

// 匹配度分析Prompt
const MATCH_ANALYSIS_PROMPT = `你是一位资深HR和职业规划师，请分析候选人的简历与岗位的匹配度，给出详细的匹配报告。

评分标准（满分100分）：
- 95分以上：非常匹配，可以直接投递
- 85-95分：相对匹配，还有提升空间
- 70-85分：勉强匹配，需要重点补强
- 60-70分：不太匹配，需要大量准备
- 60分以下：完全不匹配，建议换岗位

请严格按以下JSON格式返回（不要包含其他文字）：
{
  "overallScore": 83.5,
  "overallLabel": "相对匹配",
  "overallComment": "比及格好了一点，但离理想状态还有距离",
  "dimensions": [
    {"name": "维度名称", "score": 85, "fullMark": 100}
  ],
  "strengths": [
    {
      "title": "还不错的地方标题（口语化、有人味）",
      "description": "具体说明（像朋友聊天一样）",
      "score": 90
    }
  ],
  "weaknesses": [
    {
      "title": "差强人意的地方标题（口语化）",
      "description": "具体说明+改进建议",
      "score": 70
    }
  ],
  "actions": [
    {
      "period": "今天就能做的事",
      "items": ["具体行动1", "具体行动2"]
    },
    {
      "period": "两天内能交付的小成果",
      "items": ["具体行动1", "具体行动2"]
    }
  ]
}

注意：
1. 维度名称参考：AIGC工具、影像编辑、工作流搭建、审美创意、品牌思维、导演思维
2. 标题和描述要像朋友聊天一样口语化，不要用"核心优势""需要补强"这类官方词汇
3. 行动建议要具体、可执行，不要说"重构简历"这种术语

岗位信息：
`;

// 调用Kimi API
async function callKimiAPI(messages, temperature = 0.3) {
  if (!KIMI_API_KEY) {
    throw new Error('KIMI_API_KEY未配置');
  }

  const response = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KIMI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'moonshot-v1-8k',
      messages: messages,
      temperature: temperature,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kimi API错误: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// 解析岗位JD
async function analyzeJobDescription(jobDescription) {
  const messages = [
    { role: 'system', content: '你是一位专业的招聘分析师，擅长从岗位JD中提取关键信息。' },
    { role: 'user', content: JOB_ANALYSIS_PROMPT + jobDescription }
  ];

  const result = await callKimiAPI(messages);
  return JSON.parse(result);
}

// 解析简历
async function analyzeResume(resumeText) {
  const truncatedText = resumeText.length > 8000 
    ? resumeText.substring(0, 8000) + '...' 
    : resumeText;

  const messages = [
    { role: 'system', content: '你是一位专业的人力资源专家，擅长分析简历并提取关键信息。' },
    { role: 'user', content: RESUME_ANALYSIS_PROMPT + truncatedText }
  ];

  const result = await callKimiAPI(messages);
  return JSON.parse(result);
}

// 匹配度分析
async function analyzeMatch(resumeAnalysis, jobAnalysis) {
  const prompt = MATCH_ANALYSIS_PROMPT + 
    JSON.stringify(jobAnalysis, null, 2) + 
    '\n\n候选人简历信息：\n' + 
    JSON.stringify(resumeAnalysis, null, 2);

  const messages = [
    { role: 'system', content: '你是一位资深的职业规划师，擅长分析候选人与岗位的匹配度，给出客观、有建设性的反馈。' },
    { role: 'user', content: prompt }
  ];

  const result = await callKimiAPI(messages, 0.5);
  return JSON.parse(result);
}

module.exports = {
  analyzeJobDescription,
  analyzeResume,
  analyzeMatch
};
