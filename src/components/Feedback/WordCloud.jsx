import React, { useMemo } from 'react';
import { MessageSquare } from 'lucide-react';

export default function WordCloud({ feedbacks = [] }) {
  const wordCloudData = useMemo(() => {
    // Expanded list of English and Tagalog filler words, pronouns, and test data
    const stopWords = [
      // English fillers
      'the', 'to', 'and', 'a', 'is', 'in', 'of', 'for', 'it', 'was', 'that', 'with', 'are', 'too', 'but', 
      'this', 'these', 'those', 'then', 'than', 'here', 'there', 'where', 'when', 'why', 'how', 'all', 
      'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 
      'own', 'same', 'so', 'very', 'can', 'will', 'just', 'should', 'now', 'have', 'has', 'had', 'from',
      'yea', 'yeah', 'yes', 'nope', 'nah', 'ok', 'okay', 'alright', 'fine', 'sure', 'maybe', 'perhaps',
      'wow', 'oh', 'ah', 'hmm', 'uh', 'um', 'like', 'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers', 'they', 'them', 'their', 'theirs', 'we', 'us', 'our', 'ours', 'me', 'my', 'mine',
      'i', 'me', 'my', 'mine', 'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'we', 'us', 'our', 'ours', 'they', 'them', 'their', 'theirs',
      'nice', 'were', 'been', 'being', 'do', 'does', 'did', 'doing', 'have', 'has', 'had', 'having', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'hell', 


      
      // Tagalog fillers & pronouns
      'ang', 'mga', 'kaso', 'niyo', 'niya', 'sa', 'ng', 'na', 'po', 'at', 'ay', 'ito', 'yung', 'ako', 
      'ikaw', 'siya', 'sila', 'kami', 'kayo', 'nila', 'namin', 'natin', 'ko', 'mo', 'din', 'rin', 'lang', 
      'naman', 'pa', 'ba', 'eh', 'oh', 'nga', 'ni', 'kay', 'kung', 'pag', 'kapag', 'dahil', 'para', 'daw', 
      'raw', 'yata', 'pala', 'nung', 'dito', 'doon', 'nito', 'niyan', 'noon', 'ano', 'saan', 'bakit',
      'grabe', 'sana', 'siguro', 'marahil', 'tulad', 'gaya', 'tapos', 'kaya', 'pero', 'dapat', 'pwede',
      'sobrang', 'masyado', 'medyo', 'halos', 'bagay', 'gusto', 'ayaw', 'nag', 
      
      // Junk / Test words
      'test', 'testing', 'asd', 'asdf'
    ];
    
    const wordCounts = {};
    
    feedbacks.forEach(fb => {
      if (fb.comment) {
        // Strip punctuation and split by whitespace
        const words = fb.comment.toLowerCase().replace(/[^\w\s\u0900-\u097F]/gi, '').split(/\s+/);
        words.forEach(word => {
          // Keep words longer than 2 characters that aren't in our stoplist
          if (word.length > 2 && !stopWords.includes(word)) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
          }
        });
      }
    });
    
    // Convert to array, sort by frequency, and take the top 30
    return Object.entries(wordCounts)
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);
  }, [feedbacks]);

  return (
    <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MessageSquare size={18} /> Most Mentioned Terms
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', alignContent: 'center', flex: 1, padding: '20px', background: '#f8fafc', borderRadius: '8px' }}>
        {wordCloudData.length === 0 ? (
          <span style={{ color: '#94a3b8', textAlign: 'center' }}>Not enough data in this timeframe to generate word cloud.</span>
        ) : (
          wordCloudData.map((word, idx) => {
            const fontSize = Math.max(12, Math.min(word.count * 5 + 10, 40));
            const colors = ['#317D89', '#1a56a0', '#e11d48', '#e8a020', '#166534'];
            return (
              <span 
                key={word.text} 
                style={{ 
                  fontSize: `${fontSize}px`, 
                  color: colors[idx % colors.length], 
                  fontWeight: fontSize > 20 ? 800 : 500, 
                  lineHeight: 1, 
                  cursor: 'default' 
                }} 
                title={`Mentioned ${word.count} times`}
              >
                {word.text}
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}