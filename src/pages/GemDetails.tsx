import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Gem } from '../types';
import { Diamond, ArrowLeft, Mail, X } from 'lucide-react';
import { useStoreSettings } from '../hooks/useStoreSettings';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export function GemDetails() {
  const { id } = useParams<{ id: string }>();
  const [gem, setGem] = useState<Gem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState<{type: 'image' | 'video', url: string} | null>(null);
  
  const { settings } = useStoreSettings();
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({ name: '', phone: '', itemName: '', offeringPrice: '', message: '' });

  useEffect(() => {
    const fetchGem = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'gems', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const gemData = { id: docSnap.id, ...docSnap.data() } as Gem;
          setGem(gemData);
          if (gemData.videoUrl) {
            setActiveMedia({ type: 'video', url: gemData.videoUrl });
          } else if (gemData.imageUrl) {
            setActiveMedia({ type: 'image', url: gemData.imageUrl });
          } else if (gemData.images && gemData.images.length > 0) {
            setActiveMedia({ type: 'image', url: gemData.images[0] });
          }
        }
      } catch (error) {
        console.error("Error fetching gem details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGem();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading details...</p>
      </div>
    );
  }

  if (!gem) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Diamond className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Gem Not Found</h2>
        <p className="text-slate-500 mb-6">The gem you are looking for does not exist or has been removed.</p>
        <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Collection
        </Link>
      </div>
    );
  }

  // Gather all available media
  const allMedia: {type: 'image' | 'video', url: string}[] = [];
  if (gem.videoUrl) allMedia.push({ type: 'video', url: gem.videoUrl });
  if (gem.imageUrl) allMedia.push({ type: 'image', url: gem.imageUrl });
  if (gem.images) {
    gem.images.forEach(img => {
      if (img !== gem.imageUrl) {
        const isVideo = img.startsWith('data:video') || img.match(/\.(mp4|webm|ogg)$/i);
        allMedia.push({ type: isVideo ? 'video' : 'image', url: img });
      }
    });
  }

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Save to Firebase just in case
      await addDoc(collection(db, 'inquiries'), {
        gemId: gem.id,
        gemName: gem.name,
        name: inquiryForm.name,
        phone: inquiryForm.phone,
        itemName: inquiryForm.itemName || gem.name,
        offeringPrice: inquiryForm.offeringPrice,
        message: inquiryForm.message,
        createdAt: Date.now()
      });
    } catch (err) {
      console.error('Failed to save inquiry', err);
    }
    
    // Open email client
    const destEmail = settings?.inquiryEmail || settings?.contactEmail || 'mailto@example.com';
    const subject = encodeURIComponent(`Inquiry about Gem: ${gem.name} (${gem.id})`);
    const body = encodeURIComponent(
      `Name: ${inquiryForm.name}\n` +
      `Phone: ${inquiryForm.phone}\n` +
      `Item Name: ${inquiryForm.itemName || gem.name}\n` +
      `Offering Price: ${inquiryForm.offeringPrice ? '$' + inquiryForm.offeringPrice : 'N/A'}\n\n` +
      `Message:\n${inquiryForm.message}`
    );
    window.location.href = `mailto:${destEmail}?subject=${subject}&body=${body}`;
    setIsInquiryOpen(false);
    setInquiryForm({ name: '', phone: '', itemName: '', offeringPrice: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link to="/" className="text-slate-500 hover:text-slate-900 flex items-center gap-2 text-sm font-medium transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Collection
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col lg:flex-row">
          
          {/* Images Section */}
          <div className="lg:w-1/2 p-6 lg:p-10 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50">
            <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden mb-4 relative flex items-center justify-center">
              {activeMedia ? (
                activeMedia.type === 'video' ? (
                  <video src={activeMedia.url} controls className="w-full h-full object-contain" autoPlay muted loop playsInline />
                ) : (
                  <img src={activeMedia.url} alt={gem.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                )
              ) : (
                <Diamond className="w-24 h-24 text-slate-300" />
              )}
            </div>
            
            {allMedia.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {allMedia.map((media, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setActiveMedia(media)}
                    className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors relative bg-black ${activeMedia?.url === media.url ? 'border-indigo-600' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    {media.type === 'video' ? (
                      <>
                        <video src={media.url} className="w-full h-full object-cover opacity-60" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white pl-0.5">▶</div>
                        </div>
                      </>
                    ) : (
                      <img src={media.url} alt={`${gem.name} view ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="lg:w-1/2 p-6 lg:p-10">
            <div className="flex gap-2 mb-4">
              {gem.gemType && <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold tracking-wide uppercase rounded-full">{gem.gemType}</span>}
              {gem.status === 'sold' && <span className="inline-block px-3 py-1 text-white text-xs font-semibold tracking-wide uppercase rounded-full" style={{ backgroundColor: settings?.soldBadgeColor || '#0f172a' }}>Sold</span>}
              {gem.status === 'on_sale' && <span className="inline-block px-3 py-1 text-white text-xs font-semibold tracking-wide uppercase rounded-full" style={{ backgroundColor: settings?.saleBadgeColor || '#dc2626' }}>On Sale</span>}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">{gem.name}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex flex-col">
                {gem.status === 'on_sale' && gem.salePercentage ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xl text-slate-400 line-through">${(gem.price || 0).toLocaleString()}</span>
                      <span className="text-sm font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">-{gem.salePercentage}% OFF</span>
                    </div>
                    <p className="text-3xl text-slate-800 font-bold">${(gem.price * (1 - gem.salePercentage / 100)).toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </>
                ) : (
                  <p className="text-3xl text-slate-800 font-bold">${(gem.price || 0).toLocaleString()}</p>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">Specifications</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Weight</dt>
                    <dd className="text-sm text-slate-900 font-medium bg-slate-50 px-3 py-2 rounded-md border border-slate-100">{gem.weight} Carats</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Shape & Cut</dt>
                    <dd className="text-sm text-slate-900 font-medium bg-slate-50 px-3 py-2 rounded-md border border-slate-100">{gem.shape}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Origin</dt>
                    <dd className="text-sm text-slate-900 font-medium bg-slate-50 px-3 py-2 rounded-md border border-slate-100">{gem.origin}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Treatment</dt>
                    <dd className="text-sm text-slate-900 font-medium bg-slate-50 px-3 py-2 rounded-md border border-slate-100">{gem.treatment}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Dimensions</dt>
                    <dd className="text-sm text-slate-900 font-medium bg-slate-50 px-3 py-2 rounded-md border border-slate-100">{gem.dimensions}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <Button onClick={() => {
                  setIsInquiryOpen(true);
                  setInquiryForm(prev => ({ ...prev, itemName: gem.name }));
                }} className="gap-2 w-full mb-6" disabled={gem.status === 'sold'}>
                  <Mail className="h-4 w-4" /> {gem.status === 'sold' ? 'Sold Out' : 'Send Inquiry'}
                </Button>

                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">Verification</h3>
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg flex items-start gap-3 border border-emerald-100">
                  <div className="mt-0.5">
                    <Diamond className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Authenticity Guaranteed</p>
                    <p className="text-xs mt-1 text-emerald-700/80">This gemstone has been verified and matches the provided specifications.</p>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </main>

      {isInquiryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Inquire About Gem</h3>
                <p className="text-sm text-slate-500">{gem.name}</p>
              </div>
              <button 
                onClick={() => setIsInquiryOpen(false)}
                className="text-slate-400 hover:text-slate-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleInquirySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
                <Input 
                  required 
                  value={inquiryForm.name} 
                  onChange={e => setInquiryForm({...inquiryForm, name: e.target.value})} 
                  placeholder="John Doe" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <Input 
                  required 
                  type="tel"
                  value={inquiryForm.phone} 
                  onChange={e => setInquiryForm({...inquiryForm, phone: e.target.value})} 
                  placeholder="+1 234 567 890" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
                <Input 
                  required 
                  value={inquiryForm.itemName} 
                  onChange={e => setInquiryForm({...inquiryForm, itemName: e.target.value})} 
                  placeholder="Item Name" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Providing Offering Price ($)</label>
                <Input 
                  type="number"
                  value={inquiryForm.offeringPrice} 
                  onChange={e => setInquiryForm({...inquiryForm, offeringPrice: e.target.value})} 
                  placeholder="e.g. 5000" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea 
                  required 
                  rows={4}
                  value={inquiryForm.message} 
                  onChange={e => setInquiryForm({...inquiryForm, message: e.target.value})} 
                  placeholder="I am interested in purchasing this gem..."
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors"
                ></textarea>
              </div>
              <div className="pt-2">
                <Button type="submit" className="w-full gap-2">
                  <Mail className="h-4 w-4" /> Send Email
                </Button>
                <p className="text-xs text-center text-slate-500 mt-3">
                  This will open your default email client to send the inquiry.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
