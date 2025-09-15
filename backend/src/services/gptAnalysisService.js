/**
 * GPT 增強的 AI 智能分析服務
 * 整合 OpenAI GPT API 提供真正的 AI 洞察
 */

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class GPTAnalysisService {
  constructor() {
    // 設定文件路徑
    this.SETTINGS_FILE = path.join(__dirname, '../../data/openai-settings.json');
    
    // 初始化設定
    this.settings = {
      enabled: false,
      apiKey: '',
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      maxTokens: 500
    };
    
    // 回退到規則引擎
    this.fallbackEnabled = true;
    
    // 同步載入設定（避免 async constructor）
    this.loadSettingsSync();
    
    // 初始化 OpenAI 客戶端
    this.initializeClient();
  }

  /**
   * 同步載入 OpenAI 設定（constructor 使用）
   */
  loadSettingsSync() {
    try {
      const data = fs.readFileSync(this.SETTINGS_FILE, 'utf8');
      const savedSettings = JSON.parse(data);
      this.settings = { ...this.settings, ...savedSettings };
      console.log('🔧 GPT 設定已載入');
    } catch (error) {
      console.log('使用預設 GPT 設定');
    }
  }

  /**
   * 載入 OpenAI 設定（異步版本）
   */
  async loadSettings() {
    try {
      const data = await fs.promises.readFile(this.SETTINGS_FILE, 'utf8');
      const savedSettings = JSON.parse(data);
      this.settings = { ...this.settings, ...savedSettings };
      console.log('🔧 GPT 設定已載入');
      this.initializeClient();
    } catch (error) {
      console.log('使用預設 GPT 設定');
    }
  }

  /**
   * 初始化 OpenAI 客戶端
   */
  initializeClient() {
    const apiKey = this.settings.apiKey || process.env.OPENAI_API_KEY || 'sk-your-api-key-here';
    this.openai = new OpenAI({
      apiKey: apiKey,
      timeout: 30000, // 30秒超時
    });
    
    // 更新模型設定
    this.model = this.settings.model || process.env.GPT_MODEL || 'gpt-3.5-turbo';
    this.maxTokens = this.settings.maxTokens || 500;
    this.temperature = this.settings.temperature || 0.3;
  }

  /**
   * 生成 GPT 增強的智能分析報告
   * @param {Object} stats - 網站統計數據
   * @param {Array} metrics - 詳細監控指標
   * @param {string} websiteName - 網站名稱
   * @returns {Object} GPT AI 分析結果
   */
  async generateAnalysis(stats, metrics, websiteName) {
    try {
      console.log(`🤖 開始 GPT 分析: ${websiteName}`);
      
      // 準備分析數據
      const analysisData = this.prepareAnalysisData(stats, metrics, websiteName);
      
      // 嘗試 GPT 分析
      const gptAnalysis = await this.getGPTAnalysis(analysisData);
      
      if (gptAnalysis) {
        console.log('✅ GPT 分析成功');
        return {
          ...gptAnalysis,
          source: 'gpt',
          model: this.model,
          confidence: 95
        };
      }
      
      // GPT 失敗時回退到規則引擎
      console.log('⚠️ GPT 分析失敗，使用規則引擎');
      return this.getFallbackAnalysis(stats, metrics, websiteName);
      
    } catch (error) {
      console.error('GPT 分析錯誤:', error.message);
      
      // 錯誤處理：回退到規則引擎
      if (this.fallbackEnabled) {
        return this.getFallbackAnalysis(stats, metrics, websiteName);
      }
      
      throw error;
    }
  }

  /**
   * 準備發送給 GPT 的分析數據
   */
  prepareAnalysisData(stats, metrics, websiteName) {
    // 計算關鍵統計
    const responseTimes = metrics.map(m => m.responseTime || 0).filter(t => t > 0);
    const recentMetrics = metrics.slice(-50); // 最近50個數據點
    const olderMetrics = metrics.slice(-100, -50); // 前50個數據點
    
    // 計算趨勢
    let trendAnalysis = '穩定';
    if (recentMetrics.length > 0 && olderMetrics.length > 0) {
      const recentAvg = recentMetrics.reduce((sum, m) => sum + (m.responseTime || 0), 0) / recentMetrics.length;
      const olderAvg = olderMetrics.reduce((sum, m) => sum + (m.responseTime || 0), 0) / olderMetrics.length;
      const change = ((recentAvg - olderAvg) / olderAvg) * 100;
      
      if (change > 5) trendAnalysis = `上升${change.toFixed(1)}%`;
      else if (change < -5) trendAnalysis = `下降${Math.abs(change).toFixed(1)}%`;
    }
    
    return {
      websiteName,
      timeRange: '24小時',
      performance: {
        avgResponseTime: stats.avgResponseTime,
        minResponseTime: stats.minResponseTime,
        maxResponseTime: stats.maxResponseTime,
        uptime: stats.uptime,
        totalChecks: metrics.length
      },
      trends: {
        recentTrend: trendAnalysis,
        volatility: stats.maxResponseTime / stats.avgResponseTime
      },
      anomalies: {
        hasAnomalies: this.detectAnomalies(stats, metrics),
        anomalyRatio: stats.maxResponseTime / stats.avgResponseTime
      }
    };
  }

  /**
   * 更智能的異常檢測
   */
  detectAnomalies(stats, metrics) {
    // 條件1：響應時間超過 3 秒算異常
    if (stats.maxResponseTime > 3000) return true;
    
    // 條件2：最慢響應時間超過平均值 10 倍算異常
    if (stats.maxResponseTime > stats.avgResponseTime * 10) return true;
    
    // 條件3：可用性低於 99% 算異常
    if (stats.uptime < 99) return true;
    
    // 條件4：檢查是否有大量連續失敗
    if (metrics && metrics.length > 10) {
      const recentMetrics = metrics.slice(-20); // 最近20個點
      const failureCount = recentMetrics.filter(m => m.isHealthy === false || m.status === 'down').length;
      if (failureCount > 3) return true; // 20個中超過3個失敗
    }
    
    return false;
  }

  /**
   * 調用 GPT API 進行分析
   */
  async getGPTAnalysis(data) {
    try {
      const prompt = this.buildAnalysisPrompt(data);
      
      // 準備 API 調用參數
      const apiParams = {
        model: this.model,
        messages: [
          {
            role: "system",
            content: `你是一位資深的網站性能監控專家，擁有15年的系統運維和性能優化經驗。
            請基於提供的監控數據，提供專業、精準、可操作的分析建議。
            
            重要原則: 對於表現優異的系統（平均響應<200ms，波動<3倍），請給予正面肯定和業務價值建議，避免提出「監控」、「持續觀察」、「定期檢查」等不必要的維護建議。客戶已經在監控，不需要被告知要監控。
            
            回應格式必須是有效的 JSON，包含以下結構：
            {
              "performanceInsights": [{"type": "positive/warning/neutral", "message": "洞察內容", "confidence": 85}],
              "trendAnalysis": [{"type": "warning/positive/neutral", "message": "趨勢分析", "confidence": 80}],
              "recommendations": [{"priority": "high/medium/low", "title": "建議標題", "description": "建議描述", "expectedImpact": "預期效果"}],
              "summary": "執行摘要",
              "riskLevel": "low/medium/high"
            }
            
            請用繁體中文回應，語調專業但易懂。請確保回應是有效的 JSON 格式。`
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      };
      
      // GPT-3.5 支援 response_format，GPT-4 系列不支援
      if (this.model.includes('gpt-3.5')) {
        apiParams.response_format = { type: "json_object" };
      }
      
      const completion = await this.openai.chat.completions.create(apiParams);

      const content = completion.choices[0]?.message?.content;
      if (!content) return null;

      // 解析 JSON 回應（處理 markdown 格式）
      let jsonContent = content.trim();
      
      // 移除 markdown 程式碼區塊標記（GPT-4 Turbo 可能會返回 ```json ... ``` 格式）
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const analysis = JSON.parse(jsonContent);
      
      // 驗證回應格式
      if (!this.validateGPTResponse(analysis)) {
        throw new Error('GPT 回應格式無效');
      }
      
      return analysis;
      
    } catch (error) {
      console.error('GPT API 調用失敗:', error.message);
      return null;
    }
  }

  /**
   * 構建 GPT 分析提示詞
   */
  buildAnalysisPrompt(data) {
    return `請分析以下網站監控數據：

網站名稱: ${data.websiteName}
監控時間範圍: ${data.timeRange}

性能指標:
- 平均響應時間: ${data.performance.avgResponseTime}ms
- 最快響應時間: ${data.performance.minResponseTime}ms  
- 最慢響應時間: ${data.performance.maxResponseTime}ms
- 系統可用性: ${data.performance.uptime.toFixed(2)}%
- 總檢查次數: ${data.performance.totalChecks}

趨勢分析:
- 近期趨勢: ${data.trends.recentTrend}
- 性能波動性: ${data.trends.volatility.toFixed(2)}倍

異常檢測:
- 存在異常: ${data.anomalies.hasAnomalies ? '是' : '否'}
- 異常比率: ${data.anomalies.anomalyRatio.toFixed(2)}倍

響應時間評判標準:
- 優秀: < 200ms
- 良好: 200-500ms  
- 普通: 500-2300ms
- 慢: 2300-3000ms
- 很慢: > 3000ms

性能波動性評判標準:
- 正常: < 3倍 (無需特別關注)
- 需關注: 3-5倍 (建議監控)  
- 異常: > 5倍 (需要優化)

建議策略指引:
- 系統表現優異時(平均響應<200ms，波動<3倍): 給予肯定和讚美，建議維持現狀或將成功經驗應用到其他服務，禁止提出監控建議
- 系統表現良好時(平均響應200-500ms，波動<3倍): 輕微優化建議，重點在業務價值，避免過度監控建議
- 需要改善時(響應>2300ms或波動>3倍): 提供具體技術建議和優先級

重要提醒: 對於表現優異的系統，不要建議「監控」、「持續觀察」、「定期檢查」等維護性建議，而應給出正面肯定和業務價值導向的建議。

請提供:
1. 性能洞察 (當前表現評估，請依據上述標準評判響應時間和波動性)
2. 趨勢分析 (性能變化趨勢)  
3. 具體建議 (請依據建議策略指引，避免對表現良好的系統給出不必要的監控建議)
4. 執行摘要 (30字內的核心結論)
5. 風險等級評估

請確保建議具體可操作且有實際價值，避免過於泛用的建議。`;
  }

  /**
   * 驗證 GPT 回應格式
   */
  validateGPTResponse(analysis) {
    const requiredFields = ['performanceInsights', 'trendAnalysis', 'recommendations', 'summary'];
    return requiredFields.every(field => analysis.hasOwnProperty(field));
  }

  /**
   * 規則引擎回退方案
   */
  getFallbackAnalysis(stats, metrics, websiteName) {
    // 計算波動性
    const volatility = stats.maxResponseTime / stats.avgResponseTime;
    
    return {
      performanceInsights: [{
        type: stats.avgResponseTime <= 200 ? 'positive' : 
              stats.avgResponseTime <= 2300 ? 'neutral' : 
              stats.avgResponseTime <= 3000 ? 'warning' : 'critical',
        message: this.getPerformanceMessage(stats.avgResponseTime),
        confidence: 85
      }],
      trendAnalysis: [{
        type: 'neutral',
        message: '基於規則引擎分析，建議持續監控系統表現。',
        confidence: 70
      }],
      recommendations: [{
        priority: volatility > 5 ? 'high' : 
                 volatility > 3 ? 'medium' : 
                 stats.avgResponseTime > 3000 ? 'high' : 
                 stats.avgResponseTime > 2300 ? 'medium' : 'low',
        title: volatility > 5 ? '性能穩定性優化' :
               volatility > 3 ? '性能監控加強' :
               stats.avgResponseTime > 3000 ? '性能優化' : 
               stats.avgResponseTime > 2300 ? '性能改善' : '維持監控',
        description: volatility > 5 ? 
          `性能波動過大(${volatility.toFixed(1)}倍)，需要調查系統穩定性問題。` :
          volatility > 3 ?
          `性能波動較大(${volatility.toFixed(1)}倍)，建議加強監控。` :
          stats.avgResponseTime > 3000 ? 
          '響應時間超過3秒，需要立即檢查服務器配置和網絡延遲。' : 
          stats.avgResponseTime > 2300 ?
          '響應時間超過2.3秒，建議優化服務器性能。' :
          stats.avgResponseTime <= 200 ?
          `系統表現優異(平均${stats.avgResponseTime}ms)，可考慮將此配置作為其他服務的參考標準。` :
          `系統表現良好(平均${stats.avgResponseTime}ms)，建議維持當前架構配置。`,
        expectedImpact: volatility > 5 ? '預計改善系統穩定性 30-50%' :
                       volatility > 3 ? '預計提升監控效率 20-30%' :
                       stats.avgResponseTime > 3000 ? '預計改善響應時間 40-60%' : 
                       stats.avgResponseTime > 2300 ? '預計改善響應時間 20-30%' :
                       stats.avgResponseTime <= 200 ? '可將資源投入其他服務優化' : '維持穩定的服務品質'
      }],
      summary: `${websiteName} 系統${stats.uptime >= 99.9 ? '運行優秀' : '需要關注'}，平均響應時間 ${stats.avgResponseTime}ms。`,
      riskLevel: stats.avgResponseTime > 3000 || stats.uptime < 99 ? 'high' : 
                 stats.avgResponseTime > 2300 || stats.uptime < 99.5 ? 'medium' : 'low',
      source: 'fallback',
      confidence: 75
    };
  }

  /**
   * 獲取性能訊息
   */
  getPerformanceMessage(responseTime) {
    if (responseTime <= 200) {
      return `平均響應時間 ${responseTime}ms 表現優異，處於業界頂尖水準。`;
    } else if (responseTime <= 500) {
      return `平均響應時間 ${responseTime}ms 表現良好，仍有優化空間。`;
    } else if (responseTime <= 2300) {
      return `平均響應時間 ${responseTime}ms 表現普通，有改善空間。`;
    } else if (responseTime <= 3000) {
      return `平均響應時間 ${responseTime}ms 偏慢，建議進行性能優化。`;
    } else {
      return `平均響應時間 ${responseTime}ms 表現不佳，急需性能改善。`;
    }
  }

  /**
   * 檢查 API 配置狀態
   */
  isConfigured() {
    const apiKey = this.settings.apiKey || process.env.OPENAI_API_KEY;
    return !!(this.settings.enabled && apiKey && apiKey !== 'sk-your-api-key-here' && apiKey.startsWith('sk-'));
  }

  /**
   * 重新載入設定（同步方法供外部調用）
   */
  async reloadSettings() {
    await this.loadSettings();
    return this.getStatus();
  }

  /**
   * 獲取服務狀態
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      model: this.model,
      fallbackEnabled: this.fallbackEnabled,
      status: this.isConfigured() ? 'ready' : 'needs_api_key'
    };
  }
}

module.exports = new GPTAnalysisService();