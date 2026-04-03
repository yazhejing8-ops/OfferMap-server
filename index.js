const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const kimiService = require('./services/kimiService');
const supabaseService = require('./services/supabaseService');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 文件上传配置
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ========== 数据适配转换函数 ==========

// 适配岗位分析数据 -> 前端 JobRequirement 格式
function adaptJobAnalysis(jobAnalysis) {
  // coreSkills: 对象数组 -> 字符串数组
  const coreSkills = Array.isArray(jobAnalysis.coreSkills) 
    ? jobAnalysis.coreSkills.map(item => {
        if (typeof item === 'string') return item;
        const tools = Array.isArray(item.tools) ? item.tools.join('、') : item.tools || '';
        return `${item.name || ''}${item.level ? `（${item.level}）` : ''}${tools ? ` - 工具: ${tools}` : ''}${item.importance ? ` - ${item.importance}` : ''}`;
      })
    : [];

  // software: 对象数组 -> 字符串数组
  const software = Array.isArray(jobAnalysis.software)
    ? jobAnalysis.software.map(item => {
        if (typeof item === 'string') return item;
        return `${item.name || ''}${item.purpose ? ` - ${item.purpose}` : ''}${item.proficiency ? `（${item.proficiency}）` : ''}`;
      })
    : [];

  // keyResponsibilities: 对象数组 -> 字符串数组
  const keyResponsibilities = Array.isArray(jobAnalysis.keyResponsibilities)
    ? jobAnalysis.keyResponsibilities.map(item => {
        if (typeof item === 'string') return item;
        return `${item.description || ''}${item.difficulty ? ` 难点: ${item.difficulty}` : ''}${item.requirements ? ` 要求: ${item.requirements}` : ''}`;
      })
    : [];

  // challenges: 对象数组 -> 字符串数组
  const challenges = Array.isArray(jobAnalysis.challenges)
    ? jobAnalysis.challenges.map(item => {
        if (typeof item === 'string') return item;
        return `${item.description || ''}${item.why ? ` 原因: ${item.why}` : ''}${item.solution ? ` 应对: ${item.solution}` : ''}`;
      })
    : [];

  // jargon: 对象数组 -> 字符串数组（括号解释格式）
  const jargon = Array.isArray(jobAnalysis.jargon)
    ? jobAnalysis.jargon.map(item => {
        if (typeof item === 'string') return item;
        return `${item.term || ''}${item.explanation ? `（${item.explanation}）` : ''}${item.relevance ? ` — ${item.relevance}` : ''}`;
      })
    : [];

  return {
    title: jobAnalysis.title || '未知岗位',
    company: jobAnalysis.company || '',
    location: jobAnalysis.location || '',
    salary: jobAnalysis.salary || '薪资面议',
    coreSkills,
    software,
    keyResponsibilities,
    challenges,
    jargon,
    summary: jobAnalysis.summary || '暂无总结'
  };
}

// 适配简历分析数据 -> 前端 ResumeAnalysis 格式
function adaptResumeAnalysis(resumeAnalysis) {
  // coreSkills
  const coreSkills = Array.isArray(resumeAnalysis.coreSkills)
    ? resumeAnalysis.coreSkills.map(item => {
        if (typeof item === 'string') return item;
        const tools = Array.isArray(item.tools) ? item.tools.join('、') : item.tools || '';
        return `${item.name || ''}${item.proficiency ? `（熟练度${item.proficiency}/10）` : ''}${tools ? ` - 工具: ${tools}` : ''}${item.experience ? ` - ${item.experience}` : ''}`;
      })
    : [];

  // workHighlights: 从 workExperience 中提取
  const workHighlights = [];
  if (Array.isArray(resumeAnalysis.workExperience)) {
    resumeAnalysis.workExperience.forEach(item => {
      const hl = `${item.company || ''} ${item.position || ''}${item.duration ? `（${item.duration}）` : ''}${item.responsibilities ? ` - ${item.responsibilities}` : ''}${item.achievements ? ` | 成果: ${item.achievements}` : ''}`;
      if (hl.trim()) workHighlights.push(hl);
    });
  }

  // achievements: 从 projects 中提取
  const achievements = [];
  if (Array.isArray(resumeAnalysis.projects)) {
    resumeAnalysis.projects.forEach(item => {
      const ach = `${item.name || ''}${item.description ? ` - ${item.description}` : ''}${item.contribution ? ` | 贡献: ${item.contribution}` : ''}${item.results ? ` | 成果: ${item.results}` : ''}`;
      if (ach.trim()) achievements.push(ach);
    });
  }

  // potentialStrengths
  const potentialStrengths = Array.isArray(resumeAnalysis.potentialStrengths)
    ? resumeAnalysis.potentialStrengths.map(item => {
        if (typeof item === 'string') return item;
        return `${item.name || ''}${item.description ? ` - ${item.description}` : ''}${item.value ? `（价值: ${item.value}）` : ''}`;
      })
    : [];

  // potentialWeaknesses
  const potentialWeaknesses = Array.isArray(resumeAnalysis.potentialWeaknesses)
    ? resumeAnalysis.potentialWeaknesses.map(item => {
        if (typeof item === 'string') return item;
        return `${item.name || ''}${item.description ? ` - ${item.description}` : ''}${item.solution ? ` | 改进: ${item.solution}` : ''}`;
      })
    : [];

  return {
    name: resumeAnalysis.name || '未知',
    experience: resumeAnalysis.experience || '',
    intention: resumeAnalysis.intention || '',
    coreSkills,
    workHighlights,
    achievements,
    potentialStrengths,
    potentialWeaknesses
  };
}

// 适配匹配度分析数据 -> 前端 AnalysisData 格式
function adaptMatchAnalysis(matchResult) {
  const dimensions = Array.isArray(matchResult.dimensions)
    ? matchResult.dimensions.map(item => ({
        name: item.name || '',
        score: typeof item.score === 'number' ? item.score : 70,
        fullMark: 100
      }))
    : [];

  const strengths = Array.isArray(matchResult.strengths)
    ? matchResult.strengths.map(item => ({
        title: item.title || '',
        description: item.description || '',
        score: typeof item.score === 'number' ? item.score : 70
      }))
    : [];

  const weaknesses = Array.isArray(matchResult.weaknesses)
    ? matchResult.weaknesses.map(item => ({
        title: item.title || '',
        description: item.description || '',
        score: typeof item.score === 'number' ? item.score : 60
      }))
    : [];

  // actions: 对象数组 -> 字符串数组
  const actions = Array.isArray(matchResult.actions)
    ? matchResult.actions.map(item => ({
        period: item.period || '',
        items: Array.isArray(item.items)
          ? item.items.map(subItem => {
              if (typeof subItem === 'string') return subItem;
              return `${subItem.action || ''}${subItem.how ? ` | 方法: ${subItem.how}` : ''}${subItem.expected ? ` | 预期: ${subItem.expected}` : ''}`;
            })
          : []
      }))
    : [];

  return {
    overallScore: typeof matchResult.overallScore === 'number' ? matchResult.overallScore : 70,
    overallLabel: matchResult.overallLabel || '',
    overallComment: matchResult.overallComment || '',
    dimensions,
    strengths,
    weaknesses,
    actions
  };
}

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString()
  });
});

// 解析岗位JD
app.post('/api/analyze-job', async (req, res) => {
  try {
    const { jobDescription } = req.body;
    
    if (!jobDescription || jobDescription.length < 50) {
      return res.status(400).json({ error: '岗位描述太短，至少需要50字' });
    }

    const jobAnalysis = await kimiService.analyzeJobDescription(jobDescription);
    const adapted = adaptJobAnalysis(jobAnalysis);
    res.json({ success: true, data: adapted });
  } catch (error) {
    console.error('解析岗位JD失败:', error);
    res.status(500).json({ error: '解析失败: ' + (error.message || '未知错误') });
  }
});

// 解析简历PDF
app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    // 更宽松的文件类型检查
    const isPdf = req.file.mimetype === 'application/pdf' || 
                  req.file.originalname.toLowerCase().endsWith('.pdf');
    
    if (!isPdf) {
      return res.status(400).json({ error: '请上传 PDF 格式的文件' });
    }

    console.log('解析PDF，大小:', req.file.size, '文件名:', req.file.originalname);
    
    const pdfData = await pdfParse(req.file.buffer);
    console.log('PDF解析成功，页数:', pdfData.numpages, '字数:', pdfData.text.length);
    
    if (!pdfData.text || pdfData.text.trim().length < 20) {
      return res.status(400).json({ error: 'PDF内容太少或无法识别文字，请检查文件格式' });
    }
    
    const resumeAnalysis = await kimiService.analyzeResume(pdfData.text);
    const adapted = adaptResumeAnalysis(resumeAnalysis);
    
    res.json({
      success: true,
      data: {
        rawText: pdfData.text.substring(0, 2000),
        analysis: adapted
      }
    });
  } catch (error) {
    console.error('PDF解析错误:', error.message);
    res.status(400).json({ error: 'PDF解析失败: ' + error.message });
  }
});

// 匹配度分析
app.post('/api/match-analysis', async (req, res) => {
  try {
    const { resumeAnalysis, jobAnalysis } = req.body;
    
    if (!resumeAnalysis || !jobAnalysis) {
      return res.status(400).json({ error: '缺少数据' });
    }

    const matchResult = await kimiService.analyzeMatch(resumeAnalysis, jobAnalysis);
    const adapted = adaptMatchAnalysis(matchResult);
    res.json({ success: true, data: adapted });
  } catch (error) {
    console.error('匹配分析失败:', error);
    res.status(500).json({ error: '分析失败: ' + (error.message || '未知错误') });
  }
});

// 保存分析结果（用于分享和短期存储）
app.post('/api/save-analysis', async (req, res) => {
  try {
    const { jobData, resumeData, matchData, userId } = req.body;
    
    if (!jobData || !matchData) {
      return res.status(400).json({ error: '缺少必要数据' });
    }

    const result = await supabaseService.saveAnalysis({
      jobData,
      resumeData,
      matchData,
      userId
    });

    res.json({ success: true, shareId: result.shareId });
  } catch (error) {
    console.error('保存分析结果失败:', error);
    res.status(500).json({ error: '保存失败: ' + (error.message || '未知错误') });
  }
});

// 根据分享ID获取分析结果
app.get('/api/analysis/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    const record = await supabaseService.getAnalysisByShareId(shareId);

    res.json({
      success: true,
      data: {
        jobData: record.job_data,
        resumeData: record.resume_data,
        matchData: record.match_data,
        createdAt: record.created_at
      }
    });
  } catch (error) {
    console.error('获取分享结果失败:', error);
    res.status(404).json({ error: error.message || '获取失败' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 服务启动: http://localhost:${PORT}`);
});
