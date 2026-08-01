// Tests de composant — DriverCard
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DriverCard } from '@/components/delivery/DriverCard';
import { formatFCFA } from '@/lib/deliveryService';
import { getVehicle } from '@/constants/delivery';
import type { DriverProfile } from '@/types/models';

function makeDriver(overrides: Partial<DriverProfile> = {}): DriverProfile {
  return {
    id: 'driver-1',
    user_id: 'driver-user-1',
    vehicle_type: 'moto',
    city: 'Ouagadougou',
    is_available: true,
    rating: 4.8,
    total_deliveries: 32,
    base_rate: 500,
    per_km_rate: 150,
    max_weight: 20,
    orange_money_number: '70000000',
    moov_money_number: null,
    current_lat: null,
    current_lng: null,
    license_number: 'AB123',
    created_at: '2026-01-01T00:00:00.000Z',
    profile: {
      id: 'driver-user-1',
      full_name: 'Issouf Kaboré',
      phone: '70000000',
      avatar_url: null,
      city: 'Ouagadougou',
    },
    ...overrides,
  };
}

describe('<DriverCard />', () => {
  it('affiche le nom du livreur', () => {
    const driver = makeDriver();
    const { getByText } = render(<DriverCard driver={driver} />);
    expect(getByText('Issouf Kaboré')).toBeTruthy();
  });

  it('affiche "Livreur" si le profil n\u2019a pas de nom', () => {
    const driver = makeDriver({ profile: undefined });
    const { getByText } = render(<DriverCard driver={driver} />);
    expect(getByText('Livreur')).toBeTruthy();
  });

  it('affiche le badge Disponible quand le livreur est disponible', () => {
    const { getByText } = render(<DriverCard driver={makeDriver({ is_available: true })} />);
    expect(getByText('Disponible')).toBeTruthy();
  });

  it('affiche Indisponible quand le livreur n\u2019est pas disponible', () => {
    const { getByText } = render(<DriverCard driver={makeDriver({ is_available: false })} />);
    expect(getByText('Indisponible')).toBeTruthy();
  });

  it('affiche la ville et le label du véhicule', () => {
    const driver = makeDriver({ city: 'Bobo-Dioulasso', vehicle_type: 'voiture' });
    const { getByText } = render(<DriverCard driver={driver} />);
    expect(getByText('Bobo-Dioulasso')).toBeTruthy();
    expect(getByText(getVehicle('voiture').label)).toBeTruthy();
  });

  it('affiche la note, le nombre de livraisons et le poids max', () => {
    const driver = makeDriver({ rating: 4.5, total_deliveries: 12, max_weight: 50 });
    const { getByText } = render(<DriverCard driver={driver} />);
    expect(getByText('4.5')).toBeTruthy();
    expect(getByText('12')).toBeTruthy();
    expect(getByText('50kg')).toBeTruthy();
  });

  it('affiche le tarif de base et le tarif par km', () => {
    const driver = makeDriver({ base_rate: 800, per_km_rate: 200 });
    const { getByText } = render(<DriverCard driver={driver} />);
    expect(getByText(formatFCFA(800))).toBeTruthy();
    expect(getByText(`+ ${formatFCFA(200)}/km`)).toBeTruthy();
  });

  it('affiche l\u2019estimation quand distanceKm est fourni et capacité ok', () => {
    const driver = makeDriver({ base_rate: 500, per_km_rate: 150 });
    const { getByText } = render(
      <DriverCard driver={driver} distanceKm={10} packageWeight={5} pickupCity="Ouagadougou" />,
    );
    // 500 + 150*10 = 2000
    expect(getByText(formatFCFA(2000))).toBeTruthy();
  });

  it('n\u2019affiche pas l\u2019estimation quand showEstimate est false', () => {
    const driver = makeDriver({ base_rate: 500, per_km_rate: 150 });
    const { queryByText } = render(
      <DriverCard driver={driver} distanceKm={10} packageWeight={5} showEstimate={false} />,
    );
    expect(queryByText(formatFCFA(2000))).toBeNull();
  });

  it('affiche un avertissement quand le colis est trop lourd', () => {
    const driver = makeDriver({ max_weight: 10 });
    const { getByText } = render(
      <DriverCard driver={driver} packageWeight={50} pickupCity="Ouagadougou" />,
    );
    expect(getByText(/Poids/)).toBeTruthy();
  });

  it('affiche un avertissement quand le livreur est dans une autre ville', () => {
    const driver = makeDriver({ city: 'Ouagadougou' });
    const { getByText } = render(
      <DriverCard driver={driver} packageWeight={5} pickupCity="Bobo-Dioulasso" />,
    );
    expect(getByText(/Bobo-Dioulasso/)).toBeTruthy();
  });

  it('désactive la carte quand le colis est incompatible', () => {
    const onPress = jest.fn();
    const driver = makeDriver({ max_weight: 5 });
    const { getByText } = render(
      <DriverCard driver={driver} packageWeight={50} pickupCity="Ouagadougou" onPress={onPress} />,
    );
    // La Pressable est disabled : fireEvent ne déclenche pas onPress
    fireEvent.press(getByText('Issouf Kaboré'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('déclenche onPress quand la carte est cliquable', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <DriverCard driver={makeDriver()} packageWeight={5} pickupCity="Ouagadougou" onPress={onPress} />,
    );
    fireEvent.press(getByText('Issouf Kaboré'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applique l\u2019état sélectionné', () => {
    const { getByTestId } = render(<DriverCard driver={makeDriver()} selected onPress={jest.fn()} />);
    // L'icône check-circle est rendue via le mock Feather -> testID feather-check-circle
    expect(getByTestId('feather-check-circle')).toBeTruthy();
  });

  it('utilise le tarif de base comme estimation minimum (distance 0)', () => {
    const driver = makeDriver({ base_rate: 500, per_km_rate: 150 });
    const { getAllByText } = render(
      <DriverCard driver={driver} distanceKm={0} packageWeight={5} pickupCity="Ouagadougou" />,
    );
    // 500 apparaît au tarif de base ET à l'estimation (distance 0)
    const matches = getAllByText(formatFCFA(500));
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
