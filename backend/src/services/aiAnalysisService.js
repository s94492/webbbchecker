/**
 * AI 智能分析服務
 * 為網站監控數據提供智能分析和建議
 */

class AIAnalysisService {
  constructor() {
    this.performanceThresholds = {
      excellent: 200,
      good: 500,
      average: 2300,
      poor: 3000
    };
    
    this.uptimeThresholds = {
      excellent: 99.9,
      good: 99.5,
      average: 99.0,
      poor: 98.0
    };
  }

  /**
   * 生成智能分析報告
   * @param {Object} stats - 網站統計數據
   * @param {Array} metrics - 詳細監控指標
   * @param {string} websiteName - 網站名稱
   * @returns {Object} AI 分析結果
   */
  generateAnalysis(stats, metrics, websiteName) {
    try {
      const analysis = {
        performanceInsights: this.analyzePerformance(stats, metrics),
        trendAnalysis: this.analyzeTrends(metrics),
        riskAssessment: this.assessRisks(stats, metrics),
        recommendations: this.generateRecommendations(stats, metrics),
        predictiveInsights: this.generatePredictiveInsights(metrics),
        summary: ''
      };

      // 生成執行摘要
      analysis.summary = this.generateExecutiveSummary(analysis, stats, websiteName);
      
      return analysis;
    } catch (error) {
      console.error('AI 分析生成失敗:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * 性能分析
   */
  analyzePerformance(stats, metrics) {
    const insights = [];
    const avgResponseTime = stats.avgResponseTime;
    const uptime = stats.uptime;

    // 響應時間分析
    if (avgResponseTime <= this.performanceThresholds.excellent) {
      insights.push({
        type: 'positive',
        category: '性能表現',
        message: `平均響應時間 ${avgResponseTime}ms 表現優異，處於業界頂尖水準。`,
        impact: 'high',
        confidence: 95
      });
    } else if (avgResponseTime <= this.performanceThresholds.good) {
      insights.push({
        type: 'neutral',
        category: '性能表現',
        message: `平均響應時間 ${avgResponseTime}ms 表現良好，仍有優化空間。`,
        impact: 'medium',
        confidence: 90
      });
    } else if (avgResponseTime <= this.performanceThresholds.average) {
      insights.push({
        type: 'neutral',
        category: '性能表現',
        message: `平均響應時間 ${avgResponseTime}ms 表現普通，有改善空間。`,
        impact: 'medium',
        confidence: 85
      });
    } else if (avgResponseTime <= this.performanceThresholds.poor) {
      insights.push({
        type: 'warning',
        category: '性能表現',
        message: `平均響應時間 ${avgResponseTime}ms 偏慢，建議進行性能優化。`,
        impact: 'high',
        confidence: 85
      });
    } else {
      insights.push({
        type: 'critical',
        category: '性能表現',
        message: `平均響應時間 ${avgResponseTime}ms 表現不佳，急需性能改善。`,
        impact: 'high',
        confidence: 90
      });
    }

    // 可用性分析
    if (uptime >= this.uptimeThresholds.excellent) {
      insights.push({
        type: 'positive',
        category: '系統穩定性',
        message: `系統可用性 ${uptime.toFixed(2)}% 達到企業級標準。`,
        impact: 'high',
        confidence: 98
      });
    } else if (uptime >= this.uptimeThresholds.good) {
      insights.push({
        type: 'neutral',
        category: '系統穩定性',
        message: `系統可用性 ${uptime.toFixed(2)}% 良好，建議持續監控。`,
        impact: 'medium',
        confidence: 85
      });
    }

    return insights;
  }

  /**
   * 趨勢分析
   */
  analyzeTrends(metrics) {
    if (!metrics || metrics.length < 10) {
      return [{
        type: 'info',
        message: '數據樣本不足，需要更多監控數據進行趨勢分析。'
      }];
    }

    const trends = [];
    const recentData = metrics.slice(-50); // 最近50個數據點
    const olderData = metrics.slice(-100, -50); // 前50個數據點

    if (recentData.length > 0 && olderData.length > 0) {
      const recentAvg = recentData.reduce((sum, m) => sum + (m.responseTime || 0), 0) / recentData.length;
      const olderAvg = olderData.reduce((sum, m) => sum + (m.responseTime || 0), 0) / olderData.length;
      const trend = ((recentAvg - olderAvg) / olderAvg) * 100;

      if (Math.abs(trend) > 10) {
        if (trend > 0) {
          trends.push({
            type: 'warning',
            category: '性能趨勢',
            message: `檢測到性能下降趨勢，響應時間較前期增加 ${trend.toFixed(1)}%。`,
            impact: 'medium',
            confidence: 80
          });
        } else {
          trends.push({
            type: 'positive',
            category: '性能趨勢',
            message: `檢測到性能改善趨勢，響應時間較前期減少 ${Math.abs(trend).toFixed(1)}%。`,
            impact: 'medium',
            confidence: 80
          });
        }
      } else {
        trends.push({
          type: 'neutral',
          category: '性能趨勢',
          message: '性能表現穩定，未檢測到顯著趨勢變化。',
          impact: 'low',
          confidence: 75
        });
      }
    }

    // 檢測異常峰值
    const responseTimes = metrics.map(m => m.responseTime || 0);
    const maxTime = Math.max(...responseTimes);
    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    if (maxTime > avgTime * 3) {
      trends.push({
        type: 'warning',
        category: '異常檢測',
        message: `檢測到異常峰值 ${maxTime}ms，為平均值的 ${(maxTime/avgTime).toFixed(1)} 倍。`,
        impact: 'high',
        confidence: 90
      });
    }

    return trends;
  }

  /**
   * 風險評估
   */
  assessRisks(stats, metrics) {
    const risks = [];
    
    // 性能風險
    if (stats.avgResponseTime > this.performanceThresholds.average) {
      risks.push({
        level: 'medium',
        category: '性能風險',
        description: '響應時間偏高可能影響用戶體驗',
        probability: 'medium',
        impact: 'high'
      });
    }

    if (stats.maxResponseTime > stats.avgResponseTime * 5) {
      risks.push({
        level: 'high',
        category: '穩定性風險',
        description: '存在極端響應時間，系統可能不穩定',
        probability: 'low',
        impact: 'high'
      });
    }

    // 可用性風險
    if (stats.uptime < this.uptimeThresholds.good) {
      risks.push({
        level: 'high',
        category: '可用性風險',
        description: '系統可用性低於標準，可能影響業務',
        probability: 'medium',
        impact: 'critical'
      });
    }

    return risks;
  }

  /**
   * 生成建議
   */
  generateRecommendations(stats, metrics) {
    const recommendations = [];

    // 性能優化建議
    if (stats.avgResponseTime > this.performanceThresholds.good) {
      recommendations.push({
        priority: 'high',
        category: '性能優化',
        title: '響應時間優化',
        description: '建議檢查服務器配置、數據庫查詢效率和網絡延遲。',
        actions: [
          '檢查服務器 CPU 和記憶體使用率',
          '優化數據庫查詢和索引',
          '啟用 CDN 和緩存機制',
          '檢查網絡帶寬和延遲'
        ],
        expectedImpact: '預計可改善響應時間 20-40%'
      });
    }

    // 監控建議
    if (stats.uptime >= this.uptimeThresholds.excellent) {
      recommendations.push({
        priority: 'low',
        category: '監控優化',
        title: '維持優秀表現',
        description: '系統表現優異，建議維持當前監控策略。',
        actions: [
          '繼續定期監控關鍵指標',
          '設置預警閾值防範潛在問題',
          '定期檢查系統資源使用情況'
        ],
        expectedImpact: '維持當前優秀服務水準'
      });
    }

    // 擴展建議
    const maxResponseTime = stats.maxResponseTime;
    const avgResponseTime = stats.avgResponseTime;
    
    if (maxResponseTime > avgResponseTime * 4) {
      recommendations.push({
        priority: 'medium',
        category: '系統穩定性',
        title: '異常峰值處理',
        description: '檢測到響應時間異常峰值，建議調查原因。',
        actions: [
          '分析異常發生時間和模式',
          '檢查系統日誌和錯誤記錄',
          '評估負載均衡配置',
          '考慮增加系統資源或橫向擴展'
        ],
        expectedImpact: '減少異常峰值，提升系統穩定性'
      });
    }

    return recommendations;
  }

  /**
   * 預測性洞察
   */
  generatePredictiveInsights(metrics) {
    const insights = [];
    
    if (metrics && metrics.length >= 20) {
      // 簡單的趨勢預測
      const recent = metrics.slice(-10);
      const recentAvg = recent.reduce((sum, m) => sum + (m.responseTime || 0), 0) / recent.length;
      
      const older = metrics.slice(-20, -10);
      const olderAvg = older.reduce((sum, m) => sum + (m.responseTime || 0), 0) / older.length;
      
      const trendRate = (recentAvg - olderAvg) / olderAvg;
      
      if (Math.abs(trendRate) > 0.05) {
        const direction = trendRate > 0 ? '上升' : '下降';
        const prediction = trendRate > 0 ? '可能需要關注' : '預計將繼續改善';
        
        insights.push({
          type: 'prediction',
          message: `基於近期趨勢，響應時間呈現${direction}趨勢，${prediction}。`,
          confidence: 70,
          timeframe: '未來 2-4 小時'
        });
      }
    }

    return insights;
  }

  /**
   * 生成執行摘要
   */
  generateExecutiveSummary(analysis, stats, websiteName) {
    const performanceLevel = this.getPerformanceLevel(stats.avgResponseTime);
    const uptimeLevel = this.getUptimeLevel(stats.uptime);
    
    let summary = `${websiteName} 系統監控分析顯示：`;
    
    if (performanceLevel === 'excellent' && uptimeLevel === 'excellent') {
      summary += '系統運行狀態優異，性能和穩定性均達到企業級標準。建議維持當前策略並持續監控。';
    } else if (performanceLevel === 'good' && uptimeLevel === 'good') {
      summary += '系統運行良好，整體表現穩定。有進一步優化空間，建議關注性能改善機會。';
    } else {
      summary += '系統存在改善空間，建議優先處理性能或穩定性問題，確保服務品質。';
    }

    // 加入關鍵數字
    summary += ` 當前平均響應時間 ${stats.avgResponseTime}ms，系統可用性 ${stats.uptime.toFixed(2)}%。`;

    return summary;
  }

  /**
   * 獲取性能等級
   */
  getPerformanceLevel(responseTime) {
    if (responseTime <= this.performanceThresholds.excellent) return 'excellent';
    if (responseTime <= this.performanceThresholds.good) return 'good';
    if (responseTime <= this.performanceThresholds.average) return 'average';
    return 'poor';
  }

  /**
   * 獲取可用性等級
   */
  getUptimeLevel(uptime) {
    if (uptime >= this.uptimeThresholds.excellent) return 'excellent';
    if (uptime >= this.uptimeThresholds.good) return 'good';
    if (uptime >= this.uptimeThresholds.average) return 'average';
    return 'poor';
  }

  /**
   * 默認分析（當AI分析失敗時）
   */
  getDefaultAnalysis() {
    return {
      performanceInsights: [{
        type: 'info',
        category: '系統狀態',
        message: '系統正在正常運行，建議繼續監控。',
        impact: 'low',
        confidence: 50
      }],
      trendAnalysis: [{
        type: 'info',
        message: '數據分析中，請稍後查看更詳細的趨勢分析。'
      }],
      riskAssessment: [],
      recommendations: [{
        priority: 'low',
        category: '一般建議',
        title: '持續監控',
        description: '建議維持定期監控，確保系統穩定運行。',
        actions: ['定期檢查系統狀態', '關注異常警報'],
        expectedImpact: '維持系統穩定性'
      }],
      predictiveInsights: [],
      summary: '系統狀態監控中，建議持續關注系統表現。'
    };
  }
}

module.exports = new AIAnalysisService();