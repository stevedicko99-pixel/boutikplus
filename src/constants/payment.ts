// Opérateurs Mobile Money — Burkina Faso (tous les opérateurs du marché)
export type PaymentOperatorId = 'orange_money' | 'moov_money' | 'coris_money' | 'wave';

export interface OperatorDef {
  id: PaymentOperatorId;
  name: string;
  shortName: string;
  color: string;
  bgColor: string;
  prefix: string; // préfixe de numéro typique
}

export const PAYMENT_OPERATORS: Record<PaymentOperatorId, OperatorDef> = {
  orange_money: {
    id: 'orange_money',
    name: 'Orange Money',
    shortName: 'OM',
    color: '#FFFFFF',
    bgColor: '#FF7900',
    prefix: '70 / 66 / 76',
  },
  moov_money: {
    id: 'moov_money',
    name: 'Moov Money',
    shortName: 'Moov',
    color: '#FFFFFF',
    bgColor: '#0066B3',
    prefix: '61 / 71 / 81',
  },
  coris_money: {
    id: 'coris_money',
    name: 'Coris Money',
    shortName: 'Coris',
    color: '#FFFFFF',
    bgColor: '#C8102E',
    prefix: '50 / 51 / 52',
  },
  wave: {
    id: 'wave',
    name: 'Wave',
    shortName: 'Wave',
    color: '#FFFFFF',
    bgColor: '#00B140',
    prefix: '55 / 56 / 57',
  },
};

export const OPERATOR_LIST: OperatorDef[] = [
  PAYMENT_OPERATORS.orange_money,
  PAYMENT_OPERATORS.moov_money,
  PAYMENT_OPERATORS.coris_money,
  PAYMENT_OPERATORS.wave,
];

export const getOperator = (id: PaymentOperatorId): OperatorDef =>
  PAYMENT_OPERATORS[id];

// Champs de numéro sur la table shops (pour itération)
export const SHOP_OPERATOR_FIELDS: Record<PaymentOperatorId, string> = {
  orange_money: 'orange_money_number',
  moov_money: 'moov_money_number',
  coris_money: 'coris_money_number',
  wave: 'wave_number',
};
