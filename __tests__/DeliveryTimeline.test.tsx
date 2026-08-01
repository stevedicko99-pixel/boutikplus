// Tests de composant — DeliveryTimeline
import React from 'react';
import { render } from '@testing-library/react-native';
import { DeliveryTimeline } from '@/components/delivery/DeliveryTimeline';
import { DELIVERY_STATUS, DELIVERY_TIMELINE } from '@/lib/deliveryStatus';
import type { DeliveryRequest, DeliveryStatus } from '@/types/models';

function makeDelivery(overrides: Partial<DeliveryRequest> = {}): DeliveryRequest {
  return {
    id: 'deliv-1',
    seller_id: 'demo-seller',
    driver_id: null,
    pickup_address: 'Gounghin',
    pickup_city: 'Ouagadougou',
    destination_address: 'Wemtenga',
    destination_city: 'Ouagadougou',
    package_weight: 2,
    package_length: 20,
    package_width: 15,
    package_height: 10,
    preferred_date: '2026-08-01',
    preferred_time: '10:00 - 12:00',
    description: null,
    price: 800,
    distance_km: 5,
    status: 'pending',
    cancellation_reason: null,
    created_at: '2026-07-30T08:00:00.000Z',
    updated_at: '2026-07-30T08:00:00.000Z',
    accepted_at: null,
    delivered_at: null,
    ...overrides,
  };
}

describe('<DeliveryTimeline />', () => {
  DELIVERY_TIMELINE.forEach((status: DeliveryStatus) => {
    it(`rend les 4 étapes progressives pour le statut "${status}"`, () => {
      const { getByText } = render(<DeliveryTimeline delivery={makeDelivery({ status })} />);
      // Les 4 labels de la timeline sont toujours présents (sauf cas annulé)
      DELIVERY_TIMELINE.forEach((s) => {
        expect(getByText(DELIVERY_STATUS[s].label)).toBeTruthy();
      });
    });
  });

  it('rend la carte d\u2019annulation pour une livraison annulée', () => {
    const delivery = makeDelivery({
      status: 'cancelled',
      cancellation_reason: 'Plus besoin',
    });
    const { getByText, queryByText } = render(<DeliveryTimeline delivery={delivery} />);
    expect(getByText(DELIVERY_STATUS.cancelled.label)).toBeTruthy();
    expect(getByText('Plus besoin')).toBeTruthy();
    // Les étapes progressives ne sont pas rendues
    expect(queryByText(DELIVERY_STATUS.pending.label)).toBeNull();
  });

  it('rend la carte de remboursement pour une livraison remboursée', () => {
    const delivery = makeDelivery({
      status: 'refunded',
      cancellation_reason: 'Litige',
    });
    const { getByText } = render(<DeliveryTimeline delivery={delivery} />);
    expect(getByText(DELIVERY_STATUS.refunded.label)).toBeTruthy();
    expect(getByText('Litige')).toBeTruthy();
  });

  it('n\u2019affiche pas de raison d\u2019annulation si absente', () => {
    const delivery = makeDelivery({ status: 'cancelled', cancellation_reason: null });
    const { queryByText } = render(<DeliveryTimeline delivery={delivery} />);
    // Aucune raison n'est rendue mais le label reste
    expect(queryByText('Litige')).toBeNull();
  });

  it('affiche un indice pour l\u2019étape courante en mode non compact', () => {
    const delivery = makeDelivery({ status: 'pending' });
    const { getByText } = render(<DeliveryTimeline delivery={delivery} />);
    expect(
      getByText('En attente qu\u2019un livreur accepte votre demande'),
    ).toBeTruthy();
  });

  it('masque l\u2019indice en mode compact', () => {
    const delivery = makeDelivery({ status: 'pending' });
    const { queryByText } = render(<DeliveryTimeline delivery={delivery} compact />);
    expect(queryByText('En attente qu\u2019un livreur accepte votre demande')).toBeNull();
  });

  it('affiche l\u2019indice avec le nom du livreur quand accepté et driver connu', () => {
    const delivery = makeDelivery({
      status: 'accepted',
      driver_id: 'driver-1',
      driver: {
        id: 'driver-1',
        user_id: 'driver-user-1',
        vehicle_type: 'moto',
        city: 'Ouagadougou',
        is_available: true,
        rating: 4.5,
        total_deliveries: 10,
        base_rate: 500,
        per_km_rate: 150,
        max_weight: 20,
        orange_money_number: null,
        moov_money_number: null,
        current_lat: null,
        current_lng: null,
        license_number: null,
        created_at: '2026-01-01T00:00:00.000Z',
        profile: {
          id: 'driver-user-1',
          full_name: 'Issouf Kaboré',
          phone: '70000000',
          avatar_url: null,
          city: 'Ouagadougou',
        },
      },
    });
    const { getByText } = render(<DeliveryTimeline delivery={delivery} />);
    expect(getByText(/Issouf Kaboré arrive bientôt/)).toBeTruthy();
  });

  it('affiche l\u2019indice générique quand accepté sans driver connu', () => {
    const delivery = makeDelivery({ status: 'accepted', driver_id: 'driver-1' });
    const { getByText } = render(<DeliveryTimeline delivery={delivery} />);
    expect(
      getByText('Le livreur est en route vers le point de prise en charge'),
    ).toBeTruthy();
  });

  it('affiche l\u2019indice de colis en cours pour in_progress', () => {
    const delivery = makeDelivery({ status: 'in_progress' });
    const { getByText } = render(<DeliveryTimeline delivery={delivery} />);
    expect(
      getByText('Le colis a été récupéré et est en route vers la destination'),
    ).toBeTruthy();
  });

  it('affiche l\u2019indice de succès pour delivered', () => {
    const delivery = makeDelivery({
      status: 'delivered',
      delivered_at: '2026-07-30T10:00:00.000Z',
    });
    const { getByText } = render(<DeliveryTimeline delivery={delivery} />);
    expect(getByText('La livraison est terminée avec succès')).toBeTruthy();
  });
});
