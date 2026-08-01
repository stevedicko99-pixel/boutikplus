// Tests de composant — PackageSizePicker
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PackageSizePicker } from '@/components/delivery/PackageSizePicker';
import { PACKAGE_SIZE_BUCKETS } from '@/constants/delivery';

describe('<PackageSizePicker />', () => {
  it('rend les 3 tailles de colis (small, medium, large)', () => {
    const { getByText } = render(
      <PackageSizePicker selected={null} onSelect={jest.fn()} />,
    );
    PACKAGE_SIZE_BUCKETS.forEach((bucket) => {
      expect(getByText(bucket.label)).toBeTruthy();
    });
  });

  it('affiche le poids et les dimensions de chaque taille', () => {
    const { getByText } = render(
      <PackageSizePicker selected={null} onSelect={jest.fn()} />,
    );
    PACKAGE_SIZE_BUCKETS.forEach((bucket) => {
      expect(getByText(`${bucket.weightKg} kg`)).toBeTruthy();
      expect(
        getByText(`${bucket.lengthCm}×${bucket.widthCm}×${bucket.heightCm} cm`),
      ).toBeTruthy();
    });
  });

  it('déclenche onSelect avec la bonne taille au press', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <PackageSizePicker selected={null} onSelect={onSelect} />,
    );
    const medium = PACKAGE_SIZE_BUCKETS.find((b) => b.id === 'medium')!;
    fireEvent.press(getByText(medium.label));
    expect(onSelect).toHaveBeenCalledWith(medium);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('affiche l\u2019indicateur de sélection pour la taille choisie', () => {
    const { getByText, getByTestId } = render(
      <PackageSizePicker selected="small" onSelect={jest.fn()} />,
    );
    // L'icône check est rendue pour la taille sélectionnée (mock Feather -> testID feather-check)
    expect(getByTestId('feather-check')).toBeTruthy();
    // Le label small est bien présent
    const small = PACKAGE_SIZE_BUCKETS.find((b) => b.id === 'small')!;
    expect(getByText(small.label)).toBeTruthy();
  });

  it('n\u2019affiche aucun indicateur quand rien n\u2019est sélectionné', () => {
    const { queryByTestId } = render(
      <PackageSizePicker selected={null} onSelect={jest.fn()} />,
    );
    expect(queryByTestId('feather-check')).toBeNull();
  });

  it('permet de changer la sélection (déclenche onSelect à chaque press)', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <PackageSizePicker selected="small" onSelect={onSelect} />,
    );
    const large = PACKAGE_SIZE_BUCKETS.find((b) => b.id === 'large')!;
    fireEvent.press(getByText(large.label));
    expect(onSelect).toHaveBeenCalledWith(large);
  });
});
