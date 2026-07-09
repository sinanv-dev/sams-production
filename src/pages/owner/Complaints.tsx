import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getComplaints, updateComplaint, getApartments, subscribeToComplaints } from '../../firebase/db';
import { Complaint, Apartment } from '../../types';
import { CheckCircle, Clock, AlertCircle, Search, Trash2, Eye, ShieldAlert, Award } from 'lucide-react';

type StatusType = 'open' | 'in-progress' | 'resolved' | 'rejected';

export const OwnerComplaints: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubscribes: (() => void)[] = [];

    unsubscribes.push(subscribeToComplaints(setComplaints));
    
    getApartments().then(setApartments);

    setTimeout(() => setLoading(false), 700);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user]);

  // Determine owner's portfolio
  const getOwnerAptIds = () => {
    if (!user) return [];
    if (user.uid === 'owner-john-id') return ['apt-1', 'apt-2'];
    if (user.uid === 'owner-jane-id') return ['apt-3'];
    return apartments.map(a => a.id);
  };

  const ownerAptIds = getOwnerAptIds();
  const ownerComplaints = complaints.filter(c => ownerAptIds.includes(c.apartmentId));

  // Filter complaints based on Search term
  const filteredList = ownerComplaints.filter(c => {
    return c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.customerName && c.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.roomNumber && c.roomNumber.includes(searchTerm));
  });

  // Split into Kanban Columns
  const columns: { id: StatusType; label: string; color: string }[] = [
    { id: 'open', label: 'Open Issue', color: 'border-t-rose-500' },
    { id: 'in-progress', label: 'In Progress', color: 'border-t-amber-500' },
    { id: 'resolved', label: 'Resolved', color: 'border-t-emerald-500' },
    { id: 'rejected', label: 'Rejected', color: 'border-t-slate-400' }
  ];

  // Drag & Drop event handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = async (e: React.DragEvent, status: StatusType) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    
    try {
      await updateComplaint(id, {
        status,
        ...(status === 'resolved' ? { resolvedAt: Date.now() } : {})
      });
    } catch (err) {
      alert('Failed to update complaint status.');
    }
  };

  const handleMoveStatus = async (id: string, status: StatusType) => {
    try {
      await updateComplaint(id, {
        status,
        ...(status === 'resolved' ? { resolvedAt: Date.now() } : {})
      });
    } catch (err) {
      alert('Failed to move complaint.');
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 py-2">
      
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-[28px] font-black text-foreground tracking-tight leading-tight">
            Operations & Complaints Board
          </h1>
          <p className="text-[14px] text-muted-foreground font-medium mt-0.5">
            Trace maintenance requests, reassign repair ticket statuses, and log vendor progress.
          </p>
        </div>
        <div className="inline-flex items-center px-3 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl text-xs font-bold w-fit">
          <span>{ownerComplaints.filter(c => c.status !== 'resolved').length} Outstanding Issues</span>
        </div>
      </div>

      {/* ── SEARCH FILTERS ────────────────────────────────────────────────── */}
      <div className="bg-card border border-border p-4 rounded-3xl shadow-sm">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search tickets by title, customer, or room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* ── KANBAN BOARD GRID ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map(col => {
          const colComplaints = filteredList.filter(c => c.status === col.id);

          return (
            <div 
              key={col.id} 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, col.id)}
              className="bg-card/50 border border-border rounded-3xl p-4 flex flex-col gap-4 min-h-[500px]"
            >
              {/* Column Header */}
              <div className={`border-t-4 ${col.color} pt-2 flex justify-between items-center text-xs font-bold`}>
                <span className="text-foreground uppercase tracking-wider">{col.label}</span>
                <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground">{colComplaints.length}</span>
              </div>

              {/* Cards List */}
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                {colComplaints.map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onClick={() => navigate(`/owner/complaints/${item.id}`)}
                    className="bg-card border border-border p-4 rounded-2xl shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                        item.priority === 'high' ? 'bg-rose-500/10 text-rose-600' : 'bg-muted text-muted-foreground'
                      }`}>
                        {item.priority}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-semibold">{item.category}</span>
                    </div>

                    <h4 className="font-extrabold text-[15px] text-foreground leading-tight truncate">
                      {item.title}
                    </h4>

                    <p className="text-[12px] text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>

                    <div className="border-t border-border/60 pt-2 flex justify-between items-center text-[11px] text-muted-foreground font-semibold">
                      <span>Room {item.roomNumber} • {item.customerName}</span>
                      <span>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                    </div>

                    {/* Inline Status Mover actions (Fallback) */}
                    <div className="flex gap-1.5 pt-1.5 border-t border-border/40" onClick={e => e.stopPropagation()}>
                      <span className="text-[10px] text-muted-foreground font-bold mr-1">Move:</span>
                      {columns.filter(c => c.id !== col.id).map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleMoveStatus(item.id, c.id)}
                          className="text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/10 hover:text-emerald-500 px-1.5 py-0.5 rounded"
                        >
                          {c.id.split('-')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {colComplaints.length === 0 && (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded-2xl py-12 text-center text-muted-foreground text-xs font-semibold">
                    No tickets here.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
