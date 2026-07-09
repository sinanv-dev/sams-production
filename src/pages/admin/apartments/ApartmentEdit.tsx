import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getApartments, updateApartment, getUsers } from '../../../firebase/db';
import { Apartment, UserProfile } from '../../../types';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export const ApartmentEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [amenities, setAmenities] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [floors, setFloors] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [electricityRatePerUnit, setElectricityRatePerUnit] = useState('');
  const [defaultRentAmount, setDefaultRentAmount] = useState('');
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [rules, setRules] = useState('');
  const [status, setStatus] = useState<'active' | 'archived'>('active');

  const [owners, setOwners] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadEditData();
  }, [id]);

  const loadEditData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [allApts, allUsers] = await Promise.all([
        getApartments(),
        getUsers()
      ]);

      const apt = allApts.find(a => a.id === id);
      if (!apt) {
        navigate('/admin/apartments');
        return;
      }

      setName(apt.name);
      setAddress(apt.address);
      setDescription(apt.description || '');
      setImageUrl(apt.imageUrl || '');
      setAmenities(apt.amenities.join(', '));
      setOwnerId(apt.ownerId || '');
      setFloors(apt.floors?.toString() || '');
      setSecurityDeposit(apt.securityDeposit?.toString() || '');
      setElectricityRatePerUnit(apt.electricityRatePerUnit?.toString() || '');
      setDefaultRentAmount(apt.defaultRentAmount?.toString() || '');
      setGoogleMapsLink(apt.googleMapsLink || '');
      setRules(apt.rules || '');
      setStatus(apt.status || 'active');
      setOwners(allUsers.filter(u => u.role === 'owner'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setErrorMsg('');
    setSaving(true);

    try {
      const amenitiesArr = amenities.split(',').map(s => s.trim()).filter(Boolean);
      const selectedOwner = owners.find(o => o.uid === ownerId);

      await updateApartment(id, {
        name,
        address,
        description,
        imageUrl,
        amenities: amenitiesArr,
        ownerId: ownerId || undefined,
        ownerName: selectedOwner?.displayName || undefined,
        floors: floors ? parseInt(floors) : undefined,
        securityDeposit: securityDeposit ? parseFloat(securityDeposit) : undefined,
        electricityRatePerUnit: electricityRatePerUnit ? parseFloat(electricityRatePerUnit) : undefined,
        defaultRentAmount: defaultRentAmount ? parseFloat(defaultRentAmount) : undefined,
        googleMapsLink: googleMapsLink || undefined,
        rules: rules || undefined,
        status
      });
      navigate(`/admin/apartments/${id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update complex.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-6">
      <Link to={`/admin/apartments/${id}`} className="flex items-center space-x-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} />
        <span>Back to Details</span>
      </Link>

      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-black text-foreground mb-1">Edit Complex Asset</h2>
        <p className="text-xs text-muted-foreground mb-6">Modify building configurations and assigned Owner managers.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Complex Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Assign Owner Manager</label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 transition-colors"
              >
                <option value="">Unassigned</option>
                {owners.map(o => (
                  <option key={o.uid} value={o.uid}>{o.displayName} ({o.email})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Address *</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Floors</label>
              <input
                type="number"
                value={floors}
                onChange={(e) => setFloors(e.target.value)}
                className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Default Deposit (₹)</label>
              <input
                type="number"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Default Rent (₹)</label>
              <input
                type="number"
                value={defaultRentAmount}
                onChange={(e) => setDefaultRentAmount(e.target.value)}
                className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Elec. Rate/Unit (₹)</label>
              <input
                type="number"
                value={electricityRatePerUnit}
                onChange={(e) => setElectricityRatePerUnit(e.target.value)}
                className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Google Maps Link</label>
              <input
                type="text"
                value={googleMapsLink}
                onChange={(e) => setGoogleMapsLink(e.target.value)}
                className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Apartment Rules</label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              rows={2}
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
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Amenities</label>
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
              to={`/admin/apartments/${id}`}
              className="px-4 py-2 border border-border text-foreground hover:text-foreground rounded-xl text-sm font-semibold hover:bg-muted dark:bg-slate-900 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-md transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
