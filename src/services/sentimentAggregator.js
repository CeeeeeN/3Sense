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
    // ─── OPTIMIZED: Defensive Data Normalization ───
    // Protects against database casing inconsistencies (Category vs category, positive vs Positive)
    const rawCat = String(fb.category || fb.Category || "").trim();
    const rawSentiment = String(fb.sentiment || fb.Sentiment || "").trim(); 
    
    const catLower = rawCat.toLowerCase();
    const sentimentFormatted = rawSentiment.charAt(0).toUpperCase() + rawSentiment.slice(1).toLowerCase();

    // Find the exact key in our dictionary case-insensitively
    const exactCategoryKey = Object.keys(categoryStats).find(k => k.toLowerCase() === catLower);

    // Only count it if it matches our 4 categories AND has a valid sentiment
    if (exactCategoryKey && categoryStats[exactCategoryKey][sentimentFormatted] !== undefined) {
      categoryStats[exactCategoryKey][sentimentFormatted] += 1;
      categoryStats[exactCategoryKey].total += 1;
    }
  });

  // 3. Convert the raw counts into Percentages for the Frontend
  return Object.keys(categoryStats).map((categoryName) => {
    const data = categoryStats[categoryName];
    const total = data.total;
    
    if (total === 0) {
      return {
        categoryName,
        totalFeedbacks: 0,
        percentages: { Positive: 0, Neutral: 0, Negative: 0 }
      };
    }

    // Calculate raw mathematical percentages
    const rawPos = (data.Positive / total) * 100;
    const rawNeu = (data.Neutral / total) * 100;
    const rawNeg = (data.Negative / total) * 100;

    // Standard rounding
    let pos = Math.round(rawPos);
    let neu = Math.round(rawNeu);
    let neg = Math.round(rawNeg);

    // ─── OPTIMIZED: The 100% Remainder Correction ───
    // Fixes the visual bug where 33.333% rounds to 33, 33, 33 (Total: 99%)
    const diff = 100 - (pos + neu + neg);
    if (diff !== 0) {
        // Add the remainder to the largest value to hide the rounding error
        if (pos >= neu && pos >= neg) pos += diff;
        else if (neu >= pos && neu >= neg) neu += diff;
        else neg += diff;
    }

    return {
      categoryName,
      totalFeedbacks: total,
      percentages: {
        Positive: pos,
        Neutral: neu,
        Negative: neg,
      }
    };
  });
}