import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createApartment, getUsers } from '../../../firebase/db';
import { uploadToCloudinary } from '../../../services/cloudinary';
import { UserProfile } from '../../../types';
import {
  ArrowLeft, Building, AlertCircle, Upload, X, ImagePlus,
  MapPin, CheckCircle, Loader2
} from 'lucide-react';

interface ImageItem {
  id: string;
  file?: File;
  previewUrl: string;
  uploadedUrl?: string;
  uploading?: boolean;
  progress?: number;
  error?: string;
}

export const ApartmentCreate: React.FC = () => {
  const navigate = useNavigate();

  // Basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');

  // Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Owner & Financial
  const [ownerId, setOwnerId] = useState('');
  const [floors, setFloors] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [rentMin, setRentMin] = useState('');
  const [rentMax, setRentMax] = useState('');
  const [electricityRatePerUnit, setElectricityRatePerUnit] = useState('');

  // Amenities
  const [amenitiesInput, setAmenitiesInput] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);

  // Images
  const [images, setImages] = useState<ImageItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [owners, setOwners] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    getUsers()
      .then(users => setOwners(users.filter(u => u.role === 'owner')))
      .catch(console.error);
  }, []);

  const handleAddAmenity = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = amenitiesInput.trim().replace(/,$/, '');
      if (val && !amenities.includes(val)) {
        setAmenities(prev => [...prev, val]);
      }
      setAmenitiesInput('');
    }
  };

  const removeAmenity = (a: string) => setAmenities(prev => prev.filter(x => x !== a));

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const newItems: ImageItem[] = [];
    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg(`${file.name} exceeds 5 MB limit.`);
        return;
      }
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type)) {
        setErrorMsg(`${file.name} is not a supported image type.`);
        return;
      }
      newItems.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        uploading: false,
        progress: 0,
      });
    });
    setImages(prev => [...prev, ...newItems]);
    setErrorMsg('');
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim() || !address.trim() || !city.trim() || !state.trim()) {
      setErrorMsg('Name, Address, City and State are required.');
      return;
    }

    setLoading(true);

    try {
      // Upload images to Cloudinary
      const uploadedUrls: string[] = [];
      const filesToUpload = images.filter(i => i.file && !i.uploadedUrl);

      for (let i = 0; i < filesToUpload.length; i++) {
        const item = filesToUpload[i];
        setUploadProgress(`Uploading image ${i + 1}/${filesToUpload.length}...`);

        setImages(prev => prev.map(img =>
          img.id === item.id ? { ...img, uploading: true, progress: 0 } : img
        ));

        const url = await uploadToCloudinary(item.file!, (pct) => {
          setImages(prev => prev.map(img =>
            img.id === item.id ? { ...img, progress: pct } : img
          ));
          setUploadProgress(`Uploading image ${i + 1}/${filesToUpload.length} (${pct}%)...`);
        });

        uploadedUrls.push(url);
        setImages(prev => prev.map(img =>
          img.id === item.id ? { ...img, uploading: false, uploadedUrl: url } : img
        ));
      }

      // Merge already-uploaded URLs (for edit flow re-use)
      const alreadyUploaded = images
        .filter(i => i.uploadedUrl)
        .map(i => i.uploadedUrl!);
      const allUrls = [...alreadyUploaded, ...uploadedUrls];

      setUploadProgress('Saving apartment...');

      const selectedOwner = owners.find(o => o.uid === ownerId);
      await createApartment({
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        description: description.trim(),
        imageUrl: allUrls[0] || '',
        images: allUrls,
        amenities,
        totalRooms: 0,
        ownerId: ownerId || undefined,
        ownerName: selectedOwner?.displayName || undefined,
        floors: floors ? parseInt(floors) : undefined,
        securityDeposit: securityDeposit ? parseFloat(securityDeposit) : undefined,
        rentMin: rentMin ? parseFloat(rentMin) : undefined,
        rentMax: rentMax ? parseFloat(rentMax) : undefined,
        electricityRatePerUnit: electricityRatePerUnit ? parseFloat(electricityRatePerUnit) : undefined,
        googleMapsLink: googleMapsLink.trim() || undefined,
        latitude: latitude.trim() || undefined,
        longitude: longitude.trim() || undefined,
        rules: rules.trim() || undefined,
        status: 'active',
      });

      navigate('/admin/apartments');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create apartment.');
      setLoading(false);
      setUploadProgress('');
    }
  };

  const inputClass =
    'w-full bg-input/50 dark:bg-slate-800/50 border border-border rounded-xl py-2.5 px-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-colors';
  const labelClass = 'block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5';

  return (
    <div className="space-y-6 max-w-3xl mx-auto p-6">
      <Link
        to="/admin/apartments"
        className="flex items-center space-x-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Back to Apartments</span>
      </Link>

      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
          <Building size={20} className="text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight">Add Apartment</h1>
          <p className="text-xs text-muted-foreground">Create a new apartment complex with images and full details.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic Info */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-foreground">Basic Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Apartment Name *</label>
              <input
                type="text" required value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Skyline Residency"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Assign Owner</label>
              <select value={ownerId} onChange={e => setOwnerId(e.target.value)} className={inputClass}>
                <option value="">— Unassigned —</option>
                {owners.map(o => (
                  <option key={o.uid} value={o.uid}>{o.displayName} ({o.email})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              rows={3} placeholder="Describe the apartment complex, views, facilities..."
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className={labelClass}>House Rules</label>
            <textarea
              value={rules} onChange={e => setRules(e.target.value)}
              rows={2} placeholder="e.g. No pets allowed, quiet hours after 10 PM..."
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* Location */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <MapPin size={14} className="text-brand-500" /> Location
          </h3>

          <div>
            <label className={labelClass}>Street Address *</label>
            <input
              type="text" required value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. 12/4 MG Road, Near City Mall"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>City *</label>
              <input
                type="text" required value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Bangalore"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>State *</label>
              <input
                type="text" required value={state}
                onChange={e => setState(e.target.value)}
                placeholder="e.g. Karnataka"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Pincode</label>
              <input
                type="text" value={pincode}
                onChange={e => setPincode(e.target.value)}
                placeholder="e.g. 560001"
                maxLength={10}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className={labelClass}>Google Maps Link</label>
              <input
                type="url" value={googleMapsLink}
                onChange={e => setGoogleMapsLink(e.target.value)}
                placeholder="https://maps.google.com/..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Latitude</label>
              <input
                type="text" value={latitude}
                onChange={e => setLatitude(e.target.value)}
                placeholder="e.g. 12.9716"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Longitude</label>
              <input
                type="text" value={longitude}
                onChange={e => setLongitude(e.target.value)}
                placeholder="e.g. 77.5946"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Financial */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-foreground">Financial Details</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Total Floors</label>
              <input type="number" value={floors} onChange={e => setFloors(e.target.value)}
                placeholder="e.g. 5" min="1" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Security Deposit (₹)</label>
              <input type="number" value={securityDeposit} onChange={e => setSecurityDeposit(e.target.value)}
                placeholder="e.g. 15000" min="0" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Rent Min (₹)</label>
              <input type="number" value={rentMin} onChange={e => setRentMin(e.target.value)}
                placeholder="e.g. 8000" min="0" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Rent Max (₹)</label>
              <input type="number" value={rentMax} onChange={e => setRentMax(e.target.value)}
                placeholder="e.g. 18000" min="0" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Electricity Rate / Unit (₹)</label>
              <input type="number" value={electricityRatePerUnit}
                onChange={e => setElectricityRatePerUnit(e.target.value)}
                placeholder="e.g. 12" min="0" step="0.01" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-foreground">Amenities</h3>
          <div>
            <label className={labelClass}>Add Amenity (Press Enter or comma)</label>
            <input
              type="text" value={amenitiesInput}
              onChange={e => setAmenitiesInput(e.target.value)}
              onKeyDown={handleAddAmenity}
              placeholder="e.g. WiFi, CCTV, Lift, Parking..."
              className={inputClass}
            />
          </div>
          {amenities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {amenities.map(a => (
                <span key={a} className="flex items-center gap-1.5 text-xs font-bold bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-700 text-brand-700 dark:text-brand-300 px-3 py-1 rounded-full">
                  {a}
                  <button type="button" onClick={() => removeAmenity(a)} className="hover:text-red-500 transition-colors">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Images */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ImagePlus size={14} className="text-brand-500" /> Apartment Photos
            <span className="text-[10px] font-normal text-muted-foreground">(max 5 MB each, JPG/PNG/WEBP)</span>
          </h3>

          <input
            type="file" ref={fileInputRef} multiple accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => handleFileSelect(e.target.files)}
          />

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                  <img src={img.previewUrl} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />

                  {/* Cover badge */}
                  {idx === 0 && (
                    <div className="absolute top-1.5 left-1.5 text-[9px] font-black bg-brand-600 text-white px-1.5 py-0.5 rounded">
                      COVER
                    </div>
                  )}

                  {/* Upload progress */}
                  {img.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                      <Loader2 size={20} className="text-white animate-spin mb-1" />
                      <span className="text-[10px] text-white font-bold">{img.progress || 0}%</span>
                    </div>
                  )}

                  {/* Uploaded checkmark */}
                  {img.uploadedUrl && !img.uploading && (
                    <div className="absolute top-1.5 right-1.5">
                      <CheckCircle size={14} className="text-emerald-400" />
                    </div>
                  )}

                  {/* Remove button */}
                  {!img.uploading && (
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-600 text-white rounded-full items-center justify-center hidden group-hover:flex transition-all"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}

              {/* Add more */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-brand-400 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-brand-500 transition-colors"
              >
                <Upload size={18} />
                <span className="text-[10px] font-bold">Add More</span>
              </button>
            </div>
          )}

          {images.length === 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border hover:border-brand-400 rounded-xl py-10 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-brand-500 transition-colors group"
            >
              <Upload size={28} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold">Click to upload apartment photos</span>
              <span className="text-xs">Supports JPG, PNG, WEBP · Max 5 MB each</span>
            </button>
          )}
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl text-xs font-semibold text-red-800 dark:text-red-400 flex items-start space-x-2">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Progress */}
        {uploadProgress && (
          <div className="p-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-700/30 rounded-xl text-xs font-semibold text-brand-700 dark:text-brand-300 flex items-center space-x-2">
            <Loader2 size={14} className="animate-spin flex-shrink-0" />
            <span>{uploadProgress}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <Link
            to="/admin/apartments"
            className="px-5 py-2.5 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold shadow-md transition-colors"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : <><Building size={14} /> Create Apartment</>}
          </button>
        </div>
      </form>
    </div>
  );
};
