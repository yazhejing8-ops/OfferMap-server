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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 解析岗位JD
app.post('/api/analyze-job', async (req, res) => {
  try {
    const { jobDescription } = req.body;
    
    if (!jobDescription || jobDescription.length < 50) {
      return res.status(400).json({ error: '岗位描述太短，请提供完整的JD' });
    }

    console.log('开始解析岗位JD...');
    const jobAnalysis = await kimiService.analyzeJobDescription(jobDescription);
    
    res.json({
      success: true,
      data: jobAnalysis
    });
  } catch (error) {
    console.error('解析岗位JD失败:', error);
    res.status(500).json({ error: '解析失败，请稍后重试' });
  }
});

// 解析简历PDF
app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传简历文件' });
    }

    console.log('开始解析简历...', req.file.originalname);
    
    // 解析PDF
    const pdfData = await pdfParse(req.file.buffer);
    const resumeText = pdfData.text;
    
    console.log('PDF解析完成，字数:', resumeText.length);
    
    // 使用Kimi分析简历
    const resumeAnalysis = await kimiService.analyzeResume(resumeText);
    
    res.json({
      success: true,
      data: {
        rawText: resumeText.substring(0, 2000), // 返回前2000字用于调试
        analysis: resumeAnalysis
      }
    });
  } catch (error) {
    console.error('解析简历失败:', error);
    res.status(500).json({ error: '简历解析失败，请检查文件格式' });
  }
});

// 匹配度分析
app.post('/api/match-analysis', async (req, res) => {
  try {
    const { resumeAnalysis, jobAnalysis } = req.body;
    
    if (!resumeAnalysis || !jobAnalysis) {
      return res.status(400).json({ error: '缺少简历分析或岗位分析数据' });
    }

    console.log('开始匹配度分析...');
    const matchResult = await kimiService.analyzeMatch(resumeAnalysis, jobAnalysis);
    
    // 保存分析记录到数据库（可选）
    try {
      await supabaseService.saveAnalysis({
        match_score: matchResult.overallScore,
        job_title: jobAnalysis.title,
        created_at: new Date().toISOString()
      });
    } catch (dbError) {
      console.log('数据库保存失败（不影响返回）:', dbError.message);
    }
    
    res.json({
      success: true,
      data: matchResult
    });
  } catch (error) {
    console.error('匹配度分析失败:', error);
    res.status(500).json({ error: '分析失败，请稍后重试' });
  }
});

// 启动服务
app.listen(PORT, () => {
  console.log(`🚀 后端服务启动成功！`);
  console.log(`📡 API地址: http://localhost:${PORT}`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/api/health`);
});
