// utils/sentimentAggregator.js

export function calculateMoodCardData(feedbacks) {
  // 1. Set up the baseline structure for the 4 required categories
  const categoryStats = {
    Programs: { Positive: 0, Neutral: 0, Negative: 0, total: 0 },
    Services: { Positive: 0, Neutral: 0, Negative: 0, total: 0 },
    Facilities: { Positive: 0, Neutral: 0, Negative: 0, total: 0 },
    Documents: { Positive: 0, Neutral: 0, Negative: 0, total: 0 },
  };

  // 2. Loop through all feedbacks and count them
  feedbacks.forEach((fb) => {
    // Note: Make sure your Firestore document saves a "category" field!
    const cat = fb.category; 
    const sentiment = fb.sentiment; // "Positive", "Neutral", or "Negative"
    
    // Only count it if it matches one of our 4 main categories and has been analyzed
    if (categoryStats[cat] && sentiment) {
      categoryStats[cat][sentiment] += 1;
      categoryStats[cat].total += 1;
    }
  });

  // 3. Convert the raw counts into Percentages for the Frontend
  const moodCards = Object.keys(categoryStats).map((categoryName) => {
    const data = categoryStats[categoryName];
    const total = data.total;
    
    return {
      categoryName: categoryName,
      totalFeedbacks: total,
      percentages: {
        // We use Math.round to avoid ugly decimals like 33.3333%
        // We also check if total === 0 to prevent "NaN" (Not a Number) errors
        Positive: total === 0 ? 0 : Math.round((data.Positive / total) * 100),
        Neutral: total === 0 ? 0 : Math.round((data.Neutral / total) * 100),
        Negative: total === 0 ? 0 : Math.round((data.Negative / total) * 100),
      }
    };
  });

  return moodCards;
}