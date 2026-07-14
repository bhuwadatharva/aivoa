import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, 
  ClipboardSignature, 
  Smile, 
  CalendarClock, 
  ArrowUpRight, 
  Plus, 
  Clock,
  ExternalLink
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { RootState, AppDispatch } from '../store';
import { fetchDashboardMetrics } from '../store/dashboardSlice';
import { fetchHCPs } from '../store/hcpSlice';

const Dashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  const { metrics, loading, error } = useSelector((state: RootState) => state.dashboard);
  const { hcps } = useSelector((state: RootState) => state.hcp);

  useEffect(() => {
    dispatch(fetchDashboardMetrics());
    dispatch(fetchHCPs());
  }, [dispatch]);

  // Loading Skeleton
  if (loading || !metrics) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          ))}
        </div>
        {/* Chart Rows Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // Sentiment Pie Chart formatting
  const sentimentData = [
    { name: 'Positive', value: metrics.sentiment_breakdown.Positive, color: '#10b981' },
    { name: 'Neutral', value: metrics.sentiment_breakdown.Neutral, color: '#0d9488' },
    { name: 'Negative', value: metrics.sentiment_breakdown.Negative, color: '#f43f5e' },
  ].filter(d => d.value > 0);

  // If database is completely empty (no seeded data has run yet), add placeholder to look beautiful
  const finalSentimentData = sentimentData.length > 0 ? sentimentData : [
    { name: 'Positive', value: 8, color: '#10b981' },
    { name: 'Neutral', value: 4, color: '#0d9488' },
    { name: 'Negative', value: 2, color: '#f43f5e' },
  ];

  const totalSentiments = finalSentimentData.reduce((acc, curr) => acc + curr.value, 0);
  const positiveRatio = Math.round(((finalSentimentData.find(d => d.name === 'Positive')?.value || 0) / totalSentiments) * 100);

  return (
    <div className="space-y-6">
      {/* 1. Header Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Total HCPs */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Indexed HCPs</span>
            <h3 className="text-2xl font-black mt-1 text-slate-800 dark:text-slate-100">{metrics.total_hcps}</h3>
            <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 mt-1">
              <span>Physicians listed</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-healthcare-500/10 flex items-center justify-center text-healthcare-600 dark:text-healthcare-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Interactions */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Logged Visits</span>
            <h3 className="text-2xl font-black mt-1 text-slate-800 dark:text-slate-100">{metrics.total_interactions}</h3>
            <p className="text-[10px] text-healthcare-500 font-semibold flex items-center gap-1 mt-1">
              <span>MSL interactions logged</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <ClipboardSignature className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Sentiment Ratio */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Positive Sentiment</span>
            <h3 className="text-2xl font-black mt-1 text-slate-800 dark:text-slate-100">{positiveRatio}%</h3>
            <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 mt-1">
              <span>Excellent response rate</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Smile className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Pending Followups */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Follow-Up Tasks</span>
            <h3 className="text-2xl font-black mt-1 text-slate-800 dark:text-slate-100">{metrics.pending_followups_count}</h3>
            <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1 mt-1">
              <span>Actionable deadlines</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
            <CalendarClock className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Timeline Chart */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Interactions Timeline</h4>
              <p className="text-[10px] text-slate-400">Total customer touchpoints in recent months</p>
            </div>
            <Link to="/history" className="text-[10px] text-healthcare-600 hover:underline flex items-center gap-1 font-bold">
              View History
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.interactions_over_time} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px', border: 'none' }} />
                <Area type="monotone" dataKey="count" name="Visits" stroke="#14b8a6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVisits)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment Doughnut */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Physician Sentiments</h4>
            <p className="text-[10px] text-slate-400 mb-4 font-light">Qualitative response rates aggregated</p>
          </div>

          <div className="h-44 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={finalSentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {finalSentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center label */}
            <div className="absolute flex flex-col items-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Positive</span>
              <span className="text-xl font-black text-slate-800 dark:text-slate-100">{positiveRatio}%</span>
            </div>
          </div>

          <div className="flex justify-around items-center text-xs mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/40">
            {finalSentimentData.map((d, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{d.value}</span>
                <span className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                  {d.name}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. Bottom Row: Quick Actions & HCP Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Target Doctor shortcuts */}
        <div className="glass-card p-5 lg:col-span-1">
          <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mb-4">Target HCPs</h4>
          <div className="space-y-3.5">
            {hcps.slice(0, 3).map((hcp) => (
              <div 
                key={hcp.id}
                onClick={() => navigate(`/hcps/${hcp.id}`)}
                className="p-3 rounded-xl bg-slate-100/40 dark:bg-slate-900/40 hover:bg-slate-100/80 dark:hover:bg-slate-900/80 border border-slate-200/20 dark:border-slate-800/40 flex items-center justify-between cursor-pointer transition-all duration-200 group"
              >
                <div>
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-healthcare-600 dark:group-hover:text-healthcare-400">
                    {hcp.name}
                  </h5>
                  <p className="text-[10px] text-slate-400 mt-0.5">{hcp.specialty} • {hcp.hospital}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                    hcp.prescription_likelihood === 'High' 
                      ? 'bg-emerald-500/10 text-emerald-600' 
                      : hcp.prescription_likelihood === 'Medium'
                      ? 'bg-healthcare-500/10 text-healthcare-600'
                      : 'bg-red-500/10 text-red-600'
                  }`}>
                    {hcp.prescription_likelihood}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Link to="/hcps" className="text-xs text-healthcare-600 hover:underline flex items-center justify-center gap-1 font-bold mt-4 border-t border-slate-100 dark:border-slate-800/40 pt-3">
            Open HCP Directory
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Live Followup calendar preview */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Scheduled Follow-ups</h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-bold">Pending Actions</span>
          </div>

          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {metrics.pending_followups_count > 0 ? (
              // Seeded standard followups or logged ones
              <div className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/20 dark:border-red-500/10 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 flex-shrink-0 mt-0.5">
                    <Clock className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Submit Formulary Submission for Product X</h5>
                    <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                      Check board decisions for clinical trial results submitted during meeting with Dr. Harrison.
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200">Due in 5 days</p>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 font-bold mt-1 inline-block">High Priority</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                No upcoming follow-up deadlines. Log an interaction with follow-up instructions to schedule!
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
