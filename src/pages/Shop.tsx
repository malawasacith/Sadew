import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db, handleFirestoreError } from '../lib/firebase';
import { OperationType, Gem, StoreSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Diamond, LogOut, Filter, Search, Mail, Phone, MapPin } from 'lucide-react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

function HeroSlider({ images }: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <>
      {images.map((img, idx) => (
        <img
          key={idx}
          src={img}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            idx === currentIndex ? 'opacity-60 z-0' : 'opacity-0 -z-10'
          }`}
          alt="Hero"
        />
      ))}
    </>
  );
}

export function Shop() {
  const { user, isAdmin, signOut } = useAuth();
  const [gems, setGems] = useState<Gem[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<StoreSettings>({
    name: 'Sadew Gems',
    heroHeadline: 'Exclusive Gem Collection',
    heroSubheadline: 'Discover the world\'s finest untreated gemstones, sourced ethically.',
  });

  // Filters state
  const [search, setSearch] = useState('');
  const [gemTypeFilter, setGemTypeFilter] = useState('');
  const [shapeFilter, setShapeFilter] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [treatmentFilter, setTreatmentFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [displayCount, setDisplayCount] = useState(8);

  useEffect(() => {
    // Fetch Settings
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'storefront');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(prev => ({...prev, ...docSnap.data()}));
        }
      } catch (e) {
        console.error("Error fetching settings", e);
      }
    };
    fetchSettings();

    const q = query(collection(db, 'gems'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const fetchedGems: Gem[] = [];
        snapshot.forEach((doc) => {
          fetchedGems.push({ id: doc.id, ...doc.data() } as Gem);
        });
        setGems(fetchedGems);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'gems');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filteredAndSortedGems = useMemo(() => {
    let result = gems.filter(gem => {
      if (search && !gem.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (gemTypeFilter && gem.gemType?.toLowerCase() !== gemTypeFilter.toLowerCase()) return false;
      if (shapeFilter && gem.shape.toLowerCase() !== shapeFilter.toLowerCase()) return false;
      if (originFilter && gem.origin.toLowerCase() !== originFilter.toLowerCase()) return false;
      if (treatmentFilter && gem.treatment.toLowerCase() !== treatmentFilter.toLowerCase()) return false;
      if (minPrice && gem.price < Number(minPrice)) return false;
      if (maxPrice && gem.price > Number(maxPrice)) return false;
      return true;
    });

    result.sort((a, b) => {
      const getPrice = (gem: Gem) => gem.status === 'on_sale' && gem.salePercentage ? gem.price * (1 - gem.salePercentage / 100) : (gem.price || 0);

      switch (sortBy) {
        case 'price_asc':
          return getPrice(a) - getPrice(b);
        case 'price_desc':
          return getPrice(b) - getPrice(a);
        case 'date_asc':
          return (a.createdAt || 0) - (b.createdAt || 0);
        case 'date_desc':
        default:
          return (b.createdAt || 0) - (a.createdAt || 0);
      }
    });

    return result;
  }, [gems, search, gemTypeFilter, shapeFilter, originFilter, treatmentFilter, minPrice, maxPrice, sortBy]);

  const displayedGems = filteredAndSortedGems.slice(0, displayCount);

  const uniqueGemTypes = Array.from(new Set(gems.map(g => g.gemType))).filter(Boolean);
  const uniqueShapes = Array.from(new Set(gems.map(g => g.shape))).filter(Boolean);
  const uniqueOrigins = Array.from(new Set(gems.map(g => g.origin))).filter(Boolean);
  const uniqueTreatments = Array.from(new Set(gems.map(g => g.treatment))).filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Store Logo" className="h-8 max-w-[120px] object-contain" />
            ) : (
              <Diamond className="h-6 w-6 text-slate-900" />
            )}
            <h1 className="text-lg font-semibold tracking-tight">{settings.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            {((user && isAdmin) || localStorage.getItem('adminUnlocked') === 'true') && (
              <Link to="/admin">
                <Button variant="outline" size="sm" className="hidden sm:flex">Admin Dashboard</Button>
              </Link>
            )}
            <Button variant="ghost" onClick={async () => {
              if (user) await signOut();
              localStorage.removeItem('storeUnlocked');
              localStorage.removeItem('adminUnlocked');
              window.location.href = '/login';
            }} size="sm" className="gap-2 text-slate-500">
              <LogOut className="h-4 w-4" />
              Exit
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {(settings.heroImageUrl || (settings.heroImageUrls && settings.heroImageUrls.length > 0)) && (
        <div className="w-full relative h-[40vh] min-h-[300px] max-h-[500px] bg-slate-900 flex items-center justify-center shrink-0 overflow-hidden">
          {settings.heroImageUrls && settings.heroImageUrls.length > 0 ? (
            <HeroSlider images={settings.heroImageUrls} />
          ) : (
            <img src={settings.heroImageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Hero" />
          )}
          <div className="relative z-10 text-center px-4 max-w-3xl">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight" style={{ fontFamily: 'var(--font-family, inherit)' }}>{settings.heroHeadline}</h2>
            {settings.heroSubheadline && (
              <p className="text-lg md:text-xl text-slate-200">{settings.heroSubheadline}</p>
            )}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8 flex-1 w-full">
        
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 shrink-0 space-y-6">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4 font-medium">
              <Filter className="h-4 w-4" />
              <h2>Filters</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block uppercase tracking-wider">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    type="text" 
                    placeholder="Search by name..." 
                    className="pl-9"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block uppercase tracking-wider">Gem Type</label>
                <select 
                  className="w-full h-10 rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  value={gemTypeFilter}
                  onChange={e => setGemTypeFilter(e.target.value)}
                >
                  <option value="">All Types</option>
                  {uniqueGemTypes.map(t => typeof t === 'string' && <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block uppercase tracking-wider">Shape</label>
                <select 
                  className="w-full h-10 rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  value={shapeFilter}
                  onChange={e => setShapeFilter(e.target.value)}
                >
                  <option value="">All Shapes</option>
                  {uniqueShapes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block uppercase tracking-wider">Origin</label>
                <select 
                  className="w-full h-10 rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  value={originFilter}
                  onChange={e => setOriginFilter(e.target.value)}
                >
                  <option value="">All Origins</option>
                  {uniqueOrigins.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block uppercase tracking-wider">Treatment</label>
                <select 
                  className="w-full h-10 rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  value={treatmentFilter}
                  onChange={e => setTreatmentFilter(e.target.value)}
                >
                  <option value="">All Treatments</option>
                  {uniqueTreatments.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="pt-2">
                <label className="text-xs font-medium text-slate-500 mb-1.5 block uppercase tracking-wider">Price Range</label>
                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                  <span className="text-slate-400">-</span>
                  <Input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button 
                  variant="outline" 
                  className="w-full text-xs" 
                  onClick={() => {
                    setSearch(''); setShapeFilter(''); setOriginFilter('');
                    setTreatmentFilter(''); setMinPrice(''); setMaxPrice('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Gallery */}
        <section className="flex-1 space-y-6">
          <div className="flex justify-end">
            <div className="flex items-center gap-3">
               <label className="text-sm font-medium text-slate-500">Sort by:</label>
               <select 
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
               </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-500">Loading collection...</div>
          ) : filteredAndSortedGems.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
              <Diamond className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p>No gems match your current filters.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayedGems.map(gem => (
                  <Link to={`/gem/${gem.id}`} key={gem.id} className="bg-white group rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden flex flex-col justify-center items-center text-slate-400">
                    {(() => {
                      const firstMedia = gem.imageUrl || (gem.images && gem.images.length > 0 ? gem.images[0] : null);
                      
                      if (firstMedia) {
                        const isVideo = firstMedia.startsWith('data:video') || firstMedia.match(/\.(mp4|webm|ogg)$/i);
                        if (isVideo) {
                          return (
                            <div className="w-full h-full bg-black relative">
                              <video src={firstMedia} className="object-cover w-full h-full opacity-60" muted playsInline />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white pl-1 border border-white/40">▶</div>
                              </div>
                            </div>
                          );
                        }
                        return <img src={firstMedia} alt={gem.name} className="object-cover w-full h-full" referrerPolicy="no-referrer" />;
                      } else if (gem.videoUrl) {
                        return (
                          <div className="w-full h-full bg-black relative">
                            <video src={gem.videoUrl} className="object-cover w-full h-full opacity-60" muted playsInline />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white pl-1 border border-white/40">▶</div>
                            </div>
                          </div>
                        );
                      }
                      return <Diamond className="w-12 h-12 opacity-20" />;
                    })()}
                    {gem.status === 'sold' && (
                      <span className="absolute top-2 left-2 px-2 py-1 text-white text-[10px] font-bold uppercase tracking-wider rounded" style={{ backgroundColor: settings.soldBadgeColor || '#0f172a' }}>Sold</span>
                    )}
                    {gem.status === 'on_sale' && (
                      <span className="absolute top-2 left-2 px-2 py-1 text-white text-[10px] font-bold uppercase tracking-wider rounded" style={{ backgroundColor: settings.saleBadgeColor || '#dc2626' }}>On Sale</span>
                    )}
                    <div className="absolute inset-0 ring-1 ring-inset ring-black/10"></div>
                  </div>
                  <div className="p-4">
                    <div className="mb-3">
                      <h3 className="font-semibold text-slate-900 truncate block w-full mb-1" title={gem.name}>{gem.name}</h3>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          {gem.status === 'on_sale' && gem.salePercentage ? (
                            <>
                              <span className="text-xs text-slate-400 line-through">${(gem.price || 0).toLocaleString()}</span>
                              <span className="font-bold text-slate-800">${(gem.price * (1 - gem.salePercentage / 100)).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                            </>
                          ) : (
                            <span className="font-bold text-slate-800">${(gem.price || 0).toLocaleString()}</span>
                          )}
                        </div>
                        {gem.gemType && <p className="text-xs text-indigo-600 font-medium px-2 py-0.5 bg-indigo-50 rounded shrink-0">{gem.gemType}</p>}
                      </div>
                    </div>
                    
                    <dl className="mt-4 grid grid-cols-2 gap-x-2 gap-y-3 text-xs">
                      <div>
                        <dt className="text-slate-500 uppercase tracking-wider" style={{ fontSize: '10px' }}>Weight</dt>
                        <dd className="font-medium text-slate-900 truncate" title={`${gem.weight} ct`}>{gem.weight} ct</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 uppercase tracking-wider" style={{ fontSize: '10px' }}>Shape</dt>
                        <dd className="font-medium text-slate-900 truncate" title={gem.shape}>{gem.shape}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 uppercase tracking-wider" style={{ fontSize: '10px' }}>Origin</dt>
                        <dd className="font-medium text-slate-900 truncate" title={gem.origin}>{gem.origin}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 uppercase tracking-wider" style={{ fontSize: '10px' }}>Treatment</dt>
                        <dd className="font-medium text-slate-900 truncate" title={gem.treatment}>{gem.treatment}</dd>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-100">
                        <dt className="text-slate-500 uppercase tracking-wider inline mr-2" style={{ fontSize: '10px' }}>Dimensions</dt>
                        <dd className="font-medium text-slate-900 inline">{gem.dimensions}</dd>
                      </div>
                    </dl>
                  </div>
                </Link>
              ))}
              </div>
              {displayCount < filteredAndSortedGems.length && (
                <div className="flex justify-center pt-8">
                  <Button variant="outline" onClick={() => setDisplayCount(prev => prev + 4)}>
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

      </main>

      <footer className="border-t border-slate-200 mt-auto shrink-0 py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: settings.footerBackgroundColor || '#ffffff' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-12 justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 text-slate-900 mb-4 text-lg font-semibold tracking-tight">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Store Logo" className="h-6 object-contain" />
              ) : (
                <Diamond className="h-5 w-5" />
              )}
              {settings.name}
            </div>
            {settings.aboutText && <p className="text-slate-500 text-sm whitespace-pre-wrap">{settings.aboutText}</p>}
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900">Contact Us</h4>
            {settings.contactEmail && (
              <a href={`mailto:${settings.contactEmail}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600">
                <Mail className="h-4 w-4" /> {settings.contactEmail}
              </a>
            )}
            {settings.contactPhone && (
              <a href={`tel:${settings.contactPhone}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600">
                <Phone className="h-4 w-4" /> {settings.contactPhone}
              </a>
            )}
            {settings.contactAddress && (
              <span className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4" /> {settings.contactAddress}
              </span>
            )}
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-slate-100 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>{settings.footerText}</p>
        </div>
      </footer>
    </div>
  );
}