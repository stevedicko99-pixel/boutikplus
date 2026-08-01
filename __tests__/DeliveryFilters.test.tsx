// Tests de composant — DeliveryFilters
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  DeliveryFilters,
  type DeliveryFilterState,
} from '@/components/delivery/DeliveryFilters';
import { VEHICLE_LIST, CITY_LIST } from '@/constants/delivery';

const DEFAULT_FILTERS: DeliveryFilterState = {
  city: null,
  vehicleType: null,
  availableOnly: false,
  minRating: 0,
  sortBy: 'rating',
};

describe('<DeliveryFilters />', () => {
  it('affiche les sections de filtres principales', () => {
    const { getByText } = render(
      <DeliveryFilters filters={DEFAULT_FILTERS} onChange={jest.fn()} />,
    );
    expect(getByText('Type de véhicule')).toBeTruthy();
    expect(getByText('Ville')).toBeTruthy();
    expect(getByText('Note minimum')).toBeTruthy();
    expect(getByText('Trier par')).toBeTruthy();
    expect(getByText('Disponibles maintenant')).toBeTruthy();
  });

  it('affiche l\u2019option "Tous" pour le véhicule et "Toutes les villes"', () => {
    const { getByText } = render(
      <DeliveryFilters filters={DEFAULT_FILTERS} onChange={jest.fn()} />,
    );
    expect(getByText('Tous')).toBeTruthy();
    expect(getByText('Toutes les villes')).toBeTruthy();
  });

  it('affiche tous les véhicules disponibles', () => {
    const { getByText } = render(
      <DeliveryFilters filters={DEFAULT_FILTERS} onChange={jest.fn()} />,
    );
    VEHICLE_LIST.forEach((v) => {
      expect(getByText(v.label)).toBeTruthy();
    });
  });

  it('affiche les villes de la liste', () => {
    const { getByText } = render(
      <DeliveryFilters filters={DEFAULT_FILTERS} onChange={jest.fn()} />,
    );
    // Au moins Ouagadougou et Bobo-Dioulasso
    expect(getByText('Ouagadougou')).toBeTruthy();
    expect(getByText('Bobo-Dioulasso')).toBeTruthy();
    expect(CITY_LIST.length).toBeGreaterThan(0);
  });

  it('bascule availableOnly au press', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <DeliveryFilters filters={DEFAULT_FILTERS} onChange={onChange} />,
    );
    fireEvent.press(getByText('Disponibles maintenant'));
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      availableOnly: true,
    });
  });

  it('sélectionne un type de véhicule au press', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <DeliveryFilters filters={DEFAULT_FILTERS} onChange={onChange} />,
    );
    const moto = VEHICLE_LIST.find((v) => v.id === 'moto')!;
    fireEvent.press(getByText(moto.label));
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      vehicleType: 'moto',
    });
  });

  it('désélectionne un type de véhicule déjà actif au press', () => {
    const onChange = jest.fn();
    const filters: DeliveryFilterState = { ...DEFAULT_FILTERS, vehicleType: 'moto' };
    const { getByText } = render(
      <DeliveryFilters filters={filters} onChange={onChange} />,
    );
    const moto = VEHICLE_LIST.find((v) => v.id === 'moto')!;
    fireEvent.press(getByText(moto.label));
    expect(onChange).toHaveBeenCalledWith({
      ...filters,
      vehicleType: null,
    });
  });

  it('sélectionne une ville au press', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <DeliveryFilters filters={DEFAULT_FILTERS} onChange={onChange} />,
    );
    fireEvent.press(getByText('Koudougou'));
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      city: 'Koudougou',
    });
  });

  it('change la note minimum au press', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <DeliveryFilters filters={DEFAULT_FILTERS} onChange={onChange} />,
    );
    fireEvent.press(getByText('4.5+'));
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      minRating: 4.5,
    });
  });

  it('change le tri au press', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <DeliveryFilters filters={DEFAULT_FILTERS} onChange={onChange} />,
    );
    fireEvent.press(getByText('Moins chers'));
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_FILTERS,
      sortBy: 'price_asc',
    });
  });

  it('déclenche onReset si fourni', () => {
    const onReset = jest.fn();
    const { getByText } = render(
      <DeliveryFilters filters={DEFAULT_FILTERS} onChange={jest.fn()} onReset={onReset} />,
    );
    fireEvent.press(getByText('Réinitialiser les filtres'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('n\u2019affiche pas le bouton de réinitialisation si onReset est absent', () => {
    const { queryByText } = render(
      <DeliveryFilters filters={DEFAULT_FILTERS} onChange={jest.fn()} />,
    );
    expect(queryByText('Réinitialiser les filtres')).toBeNull();
  });
});
