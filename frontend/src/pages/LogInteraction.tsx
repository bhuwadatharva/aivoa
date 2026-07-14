import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Save, AlertTriangle, ShieldCheck } from 'lucide-react';
import { RootState, AppDispatch } from '../store';
import { fetchHCPs } from '../store/hcpSlice';
import { createInteraction, clearInteractionStatus, fetchMetadata } from '../store/interactionSlice';
import RightAssistant from '../components/RightAssistant';

const LogInteraction = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { hcps } = useSelector((state: RootState) => state.hcp);
  const { currentExtractedData, complianceWarning, metadata, loading } = useSelector((state: RootState) => state.interaction);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      id: '',
      hcp_id: '',
      interaction_type: 'In-Person',
      meeting_date: new Date().toISOString().substring(0, 10),
      meeting_time: '10:00',
      attendees: '',
      topics_discussed: '',
      notes: '',
      sentiment: 'Neutral',
      summary: '',
      samples: '',
      product_ids: [] as string[],
      competitor_ids: [] as string[],
      material_ids: [] as string[],
      follow_up_date: '',
      follow_up_priority: 'Medium',
      follow_up_reason: ''
    }
  });

  const selectedHcpId = watch('hcp_id');
  const activeHcp = hcps.find(h => h.id === selectedHcpId);
  const watchedNotes = watch('notes');
  const watchedFormValues = watch();

  useEffect(() => {
    dispatch(fetchHCPs());
    dispatch(fetchMetadata());
    return () => {
      dispatch(clearInteractionStatus());
    };
  }, [dispatch]);

  // Sync form inputs when AI extracts logs from natural language
  useEffect(() => {
    if (currentExtractedData) {
      // 1. Refresh HCP list if a new doctor was created automatically
      if (currentExtractedData.doctor?.created) {
        dispatch(fetchHCPs());
      }

      // 2. Select doctor
      if (currentExtractedData.doctor?.id) {
        setValue('hcp_id', currentExtractedData.doctor.id);
        if (currentExtractedData.doctor.name) {
          setValue('attendees', currentExtractedData.doctor.name);
        }
      }

      // 3. Map interaction fields
      const intr = currentExtractedData.interaction;
      if (intr) {
        if (intr.id) {
          setValue('id', intr.id);
        }
        if (intr.interaction_type) {
          setValue('interaction_type', intr.interaction_type);
        }
        if (intr.sentiment) {
          setValue('sentiment', intr.sentiment);
        }
        if (intr.summary) {
          setValue('summary', intr.summary);
        }
        if (intr.notes) {
          setValue('notes', intr.notes);
        }
        if (intr.samples !== undefined) {
          setValue('samples', String(intr.samples));
        }

        // Topics discussed checklist
        if (intr.topics && metadata.products.length > 0) {
          const productIds = intr.topics.map((pName: string) => {
            const match = metadata.products.find((p: any) => p.name.toLowerCase().includes(pName.toLowerCase()));
            return match ? match.id : null;
          }).filter(Boolean);
          setValue('product_ids', productIds);
          setValue('topics_discussed', intr.topics.join(', '));
        }

        // Materials shared checklist
        if (intr.materials && metadata.materials.length > 0) {
          const materialIds = intr.materials.map((mName: string) => {
            const match = metadata.materials.find((m: any) => m.name.toLowerCase().includes(mName.toLowerCase()));
            return match ? match.id : null;
          }).filter(Boolean);
          setValue('material_ids', materialIds);
        }

        // Competitors mentioned checklist
        if (intr.competitors && metadata.competitors.length > 0) {
          const competitorIds = intr.competitors.map((cName: string) => {
            const match = metadata.competitors.find((c: any) => c.name.toLowerCase().includes(cName.toLowerCase()));
            return match ? match.id : null;
          }).filter(Boolean);
          setValue('competitor_ids', competitorIds);
        }

        // Follow-up date
        if (intr.follow_up) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (dateRegex.test(intr.follow_up)) {
            setValue('follow_up_date', intr.follow_up);
          } else {
            const lowerFu = intr.follow_up.toLowerCase();
            let days = 7;
            if (lowerFu.includes('two weeks') || lowerFu.includes('2 weeks') || lowerFu.includes('14 days')) {
              days = 14;
            } else if (lowerFu.includes('tomorrow') || lowerFu.includes('1 day')) {
              days = 1;
            }
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + days);
            setValue('follow_up_date', nextWeek.toISOString().substring(0, 10));
          }
          setValue('follow_up_reason', `Plan follow up: ${intr.follow_up}`);
        }
      }
    }
  }, [currentExtractedData, hcps, metadata, setValue, dispatch]);

  const onSubmit = (data: any) => {
    dispatch(createInteraction(data)).then((res: any) => {
      if (!res.error) {
        navigate('/history');
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-10rem)]">
      
      {/* Left Columns: Form */}
      <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between overflow-y-auto space-y-6">
        
        <div>
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Save className="w-5 h-5 text-healthcare-600" />
            Structured Visit Log Details
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Fill the fields manually or use the AI Sidekick on the right to extract and auto-populate everything.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 flex-grow">
          {/* Hidden ID field for updates */}
          <input type="hidden" {...register('id')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* HCP Select */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Doctor Focus</span>
                {activeHcp && (
                  <span className="px-2 py-0.5 rounded-md bg-healthcare-100 dark:bg-healthcare-950/80 text-healthcare-750 dark:text-healthcare-400 font-semibold text-[10px]">
                    Hospital: {activeHcp.hospital}
                  </span>
                )}
              </label>
              <select
                {...register('hcp_id', { required: 'HCP target is required' })}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-healthcare-500 dark:text-slate-200"
              >
                <option value="">Select Doctor Profile</option>
                {hcps.map(h => (
                  <option key={h.id} value={h.id}>{h.name} ({h.specialty})</option>
                ))}
              </select>
              {errors.hcp_id && <p className="text-xs text-red-400 mt-1">{errors.hcp_id.message as string}</p>}
            </div>

            {/* Interaction Type */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Interaction Channel</label>
              <select
                {...register('interaction_type')}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-healthcare-500 dark:text-slate-200"
              >
                <option value="In-Person">In-Person (Medical Detailing)</option>
                <option value="Video">Video Call</option>
                <option value="Email">Email Followup</option>
                <option value="Phone">Phone Conversation</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Meeting Date */}
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date of Visit</label>
              <input
                type="date"
                {...register('meeting_date', { required: true })}
                className="w-full glass-input text-xs"
              />
            </div>

            {/* Meeting Time */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Time</label>
              <input
                type="time"
                {...register('meeting_time', { required: true })}
                className="w-full glass-input text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Attendees */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Attendees</label>
              <input
                type="text"
                {...register('attendees')}
                placeholder="Dr. Shah, Alex Rep"
                className="w-full glass-input text-xs"
              />
            </div>

            {/* Topics Discussed */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Topics / Products discussed</label>
              <input
                type="text"
                {...register('topics_discussed')}
                placeholder="Cardivas-10, Efficacy concerns"
                className="w-full glass-input text-xs"
              />
            </div>
          </div>

          {/* AI-First Checkbox grids for Product, Competitor, Material metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800/40 pt-4">
            {/* Products discussed */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Products Selected</label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-2">
                {metadata.products.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-350 cursor-pointer">
                    <input type="checkbox" value={p.id} {...register('product_ids')} className="rounded border-slate-300 dark:border-slate-800 text-healthcare-600 focus:ring-healthcare-500 w-3.5 h-3.5" />
                    <span>{p.name}</span>
                  </label>
                ))}
                {metadata.products.length === 0 && <span className="text-[10px] text-slate-450 italic">No products available</span>}
              </div>
            </div>

            {/* Competitors mentioned */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Competitors Mentioned</label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-2">
                {metadata.competitors.map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-350 cursor-pointer">
                    <input type="checkbox" value={c.id} {...register('competitor_ids')} className="rounded border-slate-300 dark:border-slate-800 text-healthcare-600 focus:ring-healthcare-500 w-3.5 h-3.5" />
                    <span>{c.name}</span>
                  </label>
                ))}
                {metadata.competitors.length === 0 && <span className="text-[10px] text-slate-450 italic">No competitors available</span>}
              </div>
            </div>

            {/* Materials shared */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Materials Shared</label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-2">
                {metadata.materials.map(m => (
                  <label key={m.id} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-350 cursor-pointer">
                    <input type="checkbox" value={m.id} {...register('material_ids')} className="rounded border-slate-300 dark:border-slate-800 text-healthcare-600 focus:ring-healthcare-500 w-3.5 h-3.5" />
                    <span>{m.name}</span>
                  </label>
                ))}
                {metadata.materials.length === 0 && <span className="text-[10px] text-slate-450 italic">No materials available</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800/40 pt-4">
            {/* Sentiment */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">HCP Detailing Sentiment</label>
              <select
                {...register('sentiment')}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-healthcare-500 dark:text-slate-200"
              >
                <option value="Positive">Positive (Interested in prescribing)</option>
                <option value="Neutral">Neutral (Requesting documents)</option>
                <option value="Negative">Negative (Refused product or has objections)</option>
              </select>
            </div>

            {/* Samples */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Samples Delivered</label>
              <input
                type="text"
                {...register('samples')}
                placeholder="e.g. Cardivas-10 10mg (x5)"
                className="w-full glass-input text-xs"
              />
            </div>
          </div>

          {/* Follow-up Planner section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800/40 pt-4">
            {/* Follow-up Date */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Follow-up Date</label>
              <input
                type="date"
                {...register('follow_up_date')}
                className="w-full glass-input text-xs"
              />
            </div>

            {/* Follow-up Priority */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Follow-up Priority</label>
              <select
                {...register('follow_up_priority')}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-healthcare-500 dark:text-slate-200"
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
            </div>

            {/* Follow-up Reason */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Follow-up Action/Reason</label>
              <input
                type="text"
                {...register('follow_up_reason')}
                placeholder="e.g. Deliver oncology trial slides"
                className="w-full glass-input text-xs"
              />
            </div>
          </div>

          {/* Visit Summary heading */}
          <div className="border-t border-slate-100 dark:border-slate-800/40 pt-4">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Visit Summary</label>
            <input
              type="text"
              {...register('summary', { required: 'A brief summary of visit is required' })}
              placeholder="Initial pitch on Cardivas-10 trials"
              className="w-full glass-input text-xs"
            />
            {errors.summary && <p className="text-xs text-red-400 mt-1">{errors.summary.message as string}</p>}
          </div>

          {/* Interaction Notes */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Detailed Call Notes</label>
            <textarea
              rows={3}
              {...register('notes', { required: 'Visit detailing notes are required' })}
              placeholder="Log specific pricing objections, physician feedback and shared brochures..."
              className="w-full glass-input text-xs py-3 resize-none"
            ></textarea>
            {errors.notes && <p className="text-xs text-red-400 mt-1">{errors.notes.message as string}</p>}
          </div>

          {/* Real-time Compliance Warning Banner */}
          {complianceWarning && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-500 font-semibold animate-fadeIn">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div>
                <span className="font-bold block">Compliance Warning</span>
                <span className="font-light text-[11px] block mt-0.5">{complianceWarning}</span>
              </div>
            </div>
          )}

          {!complianceWarning && watchedNotes && watchedNotes.trim().length > 10 && (
            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-600 font-semibold">
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              <span>Compliance validation passed. No off-label/gift issues detected.</span>
            </div>
          )}

          {/* Submit and Reset buttons */}
          <div className="border-t border-slate-100 dark:border-slate-800/40 pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                reset();
                dispatch(clearInteractionStatus());
              }}
              className="mr-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold text-xs px-6 py-3 rounded-xl transition-all"
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-healthcare-600 hover:bg-healthcare-700 text-white font-semibold text-xs px-6 py-3 rounded-xl transition-all shadow-lg shadow-healthcare-600/10"
            >
              {loading ? 'Submitting Log...' : 'Save Visit Log'}
            </button>
          </div>

        </form>

      </div>

      {/* Right Column: AI Sidekick Panel */}
      <div className="lg:col-span-1 h-full">
        <RightAssistant formValues={watchedFormValues} />
      </div>

    </div>
  );
};

export default LogInteraction;
