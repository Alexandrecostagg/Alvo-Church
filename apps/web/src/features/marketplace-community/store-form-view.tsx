"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  X,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";
import { useAppAuth } from "../../../app/providers";
import { saveCommunityStore } from "@alvo/firebase";
import type { CommunityStore, TenantContext } from "@alvo/types";

export function StoreFormView({ initialStore }: { initialStore?: CommunityStore }) {
  const router = useRouter();
  const { firebaseConfig, organizationId, user } = useAppAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    initialStore?.bannerImageUrl || null
  );

  const [formData, setFormData] = useState({
    name: initialStore?.name || "",
    description: initialStore?.description || "",
    category: initialStore?.category || "community" as const,
    contactEmail: initialStore?.contact?.email || "",
    contactPhone: initialStore?.contact?.phone || "",
    addressStreet: initialStore?.contact?.address?.street || "",
    addressNumber: initialStore?.contact?.address?.number || "",
    addressDistrict: initialStore?.contact?.address?.district || "",
    addressCity: initialStore?.contact?.address?.city || "",
    addressState: initialStore?.contact?.address?.state || "",
    addressPostalCode: initialStore?.contact?.address?.postalCode || "",
    socialWhatsapp: initialStore?.socialLinks?.whatsapp || "",
    socialInstagram: initialStore?.socialLinks?.instagram || "",
    socialWebsite: initialStore?.socialLinks?.website || "",
    socialFacebook: initialStore?.socialLinks?.facebook || ""
  });

  const categories = [
    { id: "health", label: "Saúde & Bem-estar", icon: "🏥" },
    { id: "food", label: "Alimentação", icon: "🍽️" },
    { id: "education", label: "Educação", icon: "📚" },
    { id: "services", label: "Serviços", icon: "🔧" },
    { id: "community", label: "Comunidade", icon: "🤝" }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Imagem deve ter menos de 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setBannerPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError("Você deve estar logado para criar uma loja");
      return;
    }

    if (!formData.name.trim()) {
      setError("Nome da loja é obrigatório");
      return;
    }

    if (!formData.description.trim()) {
      setError("Descrição é obrigatória");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const now = new Date().toISOString();
      const store: CommunityStore = {
        id: initialStore?.id || `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        organizationId,
        ownerId: initialStore?.ownerId || user.uid,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        status: initialStore?.status || "pending",
        images: [],
        bannerImageUrl: bannerPreview || undefined,
        contact: {
          email: formData.contactEmail || undefined,
          phone: formData.contactPhone || undefined,
          address: {
            street: formData.addressStreet || undefined,
            number: formData.addressNumber || undefined,
            complement: undefined,
            district: formData.addressDistrict || undefined,
            city: formData.addressCity || undefined,
            state: formData.addressState || undefined,
            postalCode: formData.addressPostalCode || undefined,
            countryCode: "BR"
          }
        },
        socialLinks: {
          whatsapp: formData.socialWhatsapp || undefined,
          instagram: formData.socialInstagram || undefined,
          website: formData.socialWebsite || undefined,
          facebook: formData.socialFacebook || undefined
        },
        createdAt: initialStore?.createdAt || now,
        updatedAt: now,
        approvedAt: initialStore?.approvedAt,
        rejectionReason: initialStore?.rejectionReason,
        suspensionReason: initialStore?.suspensionReason,
        moderatedBy: initialStore?.moderatedBy
      };

      const context: TenantContext = { organizationId };
      await saveCommunityStore(firebaseConfig, context, store);

      setSuccess(true);
      setTimeout(() => {
        if (initialStore) {
          router.push(`/marketplace-community/${store.id}`);
        } else {
          router.push("/marketplace-community/my-stores");
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar loja");
      console.error("Error saving store:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="store-form-container">
      <Link href={initialStore ? `/marketplace-community/${initialStore.id}` : "/marketplace-community"} className="back-link">
        <ArrowLeft size={18} /> {initialStore ? "Voltar" : "Cancelar"}
      </Link>

      <div className="form-header">
        <h1>{initialStore ? "Editar Loja" : "Criar Nova Loja"}</h1>
        <p className="form-subtitle">
          {initialStore 
            ? "Atualize as informações da sua loja"
            : "Preencha os dados abaixo para criar sua loja e começar a anunciar seus produtos e serviços"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="store-form">
        {/* Banner Upload */}
        <section className="form-section">
          <h2>Banner da Loja</h2>
          <p className="section-help">Imagem que aparecerá no topo da sua página (recomendado: 1200x400px)</p>
          
          <div className="banner-upload">
            <input 
              type="file" 
              id="banner-input"
              accept="image/*"
              onChange={handleBannerUpload}
              className="hidden-input"
            />
            {bannerPreview ? (
              <div className="banner-preview">
                <img src={bannerPreview} alt="Banner preview" />
                <button 
                  type="button"
                  onClick={() => {
                    setBannerPreview(null);
                    const input = document.getElementById('banner-input') as HTMLInputElement;
                    if (input) input.value = '';
                  }}
                  className="btn-remove-banner"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <label htmlFor="banner-input" className="banner-upload-placeholder">
                <Upload size={32} />
                <span>Clique para fazer upload do banner</span>
                <small>Aceita PNG, JPG ou GIF (máx. 5MB)</small>
              </label>
            )}
          </div>
        </section>

        {/* Basic Info */}
        <section className="form-section">
          <h2>Informações Básicas</h2>
          
          <div className="form-group">
            <label htmlFor="name">Nome da Loja *</label>
            <input 
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ex: João's Hamburgueria"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Categoria *</label>
            <select 
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Descrição *</label>
            <textarea 
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Descreva sua loja, produtos, serviços e diferenciais..."
              rows={5}
              required
            />
            <small>{formData.description.length}/500</small>
          </div>
        </section>

        {/* Contact Info */}
        <section className="form-section">
          <h2>Informações de Contato</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="contactEmail">Email</label>
              <input 
                type="email"
                id="contactEmail"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                placeholder="seu@email.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="contactPhone">Telefone</label>
              <input 
                type="tel"
                id="contactPhone"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleInputChange}
                placeholder="(11) 98765-4321"
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="form-section">
          <h2>Endereço</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="addressStreet">Rua</label>
              <input 
                type="text"
                id="addressStreet"
                name="addressStreet"
                value={formData.addressStreet}
                onChange={handleInputChange}
                placeholder="Rua da sua loja"
              />
            </div>

            <div className="form-group">
              <label htmlFor="addressNumber">Número</label>
              <input 
                type="text"
                id="addressNumber"
                name="addressNumber"
                value={formData.addressNumber}
                onChange={handleInputChange}
                placeholder="123"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="addressDistrict">Bairro</label>
              <input 
                type="text"
                id="addressDistrict"
                name="addressDistrict"
                value={formData.addressDistrict}
                onChange={handleInputChange}
                placeholder="Bairro"
              />
            </div>

            <div className="form-group">
              <label htmlFor="addressPostalCode">CEP</label>
              <input 
                type="text"
                id="addressPostalCode"
                name="addressPostalCode"
                value={formData.addressPostalCode}
                onChange={handleInputChange}
                placeholder="12345-678"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="addressCity">Cidade</label>
              <input 
                type="text"
                id="addressCity"
                name="addressCity"
                value={formData.addressCity}
                onChange={handleInputChange}
                placeholder="Sua cidade"
              />
            </div>

            <div className="form-group">
              <label htmlFor="addressState">Estado</label>
              <input 
                type="text"
                id="addressState"
                name="addressState"
                value={formData.addressState}
                onChange={handleInputChange}
                placeholder="SP"
                maxLength={2}
              />
            </div>
          </div>
        </section>

        {/* Social Media */}
        <section className="form-section">
          <h2>Redes Sociais</h2>
          <p className="section-help">Adicione seus perfis para que clientes possam entrar em contato</p>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="socialWhatsapp">WhatsApp</label>
              <input 
                type="tel"
                id="socialWhatsapp"
                name="socialWhatsapp"
                value={formData.socialWhatsapp}
                onChange={handleInputChange}
                placeholder="11987654321 (só números)"
              />
            </div>

            <div className="form-group">
              <label htmlFor="socialInstagram">Instagram</label>
              <input 
                type="text"
                id="socialInstagram"
                name="socialInstagram"
                value={formData.socialInstagram}
                onChange={handleInputChange}
                placeholder="seu_usuario (sem @)"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="socialWebsite">Website</label>
              <input 
                type="url"
                id="socialWebsite"
                name="socialWebsite"
                value={formData.socialWebsite}
                onChange={handleInputChange}
                placeholder="https://seuloja.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="socialFacebook">Facebook</label>
              <input 
                type="text"
                id="socialFacebook"
                name="socialFacebook"
                value={formData.socialFacebook}
                onChange={handleInputChange}
                placeholder="seu_pagina"
              />
            </div>
          </div>
        </section>

        {/* Messages */}
        {error && (
          <div className="message-box error">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="message-box success">
            <CheckCircle size={20} />
            <p>Loja salva com sucesso! Redirecionando...</p>
          </div>
        )}

        {/* Actions */}
        <div className="form-actions">
          <Link href="/marketplace-community" className="btn-cancel">
            Cancelar
          </Link>
          <button 
            type="submit" 
            className="btn-submit"
            disabled={saving || success}
          >
            {saving && <Loader2 size={18} className="spinner" />}
            {success ? "✓ Salvo" : initialStore ? "Atualizar Loja" : "Criar Loja"}
          </button>
        </div>
      </form>

      <style jsx>{`
        .store-form-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
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

        .form-header {
          margin-bottom: 2rem;
        }

        .form-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }

        .form-subtitle {
          color: #666;
          font-size: 1rem;
        }

        .store-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .form-section {
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 0.75rem;
          padding: 2rem;
        }

        .form-section h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 1rem;
        }

        .section-help {
          font-size: 0.875rem;
          color: #999;
          margin-bottom: 1rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-row .form-group {
          margin-bottom: 0;
        }

        label {
          display: block;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.5rem;
          font-size: 0.9375rem;
        }

        input,
        textarea,
        select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e5e5e5;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-family: inherit;
          transition: all 0.2s;
        }

        input:focus,
        textarea:focus,
        select:focus {
          outline: none;
          border-color: #d27836;
          box-shadow: 0 0 0 3px rgba(210, 120, 54, 0.1);
        }

        textarea {
          resize: vertical;
          min-height: 120px;
        }

        .form-group small {
          display: block;
          margin-top: 0.25rem;
          font-size: 0.75rem;
          color: #999;
        }

        .banner-upload {
          border: 2px dashed #e5e5e5;
          border-radius: 0.75rem;
          padding: 2rem;
          text-align: center;
          transition: all 0.2s;
        }

        .banner-upload:hover {
          border-color: #d27836;
          background: #faf8f6;
        }

        .hidden-input {
          display: none;
        }

        .banner-upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          color: #666;
        }

        .banner-upload-placeholder small {
          color: #999;
          font-size: 0.875rem;
        }

        .banner-preview {
          position: relative;
          display: inline-block;
          width: 100%;
          max-width: 500px;
        }

        .banner-preview img {
          width: 100%;
          border-radius: 0.5rem;
        }

        .btn-remove-banner {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: rgba(0, 0, 0, 0.5);
          border: none;
          border-radius: 50%;
          width: 2.25rem;
          height: 2.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-remove-banner:hover {
          background: rgba(0, 0, 0, 0.7);
        }

        .message-box {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 0.5rem;
          font-size: 0.9375rem;
        }

        .message-box.error {
          background: #fee;
          border: 1px solid #fcc;
          color: #c33;
        }

        .message-box.success {
          background: #efe;
          border: 1px solid #cfc;
          color: #3c3;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .btn-cancel,
        .btn-submit {
          flex: 1;
          padding: 1rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          text-decoration: none;
        }

        .btn-cancel {
          background: white;
          border: 1px solid #e5e5e5;
          color: #666;
        }

        .btn-cancel:hover {
          border-color: #d27836;
          color: #d27836;
          background: #faf8f6;
        }

        .btn-submit {
          background: linear-gradient(135deg, #d27836 0%, #b8632b 100%);
          color: white;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(210, 120, 54, 0.3);
        }

        .btn-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column;
          }

          .form-section {
            padding: 1.5rem;
          }
        }
      `}</style>
    </main>
  );
}
