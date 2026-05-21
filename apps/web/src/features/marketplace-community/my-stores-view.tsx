"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Store,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Loader2,
  PlusCircle
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import { fetchCommunityStores } from "@alvo/firebase";
import type { CommunityStore, TenantContext } from "@alvo/types";

export function MyStoresView() {
  const { firebaseConfig, organizationId, firebaseReady, tenantReady, user } = useAppAuth();
  const [stores, setStores] = useState<CommunityStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    async function loadStores() {
      if (!firebaseReady || !tenantReady || !user) return;
      try {
        setLoading(true);
        const context: TenantContext = { organizationId };
        const allStores = await fetchCommunityStores(firebaseConfig, context, 200);
        
        // Filter by owner
        const myStores = allStores.filter(store => 
          store.ownerId === (user.personId || user.id)
        );
        setStores(myStores);
      } catch (error) {
        console.error("Error loading stores:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStores();
  }, [firebaseConfig, organizationId, firebaseReady, tenantReady, user]);

  const filteredStores = stores.filter(store => {
    if (filter === "all") return true;
    return store.status === filter;
  });

  const stats = {
    total: stores.length,
    approved: stores.filter(s => s.status === "approved").length,
    pending: stores.filter(s => s.status === "pending").length,
    rejected: stores.filter(s => s.status === "rejected").length
  };

  const getStatusBadge = (status: CommunityStore["status"]) => {
    switch (status) {
      case "approved":
        return { label: "Aprovada", color: "#10b981", icon: CheckCircle };
      case "pending":
        return { label: "Pendente", color: "#f59e0b", icon: Clock };
      case "rejected":
        return { label: "Rejeitada", color: "#ef4444", icon: AlertCircle };
      case "suspended":
        return { label: "Suspensa", color: "#6b7280", icon: AlertCircle };
      default:
        return { label: status, color: "#999", icon: AlertCircle };
    }
  };

  return (
    <main className="my-stores-container">
      <div className="page-header">
        <div className="header-content">
          <div className="eyebrow">
            <Store size={14} />
            Gerenciamento
          </div>
          <h1>Minhas Lojas</h1>
          <p>Gerencie suas lojas e promoções na comunidade</p>
        </div>

        <Link href="/marketplace-community/new" className="btn-create">
          <Plus size={18} />
          Criar Nova Loja
        </Link>
      </div>

      {/* Stats */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Lojas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.approved}</div>
          <div className="stat-label">Aprovadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pendentes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.rejected}</div>
          <div className="stat-label">Rejeitadas</div>
        </div>
      </section>

      {/* Filters */}
      <section className="filters">
        <button 
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          Todas
        </button>
        <button 
          className={`filter-btn ${filter === "approved" ? "active" : ""}`}
          onClick={() => setFilter("approved")}
        >
          Aprovadas
        </button>
        <button 
          className={`filter-btn ${filter === "pending" ? "active" : ""}`}
          onClick={() => setFilter("pending")}
        >
          Pendentes
        </button>
        <button 
          className={`filter-btn ${filter === "rejected" ? "active" : ""}`}
          onClick={() => setFilter("rejected")}
        >
          Rejeitadas
        </button>
      </section>

      {loading ? (
        <div className="loading-container">
          <Loader2 className="spinner" />
          <p>Carregando suas lojas...</p>
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="empty-state">
          {stores.length === 0 ? (
            <>
              <PlusCircle size={48} opacity={0.3} />
              <h3>Você ainda não tem lojas</h3>
              <p>Crie sua primeira loja para começar a anunciar seus produtos e serviços!</p>
              <Link href="/marketplace-community/new" className="btn-create-empty">
                Criar Loja
              </Link>
            </>
          ) : (
            <>
              <Store size={48} opacity={0.3} />
              <h3>Nenhuma loja encontrada neste filtro</h3>
              <p>Tente ajustar seus filtros</p>
            </>
          )}
        </div>
      ) : (
        <section className="stores-list">
          {filteredStores.map(store => {
            const statusInfo = getStatusBadge(store.status);
            const StatusIcon = statusInfo.icon;

            return (
              <article key={store.id} className="store-list-item">
                <div className="store-image">
                  {store.bannerImageUrl ? (
                    <img src={store.bannerImageUrl} alt={store.name} />
                  ) : (
                    <div className="image-placeholder">
                      <Store size={32} opacity={0.2} />
                    </div>
                  )}
                </div>

                <div className="store-info">
                  <div className="store-header">
                    <div>
                      <h3>{store.name}</h3>
                      <p className="store-description">{store.description.substring(0, 100)}...</p>
                    </div>
                    <div className="status-badge" style={{ background: statusInfo.color }}>
                      <StatusIcon size={16} />
                      {statusInfo.label}
                    </div>
                  </div>

                  <div className="store-meta">
                    <div className="meta-item">
                      <span className="label">Categoria:</span>
                      <span className="value">{store.category}</span>
                    </div>
                    {store.contact?.city && (
                      <div className="meta-item">
                        <span className="label">Local:</span>
                        <span className="value">{store.contact.address?.city}</span>
                      </div>
                    )}
                    <div className="meta-item">
                      <span className="label">Criada em:</span>
                      <span className="value">{new Date(store.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  {store.status === "rejected" && store.rejectionReason && (
                    <div className="rejection-reason">
                      <AlertCircle size={14} />
                      <span><strong>Motivo:</strong> {store.rejectionReason}</span>
                    </div>
                  )}
                </div>

                <div className="store-actions">
                  <Link 
                    href={`/marketplace-community/${store.id}`}
                    className="btn-view"
                  >
                    <ArrowRight size={16} />
                    Ver
                  </Link>
                  <Link 
                    href={`/marketplace-community/${store.id}/edit`}
                    className="btn-edit"
                  >
                    <Edit size={16} />
                    Editar
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <style jsx>{`
        .my-stores-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          gap: 2rem;
        }

        .header-content {
          flex: 1;
        }

        .header-content .eyebrow {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #666;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .header-content h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }

        .header-content p {
          color: #666;
          font-size: 1rem;
        }

        .btn-create {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #d27836;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-create:hover {
          background: #b8632b;
          transform: translateY(-2px);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 0.75rem;
          padding: 1.5rem;
          text-align: center;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #d27836;
          margin-bottom: 0.5rem;
        }

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

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          gap: 1rem;
          color: #999;
        }

        .spinner {
          animation: spin 1s linear infinite;
          width: 2rem;
          height: 2rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          gap: 1rem;
          color: #999;
          text-align: center;
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 0.75rem;
        }

        .empty-state h3 {
          color: #666;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .btn-create-empty {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #d27836;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          text-decoration: none;
          margin-top: 1rem;
          transition: all 0.2s;
        }

        .btn-create-empty:hover {
          background: #b8632b;
          transform: translateY(-2px);
        }

        .stores-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .store-list-item {
          display: grid;
          grid-template-columns: 200px 1fr auto;
          gap: 1.5rem;
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 0.75rem;
          overflow: hidden;
          padding: 1rem;
          transition: all 0.2s;
          align-items: center;
        }

        .store-list-item:hover {
          border-color: #d27836;
          box-shadow: 0 2px 8px rgba(210, 120, 54, 0.1);
        }

        .store-image {
          width: 200px;
          height: 120px;
          background: #f5f5f5;
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .store-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f5f5f5 0%, #efefef 100%);
        }

        .store-info {
          flex: 1;
        }

        .store-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .store-header h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 0.25rem;
        }

        .store-description {
          font-size: 0.875rem;
          color: #666;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          background: #10b981;
          color: white;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .store-meta {
          display: flex;
          gap: 1.5rem;
          font-size: 0.875rem;
          flex-wrap: wrap;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .meta-item .label {
          color: #999;
          font-weight: 500;
        }

        .meta-item .value {
          color: #666;
          font-weight: 500;
        }

        .rejection-reason {
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

        .store-actions {
          display: flex;
          gap: 0.75rem;
        }

        .btn-view,
        .btn-edit {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.625rem 1rem;
          border: 1px solid #e5e5e5;
          background: white;
          border-radius: 0.5rem;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          color: #666;
          white-space: nowrap;
        }

        .btn-view:hover,
        .btn-edit:hover {
          border-color: #d27836;
          color: #d27836;
          background: #faf8f6;
        }

        .btn-edit {
          background: #faf8f6;
        }

        @media (max-width: 1024px) {
          .store-list-item {
            grid-template-columns: 150px 1fr auto;
          }

          .store-image {
            width: 150px;
          }
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: center;
          }

          .btn-create {
            width: 100%;
            justify-content: center;
          }

          .store-list-item {
            grid-template-columns: 1fr;
            padding: 1.25rem;
          }

          .store-header {
            flex-direction: column;
          }

          .store-image {
            width: 100%;
          }

          .store-actions {
            width: 100%;
          }

          .btn-view,
          .btn-edit {
            flex: 1;
            justify-content: center;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </main>
  );
}
