import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRooms, getApartments, createRequest, createNotification } from '../../firebase/db';
import { Room, Apartment } from '../../types';
import { 
  MapPin, Calendar, CheckSquare, Building, Heart, MessageSquare, AlertCircle, 
  Wind, Wifi, Eye, User, Sparkles, Filter, ChevronLeft, ChevronRight, X, ZoomIn, 
  Tag, Info, HelpCircle, ArrowLeft, Check, Compass, Shield
} from 'lucide-react';

export const CustomerBrowse: React.FC = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAptId, setSelectedAptId] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [sharingFilter, setSharingFilter] = useState('all');
  const [acFilter, setAcFilter] = useState(false);
  const [wifiFilter, setWifiFilter] = useState(false);
  const [maxRent, setMaxRent] = useState('');

  // Selected Room Details View State
  const [viewingRoom, setViewingRoom] = useState<Room | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isFullScreenGallery, setIsFullScreenGallery] = useState(false);

  // Visit Request Modal State
  const [requestingRoom, setRequestingRoom] = useState<Room | null>(null);
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('10:00 AM - 12:00 PM');
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allRooms, allApts] = await Promise.all([getRooms(), getApartments()]);
      setRooms(allRooms);
      setApartments(allApts);
    } catch (err) {
      console.error("Failed to load browse rooms: ", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = (room: Room) => {
    setViewingRoom(room);
    setActivePhotoIdx(0);
  };

  const handleOpenRequest = (room: Room, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop opening details drawer
    setRequestingRoom(room);
    setVisitDate('');
    setVisitTime('10:00 AM - 12:00 PM');
    setNotes('');
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!user || !requestingRoom) return;
    if (!visitDate) {
      setErrorMsg('Please select a visit date.');
      return;
    }

    setSubmitting(true);
    try {
      const apt = apartments.find(a => a.id === requestingRoom.apartmentId);
      
      // 1. Create Visit Request
      await createRequest({
        customerId: user.uid,
        customerName: user.displayName,
        customerEmail: user.email,
        customerPhone: user.phoneNumber,
        apartmentId: requestingRoom.apartmentId,
        apartmentName: apt?.name || 'SAMS Apartment',
        preferredVisitDate: visitDate,
        preferredVisitTime: visitTime,
        status: 'pending',
        notes: notes,
        assignedRoomId: requestingRoom.id,
        assignedOwnerId: requestingRoom.ownerId || apt?.ownerId
      });

      // 2. Alert Owner & Admin
      const ownerId = requestingRoom.ownerId || apt?.ownerId || 'admin-id';
      await createNotification({
        recipientId: ownerId,
        title: 'New Visit Request',
        message: `${user.displayName} requested to tour Room ${requestingRoom.roomNumber} at ${apt?.name || 'SAMS'}.`,
        type: 'request'
      });

      setSuccessMsg('Your visit request has been successfully filed! The property manager will review and confirm your slot.');
      setTimeout(() => {
        setRequestingRoom(null);
        setSuccessMsg('');
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit visit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getApartmentName = (aptId: string) => {
    return apartments.find(a => a.id === aptId)?.name || 'SAMS Building';
  };

  const getApartmentObj = (aptId: string) => {
    return apartments.find(a => a.id === aptId);
  };

  // Filtered Rooms
  const filteredRooms = rooms.filter(r => {
    // Only show vacant/available rooms
    if (r.status !== 'vacant') return false;

    const apt = getApartmentObj(r.apartmentId);
    const aptName = apt?.name || '';
    const matchesSearch = r.roomNumber.includes(searchQuery) || aptName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesApt = selectedAptId === 'all' || r.apartmentId === selectedAptId;
    const matchesGender = genderFilter === 'all' || r.gender === genderFilter;
    const matchesSharing = sharingFilter === 'all' || r.sharingType === sharingFilter;
    const matchesMaxRent = !maxRent || r.rent <= parseFloat(maxRent);

    const hasAC = r.amenities.some(a => a.toLowerCase() === 'ac');
    const hasWiFi = r.amenities.some(a => a.toLowerCase() === 'wifi');
    const matchesAC = !acFilter || hasAC;
    const matchesWiFi = !wifiFilter || hasWiFi;

    return matchesSearch && matchesApt && matchesGender && matchesSharing && matchesMaxRent && matchesAC && matchesWiFi;
  });

  // Photo Gallery Helpers
  const getRoomPhotos = (room: Room) => {
    const photos = room.photos && room.photos.length > 0 ? room.photos : [room.coverPhoto || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=80"];
    return photos;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 transition-colors duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-100/10 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-navy-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
            <Compass size={26} className="text-brand-600 dark:text-brand-400" />
            Discover Rooms
          </h1>
          <p className="text-navy-450 dark:text-slate-400 text-xs font-semibold mt-1">Explore individual room assets, verify details, and schedule a physical visit request.</p>
        </div>
      </div>

      {/* Premium Filter Toolbar */}
      <div className="bg-white dark:bg-slate-800 border border-navy-100/10 dark:border-slate-700 shadow-xl rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-navy-450 dark:text-slate-400">
          <Filter size={14} className="text-brand-500" />
          <span>Refine Room Search</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          
          {/* Search bar */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400">Room or Complex</label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="e.g. 101, Skyline..."
              className="w-full bg-navy-50/50 dark:bg-slate-900 border border-navy-100 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-850"
            />
          </div>

          {/* Apartment Select */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400">Apartment Complex</label>
            <select
              value={selectedAptId}
              onChange={e => setSelectedAptId(e.target.value)}
              className="w-full bg-navy-50/50 dark:bg-slate-900 border border-navy-100 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
            >
              <option value="all">All Apartments</option>
              {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Gender Select */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400">Gender Rules</label>
            <select
              value={genderFilter}
              onChange={e => setGenderFilter(e.target.value)}
              className="w-full bg-navy-50/50 dark:bg-slate-900 border border-navy-100 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
            >
              <option value="all">Any Gender</option>
              <option value="male">Male Only</option>
              <option value="female">Female Only</option>
              <option value="unisex">Co-Living / Unisex</option>
            </select>
          </div>

          {/* Sharing type */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400">Sharing Mode</label>
            <select
              value={sharingFilter}
              onChange={e => setSharingFilter(e.target.value)}
              className="w-full bg-navy-50/50 dark:bg-slate-900 border border-navy-100 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
            >
              <option value="all">Any Sharing</option>
              <option value="single">Single (Private)</option>
              <option value="double">Double Occupancy</option>
              <option value="triple">Triple Occupancy</option>
            </select>
          </div>

          {/* Maximum rent */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400">Max Rent (Monthly)</label>
            <input
              type="number"
              value={maxRent}
              onChange={e => setMaxRent(e.target.value)}
              placeholder="e.g. 12000"
              className="w-full bg-navy-50/50 dark:bg-slate-900 border border-navy-100 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
            />
          </div>

        </div>

        {/* Checkbox tags */}
        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
          <label className="flex items-center space-x-2 cursor-pointer font-bold text-navy-850 dark:text-slate-350">
            <input
              type="checkbox"
              checked={acFilter}
              onChange={e => setAcFilter(e.target.checked)}
              className="rounded text-brand-600 border-navy-200 dark:border-slate-700 focus:ring-0"
            />
            <span>Must have AC</span>
          </label>
          
          <label className="flex items-center space-x-2 cursor-pointer font-bold text-navy-850 dark:text-slate-350">
            <input
              type="checkbox"
              checked={wifiFilter}
              onChange={e => setWifiFilter(e.target.checked)}
              className="rounded text-brand-600 border-navy-200 dark:border-slate-700 focus:ring-0"
            />
            <span>Must have High-Speed WiFi</span>
          </label>
        </div>

      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-navy-100/10 dark:border-slate-700 rounded-3xl p-16 text-center shadow-lg animate-in fade-in duration-300">
          <Building className="mx-auto text-navy-300 dark:text-slate-600 w-16 h-16 mb-4 stroke-[1.5]" />
          <h3 className="font-extrabold text-navy-900 dark:text-white text-base">No Matching Rooms Found</h3>
          <p className="text-navy-450 dark:text-slate-455 text-xs mt-1">Try expanding your search query or loosening your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {filteredRooms.map((room) => {
            const apt = getApartmentObj(room.apartmentId);
            const addressWord = apt?.address ? apt.address.split(',')[0] : 'Noida';
            const dist = 1.5 + (parseInt(room.roomNumber) % 5) * 0.4; // Mock distance
            const hasAC = room.amenities.some(a => a.toLowerCase() === 'ac');
            const hasWiFi = room.amenities.some(a => a.toLowerCase() === 'wifi');

            return (
              <div 
                key={room.id} 
                onClick={() => handleOpenDetails(room)}
                className="group bg-white dark:bg-slate-800 border border-navy-100/10 dark:border-slate-700 rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Photo area */}
                  <div className="relative h-52 bg-slate-100 overflow-hidden">
                    <img 
                      src={room.coverPhoto || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=80"} 
                      alt={`Room ${room.roomNumber}`} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    
                    {/* Floating badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md text-white ${
                        room.gender === 'male' ? 'bg-blue-600' :
                        room.gender === 'female' ? 'bg-pink-600' :
                        'bg-purple-600'
                      }`}>
                        {room.gender} only
                      </span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-navy-900/75 text-white backdrop-blur-sm">
                        {room.sharingType} sharing
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 z-10">
                      <span className="text-[9px] font-bold uppercase bg-emerald-500 text-white px-2 py-0.5 rounded-md shadow-sm">
                        Available
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3.5">
                    <div>
                      <h3 className="font-extrabold text-sm text-navy-900 dark:text-slate-100 line-clamp-1">{apt?.name || 'SAMS Building'}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-black text-brand-600 dark:text-brand-400">Room {room.roomNumber} (Floor {room.floor})</span>
                        <span className="text-[10px] text-navy-450 dark:text-slate-455 font-bold flex items-center">
                          <MapPin size={11} className="mr-0.5" /> {addressWord}
                        </span>
                      </div>
                    </div>

                    {/* Rent Metrics */}
                    <div className="grid grid-cols-3 gap-2 bg-navy-50/50 dark:bg-slate-900/40 p-3 rounded-2xl border border-navy-100/50 dark:border-slate-700/50">
                      <div>
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-navy-400">Monthly Rent</span>
                        <span className="text-xs font-black text-navy-900 dark:text-slate-200">₹{room.rent.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-navy-400">Deposit</span>
                        <span className="text-xs font-black text-navy-900 dark:text-slate-200">₹{room.deposit.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-navy-400">Owner</span>
                        <span className="text-xs font-black text-navy-900 dark:text-slate-200 line-clamp-1">{apt?.ownerName || 'Landlord'}</span>
                      </div>
                    </div>

                    {/* Features Strip */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-navy-50 dark:border-slate-750">
                      <div className="flex items-center space-x-3 text-navy-450 dark:text-slate-400">
                        {hasAC && (
                          <span className="flex items-center gap-1 font-semibold" title="Air Conditioner">
                            <Wind size={13} className="text-blue-500" />
                            <span>AC</span>
                          </span>
                        )}
                        {hasWiFi && (
                          <span className="flex items-center gap-1 font-semibold" title="WiFi">
                            <Wifi size={13} className="text-emerald-500" />
                            <span>WiFi</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-navy-400 font-extrabold italic">
                        {dist.toFixed(1)} km from LPU Campus
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-5 pt-0 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDetails(room);
                    }}
                    type="button"
                    className="flex-1 py-2 text-[11px] font-extrabold text-navy-700 dark:text-slate-300 bg-navy-50 dark:bg-slate-900 hover:bg-navy-100 dark:hover:bg-slate-750 rounded-xl transition-colors text-center border border-navy-100/50 dark:border-slate-700"
                  >
                    View Details
                  </button>
                  <button
                    onClick={(e) => handleOpenRequest(room, e)}
                    type="button"
                    className="flex-1 py-2 text-[11px] font-extrabold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors shadow-md shadow-brand-500/10 flex items-center justify-center space-x-1"
                  >
                    <Calendar size={13} />
                    <span>Request Visit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ROOM DETAILS FULL PAGE SHEET / MODAL ───────────────────────── */}
      {viewingRoom && (
        <div className="fixed inset-0 z-40 flex items-stretch justify-end animate-in fade-in duration-300">
          <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm" onClick={() => setViewingRoom(null)}></div>
          
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 border-l border-navy-100/10 dark:border-slate-700 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
            
            {/* Header control */}
            <div className="h-14 border-b border-navy-50 dark:border-slate-700/50 px-6 flex items-center justify-between flex-shrink-0 bg-navy-50/50 dark:bg-slate-900/20">
              <button 
                onClick={() => setViewingRoom(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-navy-550 dark:text-slate-350 hover:text-navy-900 dark:hover:text-white"
              >
                <ArrowLeft size={16} /> Close Specifications
              </button>
              
              <span className="text-xs font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest">Room Specifications</span>
            </div>

            {/* Scrollable details panel */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Dynamic Image Gallery with Slide controls */}
              <div className="space-y-3">
                <div className="relative h-64 bg-slate-100 rounded-3xl overflow-hidden border border-navy-100/10 dark:border-slate-750 group">
                  <img 
                    src={getRoomPhotos(viewingRoom)[activePhotoIdx]} 
                    alt={`Room Spec Photo ${activePhotoIdx + 1}`} 
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Prev/Next arrows */}
                  {getRoomPhotos(viewingRoom).length > 1 && (
                    <>
                      <button 
                        onClick={() => setActivePhotoIdx(p => p === 0 ? getRoomPhotos(viewingRoom).length - 1 : p - 1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-slate-900/80 hover:bg-white text-navy-900 dark:text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button 
                        onClick={() => setActivePhotoIdx(p => p === getRoomPhotos(viewingRoom).length - 1 ? 0 : p + 1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-slate-900/80 hover:bg-white text-navy-900 dark:text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}

                  {/* Zoom Overlay button */}
                  <button 
                    onClick={() => setIsFullScreenGallery(true)}
                    className="absolute bottom-3 right-3 p-2 rounded-xl bg-navy-900/60 text-white backdrop-blur-sm hover:bg-navy-900/80 transition-colors"
                    title="Fullscreen View"
                  >
                    <ZoomIn size={16} />
                  </button>

                  <div className="absolute bottom-3 left-3 bg-navy-900/60 text-white px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-sm">
                    {activePhotoIdx + 1} / {getRoomPhotos(viewingRoom).length}
                  </div>
                </div>

                {/* Thumbnails strip */}
                {getRoomPhotos(viewingRoom).length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {getRoomPhotos(viewingRoom).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActivePhotoIdx(idx)}
                        className={`w-16 h-12 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                          activePhotoIdx === idx ? 'border-brand-500 scale-95 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Basic spec headers */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-navy-50 dark:border-slate-750 pb-4">
                <div>
                  <h3 className="text-lg font-black text-navy-900 dark:text-white">Room {viewingRoom.roomNumber}</h3>
                  <p className="text-xs font-semibold text-muted-foreground">{getApartmentName(viewingRoom.apartmentId)}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-brand-500/10 text-brand-500 font-black px-3 py-1 rounded-xl">
                    Floor {viewingRoom.floor}
                  </span>
                  <span className="text-xs bg-emerald-500/10 text-emerald-500 font-black px-3 py-1 rounded-xl">
                    Available From: {viewingRoom.availableFrom || 'Immediate'}
                  </span>
                </div>
              </div>

              {/* Pricing Cards */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-navy-450 dark:text-slate-400">Pricing & Utility Breakdown</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-navy-50/50 dark:bg-slate-900/35 border border-navy-100/50 dark:border-slate-750/70 p-3 rounded-2xl text-center">
                    <span className="block text-[8px] font-bold uppercase text-navy-400 mb-1">Monthly Rent</span>
                    <span className="text-sm font-black text-navy-900 dark:text-white">₹{viewingRoom.rent.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="bg-navy-50/50 dark:bg-slate-900/35 border border-navy-100/50 dark:border-slate-750/70 p-3 rounded-2xl text-center">
                    <span className="block text-[8px] font-bold uppercase text-navy-400 mb-1">Security Deposit</span>
                    <span className="text-sm font-black text-navy-900 dark:text-white">₹{viewingRoom.deposit.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="bg-navy-50/50 dark:bg-slate-900/35 border border-navy-100/50 dark:border-slate-750/70 p-3 rounded-2xl text-center">
                    <span className="block text-[8px] font-bold uppercase text-navy-400 mb-1">Electricity Unit</span>
                    <span className="text-sm font-black text-navy-900 dark:text-white">₹{viewingRoom.electricityRate}/Unit</span>
                  </div>
                  <div className="bg-navy-50/50 dark:bg-slate-900/35 border border-navy-100/50 dark:border-slate-750/70 p-3 rounded-2xl text-center">
                    <span className="block text-[8px] font-bold uppercase text-navy-400 mb-1">Maintenance Fee</span>
                    <span className="text-sm font-black text-navy-900 dark:text-white">₹{viewingRoom.maintenanceCharge}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-navy-450 dark:text-slate-400">Description</h4>
                <p className="text-xs text-navy-600 dark:text-slate-300 font-semibold leading-relaxed">
                  {viewingRoom.description}
                </p>
              </div>

              {/* Specifications checklist */}
              <div className="grid grid-cols-2 gap-4 border-t border-b border-navy-50 dark:border-slate-750 py-4">
                <div>
                  <span className="block text-[9px] font-bold uppercase text-navy-450">Gender Preference Allowed</span>
                  <span className="text-xs font-extrabold text-navy-900 dark:text-white uppercase">{viewingRoom.gender} Only</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold uppercase text-navy-450">Sharing Arrangement</span>
                  <span className="text-xs font-extrabold text-navy-900 dark:text-white uppercase">{viewingRoom.sharingType} sharing</span>
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-navy-450 dark:text-slate-400">Included Amenities</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {viewingRoom.amenities.map(a => (
                    <div key={a} className="flex items-center space-x-2 bg-navy-50/30 dark:bg-slate-900/20 px-3 py-2 rounded-xl border border-navy-50 dark:border-slate-750/50 text-xs font-bold text-navy-750 dark:text-slate-350">
                      <Check size={14} className="text-brand-500 stroke-[3]" />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Owner Information */}
              <div className="bg-navy-500/[0.03] dark:bg-slate-900/30 border border-navy-100/50 dark:border-slate-750 rounded-2xl p-4 space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-navy-400">Property Owner & Rules</h4>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm">
                    {getApartmentObj(viewingRoom.apartmentId)?.ownerName?.charAt(0) || 'O'}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-navy-900 dark:text-slate-100">
                      {getApartmentObj(viewingRoom.apartmentId)?.ownerName || 'Property Landlord'}
                    </h5>
                    <p className="text-[10px] text-navy-400">Contact options available after scheduling visit clearance.</p>
                  </div>
                </div>
              </div>

              {/* Maps placeholder */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-navy-450 dark:text-slate-400">Location Map</h4>
                <div className="h-44 bg-navy-50 dark:bg-slate-900 rounded-2xl overflow-hidden border border-navy-100/50 dark:border-slate-750/80 flex items-center justify-center text-center p-6">
                  <div className="space-y-1.5 text-navy-450">
                    <MapPin className="mx-auto text-brand-500" size={24} />
                    <span className="block text-xs font-bold">{getApartmentObj(viewingRoom.apartmentId)?.address || 'Address location'}</span>
                    <span className="block text-[9px]">Google Maps integration available on visit schedule confirmation.</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom floating button bar */}
            <div className="p-4 border-t border-navy-50 dark:border-slate-700/50 flex-shrink-0 bg-navy-50/50 dark:bg-slate-900/20 flex items-center justify-between">
              <div>
                <span className="block text-[9px] text-navy-400 font-bold uppercase">Monthly Rent</span>
                <span className="text-base font-black text-navy-900 dark:text-white">₹{viewingRoom.rent.toLocaleString('en-IN')}</span>
              </div>
              
              <button
                onClick={(e) => handleOpenRequest(viewingRoom, e)}
                type="button"
                className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-brand-500/10 flex items-center space-x-1.5"
              >
                <Calendar size={14} />
                <span>Schedule Visit Tour</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── FULL SCREEN IMAGE VIEWER OVERLAY ─────────────────────────────── */}
      {isFullScreenGallery && viewingRoom && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4">
          <div className="flex items-center justify-between text-white text-xs font-black">
            <span>Room {viewingRoom.roomNumber} Photo Gallery</span>
            <button 
              onClick={() => setIsFullScreenGallery(false)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 flex items-center justify-center relative">
            <img 
              src={getRoomPhotos(viewingRoom)[activePhotoIdx]} 
              alt="" 
              className="max-h-[75vh] max-w-full object-contain rounded-xl"
            />

            {getRoomPhotos(viewingRoom).length > 1 && (
              <>
                <button 
                  onClick={() => setActivePhotoIdx(p => p === 0 ? getRoomPhotos(viewingRoom).length - 1 : p - 1)}
                  className="absolute left-4 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={() => setActivePhotoIdx(p => p === getRoomPhotos(viewingRoom).length - 1 ? 0 : p + 1)}
                  className="absolute right-4 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          <div className="flex justify-center gap-1.5 overflow-x-auto py-2">
            {getRoomPhotos(viewingRoom).map((img, idx) => (
              <button 
                key={idx}
                onClick={() => setActivePhotoIdx(idx)}
                className={`w-14 h-10 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                  activePhotoIdx === idx ? 'border-brand-500 scale-95' : 'border-transparent opacity-50'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── VISIT REQUEST SLOT MODAL ─────────────────────────────────────── */}
      {requestingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setRequestingRoom(null)}></div>
          
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md border border-navy-150 dark:border-slate-700 shadow-2xl p-6 relative z-10 animate-in zoom-in-95 duration-150">
            <h2 className="text-lg font-black text-navy-900 dark:text-white mb-1">Schedule Visit Tour</h2>
            <p className="text-xs text-navy-450 dark:text-slate-400 mb-4">
              Select date, time slot, and specify move-in questions for Room {requestingRoom.roomNumber}.
            </p>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Tour Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full bg-navy-50/50 dark:bg-slate-900 border border-navy-100 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-navy-850 dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-850"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Tour Time Slot</label>
                <select
                  value={visitTime}
                  onChange={(e) => setVisitTime(e.target.value)}
                  className="w-full bg-navy-50/50 dark:bg-slate-900 border border-navy-100 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-navy-850 dark:text-slate-100 focus:outline-none focus:border-brand-500"
                >
                  <option value="09:00 AM - 12:00 PM">Morning (09:00 AM - 12:00 PM)</option>
                  <option value="12:00 PM - 04:00 PM">Afternoon (12:00 PM - 04:00 PM)</option>
                  <option value="04:00 PM - 08:00 PM">Evening (04:00 PM - 08:00 PM)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Move-in Plans or Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Awaiting relocation clearance, visiting with family, etc."
                  className="w-full bg-navy-50/50 dark:bg-slate-900 border border-navy-100 dark:border-slate-700 rounded-xl py-2 px-3.5 text-xs font-semibold text-navy-850 dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-850 resize-none"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl text-xs font-semibold text-red-800 dark:text-red-400 flex items-start space-x-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-800/30 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-400 flex items-start space-x-2">
                  <CheckSquare size={16} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestingRoom(null)}
                  className="px-4 py-2.5 border border-navy-150 dark:border-slate-700 text-navy-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-navy-50/50 dark:hover:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !visitDate}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Filing...</span>
                    </>
                  ) : (
                    <>
                      <Calendar size={14} />
                      <span>File Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
