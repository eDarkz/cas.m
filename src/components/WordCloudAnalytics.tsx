interface WordCloudAnalyticsProps {
  words: Array<{ text: string; count: number }>;
}

export default function WordCloudAnalytics({ words }: WordCloudAnalyticsProps) {
  if (words.length === 0) return null;

  const maxCount = Math.max(...words.map(w => w.count));
  const minCount = Math.min(...words.map(w => w.count));

  const getFontSize = (count: number) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1);
    return 12 + normalized * 32;
  };

  const getColor = (count: number) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1);
    if (normalized > 0.7) return 'text-red-600';
    if (normalized > 0.5) return 'text-orange-600';
    if (normalized > 0.3) return 'text-blue-600';
    return 'text-slate-600';
  };

  return (
    <div className="flex flex-wrap gap-4 items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200">
      {words.map((word, index) => (
        <div
          key={index}
          className={`font-bold ${getColor(word.count)} hover:scale-110 transition-transform cursor-default`}
          style={{ fontSize: `${getFontSize(word.count)}px` }}
          title={`${word.text}: ${word.count} ocurrencias`}
        >
          {word.text}
        </div>
      ))}
    </div>
  );
}
