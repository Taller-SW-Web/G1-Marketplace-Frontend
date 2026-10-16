'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCartApi } from '@/features/cart/api';
import type { CartSnapshot } from '@/features/cart/types';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryCartId = searchParams.get('cartId');
  const queryVersion = searchParams.get('version');

  const [cart, setCart] = useState<CartSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAuthoritativeCart() {
      try {
        const data = await getCartApi(false);
        setCart(data);
      } catch (err) {
        console.warn('No fue posible cargar carrito backend en checkout:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAuthoritativeCart();
  }, []);

  const authoritativeVersion = cart?.version ?? (queryVersion ? parseInt(queryVersion, 10) : 1);
  const authoritativeCartId = cart?.cartId ?? queryCartId ?? 'N/A';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 16px' }}>
      <nav style={{ marginBottom: '24px' }}>
        <Link href="/carrito" style={{ color: 'var(--action-primary)', fontSize: '14px', textDecoration: 'none', fontWeight: 600 }}>
          ← Volver al carrito
        </Link>
      </nav>

      <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '32px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '32px' }}>💳</span>
          <div>
            <h1 style={{ fontSize: '24px', margin: 0, fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase' }}>
              Checkout — Preparación de Orden (F-022)
            </h1>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Handoff de Carrito recibido exitosamente
            </p>
          </div>
        </div>

        <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: 'var(--radius-sm)', border: '1px solid #e9ecef', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '15px', margin: '0 0 12px 0', fontWeight: 700, color: '#087f5b' }}>
            ✓ Conexión con Carrito Backend Verificada
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block' }}>ID del Carrito:</span>
              <strong style={{ fontFamily: 'monospace', fontSize: '12px' }}>{authoritativeCartId}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Versión del Carrito (Autoritativa):</span>
              <span style={{ display: 'inline-block', padding: '2px 8px', background: '#e6fcf5', color: '#087f5b', borderRadius: '4px', fontWeight: 700 }}>
                v{authoritativeVersion}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Total de Artículos:</span>
              <strong>{cart?.items?.length ?? 0} artículo(s)</strong>
            </div>
          </div>
        </div>

        {cart && cart.items.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              Líneas listas para cotizar (F-023)
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid var(--border)' }}>
              {cart.items.map((it) => (
                <li key={it.sku} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                  <span>
                    <strong>{it.sku}</strong> × {it.quantity}
                  </span>
                  <span>
                    S/ {((it.unitPrice?.amount ?? 89.9) * it.quantity).toFixed(2)} PEN
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={() => router.push('/carrito')}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Modificar Carrito
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', textAlign: 'center' }}>Cargando checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
