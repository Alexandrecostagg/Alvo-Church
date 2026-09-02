"use client";

import { useEffect, useState } from "react";
import {
  Store,
  Search,
  MapPin,
  Instagram,
  Globe,
  BadgeCheck,
  Tag,
  ArrowRight,
  Navigation,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  recentPeople,
  partnerOrganizations,
  partnerBenefits,
} from "../../lib/mock-data";
import type {
  PartnerOrganization,
  PartnerBenefit,
  Person,
  TenantContext,
} from "@alvo/types";
import { useAppAuth } from "../../../app/providers";
import {
  fetchPartnerOrganizations,
  fetchPartnerBenefits,
} from "@alvo/firebase";

export function MarketplaceView() {
  const { firebaseConfig, organizationId, firebaseReady, tenantReady } =
    useAppAuth();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<PartnerOrganization[]>([]);
  const [benefits, setBenefits] = useState<PartnerBenefit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!firebaseReady || !tenantReady) {
        setBusinesses(partnerOrganizations as PartnerOrganization[]);
        setBenefits(partnerBenefits as unknown as PartnerBenefit[]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const context: TenantContext = { organizationId };
        const [orgs, bens] = await Promise.all([
          fetchPartnerOrganizations(firebaseConfig, context),
          fetchPartnerBenefits(firebaseConfig, context),
        ]);
        setBusinesses(
          orgs.length > 0
            ? orgs
            : (partnerOrganizations as PartnerOrganization[]),
        );
        setBenefits(
          bens.length > 0
            ? bens
            : (partnerBenefits as unknown as PartnerBenefit[]),
        );
      } catch (error) {
        console.error("Error loading marketplace data:", error);
        setBusinesses(partnerOrganizations as PartnerOrganization[]);
        setBenefits(partnerBenefits as unknown as PartnerBenefit[]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [firebaseConfig, organizationId, firebaseReady, tenantReady]);

  const categories = [
    { id: "health", label: "Saúde", color: "#ef4444" },
    { id: "food", label: "Alimentação", color: "#f59e0b" },
    { id: "education", label: "Educação", color: "#3b82f6" },
    { id: "services", label: "Serviços", color: "#10b981" },
    { id: "community", label: "Comunidade", color: "#8b5cf6" },
  ];

  const filteredBusinesses = businesses.filter((business) => {
    const matchesSearch = business.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      !activeCategory || business.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getOwnerInfo = (ownerId?: string): Person | undefined => {
    return recentPeople.find((p) => p.id === ownerId);
  };

  const getBusinessBenefits = (businessId: string): PartnerBenefit[] => {
    return benefits.filter((b) => b.partnerId === businessId);
  };

  return (
    <main className="marketplace-container animate-entrance">
      <header className="marketplace-header">
        <div className="header-content">
          <div className="eyebrow">
            <Store size={14} />
            Economia Solidária
          </div>
          <h1>Marketplace da Comunidade</h1>
          <p>
            Apoie os empreendimentos dos nossos membros e aproveite descontos
            exclusivos com seu Esdras Passe.
          </p>
        </div>

        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="O que você está procurando hoje?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="category-pills">
            <button
              className={`pill ${!activeCategory ? "active" : ""}`}
              onClick={() => setActiveCategory(null)}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`pill ${activeCategory === cat.id ? "active" : ""}`}
                onClick={() => setActiveCategory(cat.id)}
                style={{ "--pill-accent": cat.color } as any}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="loading-state">
          <Loader2 className="spinner" />
          <p>Carregando parceiros e benefícios...</p>
        </div>
      ) : (
        <section className="business-grid">
          {filteredBusinesses.map((business) => {
            const owner = getOwnerInfo(business.ownerPersonId);
            const benefits = getBusinessBenefits(business.id);

            return (
              <article
                key={business.id}
                className="business-card antigravity-float"
              >
                <div className="business-image-header">
                  {business.logoUrl ? (
                    <img src={business.logoUrl} alt={business.name} />
                  ) : (
                    <div className="placeholder-logo">
                      <Store size={40} opacity={0.2} />
                    </div>
                  )}
                  {business.isMemberBusiness && (
                    <span className="member-badge">
                      <BadgeCheck size={14} /> Membro Esdras
                    </span>
                  )}
                </div>

                <div className="business-body">
                  <div
                    className="category-tag"
                    style={{
                      color: categories.find((c) => c.id === business.category)
                        ?.color,
                    }}
                  >
                    {categories.find((c) => c.id === business.category)?.label}
                  </div>
                  <h3>{business.name}</h3>

                  {owner && (
                    <div className="owner-mini">
                      <div className="owner-avatar">
                        {owner.firstName[0]}
                        {owner.lastName[0]}
                      </div>
                      <span>
                        Propriedade de <strong>{owner.firstName}</strong>
                      </span>
                    </div>
                  )}

                  <div className="address-info">
                    <MapPin size={14} />
                    <span>
                      {business.address?.district}, {business.address?.city}
                    </span>
                  </div>

                  {benefits.length > 0 && (
                    <div className="benefit-highlight">
                      <Tag size={14} />
                      <span>{benefits[0].discountLabel} de desconto</span>
                    </div>
                  )}

                  <div className="business-actions">
                    <button className="action-btn maps" title="Ver no Mapa">
                      <Navigation size={18} />
                    </button>
                    {business.instagram && (
                      <button className="action-btn social" title="Instagram">
                        <Instagram size={18} />
                      </button>
                    )}
                    {business.website && (
                      <button className="action-btn social" title="Website">
                        <ExternalLink size={18} />
                      </button>
                    )}
                    <button className="primary-view-btn">
                      Ver Detalhes <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <style jsx>{`
        .marketplace-container {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          background: transparent;
          color: var(--alvo-ink);
          min-height: 100vh;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 40vh;
          gap: 1rem;
          color: var(--alvo-ink-soft);
        }

        .spinner {
          animation: spin 1s linear infinite;
          width: 2.5rem;
          height: 2.5rem;
          color: var(--alvo-blue);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .marketplace-header {
          margin-bottom: 3.5rem;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          font-weight: 800;
          color: var(--alvo-blue);
          text-transform: uppercase;
          margin-bottom: 0.75rem;
          letter-spacing: 0.05em;
        }

        h1 {
          font-size: 3rem;
          font-weight: 950;
          color: var(--alvo-ink);
          margin-bottom: 1rem;
          letter-spacing: -0.04em;
        }

        .header-content p {
          font-size: 1.2rem;
          color: var(--alvo-ink-soft);
          max-width: 650px;
          line-height: 1.6;
        }

        .search-bar-container {
          margin-top: 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .search-input-wrapper {
          position: relative;
          max-width: 600px;
        }

        .search-icon {
          position: absolute;
          left: 1.25rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--alvo-ink-soft);
        }

        .search-input-wrapper input {
          width: 100%;
          padding: 1.1rem 1.25rem 1.1rem 3.5rem;
          border-radius: 1.25rem;
          border: 1px solid var(--alvo-line);
          background: var(--glass-bg);
          color: var(--alvo-ink);
          font-size: 1.1rem;
          outline: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--alvo-shadow);
        }

        .search-input-wrapper input:focus {
          border-color: var(--alvo-blue);
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.15);
        }

        .search-input-wrapper input::placeholder {
          color: var(--alvo-ink-soft);
          opacity: 0.7;
        }

        .category-pills {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .pill {
          padding: 0.625rem 1.25rem;
          border-radius: 999px;
          background: var(--glass-bg);
          border: 1px solid var(--alvo-line);
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--alvo-ink-soft);
        }

        .pill:hover {
          border-color: var(--alvo-blue);
          color: var(--alvo-ink);
          background: rgba(6, 182, 212, 0.04);
        }

        .pill.active {
          background: var(--pill-accent, var(--alvo-blue));
          color: white;
          border-color: transparent;
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.25);
        }

        .business-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 2rem;
        }

        .business-card {
          background: var(--glass-bg);
          border-radius: 1.5rem;
          overflow: hidden;
          border: 1px solid var(--alvo-line);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .business-card:hover {
          transform: translateY(-8px);
          border-color: var(--alvo-blue);
          box-shadow: var(--alvo-shadow-strong);
        }

        .business-image-header {
          position: relative;
          height: 180px;
          background: var(--alvo-surface-muted);
        }

        .business-image-header img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder-logo {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            135deg,
            rgba(30, 41, 59, 0.05) 0%,
            rgba(15, 23, 42, 0.1) 100%
          );
        }

        .member-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(16, 185, 129, 0.1);
          backdrop-filter: blur(10px);
          color: #10b981;
          padding: 0.5rem 0.75rem;
          border-radius: 0.75rem;
          font-size: 0.75rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .business-body {
          padding: 1.5rem;
        }

        .category-tag {
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        h3 {
          font-size: 1.5rem;
          font-weight: 850;
          color: var(--alvo-ink);
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }

        .owner-mini {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
          padding: 0.5rem 0.75rem;
          background: rgba(0, 0, 0, 0.03);
          border-radius: 0.75rem;
          border: 1px solid var(--alvo-line);
        }

        .owner-avatar {
          width: 32px;
          height: 32px;
          background: var(--alvo-blue);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 800;
          box-shadow: 0 4px 10px rgba(6, 182, 212, 0.2);
        }

        .owner-mini span {
          font-size: 0.85rem;
          color: var(--alvo-ink-soft);
        }

        .address-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--alvo-ink-soft);
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
          font-weight: 600;
        }

        .benefit-highlight {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #16a34a;
          background: var(--alvo-green-soft);
          border: 1px solid rgba(22, 163, 74, 0.2);
          padding: 0.5rem 0.75rem;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          font-weight: 800;
          width: fit-content;
          margin-bottom: 1.5rem;
        }

        .business-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 1px solid var(--alvo-line);
          background: var(--alvo-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--alvo-ink-soft);
        }

        .action-btn:hover {
          background: var(--alvo-surface-muted);
          color: var(--alvo-ink);
          border-color: var(--alvo-ink-soft);
        }

        .primary-view-btn {
          flex: 1;
          height: 44px;
          background: var(--alvo-blue);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 800;
          font-size: 0.9375rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .primary-view-btn:hover {
          background: var(--alvo-accent);
          gap: 0.75rem;
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
        }

        @media (max-width: 768px) {
          h1 {
            font-size: 2.25rem;
          }
          .marketplace-header {
            margin-bottom: 2.5rem;
          }
          .business-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
