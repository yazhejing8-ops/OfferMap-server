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

// 调用Kimi API
async function callKimiAPI(messages, temperature = 0.3) {
  console.log('KIMI_API_KEY:', KIMI_API_KEY ? '已配置' : '未配置');
  
  if (!KIMI_API_KEY) {
    throw new Error('KIMI_API_KEY未配置');
  }

  try {
    const response = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIMI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: messages,
        temperature: temperature
      })
    });

    console.log('Kimi API 响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Kimi API 错误:', errorText);
      throw new Error(`Kimi API错误: ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('调用Kimi API出错:', error.message);
    throw error;
  }
}

// 解析岗位JD
async function analyzeJobDescription(jobDescription) {
  console.log('开始解析岗位JD，长度:', jobDescription.length);
  
  const messages = [
    { role: 'system', content: '你是一位专业的招聘分析师，擅长从岗位JD中提取关键信息。返回JSON格式。' },
    { role: 'user', content: JOB_ANALYSIS_PROMPT + jobDescription }
  ];

  try {
    const result = await callKimiAPI(messages);
    console.log('Kimi返回结果:', result.substring(0, 200));
    
    // 尝试解析JSON
    try {
      return JSON.parse(result);
    } catch (e) {
      console.error('JSON解析失败:', e.message);
      // 如果解析失败，返回一个默认结构
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
  } catch (error) {
    console.error('analyzeJobDescription 错误:', error.message);
    throw error;
  }
}

module.exports = {
  analyzeJobDescription
};
