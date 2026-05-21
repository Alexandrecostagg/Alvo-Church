"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Store,
  Search,
  MapPin,
  Instagram,
  Smartphone,
  Globe,
  BadgeCheck,
  Tag,
  ArrowRight,
  Filter,
  Plus,
  Loader2,
  Heart,
  Star,
  ShoppingBag
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import { fetchCommunityStores } from "@alvo/firebase";
import type { CommunityStore, TenantContext } from "@alvo/types";

export function MarketplaceCommunityView() {
  const { firebaseConfig, organizationId, firebaseReady, tenantReady, user } = useAppAuth();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [stores, setStores] = useState<CommunityStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "approved">("approved");

  useEffect(() => {
    async function loadStores() {
      if (!firebaseReady || !tenantReady) return;
      try {
        setLoading(true);
        const context: TenantContext = { organizationId };
        const allStores = await fetchCommunityStores(firebaseConfig, context, 200);
        // Filter by status - show only approved stores to regular users, all to admins/moderators
        const filtered = allStores.filter(store => {
          if (filterStatus === "approved") {
            return store.status === "approved";
          }
          return true;
        });
        setStores(filtered);
      } catch (error) {
        console.error("Error loading community stores:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStores();
  }, [firebaseConfig, organizationId, firebaseReady, tenantReady, filterStatus]);

  const categories = [
    { id: "health", label: "Saúde & Bem-estar", color: "#ef4444", icon: "🏥" },
    { id: "food", label: "Alimentação", color: "#f59e0b", icon: "🍽️" },
    { id: "education", label: "Educação", color: "#3b82f6", icon: "📚" },
    { id: "services", label: "Serviços", color: "#10b981", icon: "🔧" },
    { id: "community", label: "Comunidade", color: "#8b5cf6", icon: "🤝" },
  ];

  const filteredStores = stores.filter(store => {
    const matchesSearch = 
      store.name.toLowerCase().includes(search.toLowerCase()) ||
      store.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !activeCategory || store.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="marketplace-community-container animate-entrance">
      <header className="marketplace-community-header">
        <div className="header-content">
          <div className="eyebrow">
            <ShoppingBag size={14} />
            Economia Colaborativa
          </div>
          <h1>Marketplace da Comunidade</h1>
          <p>Apoie os empreendimentos dos nossos membros! Descubra produtos, serviços e promoções exclusivas de comerciantes congregados.</p>
        </div>

        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar lojas, produtos ou serviços..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="category-pills">
            <button 
              className={`pill ${!activeCategory ? 'active' : ''}`}
              onClick={() => setActiveCategory(null)}
            >
              Todas
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                className={`pill ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                style={{ '--pill-accent': cat.color } as any}
              >
                <span className="pill-icon">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {user && (
          <Link 
            href="/marketplace-community/new"
            className="btn-create-store"
          >
            <Plus size={18} />
            Criar Loja
          </Link>
        )}
      </header>

      {loading && (
        <div className="loading-container">
          <Loader2 className="spinner" />
          <p>Carregando lojas...</p>
        </div>
      )}

      {!loading && filteredStores.length === 0 && (
        <div className="empty-state">
          <ShoppingBag size={48} opacity={0.3} />
          <h3>Nenhuma loja encontrada</h3>
          <p>
            {search || activeCategory 
              ? "Tente ajustar seus filtros de busca"
              : "Seja o primeiro a criar uma loja na comunidade!"}
          </p>
        </div>
      )}

      <section className="stores-grid">
        {filteredStores.map(store => (
          <article key={store.id} className="store-card">
            <div className="store-image-header">
              {store.bannerImageUrl ? (
                <img src={store.bannerImageUrl} alt={store.name} className="store-banner" />
              ) : (
                <div className="placeholder-banner">
                  <Store size={40} opacity={0.2} />
                </div>
              )}
              <div className="store-badge-container">
                {store.status === "approved" && (
                  <span className="status-badge approved">
                    <BadgeCheck size={14} /> Verificado
                  </span>
                )}
                <button className="favorite-btn">
                  <Heart size={18} />
                </button>
              </div>
            </div>

            <div className="store-body">
              <div className="category-tag" style={{ color: categories.find(c => c.id === store.category)?.color }}>
                {categories.find(c => c.id === store.category)?.icon} {categories.find(c => c.id === store.category)?.label}
              </div>
              
              <h3>{store.name}</h3>
              <p className="store-description">{store.description}</p>
              
              <div className="store-meta">
                {store.contact?.address?.city && (
                  <div className="meta-item">
                    <MapPin size={14} />
                    <span>{store.contact.address.city}, {store.contact.address.state}</span>
                  </div>
                )}
              </div>

              <div className="store-contact">
                {store.socialLinks?.whatsapp && (
                  <a href={`https://wa.me/${store.socialLinks.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="contact-link">
                    <Smartphone size={16} />
                  </a>
                )}
                {store.socialLinks?.instagram && (
                  <a href={`https://instagram.com/${store.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="contact-link">
                    <Instagram size={16} />
                  </a>
                )}
                {store.socialLinks?.website && (
                  <a href={store.socialLinks.website} target="_blank" rel="noopener noreferrer" className="contact-link">
                    <Globe size={16} />
                  </a>
                )}
              </div>

              <Link 
                href={`/marketplace-community/${store.id}`}
                className="btn-view-store"
              >
                Ver Loja
                <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        ))}
      </section>

      <style jsx>{`
        .marketplace-community-container {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .marketplace-community-header {
          margin-bottom: 3rem;
        }

        .header-content {
          margin-bottom: 2rem;
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
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #1a1a1a;
        }

        .header-content p {
          font-size: 1.125rem;
          color: #666;
          max-width: 600px;
        }

        .search-bar-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          background: white;
          border: 2px solid #e5e5e5;
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          transition: all 0.2s;
        }

        .search-input-wrapper:focus-within {
          border-color: #d27836;
          box-shadow: 0 0 0 3px rgba(210, 120, 54, 0.1);
        }

        .search-icon {
          color: #999;
          margin-right: 0.75rem;
          flex-shrink: 0;
        }

        .search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 1rem;
          color: #333;
        }

        .search-input::placeholder {
          color: #ccc;
        }

        .category-pills {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .pill {
          padding: 0.625rem 1rem;
          background: white;
          border: 2px solid #e5e5e5;
          border-radius: 2rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          white-space: nowrap;
        }

        .pill:hover {
          border-color: #d27836;
          color: #d27836;
        }

        .pill.active {
          background: var(--pill-accent, #d27836);
          border-color: var(--pill-accent, #d27836);
          color: white;
        }

        .pill-icon {
          font-size: 1.125rem;
        }

        .btn-create-store {
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
          transition: all 0.2s;
          text-decoration: none;
        }

        .btn-create-store:hover {
          background: #b8632b;
          transform: translateY(-2px);
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
        }

        .empty-state h3 {
          color: #666;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .stores-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2rem;
        }

        .store-card {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 0.75rem;
          overflow: hidden;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .store-card:hover {
          border-color: #d27836;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-4px);
        }

        .store-image-header {
          position: relative;
          width: 100%;
          height: 200px;
          background: #f5f5f5;
          overflow: hidden;
        }

        .store-banner {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder-banner {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f5f5f5 0%, #efefef 100%);
        }

        .store-badge-container {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          border-radius: 2rem;
          font-size: 0.75rem;
          font-weight: 600;
          backdrop-filter: blur(10px);
        }

        .status-badge.approved {
          background: rgba(16, 185, 129, 0.9);
          color: white;
        }

        .favorite-btn {
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 2rem;
          width: 2.25rem;
          height: 2.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #ccc;
        }

        .favorite-btn:hover {
          background: white;
          color: #d27836;
          transform: scale(1.1);
        }

        .store-body {
          padding: 1.25rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .category-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          width: fit-content;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .store-body h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }

        .store-description {
          font-size: 0.875rem;
          color: #666;
          margin-bottom: 1rem;
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .store-meta {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #f0f0f0;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #666;
        }

        .meta-item svg {
          color: #d27836;
          flex-shrink: 0;
        }

        .store-contact {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .contact-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.25rem;
          height: 2.25rem;
          background: #f5f5f5;
          border: 1px solid #e5e5e5;
          border-radius: 0.5rem;
          color: #666;
          transition: all 0.2s;
          text-decoration: none;
        }

        .contact-link:hover {
          background: #d27836;
          color: white;
          border-color: #d27836;
        }

        .btn-view-store {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, #d27836 0%, #b8632b 100%);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          width: 100%;
        }

        .btn-view-store:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(210, 120, 54, 0.3);
        }

        @media (max-width: 768px) {
          .marketplace-community-container {
            padding: 1.5rem;
          }

          .header-content h1 {
            font-size: 1.875rem;
          }

          .stores-grid {
            grid-template-columns: 1fr;
          }

          .category-pills {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </main>
  );
}
