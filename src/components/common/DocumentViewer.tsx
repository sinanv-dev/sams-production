import React, { useState, useEffect, useRef } from 'react';
import { 
  ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, Printer, 
  Download, ExternalLink, X, FileText, CheckCircle, AlertCircle, 
  User, Building2, ShieldAlert, Eye, Lock
} from 'lucide-react';
import { exportAgreementPDF, exportCustomerDocumentExport } from '../../utils/exportUtils';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  docName: string;
  docType: 'lease' | 'id_proof' | 'photo' | 'verification' | 'other';
  fileUrl: string | null;
  status: 'Verified' | 'Pending' | 'Missing';
  customer: any;
  room?: any;
  apartment?: any;
  ownerName?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  isOpen,
  onClose,
  docName,
  docType,
  fileUrl,
  status,
  customer,
  room,
  apartment,
  ownerName = 'John Owner'
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fitMode, setFitMode] = useState<'width' | 'page' | 'none'>('none');
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Esc key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Scroll lock
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset'; // Restore scroll
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => {
    setZoom(1.0);
    setFitMode('none');
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const toggleFullscreen = () => {
    if (!viewerRef.current) return;

    if (!document.fullscreenElement) {
      viewerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Error attempting to enable full-screen mode:", err);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Track fullscreen changes from ESC/outside browser triggers
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleFitWidth = () => {
    setFitMode('width');
    setZoom(1.1);
  };

  const handleFitPage = () => {
    setFitMode('page');
    setZoom(0.85);
  };

  const handleDownload = () => {
    if (fileUrl) {
      // Create download link for uploaded file
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = docName.replace(/\s+/g, '_') + (fileUrl.startsWith('data:application/pdf') ? '.pdf' : '.jpg');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Dynamic real PDF generation trigger
      if (docName === 'Rental Lease Agreement') {
        exportAgreementPDF(customer, room || { roomNumber: 'N/A', rentAmount: 0 }, apartment || { name: 'SAMS Complex' }, ownerName);
      } else {
        exportCustomerDocumentExport(customer, room || { roomNumber: 'N/A' }, apartment || { name: 'SAMS Complex' }, ownerName);
      }
    }
  };

  const handlePrint = () => {
    if (fileUrl) {
      const printWindow = window.open(fileUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
        printWindow.print();
      }
    } else {
      const printContent = contentRef.current?.innerHTML;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print - ${docName}</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #000; background: #fff; }
                .agreement-doc { max-width: 800px; margin: 0 auto; line-height: 1.6; }
                .doc-card { border: 1px solid #ccc; padding: 20px; border-radius: 12px; margin: 20px auto; max-width: 450px; }
                h1, h2, h3, h4 { margin-top: 0; }
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .text-center { text-align: center; }
                .border-b { border-bottom: 1px solid #eee; }
                .pb-2 { padding-bottom: 8px; }
                .mb-4 { margin-bottom: 16px; }
                .mt-8 { margin-top: 32px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
              </style>
            </head>
            <body>
              ${printContent}
              <script>
                window.onload = function() {
                  window.print();
                  window.close();
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const handleOpenInNewTab = () => {
    if (fileUrl) {
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(`<iframe src="${fileUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
    } else {
      alert("Simulated preview documents are only viewable inside the dashboard. Upload a real file to enable standard new tab routing.");
    }
  };

  // Render simulated documents
  const renderSimulatedDocument = () => {
    const custId = `CUST-${customer?.uid?.slice(-6).toUpperCase() || 'N/A'}`;
    const formattedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    if (docName === 'Rental Lease Agreement') {
      return (
        <div className="agreement-doc bg-white text-slate-800 p-8 md:p-12 shadow-md rounded-lg max-w-2xl text-left border border-slate-200">
          {/* Header watermark */}
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4 mb-6">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">SAMS SMART APARTMENT SYSTEMS</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Digital Lease Registry Service</p>
            </div>
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm">SAMS</div>
          </div>

          <h2 className="text-center font-bold text-base text-slate-900 border-b border-slate-300 pb-2 mb-6">RESIDENTIAL LEASE AGREEMENT</h2>
          
          <div className="space-y-4 text-[11px] leading-relaxed text-slate-600 font-medium">
            <p>
              This Residential Lease Agreement is entered into on <strong>{formattedDate}</strong>, by and between:
            </p>
            <p className="pl-4 text-slate-700">
              <strong>FIRST PARTY (OWNER):</strong> {ownerName} <br />
              <strong>SECOND PARTY (CUSTOMER):</strong> {customer?.displayName || 'N/A'} (ID: {custId})
            </p>
            <p>
              The First Party hereby leases to the Second Party the room unit described as <strong>Room {room?.roomNumber || 'N/A'}</strong>, situated at <strong>{apartment?.name || 'SAMS Complex'}</strong> ({apartment?.address || 'N/A'}).
            </p>
            
            <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6">TERMS & COVENANTS</h3>
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li><strong>LEASE TERM:</strong> The lease duration is mutually selected for 11 months, starting {formattedDate}.</li>
              <li><strong>MONTHLY ALLOTMENT RENT:</strong> The Second Party agrees to pay monthly rent of <strong>₹{(room?.rentAmount || 0).toLocaleString('en-IN')}</strong>, payable on or before the 5th of each month.</li>
              <li><strong>UTILITY CHARGES:</strong> Utility fees, specifically electricity units, are computed separately based on meters at <strong>₹12.00 / Unit</strong>.</li>
              <li><strong>SECURITY UNDERTAKING:</strong> The Second Party has deposited 2 months rent of <strong>₹{((room?.rentAmount || 0) * 2).toLocaleString('en-IN')}</strong> as security caution deposit.</li>
              <li><strong>TERMINATION PROTOCOL:</strong> Either party can terminate this lease with a 30-day written notice.</li>
            </ol>

            <div className="flex justify-between items-end mt-12 pt-8 border-t border-slate-200">
              <div className="text-center w-1/3">
                <div className="h-10 border-b border-slate-300 flex items-center justify-center font-serif italic text-sm text-slate-750">{ownerName}</div>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">First Party (Owner)</p>
              </div>
              <div className="text-center w-12 h-12 border border-dashed border-slate-350 rounded flex items-center justify-center text-[8px] text-slate-400 font-black uppercase text-center leading-none">
                SAMS<br/>STAMP
              </div>
              <div className="text-center w-1/3">
                <div className="h-10 border-b border-slate-300 flex items-center justify-center font-serif italic text-sm text-slate-750">{customer?.displayName || 'N/A'}</div>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Second Party (Customer)</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (docName === 'Aadhaar Card') {
      return (
        <div className="doc-card w-[450px] bg-[#fbf9f6] border border-orange-250 text-slate-800 p-6 rounded-2xl shadow-lg relative text-left">
          <div className="flex justify-between items-center border-b border-orange-300 pb-2 mb-3">
            <span className="text-[10px] font-black text-orange-850 uppercase">भारत सरकार / Government of India</span>
            <span className="text-[8px] font-bold text-green-700 uppercase">UIDAI Registry</span>
          </div>
          
          <div className="flex gap-4">
            <div className="w-20 h-24 bg-slate-200 border border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-450">
              <User size={36} />
              <span className="text-[7px] font-bold mt-1 uppercase text-slate-500">Photo Proof</span>
            </div>
            
            <div className="flex-1 space-y-2 text-[10px] text-slate-700 font-bold leading-normal">
              <div>
                <p className="text-[7px] text-slate-400 uppercase font-semibold">Name</p>
                <p className="text-[11px] text-slate-900 font-extrabold">{customer?.displayName || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[7px] text-slate-400 uppercase font-semibold">Birth Year</p>
                  <p className="text-slate-900 font-extrabold">1995</p>
                </div>
                <div>
                  <p className="text-[7px] text-slate-400 uppercase font-semibold">Gender</p>
                  <p className="text-slate-900 font-extrabold">Male</p>
                </div>
              </div>
              <div>
                <p className="text-[7px] text-slate-400 uppercase font-semibold">Aadhaar Number</p>
                <p className="text-sm text-slate-950 font-black tracking-widest mt-1">XXXX XXXX 8921</p>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-orange-200 pt-2 flex justify-between items-center text-[7px] text-slate-400 font-bold">
            <span>मेरा आधार, मेरी पहचान</span>
            <span className="text-green-700 flex items-center gap-1"><CheckCircle size={8} /> System Verified</span>
          </div>
        </div>
      );
    }

    if (docName === 'PAN Card') {
      return (
        <div className="doc-card w-[450px] bg-gradient-to-br from-teal-900 to-emerald-950 border border-teal-800 text-white p-6 rounded-2xl shadow-lg relative text-left">
          <div className="flex justify-between items-start border-b border-teal-700/50 pb-2 mb-3">
            <div>
              <h4 className="text-[9px] font-extrabold text-teal-300 uppercase leading-none">आयकर विभाग</h4>
              <h3 className="text-[10px] font-black uppercase tracking-tight">INCOME TAX DEPARTMENT</h3>
            </div>
            <span className="text-[7px] font-bold bg-teal-850 text-teal-300 px-2 py-0.5 rounded uppercase">GOVT OF INDIA</span>
          </div>

          <div className="flex gap-4">
            <div className="w-20 h-24 bg-teal-950/60 border border-teal-800/80 rounded-lg flex flex-col items-center justify-center text-teal-500">
              <User size={36} />
              <span className="text-[7px] font-bold mt-1 uppercase text-teal-400">Avatar</span>
            </div>
            
            <div className="flex-1 space-y-2 text-[9px] text-teal-200 font-bold leading-normal">
              <div>
                <p className="text-[6px] text-teal-400 uppercase font-semibold">Name</p>
                <p className="text-[11px] text-white font-extrabold uppercase">{customer?.displayName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[6px] text-teal-400 uppercase font-semibold">Father's Name</p>
                <p className="text-white uppercase font-bold">JOHN CUSTOMER SR.</p>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[6px] text-teal-400 uppercase font-semibold">Permanent Account Number (PAN)</p>
                  <p className="text-sm text-yellow-350 font-black tracking-widest uppercase mt-0.5">XXXXX3812K</p>
                </div>
                <div className="w-10 h-10 border border-dashed border-teal-700/60 rounded-full flex items-center justify-center text-[7px] text-teal-450 font-bold text-center leading-none">
                  SEAL
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (docName === 'Passport') {
      return (
        <div className="doc-card w-[450px] bg-[#fbf9f6] border border-blue-250 text-slate-800 p-6 rounded-2xl shadow-lg relative text-left">
          <div className="flex justify-between items-center border-b border-blue-300 pb-2 mb-3">
            <span className="text-[10px] font-black text-blue-900 uppercase">विदेश मंत्रालय / Ministry of External Affairs</span>
            <span className="text-[8px] font-bold text-blue-700 uppercase">REPUBLIC OF INDIA</span>
          </div>

          <div className="flex gap-4">
            <div className="w-20 h-24 bg-slate-200 border border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400">
              <User size={36} />
              <span className="text-[7px] font-bold mt-1 uppercase text-slate-500">PASSPORT PORTRAIT</span>
            </div>
            
            <div className="flex-1 space-y-2 text-[9px] text-slate-700 font-bold leading-normal">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[6px] text-slate-400 uppercase font-semibold">Type</p>
                  <p className="text-slate-900 font-bold">P</p>
                </div>
                <div>
                  <p className="text-[6px] text-slate-400 uppercase font-semibold">Passport No</p>
                  <p className="text-slate-900 font-bold uppercase">Z1234567</p>
                </div>
              </div>
              <div>
                <p className="text-[6px] text-slate-400 uppercase font-semibold">Given Name</p>
                <p className="text-[11px] text-slate-900 font-extrabold uppercase">{customer?.displayName || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[6px] text-slate-400 uppercase font-semibold">Date of Birth</p>
                  <p className="text-slate-900 font-extrabold">15/08/1995</p>
                </div>
                <div>
                  <p className="text-[6px] text-slate-400 uppercase font-semibold">Place of Birth</p>
                  <p className="text-slate-900 font-extrabold uppercase">DELHI</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (docName === 'Police Verification Form') {
      return (
        <div className="doc-card bg-white text-slate-800 p-8 rounded-xl max-w-xl text-left border-t-8 border-emerald-600 shadow-md">
          <div className="text-center mb-6">
            <h2 className="text-base font-black tracking-tight text-emerald-800 uppercase">POLICE VERIFICATION CERTIFICATE</h2>
            <p className="text-[9px] text-slate-400 font-bold tracking-widest mt-0.5">STATE POLICE DEPT - LOCAL COMMISSIONER OFFICE</p>
          </div>
          
          <div className="space-y-4 text-[10.5px] leading-relaxed text-slate-650 font-medium">
            <p>
              This certifies that character and background check credentials for individual <strong>{customer?.displayName || 'N/A'}</strong> (ID: {custId}) have been processed.
            </p>
            <p>
              Based on databases searched, no criminal activity or pending warrants have been recorded at local precinct networks.
            </p>
            <div className="p-4 bg-emerald-50 text-emerald-850 border border-emerald-200 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">✓</div>
              <div>
                <p className="font-extrabold text-[11px] text-emerald-950">VERIFICATION COMPLETED</p>
                <p className="text-[9px] text-emerald-700 font-bold">Cleared on: {formattedDate}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (docName === 'Customer Photo') {
      return (
        <div className="doc-card bg-white border border-slate-200 text-slate-850 p-6 rounded-2xl shadow-lg max-w-xs text-center">
          <div className="w-40 h-48 mx-auto border-4 border-slate-100 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center text-slate-300">
            <User size={96} />
          </div>
          <h3 className="font-bold text-sm text-slate-905 mt-4 uppercase tracking-wider">{customer?.displayName || 'N/A'}</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Customer Profile Picture</p>
          <span className="inline-block mt-3 text-[9px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded uppercase tracking-wider">
            Verified Account
          </span>
        </div>
      );
    }

    return (
      <div className="doc-card bg-white border border-slate-200 text-slate-800 p-8 rounded-2xl shadow-lg max-w-md text-left">
        <h3 className="font-extrabold text-sm border-b border-slate-200 pb-2 mb-4 text-slate-900">{docName}</h3>
        <p className="text-xs text-slate-550 leading-relaxed font-medium">
          Detailed verification log parameters for customer account <strong>{customer?.displayName || 'N/A'}</strong> (ID: {custId}). Document type categorized as: <strong>{docType.toUpperCase()}</strong>.
        </p>
        <div className="mt-6 flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700">
          <FileText size={16} />
          <span className="text-[10px] font-bold uppercase">System Verified Artifact Logs</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6 transition-all duration-300">
      <div 
        ref={viewerRef}
        className="bg-card border border-border w-full max-w-5xl h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 transform scale-100 opacity-100"
      >
        {/* Header Bar */}
        <div className="bg-card text-foreground p-4 px-6 flex justify-between items-center border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm tracking-tight">{docName}</h3>
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase border ${
                  status === 'Verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-muted text-muted-foreground border-border'
                }`}>
                  {status}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                <span>Customer: {customer?.displayName || 'N/A'}</span>
                {room && <span>• Room {room.roomNumber}</span>}
                {apartment && <span>• {apartment.name}</span>}
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="bg-card border-b border-border p-3 px-6 flex flex-wrap items-center justify-between gap-3 text-foreground select-none">
          <div className="flex items-center gap-1.5">
            <button 
              onClick={handleZoomOut} 
              disabled={status === 'Missing'}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground rounded-xl transition-all disabled:opacity-40"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-bold w-12 text-center text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <button 
              onClick={handleZoomIn} 
              disabled={status === 'Missing'}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground rounded-xl transition-all disabled:opacity-40"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            
            <span className="h-4 w-px bg-border mx-1" />
            
            <button 
              onClick={handleFitWidth} 
              disabled={status === 'Missing'}
              className="px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground text-xs font-bold rounded-xl transition-all disabled:opacity-40"
            >
              Fit Width
            </button>
            <button 
              onClick={handleFitPage} 
              disabled={status === 'Missing'}
              className="px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground text-xs font-bold rounded-xl transition-all disabled:opacity-40"
            >
              Fit Page
            </button>
            
            <span className="h-4 w-px bg-border mx-1" />
            
            <button 
              onClick={handleRotate} 
              disabled={status === 'Missing'}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground rounded-xl transition-all disabled:opacity-40"
              title="Rotate 90°"
            >
              <RotateCw size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={handleOpenInNewTab} 
              disabled={status === 'Missing'}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground rounded-xl transition-all disabled:opacity-40"
              title="Open in New Tab"
            >
              <ExternalLink size={16} />
            </button>
            <button 
              onClick={toggleFullscreen} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground rounded-xl transition-all"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button 
              onClick={handlePrint} 
              disabled={status === 'Missing'}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground rounded-xl transition-all disabled:opacity-40"
              title="Print"
            >
              <Printer size={16} />
            </button>
            <button 
              onClick={handleDownload} 
              disabled={status === 'Missing'}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground rounded-xl transition-all disabled:opacity-40"
              title="Download File"
            >
              <Download size={16} />
            </button>
          </div>
        </div>

        {/* Preview Sandbox Window */}
        <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 p-6 flex justify-center items-start transition-colors">
          <div 
            ref={contentRef}
            className="transition-transform duration-200 origin-top flex justify-center items-start"
            style={{ 
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              marginTop: rotation % 180 !== 0 ? '60px' : '0'
            }}
          >
            {status === 'Missing' ? (
              <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-4 max-w-sm shadow-sm transition-all duration-200">
                <div className="w-16 h-16 mx-auto bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center">
                  <ShieldAlert size={32} />
                </div>
                <h4 className="font-extrabold text-base text-foreground">No document uploaded yet.</h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                  The document has not been uploaded by the customer or has been flagged as missing. Please request customer submission.
                </p>
              </div>
            ) : fileUrl ? (
              fileUrl.startsWith('data:application/pdf') ? (
                <div className="w-[750px] h-[75vh] bg-card border border-border rounded-xl overflow-hidden shadow-lg">
                  <object data={fileUrl} type="application/pdf" className="w-full h-full">
                    <embed src={fileUrl} type="application/pdf" className="w-full h-full" />
                  </object>
                </div>
              ) : (
                <div className="bg-card border border-border p-2 rounded-2xl shadow-lg max-w-xl">
                  <img src={fileUrl} alt={docName} className="max-w-full h-auto rounded-xl" />
                </div>
              )
            ) : (
              renderSimulatedDocument()
            )}
          </div>
        </div>

        {/* Footer Area */}
        <div className="bg-card border-t border-border p-4 px-6 flex justify-between items-center text-foreground transition-all">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
            Smart Document Security Vault
          </p>
          <div className="flex gap-2">
            <button 
              onClick={handlePrint}
              disabled={status === 'Missing'}
              className="px-4 py-2 border border-border hover:border-slate-350 dark:hover:border-slate-600 text-xs font-bold rounded-xl transition-all disabled:opacity-40"
            >
              Print
            </button>
            <button 
              onClick={handleDownload}
              disabled={status === 'Missing'}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-40"
            >
              Download
            </button>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
