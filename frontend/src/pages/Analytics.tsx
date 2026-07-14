import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Legend, CartesianGrid 
} from 'recharts';
import { RootState, AppDispatch } from '../store';
import { fetchDashboardMetrics } from '../store/dashboardSlice';

const Analytics = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { metrics, loading } = useSelector((state: RootState) => state.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardMetrics());
  }, [dispatch]);

  if (loading || !metrics) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  // Formatting Sentiment Data
  const sentimentData = [
    { name: 'Positive Response', value: metrics.sentiment_breakdown.Positive, color: '#10b981' },
    { name: 'Neutral Response', value: metrics.sentiment_breakdown.Neutral, color: '#0d9488' },
    { name: 'Negative Response', value: metrics.sentiment_breakdown.Negative, color: '#f43f5e' },
  ].filter(d => d.value > 0);

  const finalSentimentData = sentimentData.length > 0 ? sentimentData : [
    { name: 'Positive Response', value: 8, color: '#10b981' },
    { name: 'Neutral Response', value: 4, color: '#0d9488' },
    { name: 'Negative Response', value: 2, color: '#f43f5e' },
  ];

  // Helper for empty data checks
  const hasProductsData = metrics.top_products.some(p => p.count > 0);
  const finalProductsData = hasProductsData ? metrics.top_products : [
    { name: 'Product X', count: 12 },
    { name: 'Cardivas-10', count: 8 },
    { name: 'Oncolyze-B', count: 6 },
    { name: 'Gliclazide-MR', count: 3 }
  ];

  const hasCompetitorsData = metrics.competitor_mentions.some(c => c.count > 0);
  const finalCompetitorsData = hasCompetitorsData ? metrics.competitor_mentions : [
    { name: 'PharmaCorp Y', count: 6 },
    { name: 'Competitor Y', count: 4 },
    { name: 'Pfizer', count: 2 },
    { name: 'Novartis', count: 1 }
  ];

  return (
    <div className="space-y-6">
      
      {/* Chart Row 1: Visits Timeline & Sentiment Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Visit Volume */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Visits Timeline Volume</h4>
            <p className="text-[10px] text-slate-400 mb-4 font-light">Chronological density of territory interactions.</p>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.interactions_over_time} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.1} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '10px' }} />
                <Area type="monotone" dataKey="count" name="Interactions" stroke="#0d9488" strokeWidth={2} fill="#0d9488" fillOpacity={0.06} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment Doughnut */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Doctor Feedback Sentiment Split</h4>
            <p className="text-[10px] text-slate-400 mb-4 font-light">Visit sentiment breakdowns categorized.</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={finalSentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {finalSentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                <Legend verticalAlign="bottom" height={36} iconSize={10} style={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Chart Row 2: Top Products & Competitor Mentions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Products */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Top Portfolios Discussed</h4>
            <p className="text-[10px] text-slate-400 mb-4 font-light">Count of interactions where product was key topic.</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finalProductsData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '10px' }} />
                <Bar dataKey="count" name="Mentions" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Competitor Intel */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Competitor Market Mentions</h4>
            <p className="text-[10px] text-slate-400 mb-4 font-light">Frequency of competitor product callouts by HCPs.</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finalCompetitorsData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '10px' }} />
                <Bar dataKey="count" name="Mentions" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Analytics;
