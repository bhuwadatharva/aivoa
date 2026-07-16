import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ArrowLeft, 
  MapPin, 
  Mail, 
  Phone, 
  Award, 
  History, 
  Bot, 
  FileText, 
  Sparkles, 
  Plus,
  Compass,
  AlertCircle
} from 'lucide-react';
import { RootState, AppDispatch } from '../store';
import { fetchHCPDetails, fetchHCPInsights, resetSelectedHCP } from '../store/hcpSlice';
import { fetchInteractions, fetchMeetingPrep, fetchNextBestAction, clearInteractionStatus } from '../store/interactionSlice';

const HCPDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { selectedHCP, insights, loading: hcpLoading } = useSelector((state: RootState) => state.hcp);
  const { interactions, meetingPrep, nextBestAction } = useSelector((state: RootState) => state.interaction);
  
  const [activeTab, setActiveTab] = useState<'insights' | 'history'>('insights');
  const [loadingPrep, setLoadingPrep] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchHCPDetails(id));
      dispatch(fetchHCPInsights(id));
      dispatch(fetchInteractions({ hcp_id: id }));
      // Clear any leftover briefings
      dispatch(clearInteractionStatus());
    }
    return () => {
      dispatch(resetSelectedHCP());
    };
  }, [id, dispatch]);

  const handleGeneratePrep = () => {
    if (!id) return;
    setLoadingPrep(true);
    dispatch(fetchMeetingPrep(id)).finally(() => setLoadingPrep(false));
  };

  const handleRecommendAction = () => {
    if (!id) return;
    setLoadingAction(true);
    dispatch(fetchNextBestAction(id)).finally(() => setLoadingAction(false));
  };

  if (hcpLoading || !selectedHCP) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/hcps')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-healthcare-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </button>
      </div>

      {/* 1. HCP Profile Header Card */}
      <div className="glass-card p-6 bg-gradient-to-br from-white/90 to-teal-50/20 dark:from-slate-900/90 dark:to-teal-950/5 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        
        {/* Glow border */}
        <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-healthcare-500 to-teal-400"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-healthcare-500/10 text-healthcare-600 dark:text-healthcare-400 flex items-center justify-center font-black text-2xl shadow-inner flex-shrink-0">
            {selectedHCP.name.replace('Dr. ', '').charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{selectedHCP.name}</h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-healthcare-500/10 text-healthcare-600 dark:text-healthcare-400 font-bold uppercase tracking-wider">
                {selectedHCP.specialty}
              </span>
            </div>
            
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-y-1.5 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">{selectedHCP.hospital}</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">{selectedHCP.email}</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">{selectedHCP.phone || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Statistics Summary */}
        <div className="flex items-center gap-5 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/40">
          <div className="text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Relationship</span>
            <span className="text-lg font-black text-healthcare-600 dark:text-healthcare-400">{selectedHCP.relationship_score}/100</span>
          </div>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
          <div className="text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Clinical Interest</span>
            <span className="text-lg font-black text-teal-600 dark:text-teal-400">{selectedHCP.interest_score}/100</span>
          </div>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
          <div className="text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Prescribe Rate</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block ${
              selectedHCP.prescription_likelihood === 'High' 
                ? 'bg-emerald-500/10 text-emerald-600' 
                : selectedHCP.prescription_likelihood === 'Medium'
                ? 'bg-healthcare-500/10 text-healthcare-600'
                : 'bg-red-500/10 text-red-600'
            }`}>
              {selectedHCP.prescription_likelihood}
            </span>
          </div>
        </div>

      </div>

      {/* 2. Main details grid splitting tabs and AI tool summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: Tabs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 dark:border-slate-800/40">
            <button
              onClick={() => setActiveTab('insights')}
              className={`pb-3 px-6 text-xs font-bold transition-all border-b-2
                ${activeTab === 'insights'
                  ? 'border-healthcare-500 text-healthcare-600 dark:text-healthcare-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Insights Dashboard
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 px-6 text-xs font-bold transition-all border-b-2
                ${activeTab === 'history'
                  ? 'border-healthcare-500 text-healthcare-600 dark:text-healthcare-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              <span className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Past Visit Logs ({interactions.length})
              </span>
            </button>
          </div>

          {/* Tab Content 1: Insights */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              
              {insights ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  
                  {/* Card: Product Preferences */}
                  <div className="glass-card p-5">
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">Favorite Portfolios</h4>
                    <div className="flex flex-wrap gap-2">
                      {insights.favorite_products.map((p: any, i: number) => (
                        <span key={i} className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/20 dark:border-slate-800/40 font-semibold text-slate-700 dark:text-slate-300">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card: Topics Discussed */}
                  <div className="glass-card p-5">
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">Frequently Discussed Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {insights.frequently_discussed_topics.map((t: any, i: number) => (
                        <span key={i} className="text-xs px-3 py-1.5 rounded-xl bg-healthcare-550 dark:bg-healthcare-950/20 text-healthcare-600 dark:text-healthcare-400 font-semibold border border-healthcare-100/20">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card: Objections */}
                  <div className="glass-card p-5 sm:col-span-2">
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4.5 h-4.5 text-amber-500" />
                      Known Clinical Objections
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/20 dark:border-slate-800/40">
                      {insights.common_objections}
                    </p>
                  </div>

                </div>
              ) : (
                <div className="text-center py-20 text-slate-400 text-xs">
                  No insights generated yet. Log interactions to trigger analytics!
                </div>
              )}

            </div>
          )}

          {/* Tab Content 2: History */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Interaction Timeline</h4>
                <Link to="/log-interaction" className="text-xs text-white bg-healthcare-600 hover:bg-healthcare-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all shadow shadow-healthcare-600/10">
                  <Plus className="w-3.5 h-3.5" />
                  Log New Visit
                </Link>
              </div>

              {interactions.length > 0 ? (
                interactions.map((intr) => (
                  <div key={intr.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/20 dark:border-slate-800/40 shadow-sm space-y-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200/20 dark:border-slate-800/40">
                          {intr.interaction_type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">{intr.meeting_date} @ {intr.meeting_time.substring(0,5)}</span>
                      </div>
                      
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        intr.sentiment === 'Positive'
                          ? 'bg-emerald-500/15 text-emerald-600'
                          : intr.sentiment === 'Negative'
                          ? 'bg-red-500/15 text-red-600'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {intr.sentiment}
                      </span>
                    </div>

                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      {intr.summary}
                    </p>
                    
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light whitespace-pre-line bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/20 dark:border-slate-800/40">
                      {intr.notes}
                    </p>

                    {/* Products shared */}
                    {intr.products.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[9px] text-slate-400 font-bold uppercase mr-1.5">Products:</span>
                        {intr.products.map((p: any, idx: number) => (
                          <span key={idx} className="text-[10px] bg-healthcare-500/10 text-healthcare-600 dark:text-healthcare-400 font-bold px-2.5 py-0.5 rounded-md">
                            {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200/20 dark:border-slate-800/40 rounded-2xl text-slate-400 text-sm">
                  No historical visits recorded for this doctor. Click log new visit to start!
                </div>
              )}

            </div>
          )}

        </div>

        {/* Right Column: AI Action Briefings panels */}
        <div className="space-y-6">
          
          {/* Card 1: Meeting Prep Briefing */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-healthcare-600 dark:text-healthcare-400">
              <Bot className="w-5 h-5" />
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Pre-Visit Briefing</h4>
            </div>
            
            <p className="text-xs text-slate-400 leading-normal font-light">
              Compile previous meeting topics, objections, preferences and recommended materials before visiting.
            </p>

            <button
              onClick={handleGeneratePrep}
              disabled={loadingPrep}
              className="w-full bg-slate-100 dark:bg-slate-950 hover:bg-healthcare-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4 text-healthcare-50" />
              <span>{loadingPrep ? 'Compiling Briefing...' : 'Generate AI Briefing'}</span>
            </button>

            {/* Briefing Box */}
            {meetingPrep && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl max-h-72 overflow-y-auto font-mono text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {meetingPrep}
              </div>
            )}
          </div>

          {/* Card 2: Next Best Action Plan */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
              <Compass className="w-5 h-5" />
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Strategic Next Action</h4>
            </div>

            <p className="text-xs text-slate-400 leading-normal font-light">
              Compute the next logical marketing or liaison task based on relationship scores and prescribing history.
            </p>

            <button
              onClick={handleRecommendAction}
              disabled={loadingAction}
              className="w-full bg-slate-100 dark:bg-slate-950 hover:bg-teal-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-teal-50" />
              <span>{loadingAction ? 'Analyzing History...' : 'Recommend Next Action'}</span>
            </button>

            {/* Recommendations Display */}
            {nextBestAction && (
              <div className="p-3.5 bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/20 dark:border-teal-500/10 rounded-xl space-y-2">
                <p className="text-xs font-bold text-teal-700 dark:text-teal-400">
                  ➡️ {nextBestAction.recommendation}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                  {nextBestAction.reason}
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default HCPDetails;
