import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  Search, 
  UserPlus, 
  SlidersHorizontal, 
  MapPin, 
  Stethoscope, 
  ArrowUpDown, 
  Trash2,
  X,
  Mail,
  Phone
} from 'lucide-react';
import { RootState, AppDispatch } from '../store';
import { fetchHCPs, setFilters, createHCP, deleteHCP } from '../store/hcpSlice';

const HCPList = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { hcps, loading, filters } = useSelector((state: RootState) => state.hcp);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    dispatch(fetchHCPs());
  }, [dispatch, filters.search, filters.specialty, filters.sortBy, filters.order]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setFilters({ search: e.target.value }));
  };

  const handleSort = (field: string) => {
    const isAsc = filters.sortBy === field && filters.order === 'asc';
    dispatch(setFilters({
      sortBy: field,
      order: isAsc ? 'desc' : 'asc'
    }));
  };

  const handleFilterSpecialty = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setFilters({ specialty: e.target.value }));
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Avoid navigating to details
    if (window.confirm("Are you sure you want to delete this HCP profile?")) {
      dispatch(deleteHCP(id));
    }
  };

  const onAddHCP = (data: any) => {
    dispatch(createHCP({
      name: data.name,
      specialty: data.specialty,
      hospital: data.hospital,
      email: data.email,
      phone: data.phone || undefined,
      relationship_score: Number(data.relationship_score),
      interest_score: Number(data.interest_score),
      prescription_likelihood: data.prescription_likelihood
    })).then((res: any) => {
      if (!res.error) {
        setShowAddModal(false);
        reset();
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Search & Actions Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={handleSearch}
            placeholder="Search doctors by name, specialty, or clinic..."
            className="w-full glass-input pl-11"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all duration-200
              ${showFilters 
                ? 'bg-healthcare-600 border-healthcare-600 text-white shadow-lg shadow-healthcare-600/10' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <SlidersHorizontal className="w-4.5 h-4.5" />
            <span>Filters & Sort</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-healthcare-600 hover:bg-healthcare-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-healthcare-600/15 flex items-center gap-2"
          >
            <UserPlus className="w-4.5 h-4.5" />
            <span>Register HCP</span>
          </button>
        </div>

      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fadeIn">
          
          {/* Specialty Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Specialty Focus</label>
            <select
              value={filters.specialty}
              onChange={handleFilterSpecialty}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-healthcare-500 dark:text-slate-200"
            >
              <option value="">All Specialties</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Oncology">Oncology</option>
              <option value="Endocrinology">Endocrinology</option>
              <option value="General Medicine">General Medicine</option>
            </select>
          </div>

          {/* Sort By Field */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sort Parameters</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleSort('name')}
                className={`flex-1 text-xs py-2.5 px-3.5 rounded-xl border font-semibold flex items-center justify-between
                  ${filters.sortBy === 'name' 
                    ? 'border-healthcare-500 bg-healthcare-500/10 text-healthcare-600 dark:text-healthcare-400' 
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}
              >
                <span>Name</span>
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleSort('relationship_score')}
                className={`flex-1 text-xs py-2.5 px-3.5 rounded-xl border font-semibold flex items-center justify-between
                  ${filters.sortBy === 'relationship_score' 
                    ? 'border-healthcare-500 bg-healthcare-500/10 text-healthcare-600 dark:text-healthcare-400' 
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}
              >
                <span>Score</span>
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Direction toggle */}
          <div className="flex flex-col justify-end">
            <button
              onClick={() => dispatch(setFilters({ order: filters.order === 'asc' ? 'desc' : 'asc' }))}
              className="text-xs py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-center"
            >
              Order: <span className="uppercase font-bold text-healthcare-600 dark:text-healthcare-400">{filters.order}</span>
            </button>
          </div>

        </div>
      )}

      {/* HCP Cards Grid Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          // Loading skeletons
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-56 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
          ))
        ) : hcps.length > 0 ? (
          hcps.map((hcp) => (
            <div
              key={hcp.id}
              onClick={() => navigate(`/hcps/${hcp.id}`)}
              className="glass-card p-5 cursor-pointer flex flex-col justify-between h-56 relative group overflow-hidden"
            >
              {/* Card top banner accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-healthcare-500 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              {/* Doctor basic profile */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-healthcare-500/10 text-healthcare-600 dark:text-healthcare-400 flex items-center justify-center font-bold">
                      {hcp.name.replace('Dr. ', '').charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 group-hover:text-healthcare-600 dark:group-hover:text-healthcare-400 transition-colors">
                        {hcp.name}
                      </h4>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold uppercase mt-0.5">
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>{hcp.specialty}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Delete Option */}
                  <button
                    onClick={(e) => handleDelete(e, hcp.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove Profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4.5 h-4.5 text-slate-400" />
                    <span className="truncate">{hcp.hospital}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4.5 h-4.5 text-slate-400" />
                    <span className="truncate">{hcp.email}</span>
                  </div>
                </div>
              </div>

              {/* Progress metrics and indicators */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Relationship</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-healthcare-500" style={{ width: `${hcp.relationship_score}%` }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{hcp.relationship_score}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Clinical Interest</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-teal-500" style={{ width: `${hcp.interest_score}%` }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{hcp.interest_score}</span>
                    </div>
                  </div>
                </div>

                <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
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
          ))
        ) : (
          <div className="col-span-full text-center py-20 bg-white dark:bg-slate-900 border border-slate-200/20 dark:border-slate-800/40 rounded-2xl text-slate-400 text-sm">
            No doctors found matching filters. Register a new physician using the button above!
          </div>
        )}
      </div>

      {/* Add HCP Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 overflow-hidden shadow-2xl animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/40 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Register Healthcare Professional</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit(onAddHCP)} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Doctor Name</label>
                  <input
                    type="text"
                    {...register('name', { required: 'Doctor name is required' })}
                    placeholder="Dr. John Harrison"
                    className="w-full glass-input text-xs"
                  />
                  {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message as string}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Specialty Focus</label>
                  <select
                    {...register('specialty', { required: true })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-healthcare-500 dark:text-slate-200"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Oncology">Oncology</option>
                    <option value="Endocrinology">Endocrinology</option>
                    <option value="General Medicine">General Medicine</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Hospital / Clinic Location</label>
                <input
                  type="text"
                  {...register('hospital', { required: 'Clinic hospital name is required' })}
                  placeholder="St. Jude Research Hospital"
                  className="w-full glass-input text-xs"
                />
                {errors.hospital && <p className="text-xs text-red-400 mt-1">{errors.hospital.message as string}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    {...register('email', { required: 'HCP email address is required' })}
                    placeholder="harrison@stjude.org"
                    className="w-full glass-input text-xs"
                  />
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message as string}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    {...register('phone')}
                    placeholder="555-0182"
                    className="w-full glass-input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800/40 pt-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Relationship Score</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    defaultValue="50"
                    {...register('relationship_score', { required: true, min: 0, max: 100 })}
                    className="w-full glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Interest Score</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    defaultValue="50"
                    {...register('interest_score', { required: true, min: 0, max: 100 })}
                    className="w-full glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Prescribe Rate</label>
                  <select
                    {...register('prescription_likelihood')}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-healthcare-500 dark:text-slate-200"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end border-t border-slate-100 dark:border-slate-800/40 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-healthcare-600 hover:bg-healthcare-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-healthcare-600/10"
                >
                  Confirm Profile
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default HCPList;
