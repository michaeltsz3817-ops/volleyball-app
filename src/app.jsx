import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { Trophy, History, Plus, Users, Trash2, Camera, Medal, Crown, TrendingDown } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyCnKewEU8m4Kf_W09-3eednqHBV-4ZFKr4",
  authDomain: "office-bets-9b5bc.firebaseapp.com",
  projectId: "office-bets-9b5bc",
  storageBucket: "office-bets-9b5bc.firebasestorage.app",
  messagingSenderId: "354145606988",
  appId: "1:354145606988:web:fb37bb075f7775de1603e9",
  measurementId: "G-9JRSNXCXBJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const APP_ID = 'vball-v2';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [baseRate, setBaseRate] = useState(10);
  const [winners, setWinners] = useState([]);
  const [losers, setLosers] = useState([]);
  const [newName, setNewName] = useState('');
  const [photo, setPhoto] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const uUnsub = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'volleyball_users'), s => {
      setUsers(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const mUnsub = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'volleyball_matches'), s => {
      setMatches(s.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() || new Date() })).sort((a,b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
    return () => { uUnsub(); mUnsub(); };
  }, [user]);

  const stats = useMemo(() => {
    const s = {};
    users.forEach(u => s[u.id] = { ...u, net: 0, w: 0, l: 0, g: 0 });
    matches.forEach(m => {
      if (m.createdAt.toISOString().slice(0, 7) !== selectedMonth) return;
      const pot = m.baseRate * m.losers.length;
      const share = m.winners.length ? pot / m.winners.length : 0;
      m.winners.forEach(id => { if(s[id]) { s[id].net += share; s[id].w++; s[id].g++; } });
      m.losers.forEach(id => { if(s[id]) { s[id].net -= m.baseRate; s[id].l++; s[id].g++; } });
    });
    return Object.values(s).filter(p => p.g > 0).sort((a,b) => b.net - a.net);
  }, [users, matches, selectedMonth]);

  const resizeImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-400">正在進入場館...</div>;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24">
      <header className="bg-blue-600 text-white p-6 rounded-b-3xl shadow-lg sticky top-0 z-10">
        <h1 className="text-xl font-bold flex items-center gap-2">🏐 排球龍虎榜</h1>
      </header>

      <main className="p-4">
        {activeTab === 'dashboard' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold text-slate-700">排名</h2>
              <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="text-sm bg-transparent font-bold text-blue-600 border-none" />
            </div>
            {stats.map((p, i) => (
              <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100">
                    {p.photo ? <img src={p.photo} className="w-full h-full object-cover" /> : <Users className="m-2 text-slate-300"/>}
                  </div>
                  <span className="font-bold">{p.name}</span>
                </div>
                <div className={`font-black text-lg ${p.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {p.net > 0 && '+'}{p.net.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'game' && (
          <div className="space-y-4">
            <div className="flex gap-2 bg-white p-2 rounded-2xl">
              {[10, 20, 30].map(r => (
                <button key={r} onClick={() => setBaseRate(r)} className={`flex-1 py-2 rounded-xl font-bold ${baseRate === r ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>${r}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-center text-xs font-bold text-green-600">贏家 ({winners.length})</p>
                {users.map(u => (
                  <button key={u.id} onClick={() => setWinners(p => p.includes(u.id) ? p.filter(id => id !== u.id) : [...p, u.id])} disabled={losers.includes(u.id)} className={`w-full p-2 rounded-lg text-sm font-bold border ${winners.includes(u.id) ? 'bg-green-500 text-white border-green-600' : 'bg-white text-slate-500 border-slate-100'} ${losers.includes(u.id) ? 'opacity-20' : ''}`}>
                    {u.name}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-center text-xs font-bold text-red-600">輸家 ({losers.length})</p>
                {users.map(u => (
                  <button key={u.id} onClick={() => setLosers(p => p.includes(u.id) ? p.filter(id => id !== u.id) : [...p, u.id])} disabled={winners.includes(u.id)} className={`w-full p-2 rounded-lg text-sm font-bold border ${losers.includes(u.id) ? 'bg-red-500 text-white border-red-600' : 'bg-white text-slate-500 border-slate-100'} ${winners.includes(u.id) ? 'opacity-20' : ''}`}>
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={async () => {
              if(!winners.length || !losers.length) return alert("要揀人架！");
              await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'volleyball_matches'), { baseRate, winners, losers, createdAt: serverTimestamp() });
              setWinners([]); setLosers([]); setActiveTab('dashboard');
            }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl">完成結算</button>
          </div>
        )}

        {activeTab === 'profiles' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-4">
              <div onClick={() => fileRef.current.click()} className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200 cursor-pointer overflow-hidden">
                {photo ? <img src={photo} className="w-full h-full object-cover" /> : <Camera className="text-slate-300" />}
              </div>
              <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={async e => { if(e.target.files[0]) setPhoto(await resizeImage(e.target.files[0])) }} />
              <div className="flex-1 flex flex-col gap-2">
                <input value={newName} onChange={e => setNewName(e.target.value)} className="bg-slate-50 p-2 rounded-lg text-sm" placeholder="輸入同事名" />
                <button onClick={async () => {
                  if(!newName.trim()) return;
                  await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'volleyball_users'), { name: newName, photo, createdAt: serverTimestamp() });
                  setNewName(''); setPhoto(null);
                }} className="bg-blue-600 text-white py-1.5 rounded-lg text-sm font-bold">加入</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {users.map(u => (
                <div key={u.id} className="bg-white p-3 rounded-2xl border border-slate-100 text-center relative">
                  <div className="w-12 h-12 rounded-full mx-auto mb-2 overflow-hidden bg-slate-50">
                    {u.photo ? <img src={u.photo} className="w-full h-full object-cover" /> : <Users className="m-3 text-slate-200"/>}
                  </div>
                  <p className="text-xs font-bold truncate">{u.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md border border-white/20 p-2 rounded-3xl shadow-2xl flex justify-around items-center">
        <button onClick={()=>setActiveTab('dashboard')} className={`p-3 rounded-2xl ${activeTab==='dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-300'}`}><Trophy/></button>
        <button onClick={()=>setActiveTab('game')} className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-600 text-white shadow-lg"><Plus/></button>
        <button onClick={()=>setActiveTab('profiles')} className={`p-3 rounded-2xl ${activeTab==='profiles' ? 'bg-blue-50 text-blue-600' : 'text-slate-300'}`}><Users/></button>
      </nav>
    </div>
  );
}
