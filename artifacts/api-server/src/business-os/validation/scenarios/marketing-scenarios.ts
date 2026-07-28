import type { BusinessScenario } from "../types";

export const marketingScenarios: BusinessScenario[] = [
  {
    id: "mkt-001", name: "Campaign Success", domain: "marketing",
    description: "Kampanye pemasaran mencapai target lebih awal",
    trigger: { type: "event", eventType: "marketing.campaign_success", data: { campaignId: "CAMP-2026-07-001", name: "Promo HUT ke-5", targetROI: 300, achievedROI: 450, leadsGenerated: 2500, conversions: 380, budget: 50000000, revenue: 225000000, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CMO", expectedCapabilities: ["cap_marketing", "cap_sales"],
    expectedActions: ["ScaleCampaign", "MaximizeBudget"], expectedEvents: ["marketing.campaign_scaled"],
    priority: "high", tags: ["marketing", "success", "growth"],
  },
  {
    id: "mkt-002", name: "Campaign Failed", domain: "marketing",
    description: "Kampanye tidak mencapai target yang ditetapkan",
    trigger: { type: "event", eventType: "marketing.campaign_failed", data: { campaignId: "CAMP-2026-07-002", name: "Diskon Akhir Bulan", targetROI: 200, achievedROI: 65, leadsGenerated: 450, conversions: 23, budget: 35000000, revenue: 22750000, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CMO", expectedCapabilities: ["cap_marketing", "cap_finance"],
    expectedActions: ["AnalyzeFailure", "OptimizeStrategy"], expectedEvents: ["marketing.campaign_analyzed"],
    priority: "high", tags: ["marketing", "failure", "optimization"],
  },
  {
    id: "mkt-003", name: "Social Media Trend Positive", domain: "marketing",
    description: "Produk menjadi trending di media sosial",
    trigger: { type: "event", eventType: "marketing.social_trend", data: { platform: "TikTok", hashtag: "#produkkami", reach: 2500000, engagement: 185000, sentiment: "positive", productId: 205, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CMO", expectedCapabilities: ["cap_marketing", "cap_sales"],
    expectedActions: ["AmplifyTrend", "StockPrepare"], expectedEvents: ["marketing.trend_amplified"],
    priority: "high", tags: ["marketing", "social-media", "viral"],
  },
  {
    id: "mkt-004", name: "Competitor Launch Alert", domain: "marketing",
    description: "Kompetitor meluncurkan produk baru",
    trigger: { type: "event", eventType: "marketing.competitor_launch", data: { competitorName: "PT Saingan Utama", productName: "Minuman Energi X", launchDate: "2026-08-01", targetMarket: "anak muda", estimatedPrice: 8000, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CMO", expectedCapabilities: ["cap_marketing", "cap_sales"],
    expectedActions: ["CompetitiveAnalysis", "CounterStrategy"], expectedEvents: ["marketing.competitor_strategy"],
    priority: "high", tags: ["marketing", "competitor", "strategy"],
  },
  {
    id: "mkt-005", name: "Brand Sentiment Drop", domain: "marketing",
    description: "Sentimen merek menurun di pasar",
    trigger: { type: "event", eventType: "marketing.brand_sentiment_drop", data: { brandScore: 62, previousScore: 81, dropPct: 23.5, period: "Q3-2026", mainIssue: "Kualitas produk menurun", branchId: 1 }, branchId: 1 },
    expectedExecutive: "CMO", expectedCapabilities: ["cap_marketing", "cap_production"],
    expectedActions: ["BrandRepairPlan", "QualityInitiative"], expectedEvents: ["marketing.brand_plan_created"],
    priority: "critical", tags: ["marketing", "brand", "reputation"],
  },
  {
    id: "mkt-006", name: "Ad Spend Efficiency Drop", domain: "marketing",
    description: "Efisiensi iklan menurun, CAC meningkat",
    trigger: { type: "event", eventType: "marketing.ad_efficiency_drop", data: { previousCAC: 25000, currentCAC: 45000, increasePct: 80, channel: "Google Ads", monthlySpend: 75000000, conversions: 1667, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CMO", expectedCapabilities: ["cap_marketing", "cap_finance"],
    expectedActions: ["OptimizeAdSpend", "ChannelMixReview"], expectedEvents: ["marketing.ad_optimized"],
    priority: "high", tags: ["marketing", "ads", "efficiency"],
  },
];
