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

async function saveAnalysis(analysisData) {
  const client = initSupabase();
  if (!client) {
    throw new Error('Supabase未配置');
  }

  const { data, error } = await client
    .from('analysis_records')
    .insert([analysisData])
    .select();

  if (error) {
    throw error;
  }

  return data;
}

async function getAnalysisRecords(limit = 10) {
  const client = initSupabase();
  if (!client) {
    throw new Error('Supabase未配置');
  }

  const { data, error } = await client
    .from('analysis_records')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data;
}

module.exports = {
  initSupabase,
  saveAnalysis,
  getAnalysisRecords
};
