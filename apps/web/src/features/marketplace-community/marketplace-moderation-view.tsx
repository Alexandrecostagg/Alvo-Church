"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Ban,
  Loader2,
  ArrowLeft
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import { fetchCommunityStores, fetchCommunityStoreModerationLogs, saveCommunityStore, saveCommunityStoreModerationLog } from "@alvo/firebase";
import type { CommunityStore, CommunityStoreModerationLog, TenantContext } from "@alvo/types";

export function MarketplaceModerationView() {
  const { firebaseConfig, organizationId, firebaseReady, tenantReady, user } = useAppAuth();
  const [stores, setStores] = useState<CommunityStore[]>([]);
  const [logs, setLogs] = useState<CommunityStoreModerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [actioningStore, setActioningStore] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionForm, setShowRejectionForm] = useState<string | null>(null);
  const [generatingDemo, setGeneratingDemo] = useState(false);

  const handleGenerateDemoStores = async () => {
    if (!firebaseReady || !tenantReady || !user) return;
    try {
      setGeneratingDemo(true);
      const context: TenantContext = { organizationId };

      const demoStores: CommunityStore[] = [
        {
          id: `store_demo_1_${Date.now()}`,
          organizationId,
          ownerId: user.uid,
          name: "Padaria Graça e Pão",
          description: "Pães quentinhos artesanais, bolos caseiros deliciosos e cafés especiais feitos com amor por membros da nossa comunidade para abençoar a sua família.",
          category: "food",
          status: "pending",
          images: [],
          bannerImageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=60",
          contact: {
            phone: "+55 11 98888-7777",
            email: "contato@gracaepao.com.br",
            address: {
              street: "Av. Principal",
              number: "123",
              district: "Centro",
              city: "São Paulo",
              state: "SP",
              postalCode: "01000-000"
            }
          },
          socialLinks: {
            whatsapp: "5511988887777",
            instagram: "gracaepao"
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `store_demo_2_${Date.now()}`,
          organizationId,
          ownerId: user.uid,
          name: "Clínica Integrada Aliança",
          description: "Atendimento psicológico de qualidade, fisioterapia e apoio psicoterapêutico com profissionais cristãos altamente qualificados, focado na restauração integral.",
          category: "health",
          status: "pending",
          images: [],
          bannerImageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=60",
          contact: {
            phone: "+55 11 97777-6666",
            email: "clinica@alianca.com.br",
            address: {
              street: "Rua das Oliveiras",
              number: "456",
              district: "Jardins",
              city: "São Paulo",
              state: "SP",
              postalCode: "02000-000"
            }
          },
          socialLinks: {
            whatsapp: "5511977776666",
            instagram: "clinicaalianca"
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `store_demo_3_${Date.now()}`,
          organizationId,
          ownerId: user.uid,
          name: "Getro Digital Code",
          description: "Criação de sites premium, sistemas web avançados, e-commerce de alta conversão e consultoria digital completa para posicionar sua empresa com autoridade.",
          category: "services",
          status: "pending",
          images: [],
          bannerImageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60",
          contact: {
            phone: "+55 11 96666-5555",
            email: "suporte@getrodigital.com.br",
            address: {
              street: "Av. Paulista",
              number: "1000",
              district: "Bela Vista",
              city: "São Paulo",
              state: "SP",
              postalCode: "01310-100"
            }
          },
          socialLinks: {
            whatsapp: "5511966665555",
            instagram: "getrodigital"
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      await Promise.all([
        ...demoStores.map(store => saveCommunityStore(firebaseConfig, context, store)),
        ...demoStores.map(store => {
          const log: CommunityStoreModerationLog = {
            id: `log_demo_${store.id}`,
            organizationId,
            storeId: store.id,
            action: "created",
            moderatedBy: user.uid,
            timestamp: new Date().toISOString()
          };
          return saveCommunityStoreModerationLog(firebaseConfig, context, log);
        })
      ]);

      const [allStores, allLogs] = await Promise.all([
        fetchCommunityStores(firebaseConfig, context, 200),
        fetchCommunityStoreModerationLogs(firebaseConfig, context, undefined, 500)
      ]);
      setStores(allStores);
      setLogs(allLogs);
    } catch (error) {
      console.error("Error generating demo stores:", error);
      alert("Erro ao gerar lojas de teste no Firestore. Verifique o console.");
    } finally {
      setGeneratingDemo(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      if (!firebaseReady || !tenantReady) return;
      try {
        setLoading(true);
        const context: TenantContext = { organizationId };
        const [allStores, allLogs] = await Promise.all([
          fetchCommunityStores(firebaseConfig, context, 200),
          fetchCommunityStoreModerationLogs(firebaseConfig, context, undefined, 500)
        ]);
        setStores(allStores);
        setLogs(allLogs);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [firebaseConfig, organizationId, firebaseReady, tenantReady]);

  const filteredStores = stores.filter(store => {
    if (filterStatus === "all") return true;
    return store.status === filterStatus;
  });

  const handleApprove = async (storeId: string) => {
    if (!user) return;
    try {
      setActioningStore(storeId);
      const context: TenantContext = { organizationId };
      const store = stores.find(s => s.id === storeId);
      if (!store) throw new Error("Store not found");

      const now = new Date().toISOString();
      const updatedStore: CommunityStore = {
        ...store,
        status: "approved",
        approvedAt: now
      };

      const log: CommunityStoreModerationLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        organizationId,
        storeId,
        action: "approved",
        moderatedBy: user.uid,
        timestamp: now
      };

      await Promise.all([
        saveCommunityStore(firebaseConfig, context, updatedStore),
        saveCommunityStoreModerationLog(firebaseConfig, context, log)
      ]);

      setStores(prev => prev.map(s => s.id === storeId ? updatedStore : s));
      setLogs(prev => [log, ...prev]);
    } catch (error) {
      console.error("Error approving store:", error);
    } finally {
      setActioningStore(null);
    }
  };

  const handleReject = async (storeId: string) => {
    if (!user || !rejectionReason.trim()) {
      alert("Por favor, forneça um motivo para a rejeição");
      return;
    }
    try {
      setActioningStore(storeId);
      const context: TenantContext = { organizationId };
      const store = stores.find(s => s.id === storeId);
      if (!store) throw new Error("Store not found");

      const now = new Date().toISOString();
      const updatedStore: CommunityStore = {
        ...store,
        status: "rejected",
        rejectionReason
      };

      const log: CommunityStoreModerationLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        organizationId,
        storeId,
        action: "rejected",
        moderatedBy: user.uid,
        reason: rejectionReason,
        timestamp: now
      };

      await Promise.all([
        saveCommunityStore(firebaseConfig, context, updatedStore),
        saveCommunityStoreModerationLog(firebaseConfig, context, log)
      ]);

      setStores(prev => prev.map(s => s.id === storeId ? updatedStore : s));
      setLogs(prev => [log, ...prev]);
      setShowRejectionForm(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Error rejecting store:", error);
    } finally {
      setActioningStore(null);
    }
  };

  const handleSuspend = async (storeId: string) => {
    if (!user) return;
    try {
      setActioningStore(storeId);
      const context: TenantContext = { organizationId };
      const store = stores.find(s => s.id === storeId);
      if (!store) throw new Error("Store not found");

      const now = new Date().toISOString();
      const updatedStore: CommunityStore = {
        ...store,
        status: "suspended",
        suspensionReason: "Suspendida pela moderação"
      };

      const log: CommunityStoreModerationLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        organizationId,
        storeId,
        action: "suspended",
        moderatedBy: user.uid,
        previousStatus: store.status,
        timestamp: now
      };

      await Promise.all([
        saveCommunityStore(firebaseConfig, context, updatedStore),
        saveCommunityStoreModerationLog(firebaseConfig, context, log)
      ]);

      setStores(prev => prev.map(s => s.id === storeId ? updatedStore : s));
      setLogs(prev => [log, ...prev]);
    } catch (error) {
      console.error("Error suspending store:", error);
    } finally {
      setActioningStore(null);
    }
  };

  const stats = {
    pending: stores.filter(s => s.status === "pending").length,
    approved: stores.filter(s => s.status === "approved").length,
    rejected: stores.filter(s => s.status === "rejected").length,
    suspended: stores.filter(s => s.status === "suspended").length
  };

  const getStatusIcon = (status: CommunityStore["status"]) => {
    switch (status) {
      case "pending":
        return <Clock size={16} />;
      case "approved":
        return <CheckCircle size={16} />;
      case "rejected":
        return <XCircle size={16} />;
      case "suspended":
        return <Ban size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="moderation-container loading">
        <Loader2 className="spinner" />
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <main className="moderation-container">
      <Link href="/marketplace-community" className="back-link">
        <ArrowLeft size={18} /> Voltar
      </Link>

      <div className="moderation-header">
        <h1>Painel de Moderação - Marketplace</h1>
        <p>Revise e aprove lojas da comunidade</p>
      </div>

      {/* Stats */}
      <section className="stats-grid">
        <div className="stat-card pending">
          <div className="stat-count">{stats.pending}</div>
          <div className="stat-label">Pendentes</div>
        </div>
        <div className="stat-card approved">
          <div className="stat-count">{stats.approved}</div>
          <div className="stat-label">Aprovadas</div>
        </div>
        <div className="stat-card rejected">
          <div className="stat-count">{stats.rejected}</div>
          <div className="stat-label">Rejeitadas</div>
        </div>
        <div className="stat-card suspended">
          <div className="stat-count">{stats.suspended}</div>
          <div className="stat-label">Suspensas</div>
        </div>
      </section>

      {/* Filters */}
      <section className="filters">
        {(["pending", "approved", "rejected", "all"] as const).map(status => (
          <button
            key={status}
            className={`filter-btn ${filterStatus === status ? "active" : ""}`}
            onClick={() => setFilterStatus(status)}
          >
            {status === "pending" && "⏳ Pendentes"}
            {status === "approved" && "✓ Aprovadas"}
            {status === "rejected" && "✗ Rejeitadas"}
            {status === "all" && "Todas"}
          </button>
        ))}
      </section>

      {/* Stores to Moderate */}
      <section className="stores-queue">
        {filteredStores.length === 0 ? (
          <div className="empty-queue">
            <CheckCircle size={48} opacity={0.3} />
            <p>{filterStatus === "pending" ? "Nenhuma loja aguardando aprovação!" : "Nenhuma loja neste status"}</p>
            {filterStatus === "pending" && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', border: '1px dashed #e5e5e5', borderRadius: '0.75rem', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px', margin: '1rem auto 0 auto' }}>
                <p style={{ fontSize: '0.875rem', color: '#666', lineHeight: '1.4' }}>
                  Para fins de teste e demonstração do sistema, você pode injetar lojas de demonstração diretamente no seu Firestore em 1 clique!
                </p>
                <button 
                  className="action-btn approve"
                  onClick={handleGenerateDemoStores}
                  disabled={generatingDemo}
                  style={{ alignSelf: 'center', marginTop: '0.5rem', padding: '0.5rem 1rem' }}
                >
                  {generatingDemo ? (
                    <>
                      <Loader2 size={16} className="spinner-small" />
                      <span>Gerando Lojas...</span>
                    </>
                  ) : (
                    <span>⚙️ Gerar Lojas de Teste no Firestore</span>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="stores-list">
            {filteredStores.map(store => (
              <div key={store.id} className="store-card">
                <div className="store-preview">
                  {store.bannerImageUrl && (
                    <img src={store.bannerImageUrl} alt={store.name} />
                  )}
                </div>

                <div className="store-details">
                  <div className="store-header">
                    <h3>{store.name}</h3>
                    <div className={`status-badge ${store.status}`}>
                      {getStatusIcon(store.status)}
                      {store.status === "pending" && "Pendente"}
                      {store.status === "approved" && "Aprovada"}
                      {store.status === "rejected" && "Rejeitada"}
                      {store.status === "suspended" && "Suspensa"}
                    </div>
                  </div>

                  <p className="store-description">{store.description}</p>

                  <div className="store-info">
                    <span className="info-item">📁 {store.category}</span>
                    {store.contact?.address?.city && (
                      <span className="info-item">📍 {store.contact.address.city}</span>
                    )}
                    <span className="info-item">📅 {new Date(store.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>

                  {store.rejectionReason && (
                    <div className="rejection-box">
                      <AlertCircle size={14} />
                      <span><strong>Rejeição:</strong> {store.rejectionReason}</span>
                    </div>
                  )}

                  {store.suspensionReason && (
                    <div className="suspension-box">
                      <Ban size={14} />
                      <span><strong>Suspensão:</strong> {store.suspensionReason}</span>
                    </div>
                  )}
                </div>

                <div className="store-actions">
                  <Link 
                    href={`/marketplace-community/${store.id}`}
                    className="action-btn view"
                    target="_blank"
                  >
                    <Eye size={16} />
                    Visualizar
                  </Link>

                  {store.status === "pending" && (
                    <>
                      <button
                        className="action-btn approve"
                        onClick={() => handleApprove(store.id)}
                        disabled={actioningStore === store.id}
                      >
                        {actioningStore === store.id ? (
                          <Loader2 size={16} className="spinner-small" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        Aprovar
                      </button>

                      {showRejectionForm === store.id ? (
                        <div className="rejection-form">
                          <textarea
                            placeholder="Motivo da rejeição..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={2}
                          />
                          <div className="form-actions">
                            <button
                              className="action-btn confirm"
                              onClick={() => handleReject(store.id)}
                              disabled={actioningStore === store.id}
                            >
                              Confirmar
                            </button>
                            <button
                              className="action-btn cancel"
                              onClick={() => {
                                setShowRejectionForm(null);
                                setRejectionReason("");
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="action-btn reject"
                          onClick={() => setShowRejectionForm(store.id)}
                        >
                          <XCircle size={16} />
                          Rejeitar
                        </button>
                      )}
                    </>
                  )}

                  {store.status === "approved" && (
                    <button
                      className="action-btn suspend"
                      onClick={() => handleSuspend(store.id)}
                      disabled={actioningStore === store.id}
                    >
                      {actioningStore === store.id ? (
                        <Loader2 size={16} className="spinner-small" />
                      ) : (
                        <Ban size={16} />
                      )}
                      Suspender
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Logs */}
      {logs.length > 0 && (
        <section className="recent-logs">
          <h2>Atividade Recente</h2>
          <div className="logs-list">
            {logs.slice(0, 10).map(log => (
              <div key={log.id} className="log-item">
                <div className="log-icon" style={{
                  background: log.action === "approved" ? "#eff6ff" :
                             log.action === "rejected" ? "#fef2f2" :
                             log.action === "suspended" ? "#f9fafb" : "#fffbeb"
                }}>
                  {log.action === "approved" && <CheckCircle size={16} color="#10b981" />}
                  {log.action === "rejected" && <XCircle size={16} color="#ef4444" />}
                  {log.action === "suspended" && <Ban size={16} color="#6b7280" />}
                  {log.action === "created" && <Clock size={16} color="#f59e0b" />}
                </div>
                <div className="log-content">
                  <div className="log-action">
                    {log.action === "approved" && "Loja aprovada"}
                    {log.action === "rejected" && "Loja rejeitada"}
                    {log.action === "suspended" && "Loja suspensa"}
                    {log.action === "created" && "Loja criada"}
                  </div>
                  <div className="log-time">{new Date(log.timestamp).toLocaleString('pt-BR')}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <style jsx>{`
        .moderation-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .moderation-container.loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          gap: 1rem;
          color: #999;
        }

        .spinner {
          animation: spin 1s linear infinite;
          width: 2rem;
          height: 2rem;
        }

        .spinner-small {
          animation: spin 1s linear infinite;
          width: 1rem;
          height: 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          margin-bottom: 1.5rem;
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 0.5rem;
          color: #666;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s;
        }

        .back-link:hover {
          border-color: #d27836;
          color: #d27836;
        }

        .moderation-header {
          margin-bottom: 2rem;
        }

        .moderation-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }

        .moderation-header p {
          color: #666;
          font-size: 1rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 0.75rem;
          padding: 1.5rem;
          text-align: center;
          border-left: 4px solid #999;
        }

        .stat-card.pending {
          border-left-color: #f59e0b;
        }

        .stat-card.approved {
          border-left-color: #10b981;
        }

        .stat-card.rejected {
          border-left-color: #ef4444;
        }

        .stat-card.suspended {
          border-left-color: #6b7280;
        }

        .stat-count {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .stat-card.pending .stat-count { color: #f59e0b; }
        .stat-card.approved .stat-count { color: #10b981; }
        .stat-card.rejected .stat-count { color: #ef4444; }
        .stat-card.suspended .stat-count { color: #6b7280; }

        .stat-label {
          font-size: 0.875rem;
          color: #666;
          font-weight: 500;
        }

        .filters {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 0.625rem 1rem;
          background: white;
          border: 2px solid #e5e5e5;
          border-radius: 2rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          color: #666;
        }

        .filter-btn:hover {
          border-color: #d27836;
          color: #d27836;
        }

        .filter-btn.active {
          background: #d27836;
          border-color: #d27836;
          color: white;
        }

        .stores-queue {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 0.75rem;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .empty-queue {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          gap: 1rem;
          color: #999;
          text-align: center;
        }

        .stores-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .store-card {
          border: 1px solid #e5e5e5;
          border-radius: 0.75rem;
          overflow: hidden;
          display: grid;
          grid-template-columns: 200px 1fr auto;
          gap: 1.5rem;
          padding: 1rem;
          align-items: center;
          transition: all 0.2s;
        }

        .store-card:hover {
          border-color: #d27836;
          box-shadow: 0 2px 8px rgba(210, 120, 54, 0.1);
        }

        .store-preview {
          width: 200px;
          height: 120px;
          background: #f5f5f5;
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .store-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .store-details {
          flex: 1;
        }

        .store-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .store-header h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1a1a1a;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          background: #f0f0f0;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .status-badge.pending {
          background: #fef3c7;
          color: #b45309;
        }

        .status-badge.approved {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge.rejected {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-badge.suspended {
          background: #f3f4f6;
          color: #374151;
        }

        .store-description {
          font-size: 0.875rem;
          color: #666;
          margin-bottom: 0.75rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .store-info {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: #666;
          flex-wrap: wrap;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .rejection-box,
        .suspension-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 0.375rem;
          color: #c33;
          font-size: 0.875rem;
          margin-top: 0.75rem;
        }

        .suspension-box {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          color: #374151;
        }

        .store-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.625rem 1rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          white-space: nowrap;
          border: 1px solid transparent;
        }

        .action-btn.view {
          background: white;
          border: 1px solid #e5e5e5;
          color: #666;
        }

        .action-btn.view:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #eff6ff;
        }

        .action-btn.approve {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .action-btn.approve:hover:not(:disabled) {
          background: #bbf7d0;
        }

        .action-btn.reject {
          background: white;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .action-btn.reject:hover {
          background: #fee2e2;
        }

        .action-btn.suspend {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .action-btn.suspend:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .action-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .rejection-form {
          grid-column: 1 / -1;
          background: #fef3c7;
          border: 1px solid #fde047;
          border-radius: 0.5rem;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .rejection-form textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #fcd34d;
          border-radius: 0.375rem;
          font-family: inherit;
          resize: none;
        }

        .rejection-form textarea:focus {
          outline: none;
          border-color: #f59e0b;
          box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.1);
        }

        .form-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn.confirm {
          flex: 1;
          background: #ef4444;
          color: white;
        }

        .action-btn.confirm:hover:not(:disabled) {
          background: #dc2626;
        }

        .action-btn.cancel {
          flex: 1;
          background: white;
          border: 1px solid #fcd34d;
          color: #b45309;
        }

        .action-btn.cancel:hover {
          background: #fffbeb;
        }

        .recent-logs {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 0.75rem;
          padding: 2rem;
        }

        .recent-logs h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: #1a1a1a;
        }

        .logs-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .log-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }

        .log-icon {
          width: 2.5rem;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.5rem;
          flex-shrink: 0;
        }

        .log-content {
          flex: 1;
        }

        .log-action {
          font-weight: 500;
          color: #333;
          font-size: 0.9375rem;
        }

        .log-time {
          font-size: 0.75rem;
          color: #999;
          margin-top: 0.25rem;
        }

        @media (max-width: 1024px) {
          .store-card {
            grid-template-columns: 150px 1fr;
            gap: 1rem;
          }

          .store-preview {
            width: 150px;
          }

          .store-actions {
            grid-column: 1 / -1;
            flex-direction: row;
          }

          .rejection-form {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 768px) {
          .moderation-container {
            padding: 1.5rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .store-card {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .store-preview {
            width: 100%;
            height: 200px;
          }

          .store-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .store-actions {
            grid-column: 1 / -1;
            flex-direction: row;
            gap: 0.5rem;
          }

          .action-btn {
            flex: 1;
            font-size: 0.75rem;
            padding: 0.5rem 0.75rem;
          }

          .action-btn svg {
            width: 14px;
            height: 14px;
          }

          .form-actions {
            gap: 0.375rem;
          }
        }
      `}</style>
    </main>
  );
}
