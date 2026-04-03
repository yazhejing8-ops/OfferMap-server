// Kimi API 服务
const KIMI_API_KEY = process.env.KIMI_API_KEY;
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1';

// 岗位JD解析Prompt - 详细版
const JOB_ANALYSIS_PROMPT = `你是一位资深HR和招聘专家，请深度分析以下岗位JD，提取关键信息并以JSON格式返回。

要求：
1. 识别岗位的核心技能要求（3-6项），每项技能需要说明：
   - 技能名称
   - 具体需要掌握的工具/软件
   - 该技能的难度等级（初级/中级/高级）
   - 为什么这个技能重要

2. 列出需要掌握的软件/工具，每项需要说明：
   - 软件名称
   - 具体用途
   - 需要掌握的程度（了解/熟练/精通）

3. 总结主要工作内容，每项工作需要说明：
   - 工作内容描述（50-100字）
   - 该工作的难点在哪里
   - 做好这项工作需要什么能力

4. 分析这个岗位的难点和挑战（3-5项），每项需要说明：
   - 难点描述
   - 为什么这是难点
   - 如何克服这个难点

5. 提取岗位JD中出现的行业黑话、专业术语、英文缩写（如 PLG、AIGC、UGC、KOL、SaaS、私域流量、增长黑客等），每项需要说明：
   - 术语/黑话原文
   - 通俗易懂的解释（50-100字，让非行业人士也能看懂）
   - 为什么这个岗位会提到它

6. 用一段话总结"这个岗位到底要什么"（100-200字）

请严格按以下JSON格式返回（不要包含其他文字，不要markdown代码块）：
{
  "title": "岗位名称",
  "company": "公司名称（如有）",
  "location": "工作地点（如有）",
  "salary": "薪资范围（如有）",
  "coreSkills": [
    {
      "name": "技能名称",
      "tools": ["工具1", "工具2"],
      "level": "中级",
      "importance": "为什么重要（50-100字）"
    }
  ],
  "software": [
    {
      "name": "软件名称",
      "purpose": "具体用途（30-50字）",
      "proficiency": "熟练"
    }
  ],
  "keyResponsibilities": [
    {
      "description": "工作内容描述（50-100字）",
      "difficulty": "难点在哪里（30-50字）",
      "requirements": "需要什么能力（30-50字）"
    }
  ],
  "challenges": [
    {
      "description": "难点描述",
      "why": "为什么是难点（30-50字）",
      "solution": "如何克服（30-50字）"
    }
  ],
  "jargon": [
    {
      "term": "术语原文",
      "explanation": "通俗解释（50-100字）",
      "relevance": "为什么岗位会提到它（30-50字）"
    }
  ],
  "summary": "总结（100-200字）"
}

岗位JD内容：
`;

// 简历解析Prompt - 详细版
const RESUME_ANALYSIS_PROMPT = `你是一位资深HR，请深度分析以下简历内容，提取关键信息并以JSON格式返回。

要求：
1. 提取基本信息：
   - 姓名
   - 工作年限
   - 求职意向
   - 学历背景

2. 列出核心技能（按熟练度排序），每项技能需要说明：
   - 技能名称
   - 熟练程度（1-10分）
   - 相关项目/工作经验（50-100字）
   - 掌握的工具/软件

3. 总结工作经历亮点，每段经历需要说明：
   - 公司名称、职位、时间
   - 主要职责（100-200字）
   - 取得的成果（量化数据）
   - 与目标岗位的相关性

4. 识别项目/作品成果，每项需要说明：
   - 项目名称
   - 项目描述（50-100字）
   - 你的贡献（50-100字）
   - 取得的成果（量化数据）

5. 分析潜在优势（3-5项），每项需要说明：
   - 优势名称
   - 具体体现（50-100字）
   - 如何帮助目标岗位

6. 分析可能的短板（3-5项），每项需要说明：
   - 短板名称
   - 具体体现（50-100字）
   - 如何弥补

请严格按以下JSON格式返回（不要包含其他文字，不要markdown代码块）：
{
  "name": "姓名",
  "experience": "工作年限",
  "intention": "求职意向",
  "education": "学历背景",
  "coreSkills": [
    {
      "name": "技能名称",
      "proficiency": 8,
      "experience": "相关经验（50-100字）",
      "tools": ["工具1", "工具2"]
    }
  ],
  "workExperience": [
    {
      "company": "公司名称",
      "position": "职位",
      "duration": "时间",
      "responsibilities": "职责（100-200字）",
      "achievements": "成果（量化数据）",
      "relevance": "与目标岗位相关性"
    }
  ],
  "projects": [
    {
      "name": "项目名称",
      "description": "描述（50-100字）",
      "contribution": "贡献（50-100字）",
      "results": "成果（量化数据）"
    }
  ],
  "potentialStrengths": [
    {
      "name": "优势名称",
      "description": "具体体现（50-100字）",
      "value": "如何帮助目标岗位"
    }
  ],
  "potentialWeaknesses": [
    {
      "name": "短板名称",
      "description": "具体体现（50-100字）",
      "solution": "如何弥补"
    }
  ]
}

简历内容：
`;

// 匹配度分析Prompt - 详细版
const MATCH_ANALYSIS_PROMPT = `你是一位资深HR和职业规划师，请深度分析候选人的简历与岗位的匹配度，给出详细的匹配报告。

评分标准（满分100分）：
- 95分以上：非常匹配，可以直接投递
- 85-95分：相对匹配，还有提升空间
- 70-85分：勉强匹配，需要重点补强
- 60-70分：不太匹配，需要大量准备
- 60分以下：完全不匹配，建议换岗位

请按以下维度分析匹配度：
1. AIGC工具（或岗位相关技能）
2. 影像编辑（或岗位相关技能）
3. 工作流搭建（或岗位相关技能）
4. 审美创意（或岗位相关技能）
5. 品牌思维（或岗位相关技能）
6. 导演思维（或岗位相关技能）

每个维度需要说明：
- 岗位要求的水平
- 候选人当前的水平
- 匹配度评分（0-100）
- 为什么给这个分数（50-100字）

优势分析（2-3项），每项需要说明：
- 优势名称
- 具体体现（100-200字）
- 匹配度评分
- 如何利用这个优势

短板分析（2-3项），每项需要说明：
- 短板名称
- 具体体现（100-200字）
- 为什么这是短板
- 如何弥补（具体建议）

改进行动建议，需要分阶段：
1. 今天就能做的事（2-3项）：每项需要具体说明做什么、怎么做、预期效果
2. 一周内能完成的事（2-3项）：每项需要具体说明做什么、怎么做、预期效果
3. 长期提升计划（2-3项）：每项需要具体说明做什么、怎么做、预期效果

请严格按以下JSON格式返回（不要包含其他文字，不要markdown代码块）：
{
  "overallScore": 83,
  "overallLabel": "相对匹配",
  "overallComment": "总体评价（50-100字）",
  "dimensions": [
    {
      "name": "维度名称",
      "jobRequirement": "岗位要求",
      "candidateLevel": "候选人水平",
      "score": 85,
      "reason": "评分理由（50-100字）"
    }
  ],
  "strengths": [
    {
      "title": "优势名称",
      "description": "具体体现（100-200字）",
      "score": 90,
      "howToUse": "如何利用"
    }
  ],
  "weaknesses": [
    {
      "title": "短板名称",
      "description": "具体体现（100-200字）",
      "why": "为什么是短板",
      "solution": "如何弥补（具体建议）"
    }
  ],
  "actions": [
    {
      "period": "今天就能做的事",
      "items": [
        {
          "action": "具体行动",
          "how": "怎么做",
          "expected": "预期效果"
        }
      ]
    }
  ]
}

注意：
1. 每个描述字段至少50字，多的可以到200-500字
2. 要具体到工具、软件、技能
3. 要解释为什么给这个分数
4. 行动建议要具体可操作
5. 不要返回markdown格式，直接返回纯JSON

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
      model: 'moonshot-v1-32k', // 使用更大的模型处理长文本
      messages: messages,
      temperature: temperature
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kimi API错误: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// 清理JSON字符串
function cleanJsonString(str) {
  str = str.replace(/```json\n?/g, '');
  str = str.replace(/```\n?/g, '');
  str = str.trim();
  return str;
}

// 解析岗位JD
async function analyzeJobDescription(jobDescription) {
  const messages = [
    { role: 'system', content: '你是一位专业的招聘分析师，擅长从岗位JD中提取详细的关键信息。返回详细的JSON格式。' },
    { role: 'user', content: JOB_ANALYSIS_PROMPT + jobDescription }
  ];

  const result = await callKimiAPI(messages);
  const cleanedResult = cleanJsonString(result);
  
  try {
    return JSON.parse(cleanedResult);
  } catch (e) {
    console.error('岗位解析JSON失败:', e.message);
    // 返回简化版默认结构
    return {
      title: "未知岗位",
      company: "",
      location: "",
      salary: "",
      coreSkills: [],
      software: [],
      keyResponsibilities: [],
      challenges: [],
      summary: "无法解析该岗位JD"
    };
  }
}

// 解析简历
async function analyzeResume(resumeText) {
  const truncatedText = resumeText.length > 15000 
    ? resumeText.substring(0, 15000) + '...' 
    : resumeText;

  const messages = [
    { role: 'system', content: '你是一位专业的人力资源专家，擅长深度分析简历并提取详细的关键信息。返回详细的JSON格式。' },
    { role: 'user', content: RESUME_ANALYSIS_PROMPT + truncatedText }
  ];

  const result = await callKimiAPI(messages);
  const cleanedResult = cleanJsonString(result);
  
  try {
    return JSON.parse(cleanedResult);
  } catch (e) {
    console.error('简历解析JSON失败:', e.message);
    return {
      name: "未知",
      experience: "",
      intention: "",
      education: "",
      coreSkills: [],
      workExperience: [],
      projects: [],
      potentialStrengths: [],
      potentialWeaknesses: []
    };
  }
}

// 匹配度分析
async function analyzeMatch(resumeAnalysis, jobAnalysis) {
  const prompt = MATCH_ANALYSIS_PROMPT + 
    JSON.stringify(jobAnalysis, null, 2) + 
    '\n\n候选人简历信息：\n' + 
    JSON.stringify(resumeAnalysis, null, 2);

  const messages = [
    { role: 'system', content: '你是一位资深的职业规划师，擅长深度分析候选人与岗位的匹配度，给出详细、客观、有建设性的反馈。返回详细的JSON格式。' },
    { role: 'user', content: prompt }
  ];

  const result = await callKimiAPI(messages, 0.5);
  const cleanedResult = cleanJsonString(result);
  
  console.log('Kimi返回长度:', cleanedResult.length);
  
  try {
    const parsed = JSON.parse(cleanedResult);
    
    // 确保数据结构完整
    if (!parsed.dimensions || parsed.dimensions.length === 0) {
      parsed.dimensions = [
        { name: "核心技能", jobRequirement: "岗位需要", candidateLevel: "候选人水平", score: 70, reason: "需要更多信息来评估" }
      ];
    }
    
    if (!parsed.strengths || parsed.strengths.length === 0) {
      parsed.strengths = [{
        title: "有一定基础",
        description: "你的简历显示你具备相关领域的基础知识和经验，这是一个好的起点。建议继续深耕，积累更多实战项目经验。根据你的工作经历，你在相关领域已经积累了一定的经验，这是你的优势。",
        score: 70,
        howToUse: "在求职过程中突出这些经验"
      }];
    }
    
    if (!parsed.weaknesses || parsed.weaknesses.length === 0) {
      parsed.weaknesses = [{
        title: "还有提升空间",
        description: "与岗位要求相比，你在某些方面还有差距。建议针对性地学习提升，弥补短板，增强自己的职场竞争力。具体需要根据岗位要求来分析。",
        why: "经验或技能与岗位要求有差距",
        solution: "制定学习计划，针对性地提升相关技能"
      }];
    }
    
    if (!parsed.actions || parsed.actions.length === 0) {
      parsed.actions = [
        {
          period: "今天就能做的事",
          items: [
            { action: "整理项目作品集", how: "收集你最好的3-5个项目，整理成作品集", expected: "方便面试时展示" }
          ]
        }
      ];
    }
    
    return parsed;
  } catch (e) {
    console.error('匹配分析JSON失败:', e.message);
    // 返回默认详细结构
    return {
      overallScore: 70,
      overallLabel: "勉强匹配",
      overallComment: "你的简历与岗位有一定匹配度，但还有提升空间。建议针对性地补充相关经验和技能。",
      dimensions: [
        { name: "核心技能", jobRequirement: "岗位需要相关技能", candidateLevel: "有一定基础", score: 70, reason: "你具备相关领域的基础知识，但还需要进一步提升" }
      ],
      strengths: [{
        title: "有一定基础",
        description: "你的简历显示你具备相关领域的基础知识和经验，这是一个好的起点。建议继续深耕，积累更多实战项目经验。",
        score: 70,
        howToUse: "在求职过程中突出这些经验"
      }],
      weaknesses: [{
        title: "还有提升空间",
        description: "与岗位要求相比，你在某些方面还有差距。建议针对性地学习提升，弥补短板。",
        why: "经验或技能与岗位要求有差距",
        solution: "制定学习计划，针对性地提升"
      }],
      actions: [
        {
          period: "今天就能做的事",
          items: [
            { action: "整理项目作品集", how: "收集最好的项目", expected: "方便面试展示" }
          ]
        }
      ]
    };
  }
}

module.exports = {
  analyzeJobDescription,
  analyzeResume,
  analyzeMatch
};
