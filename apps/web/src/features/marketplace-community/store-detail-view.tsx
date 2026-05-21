"use client";

import { useEffect, useState } from "react";
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
      if (!firebaseReady || !tenantReady) return;
      try {
        setLoading(true);
        const context: TenantContext = { organizationId };
        const storeData = await fetchCommunityStoreById(firebaseConfig, context, storeId);
        setStore(storeData);
        
        if (storeData.status === "approved") {
          const offersData = await fetchCommunityOffers(firebaseConfig, context, storeId, 50);
          setOffers(offersData.filter(o => o.status === "active"));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar loja");
        console.error("Error loading store:", err);
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
        }

        .store-detail-container.loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
        }

        .loader {
          color: #999;
          font-size: 1.125rem;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          margin-bottom: 2rem;
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
          background: #faf8f6;
        }

        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          gap: 1rem;
          color: #999;
          text-align: center;
        }

        .error-state h2 {
          color: #666;
          font-size: 1.5rem;
        }

        .store-hero {
          position: relative;
          width: 100%;
          height: 400px;
          background: #f5f5f5;
          border-radius: 1rem;
          overflow: hidden;
          margin-bottom: 2rem;
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
          background: linear-gradient(135deg, #f5f5f5 0%, #efefef 100%);
        }

        .hero-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 100%);
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding: 2rem;
        }

        .hero-content {
          flex: 1;
        }

        .store-category {
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .hero-content h1 {
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
          margin-bottom: 0.5rem;
        }

        .verification-badge {
          display: inline-block;
          padding: 0.375rem 0.75rem;
          background: rgba(16, 185, 129, 0.9);
          color: white;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .hero-actions {
          display: flex;
          gap: 0.75rem;
        }

        .action-btn {
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 0.5rem;
          width: 2.75rem;
          height: 2.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #333;
        }

        .action-btn:hover {
          background: white;
          transform: scale(1.05);
        }

        .action-btn.favorite:hover {
          color: #d27836;
        }

        .store-content {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 2rem;
        }

        .store-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .contact-card {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 0.75rem;
          padding: 1.5rem;
          position: sticky;
          top: 2rem;
        }

        .contact-card h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #1a1a1a;
        }

        .contact-item {
          display: flex;
          gap: 1rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f0f0f0;
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          transition: all 0.2s;
        }

        .contact-item:last-of-type {
          border-bottom: none;
        }

        .contact-item:hover {
          color: #d27836;
        }

        .contact-item svg {
          color: #d27836;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .contact-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .contact-value {
          font-size: 0.9375rem;
          font-weight: 500;
          color: #1a1a1a;
          margin-top: 0.125rem;
        }

        .contact-socials {
          display: flex;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid #f0f0f0;
          margin-top: 1rem;
        }

        .social-btn {
          flex: 1;
          padding: 0.75rem;
          background: #f5f5f5;
          border: 1px solid #e5e5e5;
          border-radius: 0.5rem;
          color: #666;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: all 0.2s;
        }

        .social-btn:hover {
          background: #d27836;
          border-color: #d27836;
          color: white;
        }

        .store-main {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .store-section {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 0.75rem;
          padding: 2rem;
        }

        .store-section.warning {
          background: #fff9e6;
          border-color: #f59e0b;
          display: flex;
          align-items: center;
          gap: 1rem;
          color: #b45309;
        }

        .store-section h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #1a1a1a;
        }

        .store-description {
          font-size: 1rem;
          line-height: 1.6;
          color: #666;
          white-space: pre-wrap;
        }

        .offers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .offer-card {
          background: #faf8f6;
          border: 1px solid #e5e5e5;
          border-radius: 0.5rem;
          overflow: hidden;
          transition: all 0.2s;
        }

        .offer-card:hover {
          border-color: #d27836;
          box-shadow: 0 2px 8px rgba(210, 120, 54, 0.15);
        }

        .offer-image {
          width: 100%;
          height: 150px;
          object-fit: cover;
        }

        .offer-content {
          padding: 1rem;
        }

        .offer-content h4 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #1a1a1a;
        }

        .offer-description {
          font-size: 0.875rem;
          color: #666;
          margin-bottom: 0.75rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .offer-discount {
          margin-bottom: 0.75rem;
        }

        .discount-badge {
          display: inline-block;
          padding: 0.375rem 0.75rem;
          background: #d27836;
          color: white;
          border-radius: 0.25rem;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .discount-badge.free {
          background: #10b981;
        }

        .offer-validity {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #999;
        }

        .empty-offers {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          gap: 1rem;
          color: #999;
          text-align: center;
        }

        @media (max-width: 768px) {
          .store-hero {
            height: 250px;
          }

          .hero-content h1 {
            font-size: 1.875rem;
          }

          .store-content {
            grid-template-columns: 1fr;
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
