import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  History,
  Download,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { RootState, AppDispatch } from "../store";
import {
  fetchInteractions,
  deleteInteraction,
} from "../store/interactionSlice";
import { fetchHCPs } from "../store/hcpSlice";
import axios from "axios";

const InteractionHistory = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { interactions, loading } = useSelector(
    (state: RootState) => state.interaction,
  );
  const { hcps } = useSelector((state: RootState) => state.hcp);

  const [filterHcp, setFilterHcp] = useState("");
  const [filterSentiment, setFilterSentiment] = useState("");

  useEffect(() => {
    dispatch(fetchHCPs());
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      fetchInteractions({
        hcp_id: filterHcp || undefined,
        sentiment: filterSentiment || undefined,
      }),
    );
  }, [dispatch, filterHcp, filterSentiment]);

  const handleExportCSV = async () => {
    try {
      const API_URL =
        import.meta.env.VITE_API_URL || "https://aivoa-an49.onrender.com/api";
      const token = localStorage.getItem("aivoa_token");

      const response = await axios.get(`${API_URL}/interactions/export`, {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "aivoa_interactions_export.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert(
        "Failed to download CSV export. Please make sure the backend is active.",
      );
    }
  };

  const handleDelete = (id: string) => {
    if (
      window.confirm(
        "Delete this interaction record? This will also remove any linked follow-ups.",
      )
    ) {
      dispatch(deleteInteraction(id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters & Export header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Dropdowns */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
            <Filter className="w-4 h-4" />
            <span>Filter:</span>
          </div>

          <select
            value={filterHcp}
            onChange={(e) => setFilterHcp(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-healthcare-500 dark:text-slate-200"
          >
            <option value="">All HCPs</option>
            {hcps.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>

          <select
            value={filterSentiment}
            onChange={(e) => setFilterSentiment(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-healthcare-500 dark:text-slate-200"
          >
            <option value="">All Sentiments</option>
            <option value="Positive">Positive</option>
            <option value="Neutral">Neutral</option>
            <option value="Negative">Negative</option>
          </select>
        </div>

        {/* CSV export action */}
        <button
          onClick={handleExportCSV}
          className="w-full sm:w-auto bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Download className="w-4.5 h-4.5 text-healthcare-500" />
          <span>Export CSV Excel</span>
        </button>
      </div>

      {/* Main Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Headers */}
            <thead className="bg-slate-100/50 dark:bg-slate-950/50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200/50 dark:border-slate-800/40">
              <tr>
                <th className="px-6 py-4">Physician (HCP)</th>
                <th className="px-6 py-4">Meeting Info</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Topics Discussed</th>
                <th className="px-6 py-4">Sentiment</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-600 dark:text-slate-300">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse h-16 bg-slate-50/20">
                    <td colSpan={6} className="px-6 py-4 text-center">
                      Loading archives...
                    </td>
                  </tr>
                ))
              ) : interactions.length > 0 ? (
                interactions.map((intr) => (
                  <tr
                    key={intr.id}
                    className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    {/* Doctor Info */}
                    <td className="px-6 py-4">
                      {intr.hcp ? (
                        <div
                          onClick={() => navigate(`/hcps/${intr.hcp?.id}`)}
                          className="cursor-pointer hover:underline"
                        >
                          <p className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                            {intr.hcp.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {intr.hcp.specialty} • {intr.hcp.hospital}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">Unknown HCP</span>
                      )}
                    </td>

                    {/* Date/Time */}
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {intr.meeting_date}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        @ {intr.meeting_time.substring(0, 5)}
                      </p>
                    </td>

                    {/* Type badge */}
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-500 border border-slate-200/20 dark:border-slate-800/20 text-[10px] font-bold">
                        {intr.interaction_type}
                      </span>
                    </td>

                    {/* Summary topics */}
                    <td className="px-6 py-4 max-w-xs">
                      <p
                        className="font-semibold truncate dark:text-slate-200"
                        title={intr.summary}
                      >
                        {intr.summary}
                      </p>
                      <p
                        className="text-[10px] text-slate-400 truncate mt-0.5"
                        title={intr.notes}
                      >
                        {intr.notes}
                      </p>
                    </td>

                    {/* Sentiment tag */}
                    <td className="px-6 py-4">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          intr.sentiment === "Positive"
                            ? "bg-emerald-500/15 text-emerald-600"
                            : intr.sentiment === "Negative"
                              ? "bg-red-500/15 text-red-600"
                              : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {intr.sentiment}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        {intr.hcp && (
                          <button
                            onClick={() => navigate(`/hcps/${intr.hcp?.id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-healthcare-500 transition-colors"
                            title="Open HCP Profile"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(intr.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                          title="Remove Log"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No visit logs match selected filters. Log a new interaction
                    to seed!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InteractionHistory;
