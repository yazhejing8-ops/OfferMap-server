const express = require('express');
const cors = require('cors');
const multer = require('multer');

// pdf-parse 导入修复
let pdfParse;
try {
  const pdf = require('pdf-parse');
  pdfParse = pdf.default || pdf;
} catch (e) {
  console.error('pdf-parse 导入失败:', e.message);
}

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('只支持 PDF 文件'), false);
    }
  }
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
    console.log('收到简历上传请求');
    
    if (!req.file) {
      console.log('错误: 没有收到文件');
      return res.status(400).json({ error: '请上传简历文件' });
    }

    console.log('文件信息:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    
    // 检查文件大小
    if (req.file.size === 0) {
      console.log('错误: 文件大小为0');
      return res.status(400).json({ error: '文件为空，请重新上传' });
    }
    
    // 检查文件类型
    if (req.file.mimetype !== 'application/pdf' && !req.file.originalname.endsWith('.pdf')) {
      console.log('错误: 文件类型不对', req.file.mimetype);
      return res.status(400).json({ error: '只支持 PDF 格式的文件' });
    }
    
    // 检查 pdfParse 是否可用
    if (!pdfParse) {
      console.error('pdf-parse 模块未正确加载');
      return res.status(500).json({ error: 'PDF解析模块未正确加载，请联系管理员' });
    }
    
    // 解析PDF
    console.log('开始解析PDF...');
    let pdfData;
    try {
      pdfData = await pdfParse(req.file.buffer);
    } catch (pdfError) {
      console.error('PDF解析失败:', pdfError.message);
      return res.status(400).json({ error: 'PDF文件解析失败，请检查文件是否损坏' });
    }
    
    const resumeText = pdfData.text;
    console.log('PDF解析完成，字数:', resumeText.length);
    
    if (resumeText.length === 0) {
      console.log('错误: PDF内容为空');
      return res.status(400).json({ error: 'PDF内容为空，可能是扫描版PDF或图片PDF' });
    }
    
    // 使用Kimi分析简历
    console.log('开始用Kimi分析简历...');
    const resumeAnalysis = await kimiService.analyzeResume(resumeText);
    
    res.json({
      success: true,
      data: {
        rawText: resumeText.substring(0, 2000),
        analysis: resumeAnalysis
      }
    });
  } catch (error) {
    console.error('解析简历失败:', error.message);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ error: '简历解析失败，请检查文件格式或稍后重试' });
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

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err.message);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件太大，请上传小于10MB的文件' });
    }
  }
  res.status(500).json({ error: '服务器错误: ' + err.message });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`🚀 后端服务启动成功！`);
  console.log(`📡 API地址: http://localhost:${PORT}`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/api/health`);
});
