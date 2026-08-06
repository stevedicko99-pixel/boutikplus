// Boîtes de dialogue multiplateformes — Boutikplus
//
// `Alert.alert` de react-native-web est une fonction vide : sur le web, aucune
// confirmation ne s'affichait et les callbacks `onPress` n'étaient jamais
// appelés (suppression d'un produit, modération d'une boutique, messages
// d'erreur du paiement… paraissaient donc « non fonctionnels »).
// `showAlert` garde la signature d'`Alert.alert` et bascule sur les dialogues
// natifs du navigateur côté web.

import { Alert, Platform } from 'react-native';

export interface AlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

const isCancel = (button: AlertButton) =>
  button.style === 'cancel' ||
  /^(annuler|non|fermer|cancel)$/i.test(button.text ?? '');

export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
): void {
  if (Platform.OS !== 'web') {
    showAlert(title, message, buttons as any);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;
  const actionable = (buttons ?? []).filter((b) => !isCancel(b));

  // Un bouton d'action + un bouton d'annulation → confirmation.
  if (buttons && buttons.length > 1 && actionable.length >= 1) {
    const confirmed = window.confirm(text);
    if (!confirmed) {
      buttons.find(isCancel)?.onPress?.();
      return;
    }
    actionable[0].onPress?.();
    return;
  }

  window.alert(text);
  actionable[0]?.onPress?.();
}

/** Confirmation simple, résolue par un booléen. */
export async function confirmAction(
  title: string,
  message?: string,
  confirmLabel = 'Confirmer',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return window.confirm(message ? `${title}\n\n${message}` : title);
  }
  return new Promise((resolve) => {
    showAlert(title, message, [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
