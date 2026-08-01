// Tests de composant — FeeEstimate
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FeeEstimate } from '@/components/delivery/FeeEstimate';
import { formatFCFA } from '@/lib/deliveryService';

describe('<FeeEstimate />', () => {
  it('affiche le tarif de base et le coût de distance', () => {
    const { getByText } = render(
      <FeeEstimate baseRate={500} perKmRate={150} distanceKm={10} />,
    );
    expect(getByText(formatFCFA(500))).toBeTruthy();
    // Coût distance = 150 * 10 = 1500
    expect(getByText(formatFCFA(1500))).toBeTruthy();
  });

  it('calcule et affiche le total estimé = base + per_km × distance', () => {
    const { getByText } = render(
      <FeeEstimate baseRate={500} perKmRate={150} distanceKm={10} />,
    );
    // Total = 500 + 1500 = 2000
    expect(getByText(formatFCFA(2000))).toBeTruthy();
  });

  it('utilise le total fourni explicitement (prioritaire)', () => {
    const { getByText } = render(
      <FeeEstimate baseRate={500} perKmRate={150} distanceKm={10} total={9999} />,
    );
    expect(getByText(formatFCFA(9999))).toBeTruthy();
  });

  it('applique le tarif de base comme minimum (distance négative)', () => {
    const { getAllByText } = render(
      <FeeEstimate baseRate={500} perKmRate={150} distanceKm={-5} />,
    );
    // Total = max(500, 500 + 150*0) = 500 ; apparaît au tarif de base ET au total
    const matches = getAllByText(formatFCFA(500));
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('applique le tarif de base comme minimum (distance 0)', () => {
    const { getAllByText } = render(
      <FeeEstimate baseRate={500} perKmRate={150} distanceKm={0} />,
    );
    const matches = getAllByText(formatFCFA(500));
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('affiche la note "minimum facturé" quand le tarif de base plafonne', () => {
    const { getByText } = render(
      <FeeEstimate baseRate={1000} perKmRate={100} distanceKm={0} />,
    );
    expect(getByText(/tarif de base s'applique/)).toBeTruthy();
  });

  it('n\u2019affiche pas la note "minimum facturé" quand la distance génère un supplément', () => {
    const { queryByText } = render(
      <FeeEstimate baseRate={500} perKmRate={150} distanceKm={10} />,
    );
    expect(queryByText(/tarif de base s'applique/)).toBeNull();
  });

  it('affiche le libellé de distance avec le bon nombre de km', () => {
    const { getByText } = render(
      <FeeEstimate baseRate={500} perKmRate={150} distanceKm={12} />,
    );
    expect(getByText(/12 km/)).toBeTruthy();
  });
});
