import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db, handleFirestoreError } from '../lib/firebase';
import { OperationType, Gem, StoreSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Diamond, LogOut, Plus, Edit2, Trash2, X, Upload, Settings as SettingsIcon } from 'lucide-react';
import { compressImage } from '../lib/image';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

const importableFields = [
  { key: 'name', label: 'Name', required: true },
  { key: 'gemType', label: 'Gem Type', required: true },
  { key: 'origin', label: 'Origin', required: true },
  { key: 'price', label: 'Price ($)', required: true },
  { key: 'shape', label: 'Shape' },
  { key: 'weight', label: 'Weight (ct)' },
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'treatment', label: 'Treatment' },
  { key: 'buyingPrice', label: 'Buying Price ($)' },
  { key: 'salePercentage', label: 'Sale Percentage (%)' },
  { key: 'status', label: 'Status' },
  { key: 'basicColour', label: 'Basic Colour' },
  { key: 'tradeColor', label: 'Trade Color' },
  { key: 'cutGrade', label: 'Cut Grade' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'imageUrl', label: 'Image URL' },
  { key: 'videoUrl', label: 'Video URL' },
];

export function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'inventory' | 'settings' | 'advanced' | 'inquiries' | 'email'>('inventory');
  
  const [gems, setGems] = useState<Gem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGem, setEditingGem] = useState<Gem | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    gemType: '',
    origin: '',
    shape: '',
    dimensions: '',
    weight: '',
    treatment: '',
    price: '',
    buyingPrice: '',
    salePercentage: '',
    status: 'available',
    basicColour: '',
    tradeColor: '',
    cutGrade: '' as 'Very good' | 'Good' | 'Ok' | '',
    supplier: '',
    imageUrl: '',
    videoUrl: '',
    images: [] as string[]
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [draggedImageIdx, setDraggedImageIdx] = useState<number | null>(null);

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStage, setImportStage] = useState('');
  const [csvImportData, setCsvImportData] = useState<{headers: string[], rows: string[][] | null} | null>(null);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const inventoryImportRef = React.useRef<HTMLInputElement>(null);
  const settingsImportRef = React.useRef<HTMLInputElement>(null);

  // Settings State
  const [settings, setSettings] = useState<StoreSettings>({
    name: 'Sadew Gems',
    logoUrl: '',
    heroHeadline: 'Exclusive Gem Collection',
    heroSubheadline: 'Discover the world\'s finest untreated gemstones, sourced ethically.',
    contactEmail: '',
    inquiryEmail: '',
    contactPhone: '',
    contactAddress: '',
    footerText: '© 2024 Sadew Gems. All rights reserved.',
    footerBackgroundColor: '#ffffff',
    aboutText: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [inquiries, setInquiries] = useState<any[]>([]);

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

    // Fetch Gems
    const q = query(collection(db, 'gems'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const fetched: Gem[] = [];
        snapshot.forEach(doc => {
          fetched.push({ id: doc.id, ...doc.data() } as Gem);
        });
        setGems(fetched.sort((a, b) => b.createdAt - a.createdAt));
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'gems');
        setLoading(false);
      }
    );
    
    // Fetch Inquiries
    const iq = query(collection(db, 'inquiries'));
    const unsubIq = onSnapshot(
      iq,
      (snapshot) => {
        const fetched: any[] = [];
        snapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() }));
        setInquiries(fetched.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      },
      (error) => console.error("Error fetching inquiries", error)
    );
    
    return () => {
      unsub();
      unsubIq();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const ownerId = user?.uid || 'demo-admin-user';
    
    const gemData: any = {
      name: formData.name,
      gemType: formData.gemType,
      origin: formData.origin,
      shape: formData.shape,
      dimensions: formData.dimensions,
      weight: Number(String(formData.weight).replace(/,/g, '')),
      treatment: formData.treatment,
      price: Number(String(formData.price).replace(/,/g, '')),
      buyingPrice: formData.buyingPrice ? Number(String(formData.buyingPrice).replace(/,/g, '')) : null,
      salePercentage: formData.status === 'on_sale' && formData.salePercentage ? Number(String(formData.salePercentage).replace(/,/g, '')) : null,
      status: formData.status || 'available',
      basicColour: formData.basicColour,
      tradeColor: formData.tradeColor,
      cutGrade: formData.cutGrade,
      supplier: formData.supplier,
      imageUrl: formData.imageUrl || '',
      videoUrl: formData.videoUrl || '',
      images: formData.images,
      updatedAt: Date.now()
    };

    try {
      if (editingGem) {
        await updateDoc(doc(db, 'gems', editingGem.id), {
          ...gemData,
          ownerId: editingGem.ownerId, // keep same owner
          createdAt: editingGem.createdAt
        });
      } else {
        await addDoc(collection(db, 'gems'), {
          ...gemData,
          ownerId: ownerId,
          createdAt: Date.now()
        });
      }
      setIsFormOpen(false);
      setEditingGem(null);
      setFormData({ name: '', gemType: '', origin: '', shape: '', dimensions: '', weight: '', treatment: '', price: '', buyingPrice: '', salePercentage: '', status: 'available', basicColour: '', tradeColor: '', cutGrade: '', supplier: '', imageUrl: '', videoUrl: '', images: [] });
    } catch (error) {
      if (editingGem) {
        handleFirestoreError(error, OperationType.UPDATE, `gems/${editingGem.id}`);
      } else {
        handleFirestoreError(error, OperationType.CREATE, 'gems');
      }
    }
  };

  const startEdit = (gem: Gem) => {
    setEditingGem(gem);
    setFormData({
      name: gem.name,
      gemType: gem.gemType || '',
      origin: gem.origin,
      shape: gem.shape,
      dimensions: gem.dimensions,
      weight: String(gem.weight),
      treatment: gem.treatment,
      price: String(gem.price),
      buyingPrice: gem.buyingPrice ? String(gem.buyingPrice) : '',
      salePercentage: gem.salePercentage ? String(gem.salePercentage) : '',
      status: gem.status || 'available',
      basicColour: gem.basicColour || '',
      tradeColor: gem.tradeColor || '',
      cutGrade: gem.cutGrade || '',
      supplier: gem.supplier || '',
      imageUrl: gem.imageUrl || '',
      videoUrl: gem.videoUrl || '',
      images: gem.images || []
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'gems', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `gems/${id}`);
    }
  };

  const parseCSVRow = (text: string) => {
    let result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      if (inQuotes) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += text[i];
        }
      } else {
        if (text[i] === '"') {
          inQuotes = true;
        } else if (text[i] === ',') {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += text[i];
        }
      }
    }
    result.push(cur.trim());
    return result;
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
      if (rows.length < 2) {
        alert("The CSV file doesn't seem to contain data.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      
      const headers = parseCSVRow(rows[0]).map(h => h.trim());
      const dataRows = rows.slice(1).map(r => parseCSVRow(r));
      
      const newMapping: Record<string, string> = {};
      const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
      
      importableFields.forEach(f => {
        const fieldNorm = f.key.toLowerCase();
        let matchIdx = normalizedHeaders.findIndex(nh => nh === fieldNorm);
        if (matchIdx === -1 && f.key === 'gemType') matchIdx = normalizedHeaders.findIndex(nh => nh === 'type' || nh.includes('type'));
        if (matchIdx === -1) matchIdx = normalizedHeaders.findIndex(nh => nh.includes(fieldNorm));
        
        if (matchIdx !== -1) {
          newMapping[f.key] = String(matchIdx);
        }
      });

      setCsvMapping(newMapping);
      setCsvImportData({ headers, rows: dataRows });
    } catch (err) {
      console.error(err);
      alert("Error reading CSV.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const executeCSVImport = async () => {
    if (!csvImportData) return;
    const ownerId = user?.uid || 'demo-admin-user';

    // Validate required fields mapping
    const missingReq = importableFields.filter(f => f.required && csvMapping[f.key] === undefined);
    if (missingReq.length > 0) {
      alert(`Missing mapping for required fields: ${missingReq.map(f => f.label).join(', ')}`);
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportStage('Starting import...');
    
    try {
      const numRows = csvImportData.rows.length;
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < numRows; i++) {
        const values = csvImportData.rows[i];
        
        // Build gemData based on mapping
        const item: any = {};
        importableFields.forEach(f => {
          const mappedIdxStr = csvMapping[f.key];
          if (mappedIdxStr !== undefined && mappedIdxStr !== '') {
            const idx = parseInt(mappedIdxStr, 10);
            if (!isNaN(idx) && idx >= 0 && idx < values.length) {
              item[f.key] = values[idx];
            }
          }
        });

        if (!item.name || !item.name.trim()) {
          errorCount++;
          continue; // Skip without name
        }

        const price = item.price ? parseFloat(String(item.price).replace(/,/g, '')) : 0;
        
        // Let React update the UI by pushing addDoc to next tick slightly or yielding
        if (i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10)); // Yield to allow progress bar to repaint
        }

        const gemNameStr = item.name.trim();

        const updateData: any = {
          name: gemNameStr,
          gemType: item.gemType?.trim() || '',
          origin: item.origin?.trim() || '',
          shape: item.shape?.trim() || '',
          dimensions: item.dimensions?.trim() || '',
          weight: item.weight ? parseFloat(String(item.weight).replace(/,/g, '')) : 0,
          treatment: item.treatment?.trim() || '',
          price: isNaN(price) ? 0 : price,
          buyingPrice: item.buyingPrice ? parseFloat(String(item.buyingPrice).replace(/,/g, '')) : null,
          salePercentage: item.salePercentage ? parseFloat(String(item.salePercentage).replace(/,/g, '')) : null,
          status: item.status && ['available', 'on_sale', 'sold'].includes(item.status.toLowerCase().trim()) ? item.status.toLowerCase().trim() : 'available',
          basicColour: item.basicColour?.trim() || '',
          tradeColor: item.tradeColor?.trim() || '',
          cutGrade: item.cutGrade?.trim() || '',
          supplier: item.supplier?.trim() || '',
          updatedAt: Date.now()
        };

        if (item.imageUrl?.trim()) updateData.imageUrl = item.imageUrl.trim();
        if (item.videoUrl?.trim()) updateData.videoUrl = item.videoUrl.trim();

        const existingGem = gems.find(g => g.name.toLowerCase() === gemNameStr.toLowerCase());

        if (existingGem) {
          await setDoc(doc(db, 'gems', existingGem.id), updateData, { merge: true });
        } else {
          updateData.images = [];
          updateData.ownerId = ownerId;
          updateData.createdAt = Date.now();
          if (!updateData.imageUrl) updateData.imageUrl = '';
          if (!updateData.videoUrl) updateData.videoUrl = '';
          await addDoc(collection(db, 'gems'), updateData);
        }
        
        successCount++;
        setImportProgress(Math.round(((i + 1) / numRows) * 100));
        setImportStage(`Importing ${i + 1} of ${numRows}`);
      }
      
      setTimeout(() => {
        alert(`Import completed! Successfully imported ${successCount} items. ${errorCount > 0 ? `Skipped ${errorCount} invalid rows.` : ''}`);
        setCsvImportData(null);
        setImporting(false);
      }, 100);
    } catch (err) {
      console.error('Import error:', err);
      alert("Error importing data.");
      setImporting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    
    const slotsAvailable = 10 - formData.images.length;
    const filesToProces = files.slice(0, slotsAvailable);
    if (filesToProces.length === 0) return;

    setUploadingImages(true);
    try {
      const newImages = (await Promise.all(
        filesToProces.map(async file => {
          if (file.type.startsWith('video/')) {
            if (file.size > 800 * 1024) {
              alert(`Video ${file.name} is too large. Max size is 800KB for local uploads. Please use the Video URL field instead for larger videos.`);
              return null;
            }
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          }
          return compressImage(file, 0.15, 800);
        })
      )).filter(Boolean) as string[];
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages]
      }));
    } catch (err) {
      console.error('Error processing media', err);
      alert('Failed to process one or more files.');
    }
    setUploadingImages(false);
    e.target.value = '';
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'storefront'), {
        ...settings,
        updatedAt: Date.now()
      });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings', error);
      alert('Failed to save settings.');
    }
    setSavingSettings(false);
  };

  const handleSettingLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      const compressed = await compressImage(e.target.files[0], 0.1, 400);
      setSettings(prev => ({...prev, logoUrl: compressed}));
    } catch (err) {
      console.error('Error compressing logo', err);
    }
    e.target.value = '';
  };

  const handleSettingLoginPageLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      const compressed = await compressImage(e.target.files[0], 0.1, 400);
      setSettings(prev => ({...prev, loginPageLogoUrl: compressed}));
    } catch (err) {
      console.error('Error compressing login page logo', err);
    }
    e.target.value = '';
  };

  const handleSettingHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      const newUrls = [...(settings.heroImageUrls || [])];
      for (const file of e.target.files) {
        if (newUrls.length >= 5) break;
        const compressed = await compressImage(file, 0.3, 1600);
        newUrls.push(compressed);
      }
      setSettings(prev => ({...prev, heroImageUrls: newUrls}));
    } catch (err) {
      console.error('Error compressing hero image', err);
    }
    e.target.value = '';
  };

  const handleExportInventory = () => {
    if (gems.length === 0) {
      alert("No gems to export.");
      return;
    }

    const headers = ['id', 'name', 'gemType', 'origin', 'shape', 'dimensions', 'weight', 'treatment', 'price', 'buyingPrice', 'salePercentage', 'status', 'imageUrl', 'videoUrl', 'createdAt'];
    
    const csvContent = [
      headers.join(','),
      ...gems.map(gem => {
        return headers.map(header => {
          let value = (gem as any)[header];
          if (value === null || value === undefined) value = '';
          if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSettings = () => {
    const jsonContent = JSON.stringify(settings, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `store_settings_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreInventory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ownerId = user?.uid || 'demo-admin-user';
    
    setImporting(true);
    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
      if (rows.length < 2) {
         alert("The CSV file doesn't seem to contain data.");
         return;
      }
      
      const headers = parseCSVRow(rows[0]);
      const idIdx = headers.indexOf('id');
      if (idIdx === -1) {
        alert("The CSV file must contain 'id' column for restoration.");
        return;
      }

      const dataRows = rows.slice(1);
      
      for (let k = 0; k < dataRows.length; k++) {
        const rowText = dataRows[k];
        const values = parseCSVRow(rowText);
        const item: any = {};
        for (let i = 0; i < headers.length; i++) {
          item[headers[i]] = values[i] || '';
        }
        
        if (!item.id || !item.name) continue;
        
        const price = item.price ? parseFloat(String(item.price).replace(/,/g, '')) : 0;
        const docId = item.id;
        
        const updateData: any = {
          name: item.name,
          gemType: item.gemType || '',
          origin: item.origin || '',
          shape: item.shape || '',
          dimensions: item.dimensions || '',
          weight: item.weight ? parseFloat(String(item.weight).replace(/,/g, '')) : 0,
          treatment: item.treatment || '',
          price: isNaN(price) ? 0 : price,
          buyingPrice: item.buyingPrice ? parseFloat(String(item.buyingPrice).replace(/,/g, '')) : null,
          salePercentage: item.salePercentage ? parseFloat(String(item.salePercentage).replace(/,/g, '')) : null,
          status: item.status || 'available',
          imageUrl: item.imageUrl || '',
          videoUrl: item.videoUrl || '',
          updatedAt: Date.now()
        };
        
        // Only set ownerId and createdAt if they are provided, typically export has them
        if (item.createdAt) updateData.createdAt = parseInt(item.createdAt) || Date.now();
        updateData.ownerId = ownerId;

        await setDoc(doc(db, 'gems', docId), updateData, { merge: true });
        
        setImportProgress(Math.round(((k + 1) / dataRows.length) * 100));
        setImportStage(`Restoring ${k + 1} of ${dataRows.length}`);
      }
      alert("Inventory restoration completed! Refresh the page to see changes.");
    } catch(err) {
      console.error(err);
      alert("Error restoring inventory.");
    } finally {
      if (inventoryImportRef.current) inventoryImportRef.current.value = '';
      setImporting(false);
    }
  };

  const handleRestoreSettings = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text);
      if (typeof importedSettings === 'object' && importedSettings !== null) {
        await setDoc(doc(db, 'settings', 'global'), importedSettings, { merge: true });
        setSettings(importedSettings as StoreSettings);
        alert("Settings restored successfully!");
      }
    } catch (err) {
      console.error(err);
      alert("Error restoring settings. File may not be a valid JSON.");
    } finally {
      if (settingsImportRef.current) settingsImportRef.current.value = '';
    }
  };

  return (
    <>
      {csvImportData && !importing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Map CSV Columns</h3>
            <p className="text-sm text-slate-500 mb-6">Select which column from your CSV corresponds to each property.</p>
            
            <div className="flex-1 overflow-y-auto min-h-0 border border-slate-200 rounded-md p-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {importableFields.map(field => (
                  <div key={field.key} className="flex flex-col">
                    <label className="text-sm font-medium text-slate-700 mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      className="h-9 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      value={csvMapping[field.key] || ""}
                      onChange={(e) => setCsvMapping(prev => ({...prev, [field.key]: e.target.value}))}
                    >
                      <option value="">-- Ignore --</option>
                      {csvImportData.headers.map((header, idx) => (
                        <option key={idx} value={String(idx)}>{header}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
              <Button variant="outline" onClick={() => {
                setCsvImportData(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}>Cancel</Button>
              <Button onClick={executeCSVImport}>Start Import</Button>
            </div>
          </div>
        </div>
      )}
      {importing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Importing Data</h3>
            <p className="text-sm text-slate-500 mb-4">{importStage || 'Please wait...'}</p>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${importProgress}%` }}
              ></div>
            </div>
            <div className="mt-2 text-right text-xs text-slate-500 font-medium">
              {importProgress}%
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Diamond className="h-6 w-6 text-slate-900" />
            <h1 className="text-lg font-semibold tracking-tight">Supplier Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="sm" className="hidden sm:flex">View Storefront</Button>
            </Link>
            <Button variant="ghost" onClick={async () => {
              if (user) await signOut();
              localStorage.removeItem('storeUnlocked');
              localStorage.removeItem('adminUnlocked');
              window.location.href = '/admin/login';
            }} size="sm" className="gap-2 text-slate-500">
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6 border-t border-slate-100">
          <button 
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'inventory' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900 border-b-2 hover:border-slate-300'}`}
            onClick={() => setActiveTab('inventory')}
          >
            Inventory
          </button>
          <button 
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon className="h-4 w-4" />
            Store Appearance
          </button>
          <button 
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'inquiries' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'}`}
            onClick={() => setActiveTab('inquiries')}
          >
            Inquiries
          </button>
          <button 
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'email' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'}`}
            onClick={() => setActiveTab('email')}
          >
            Email Settings
          </button>
          <button 
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'advanced' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'}`}
            onClick={() => setActiveTab('advanced')}
          >
            Advanced Settings
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8 flex-col lg:flex-row">
        
        {/* Main Content */}
        <section className="flex-1">
          {activeTab === 'inventory' ? (
            <>
              <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Inventory Management</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleCSVUpload}
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="gap-2"
                  disabled={importing}
                >
                  <Upload className="h-4 w-4" />
                  {importing ? 'Importing...' : 'Bulk Import CSV'}
                </Button>
              </div>
              <Button onClick={() => {
                setEditingGem(null);
                setFormData({ name: '', gemType: '', origin: '', shape: '', dimensions: '', weight: '', treatment: '', price: '', buyingPrice: '', salePercentage: '', status: 'available', imageUrl: '', videoUrl: '', images: [] });
                setIsFormOpen(true);
              }} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Gem
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Gem</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Specs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {gems.map(gem => (
                  <tr key={gem.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 shrink-0 bg-slate-100 rounded flex items-center justify-center overflow-hidden border border-slate-200">
                          {(() => {
                            const firstMedia = gem.imageUrl || (gem.images && gem.images.length > 0 ? gem.images[0] : null);
                            if (firstMedia) {
                              const isVideo = firstMedia.startsWith('data:video') || firstMedia.match(/\.(mp4|webm|ogg)$/i);
                              return isVideo ? <div className="h-full w-full bg-black flex items-center justify-center text-white text-[10px]">▶</div> : <img src={firstMedia} className="h-full w-full object-cover" referrerPolicy="no-referrer" />;
                            } else if (gem.videoUrl) {
                              return <div className="h-full w-full bg-black flex items-center justify-center text-white text-[10px]">▶</div>;
                            }
                            return <Diamond className="h-5 w-5 text-slate-400" />;
                          })()}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-slate-900">{gem.name}</div>
                            {gem.status === 'sold' ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] text-white font-medium uppercase tracking-wider" style={{ backgroundColor: settings.soldBadgeColor || '#0f172a' }}>Sold</span>
                            ) : gem.status === 'on_sale' ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] text-white font-medium uppercase tracking-wider" style={{ backgroundColor: settings.saleBadgeColor || '#dc2626' }}>Sale</span>
                            ) : null}
                          </div>
                          <div className="text-xs text-indigo-600 font-medium">{gem.gemType}</div>
                          <div className="text-sm text-slate-500">{gem.origin}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div>{gem.weight} ct • {gem.shape}</div>
                      <div className="text-xs mt-0.5">{gem.dimensions}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {gem.supplier || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      <div>${(gem.price || 0).toLocaleString()}</div>
                      {gem.buyingPrice && (
                        <div className="text-xs text-slate-500 font-normal">Buy: ${(gem.buyingPrice || 0).toLocaleString()}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => startEdit(gem)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(gem.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {gems.length === 0 && !loading && (
              <div className="text-center py-12 text-slate-500">
                No gems in your inventory yet.
              </div>
            )}
          </div>
            </>
          ) : activeTab === 'settings' ? (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 lg:max-w-2xl">
              <h2 className="text-xl font-semibold mb-6">Store Appearance</h2>
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Store Name</label>
                  <Input required value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} placeholder="e.g. Sadew Gems" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Store Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-slate-100 rounded border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-contain" /> : <Diamond className="h-6 w-6 text-slate-400" />}
                    </div>
                    <div className="relative">
                      <input type="file" accept="image/*" onChange={handleSettingLogoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <Button type="button" variant="outline" className="pointer-events-none gap-2">
                        <Upload className="h-4 w-4" /> Upload Logo
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-base font-medium text-slate-900 mb-4">Hero Section</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Hero Images (Up to 5)</label>
                      <div className="space-y-2">
                        {settings.heroImageUrls && settings.heroImageUrls.length > 0 && (
                          <div className="grid grid-cols-2 gap-4">
                            {settings.heroImageUrls.map((url, idx) => (
                              <div key={idx} className="aspect-[21/9] w-full bg-slate-100 rounded border border-slate-200 overflow-hidden relative">
                                <img src={url} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => setSettings({...settings, heroImageUrls: settings.heroImageUrls?.filter((_, i) => i !== idx)})} className="absolute top-2 right-2 bg-white/90 p-1 rounded hover:bg-white text-slate-700">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {(settings.heroImageUrls || []).length < 5 && (
                          <div className="relative inline-block w-full">
                            <input type="file" multiple accept="image/*" onChange={handleSettingHeroUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <Button type="button" variant="outline" className="w-full pointer-events-none gap-2">
                              <Upload className="h-4 w-4" /> Upload Hero Image(s)
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Hero Headline</label>
                      <Input value={settings.heroHeadline || ''} onChange={e => setSettings({...settings, heroHeadline: e.target.value})} placeholder="e.g. Exclusive Gem Collection" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Hero Sub-headline</label>
                      <Input value={settings.heroSubheadline || ''} onChange={e => setSettings({...settings, heroSubheadline: e.target.value})} placeholder="e.g. Discover the world's finest untreated gemstones..." />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-base font-medium text-slate-900 mb-4">Login Page Appearance</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Login Page Name</label>
                      <Input value={settings.loginPageName || ''} onChange={e => setSettings({...settings, loginPageName: e.target.value})} placeholder="e.g. Client Portal" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Login Page Logo</label>
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-slate-100 rounded border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                          {settings.loginPageLogoUrl ? <img src={settings.loginPageLogoUrl} className="w-full h-full object-contain" /> : <Diamond className="h-6 w-6 text-slate-400" />}
                        </div>
                        <div className="relative">
                          <input type="file" accept="image/*" onChange={handleSettingLoginPageLogoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                          <Button type="button" variant="outline" className="pointer-events-none gap-2">
                            <Upload className="h-4 w-4" /> Upload Login Logo
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-base font-medium text-slate-900 mb-4">Branding</h3>
                  <div className="space-y-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Primary Color (Hex)</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={settings.primaryColor || '#4f46e5'} onChange={e => setSettings({...settings, primaryColor: e.target.value})} className="h-10 w-10 border-0 p-0 rounded overflow-hidden cursor-pointer" />
                        <Input value={settings.primaryColor || '#4f46e5'} onChange={e => setSettings({...settings, primaryColor: e.target.value})} placeholder="#4f46e5" className="flex-1" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Font Family</label>
                      <select 
                        value={settings.fontFamily || 'Inter, sans-serif'} 
                        onChange={e => setSettings({...settings, fontFamily: e.target.value})}
                        className="w-full h-10 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                      >
                        <option value="Inter, sans-serif">Inter</option>
                        <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
                        <option value="'Playfair Display', serif">Playfair Display</option>
                        <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Sale Badge Color (Hex)</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={settings.saleBadgeColor || '#dc2626'} onChange={e => setSettings({...settings, saleBadgeColor: e.target.value})} className="h-10 w-10 border-0 p-0 rounded overflow-hidden cursor-pointer" />
                        <Input value={settings.saleBadgeColor || '#dc2626'} onChange={e => setSettings({...settings, saleBadgeColor: e.target.value})} placeholder="#dc2626" className="flex-1" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Sold Badge Color (Hex)</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={settings.soldBadgeColor || '#0f172a'} onChange={e => setSettings({...settings, soldBadgeColor: e.target.value})} className="h-10 w-10 border-0 p-0 rounded overflow-hidden cursor-pointer" />
                        <Input value={settings.soldBadgeColor || '#0f172a'} onChange={e => setSettings({...settings, soldBadgeColor: e.target.value})} placeholder="#0f172a" className="flex-1" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-base font-medium text-slate-900 mb-4">About Section</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">About Text</label>
                      <textarea 
                        className="w-full min-h-[100px] border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent" 
                        value={settings.aboutText || ''} 
                        onChange={e => setSettings({...settings, aboutText: e.target.value})} 
                        placeholder="e.g. Founded in 1990, Sadew Gems has been sourcing..." 
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-base font-medium text-slate-900 mb-4">Contact & Footer</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <Input type="email" value={settings.contactEmail || ''} onChange={e => setSettings({...settings, contactEmail: e.target.value})} placeholder="hello@sadewgems.com" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <Input type="tel" value={settings.contactPhone || ''} onChange={e => setSettings({...settings, contactPhone: e.target.value})} placeholder="+1 234 567 890" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Address / Location</label>
                      <Input value={settings.contactAddress || ''} onChange={e => setSettings({...settings, contactAddress: e.target.value})} placeholder="e.g. 5th Avenue, NY" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Footer Copyright Text</label>
                      <Input value={settings.footerText || ''} onChange={e => setSettings({...settings, footerText: e.target.value})} placeholder="© 2024 Sadew Gems. All rights reserved." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Footer Background Color (Hex)</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={settings.footerBackgroundColor || '#ffffff'} onChange={e => setSettings({...settings, footerBackgroundColor: e.target.value})} className="h-10 w-10 border-0 p-0 rounded overflow-hidden cursor-pointer" />
                        <Input value={settings.footerBackgroundColor || '#ffffff'} onChange={e => setSettings({...settings, footerBackgroundColor: e.target.value})} placeholder="#ffffff" className="flex-1" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <Button type="submit" disabled={savingSettings} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white">
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </form>
            </div>
          ) : activeTab === 'inquiries' ? (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 lg:max-w-4xl">
              <h2 className="text-xl font-semibold mb-6">Customer Inquiries</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Item / Offer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Message</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {inquiries.map((iq) => (
                      <tr key={iq.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {new Date(iq.createdAt || Date.now()).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">{iq.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {iq.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          <div>{iq.itemName}</div>
                          {iq.offeringPrice && <div className="text-xs text-indigo-600 font-medium">Offered: ${iq.offeringPrice}</div>}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 max-w-sm">
                          <div className="truncate" title={iq.message}>{iq.message || '-'}</div>
                        </td>
                      </tr>
                    ))}
                    {inquiries.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                          No inquiries found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'email' ? (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 lg:max-w-2xl">
              <h2 className="text-xl font-semibold mb-6">Email API Settings</h2>
              
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Email Method</label>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="radio" 
                        name="emailMethod"
                        value="user_client"
                        checked={settings.emailMethod !== 'self_hosted'}
                        onChange={() => setSettings({...settings, emailMethod: 'user_client'})}
                        className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <div>
                        <span className="block text-sm font-medium text-slate-900">User's Default Email Client (mailto)</span>
                        <span className="block text-sm text-slate-500">Opens the customer's email app (e.g. Outlook, Mail, Gmail) to compose the message. No setup required.</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="radio" 
                        name="emailMethod"
                        value="self_hosted"
                        checked={settings.emailMethod === 'self_hosted'}
                        onChange={() => setSettings({...settings, emailMethod: 'self_hosted'})}
                        className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <div>
                        <span className="block text-sm font-medium text-slate-900">Self-hosted SMTP API</span>
                        <span className="block text-sm text-slate-500">Send customer inquiries directly through your own SMTP server.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {settings.emailMethod === 'self_hosted' && (
                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-sm font-medium text-slate-900 mb-4">SMTP Configuration</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host</label>
                        <Input value={settings.smtpHost || ''} onChange={e => setSettings({...settings, smtpHost: e.target.value})} placeholder="e.g. smtp.gmail.com" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Port</label>
                        <Input value={settings.smtpPort || ''} onChange={e => setSettings({...settings, smtpPort: e.target.value})} placeholder="e.g. 465 or 587" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">SMTP User / Email</label>
                        <Input type="email" value={settings.smtpUser || ''} onChange={e => setSettings({...settings, smtpUser: e.target.value})} placeholder="you@domain.com" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Password</label>
                        <Input type="password" value={settings.smtpPassword || ''} onChange={e => setSettings({...settings, smtpPassword: e.target.value})} placeholder="App password or standard password" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">From Email (Optional)</label>
                        <Input type="email" value={settings.smtpFrom || ''} onChange={e => setSettings({...settings, smtpFrom: e.target.value})} placeholder="noreply@domain.com" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-6">
                  <Button type="submit" disabled={savingSettings} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white">
                    {savingSettings ? 'Saving...' : 'Save Email Settings'}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 lg:max-w-2xl">
              <h2 className="text-xl font-semibold mb-6">Advanced Settings</h2>
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div>
                  <h3 className="text-base font-medium text-slate-900 mb-4">Contact Forms</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Inquiry Form Email</label>
                      <Input type="email" value={settings.inquiryEmail || ''} onChange={e => setSettings({...settings, inquiryEmail: e.target.value})} placeholder="inquiries@sadewgems.com" />
                      <p className="text-xs text-slate-500 mt-1">This email address will receive inquiries from the customer contact form.</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-base font-medium text-slate-900 mb-4">Access Control</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Store Access Password</label>
                      <Input type="text" value={settings.storePassword || ''} onChange={e => setSettings({...settings, storePassword: e.target.value})} placeholder="e.g. 123" />
                      <p className="text-xs text-slate-500 mt-1">Password required for clients to enter the store.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Admin Access Password</label>
                      <Input type="text" value={settings.adminPassword || ''} onChange={e => setSettings({...settings, adminPassword: e.target.value})} placeholder="e.g. P123" />
                      <p className="text-xs text-slate-500 mt-1">Password required to enter the admin dashboard. Default is P123.</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-base font-medium text-slate-900 mb-4">Data Management</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-700 mb-3">Backup or restore your current store inventory or settings.</p>
                      <div className="flex flex-wrap gap-4">
                        <Button type="button" variant="outline" onClick={handleExportInventory}>
                          Export Inventory (CSV)
                        </Button>
                        <Button type="button" variant="outline" onClick={handleExportSettings}>
                          Export Settings (JSON)
                        </Button>
                        
                        <input 
                          type="file" 
                          accept=".csv" 
                          className="hidden" 
                          ref={inventoryImportRef} 
                          onChange={handleRestoreInventory}
                        />
                        <Button type="button" variant="outline" onClick={() => inventoryImportRef.current?.click()} disabled={importing}>
                          {importing ? 'Importing...' : 'Restore Inventory (CSV)'}
                        </Button>

                        <input 
                          type="file" 
                          accept=".json" 
                          className="hidden" 
                          ref={settingsImportRef} 
                          onChange={handleRestoreSettings}
                        />
                        <Button type="button" variant="outline" onClick={() => settingsImportRef.current?.click()}>
                          Restore Settings (JSON)
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-6">
                  <Button type="submit" disabled={savingSettings} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white">
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </section>

        {/* Side Panel Form */}
        {activeTab === 'inventory' && isFormOpen && (
          <aside className="w-full lg:w-96 shrink-0">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm sticky top-24">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{editingGem ? 'Edit Gem Details' : 'Add New Gem'}</h3>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="text-white bg-indigo-600 hover:bg-indigo-700">{editingGem ? 'Save' : 'Add'}</Button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Image URL (Optional)</label>
                  <Input type="url" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Video URL (Optional)</label>
                  <Input type="url" value={formData.videoUrl} onChange={e => setFormData({...formData, videoUrl: e.target.value})} placeholder="https://... (e.g., MP4 link)" />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Media Gallery (Up to 10)</label>
                  {formData.images.length > 0 && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {formData.images.map((img, idx) => {
                        const isVideo = img.startsWith('data:video') || img.includes('.mp4') || img.includes('.webm') || img.includes('/video');
                        return (
                        <div 
                          key={idx} 
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggedImageIdx(idx);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedImageIdx === null || draggedImageIdx === idx) return;
                            const newImages = [...formData.images];
                            const draggedImg = newImages[draggedImageIdx];
                            newImages.splice(draggedImageIdx, 1);
                            newImages.splice(idx, 0, draggedImg);
                            setFormData(prev => ({ ...prev, images: newImages }));
                            setDraggedImageIdx(null);
                          }}
                          onDragEnd={() => setDraggedImageIdx(null)}
                          className="relative w-16 h-16 rounded border border-slate-200 overflow-hidden cursor-move bg-slate-900"
                        >
                          {isVideo ? (
                            <video src={img} className="w-full h-full object-cover" />
                          ) : (
                            <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                          )}
                          <button 
                            type="button"
                            onClick={() => setFormData(prev => ({...prev, images: prev.images.filter((_, i) => i !== idx)}))}
                            className="absolute top-0 right-0 bg-white/80 p-0.5 rounded-bl hover:bg-white text-slate-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )})}
                    </div>
                  )}
                  {formData.images.length < 10 && (
                    <div className="space-y-2">
                        <div className="relative">
                          <input 
                            type="file" 
                            multiple 
                            accept="image/*,video/*" 
                            onChange={handleImageUpload} 
                            disabled={uploadingImages}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <Button type="button" variant="outline" className="w-full gap-2 pointer-events-none" disabled={uploadingImages}>
                            <Upload className="h-4 w-4" />
                            {uploadingImages ? 'Processing...' : `Upload Local Media (${10 - formData.images.length} remaining)`}
                          </Button>
                        </div>
                        <div className="flex gap-2">
                           <Input id="new-media-url" type="url" placeholder="Add external Image/Video URL" className="flex-1" />
                           <Button type="button" variant="outline" onClick={() => {
                              const input = document.getElementById('new-media-url') as HTMLInputElement;
                              const url = input?.value?.trim();
                              if (url && formData.images.length < 10) {
                                  setFormData(prev => ({...prev, images: [...prev.images, url]}));
                                  input.value = '';
                              }
                           }}>Add URL</Button>
                        </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                    <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Royal Blue Sapphire" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Gem Type</label>
                    <Input list="gemTypes" value={formData.gemType} onChange={e => setFormData({...formData, gemType: e.target.value})} placeholder="e.g. Sapphire, Ruby, Emerald" />
                    <datalist id="gemTypes">
                      <option value="Sapphire" />
                      <option value="Ruby" />
                      <option value="Emerald" />
                      <option value="Diamond" />
                      <option value="Aquamarine" />
                      <option value="Spinel" />
                      <option value="Garnet" />
                      <option value="Tourmaline" />
                      <option value="Amethyst" />
                      <option value="Topaz" />
                      <option value="Zircon" />
                      <option value="Morganite" />
                    </datalist>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Origin</label>
                    <Input list="origins" value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} placeholder="e.g. Ceylon" />
                    <datalist id="origins">
                      <option value="Ceylon (Sri Lanka)" />
                      <option value="Burma (Myanmar)" />
                      <option value="Madagascar" />
                      <option value="Colombia" />
                      <option value="Zambia" />
                      <option value="Brazil" />
                      <option value="Tanzania" />
                      <option value="Mozambique" />
                      <option value="Kenya" />
                      <option value="Afghanistan" />
                      <option value="Pakistan" />
                      <option value="Russia" />
                      <option value="Vietnam" />
                      <option value="Ethiopia" />
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Shape</label>
                    <Input list="shapes" value={formData.shape} onChange={e => setFormData({...formData, shape: e.target.value})} placeholder="e.g. Oval Cushion" />
                    <datalist id="shapes">
                      <option value="Oval" />
                      <option value="Cushion" />
                      <option value="Round" />
                      <option value="Emerald" />
                      <option value="Pear" />
                      <option value="Princess" />
                      <option value="Radiant" />
                      <option value="Asscher" />
                      <option value="Heart" />
                      <option value="Marquise" />
                      <option value="Octagon" />
                      <option value="Trillion" />
                      <option value="Baguette" />
                      <option value="Cabochon" />
                    </datalist>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Weight (ct)</label>
                    <Input type="text" inputMode="decimal" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} placeholder="e.g. 2.5" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Selling Price ($)</label>
                    <Input type="text" inputMode="decimal" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="e.g. 4500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Buying Price ($) - Only visible to Admin</label>
                  <Input type="text" inputMode="decimal" value={formData.buyingPrice} onChange={e => setFormData({...formData, buyingPrice: e.target.value})} placeholder="e.g. 3000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Status</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status"
                        value="available"
                        checked={formData.status === 'available'}
                        onChange={e => setFormData({...formData, status: e.target.value as 'available'|'on_sale'|'sold'})}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <span className="text-sm text-slate-700">Available</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status"
                        value="on_sale"
                        checked={formData.status === 'on_sale'}
                        onChange={e => setFormData({...formData, status: e.target.value as 'available'|'on_sale'|'sold'})}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <span className="text-sm text-slate-700">On Sale</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status"
                        value="sold"
                        checked={formData.status === 'sold'}
                        onChange={e => setFormData({...formData, status: e.target.value as 'available'|'on_sale'|'sold'})}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <span className="text-sm text-slate-700">Sold</span>
                    </label>
                  </div>
                </div>
                {formData.status === 'on_sale' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Sale Percentage (%)</label>
                    <Input type="text" inputMode="decimal" value={formData.salePercentage} onChange={e => setFormData({...formData, salePercentage: e.target.value})} placeholder="e.g. 15" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Dimensions</label>
                  <Input value={formData.dimensions} onChange={e => setFormData({...formData, dimensions: e.target.value})} placeholder="e.g. 8.2 x 6.4 x 4.1 mm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Treatment Status</label>
                  <Input list="treatments" value={formData.treatment} onChange={e => setFormData({...formData, treatment: e.target.value})} placeholder="e.g. Unheated / Untreated" />
                  <datalist id="treatments">
                    <option value="Unheated / Untreated" />
                    <option value="Heated" />
                    <option value="Minor Oil" />
                    <option value="Moderate Oil" />
                    <option value="Significant Oil" />
                    <option value="Glass Filled" />
                    <option value="Irradiated" />
                    <option value="Diffusion" />
                    <option value="Dyeing" />
                    <option value="Fracture Filled" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Basic Colour</label>
                  <Input value={formData.basicColour || ''} onChange={e => setFormData({...formData, basicColour: e.target.value})} placeholder="e.g. Blue" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Trade Color</label>
                  <Input value={formData.tradeColor || ''} onChange={e => setFormData({...formData, tradeColor: e.target.value})} placeholder="e.g. Cornflower Blue" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Cut Grade</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="cutGrade"
                        value=""
                        checked={!formData.cutGrade}
                        onChange={e => setFormData({...formData, cutGrade: e.target.value as any})}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <span className="text-sm text-slate-700">None</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="cutGrade"
                        value="Very good"
                        checked={formData.cutGrade === 'Very good'}
                        onChange={e => setFormData({...formData, cutGrade: e.target.value as any})}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <span className="text-sm text-slate-700">Very good</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="cutGrade"
                        value="Good"
                        checked={formData.cutGrade === 'Good'}
                        onChange={e => setFormData({...formData, cutGrade: e.target.value as any})}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <span className="text-sm text-slate-700">Good</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="cutGrade"
                        value="Ok"
                        checked={formData.cutGrade === 'Ok'}
                        onChange={e => setFormData({...formData, cutGrade: e.target.value as any})}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <span className="text-sm text-slate-700">Ok</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Supplier</label>
                  <select 
                    value={formData.supplier || ''} 
                    onChange={e => setFormData({...formData, supplier: e.target.value})}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors"
                  >
                    <option value="">Select supplier...</option>
                    <option value="SG/SEW">Sadew Gem Mr.Lal (SG/SEW)</option>
                    <option value="SG/LAL">Mr.Lal (SG/LAL)</option>
                    <option value="SG/SIT">Mr.Sithumina (SG/SIT)</option>
                    <option value="SG/CHE">Mr.Cheethiya (SG/CHE)</option>
                    <option value="SG/DIN">Mr.Kandy Uncle (SG/DIN)</option>
                    <option value="SG/GAY">Mr.Gayan -Deraniyagala (SG/GAY)</option>
                    <option value="SG/NAL">Mr.Naleen (Peoples Bank) (SG/NAL)</option>
                    <option value="SG/KAL">Mrs. Kalani (SG/KAL)</option>
                    <option value="SG/MTH">Mr.Meril and Thushara (SG/MTH)</option>
                  </select>
                </div>
                
                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1 text-white bg-indigo-600 hover:bg-indigo-700">{editingGem ? 'Save Changes' : 'Add Gem'}</Button>
                </div>
              </form>
            </div>
          </aside>
        )}
      </main>
    </div>
    </>
  );
}
