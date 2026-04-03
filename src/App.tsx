import React, { useState, useRef, useMemo, useEffect } from 'react';
import { packagesDaihao, packagesRu, Package } from './data';
import { track1, track2 } from './rewards';
import { Plus, Minus, ShoppingCart, Download, Trash2, Receipt, Filter, Gift, Calculator, X } from 'lucide-react';
import html2canvas from 'html2canvas';

const getUnlockedMilestones = (points: number) => {
  return {
    track1: track1.filter(m => points >= m.points),
    track2: track2.filter(m => points >= m.points)
  };
};

const getNextMilestone1 = (points: number) => {
  return track1.map(m => m.points).sort((a, b) => a - b).find(p => p > points);
};

const getNextMilestone2 = (points: number) => {
  return track2.map(m => m.points).sort((a, b) => a - b).find(p => p > points);
};

export default function App() {
  const [version, setVersion] = useState<'daihao' | 'ru'>('daihao');
  const [exchangeRate, setExchangeRate] = useState<number>(7.2);
  const [cartDaihao, setCartDaihao] = useState<{ [id: number]: number }>({});
  const [cartRu, setCartRu] = useState<{ [id: number]: number }>({});
  const [initialPointsDaihao, setInitialPointsDaihao] = useState<number>(0);
  const [initialPointsRu, setInitialPointsRu] = useState<number>(0);
  const [customPackagesDaihao, setCustomPackagesDaihao] = useState<Package[]>([]);
  const [customPackagesRu, setCustomPackagesRu] = useState<Package[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: '',
    price: '',
    points: '',
    draws: '',
    limit: '',
    extra: '',
    category: '自定义',
    sortId: ''
  });
  const [activeCategory, setActiveCategory] = useState('全部');
  const [drawFilter, setDrawFilter] = useState<'all' | 'hasDraws' | 'noDraws'>('all');
  const cartRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (endDateStr: string) => {
    const endDate = new Date(endDateStr);
    const diff = endDate.getTime() - currentTime.getTime();
    
    if (diff <= 0) return '已结束';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 0) {
      return `${days}天 ${hours}小时`;
    }
    return `${hours}小时 ${minutes}分 ${seconds}秒`;
  };

  const currentCart = version === 'daihao' ? cartDaihao : cartRu;
  const setCurrentCart = version === 'daihao' ? setCartDaihao : setCartRu;
  const currentInitialPoints = version === 'daihao' ? initialPointsDaihao : initialPointsRu;
  const setCurrentInitialPoints = version === 'daihao' ? setInitialPointsDaihao : setInitialPointsRu;

  const processedPackages = useMemo(() => {
    const rawPackages = version === 'daihao' ? [...packagesDaihao, ...customPackagesDaihao] : [...packagesRu, ...customPackagesRu];
    return rawPackages.map(pkg => {
      const calculatedPriceCny = version === 'daihao' 
        ? (pkg.priceUsd ? pkg.priceUsd * exchangeRate : 0)
        : (pkg.priceCny || 0);
      return { ...pkg, calculatedPriceCny };
    }).sort((a, b) => {
      if (a.sortId !== undefined && b.sortId !== undefined) {
        if (a.sortId !== b.sortId) {
          return a.sortId - b.sortId;
        }
      } else if (a.sortId !== undefined) {
        return -1;
      } else if (b.sortId !== undefined) {
        return 1;
      }

      const isCustomA = version === 'daihao' ? customPackagesDaihao.some(p => p.id === a.id) : customPackagesRu.some(p => p.id === a.id);
      const isCustomB = version === 'daihao' ? customPackagesDaihao.some(p => p.id === b.id) : customPackagesRu.some(p => p.id === b.id);
      
      if (isCustomA !== isCustomB) {
        return isCustomA ? 1 : -1;
      }
      
      if (a.category === '恋念' && b.category === '恋念') {
        return a.id - b.id;
      }
      
      const priceA = a.draws > 0 ? a.calculatedPriceCny / a.draws : Infinity;
      const priceB = b.draws > 0 ? b.calculatedPriceCny / b.draws : Infinity;
      if (priceA === priceB) return a.calculatedPriceCny - b.calculatedPriceCny;
      return priceA - priceB;
    });
  }, [version, exchangeRate, customPackagesDaihao, customPackagesRu]);

  const categories = useMemo(() => {
    const cats = new Set(processedPackages.map(pkg => pkg.category));
    const hasCustom = version === 'daihao' ? customPackagesDaihao.length > 0 : customPackagesRu.length > 0;
    if (hasCustom) {
      cats.add('自定义');
    }
    return ['全部', ...Array.from(cats)];
  }, [processedPackages, version, customPackagesDaihao, customPackagesRu]);

  const addToCart = (pkg: Package) => {
    setCurrentCart((prev) => {
      const currentQty = prev[pkg.id] || 0;
      if (currentQty < pkg.limit) {
        return { ...prev, [pkg.id]: currentQty + 1 };
      }
      return prev;
    });
  };

  const removeFromCart = (pkg: Package) => {
    setCurrentCart((prev) => {
      const currentQty = prev[pkg.id] || 0;
      if (currentQty > 1) {
        return { ...prev, [pkg.id]: currentQty - 1 };
      } else {
        const newCart = { ...prev };
        delete newCart[pkg.id];
        return newCart;
      }
    });
  };

  const clearCart = () => {
    setCurrentCart({});
  };

  const handleAddCustomPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.name || !customForm.price) return;
    
    const newPkg: Package = {
      id: Date.now(),
      name: customForm.name,
      category: customForm.category || '自定义',
      points: parseInt(customForm.points) || 0,
      draws: parseInt(customForm.draws) || 0,
      limit: parseInt(customForm.limit) || 999,
      extra: customForm.extra || undefined,
      sortId: customForm.sortId ? parseInt(customForm.sortId) : undefined,
    };

    if (version === 'daihao') {
      newPkg.priceUsd = parseFloat(customForm.price);
      setCustomPackagesDaihao(prev => [...prev, newPkg]);
    } else {
      newPkg.priceCny = parseFloat(customForm.price);
      setCustomPackagesRu(prev => [...prev, newPkg]);
    }

    setCustomForm({
      name: '',
      price: '',
      points: '',
      draws: '',
      limit: '',
      extra: '',
      category: '自定义',
      sortId: ''
    });
    setShowCustomForm(false);
  };

  const handleDeleteCustomPackage = (id: number) => {
    if (version === 'daihao') {
      setCustomPackagesDaihao(prev => prev.filter(p => p.id !== id));
      setCartDaihao(prev => {
        const newCart = { ...prev };
        delete newCart[id];
        return newCart;
      });
    } else {
      setCustomPackagesRu(prev => prev.filter(p => p.id !== id));
      setCartRu(prev => {
        const newCart = { ...prev };
        delete newCart[id];
        return newCart;
      });
    }
  };

  const exportAsImage = async () => {
    if (cartRef.current) {
      // Scroll into view to ensure the browser has painted it properly before capture
      cartRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Wait for scroll to finish
      setTimeout(async () => {
        try {
          const canvas = await html2canvas(cartRef.current!, {
            scale: 3, // High resolution
            backgroundColor: '#ffffff',
            useCORS: true,
          });
          const image = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = image;
          link.download = 'shopping-receipt.png';
          link.click();
        } catch (error) {
          console.error('Failed to export image', error);
        }
      }, 500);
    }
  };

  const scrollToCart = () => {
    cartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const filteredPackages = processedPackages.filter((pkg) => {
    let catMatch = true;
    if (activeCategory !== '全部') {
      if (activeCategory === '自定义') {
        catMatch = version === 'daihao' 
          ? customPackagesDaihao.some(p => p.id === pkg.id) 
          : customPackagesRu.some(p => p.id === pkg.id);
      } else {
        catMatch = pkg.category === activeCategory;
      }
    }
    if (!catMatch) return false;

    if (drawFilter === 'hasDraws') return pkg.draws > 0;
    if (drawFilter === 'noDraws') return pkg.draws === 0;
    
    return true;
  });

  const cartItems = processedPackages.filter((pkg) => currentCart[pkg.id] > 0);
  
  const cartPoints = cartItems.reduce((sum, pkg) => sum + pkg.points * currentCart[pkg.id], 0);
  const totalPoints = cartPoints + currentInitialPoints;
  const totalDraws = cartItems.reduce((sum, pkg) => sum + pkg.draws * currentCart[pkg.id], 0);
  const totalPriceCny = cartItems.reduce((sum, pkg) => sum + pkg.calculatedPriceCny * currentCart[pkg.id], 0);
  const totalPriceCnyForDraws = cartItems.reduce((sum, pkg) => pkg.draws > 0 ? sum + pkg.calculatedPriceCny * currentCart[pkg.id] : sum, 0);
  const totalPriceUsd = version === 'daihao' ? cartItems.reduce((sum, pkg) => sum + (pkg.priceUsd || 0) * currentCart[pkg.id], 0) : 0;

  const { track1: unlockedTrack1, track2: unlockedTrack2 } = getUnlockedMilestones(totalPoints);
  const nextMilestone1 = getNextMilestone1(totalPoints);
  const nextMilestone2 = getNextMilestone2(totalPoints);

  return (
    <div className="min-h-screen bg-[#f8f6f0] pb-28 lg:pb-12 font-sans selection:bg-amber-100 text-[#3a332c]">
      {/* Header */}
      <header className="bg-[#f2eee3] sticky top-0 z-30 shadow-sm border-b border-[#eaddcf] px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl  font-bold text-[#3a332c] tracking-tight">广陵账房</h1>
            <p className="text-[10px] md:text-xs text-[#7a6f66] mt-0.5 ">精打细算，运筹帷幄</p>
          </div>
          <div className="hidden lg:flex items-center space-x-4">
             <div className="text-right">
               <div className="text-xs text-[#7a6f66] ">当前合计</div>
               <div className="text-base font-bold text-[#b83b3b] leading-none mt-1 ">¥{totalPriceCny.toFixed(2)}</div>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Package List */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-4">
          
          {/* Version Switcher */}
          <div className="flex justify-center mb-2">
            <div className="bg-[#eaddcf] p-1 rounded-lg inline-flex mx-auto lg:mx-0">
              <button 
                onClick={() => setVersion('daihao')} 
                className={`px-6 py-2 rounded-md text-sm  font-bold transition-all ${version === 'daihao' ? "bg-[#f8f6f0] text-[#b83b3b] shadow-sm" : "text-[#7a6f66] hover:text-[#3a332c]"}`}
              >
                代号鸢
              </button>
              <button 
                onClick={() => setVersion('ru')} 
                className={`px-6 py-2 rounded-md text-sm  font-bold transition-all ${version === 'ru' ? "bg-[#f8f6f0] text-[#b83b3b] shadow-sm" : "text-[#7a6f66] hover:text-[#3a332c]"}`}
              >
                如鸢
              </button>
            </div>
          </div>

          {showCustomForm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-[#f8f6f0] rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-[#eaddcf]">
                <form onSubmit={handleAddCustomPackage} className="p-5 space-y-4">
                  <div className="flex justify-between items-center mb-2 border-b border-[#eaddcf] pb-3">
                    <h3 className="font-bold text-[#3a332c] text-lg ">录入自定义礼包</h3>
                    <button type="button" onClick={() => setShowCustomForm(false)} className="text-[#7a6f66] hover:text-[#3a332c] p-1">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-[#7a6f66] mb-1 ">礼包名称 *</label>
                      <input required type="text" value={customForm.name} onChange={e => setCustomForm({...customForm, name: e.target.value})} className="w-full border border-[#eaddcf] rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#c09d62] focus:border-[#c09d62] outline-none transition-all bg-white text-[#3a332c]" placeholder="输入名称" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-[#7a6f66] mb-1 ">价格 ({version === 'daihao' ? 'USD' : 'CNY'}) *</label>
                      <input required type="number" step="0.01" min="0" value={customForm.price} onChange={e => setCustomForm({...customForm, price: e.target.value})} className="w-full border border-[#eaddcf] rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#c09d62] focus:border-[#c09d62] outline-none transition-all bg-white text-[#3a332c]" placeholder="0.00" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-[#7a6f66] mb-1 ">分类</label>
                      <input type="text" value={customForm.category} onChange={e => setCustomForm({...customForm, category: e.target.value})} className="w-full border border-[#eaddcf] rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#c09d62] focus:border-[#c09d62] outline-none transition-all bg-white text-[#3a332c]" placeholder="自定义" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#7a6f66] mb-1 ">积分</label>
                      <input type="number" min="0" value={customForm.points} onChange={e => setCustomForm({...customForm, points: e.target.value})} className="w-full border border-[#eaddcf] rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#c09d62] focus:border-[#c09d62] outline-none transition-all bg-white text-[#3a332c]" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#7a6f66] mb-1 ">抽数</label>
                      <input type="number" min="0" value={customForm.draws} onChange={e => setCustomForm({...customForm, draws: e.target.value})} className="w-full border border-[#eaddcf] rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#c09d62] focus:border-[#c09d62] outline-none transition-all bg-white text-[#3a332c]" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#7a6f66] mb-1 ">限购次数</label>
                      <input type="number" min="1" value={customForm.limit} onChange={e => setCustomForm({...customForm, limit: e.target.value})} className="w-full border border-[#eaddcf] rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#c09d62] focus:border-[#c09d62] outline-none transition-all bg-white text-[#3a332c]" placeholder="999" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#7a6f66] mb-1 ">额外物品</label>
                      <input type="text" value={customForm.extra} onChange={e => setCustomForm({...customForm, extra: e.target.value})} className="w-full border border-[#eaddcf] rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#c09d62] focus:border-[#c09d62] outline-none transition-all bg-white text-[#3a332c]" placeholder="如: 100体力" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-[#7a6f66] mb-1 ">排序 ID</label>
                      <input type="number" value={customForm.sortId} onChange={e => setCustomForm({...customForm, sortId: e.target.value})} className="w-full border border-[#eaddcf] rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#c09d62] focus:border-[#c09d62] outline-none transition-all bg-white text-[#3a332c]" placeholder="数字越小越靠前 (可选)" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4 mt-2 border-t border-[#eaddcf]">
                    <button type="button" onClick={() => setShowCustomForm(false)} className="px-4 py-2 text-sm  font-medium text-[#7a6f66] hover:text-[#3a332c] mr-2">
                      取消
                    </button>
                    <button type="submit" className="bg-[#3a332c] text-[#f8f6f0] px-6 py-2 rounded-lg text-sm  font-medium hover:bg-[#5a5045] transition-colors shadow-sm">
                      确认录入
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Exchange Rate Input (Only for Daihao) */}
          {version === 'daihao' && (
            <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-[#eaddcf]">
              <Calculator size={18} className="text-[#c09d62]" />
              <label className="text-sm font-bold text-[#3a332c] ">当前汇率 (USD to CNY):</label>
              <input
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                className="border border-[#eaddcf] rounded-md px-3 py-1.5 w-24 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#c09d62] focus:border-[#c09d62] transition-all text-[#3a332c]"
              />
              <span className="text-xs text-[#7a6f66]  hidden sm:inline">自动计算人民币价格</span>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col gap-2 mb-3">
            {/* Category Filter */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
              <Filter size={16} className="text-[#c09d62] flex-shrink-0 mr-1" />
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-[#3a332c] text-[#f8f6f0] shadow-sm'
                      : 'bg-white text-[#7a6f66] border border-[#eaddcf] hover:bg-[#f2eee3]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Draw Filter */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
              <div className="w-4 flex-shrink-0 mr-1 flex justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#c09d62]"></div>
              </div>
              {[
                { id: 'all', label: '全部' },
                { id: 'hasDraws', label: '含抽数' },
                { id: 'noDraws', label: '无抽数' }
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setDrawFilter(filter.id as any)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    drawFilter === filter.id
                      ? 'bg-[#3a332c] text-[#f8f6f0] shadow-sm'
                      : 'bg-white text-[#7a6f66] border border-[#eaddcf] hover:bg-[#f2eee3]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredPackages.map((pkg) => {
              const qty = currentCart[pkg.id] || 0;
              const isMaxed = qty >= pkg.limit;
              const isCustom = version === 'daihao' 
                ? customPackagesDaihao.some(p => p.id === pkg.id)
                : customPackagesRu.some(p => p.id === pkg.id);
                
              return (
                <div 
                  key={pkg.id} 
                  className={`rounded-xl p-3 shadow-sm border flex flex-col gap-2 transition-all hover:shadow-md relative group ${
                    qty > 0 
                      ? 'bg-[#fffdf8] border-[#c09d62] ring-1 ring-[#c09d62]' 
                      : 'bg-white border-[#eaddcf]'
                  }`}
                >
                  {isCustom && (
                    <button 
                      onClick={() => handleDeleteCustomPackage(pkg.id)}
                      className="absolute -top-2 -right-2 bg-red-100 text-[#b83b3b] rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-200 z-10"
                      title="删除自定义礼包"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className=" font-bold text-[#3a332c] text-sm" title={pkg.name}>{pkg.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#fcf5e5] text-[#c09d62] border border-[#f2e6ce] whitespace-nowrap">
                          {pkg.points} 积分
                        </span>
                        {pkg.draws > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#f2eee3] text-[#7a6f66] border border-[#eaddcf] whitespace-nowrap">
                            {pkg.draws} 抽
                          </span>
                        )}
                        {pkg.draws > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#f8f6f0] text-[#7a6f66] border border-[#eaddcf] whitespace-nowrap">
                            ¥{(pkg.calculatedPriceCny / pkg.draws).toFixed(2)}/抽
                          </span>
                        )}
                        {pkg.extra && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#f2eee3] text-[#3a332c] border border-[#eaddcf] whitespace-nowrap">
                            {pkg.extra}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-bold text-[#b83b3b] leading-none ">¥{pkg.calculatedPriceCny.toFixed(2)}</div>
                      {version === 'daihao' && pkg.priceUsd && (
                        <div className="text-[10px] text-[#7a6f66] mt-1">${pkg.priceUsd}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-[#eaddcf] mt-auto">
                    <div className="text-[11px] text-[#7a6f66]">
                      {pkg.limit === 999 ? '不限购' : (
                        <>限购 <span className={qty >= pkg.limit ? "text-[#b83b3b] font-medium" : "text-[#3a332c] font-medium"}>{qty}</span>/{pkg.limit}</>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1 bg-[#f8f6f0] rounded-full p-0.5 border border-[#eaddcf]">
                      <button
                        onClick={() => removeFromCart(pkg)}
                        disabled={qty === 0}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-[#7a6f66] shadow-sm disabled:opacity-40 disabled:shadow-none transition-all active:scale-95"
                      >
                        <Minus size={14} strokeWidth={2.5} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-[#3a332c]">{qty}</span>
                      <button
                        onClick={() => addToCart(pkg)}
                        disabled={isMaxed}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-[#7a6f66] shadow-sm disabled:opacity-40 disabled:shadow-none transition-all active:scale-95"
                      >
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Add Custom Package Card */}
            <button
              onClick={() => setShowCustomForm(true)}
              className="rounded-xl p-3 border-2 border-dashed border-[#eaddcf] flex flex-col items-center justify-center text-[#7a6f66] hover:text-[#c09d62] hover:border-[#c09d62] hover:bg-[#fffdf8] transition-all min-h-[120px] group"
            >
              <div className="bg-[#f8f6f0] group-hover:bg-white rounded-full p-2 mb-2 transition-colors">
                <Plus size={24} />
              </div>
              <span className="text-sm  font-medium">自定义礼包</span>
            </button>
          </div>
        </div>

        {/* Right Column: Shopping Cart */}
        <div className="lg:col-span-4 xl:col-span-4">
          <div className="sticky top-20 space-y-4">
            {/* The Receipt */}
            <div 
              ref={cartRef}
              className="bg-white rounded-2xl shadow-sm border border-[#eaddcf] overflow-hidden"
            >
              <div className="bg-[#3a332c] p-5 text-[#f8f6f0] text-center">
                <h2 className="text-lg font-bold tracking-wider flex items-center justify-center gap-2 ">
                  <Receipt size={18} />
                  购物清单
                </h2>
                <p className="text-[#c09d62] text-[10px] mt-1 uppercase tracking-widest ">Purchase Receipt</p>
              </div>
              
              <div className="p-5 bg-[#fffdf8]">
                <div className="mb-5 flex justify-between items-center bg-[#f8f6f0] p-2.5 rounded-lg border border-[#eaddcf]">
                  <span className="text-xs font-medium text-[#3a332c] flex items-center gap-1 ">
                    <Gift size={14} className="text-[#c09d62]" />
                    已有初始积分
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={currentInitialPoints || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setCurrentInitialPoints(isNaN(val) || val < 0 ? 0 : val);
                    }}
                    placeholder="0"
                    className="w-24 text-right border border-[#eaddcf] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#c09d62] focus:ring-1 focus:ring-[#c09d62] bg-white text-[#3a332c]"
                  />
                </div>

                {cartItems.length === 0 ? (
                  <div className="text-center py-8 text-[#7a6f66] border-b border-[#eaddcf] mb-5">
                    <ShoppingCart size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="font-medium text-sm text-[#7a6f66] ">清单空空如也</p>
                    <p className="text-xs mt-1 ">请添加您需要的礼包</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {cartItems.map((pkg) => (
                        <div key={pkg.id} className="flex justify-between items-start text-sm">
                          <div className="flex-1 pr-3 min-w-0">
                            <div className="font-medium text-[#3a332c] text-xs " title={pkg.name}>{pkg.name}</div>
                            <div className="text-[#7a6f66] text-[11px] mt-0.5">¥{pkg.calculatedPriceCny.toFixed(2)} × {currentCart[pkg.id]}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-medium text-[#3a332c] text-sm ">¥{(pkg.calculatedPriceCny * currentCart[pkg.id]).toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t-2 border-dashed border-[#eaddcf] my-5"></div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[#7a6f66] ">总抽数</span>
                        <span className="font-medium text-[#3a332c] bg-[#f8f6f0] px-2 py-0.5 rounded border border-[#eaddcf]">{totalDraws.toFixed(1)} 抽</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#7a6f66] ">平均每抽</span>
                        <span className="font-medium text-[#c09d62] bg-[#fcf5e5] px-2 py-0.5 rounded border border-[#f2e6ce]">
                          {totalDraws > 0 ? `¥${(totalPriceCnyForDraws / totalDraws).toFixed(2)}` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#7a6f66] ">购物车积分</span>
                        <span className="font-medium text-[#3a332c]">{cartPoints} 分</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#3a332c] font-bold ">总积分 (含初始)</span>
                        <span className="font-medium text-[#c09d62] bg-[#fcf5e5] px-2 py-0.5 rounded border border-[#f2e6ce]">{totalPoints} 分</span>
                      </div>
                      {version === 'daihao' && (
                        <div className="flex justify-between items-center">
                          <span className="text-[#7a6f66] ">总价 (USD)</span>
                          <span className="font-medium text-[#3a332c]">${totalPriceUsd.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-[#eaddcf] mt-5 pt-5 flex justify-between items-end">
                      <span className="font-bold text-[#3a332c] text-sm ">总计 (CNY)</span>
                      <span className="text-2xl font-bold text-[#b83b3b] leading-none ">¥{totalPriceCny.toFixed(2)}</span>
                    </div>
                  </>
                )}

                {totalPoints > 0 && (
                  <>
                    {cartItems.length > 0 && <div className="border-t-2 border-dashed border-[#eaddcf] my-5"></div>}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-[#3a332c] flex items-center gap-1 ">
                          <Gift size={14} className="text-[#c09d62]" />
                          积分奖励进度
                        </h3>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="text-[11px] font-bold text-[#3a332c] ">周年限时累充</div>
                              <div className="text-[10px] bg-[#fcf5e5] text-[#c09d62] px-1.5 py-0.5 rounded font-medium border border-[#f2e6ce]">
                                剩余: {formatCountdown('2026-04-29T23:59:59+08:00')}
                              </div>
                            </div>
                            {nextMilestone1 ? (
                              <span className="text-[10px] text-[#7a6f66]">
                                距下一档还差 <span className="text-[#b83b3b] font-medium">{nextMilestone1 - totalPoints}</span> 分
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#c09d62] font-medium">已全部解锁</span>
                            )}
                          </div>
                          {unlockedTrack1.length > 0 ? (
                            <div className="space-y-1.5">
                              {unlockedTrack1.map((m, idx) => (
                                <div key={idx} className="text-[10px] text-[#3a332c] bg-[#f8f6f0] p-1.5 rounded border border-[#eaddcf] leading-relaxed">
                                  <span className="font-bold text-[#b83b3b] mr-2">{m.points}积分</span>
                                  {m.rewards.map(r => `${r.name} ×${r.count}`).join('、')}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[10px] text-[#7a6f66] italic bg-[#f8f6f0] p-1.5 rounded border border-[#eaddcf]">暂未解锁奖励</div>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="text-[11px] font-bold text-[#3a332c] ">男主限时累充</div>
                              <div className="text-[10px] bg-[#fcf5e5] text-[#c09d62] px-1.5 py-0.5 rounded font-medium border border-[#f2e6ce]">
                                剩余: {formatCountdown('2026-05-13T23:59:59+08:00')}
                              </div>
                            </div>
                            {nextMilestone2 ? (
                              <span className="text-[10px] text-[#7a6f66]">
                                距下一档还差 <span className="text-[#b83b3b] font-medium">{nextMilestone2 - totalPoints}</span> 分
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#c09d62] font-medium">已全部解锁</span>
                            )}
                          </div>
                          {unlockedTrack2.length > 0 ? (
                            <div className="space-y-1.5">
                              {unlockedTrack2.map((m, idx) => (
                                <div key={idx} className="text-[10px] text-[#3a332c] bg-[#f8f6f0] p-1.5 rounded border border-[#eaddcf] leading-relaxed">
                                  <span className="font-bold text-[#b83b3b] mr-2">{m.points}积分</span>
                                  {m.rewards.map(r => `${r.name} ×${r.count}`).join('、')}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[10px] text-[#7a6f66] italic bg-[#f8f6f0] p-1.5 rounded border border-[#eaddcf]">暂未解锁奖励</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex space-x-3">
              <button
                onClick={clearCart}
                disabled={cartItems.length === 0}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-[#f8f6f0] border border-[#eaddcf] text-[#3a332c] rounded-xl hover:bg-[#f2eee3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold shadow-sm text-sm"
              >
                <Trash2 size={16} />
                <span>清空</span>
              </button>
              <button
                onClick={exportAsImage}
                disabled={cartItems.length === 0}
                className="flex-[2] flex items-center justify-center space-x-2 px-4 py-3 bg-[#3a332c] text-[#f8f6f0] border border-transparent rounded-xl hover:bg-[#5a5045] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold shadow-sm text-sm"
              >
                <Download size={16} />
                <span>导出图片</span>
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* Mobile Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#f8f6f0] border-t border-[#eaddcf] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-between items-center lg:hidden z-40 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#7a6f66] font-bold">合计金额</span>
          <span className="text-lg font-bold text-[#b83b3b] leading-none mt-0.5">¥{totalPriceCny.toFixed(2)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={clearCart} 
            disabled={cartItems.length === 0}
            className="p-2.5 text-[#3a332c] bg-[#f2eee3] border border-[#eaddcf] rounded-xl active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center"
          >
            <Trash2 size={18} />
          </button>
          <button 
            onClick={exportAsImage} 
            disabled={cartItems.length === 0}
            className="px-3 py-2.5 bg-[#c09d62] text-[#fffdf8] border border-transparent font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center space-x-1.5 disabled:opacity-50 text-sm"
          >
            <Download size={16} />
            <span className="hidden sm:inline">导出</span>
          </button>
          <button 
            onClick={scrollToCart} 
            className="px-3 py-2.5 bg-[#3a332c] text-[#f8f6f0] border border-transparent font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center space-x-1.5 text-sm"
          >
            <Receipt size={16} />
            <span>清单</span>
          </button>
        </div>
      </div>
    </div>
  );
}
