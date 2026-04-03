// Supabase 数据库服务
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

let supabase = null;

function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('Supabase未配置，数据库功能不可用');
    return null;
  }

  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase连接成功');
  }

  return supabase;
}

// 生成8位随机分享ID
function generateShareId() {
  return Math.random().toString(36).substring(2, 10);
}

async function saveAnalysis(analysisData) {
  const client = initSupabase();
  if (!client) {
    // 未配置Supabase时，返回一个模拟的shareId（仅用于演示，数据不持久化）
    return {
      shareId: generateShareId(),
      warning: 'Supabase未配置，数据未持久化'
    };
  }

  const shareId = generateShareId();
  const { data, error } = await client
    .from('analysis_records')
    .insert([{
      share_id: shareId,
      job_data: analysisData.jobData || null,
      resume_data: analysisData.resumeData || null,
      match_data: analysisData.matchData || null,
      user_id: analysisData.userId || null,
      created_at: new Date().toISOString()
    }])
    .select();

  if (error) {
    throw error;
  }

  return { shareId, data };
}

async function getAnalysisByShareId(shareId) {
  const client = initSupabase();
  if (!client) {
    throw new Error('Supabase未配置，无法读取数据');
  }

  const { data, error } = await client
    .from('analysis_records')
    .select('*')
    .eq('share_id', shareId)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('分享链接已失效或不存在');
  }

  // 检查是否超过48小时
  const createdAt = new Date(data.created_at);
  const now = new Date();
  const diffHours = (now - createdAt) / (1000 * 60 * 60);

  if (diffHours > 48) {
    throw new Error('分享链接已过期（超过48小时），请重新分析');
  }

  return data;
}

async function getAnalysisRecords(limit = 10, userId = null) {
  const client = initSupabase();
  if (!client) {
    throw new Error('Supabase未配置');
  }

  let query = client
    .from('analysis_records')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

module.exports = {
  initSupabase,
  saveAnalysis,
  getAnalysisByShareId,
  getAnalysisRecords
};
