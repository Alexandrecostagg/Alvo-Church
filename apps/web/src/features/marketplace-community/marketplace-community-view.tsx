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

const mockStores: CommunityStore[] = [
  {
    id: "store_1",
    organizationId: "org_alvo_demo",
    ownerId: "user_admin_demo",
    name: "Doces & Travessuras",
    description: "Os melhores bolos e doces artesanais da comunidade para a sua festa ou café da tarde. Bolos sob encomenda, fatias gourmet e salgados assados.",
    category: "food",
    status: "approved",
    images: [],
    bannerImageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=400&auto=format&fit=crop",
    contact: { address: { city: "Belém", state: "PA" } },
    socialLinks: { whatsapp: "91999999991", instagram: "doces_travessuras" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "store_2",
    organizationId: "org_alvo_demo",
    ownerId: "user_admin_demo",
    name: "Conecta Informática",
    description: "Manutenção de computadores, notebooks e consultoria de TI com preço justo e qualidade para abençoar a comunidade.",
    category: "services",
    status: "approved",
    images: [],
    bannerImageUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=400&auto=format&fit=crop",
    contact: { address: { city: "Belém", state: "PA" } },
    socialLinks: { whatsapp: "91999999992", website: "https://conecta.alvo.app" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export function MarketplaceCommunityView() {
  const { firebaseConfig, organizationId, firebaseReady, tenantReady, user } = useAppAuth();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [stores, setStores] = useState<CommunityStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "approved">("approved");

  useEffect(() => {
    async function loadStores() {
      if (!firebaseReady || !tenantReady) {
        setStores(mockStores);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const context: TenantContext = { organizationId };
        const allStores = await fetchCommunityStores(firebaseConfig, context, 200);
        const activeStores = allStores.length > 0 ? allStores : mockStores;
        // Filter by status - show only approved stores to regular users, all to admins/moderators
        const filtered = activeStores.filter(store => {
          if (filterStatus === "approved") {
            return store.status === "approved";
          }
          return true;
        });
        setStores(filtered);
      } catch (error) {
        console.error("Error loading community stores:", error);
        setStores(mockStores.filter(s => filterStatus === "approved" ? s.status === "approved" : true));
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
          background: #0b0f19;
          color: #f8fafc;
          min-height: 100vh;
        }

        .marketplace-community-header {
          margin-bottom: 3rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .header-content {
          margin-bottom: 0.5rem;
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
          margin-bottom: 0.75rem;
          color: white;
          letter-spacing: -0.04em;
        }

        .header-content p {
          font-size: 1.05rem;
          color: #94a3b8;
          max-width: 800px;
          line-height: 1.6;
        }

        .search-bar-container {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-top: 1rem;
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 1rem;
          padding: 0.875rem 1.25rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          max-width: 600px;
        }

        .search-input-wrapper:focus-within {
          border-color: #f97316;
          box-shadow: 0 0 15px rgba(249, 115, 22, 0.15);
        }

        .search-icon {
          color: #64748b;
          margin-right: 0.75rem;
          flex-shrink: 0;
        }

        .search-input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 1rem;
          color: white;
        }

        .search-input::placeholder {
          color: #475569;
        }

        .category-pills {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .pill {
          padding: 0.625rem 1.25rem;
          background: rgba(30, 41, 59, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 2rem;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #cbd5e1;
          white-space: nowrap;
        }

        .pill:hover {
          border-color: rgba(255, 255, 255, 0.2);
          color: white;
          background: rgba(30, 41, 59, 0.55);
        }

        .pill.active {
          background: rgba(30, 41, 59, 0.7);
          border-color: var(--pill-accent, #f97316);
          color: white;
          box-shadow: 0 0 12px rgba(249, 115, 22, 0.15);
          border-width: 1.5px;
        }

        .pill-icon {
          font-size: 1.125rem;
        }

        .btn-create-store {
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
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          width: fit-content;
        }

        .btn-create-store:hover {
          background: #ea580c;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);
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
          to { transform: rotate(360deg); }
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
          border-radius: 24px;
        }

        .empty-state h3 {
          color: white;
          font-size: 1.25rem;
          font-weight: 800;
        }

        .stores-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
          gap: 2rem;
          margin-top: 1rem;
        }

        .store-card {
          background: rgba(30, 41, 59, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 1.5rem;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .store-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
          transform: translateY(-6px);
        }

        .store-image-header {
          position: relative;
          width: 100%;
          height: 190px;
          background: #0f172a;
          overflow: hidden;
        }

        .store-banner {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s;
        }

        .store-card:hover .store-banner {
          transform: scale(1.05);
        }

        .placeholder-banner {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.2) 0%, rgba(15, 23, 42, 0.4) 100%);
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
          padding: 0.4rem 0.8rem;
          border-radius: 2rem;
          font-size: 0.75rem;
          font-weight: 800;
          backdrop-filter: blur(10px);
        }

        .status-badge.approved {
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #10b981;
        }

        .favorite-btn {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          width: 2.25rem;
          height: 2.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s;
          color: #64748b;
        }

        .favorite-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #f97316;
          transform: scale(1.1);
        }

        .store-body {
          padding: 1.5rem;
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
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.75rem;
        }

        .store-body h3 {
          font-size: 1.25rem;
          font-weight: 800;
          color: white;
          margin-bottom: 0.5rem;
          line-height: 1.4;
          letter-spacing: -0.02em;
        }

        .store-description {
          font-size: 0.9rem;
          color: #94a3b8;
          margin-bottom: 1.25rem;
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.5;
        }

        .store-meta {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #cbd5e1;
        }

        .meta-item svg {
          color: #f97316;
          flex-shrink: 0;
        }

        .store-contact {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }

        .contact-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 0.75rem;
          color: #cbd5e1;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
        }

        .contact-link:hover {
          background: #f97316;
          color: white;
          border-color: #f97316;
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.3);
          transform: translateY(-2px);
        }

        .btn-view-store {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1rem;
          background: #f97316;
          color: white;
          border: none;
          border-radius: 0.75rem;
          font-weight: 800;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          width: 100%;
        }

        .btn-view-store:hover {
          background: #ea580c;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }

        @media (max-width: 768px) {
          .marketplace-community-container {
            padding: 1.5rem;
          }

          .header-content h1 {
            font-size: 2rem;
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
