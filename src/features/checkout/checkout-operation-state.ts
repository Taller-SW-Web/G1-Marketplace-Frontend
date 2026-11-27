export interface CheckoutOperationState {
  operationId: string;
  recoveryOffered: boolean;
}

export type CheckoutOperationAction =
  | { type: "operation-changed"; operationId: string }
  | { type: "recovery-cleared" }
  | { type: "recovery-offered"; operationId: string };

export const initialCheckoutOperationState: CheckoutOperationState = {
  operationId: "",
  recoveryOffered: false,
};

export function checkoutOperationReducer(
  state: CheckoutOperationState,
  action: CheckoutOperationAction,
): CheckoutOperationState {
  switch (action.type) {
    case "operation-changed":
      return { operationId: action.operationId, recoveryOffered: false };
    case "recovery-cleared":
      return state.recoveryOffered ? { ...state, recoveryOffered: false } : state;
    case "recovery-offered":
      return action.operationId === state.operationId && !state.recoveryOffered
        ? { ...state, recoveryOffered: true }
        : state;
  }
}
