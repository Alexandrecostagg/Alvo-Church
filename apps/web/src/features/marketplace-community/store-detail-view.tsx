"use client";

import { useEffect, useState } from "react";
import { friendlyError } from "../../lib/friendly-error";
import Link from "next/link";
import {
  MapPin,
  Instagram,
  Smartphone,
  Globe,
  Phone,
  Mail,
  ArrowLeft,
  Calendar,
  Tag,
  Image as ImageIcon,
  Share2,
  Heart,
  Star,
  AlertCircle
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import { fetchCommunityStoreById, fetchCommunityOffers } from "@alvo/firebase";
import type { CommunityStore, CommunityOffer, TenantContext } from "@alvo/types";

const mockStore: CommunityStore = {
  id: "store_1",
  organizationId: "org_alvo_demo",
  ownerId: "user_admin_demo",
  name: "Doces & Travessuras",
  description: "Os melhores bolos e doces artesanais da comunidade para a sua festa ou café da tarde. Bolos sob encomenda, fatias gourmet e salgados assados.",
  category: "food",
  status: "approved",
  images: [],
  bannerImageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=400&auto=format&fit=crop",
  contact: {
    email: "doces@esdras.app",
    phone: "(91) 99999-9991",
    address: { street: "Av. Gentil Bittencourt", number: "123", city: "Belém", state: "PA" }
  },
  socialLinks: { whatsapp: "91999999991", instagram: "doces_travessuras" },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const mockOffers: CommunityOffer[] = [
  {
    id: "offer_1",
    organizationId: "org_alvo_demo",
    storeId: "store_1",
    title: "15% de desconto em bolos inteiros",
    description: "Encomende qualquer bolo redondo inteiro e ganhe 15% de desconto apresentando o Esdras Passe.",
    type: "percentage",
    discountPercentage: 15,
    status: "active",
    images: ["https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=200&auto=format&fit=crop"],
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "user_admin_demo"
  }
];

interface StoreDetailViewProps {
  storeId: string;
}

export function StoreDetailView({ storeId }: StoreDetailViewProps) {
  const { firebaseConfig, organizationId, firebaseReady, tenantReady } = useAppAuth();
  const [store, setStore] = useState<CommunityStore | null>(null);
  const [offers, setOffers] = useState<CommunityOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!firebaseReady || !tenantReady) {
        setStore(mockStore);
        setOffers(mockOffers);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const context: TenantContext = { organizationId };
        const storeData = await fetchCommunityStoreById(firebaseConfig, context, storeId);
        setStore(storeData || mockStore);
        
        if (storeData && storeData.status === "approved") {
          const offersData = await fetchCommunityOffers(firebaseConfig, context, storeId, 50);
          setOffers(offersData.length > 0 ? offersData.filter(o => o.status === "active") : mockOffers);
        } else {
          setOffers(mockOffers);
        }
      } catch (err) {
        setError(friendlyError(err, "Erro ao carregar loja"));
        console.error("Error loading store:", err);
        setStore(mockStore);
        setOffers(mockOffers);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [firebaseConfig, organizationId, firebaseReady, tenantReady, storeId]);

  const categories = {
    health: { label: "Saúde & Bem-estar", icon: "🏥", color: "#ef4444" },
    food: { label: "Alimentação", icon: "🍽️", color: "#f59e0b" },
    education: { label: "Educação", icon: "📚", color: "#3b82f6" },
    services: { label: "Serviços", icon: "🔧", color: "#10b981" },
    community: { label: "Comunidade", icon: "🤝", color: "#8b5cf6" }
  };

  if (loading) {
    return (
      <div className="store-detail-container loading">
        <div className="loader">Carregando...</div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="store-detail-container">
        <Link href="/marketplace-community" className="back-link">
          <ArrowLeft size={18} /> Voltar para Marketplace
        </Link>
        <div className="error-state">
          <AlertCircle size={48} opacity={0.3} />
          <h2>Loja não encontrada</h2>
          <p>{error || "Não conseguimos localizar esta loja."}</p>
        </div>
      </div>
    );
  }

  const catInfo = categories[store.category as keyof typeof categories] || categories.community;

  return (
    <main className="store-detail-container">
      <Link href="/marketplace-community" className="back-link">
        <ArrowLeft size={18} /> Voltar para Marketplace
      </Link>

      {/* Hero Section */}
      <section className="store-hero">
        {store.bannerImageUrl ? (
          <img src={store.bannerImageUrl} alt={store.name} className="hero-image" />
        ) : (
          <div className="hero-placeholder">
            <ImageIcon size={48} opacity={0.2} />
          </div>
        )}
        
        <div className="hero-overlay">
          <div className="hero-content">
            <div className="store-category" style={{ color: catInfo.color }}>
              {catInfo.icon} {catInfo.label}
            </div>
            <h1>{store.name}</h1>
            {store.status === "approved" && (
              <div className="verification-badge">
                ✓ Loja Verificada
              </div>
            )}
          </div>

          <div className="hero-actions">
            <button className="action-btn favorite">
              <Heart size={20} />
            </button>
            <button className="action-btn share">
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="store-content">
        <aside className="store-sidebar">
          {/* Contact Card */}
          <div className="contact-card">
            <h3>Informações de Contato</h3>
            
            {store.contact?.email && (
              <a href={`mailto:${store.contact.email}`} className="contact-item">
                <Mail size={18} />
                <div>
                  <div className="contact-label">Email</div>
                  <div className="contact-value">{store.contact.email}</div>
                </div>
              </a>
            )}

            {store.contact?.phone && (
              <a href={`tel:${store.contact.phone}`} className="contact-item">
                <Phone size={18} />
                <div>
                  <div className="contact-label">Telefone</div>
                  <div className="contact-value">{store.contact.phone}</div>
                </div>
              </a>
            )}

            {store.contact?.address && (
              <div className="contact-item">
                <MapPin size={18} />
                <div>
                  <div className="contact-label">Localização</div>
                  <div className="contact-value">
                    {store.contact.address.street && `${store.contact.address.street}, ${store.contact.address.number}`}
                    {store.contact.address.city && <br />}
                    {store.contact.address.city && `${store.contact.address.city}, ${store.contact.address.state}`}
                  </div>
                </div>
              </div>
            )}

            <div className="contact-socials">
              {store.socialLinks?.whatsapp && (
                <a 
                  href={`https://wa.me/${store.socialLinks.whatsapp.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="social-btn"
                  title="WhatsApp"
                >
                  <Smartphone size={20} />
                </a>
              )}
              {store.socialLinks?.instagram && (
                <a 
                  href={`https://instagram.com/${store.socialLinks.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-btn"
                  title="Instagram"
                >
                  <Instagram size={20} />
                </a>
              )}
              {store.socialLinks?.website && (
                <a 
                  href={store.socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-btn"
                  title="Website"
                >
                  <Globe size={20} />
                </a>
              )}
            </div>
          </div>
        </aside>

        <article className="store-main">
          {/* Description */}
          <section className="store-section">
            <h2>Sobre</h2>
            <p className="store-description">{store.description}</p>
          </section>

          {/* Offers */}
          {offers.length > 0 && (
            <section className="store-section">
              <h2>Promoções Ativas</h2>
              <div className="offers-grid">
                {offers.map(offer => (
                  <div key={offer.id} className="offer-card">
                    {offer.images[0] && (
                      <img src={offer.images[0]} alt={offer.title} className="offer-image" />
                    )}
                    <div className="offer-content">
                      <h4>{offer.title}</h4>
                      <p className="offer-description">{offer.description}</p>
                      <div className="offer-discount">
                        {offer.type === "percentage" && (
                          <span className="discount-badge">
                            -{offer.discountPercentage}%
                          </span>
                        )}
                        {offer.type === "fixed_amount" && (
                          <span className="discount-badge">
                            R$ {offer.discountAmount}
                          </span>
                        )}
                        {offer.type === "freebie" && (
                          <span className="discount-badge free">
                            BRINDE
                          </span>
                        )}
                      </div>
                      {offer.validUntil && (
                        <div className="offer-validity">
                          <Calendar size={14} />
                          Válido até {new Date(offer.validUntil).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {offers.length === 0 && store.status === "approved" && (
            <section className="store-section">
              <div className="empty-offers">
                <Tag size={32} opacity={0.3} />
                <p>Nenhuma promoção ativa no momento</p>
              </div>
            </section>
          )}

          {store.status !== "approved" && (
            <section className="store-section warning">
              <AlertCircle size={20} />
              <p>Esta loja está aguardando aprovação</p>
            </section>
          )}
        </article>
      </div>

      <style jsx>{`
        .store-detail-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          background: #0b0f19;
          color: #f8fafc;
          min-height: 100vh;
        }

        .store-detail-container.loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          color: #64748b;
        }

        .loader {
          color: #f97316;
          font-size: 1.125rem;
          font-weight: 700;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          margin-bottom: 2rem;
          background: rgba(35, 45, 65, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0.75rem;
          color: #cbd5e1;
          text-decoration: none;
          font-weight: 700;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .back-link:hover {
          border-color: #f97316;
          color: white;
          background: rgba(249, 115, 22, 0.08);
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.15);
        }

        .error-state {
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

        .error-state h2 {
          color: white;
          font-size: 1.5rem;
          font-weight: 800;
        }

        .store-hero {
          position: relative;
          width: 100%;
          height: 400px;
          background: #0f172a;
          border-radius: 1.5rem;
          overflow: hidden;
          margin-bottom: 2.5rem;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .hero-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .hero-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.2) 0%, rgba(15, 23, 42, 0.4) 100%);
        }

        .hero-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, transparent 0%, rgba(11, 15, 25, 0.9) 100%);
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding: 2.5rem;
        }

        .hero-content {
          flex: 1;
        }

        .store-category {
          font-size: 0.85rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .hero-content h1 {
          font-size: 2.5rem;
          font-weight: 950;
          color: white;
          margin-bottom: 0.75rem;
          letter-spacing: -0.04em;
        }

        .verification-badge {
          display: inline-block;
          padding: 0.4rem 0.8rem;
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #10b981;
          border-radius: 2rem;
          font-size: 0.8rem;
          font-weight: 800;
          backdrop-filter: blur(10px);
        }

        .hero-actions {
          display: flex;
          gap: 0.75rem;
        }

        .action-btn {
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0.75rem;
          width: 2.75rem;
          height: 2.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          color: white;
        }

        .action-btn:hover {
          background: white;
          color: #0b0f19;
          transform: scale(1.05);
        }

        .action-btn.favorite:hover {
          color: #ef4444;
        }

        .store-content {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 2.5rem;
        }

        .store-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .contact-card {
          background: rgba(30, 41, 59, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 1.25rem;
          padding: 1.75rem;
          position: sticky;
          top: 2rem;
        }

        .contact-card h3 {
          font-size: 1.125rem;
          font-weight: 800;
          margin-bottom: 1.25rem;
          color: white;
          letter-spacing: -0.02em;
        }

        .contact-item {
          display: flex;
          gap: 1rem;
          padding: 1rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          transition: all 0.2s;
        }

        .contact-item:last-of-type {
          border-bottom: none;
        }

        .contact-item:hover {
          color: #f97316;
        }

        .contact-item svg {
          color: #f97316;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .contact-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .contact-value {
          font-size: 0.9375rem;
          font-weight: 500;
          color: #cbd5e1;
          margin-top: 0.25rem;
          line-height: 1.4;
        }

        .contact-socials {
          display: flex;
          gap: 0.75rem;
          padding-top: 1.25rem;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          margin-top: 1.25rem;
        }

        .social-btn {
          flex: 1;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 0.75rem;
          color: #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .social-btn:hover {
          background: #f97316;
          border-color: #f97316;
          color: white;
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.3);
          transform: translateY(-2px);
        }

        .store-main {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .store-section {
          background: rgba(30, 41, 59, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 1.25rem;
          padding: 2rem;
        }

        .store-section.warning {
          background: rgba(245, 158, 11, 0.1);
          border-color: rgba(245, 158, 11, 0.3);
          display: flex;
          align-items: center;
          gap: 1rem;
          color: #f59e0b;
        }

        .store-section h2 {
          font-size: 1.5rem;
          font-weight: 850;
          margin-bottom: 1.25rem;
          color: white;
          letter-spacing: -0.03em;
        }

        .store-description {
          font-size: 1rem;
          line-height: 1.7;
          color: #cbd5e1;
          white-space: pre-wrap;
        }

        .offers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.25rem;
        }

        .offer-card {
          background: rgba(30, 41, 59, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1rem;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .offer-card:hover {
          border-color: #f97316;
          box-shadow: 0 12px 25px rgba(0, 0, 0, 0.3);
          transform: translateY(-4px);
        }

        .offer-image {
          width: 100%;
          height: 150px;
          object-fit: cover;
        }

        .offer-content {
          padding: 1.25rem;
        }

        .offer-content h4 {
          font-size: 1.1rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          color: white;
          letter-spacing: -0.02em;
        }

        .offer-description {
          font-size: 0.85rem;
          color: #cbd5e1;
          margin-bottom: 1rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.5;
        }

        .offer-discount {
          margin-bottom: 1rem;
        }

        .discount-badge {
          display: inline-block;
          padding: 0.4rem 0.8rem;
          background: #f97316;
          color: white;
          border-radius: 0.5rem;
          font-weight: 800;
          font-size: 0.85rem;
          box-shadow: 0 4px 10px rgba(249, 115, 22, 0.2);
        }

        .discount-badge.free {
          background: #10b981;
          box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);
        }

        .offer-validity {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #64748b;
        }

        .empty-offers {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
          gap: 1rem;
          color: #64748b;
          text-align: center;
        }

        @media (max-width: 768px) {
          .store-hero {
            height: 250px;
          }

          .hero-overlay {
            padding: 1.5rem;
            flex-direction: column;
            align-items: flex-start;
            justify-content: flex-end;
            gap: 1rem;
          }

          .hero-content h1 {
            font-size: 1.875rem;
          }

          .store-content {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .contact-card {
            position: static;
          }

          .offers-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
