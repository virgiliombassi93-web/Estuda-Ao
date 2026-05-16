/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, Clock, Target, Rocket, GraduationCap, ChevronRight, Loader2, Sparkles, Layout, BrainCircuit, LogOut, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useAuth } from './components/FirebaseProvider';
import { db } from './lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

interface StudyPlanRequest {
  subject: string;
  level: string;
  timePerDay: string;
  objective: string;
  deadline: string;
  studentName: string;
  studentClass: string;
}

interface SavedPlan {
  id: string;
  studentName: string;
  subject: string;
  studentClass: string;
  plan: string;
  date: string;
}

export default function App() {
  const { user, profile, loading: authLoading, login, logout, updateProfile } = useAuth();
  
  const [formData, setFormData] = useState<StudyPlanRequest>({
    subject: '',
    level: 'iniciante',
    timePerDay: '',
    objective: '',
    deadline: '',
    studentName: '',
    studentClass: ''
  });
  
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);

  // Sync profile to formData
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        studentName: profile.studentName,
        studentClass: profile.studentClass
      }));
      setStep(1); // Skip identity step if profile exists
    }
  }, [profile]);

  // Real-time plans from Firestore
  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'users', user.uid, 'plans'),
        orderBy('createdAt', 'desc')
      );
      
      return onSnapshot(q, (snapshot) => {
        const plans = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            studentName: profile?.studentName || '',
            subject: data.subject,
            studentClass: profile?.studentClass || '',
            plan: data.plan,
            date: data.createdAt?.toDate().toLocaleDateString('pt-AO') || new Date().toLocaleDateString('pt-AO')
          };
        });
        setSavedPlans(plans);
      });
    }
  }, [user, profile]);

  const saveToHistory = async (newPlan: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'plans'), {
        subject: formData.subject,
        plan: newPlan,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error saving plan:", err);
    }
  };

  const deletePlan = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'plans', id));
    } catch (err) {
      console.error("Error deleting plan:", err);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar o plano');
      }

      setPlan(data.plan);
      await saveToHistory(data.plan);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const [profileSaving, setProfileSaving] = useState(false);

  const nextStep = async () => {
    if (step === 0) {
      setProfileSaving(true);
      try {
        await updateProfile({
          studentName: formData.studentName,
          studentClass: formData.studentClass,
          email: user?.email || ''
        });
      } finally {
        setProfileSaving(false);
      }
    }
    setStep(s => Math.min(s + 1, steps.length - 1));
  };
  const steps = [
    { title: 'Identificação', description: 'Como devemos te chamar?' },
    { title: 'A Disciplina', description: 'O que vais estudar hoje?' },
    { title: 'O Ritmo', description: 'Quanto tempo pretendes dedicar?' },
    { title: 'A Meta', description: 'Qual é o teu grande objectivo?' }
  ];

  const prevStep = () => setStep(s => Math.max(s - (profile ? 1 : 0), profile ? 1 : 0));

  const isStepValid = () => {
    if (step === 0) return formData.studentName && formData.studentClass;
    if (step === 1) return formData.subject;
    if (step === 2) return formData.timePerDay;
    if (step === 3) return formData.objective;
    return false;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-700 blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-200 shadow-2xl text-center relative z-10"
        >
          <div className="bg-indigo-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-200">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold text-slate-900 mb-4 tracking-tight">Estuda Ao</h1>
          <p className="text-slate-500 mb-10 leading-relaxed">
            O teu mentor de excelência académica em Angola. <br />
            Entra para criar e salvar os teus planos de estudo.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={login}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-100 group"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
              Continuar com E-mail
              <Rocket className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
            <p className="text-[11px] text-slate-400">
              Ao entrar, aceitas os nossos termos de uso para fins educacionais.
            </p>
          </div>
          
          <div className="mt-12 pt-8 border-t border-slate-50">
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-slate-900">UAN / UPRA</span>
                <span className="text-[10px] text-slate-400 uppercase">Foco Académico</span>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-slate-900">80/20</span>
                <span className="text-[10px] text-slate-400 uppercase">Prática Intensa</span>
              </div>
            </div>
          </div>
        </motion.div>
        
        <p className="mt-8 text-[10px] text-slate-300 uppercase tracking-widest font-bold z-10">
          Feito com ❤️ por Luanda Labs • 2026
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-display font-bold text-slate-900">Estuda Ao</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {profile && (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <UserIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{profile.studentName}</span>
              </div>
            )}
            <button 
              onClick={logout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
            {plan && (
              <button 
                onClick={() => { setPlan(null); setStep(1); }}
                className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
              >
                Novo Plano
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 md:py-12">
        <AnimatePresence mode="wait">
          {!plan ? (
            <motion.div
              key="form-container"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
            >
              {/* Info Column */}
              <div className="lg:col-span-12 xl:col-span-5 space-y-6">
                <div>
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 leading-tight">
                    O teu futuro começa com um <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-4">bom plano.</span>
                  </h2>
                  <p className="mt-4 text-slate-500 text-base md:text-lg leading-relaxed">
                    Personalizamos o teu estudo com base no currículo de Angola e foco total em exercícios práticos.
                  </p>
                </div>

                {/* Progress Visual */}
                <div className="relative pt-4">
                  <div className="flex justify-between mb-2">
                    {steps.map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-1/4 h-1.5 rounded-full mx-0.5 transition-all duration-500 ${
                          i <= step ? "bg-indigo-600" : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Início</span>
                    <span>Meta</span>
                  </div>
                </div>

                  <div className="hidden lg:block space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="bg-emerald-100 p-2 rounded-xl">
                      <Sparkles className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">100% Personalizado</h4>
                      <p className="text-xs text-slate-500 mt-1">Levamos em conta a tua classe e o teu nível actual de conhecimento.</p>
                    </div>
                  </div>

                  {savedPlans.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pl-1">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Biblioteca Offline</h4>
                        <span className="text-[10px] text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full">Salvo no teu Browser</span>
                      </div>
                      <div className="max-h-80 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {savedPlans.map(p => (
                          <div 
                            key={p.id}
                            onClick={() => { setPlan(p.plan); setFormData({...formData, studentName: p.studentName, studentClass: p.studentClass, subject: p.subject}); }}
                            className="group p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-2.5 rounded-xl shadow-sm">
                                <BookOpen className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <h5 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{p.subject}</h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {p.date}
                                  </span>
                                  <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                  <span className="text-[10px] font-medium text-indigo-400">{p.studentClass}</span>
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => deletePlan(p.id, e)}
                              className="p-2 text-slate-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                      <Layout className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                      <p className="text-xs text-slate-400 font-medium">Os teus planos guardados aparecerão aqui para consulta offline.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Wizard Column */}
              <div className="lg:col-span-7">
                <div className="bg-white rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-100 overflow-hidden">
                  <div className="bg-slate-900 px-6 md:px-8 py-5 md:py-6 text-white">
                    <h3 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Passo {step + 1} de {steps.length}</h3>
                    <h2 className="text-lg md:text-xl font-display font-bold">{steps[step].title}</h2>
                    <p className="text-slate-400 text-xs md:text-sm mt-1">{steps[step].description}</p>
                  </div>

                  <div className="p-6 md:p-8 min-h-[250px] md:min-h-[300px]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        {step === 0 && (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Qual é o teu nome?</label>
                              <input
                                autoFocus
                                type="text"
                                name="studentName"
                                value={formData.studentName}
                                onChange={handleInputChange}
                                placeholder="Ex: Manuel dos Santos"
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-lg transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2 font-display">Em que classe estás?</label>
                              <input
                                type="text"
                                name="studentClass"
                                value={formData.studentClass}
                                onChange={handleInputChange}
                                placeholder="Ex: 12ª Classe, Puniv..."
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-lg transition-all"
                              />
                            </div>
                          </div>
                        )}

                        {step === 1 && (
                          <div className="space-y-6">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">O que pretendes estudar?</label>
                              <input
                                autoFocus
                                type="text"
                                name="subject"
                                value={formData.subject}
                                onChange={handleInputChange}
                                placeholder="Ex: Matemática, Física, Biologia..."
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-lg transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-3">Qual é o teu nível nesta matéria?</label>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {['iniciante', 'intermediário', 'avançado'].map((lvl) => (
                                  <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, level: lvl }))}
                                    className={`px-4 py-4 rounded-xl border-2 transition-all text-sm font-bold flex flex-col items-center gap-2 ${
                                      formData.level === lvl 
                                      ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                                      : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                                    }`}
                                  >
                                    <span className="capitalize">{lvl === 'iniciante' ? 'Novato' : lvl === 'intermediário' ? 'No Caminho' : 'Maduro'}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {step === 2 && (
                          <div className="space-y-6">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Quantas horas tens por dia?</label>
                              <input
                                autoFocus
                                type="text"
                                name="timePerDay"
                                value={formData.timePerDay}
                                onChange={handleInputChange}
                                placeholder="Ex: 2 horas, 45 minutos..."
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-lg transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Tens uma data limite? (Opcional)</label>
                              <input
                                type="date"
                                name="deadline"
                                value={formData.deadline}
                                onChange={handleInputChange}
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                              />
                            </div>
                          </div>
                        )}

                        {step === 3 && (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Para que estás a estudar?</label>
                              <textarea
                                autoFocus
                                name="objective"
                                value={formData.objective}
                                rows={4}
                                onChange={handleInputChange}
                                placeholder="Ex: Passar no exame da UAN, teste de Geometria, aprender do zero..."
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-lg transition-all resize-none"
                              />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="px-6 md:px-8 py-5 md:py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={prevStep}
                      className={`px-4 md:px-6 py-2 font-bold text-slate-400 hover:text-slate-600 transition-colors ${step === 0 ? "invisible" : "visible"}`}
                    >
                      Voltar
                    </button>
                    
                    {step < steps.length - 1 ? (
                      <button
                        type="button"
                        onClick={nextStep}
                        disabled={!isStepValid() || profileSaving}
                        className="bg-indigo-600 text-white px-6 md:px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-100"
                      >
                        {profileSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            Próximo
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!isStepValid() || loading}
                        className="bg-slate-900 text-white px-6 md:px-10 py-3 md:py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl shadow-slate-200"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                            <span className="text-sm md:text-base">Gerando...</span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm md:text-base">Gerar Plano</span>
                            <Rocket className="w-4 h-4 md:w-5 md:h-5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
                    {error}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="plan-result"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white p-6 md:p-12 rounded-2xl md:rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 md:p-8 space-x-2">
                  <button 
                    onClick={() => window.print()}
                    className="p-2 md:p-3 bg-slate-50 text-slate-400 rounded-xl md:rounded-2xl hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
                    title="Imprimir"
                  >
                    <Layout className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
                
                <div className="mb-6 md:mb-10 pb-4 md:pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="bg-indigo-600 p-1.5 md:p-2 rounded-lg md:rounded-xl">
                      <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-[0.15em] md:tracking-[0.2em] uppercase">Plano Estruturado Estuda Ao</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-900 leading-tight">
                    Aqui está o teu roteiro, <span className="text-indigo-600">{formData.studentName}</span>.
                  </h1>
                </div>

                <div className="markdown-body">
                  <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{plan}</Markdown>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Estás pronto para começar?</h4>
                    <p className="text-xs text-slate-500">Segue cada passo e verás os resultados brevemente.</p>
                  </div>
                  <button 
                    onClick={() => { setPlan(null); setStep(0); }}
                    className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
                  >
                    Criar Novo Plano
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-12 border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
            <GraduationCap className="w-5 h-5" />
            <span className="font-display font-bold">Estuda Ao</span>
          </div>
          <p className="text-sm text-slate-400">
            © 2026 Assistente inteligente de estudos. Luanda labs
          </p>
        </div>
      </footer>
    </div>
  );
}
