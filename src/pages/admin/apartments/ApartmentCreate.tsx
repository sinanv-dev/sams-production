import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createApartment, getUsers } from '../../../firebase/db';
import { UserProfile } from '../../../types';
import { ArrowLeft, Building, AlertCircle } from 'lucide-react';

export const ApartmentCreate: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80');
  const [amenities, setAmenities] = useState('24/7 Security, Rooftop Pool, Modern Gym');
  
  // New SAMS fields
  const [ownerId, setOwnerId] = useState('');
  const [floors, setFloors] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [electricityRatePerUnit, setElectricityRatePerUnit] = useState('');
  const [defaultRentAmount, setDefaultRentAmount] = useState('');
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [rules, setRules] = useState('');

  const [owners, setOwners] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    getUsers().then(users => {
      setOwners(users.filter(u => u.role === 'owner'));
    }).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (!name || !address) {
      setErrorMsg('Name and Address are required.');
      setLoading(false);
      return;
    }

    try {
      const amenitiesArr = amenities.split(',').map(s => s.trim()).filter(Boolean);
      const selectedOwner = owners.find(o => o.uid === ownerId);

      await createApartment({
        name,
        address,
        description,
        imageUrl,
        amenities: amenitiesArr,
        totalRooms: 0,
        ownerId: ownerId || undefined,
        ownerName: selectedOwner?.displayName || undefined,
        floors: floors ? parseInt(floors) : undefined,
        securityDeposit: securityDeposit ? parseFloat(securityDeposit) : undefined,
        electricityRatePerUnit: electricityRatePerUnit ? parseFloat(electricityRatePerUnit) : undefined,
        defaultRentAmount: defaultRentAmount ? parseFloat(defaultRentAmount) : undefined,
        googleMapsLink: googleMapsLink || undefined,
        rules: rules || undefined,
        status: 'active'
      });
      navigate('/admin/apartments');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create complex.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-6">
      <Link to="/admin/apartments" className="flex items-center space-x-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} />
        <span>Back to Complex Assets</span>
      </Link>

      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-black text-foreground mb-1">Add Complex Asset</h2>
        <p className="text-xs text-muted-foreground mb-6">Create a new building structure or apartment community complex.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Complex Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Skyline Towers"
                className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-800 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Assign Owner</label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 transition-colors"
              >
                <option value="">Unassigned</option>
                {owners.map(o => <option key={o.uid} value={o.uid}>{o.displayName} ({o.email})</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Street Address *</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 789 Cloud Street, Seattle"
              className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Floors</label>
              <input
                type="number"
                value={floors}
                onChange={(e) => setFloors(e.target.value)}
                placeholder="e.g. 5"
                className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Default Deposit (₹)</label>
              <input
                type="number"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                placeholder="e.g. 15000"
                className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Default Rent (₹)</label>
              <input
                type="number"
                value={defaultRentAmount}
                onChange={(e) => setDefaultRentAmount(e.target.value)}
                placeholder="e.g. 10000"
                className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Elec. Rate/Unit (₹)</label>
              <input
                type="number"
                value={electricityRatePerUnit}
                onChange={(e) => setElectricityRatePerUnit(e.target.value)}
                placeholder="e.g. 12"
                className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Google Maps Link</label>
              <input
                type="text"
                value={googleMapsLink}
                onChange={(e) => setGoogleMapsLink(e.target.value)}
                placeholder="https://maps.google.com/..."
                className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Details on views, location, floorplans..."
              className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Apartment Rules</label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              rows={2}
              placeholder="e.g. No pets, quiet hours after 10 PM..."
              className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Cover Image URL</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Amenities (Comma-separated)</label>
            <input
              type="text"
              value={amenities}
              onChange={(e) => setAmenities(e.target.value)}
              className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-start space-x-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/50">
            <Link
              to="/admin/apartments"
              className="px-4 py-2 border border-border text-foreground hover:text-foreground rounded-xl text-sm font-semibold hover:bg-muted dark:bg-slate-900 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-md transition-colors"
            >
              {loading ? 'Creating...' : 'Create Complex'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
