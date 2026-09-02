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
  PlusCircle,
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import { fetchCommunityStores } from "@alvo/firebase";
import type { CommunityStore, TenantContext } from "@alvo/types";

const mockStores: CommunityStore[] = [
  {
    id: "store_1",
    organizationId: "org_alvo_demo",
    ownerId: "user_admin_demo",
    name: "Doces & Travessuras",
    description:
      "Os melhores bolos e doces artesanais da comunidade para a sua festa ou café da tarde. Bolos sob encomenda, fatias gourmet e salgados assados.",
    category: "food",
    status: "approved",
    images: [],
    bannerImageUrl:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=400&auto=format&fit=crop",
    contact: { address: { city: "Belém", state: "PA" } },
    socialLinks: { whatsapp: "91999999991", instagram: "doces_travessuras" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function MyStoresView() {
  const { firebaseConfig, organizationId, firebaseReady, tenantReady, user } =
    useAppAuth();
  const [stores, setStores] = useState<CommunityStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");

  useEffect(() => {
    async function loadStores() {
      if (!firebaseReady || !tenantReady || !user) {
        // Fallback to mock stores when offline
        const ownerId = user?.uid || "user_admin_demo";
        setStores(mockStores.map((s) => ({ ...s, ownerId })));
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const context: TenantContext = { organizationId };
        const allStores = await fetchCommunityStores(
          firebaseConfig,
          context,
          200,
        );

        // Filter by owner
        const myStores = allStores.filter(
          (store) => store.ownerId === user.uid,
        );
        setStores(
          myStores.length > 0
            ? myStores
            : mockStores.map((s) => ({ ...s, ownerId: user.uid })),
        );
      } catch (error) {
        console.error("Error loading stores:", error);
        setStores(mockStores.map((s) => ({ ...s, ownerId: user.uid })));
      } finally {
        setLoading(false);
      }
    }
    loadStores();
  }, [firebaseConfig, organizationId, firebaseReady, tenantReady, user]);

  const filteredStores = stores.filter((store) => {
    if (filter === "all") return true;
    return store.status === filter;
  });

  const stats = {
    total: stores.length,
    approved: stores.filter((s) => s.status === "approved").length,
    pending: stores.filter((s) => s.status === "pending").length,
    rejected: stores.filter((s) => s.status === "rejected").length,
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
              <p>
                Crie sua primeira loja para começar a anunciar seus produtos e
                serviços!
              </p>
              <Link
                href="/marketplace-community/new"
                className="btn-create-empty"
              >
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
          {filteredStores.map((store) => {
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
                      <p className="store-description">
                        {store.description.substring(0, 100)}...
                      </p>
                    </div>
                    <div
                      className="status-badge"
                      style={{ background: statusInfo.color }}
                    >
                      <StatusIcon size={16} />
                      {statusInfo.label}
                    </div>
                  </div>

                  <div className="store-meta">
                    <div className="meta-item">
                      <span className="label">Categoria:</span>
                      <span className="value">{store.category}</span>
                    </div>
                    {store.contact?.address?.city && (
                      <div className="meta-item">
                        <span className="label">Local:</span>
                        <span className="value">
                          {store.contact.address?.city}
                        </span>
                      </div>
                    )}
                    <div className="meta-item">
                      <span className="label">Criada em:</span>
                      <span className="value">
                        {new Date(store.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>

                  {store.status === "rejected" && store.rejectionReason && (
                    <div className="rejection-reason">
                      <AlertCircle size={14} />
                      <span>
                        <strong>Motivo:</strong> {store.rejectionReason}
                      </span>
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
          background: #0b0f19;
          color: #f8fafc;
          min-height: 100vh;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2.5rem;
          gap: 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 2rem;
        }

        .header-content {
          flex: 1;
        }

        .header-content .eyebrow {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #f97316;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .header-content h1 {
          font-size: 2.5rem;
          font-weight: 950;
          color: white;
          margin-bottom: 0.5rem;
          letter-spacing: -0.04em;
        }

        .header-content p {
          color: #94a3b8;
          font-size: 1.05rem;
        }

        .btn-create {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #f97316;
          color: white;
          border: none;
          border-radius: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
        }

        .btn-create:hover {
          background: #ea580c;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.25rem;
          margin-bottom: 2.5rem;
        }

        .stat-card {
          background: rgba(30, 41, 59, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1.25rem;
          padding: 1.5rem;
          text-align: center;
          transition: transform 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-card:nth-child(1) {
          border-left: 4px solid #94a3b8;
        }
        .stat-card:nth-child(2) {
          border-left: 4px solid #10b981;
        }
        .stat-card:nth-child(3) {
          border-left: 4px solid #f59e0b;
        }
        .stat-card:nth-child(4) {
          border-left: 4px solid #ef4444;
        }

        .stat-value {
          font-size: 2.25rem;
          font-weight: 900;
          color: white;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.85rem;
          color: #94a3b8;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .filters {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 2.5rem;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 0.625rem 1.25rem;
          background: rgba(30, 41, 59, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 2rem;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          color: #cbd5e1;
        }

        .filter-btn:hover {
          border-color: rgba(255, 255, 255, 0.25);
          color: white;
        }

        .filter-btn.active {
          background: rgba(30, 41, 59, 0.75);
          border-color: #f97316;
          color: white;
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.15);
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6rem 2rem;
          gap: 1.25rem;
          color: #64748b;
        }

        .spinner {
          animation: spin 1s linear infinite;
          width: 2.25rem;
          height: 2.25rem;
          color: #f97316;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6rem 2rem;
          gap: 1rem;
          color: #64748b;
          text-align: center;
          background: rgba(30, 41, 59, 0.15);
          border: 2px dashed rgba(255, 255, 255, 0.06);
          border-radius: 1.5rem;
        }

        .empty-state h3 {
          color: white;
          font-size: 1.25rem;
          font-weight: 800;
        }

        .btn-create-empty {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #f97316;
          color: white;
          border: none;
          border-radius: 0.75rem;
          font-weight: 800;
          text-decoration: none;
          margin-top: 1rem;
          transition: all 0.2s;
        }

        .btn-create-empty:hover {
          background: #ea580c;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);
        }

        .stores-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .store-list-item {
          display: grid;
          grid-template-columns: 200px 1fr auto;
          gap: 2rem;
          background: rgba(30, 41, 59, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 1.5rem;
          overflow: hidden;
          padding: 1.25rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          align-items: center;
        }

        .store-list-item:hover {
          border-color: rgba(255, 255, 255, 0.15);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
          transform: translateY(-4px);
        }

        .store-image {
          width: 200px;
          height: 120px;
          background: #0f172a;
          border-radius: 0.75rem;
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
          background: linear-gradient(
            135deg,
            rgba(30, 41, 59, 0.2) 0%,
            rgba(15, 23, 42, 0.4) 100%
          );
        }

        .store-info {
          flex: 1;
        }

        .store-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .store-header h3 {
          font-size: 1.25rem;
          font-weight: 800;
          color: white;
          margin-bottom: 0.25rem;
          letter-spacing: -0.02em;
        }

        .store-description {
          font-size: 0.9rem;
          color: #94a3b8;
          line-height: 1.5;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.4rem 0.8rem;
          border-radius: 2rem;
          font-size: 0.75rem;
          font-weight: 800;
          white-space: nowrap;
          color: white;
        }

        .store-meta {
          display: flex;
          gap: 1.5rem;
          font-size: 0.85rem;
          flex-wrap: wrap;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .meta-item .label {
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.75rem;
        }

        .meta-item .value {
          color: #cbd5e1;
          font-weight: 500;
        }

        .rejection-reason {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 0.75rem;
          color: #fca5a5;
          font-size: 0.85rem;
          margin-top: 0.75rem;
          width: fit-content;
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
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          border-radius: 0.75rem;
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          color: #cbd5e1;
          white-space: nowrap;
        }

        .btn-view:hover,
        .btn-edit:hover {
          border-color: #f97316;
          color: white;
          background: rgba(249, 115, 22, 0.1);
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.15);
          transform: translateY(-2px);
        }

        .btn-edit {
          background: rgba(255, 255, 255, 0.05);
        }

        @media (max-width: 1024px) {
          .store-list-item {
            grid-template-columns: 150px 1fr auto;
            gap: 1.25rem;
          }

          .store-image {
            width: 150px;
            height: 100px;
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
            gap: 1.25rem;
          }

          .store-header {
            flex-direction: column;
            gap: 0.5rem;
          }

          .store-image {
            width: 100%;
            height: 160px;
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
