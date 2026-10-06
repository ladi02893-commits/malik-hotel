'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import { useSettings } from '@/context/SettingsContext';
import { formatMoney, addMoney, subtractMoney } from '@/lib/money';
import { PaymentEntry } from '@/types';
import { X, Check, Banknote, Smartphone, CreditCard, Split, AlertCircle } from 'lucide-react';

export function PaymentModal() {
  const {
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    totals,
    paymentMethods,
    completeCheckout,
    showToast,
  } = usePOS();
  const { posSettings } = useSettings();

  const activeMethods = useMemo(() => {
    return paymentMethods.filter((m) => m.is_active);
  }, [paymentMethods]);

  const [selectedMethodId, setSelectedMethodId] = useState<string>('cash');
  const [isSplitMode, setIsSplitMode] = useState<boolean>(false);

  // Single payment state
  const [cashTendered, setCashTendered] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');

  // Split payment state: map of methodId -> amount
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  const [splitReferences, setSplitReferences] = useState<Record<string, string>>({});

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const cashInputRef = React.useRef<HTMLInputElement>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isPaymentModalOpen) {
      setSelectedMethodId('cash');
      setIsSplitMode(false);
      setCashTendered(String(totals.grand_total));
      setReferenceNumber('');
      setSplitAmounts({ cash: String(totals.grand_total) });
      setSplitReferences({});
      setErrorMessage('');
      setIsProcessing(false);

      setTimeout(() => {
        cashInputRef.current?.focus();
        cashInputRef.current?.select();
      }, 50);
    }
  }, [isPaymentModalOpen, totals.grand_total]);

  // Change calculation for cash
  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeAmount = tenderedNum >= totals.grand_total ? subtractMoney(tenderedNum, totals.grand_total) : 0;

  // Split payment totals
  const totalSplitEntered = Object.values(splitAmounts).reduce(
    (sum, val) => addMoney(sum, parseFloat(val) || 0),
    0
  );
  const remainingSplit = subtractMoney(totals.grand_total, totalSplitEntered);

  // Quick cash buttons
  const quickCashOptions = [
    { label: 'Exact', value: totals.grand_total },
    { label: 'Rs. 500', value: 500 },
    { label: 'Rs. 1,000', value: 1000 },
    { label: 'Rs. 2,000', value: 2000 },
    { label: 'Rs. 5,000', value: 5000 },
  ].filter((opt) => opt.value >= totals.grand_total || opt.label === 'Exact');

  const handleCompletePayment = React.useCallback(async () => {
    setErrorMessage('');
    setIsProcessing(true);

    const paymentsToSubmit: PaymentEntry[] = [];

    if (!isSplitMode) {
      const activeMethod = activeMethods.find((m) => m.id === selectedMethodId);
      if (!activeMethod) {
        setErrorMessage('Please select a valid payment method.');
        setIsProcessing(false);
        return;
      }

      if (selectedMethodId === 'cash') {
        if (tenderedNum < totals.grand_total) {
          setErrorMessage(`Received cash (Rs. ${tenderedNum}) is less than Total Due (Rs. ${totals.grand_total}).`);
          setIsProcessing(false);
          return;
        }

        paymentsToSubmit.push({
          method_id: 'cash',
          method_name: activeMethod.name,
          amount: totals.grand_total,
          amount_tendered: tenderedNum,
          change_returned: changeAmount,
        });
      } else {
        // Digital or Card
        if (activeMethod.require_reference && !referenceNumber.trim()) {
          setErrorMessage(`Transaction reference is required for ${activeMethod.name}.`);
          setIsProcessing(false);
          return;
        }

        paymentsToSubmit.push({
          method_id: activeMethod.id,
          method_name: activeMethod.name,
          amount: totals.grand_total,
          reference_number: referenceNumber.trim() || undefined,
        });
      }
    } else {
      // Split mode
      if (remainingSplit > 0) {
        setErrorMessage(`Remaining balance is Rs. ${remainingSplit}. Total payments must cover full amount.`);
        setIsProcessing(false);
        return;
      }

      for (const method of activeMethods) {
        const amt = parseFloat(splitAmounts[method.id]) || 0;
        if (amt > 0) {
          const ref = splitReferences[method.id];
          if (method.require_reference && !ref?.trim()) {
            setErrorMessage(`Reference required for ${method.name}.`);
            setIsProcessing(false);
            return;
          }

          paymentsToSubmit.push({
            method_id: method.id,
            method_name: method.name,
            amount: amt,
            reference_number: ref?.trim() || undefined,
          });
        }
      }
    }

    const res = await completeCheckout(paymentsToSubmit);
    setIsProcessing(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Unable to complete payment.');
    }
  }, [
    activeMethods,
    selectedMethodId,
    isSplitMode,
    tenderedNum,
    totals.grand_total,
    changeAmount,
    referenceNumber,
    remainingSplit,
    splitAmounts,
    splitReferences,
    completeCheckout,
  ]);

  // Keyboard controls inside PaymentModal (Enter = complete, Esc = cancel)
  useEffect(() => {
    if (!isPaymentModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsPaymentModalOpen(false);
      } else if (e.key === 'Enter' && !isProcessing) {
        e.preventDefault();
        handleCompletePayment();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaymentModalOpen, isProcessing, handleCompletePayment]);

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return <Banknote className="w-4 h-4 text-emerald-700" />;
      case 'digital':
        return <Smartphone className="w-4 h-4 text-amber-600" />;
      case 'card':
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      default:
        return <Banknote className="w-4 h-4 text-slate-600" />;
    }
  };

  if (!isPaymentModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print select-none">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Payment Processing</h3>
            <p className="text-[11px] text-slate-500">Select payment method and confirm tender</p>
          </div>
          <button
            onClick={() => setIsPaymentModalOpen(false)}
            disabled={isProcessing}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Due Banner */}
        <div className="px-5 py-4 bg-emerald-50/80 border-b border-emerald-100 flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-900">Amount Due</span>
          <span className="font-extrabold text-2xl text-emerald-950 font-mono">
            {formatMoney(totals.grand_total)}
          </span>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Mode Switch (Single vs Split) if split enabled and more than 1 payment method */}
          {posSettings.enable_split_payment && activeMethods.length > 1 && (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsSplitMode(!isSplitMode)}
                className="text-xs text-slate-600 hover:text-emerald-800 flex items-center gap-1.5 font-medium"
              >
                <Split className="w-3.5 h-3.5 text-slate-500" />
                <span>{isSplitMode ? 'Switch to Single Payment' : 'Enable Split Payment'}</span>
              </button>
            </div>
          )}

          {!isSplitMode ? (
            /* SINGLE PAYMENT MODE */
            <div className="space-y-4">
              {/* Payment Methods Banner / Tabs */}
              {activeMethods.length > 1 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {activeMethods.map((m) => {
                    const isSelected = selectedMethodId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMethodId(m.id);
                          if (m.id === 'cash') {
                            setCashTendered(String(totals.grand_total));
                          }
                        }}
                        className={`p-2.5 rounded-lg border text-left flex flex-col justify-between h-16 transition-all ${
                          isSelected
                            ? 'border-emerald-700 bg-emerald-50/60 shadow-2xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          {getMethodIcon(m.type)}
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-800" />}
                        </div>
                        <span className={`text-xs font-semibold ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                          {m.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-200 bg-emerald-50/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-950">Payment Method: Cash</p>
                      <p className="text-[11px] text-emerald-700">Cash checkout is selected</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                    Cash Only
                  </span>
                </div>
              )}

              {/* Cash specific workflow */}
              {selectedMethodId === 'cash' ? (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Cash Received / Tendered (Rs.)
                    </label>
                    <input
                      ref={cashInputRef}
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCompletePayment();
                        }
                      }}
                      placeholder="Enter amount received..."
                      className="w-full px-3 py-2 text-base font-mono font-bold text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  {/* Smart Quick Cash Buttons */}
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 mb-1.5">Quick Buttons</p>
                    <div className="flex flex-wrap gap-1.5">
                      {quickCashOptions.map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setCashTendered(String(opt.value))}
                          className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors font-mono"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Change Output Box */}
                  <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase text-slate-500">Change Due</span>
                      <p className="text-lg font-extrabold text-emerald-900 font-mono">
                        {formatMoney(changeAmount)}
                      </p>
                    </div>
                    {tenderedNum >= totals.grand_total && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        Full Amount Covered
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* Digital / Card workflow */
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Transaction Reference / ID
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="e.g. TID-982341..."
                      className="w-full px-3 py-2 text-xs text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900">
                    <p className="font-semibold">Digital Payment Confirmation</p>
                    <p className="text-[11px] mt-0.5 text-blue-800">
                      Verify confirmation SMS or receipt on mobile app before completing sale.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* SPLIT PAYMENT MODE */
            <div className="space-y-3">
              <p className="text-xs text-slate-600 font-medium">Split amount across multiple payment methods:</p>

              <div className="space-y-2">
                {activeMethods.map((method) => (
                  <div key={method.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {getMethodIcon(method.type)}
                        <span className="text-xs font-semibold text-slate-800">{method.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono text-slate-400">Rs.</span>
                        <input
                          type="number"
                          value={splitAmounts[method.id] || ''}
                          onChange={(e) =>
                            setSplitAmounts({
                              ...splitAmounts,
                              [method.id]: e.target.value,
                            })
                          }
                          placeholder="0"
                          className="w-24 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-right focus:outline-none focus:ring-1 focus:ring-emerald-700"
                        />
                      </div>
                    </div>

                    {method.type !== 'cash' && (
                      <input
                        type="text"
                        value={splitReferences[method.id] || ''}
                        onChange={(e) =>
                          setSplitReferences({
                            ...splitReferences,
                            [method.id]: e.target.value,
                          })
                        }
                        placeholder="Ref # (optional)..."
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] placeholder:text-slate-400"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Split Summary */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Allocated: </span>
                  <span className="font-mono font-bold">{formatMoney(totalSplitEntered)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Remaining: </span>
                  <span className={`font-mono font-bold ${remainingSplit === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {formatMoney(remainingSplit)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(false)}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCompletePayment}
            disabled={isProcessing}
            className="px-6 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            {isProcessing ? (
              <span>Processing...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Complete Sale ({formatMoney(totals.grand_total)})</span>
                <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-emerald-700 text-emerald-100 rounded font-mono border border-emerald-600">
                  Enter ↵
                </kbd>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
