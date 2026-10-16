'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AddToCartAction } from '@/features/cart/AddToCartAction';
import { AddedToCartFeedback } from '@/features/cart/AddedToCartFeedback';
import { useAddCartItem } from '@/features/cart/useAddCartItem';
import type { AvailabilityState } from '@/features/cart/types';
import { Button } from '@/shared/ui/Button';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const { slug } = use(params);
  const router = useRouter();

  // Estados interactivos para pruebas visuales y de aceptación
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [availability, setAvailability] = useState<AvailabilityState>('AVAILABLE');
  const [priceReady, setPriceReady] = useState(true);

  // Hook de orquestación de adición al carrito
  const { isBusy, lastResult, feedbackOpen, addItem, closeFeedback } = useAddCartItem({
    useMock: true,
  });

  const sku = selectedSize ? `INKA-${slug.toUpperCase()}-${selectedSize}` : undefined;

  const handleAdd = (payload: { sku: string; quantity: 1 }) => {
    addItem(payload);
  };

  const handleViewCart = () => {
    closeFeedback();
    router.push('/carrito');
  };

  return (
    <div className="container product-detail-page" style={{ padding: '32px 16px', maxWidth: '1000px', margin: '0 auto' }}>
      <nav aria-label="Ruta de navegación" style={{ marginBottom: '24px' }}>
        <Link href="/catalogo" className="text-link" style={{ fontSize: '14px', color: 'var(--action-hover)' }}>
          ← Volver al catálogo
        </Link>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px' }}>
        {/* Imagen del producto */}
        <div style={{ background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '380px' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '72px', display: 'block', marginBottom: '16px' }}>👟</span>
            <span className="demo-notice" role="note" style={{ display: 'inline-block', padding: '4px 12px', background: 'var(--action-soft)', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 600 }}>
              Corte Vertical MOCK — Hito 3
            </span>
          </div>
        </div>

        {/* Información y Acción de Compra */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Inka Athletics
            </span>
            <h1 style={{ fontSize: '28px', margin: '8px 0', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase' }}>
              Producto: {decodeURIComponent(slug)}
            </h1>
            <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              S/ 189.90 <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-secondary)' }}>PEN</span>
            </p>
          </div>

          {/* Selector de variantes (F-013) */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
              Talla: {selectedSize || 'Sin seleccionar'}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['S', 'M', 'L', 'XL'].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: selectedSize === size ? '2px solid var(--action-primary)' : '1px solid var(--border)',
                    background: selectedSize === size ? 'var(--action-soft)' : '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Panel de control de estados para testing QA interactivo */}
          <div style={{ padding: '12px', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>🛠️ Probar estados QA (F-016):</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <Button size="sm" variant={availability === 'AVAILABLE' ? 'primary' : 'secondary'} onClick={() => setAvailability('AVAILABLE')}>
                Disponible
              </Button>
              <Button size="sm" variant={availability === 'UNAVAILABLE' ? 'primary' : 'secondary'} onClick={() => setAvailability('UNAVAILABLE')}>
                Agotado
              </Button>
              <Button size="sm" variant={availability === 'UNSELECTED' ? 'primary' : 'secondary'} onClick={() => setAvailability('UNSELECTED')}>
                Sin Selección
              </Button>
              <Button size="sm" variant={priceReady ? 'primary' : 'secondary'} onClick={() => setPriceReady(!priceReady)}>
                {priceReady ? 'Precio Listo ✓' : 'Precio Pendiente ⏳'}
              </Button>
            </div>
          </div>

          {/* CMP-F016-001: Componente de Acción Agregar al Carrito */}
          <div style={{ marginTop: '8px' }}>
            <AddToCartAction
              sku={sku}
              availability={availability}
              priceReady={priceReady}
              busy={isBusy}
              onAdd={handleAdd}
              onRetryAvailability={() => setAvailability('AVAILABLE')}
            />
          </div>
        </div>
      </div>

      {/* CMP-F016-002: Overlay O-005 Feedback de Producto Agregado */}
      <AddedToCartFeedback
        result={lastResult}
        opened={feedbackOpen}
        onViewCart={handleViewCart}
        onContinue={closeFeedback}
        onClose={closeFeedback}
      />
    </div>
  );
}
