import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, Plus, Trash2, Upload, Check, Star } from 'lucide-react';
import { getRooms, updateRoom, getApartments } from '../../../firebase/db';
import { Room, Apartment } from '../../../types';
import { storage, isFirebaseConfigured } from '../../../firebase/config';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const AMENITY_OPTIONS = [
  'AC', 'Fan', 'WiFi', 'Attached Bathroom', 'Balcony', 'Wardrobe',
  'Bed', 'Mattress', 'Study Table', 'Chair', 'Geyser', 'Kitchen Access',
  'Washing Machine', 'Refrigerator', 'Lift', 'Parking', 'CCTV', 'Power Backup'
];

export const RoomEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    status: 'vacant' as Room['status'],
    availableFrom: '',
    maxOccupancy: '1',
    roomSize: '',
  });

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ file?: File; previewUrl: string; storageUrl?: string }>>([]);
  const [coverPhotoIdx, setCoverPhotoIdx] = useState<number>(0);
  const [dragActive, setDragActive] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [allRooms, allApts] = await Promise.all([getRooms(), getApartments()]);
      const room = allRooms.find(r => r.id === id);
      if (!room) {
        navigate('/admin/rooms');
        return;
      }

      setApartments(allApts);
      setForm({
        apartmentId: room.apartmentId,
        roomNumber: room.roomNumber,
        floor: room.floor?.toString() || '1',
        roomType: room.sharingType === 'single' ? 'Single' : 'Double',
        gender: room.gender || 'unisex',
        sharingType: room.sharingType || 'single',
        rent: room.rent.toString(),
        deposit: room.deposit.toString(),
        electricityRate: room.electricityRate.toString(),
        maintenanceCharge: room.maintenanceCharge?.toString() || '',
        description: room.description || '',
        status: room.status === 'occupied' ? 'vacant' : room.status, // Prevent locking occupied states directly
        availableFrom: room.availableFrom || '',
        maxOccupancy: '1',
        roomSize: '',
      });

      setSelectedAmenities(room.amenities || []);
      
      // Load current photos
      const initialPhotos = (room.photos || []).map(url => ({
        previewUrl: url,
        storageUrl: url
      }));
      setUploadedPhotos(initialPhotos);

      // Match cover index
      const coverIdx = (room.photos || []).indexOf(room.coverPhoto || '');
      setCoverPhotoIdx(coverIdx >= 0 ? coverIdx : 0);

    } catch (e) {
      console.error("Failed to load room details: ", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  // Drag & Drop
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
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Only JPG, JPEG, PNG, and WEBP formats are supported.');
        continue;
      }
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
    if (coverPhotoIdx === fromIdx) {
      setCoverPhotoIdx(toIdx);
    } else if (coverPhotoIdx === toIdx) {
      setCoverPhotoIdx(fromIdx);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError('');
    setSuccess('');
    setUploadProgress('');

    if (!form.rent) {
      setError('Rent amount is required.');
      return;
    }

    if (uploadedPhotos.length === 0) {
      setError('Please upload at least one photo.');
      return;
    }

    setSaving(true);
    try {
      const finalPhotoUrls: string[] = [];

      if (isFirebaseConfigured) {
        setUploadProgress('Uploading modified assets to storage...');
        for (let i = 0; i < uploadedPhotos.length; i++) {
          const item = uploadedPhotos[i];
          if (item.file) {
            const fileRef = storageRef(storage, `rooms/${form.apartmentId}/${form.roomNumber}/${Date.now()}_${item.file.name}`);
            const snapshot = await uploadBytes(fileRef, item.file);
            const downloadUrl = await getDownloadURL(snapshot.ref);
            finalPhotoUrls.push(downloadUrl);
          } else if (item.storageUrl) {
            finalPhotoUrls.push(item.storageUrl);
          }
        }
      } else {
        // Local Sandbox simulation uses standard placeholder URLs
        const sandboxMockUrls = [
          "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1560185127-6a2806647f81?w=800&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80"
        ];
        uploadedPhotos.forEach((item, idx) => {
          if (item.storageUrl) {
            finalPhotoUrls.push(item.storageUrl);
          } else {
            finalPhotoUrls.push(sandboxMockUrls[idx % sandboxMockUrls.length]);
          }
        });
      }

      const coverPhoto = finalPhotoUrls[coverPhotoIdx] || finalPhotoUrls[0];
      const rentVal = parseFloat(form.rent);
      const depositVal = form.deposit ? parseFloat(form.deposit) : rentVal * 2;

      await updateRoom(id, {
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
        // Compatibility properties
        rentAmount: rentVal,
        securityDeposit: depositVal
      });

      setSuccess('Room details updated successfully!');
      setTimeout(() => navigate(`/admin/rooms/${id}`), 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to update room.');
    } finally {
      setSaving(false);
      setUploadProgress('');
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/admin/rooms/${id}`} className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors border border-border">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Edit Room #{form.roomNumber}</h1>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">Modify parameters, specification options, and reorder room photos.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 text-red-800 dark:text-red-400 p-4 rounded-2xl text-xs font-semibold flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 text-emerald-800 dark:text-emerald-400 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <Check size={16} className="text-emerald-500 stroke-[3]" />
            <span>{success}</span>
          </div>
        )}

        {uploadProgress && (
          <div className="bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <span>{uploadProgress}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            
            {/* Basic Info */}
            <div className="bg-white dark:bg-slate-800 border border-border rounded-3xl p-6 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-navy-450">Basic Information</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Room Number *</label>
                  <input
                    value={form.roomNumber}
                    onChange={e => setForm(f => ({ ...f, roomNumber: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Floor Number</label>
                  <input
                    type="number"
                    value={form.floor}
                    onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
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

            {/* Pricing Details */}
            <div className="bg-white dark:bg-slate-800 border border-border rounded-3xl p-6 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-navy-450">Pricing & Charges</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Monthly Rent (₹) *</label>
                  <input
                    type="number"
                    value={form.rent}
                    onChange={e => setForm(f => ({ ...f, rent: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Security Deposit (₹)</label>
                  <input
                    type="number"
                    value={form.deposit}
                    onChange={e => setForm(f => ({ ...f, deposit: e.target.value }))}
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
                    className="w-full px-3 py-2.5 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Amenities */}
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

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Public Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 bg-navy-50/50 dark:bg-slate-900 border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Photo Uploader */}
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
                </div>
              </div>

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
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 z-20">
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => setCoverPhotoIdx(idx)}
                                className={`p-1 rounded-lg ${
                                  isCover ? 'text-brand-400 bg-brand-500/10' : 'text-slate-350 hover:text-white'
                                }`}
                              >
                                <Star size={12} className={isCover ? 'fill-brand-400' : ''} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removePhoto(idx)}
                                className="p-1 text-red-400 hover:text-red-300 rounded-lg"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-between text-[8px] font-bold text-white">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => movePhoto(idx, idx - 1)}
                                className="hover:underline"
                              >
                                Left
                              </button>
                              <span>{idx + 1}</span>
                              <button
                                type="button"
                                disabled={idx === uploadedPhotos.length - 1}
                                onClick={() => movePhoto(idx, idx + 1)}
                                className="hover:underline"
                              >
                                Right
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex gap-3">
              <Link to={`/admin/rooms/${id}`} className="flex-1 py-2.5 border border-navy-150 dark:border-slate-700 rounded-xl text-center text-foreground hover:bg-navy-50/50 text-xs font-bold transition-colors">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black shadow-lg shadow-brand-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <Save size={14} />
                <span>{saving ? 'Saving changes...' : 'Save Changes'}</span>
              </button>
            </div>

          </div>

        </div>

      </form>

    </div>
  );
};
