import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, Plus, Trash2, Image, Upload, Check, Star } from 'lucide-react';
import { createRoom, getApartments, uploadFile } from '../../../firebase/db';
import { Apartment } from '../../../types';
import { isFirebaseConfigured } from '../../../firebase/config';

const AMENITY_OPTIONS = [
  'AC', 'Fan', 'WiFi', 'Attached Bathroom', 'Balcony', 'Wardrobe',
  'Bed', 'Mattress', 'Study Table', 'Chair', 'Geyser', 'Kitchen Access',
  'Washing Machine', 'Refrigerator', 'Lift', 'Parking', 'CCTV', 'Power Backup'
];

export const RoomCreate: React.FC = () => {
  const navigate = useNavigate();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<string>('');
  
  // Form states
  const [form, setForm] = useState({
    apartmentId: '',
    roomNumber: '',
    floor: '',
    roomType: 'Single',
    gender: 'unisex' as 'male' | 'female' | 'unisex' | 'any',
    sharingType: 'single' as 'single' | 'double' | 'triple' | 'quad' | 'other',
    rent: '',
    deposit: '',
    electricityRate: '13',
    maintenanceCharge: '',
    description: '',
    status: 'vacant' as 'vacant' | 'occupied' | 'reserved' | 'maintenance',
    availableFrom: '',
    maxOccupancy: '1',
    roomSize: '',
  });

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  
  // Gallery states
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ file?: File; previewUrl: string; storageUrl?: string }>>([]);
  const [coverPhotoIdx, setCoverPhotoIdx] = useState<number>(0);
  const [dragActive, setDragActive] = useState<boolean>(false);

  useEffect(() => {
    getApartments().then(setApartments);
  }, []);

  const handleAmenityToggle = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  // Image Upload Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFiles = (files: FileList) => {
    setError('');
    const newPhotos = [...uploadedPhotos];
    
    if (newPhotos.length + files.length > 15) {
      setError('You can upload a maximum of 15 photos per room.');
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate formats
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Only JPG, JPEG, PNG, and WEBP formats are supported.');
        continue;
      }

      // Validate size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Maximum file size is 10 MB per image.');
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      newPhotos.push({ file, previewUrl });
    }

    setUploadedPhotos(newPhotos);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  const removePhoto = (idx: number) => {
    const updated = uploadedPhotos.filter((_, i) => i !== idx);
    setUploadedPhotos(updated);
    if (coverPhotoIdx === idx) {
      setCoverPhotoIdx(0);
    } else if (coverPhotoIdx > idx) {
      setCoverPhotoIdx(coverPhotoIdx - 1);
    }
  };

  const movePhoto = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= uploadedPhotos.length) return;
    const updated = [...uploadedPhotos];
    const [target] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, target);
    setUploadedPhotos(updated);
    
    // Update cover index if affected
    if (coverPhotoIdx === fromIdx) {
      setCoverPhotoIdx(toIdx);
    } else if (coverPhotoIdx === toIdx) {
      setCoverPhotoIdx(fromIdx);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUploadProgress('');
    
    if (!form.apartmentId || !form.roomNumber || !form.rent) {
      setError('Apartment, Room Number, and Rent are required.');
      return;
    }

    if (uploadedPhotos.length === 0) {
      setError('Please upload at least one photo.');
      return;
    }

    setSaving(true);
    try {
      const finalPhotoUrls: string[] = [];

      // Upload files to Storage if Firebase is configured
      if (isFirebaseConfigured) {
        setUploadProgress('Compressing and uploading images to secure database...');
        for (let i = 0; i < uploadedPhotos.length; i++) {
          const item = uploadedPhotos[i];
          if (item.file) {
            const downloadUrl = await uploadFile(
              item.file,
              `rooms/${form.apartmentId}/${form.roomNumber}/${Date.now()}_${item.file.name}`
            );
            finalPhotoUrls.push(downloadUrl);
          }
        }
      } else {
        // Sandbox environment uses a selection of premium mock Unsplash room images to prevent local storage quota overload,
        // but keeps the order aligned to show premium photos!
        const sandboxMockUrls = [
          "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1560185127-6a2806647f81?w=800&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80"
        ];
        
        uploadedPhotos.forEach((_, idx) => {
          finalPhotoUrls.push(sandboxMockUrls[idx % sandboxMockUrls.length]);
        });
      }

      const coverPhoto = finalPhotoUrls[coverPhotoIdx] || finalPhotoUrls[0];
      const rentVal = parseFloat(form.rent);
      const depositVal = form.deposit ? parseFloat(form.deposit) : rentVal * 2;

      const apt = apartments.find(a => a.id === form.apartmentId);

      await createRoom({
        apartmentId: form.apartmentId,
        ownerId: apt?.ownerId || 'admin-id',
        roomNumber: form.roomNumber,
        floor: parseInt(form.floor) || 1,
        rent: rentVal,
        deposit: depositVal,
        electricityRate: parseFloat(form.electricityRate) || 13.0,
        maintenanceCharge: parseFloat(form.maintenanceCharge) || 0.0,
        status: form.status,
        gender: form.gender,
        sharingType: form.sharingType,
        description: form.description,
        amenities: selectedAmenities,
        coverPhoto,
        photos: finalPhotoUrls,
        availableFrom: form.availableFrom || undefined,
        currentCustomerId: null,
        // Compatibility properties
        rentAmount: rentVal,
        securityDeposit: depositVal
      });

      navigate('/admin/rooms');
    } catch (err: any) {
      setError(err.message || 'Failed to create room.');
    } finally {
      setSaving(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin/rooms" className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors border border-border">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Add New Room</h1>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">Define room specifications, utilities, features, and upload photos.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 text-red-800 dark:text-red-400 p-4 rounded-2xl text-xs font-semibold flex items-start gap-2 animate-shake">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {uploadProgress && (
          <div className="bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <span>{uploadProgress}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Form left inputs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Basic Info */}
            <div className="bg-white dark:bg-slate-800 border border-border rounded-3xl p-6 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-navy-450">Basic Information</h2>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Apartment Complex *</label>
                <select
                  value={form.apartmentId}
                  onChange={e => setForm(f => ({ ...f, apartmentId: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                >
                  <option value="">Select Apartment Complex</option>
                  {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Room Number *</label>
                  <input
                    value={form.roomNumber}
                    onChange={e => setForm(f => ({ ...f, roomNumber: e.target.value }))}
                    placeholder="e.g. 101"
                    className="w-full px-3 py-2.5 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Floor Number</label>
                  <input
                    type="number"
                    value={form.floor}
                    onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
                    placeholder="e.g. 1"
                    className="w-full px-3 py-2.5 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Available From</label>
                  <input
                    type="date"
                    value={form.availableFrom}
                    onChange={e => setForm(f => ({ ...f, availableFrom: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Room Type</label>
                  <select
                    value={form.roomType}
                    onChange={e => setForm(f => ({ ...f, roomType: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  >
                    <option value="Single">Single Room</option>
                    <option value="Double">Double Share</option>
                    <option value="Suite">Executive Suite</option>
                    <option value="Studio">Studio Apartment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Gender Allowed</label>
                  <select
                    value={form.gender}
                    onChange={e => setForm(f => ({ ...f, gender: e.target.value as any }))}
                    className="w-full px-3 py-2.5 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  >
                    <option value="any">Any / All</option>
                    <option value="unisex">Unisex / Co-living</option>
                    <option value="male">Male Only</option>
                    <option value="female">Female Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Sharing Type</label>
                  <select
                    value={form.sharingType}
                    onChange={e => setForm(f => ({ ...f, sharingType: e.target.value as any }))}
                    className="w-full px-3 py-2.5 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  >
                    <option value="single">Single (Private)</option>
                    <option value="double">Double Occupancy</option>
                    <option value="triple">Triple Occupancy</option>
                    <option value="quad">Quad Occupancy</option>
                    <option value="other">Other / Dorm</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Pricing specs */}
            <div className="bg-white dark:bg-slate-800 border border-border rounded-3xl p-6 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-navy-450">Pricing & Charges</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Monthly Rent (₹) *</label>
                  <input
                    type="number"
                    value={form.rent}
                    onChange={e => setForm(f => ({ ...f, rent: e.target.value }))}
                    placeholder="e.g. 12000"
                    className="w-full px-3 py-2.5 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Security Deposit (₹)</label>
                  <input
                    type="number"
                    value={form.deposit}
                    onChange={e => setForm(f => ({ ...f, deposit: e.target.value }))}
                    placeholder="Leave empty for 2x rent"
                    className="w-full px-3 py-2.5 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Electricity Rate (₹ / Unit)</label>
                  <input
                    type="number"
                    value={form.electricityRate}
                    onChange={e => setForm(f => ({ ...f, electricityRate: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Maintenance Charge (₹ / Month)</label>
                  <input
                    type="number"
                    value={form.maintenanceCharge}
                    onChange={e => setForm(f => ({ ...f, maintenanceCharge: e.target.value }))}
                    placeholder="e.g. 1000"
                    className="w-full px-3 py-2.5 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Amenities Grid */}
            <div className="bg-white dark:bg-slate-800 border border-border rounded-3xl p-6 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-navy-450">Amenities & Features</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AMENITY_OPTIONS.map(opt => {
                  const active = selectedAmenities.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleAmenityToggle(opt)}
                      className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                        active 
                          ? 'border-brand-500 bg-brand-500/[0.04] text-brand-600 dark:text-brand-400' 
                          : 'border-border bg-transparent text-navy-500 dark:text-slate-400 hover:bg-navy-50/30'
                      }`}
                    >
                      <div className={`w-4 h-4 border rounded flex items-center justify-center transition-all ${
                        active ? 'border-brand-500 bg-brand-500 text-white' : 'border-navy-200'
                      }`}>
                        {active && <Check size={10} className="stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Inputs Panel */}
          <div className="space-y-6">
            
            {/* Status & Details */}
            <div className="bg-white dark:bg-slate-800 border border-border rounded-3xl p-5 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-navy-450">Room Status & Spec</h2>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Availability Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                >
                  <option value="vacant">Available (Vacant)</option>
                  <option value="reserved">Reserved</option>
                  <option value="maintenance">Under Maintenance</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Max Occupants</label>
                  <input
                    type="number"
                    value={form.maxOccupancy}
                    onChange={e => setForm(f => ({ ...f, maxOccupancy: e.target.value }))}
                    className="w-full px-3 py-2 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Room Size (sq.ft)</label>
                  <input
                    value={form.roomSize}
                    onChange={e => setForm(f => ({ ...f, roomSize: e.target.value }))}
                    placeholder="e.g. 240"
                    className="w-full px-3 py-2 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Public Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  placeholder="Spacious and bright corner room with personal wardrobe..."
                  className="w-full px-3 py-2 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Drag & Drop Photo Uploader */}
            <div className="bg-white dark:bg-slate-800 border border-border rounded-3xl p-5 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-navy-450">Room Photos (Up to 15)</h2>
              
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all relative ${
                  dragActive ? 'border-brand-500 bg-brand-500/[0.04]' : 'border-navy-150 dark:border-slate-700 bg-navy-50/[0.1] hover:bg-navy-50/[0.2]'
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                
                <div className="space-y-2 pointer-events-none">
                  <Upload className="mx-auto text-navy-400" size={28} />
                  <p className="text-xs font-bold text-navy-850 dark:text-slate-200">Drag & drop photos here or click to browse</p>
                  <p className="text-[9px] text-navy-400 leading-normal">Supports JPG, JPEG, PNG, WEBP. Max 10MB per file.</p>
                </div>
              </div>

              {/* Photo Previews */}
              {uploadedPhotos.length > 0 && (
                <div className="space-y-3">
                  <span className="block text-[9px] font-bold uppercase text-navy-450">Uploaded Photos ({uploadedPhotos.length}/15)</span>
                  <div className="grid grid-cols-3 gap-2">
                    {uploadedPhotos.map((photo, idx) => {
                      const isCover = coverPhotoIdx === idx;
                      return (
                        <div key={idx} className={`group relative h-20 rounded-xl overflow-hidden border bg-navy-50 dark:bg-slate-900 transition-all ${
                          isCover ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-border'
                        }`}>
                          <img src={photo.previewUrl} alt="" className="w-full h-full object-cover" />
                          
                          {/* Hover Overlay Controls */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 z-20">
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => setCoverPhotoIdx(idx)}
                                className={`p-1 rounded-lg ${
                                  isCover ? 'text-brand-400 bg-brand-500/10' : 'text-slate-350 hover:text-white'
                                }`}
                                title="Set as Cover Photo"
                              >
                                <Star size={12} className={isCover ? 'fill-brand-400' : ''} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removePhoto(idx)}
                                className="p-1 text-red-400 hover:text-red-300 rounded-lg"
                                title="Remove Image"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-between text-[8px] font-bold text-white">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => movePhoto(idx, idx - 1)}
                                className="hover:underline disabled:opacity-50"
                              >
                                Left
                              </button>
                              <span className="opacity-70">{idx + 1}</span>
                              <button
                                type="button"
                                disabled={idx === uploadedPhotos.length - 1}
                                onClick={() => movePhoto(idx, idx + 1)}
                                className="hover:underline disabled:opacity-50"
                              >
                                Right
                              </button>
                            </div>
                          </div>

                          {isCover && (
                            <div className="absolute top-1 right-1 bg-brand-500 text-white rounded-full p-0.5">
                              <Star size={8} className="fill-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Save Buttons */}
            <div className="flex gap-3 pt-2">
              <Link to="/admin/rooms" className="flex-1 py-2.5 border border-navy-150 dark:border-slate-700 rounded-xl text-center text-foreground hover:bg-navy-50/50 text-xs font-bold transition-colors">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black shadow-lg shadow-brand-500/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={14} />
                <span>{saving ? 'Creating Room...' : 'Create Room'}</span>
              </button>
            </div>

          </div>

        </div>

      </form>

    </div>
  );
};
