const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const kimiService = require('./services/kimiService');

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
      return res.status(400).json({ error: '岗位描述太短' });
    }

    const jobAnalysis = await kimiService.analyzeJobDescription(jobDescription);
    res.json({ success: true, data: jobAnalysis });
  } catch (error) {
    console.error('解析岗位JD失败:', error);
    res.status(500).json({ error: '解析失败' });
  }
});

// 解析简历PDF
app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    console.log('解析PDF，大小:', req.file.size);
    
    const pdfData = await pdfParse(req.file.buffer);
    console.log('PDF解析成功，页数:', pdfData.numpages, '字数:', pdfData.text.length);
    
    const resumeAnalysis = await kimiService.analyzeResume(pdfData.text);
    
    res.json({
      success: true,
      data: {
        rawText: pdfData.text.substring(0, 2000),
        analysis: resumeAnalysis
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
    res.json({ success: true, data: matchResult });
  } catch (error) {
    console.error('匹配分析失败:', error);
    res.status(500).json({ error: '分析失败' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 服务启动: http://localhost:${PORT}`);
});
