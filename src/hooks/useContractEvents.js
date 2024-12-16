import { useEffect } from 'react';
import { useWeb3 } from './useWeb3';
import { useNotification } from '../context/NotificationContext';
import { ethers } from 'ethers';

export function useContractEvents(onStatsUpdate) {
  const { contract } = useWeb3();
  const { notify } = useNotification();

  useEffect(() => {
    if (!contract) return;

    // Global event filters
    const burnedXENFilter = contract.filters.BurnedXEN(null);
    const xburnBurnedFilter = contract.filters.XburnBurned(null);
    const xburnSwappedFilter = contract.filters.XburnSwapped(null);
    const xburnSwappedAndBurnedFilter = contract.filters.XburnSwappedAndBurned();

    const handleGlobalBurn = async () => {
      try {
        // Update global stats
        if (onStatsUpdate) {
          await onStatsUpdate();
        }
      } catch (err) {
        console.error('Error updating stats:', err);
      }
    };

    const handleBuyAndBurn = async (xenSwapped, xburnBurned, event) => {
      try {
        notify(`Buy & Burn: ${ethers.utils.formatEther(xenSwapped)} XEN → ${ethers.utils.formatEther(xburnBurned)} XBURN`, 'success');
        if (onStatsUpdate) {
          await onStatsUpdate();
        }
      } catch (err) {
        console.error('Error handling buy and burn:', err);
      }
    };

    // Subscribe to events
    contract.on(burnedXENFilter, handleGlobalBurn);
    contract.on(xburnBurnedFilter, handleGlobalBurn);
    contract.on(xburnSwappedFilter, handleGlobalBurn);
    contract.on(xburnSwappedAndBurnedFilter, handleBuyAndBurn);

    // Cleanup
    return () => {
      contract.off(burnedXENFilter, handleGlobalBurn);
      contract.off(xburnBurnedFilter, handleGlobalBurn);
      contract.off(xburnSwappedFilter, handleGlobalBurn);
      contract.off(xburnSwappedAndBurnedFilter, handleBuyAndBurn);
    };
  }, [contract, onStatsUpdate, notify]);
} 