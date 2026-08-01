// Tests de composant — DeliveryStatusBadge
import React from 'react';
import { render } from '@testing-library/react-native';
import { DeliveryStatusBadge } from '@/components/delivery/DeliveryStatusBadge';
import { DELIVERY_STATUS } from '@/lib/deliveryStatus';
import type { DeliveryStatus } from '@/types/models';

// On mock le thème car il est importé par les composants
jest.mock('@/theme', () => ({
  colors: {
    warning: '#FFC107',
    info: '#0DCAF0',
    primary: '#FF6B00',
    success: '#00A859',
    danger: '#DC3545',
    textMuted: '#6C757D',
  },
  typography: {
    fontFamily: 'Poppins',
    sizes: { caption: 11, small: 13, body: 15, subtitle: 17 },
    weights: { regular: '400', medium: '500', semibold: '600', bold: '700' },
  },
  radius: { sm: 6, md: 10, lg: 14 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
}));

describe('<DeliveryStatusBadge />', () => {
  const statuses: DeliveryStatus[] = [
    'pending',
    'accepted',
    'in_progress',
    'delivered',
    'cancelled',
    'refunded',
  ];

  statuses.forEach((status) => {
    it(`rend le libellé court pour le statut "${status}"`, () => {
      const expectedLabel = DELIVERY_STATUS[status].shortLabel;
      const { getByText } = render(<DeliveryStatusBadge status={status} />);
      expect(getByText(expectedLabel)).toBeTruthy();
    });
  });

  it('rend avec la taille sm par défaut', () => {
    const { getByText } = render(<DeliveryStatusBadge status="delivered" />);
    expect(getByText('Livrée')).toBeTruthy();
  });

  it('rend avec la taille md', () => {
    const { getByText } = render(
      <DeliveryStatusBadge status="pending" size="md" />,
    );
    expect(getByText('En attente')).toBeTruthy();
  });

  it('rend un statut inconnu sans planter (fallback pending)', () => {
    const { getByText } = render(
      <DeliveryStatusBadge status={'unknown' as DeliveryStatus} />,
    );
    // Fallback sur pending
    expect(getByText(DELIVERY_STATUS.pending.shortLabel)).toBeTruthy();
  });
});
