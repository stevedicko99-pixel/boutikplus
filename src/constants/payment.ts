// Opérateurs Mobile Money — Burkina Faso
export type PaymentOperatorId = 'orange_money' | 'moov_money';

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
};

export const OPERATOR_LIST: OperatorDef[] = [
  PAYMENT_OPERATORS.orange_money,
  PAYMENT_OPERATORS.moov_money,
];

export const getOperator = (id: PaymentOperatorId): OperatorDef =>
  PAYMENT_OPERATORS[id];
