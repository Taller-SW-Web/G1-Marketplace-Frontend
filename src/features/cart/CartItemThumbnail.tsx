'use client';

import { useEffect, useState } from 'react';
import { resolveCartPresentation } from './cart-presentation';
import type { CartItemPresentation, CartItemPreview } from './types';

export function useCartItemPresentation({ sku, name, imageUrl, variantName }: CartItemPreview) {
  const [resolved, setResolved] = useState<{ sku: string; presentation: CartItemPresentation }>();
  useEffect(() => {
    if (name && imageUrl) return;
    let active = true;
    void resolveCartPresentation({ sku, name, imageUrl }).then(presentation => {
      if (active && presentation) setResolved({ sku, presentation });
    });
    return () => { active = false; };
  }, [sku, name, imageUrl]);

  const extra = resolved?.sku === sku ? resolved.presentation : undefined;
  return {
    name: name ?? extra?.name ?? sku,
    imageUrl: imageUrl ?? extra?.imageUrl,
    variantName: variantName ?? extra?.variantName,
  };
}

export function CartItemThumbnail({ imageUrl }: Pick<CartItemPresentation, 'imageUrl'>) {
  const [failed, setFailed] = useState<string>();
  const visible = imageUrl && imageUrl !== failed;
  return (
    <img src={visible ? imageUrl : '/images/product-placeholder.svg'} alt="" loading="lazy"
      onError={visible ? () => setFailed(imageUrl) : undefined} />
  );
}
