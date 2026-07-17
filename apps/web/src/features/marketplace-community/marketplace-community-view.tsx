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
  ArrowRight,
  Plus,
  Loader2,
  Heart,
  ShoppingBag,
  HeartPulse,
  Utensils,
  GraduationCap,
  Wrench,
  Users
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
    socialLinks: { whatsapp: "91999999992", website: "https://conecta.esdras.app" },
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
    { id: "health", label: "Saúde & Bem-estar", color: "#ef4444", icon: HeartPulse },
    { id: "food", label: "Alimentação", color: "#f59e0b", icon: Utensils },
    { id: "education", label: "Educação", color: "#3b82f6", icon: GraduationCap },
    { id: "services", label: "Serviços", color: "#10b981", icon: Wrench },
    { id: "community", label: "Comunidade", color: "#8b5cf6", icon: Users },
  ];

  const filteredStores = stores.filter(store => {
    const matchesSearch = 
      store.name.toLowerCase().includes(search.toLowerCase()) ||
      store.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !activeCategory || store.category === activeCategory;
    return matchesSearch && matchesCategory;
  });
  const approvedStores = stores.filter((store) => store.status === "approved").length;
  const storesWithWhatsapp = stores.filter((store) => store.socialLinks?.whatsapp).length;
  const activeCategoryLabel = activeCategory
    ? categories.find((category) => category.id === activeCategory)?.label ?? "Categoria"
    : "Todas";

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

        <div className="marketplace-actions">
          <Link href="/marketplace-community/my-stores" className="btn-secondary-store">
            Minhas lojas
          </Link>
          <Link href="/marketplace-community/admin/moderation" className="btn-secondary-store">
            Moderação
          </Link>
          {user && (
            <Link 
              href="/marketplace-community/new"
              className="btn-create-store"
            >
              <Plus size={18} />
              Criar Loja
            </Link>
          )}
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
            {categories.map(cat => {
              const CategoryIcon = cat.icon;
              return (
              <button 
                key={cat.id}
                className={`pill ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                style={{ '--pill-accent': cat.color } as any}
              >
                <CategoryIcon size={16} className="pill-icon" />
                {cat.label}
              </button>
            )})}
          </div>
        </div>
      </header>

      <section className="marketplace-kpis" aria-label="Indicadores do marketplace">
        <article>
          <span>Lojas aprovadas</span>
          <strong>{approvedStores}</strong>
          <p>negócios visíveis para a comunidade</p>
        </article>
        <article>
          <span>Categoria ativa</span>
          <strong>{activeCategoryLabel}</strong>
          <p>{filteredStores.length} resultado(s) no filtro atual</p>
        </article>
        <article>
          <span>Contato rápido</span>
          <strong>{storesWithWhatsapp}</strong>
          <p>lojas com WhatsApp disponível</p>
        </article>
      </section>

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
                <button className="favorite-btn" type="button" aria-label={`Favoritar ${store.name}`}>
                  <Heart size={18} />
                </button>
              </div>
            </div>

            <div className="store-body">
              {(() => {
                const category = categories.find(c => c.id === store.category);
                const CategoryIcon = category?.icon ?? ShoppingBag;
                return (
                  <div className="category-tag" style={{ color: category?.color }}>
                    <CategoryIcon size={15} />
                    {category?.label ?? "Comunidade"}
                  </div>
                );
              })()}
              
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
          flex-shrink: 0;
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
          gap: 0.35rem;
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

        .marketplace-community-container {
          width: 100%;
          max-width: 1480px;
          margin: 0 auto;
          padding: 32px clamp(20px, 3vw, 44px) 56px;
          background:
            radial-gradient(circle at 8% 0%, rgba(37, 99, 235, 0.08), transparent 28%),
            radial-gradient(circle at 92% 0%, rgba(22, 163, 74, 0.10), transparent 24%),
            linear-gradient(180deg, #f8fafc 0%, #ffffff 42%, #f8fafc 100%);
          color: #111827;
        }

        .marketplace-community-header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 20px;
          align-items: end;
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.10);
        }

        .header-content {
          margin: 0;
        }

        .header-content .eyebrow {
          color: #ea580c;
          font-size: 13px;
          letter-spacing: 0.16em;
        }

        .header-content h1 {
          max-width: none;
          margin: 10px 0 12px;
          color: #111827;
          font-size: clamp(30px, 3.2vw, 46px);
          line-height: 1;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }

        .header-content p {
          max-width: 980px;
          margin: 0;
          color: #1f2937;
          font-size: clamp(17px, 1.25vw, 20px);
          line-height: 1.55;
        }

        .marketplace-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
          align-self: end;
        }

        .btn-create-store,
        .btn-secondary-store {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 18px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 850;
          text-decoration: none;
          white-space: nowrap;
        }

        .btn-create-store {
          background: #ea580c;
          color: #ffffff;
          box-shadow: 0 12px 24px -16px rgba(234, 88, 12, 0.70);
        }

        .btn-secondary-store {
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: #ffffff;
          color: #334155;
          box-shadow: 0 8px 22px -18px rgba(15, 23, 42, 0.50);
        }

        .search-bar-container {
          grid-column: 1 / -1;
          display: grid;
          gap: 14px;
          margin-top: 0;
          padding: 18px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 18px 44px -30px rgba(15, 23, 42, 0.45);
        }

        .search-input-wrapper {
          max-width: none;
          min-height: 52px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 10px;
          background: #f8fafc;
          padding: 0 14px;
        }

        .search-input-wrapper:focus-within {
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.14);
        }

        .search-input {
          color: #111827;
          font-size: 15px;
        }

        .search-input::placeholder {
          color: #94a3b8;
        }

        .category-pills {
          gap: 10px;
        }

        .pill {
          min-height: 42px;
          padding: 0 14px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 10px;
          background: #ffffff;
          color: #334155;
          font-size: 14px;
          font-weight: 850;
        }

        .pill:hover {
          border-color: rgba(234, 88, 12, 0.28);
          background: #fff7ed;
          color: #111827;
        }

        .pill.active {
          border-color: var(--pill-accent, #ea580c);
          background: #fff7ed;
          color: #111827;
          box-shadow: none;
        }

        .marketplace-kpis {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 16px;
        }

        .marketplace-kpis article,
        .store-card,
        .loading-container,
        .empty-state {
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 18px 44px -30px rgba(15, 23, 42, 0.45);
        }

        .marketplace-kpis article {
          min-height: 134px;
          padding: 22px;
        }

        .marketplace-kpis span {
          display: block;
          color: #475569;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.25;
        }

        .marketplace-kpis strong {
          display: block;
          margin-top: 12px;
          color: #0891b2;
          font-size: clamp(30px, 3vw, 42px);
          line-height: 0.95;
        }

        .marketplace-kpis article:nth-child(2) strong {
          color: #ea580c;
          font-size: clamp(24px, 2.4vw, 34px);
          white-space: nowrap;
        }

        .marketplace-kpis article:nth-child(3) strong {
          color: #16a34a;
        }

        .marketplace-kpis p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.35;
        }

        .stores-grid {
          gap: 14px;
          margin-top: 0;
        }

        .store-card {
          overflow: hidden;
        }

        .store-card:hover {
          border-color: rgba(37, 99, 235, 0.22);
          box-shadow: 0 22px 52px -34px rgba(15, 23, 42, 0.65);
          transform: translateY(-2px);
        }

        .store-image-header {
          height: 210px;
          background: #f1f5f9;
        }

        .placeholder-banner {
          background: #f8fafc;
          color: #64748b;
        }

        .status-badge.approved {
          background: rgba(236, 253, 245, 0.95);
          border: 1px solid rgba(22, 163, 74, 0.22);
          color: #166534;
        }

        .favorite-btn {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(15, 23, 42, 0.10);
          color: #64748b;
        }

        .favorite-btn:hover {
          background: #fff7ed;
          color: #ea580c;
        }

        .store-body {
          padding: 22px;
        }

        .category-tag {
          margin-bottom: 10px;
          letter-spacing: 0;
          text-transform: none;
        }

        .store-body h3 {
          color: #111827;
          font-size: 22px;
          line-height: 1.15;
        }

        .store-description {
          color: #475569;
          font-size: 15px;
          line-height: 1.45;
        }

        .store-meta {
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }

        .meta-item {
          color: #475569;
        }

        .contact-link {
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: #f8fafc;
          color: #334155;
          border-radius: 10px;
        }

        .contact-link:hover {
          background: #eff6ff;
          border-color: rgba(37, 99, 235, 0.22);
          color: #1d4ed8;
          box-shadow: none;
        }

        .btn-view-store {
          min-height: 46px;
          border-radius: 10px;
          background: #ea580c;
          color: #ffffff;
        }

        .empty-state h3 {
          color: #111827;
        }

        .empty-state {
          color: #64748b;
          border-style: dashed;
          box-shadow: none;
        }

        @media (max-width: 768px) {
          .marketplace-community-container {
            padding: 24px 16px 40px;
          }

          .header-content h1 {
            font-size: clamp(28px, 8vw, 42px);
            white-space: normal;
          }

          .marketplace-community-header,
          .marketplace-kpis {
            grid-template-columns: 1fr;
          }

          .marketplace-actions {
            justify-content: start;
          }

          .btn-create-store,
          .btn-secondary-store {
            width: 100%;
          }

          .stores-grid {
            grid-template-columns: 1fr;
          }

          .category-pills {
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 4px;
          }
        }
      `}</style>
    </main>
  );
}
